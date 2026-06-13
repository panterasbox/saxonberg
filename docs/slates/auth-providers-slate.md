# Auth providers & account linking slate (working doc)

> **Status: shape proposed — the keystone.** Generalize the Google-only
> auth spine into a multi-provider one (Google + Twitch as **co-equal
> login providers**), add a `TwitchProfile` Document that holds provider
> identity **plus** chat tokens, let an authenticated user **link** the
> other provider, and resolve a returning login through *any* linked
> provider back to the same `User`. This is the foundation both the
> **Twitch chat relay** and the future **LLM name-refraction** sit on.
> **Does not block char-gen-wave1** — see *No char-gen coupling* below.

The front door is currently Google-only, and the Google assumption is
hardwired through the whole auth spine — not just the `User` model. This
slate makes the spine **provider-parameterized** without inventing a
generic identity registry: the *procedure* takes a `provider`, the *data*
stays two explicit fields.

See also:

- [docs/subsystems/connection.md](../subsystems/connection.md) — the
  login/logout, WebSocket-upgrade, and session lifecycle this hooks.
- [docs/slates/persistence-architecture-slate.md](./persistence-architecture-slate.md)
  — `Document` (plain JSON, no Stuff) is what `GoogleProfile` / `User` /
  `TwitchProfile` all are.
- [docs/slates/char-gen-slate.md](./char-gen-slate.md) — char-gen is
  **provider-agnostic** (free-text given + roster-defaulted surname); the
  provider name becomes a char-gen *input* only at the deferred
  LLM-refraction stage.
- [docs/slates/chat-slate.md](./chat-slate.md) — the **Twitch chat relay**
  (downstream of this keystone) extends the `Channel` substrate with an
  external-backed channel.
- [docs/deployment.md](../deployment.md) — secrets via SSM Parameter
  Store (`SecureString`) / local `.env`; the token-encryption key lives
  here alongside `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET`.

---

## Principle

1. **Co-equal providers.** Twitch is a *login* provider, not a secondary
   link. You can sign in with Google **or** Twitch; you can link the
   other; logging in via any linked provider lands you on the same `User`.
2. **Explicit data, parameterized procedure.** Two FK fields on `User`,
   not a generic `identities[]` map — login providers are exactly two, and
   YouTube-later is itself Google OAuth (it grows `GoogleProfile`, it does
   not add a third field). Only the *spine procedure* takes a `provider`.
3. **Identity vs credentials.** `GoogleProfile` stores **no tokens**
   (Google is login-only — Passport gets the profile, mints a session,
   discards the token). `TwitchProfile` **persists tokens**, because we
   call Twitch's API *as the user* for the lifetime of the link.
4. **Credentials are encrypted at rest.** The token fields are bearer
   credentials → encrypted with an app key. This is the one genuinely new
   bit of substrate.
5. **Login consent ≠ feature consent.** Login requests minimal identity
   scope; chat-send scope is requested **incrementally** when the chat
   feature is first used.
6. **No char-gen coupling, no account merge.** char-gen-wave1 is
   untouched; pre-existing duplicate accounts are refused at link time,
   not merged.

---

## The data model

Three `Document`s (all plain persisted JSON, not Stuff — see the
persistence slate). `GoogleProfile` is unchanged.

```
User                                  // users
  googleProfileId?: string            // WAS required; now optional
  twitchProfileId?: string            // NEW, optional
  playerIds: string[]
  // invariant: at least one *ProfileId set

GoogleProfile                         // google_profiles (unchanged)
  googleId, email, displayName, givenName, familyName, photoUrl, rawProfile
  // identity only — no tokens

TwitchProfile                         // twitch_profiles (NEW)
  twitchUserId: string                // identity (the GoogleProfile-analog)
  login: string                       // lowercase @handle
  displayName: string                 // cased handle
  email?: string
  rawProfile: Record<string, unknown>
  // --- credentials (NOT present on GoogleProfile) ---
  accessToken: string                 // encrypted at rest
  refreshToken: string                // encrypted at rest
  expiresAt: number
  scopes: string[]                    // grows when chat scope is added later
```

**Why two fields, not a map:** computed-key access (`User.find({
[`${provider}ProfileId`]: id })`) handles the parameterized spine fine,
and the data stays greppable and indexable. A generic `identities[]`
would be the premature abstraction the codebase resists at N=2.

## The spine generalization (engine)

Today the Google assumption lives at six layers. Each gets
provider-parameterized — a mechanical change, not a redesign:

| Layer | Today | Change |
|---|---|---|
| `services/auth/PassportConfig.ts` | one `GoogleStrategy`, skipped under `AUTH_MODE=test` | add a Twitch OAuth2 strategy alongside it, gated the same way |
| `services/auth/AuthRoutes.ts` | `/auth/google` + `/auth/google/callback` | add `/auth/twitch` + callback (login) and `/auth/twitch/link` + callback (authenticated link) |
| `backend/Backend.ts` `handleAuthenticationSuccess(profile, done)` | hardcodes the Google path | carry a `provider` arg (or `handleProviderAuth(provider, profile, done)`); the test seam passes `provider: 'google'` so E2E is unchanged |
| `backend/Application.ts` `findOrCreateUserFromGoogle` | `findOrCreateGoogleProfile` + `findOrCreateUser(googleProfileId)` | `findOrCreateUserFromProvider(provider, profile)` → `findOrCreateProfile(provider, profile)` + `findOrCreateUser(provider, profileId, profile)`; resolve `User.find({ [`${provider}ProfileId`]: id })` |
| default avatar name seed (`Application.ts`, `createDefaultAvatarTemplate(profile.name?.givenName ?? 'Unnamed', …)`) | reads Google's name shape | read a **provider-agnostic accessor** so a Twitch-origin user doesn't fall to `'Unnamed'` (Google: `givenName ?? displayName`; Twitch: `displayName ?? login`). This is the *only* char-gen-adjacent touch, and it's just the throwaway default the char-gen flow overwrites. |
| `backend/PersistenceManager.ts` | `Collections.GoogleProfiles`; index `users.googleProfileId`, `google_profiles.email` | add `Collections.TwitchProfiles = 'twitch_profiles'`; index `twitch_profiles.twitchUserId`, `users.twitchProfileId` |

**Session:** carry `authProvider` (`'google' | 'twitch'`) — which provider
*this session* logged in through. Unused by char-gen-wave1; reserved for
the future name-refraction input. Lives beside the existing
`passport.user` (`{ id }`) serialization in `PassportConfig`.

## Token storage & encryption

- **Where:** the `accessToken` / `refreshToken` fields on `TwitchProfile`.
- **Encryption:** AES-GCM with an app key (`TOKEN_ENC_KEY`) from
  SSM/`.env`, alongside the existing secrets. **Open call** on the seam:
  a tiny `CryptoApi` (genuine cross-cutting security infra, defensible
  despite the no-new-Apis default) **or** an encrypting *field marshaller*
  on the two token fields (keeps it data-shaped, no new Api). Lean
  marshaller if the `fieldMarshallers` hook reaches `Document` cleanly;
  otherwise the minimal `CryptoApi`.
- **Refresh write-back:** the Twurple `RefreshingAuthProvider.onRefresh`
  hook re-`save()`s the rotated token onto the `TwitchProfile` (encrypted).
  `GoogleProfile` never does this; it's unique to the credential-bearing
  profile.

## Scopes

- **Login (this slate):** minimal identity only — enough to read
  `twitchUserId` / `login` / `displayName`.
- **Chat (deferred to the relay slate):** `user:write:chat` (send) and
  `user:read:chat` (EventSub read) requested **incrementally** via Twitch
  re-consent the first time a player uses the chat feature; the new scope
  set is appended to `TwitchProfile.scopes` and the broadened token
  re-stored. Keeps signup consent light and separates "log in" from "let
  the game post as me."

## Linking & collisions

- **Link flow:** an already-authenticated session hits `/auth/twitch/link`
  → Twitch OAuth → attach the resulting `twitchProfileId` to the *current*
  `User`. (Symmetric for a Twitch-origin user linking Google.)
- **Collision:** if the second provider's profile is already owned by a
  *different* `User` (the human signed in via each provider separately on
  different days), **refuse** with a clear message ("that Twitch account
  is already linked to another login"). The rejection doubles as the
  explanation. **Account merge is explicitly out of scope** — reconciling
  two `playerIds` sets is its own project.

## No char-gen coupling

char-gen-wave1 reads no provider data: `given` is free-text (sanitized),
`surname` is roster-defaulted, `nickname` is optional. The only
provider-name touchpoint in the codebase is the throwaway default avatar
name at account creation, addressed by the provider-agnostic accessor
above. **This slate and char-gen-wave1 can land in either order.**

## Out of scope (named downstream)

- **Twitch chat relay** — separate slate (extends `chat.md`'s `Channel`):
  stateless Helix *Send Chat Message* per linked token (no persistent
  per-user connection — the thing that sank the panterasbot attempt), one
  shared anon-IRC/EventSub reader fanned out internally. Depends on this
  keystone's `TwitchProfile` token + the incremental chat scope.
- **LLM name-refraction** — *deferred* ("real name → race-styled name",
  e.g. *Bobby Schaetzle → Bobalu Smallberries*). Needs `session.authProvider`
  + the provider name exposed as a char-gen input + the platform's first
  LLM seam. Out of scope here; this slate only *reserves* `authProvider`.
- **YouTube** — later, and Google-OAuth: it most likely **grows
  `GoogleProfile`** with token fields + YouTube scopes rather than minting
  a third profile. No third `User` field anticipated.

## Build waves

- **Wave 1 — provider-generalized spine + Twitch login.** `TwitchProfile`
  Document + `Collections.TwitchProfiles` + indexes; token encryption
  seam; `findOrCreateUserFromProvider`; `User` two-field + at-least-one
  invariant; `/auth/twitch` login route + Twitch strategy; session
  `authProvider`. **Outcome:** you can sign in with Twitch and get a
  `User` with an encrypted token stored. Google path unchanged; E2E
  test-auth seam unchanged (passes `provider: 'google'`).
- **Wave 2 — account linking.** Authenticated `/auth/.../link` flows
  (Twitch↔Google), collision-refusal, login-via-any-linked-provider →
  same `User`. **Outcome:** one human, one `User`, two ways in.
- **Wave 3+ — downstream slates.** Chat relay; LLM name-refraction;
  YouTube. Each its own slate on this foundation.
