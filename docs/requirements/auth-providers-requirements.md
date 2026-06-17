# Auth providers & account linking — requirements

Generalize the Google-only authentication spine into a **multi-provider**
one: Twitch becomes a *co-equal* login provider alongside Google, a new
`TwitchProfile` Document persists Twitch identity **plus** OAuth tokens
(encrypted at rest), and an authenticated user can **link** the other
provider so that logging in through any linked provider lands on the same
`User`. This is the keystone the Twitch chat relay and the
patronage→stake ledger both sit on (the chat relay spends the stored
tokens; the ledger needs the Twitch↔Saxonberg identity binding to
attribute a donation). Phase 1 of the
[broadcast-patronage track](../tracks/broadcast-patronage-track.md).

Seeded by [auth-providers-slate.md](../slates/tails/auth-providers-slate.md);
hooks the login/session lifecycle in
[connection.md](../subsystems/connection.md).

## Goals

- A user can **sign in with Twitch** as a co-equal provider alongside
  Google; a returning Twitch login resolves to the same `User`.
- Twitch identity **and OAuth tokens** persist in a `TwitchProfile`
  Document; the token fields are **encrypted at rest** and transparently
  decrypted on read.
- **Rotated tokens** (Twurple refresh) are written back encrypted with no
  manual intervention.
- The auth spine is **provider-parameterized**: adding a provider is a
  procedure argument, not a code fork. The Google login path and the
  `AUTH_MODE=test` E2E seam are behavior-preserved.
- An authenticated user can **link** the other provider to their existing
  `User` (symmetric: Twitch-origin links Google, Google-origin links
  Twitch); logging in via *any* linked provider lands on that same `User`.
- Linking a provider profile already owned by a **different** `User` is
  **refused** (no merge), with a clear message. Re-linking an
  already-linked provider is an idempotent no-op success.
- An authenticated user can **unlink** a provider: the `*ProfileId` is
  cleared and the orphaned Profile Document (with its stored tokens) is
  **deleted**. Unlinking the user's **only** provider is refused (the
  at-least-one invariant). Unlinking a not-linked provider is an
  idempotent no-op success.
- `User` permits either or both provider FKs, with an **at-least-one**
  invariant.
- The session records **which provider** authenticated it
  (`authProvider`), reserved for downstream name-refraction (unused by
  char-gen).

## Non-goals

- **Chat scopes** (`user:write:chat` / `user:read:chat`) and the
  incremental re-consent flow — deferred to the relay / funding cycles,
  requested incrementally on first chat use. Login here requests
  **minimal identity scope only**.
- **Proactive provider-side token revocation** on unlink — deleting our
  `TwitchProfile` removes our stored copy of the tokens (and the
  unreferenced token expires on its own), so calling Twitch's
  `/oauth2/revoke` is deferred hardening, not part of this build. It adds
  an external failure path for no local-security gain.
- **Account merge** (reconciling two `playerIds` sets when one human
  built two `User`s before linking) — its own project; collision is
  *refused*, not merged.
- **LLM name-refraction** — deferred; this build only *reserves*
  `session.authProvider`.
- **YouTube** — later, and as growth of `GoogleProfile` (it's Google
  OAuth), not a third `User` field.
- **char-gen changes** — char-gen-wave1 is untouched. The only
  provider-name touchpoint is the throwaway default-avatar-name, made
  provider-agnostic below.

## Surface decisions

### Two explicit FK fields, not a generic identity map
`User` gets `googleProfileId?: string` (was required, now optional) and
`twitchProfileId?: string` (new). Login providers are exactly two
(YouTube-later grows `GoogleProfile`), so a generic `identities[]` map is
the premature abstraction the codebase resists at N=2. Computed-key
access (`User.find({ [`${provider}ProfileId`]: id })`) carries the
parameterized spine; the data stays greppable and indexable.

### Token encryption = field marshaller, **no `CryptoApi`**
The slate's one open call. Resolved in favor of the marshaller path:
`Document.toDocument()` / `fromDocument()` already run
`static fieldMarshallers` natively (`toStored` on write, `fromStored` on
read — `Document.ts:149-211`), and `TwitchProfile` is a `Document`. So an
`EncryptedStringMarshaller` (a `Marshaller` subclass registered at a
templatePath, exactly like `QuantityMarshaller`) wired via
`TwitchProfile.fieldMarshallers` on `accessToken` / `refreshToken` keeps
the encryption **data-shaped with no new Api** — honoring the
no-new-Apis default. AES-256-GCM with a per-value IV; the stored envelope
carries IV + auth tag + ciphertext so tampering is detectable on decrypt.
Key is `TOKEN_ENC_KEY` (32 bytes) from SSM/`.env`.

### `TwitchProfile` carries tokens; `GoogleProfile` does not
Google is login-only (Passport gets the profile, mints a session,
discards the token). Twitch is called *as the user* for the life of the
link, so its profile is the credential-bearing one. `GoogleProfile` is
unchanged.

### Provider-parameterized procedure, not duplicated paths
The six Google-assuming layers (PassportConfig, AuthRoutes, Backend
`handleAuthenticationSuccess`, Application `findOrCreateUserFromGoogle`,
the default-avatar-name seed, PersistenceManager
collections/indexes) take a `provider` argument rather than forking. Exact
signatures are the planner's call; the decision is *parameterize the
procedure, keep the data as two explicit fields*.

### Linking: symmetric routes, collision-refuse, idempotent re-link
Authenticated `/auth/twitch/link` and `/auth/google/link` run the
provider OAuth and attach the resulting `*ProfileId` to the **current**
`User`. Three cases: (a) profile unowned → attach; (b) profile already on
the current `User` → no-op success; (c) profile owned by a *different*
`User` → refuse with a clear message ("that account is already linked to
another login"). No merge.

### Unlinking: delete the profile, defend the invariant
Authenticated `/auth/twitch/unlink` and `/auth/google/unlink` clear the
`*ProfileId` on the current `User` **and delete the orphaned Profile
Document** — the collision-refuse rule guarantees a profile belongs to
exactly one `User`, so deletion is safe, and it removes the stored
encrypted tokens rather than leaving them dangling. Unlinking the user's
**only** provider is refused (the at-least-one invariant); unlinking a
provider that isn't linked is a no-op success. Re-linking after an unlink
is the ordinary link flow (fresh profile).

### Provider-agnostic default-avatar-name accessor
The throwaway default avatar name at account creation reads a
provider-agnostic accessor (Google: `givenName ?? displayName`; Twitch:
`displayName ?? login`) so a Twitch-origin user doesn't fall to
`'Unnamed'`. char-gen overwrites this anyway.

### `session.authProvider` reserved
The session carries `authProvider: 'google' | 'twitch'` (which provider
*this session* logged in through), beside the existing `passport.user`
serialization. Unused this build; reserved for name-refraction.

## Constraints

- **No new Api unless justified.** The marshaller path is the chosen seam
  precisely because it avoids one. If the marshaller proves unable to
  carry the key cleanly, the minimal `CryptoApi` is the sanctioned
  fallback (cross-cutting security infra) — but the `Document` evidence
  above says the marshaller works. Do not add `CryptoApi` speculatively.
- **Token secrecy.** Access/refresh tokens are bearer credentials: never
  logged, never serialized to the client, encrypted at rest. Only the
  marshaller sees plaintext on the wire to/from Mongo.
- **Privacy modifiers.** `TwitchProfile` lives in `mud/lib/identity/`
  (domain) → TypeScript modifiers, and its **persistent fields are
  public** (the `Document` field-reflection reads them by name), matching
  `GoogleProfile` / `User`.
- **Behavior preservation.** The Google login path and the
  `AUTH_MODE=test` E2E seam are unchanged; the test seam passes
  `provider: 'google'`. A Google-login regression test must stay green.
- **Marshaller registration.** The `EncryptedStringMarshaller` singleton
  registers at a templatePath and must be resolvable by
  `resolveMarshaller` before any `TwitchProfile` round-trips (mirror the
  `QuantityMarshaller` registration pattern).
- **Invariant + collision at the persistence/link layer**, not in a
  controller — the at-least-one-provider invariant (enforced on both link
  and unlink), the different-owner collision, and the profile-deletion on
  unlink are data-integrity rules.
- **Secrets via [deployment.md](../deployment.md).** `TOKEN_ENC_KEY` is a
  new `SecureString` in SSM and a `.env` entry locally, alongside
  `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET`; add `TWITCH_CLIENT_ID` /
  `TWITCH_CLIENT_SECRET` likewise.

## Acceptance criteria

- Signing in with Twitch creates a `User` + `TwitchProfile`; the raw Mongo
  doc shows **ciphertext** (not plaintext) in `accessToken` /
  `refreshToken`, and a read decrypts transparently.
- A returning Twitch login resolves to the **same** `User` (no
  duplicate).
- A Twurple token refresh persists the rotated token **encrypted**
  (`onRefresh` write-back) — covered by a test.
- The Google login path and the `AUTH_MODE=test` E2E seam are unchanged
  (regression test green).
- A `User` with only `googleProfileId`, only `twitchProfileId`, or both is
  valid; a zero-provider `User` is rejected by the invariant.
- Authenticated linking attaches the second provider in **both**
  directions (Twitch→Google, Google→Twitch); afterward, login via either
  provider lands on the same `User`.
- Linking a profile owned by a **different** `User` is refused with a
  clear message; no merge, no data mutation. Re-linking the already-linked
  provider is a no-op success.
- Unlinking a provider clears the `*ProfileId` **and deletes** the
  orphaned Profile Document (verified gone from its collection). Unlinking
  the **only** linked provider is refused (invariant holds); unlinking a
  not-linked provider is a no-op success. After unlink, login via the
  removed provider creates a fresh account (no stale binding).
- A Twitch-origin user's default avatar name uses `displayName`/`login`,
  not `'Unnamed'`.
- `TOKEN_ENC_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` are
  documented in `deployment.md` and the `.env` example.
- Tests cover: marshaller round-trip (encrypt/decrypt + **tamper
  detection** on a corrupted envelope), provider-parameterized
  resolution, the collision refusal, the at-least-one invariant (link
  and unlink), and unlink-deletes-the-profile.
- At sweep: `connection.md` updated to describe the multi-provider spine,
  `TwitchProfile`, the linking flows, and `session.authProvider`.

## Cross-references

- **Seeding slate:** [auth-providers-slate.md](../slates/tails/auth-providers-slate.md)
- **Subsystem docs:** [connection.md](../subsystems/connection.md),
  [persistence-architecture-slate.md](../slates/tails/persistence-architecture-slate.md)
  (the `Document` base), [deployment.md](../deployment.md) (secrets)
- **Downstream (out of scope, depend on this):**
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md),
  the stake-ledger slice in
  [cooperative-slate.md](../slates/builds/cooperative-slate.md)
- **Track:** [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md) (Phase 1)
