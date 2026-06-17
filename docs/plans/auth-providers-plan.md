# Auth providers & account linking — implementation plan

This is Phase 1 of the broadcast-patronage track: generalize the
Google-only auth spine into a provider-parameterized one and add Twitch as
a co-equal login provider, with a token-bearing `TwitchProfile` Document
(tokens encrypted at rest), symmetric account linking/unlinking, and a
reserved `session.authProvider`. The full, closed scope and the
acceptance criteria live in
[../requirements/auth-providers-requirements.md](../requirements/auth-providers-requirements.md)
— read it first; this plan does not restate or expand it. Where this plan
and the requirements disagree, the requirements win.

The work is mechanical against existing patterns: `TwitchProfile` mirrors
`GoogleProfile` (a `Document`), the `EncryptedStringMarshaller` mirrors
`QuantityMarshaller`, and the spine parameterization threads a `provider`
argument through the six layers the slate's table names. The decided seam
is the field marshaller — **no `CryptoApi`**.

## Resolved decisions (investigation results)

**Login strategy: hand-rolled `passport-oauth2` strategy, not
`passport-twitch-*`.** The maintained passport-twitch packages are thin
wrappers over `passport-oauth2` with an extra Helix profile fetch;
`passport-twitch-strategy` is flagged inactive and the ecosystem is
fragmented across half a dozen forks. Rather than take a lightly-
maintained dependency, configure a `passport-oauth2` `OAuth2Strategy`
pointed at Twitch's endpoints (`https://id.twitch.tv/oauth2/authorize` and
`/oauth2/token`) and do the identity fetch (`GET
https://api.twitch.tv/helix/users` with the access token + `Client-Id`)
inside the verify callback. This keeps the login path on a first-tier
dependency (`passport-oauth2` already underpins
`passport-google-oauth20`) and mirrors the existing `GoogleStrategy` shape
exactly.

**Twurple is for the refresh seam, not login.** Login uses the raw OAuth2
token grant above; `@twurple/auth`'s `RefreshingAuthProvider` is what the
*downstream chat relay* will use to spend the stored tokens, and its
`onRefresh(userId, newTokenData)` callback is the refresh write-back hook.
Per the requirements this build only *stores* tokens and proves the
write-back path; it does not run the relay. So: add `@twurple/auth` as a
dependency now, and implement the write-back as a small method on the
persistence/link layer (`TwitchProfile.applyRefreshedToken` — see below)
that a `RefreshingAuthProvider` would call via `onRefresh`. The acceptance
test drives that method directly (it does not require a live Twurple
refresh round-trip).

**`needs a decision` — Twitch login redirect on link.** The link flow is
an *authenticated* OAuth round-trip. The cleanest wiring is a second
registered strategy instance (`'twitch-link'`) whose callback attaches to
the current `User` rather than minting a session. This is resolved below
as the recommended shape, but flag it for the build agent: if you prefer a
single `'twitch'` strategy with `passReqToCallback: true` and branch on a
`req.session.linkMode` flag, that is an equivalent valid choice. Pick one;
do not build both.

---

## Phase 1 — Data model + types

**1.1 Shared types** — modify `packages/types/src/index.ts`:
- `User`: change `googleProfileId: string` → `googleProfileId?: string`;
  add `twitchProfileId?: string`.
- Add a `TwitchProfile` interface mirroring `GoogleProfile` plus the
  credential fields: `twitchUserId`, `login`, `displayName`, `email?`,
  `rawProfile`, `accessToken`, `refreshToken`, `expiresAt: number`,
  `scopes: string[]`, `_id?`, `createdAt`, `updatedAt`.
- Add a `PassportTwitchProfile` interface (the normalized Helix identity
  the verify callback produces: `id`, `login`, `displayName`, `email?`,
  `_json`).
- Add `AuthProvider = 'google' | 'twitch'` and add `authProvider?:
  AuthProvider` to `SessionUser` (the serialized session principal already
  is `{ id }`; this reserves the field).

**1.2 `TwitchProfile` Document** — create
`packages/server/src/mud/lib/identity/TwitchProfile.ts`.
- **Module category:** Stuff-track Document subclass under `lib/identity/`
  (same category slot as `GoogleProfile.ts` — a `lib/<subsystem>`
  persisted record). TypeScript modifiers; persistent fields **public**
  (Document field-reflection reads them by name).
- `static collectionName = 'twitch_profiles'`.
- `static persistentFields = ['twitchUserId','login','displayName','email','rawProfile','accessToken','refreshToken','expiresAt','scopes']`.
- `static fieldMarshallers = { accessToken:
  EncryptedStringMarshaller.templatePath, refreshToken:
  EncryptedStringMarshaller.templatePath }` — the registration seam
  (Phase 2).
- `findByTwitchUserId(twitchUserId)` convenience, mirroring
  `GoogleProfile.findByGoogleId`.
- `applyRefreshedToken({ accessToken, refreshToken, expiresAt, scopes })`
  instance method that sets the fields and `save()`s — the `onRefresh`
  write-back target. The plaintext-in/encrypted-out happens automatically
  because `save()` → `toDocument()` runs the marshaller's `toStored` on
  the two token fields. This keeps the write-back at the Document layer,
  not in a controller.

**1.3 `User` Document** — modify
`packages/server/src/mud/lib/identity/User.ts`.
- `googleProfileId` becomes optional (drop the `= ''` default; type
  `string | undefined` — but keep it in `persistentFields`). Add
  `twitchProfileId?: string` to the class and to `persistentFields`.
- Add a provider-key accessor that the spine uses: a small static
  `profileFieldFor(provider: AuthProvider): 'googleProfileId' |
  'twitchProfileId'` so the computed-key `User.find({ [field]: id })` and
  the invariant have one source of truth for the key name. (This is a
  static method on the existing class — not a new free-floating helper.)
- Add `hasAnyProvider(): boolean` returning `!!(this.googleProfileId ||
  this.twitchProfileId)` — the at-least-one invariant predicate, living on
  the data object.

---

## Phase 2 — `EncryptedStringMarshaller` (dedicated design below)

**2.1** Create
`packages/server/src/mud/lib/persistence/EncryptedStringMarshaller.ts`.
- **Module category:** `Marshaller` subclass — same slot as
  `QuantityMarshaller.ts` (a `lib/persistence` `Marshaller<string,
  EncryptedEnvelope>`).
- `static readonly templatePath =
  TemplatePaths.encryptedStringMarshaller`.
- Implements `toStored(plaintext: string): EncryptedEnvelope` and
  `fromStored(stored: EncryptedEnvelope): string`. (Full envelope/key
  design in the dedicated section.)

**2.2** Add `encryptedStringMarshaller:
"/lib/persistence/EncryptedStringMarshaller"` to `TemplatePaths` in
`packages/server/src/mud/lib/paths.ts`.

**2.3 Seed** — create
`packages/server/src/mud/seeds/lib/persistence/EncryptedStringMarshaller/seed.yaml`
(mirrors the `QuantityMarshaller/*.yaml` shape: `class:
/lib/persistence/EncryptedStringMarshaller`, `hydratorClass:
/lib/persistence/PersistentHydrator`, empty/absent `data:`). Unlike
`QuantityMarshaller` there is **one** singleton (no per-unit parameter),
so a single seed file at the bare `templatePath` segment. The existing
`SeederManager` glob over `mud/seeds/` picks it up; `AppBootstrap` already
wires `Document.setMarshallerResolver` before any save runs, and
`findOrCreateProfile` paths call `save()` which preloads the marshaller
via `StuffApi.singleton`. No bootstrap code change needed.

**2.4 Test registration helper** — add an
`installEncryptedStringMarshaller()` helper (alongside
`installV1QuantityMarshallers` in
`packages/server/src/mud/lib/persistence/__tests__/`, or a sibling) that
calls `registerMarshallerForTest(() => new EncryptedStringMarshaller(),
EncryptedStringMarshaller.templatePath)` so marshaller and round-trip
tests resolve it in-memory without Mongo.

**`needs a decision` — key absence at boot.** The marshaller needs
`TOKEN_ENC_KEY` (32 bytes). Resolve in the plan as: **fail loud,
lazily.** The marshaller reads/validates the key on first
`toStored`/`fromStored`, not at construction, so boot in environments that
never touch `TwitchProfile` (CI without Twitch, the Google-only regression
suite) does not require the key. If the key is missing/wrong length when a
Twitch round-trip actually happens, throw a clear error. This matches the
`PassportConfig` "skip Google strategy if env absent" tolerance. Build
agent: confirm no boot path eagerly round-trips a `TwitchProfile`.

---

## Phase 3 — Spine parameterization (six layers; before/after section below)

**3.1 `PersistenceManager`** — modify
`packages/server/src/backend/PersistenceManager.ts`:
- Add `Collections.TwitchProfiles = 'twitch_profiles'`.
- In `createIndexes()`: add unique index `twitch_profiles.twitchUserId`,
  and index `users.twitchProfileId`. (Leave the existing
  `users.googleProfileId` index in place.)

**3.2 `Application`** — modify
`packages/server/src/backend/Application.ts`:
- Rename/generalize `findOrCreateUserFromGoogle(profile)` →
  `findOrCreateUserFromProvider(provider: AuthProvider, profile)`. Keep
  `findOrCreateUserFromGoogle` as a thin delegate that calls
  `findOrCreateUserFromProvider('google', profile)` **only if** other
  callers can't be updated cleanly — prefer updating all callers (Backend)
  and removing the Google-named method to honor no-dead-code. (See 3.4 for
  the test seam, which must keep passing `provider: 'google'`.)
- `findOrCreateGoogleProfile` → `findOrCreateProfile(provider, profile)`:
  branch on provider to upsert the right collection/key
  (`google_profiles`/`googleId` vs `twitch_profiles`/`twitchUserId`). For
  Twitch, persist the encrypted token fields by going through
  `TwitchProfile.save()` (so the marshaller runs) rather than a raw
  `PersistenceManager.save` of plaintext — important: the Google path uses
  raw PM saves today, but the Twitch path **must** route through the
  Document so tokens never hit Mongo in plaintext.
- `findOrCreateUser(googleProfileId, profile)` → `findOrCreateUser(provider,
  profileId, profile)`: resolve via the computed key `User.find({
  [User.profileFieldFor(provider)]: profileId })`; on create, set the
  right `*ProfileId`.
- Default-avatar-name: replace the inline `profile.name?.givenName ??
  'Unnamed'` read with a **provider-agnostic accessor**. Add a small
  static `defaultAvatarNameFor(provider, profile)` (Google: `givenName ??
  displayName`; Twitch: `displayName ?? login`) on `Application` or —
  cleaner — a static on `User`/an identity helper so it's greppable. This
  is the only char-gen-adjacent touch and is throwaway (char-gen
  overwrites).

**3.3 `Backend`** — modify `packages/server/src/backend/Backend.ts`:
- `handleAuthenticationSuccess(profile, done)` →
  `handleProviderAuth(provider: AuthProvider, profile, done)`; the
  `runRoot` frame calls `app.findOrCreateUserFromProvider(provider,
  profile)`. The serialized session principal becomes `{ id, authProvider:
  provider }` (reserving `authProvider`).
- `syntheticTestProfile` stays Google-shaped; `handleTestAuthentication`
  calls `handleProviderAuth('google', profile, done)` (or
  `findOrCreateUserFromProvider('google', ...)` directly), preserving the
  E2E seam exactly.

**3.4 `PassportConfig`** — modify
`packages/server/src/services/auth/PassportConfig.ts`:
- Keep the Google strategy; its verify callback now calls
  `backend.handleProviderAuth('google', profile, done)`.
- Add a Twitch `OAuth2Strategy` (`passport-oauth2`) registered under name
  `'twitch'`, gated on
  `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`/`TWITCH_CALLBACK_URL` presence
  (same skip-if-absent tolerance as Google). Its verify callback receives
  `accessToken`, `refreshToken`, does the Helix `/users` fetch to build a
  `PassportTwitchProfile`, attaches the tokens (`expiresAt` from the token
  response, `scopes` from the granted scope), and calls
  `backend.handleProviderAuth('twitch', profileWithTokens, done)`.
- Register a second strategy `'twitch-link'` (same config, different
  callback URL) whose verify callback does **not** mint a session but
  instead resolves the link against the current user — see Phase 5. (Or
  the `passReqToCallback` single-strategy variant flagged above.)
- `serializeUser`/`deserializeUser` carry `authProvider` alongside `id`.

---

## Phase 4 — Twitch login route + secrets

**4.1 `AuthRoutes`** — modify
`packages/server/src/services/auth/AuthRoutes.ts`:
- Add `GET /auth/twitch` (`passport.authenticate('twitch', { scope:
  [<minimal identity scope>] })` — identity only, e.g. `user:read:email`;
  **no chat scopes**, per non-goals) and `GET /auth/twitch/callback`
  mirroring the Google callback's success/failure redirects.
- Keep `/auth/google`, `/auth/status`, `/auth/logout` unchanged.

**4.2 Secrets/docs** — modify `docs/deployment.md` and the `.env` example
block: add `TOKEN_ENC_KEY` (32-byte key; document generation, e.g.
`openssl rand -base64 32`), `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`TWITCH_CALLBACK_URL` as new SSM `SecureString` flat keys alongside
`GOOGLE_*`/`SESSION_SECRET`.

**4.3 Dependencies** — add `passport-oauth2` (+ `@types/passport-oauth2`)
and `@twurple/auth` to `packages/server/package.json`. (Plan only — the
build agent runs the install; do not install during planning.)

After Phase 4 the acceptance criterion "sign in with Twitch creates
`User`+`TwitchProfile` with ciphertext at rest, decrypts on read;
returning login → same `User`" is satisfiable.

---

## Phase 5 — Account linking

Linking is an authenticated OAuth round-trip that attaches the second
provider's `*ProfileId` to the current `User`. The **collision-refuse**
and **at-least-one** rules are data-integrity logic at the
persistence/link layer, not in the route handler.

**5.1 Link logic on the data layer** — add the link/unlink operations as
methods reachable from the auth callbacks. Per the "invariant + collision
at the persistence/link layer" constraint, put them on `Application` (the
existing find-or-create owner) as:
- `linkProvider(userId, provider, profile): Promise<LinkResult>` — upsert
  the provider profile (via `findOrCreateProfile`), then:
  - (a) profile unowned → set `user[profileField] = profileId`, save →
    `linked`.
  - (b) profile already on this `User` → no-op → `already-linked`.
  - (c) profile owned by a *different* `User` (query `User.find({
    [profileField]: profileId })` returns a different `_id`) → **refuse**,
    no mutation → `collision` with the clear message.
- `unlinkProvider(userId, provider): Promise<UnlinkResult>`:
  - not linked → no-op → `not-linked`.
  - linked but it's the user's only provider (check `User.hasAnyProvider`
    would be false after removal) → **refuse** → `only-provider`.
  - otherwise clear `user[profileField]`, save the user, then **delete the
    orphaned Profile Document** (`TwitchProfile.findById(...).delete()` /
    `GoogleProfile` equivalent) — collision-refuse guarantees single
    ownership so deletion is safe and removes the stored encrypted tokens.
    → `unlinked`.

**5.2 Link routes** — modify `AuthRoutes.ts`:
- `GET /auth/twitch/link` and `GET /auth/google/link`, each behind
  `AuthMiddleware.requireAuth` (session must already be authenticated;
  current user id from `req.user`). They kick off the
  `'twitch-link'`/`'google-link'` strategy.
- The link callbacks resolve the OAuth profile, then call
  `Application.linkProvider(req.user.id, provider, profile)` and redirect
  with a result-coded query param (`?link=success|already|collision`). The
  collision message rides the redirect for the client to surface.

**5.3 Backend seam** — add a `handleProviderLink(provider, userId,
profile, done)` on `Backend` (mirrors `handleProviderAuth`'s `runRoot`
discipline — only `backend/**` may push call frames, per the comment in
`handleTestAuthentication`), so the `services/`-layer route never calls
`Application` across the frame boundary directly. The link strategy verify
callback calls this.

After Phase 5: bidirectional linking, collision refusal, idempotent
re-link, and "login via any linked provider → same `User`" are satisfied.

---

## Phase 6 — Unlink routes

Unlink needs no OAuth round-trip (it operates on the existing `User`), so
these are simple authenticated POSTs.

**6.1** Modify `AuthRoutes.ts`: add `POST /auth/twitch/unlink` and `POST
/auth/google/unlink` behind `AuthMiddleware.requireAuthApi` (JSON 401 if
unauthenticated). Each calls `Backend.handleProviderUnlink(provider,
req.user.id, done)` → `Application.unlinkProvider`, returning the
`UnlinkResult` as JSON (`{ status: 'unlinked' | 'not-linked' |
'only-provider', message? }`). `only-provider` returns a 4xx with the
invariant message; the others return 200.

---

## Phase 7 — Tests + docs

Test files live in `__tests__/` siblings, matching the repo convention.
Map (Phase 8 details the criteria mapping):

- `mud/lib/persistence/__tests__/EncryptedStringMarshaller.test.ts` —
  round-trip, tamper detection, key-missing error.
- `mud/lib/identity/__tests__/TwitchProfile.test.ts` — Document round-trip
  with marshalled token fields (raw doc shows ciphertext, read decrypts);
  `applyRefreshedToken` write-back re-encrypts.
- `backend/__tests__/` (or alongside existing Application/Backend tests) —
  provider-parameterized resolution (`findOrCreateUserFromProvider` for
  both providers; returning login → same `User`), the at-least-one
  invariant on create/link/unlink, collision refusal,
  unlink-deletes-profile, Google regression (the existing Google login
  test must stay green, and the `provider:'google'` test seam unchanged).

Docs: at sweep, update `docs/subsystems/connection.md` (multi-provider
spine, `TwitchProfile`, link/unlink flows, `session.authProvider`). The
auth-flow ASCII diagram (lines ~65–185) and the entity table (lines
~28–34) both need the Twitch parallel. The requirements/plan docs are
retired at sweep per the `finalize` skill.

---

## `EncryptedStringMarshaller` design

A `Marshaller<string, EncryptedEnvelope>` subclass, registered exactly
like `QuantityMarshaller` (singleton at a `templatePath`, resolved by
`Document`'s injected `resolveMarshaller`). It is the only code that sees
token plaintext on the wire to/from Mongo.

**Envelope (stored shape).** AES-256-GCM, fresh random IV per value:

```
EncryptedEnvelope = {
  v: 1,            // format version, for future re-key/algorithm migration
  iv: string,      // base64, 12-byte GCM nonce, fresh per toStored call
  tag: string,     // base64, 16-byte GCM auth tag
  ct: string,      // base64 ciphertext
}
```

Storing a structured object (not a concatenated blob) keeps it greppable
in Mongo and version-tolerant. `v` lets a later re-key migration
distinguish formats.

**`toStored(plaintext)`** — `crypto.randomBytes(12)` IV,
`crypto.createCipheriv('aes-256-gcm', key, iv)`, encrypt, read
`getAuthTag()`, return the envelope. **`fromStored(env)`** — validate
`env.v === 1` and shape, `createDecipheriv`, `setAuthTag(env.tag)`,
decrypt. GCM's auth tag makes **tamper detection** automatic: a corrupted
`ct`/`tag`/`iv` throws `Unsupported state or unable to authenticate data`
on `final()`; wrap it in a clear `EncryptedStringMarshaller: token
decryption failed (tampered or wrong key)` error. The tamper test
corrupts one base64 char of `ct` and asserts the throw.

**Key loading.** `TOKEN_ENC_KEY` from `process.env` (32 bytes; accept
base64 or hex — document base64 and `openssl rand -base64 32`). Validate
length once, **lazily on first use** (see the boot decision above), and
cache the decoded `Buffer`. Never log the key or any plaintext.

**Why no `CryptoApi`.** `Document.toDocument`/`fromDocument` already run
`fieldMarshallers` natively (lines 149–213), `TwitchProfile` is a
`Document`, and the marshaller singleton resolves through the boot-wired
seam. The encryption is fully data-shaped at the field boundary with zero
new Api surface — honoring the no-new-Apis default. The requirements name
the minimal `CryptoApi` only as a sanctioned fallback; the `Document`
evidence says it's unnecessary, so do not add it.

---

## Provider-parameterized spine (before / after)

| Layer | File | Before | After |
|---|---|---|---|
| Strategy | `services/auth/PassportConfig.ts` | one `GoogleStrategy`; verify → `handleAuthenticationSuccess(profile)` | Google strategy + Twitch `OAuth2Strategy` (`'twitch'`/`'twitch-link'`), gated on env; both verify → `handleProviderAuth(provider, profile)`; session carries `authProvider` |
| Routes | `services/auth/AuthRoutes.ts` | `/auth/google` + callback | + `/auth/twitch` + callback (login); `/auth/{twitch,google}/link` + callbacks (authed); `/auth/{twitch,google}/unlink` (authed POST) |
| I/O boundary | `backend/Backend.ts` | `handleAuthenticationSuccess(profile, done)` | `handleProviderAuth(provider, profile, done)`, `handleProviderLink(provider, userId, profile, done)`, `handleProviderUnlink(provider, userId, done)`; test seam passes `'google'` |
| Find-or-create | `backend/Application.ts` | `findOrCreateUserFromGoogle` → `findOrCreateGoogleProfile` + `findOrCreateUser(googleProfileId)` | `findOrCreateUserFromProvider(provider, profile)` → `findOrCreateProfile(provider, profile)` + `findOrCreateUser(provider, profileId, profile)`; resolve via `User.find({ [User.profileFieldFor(provider)]: id })`; `linkProvider`/`unlinkProvider` |
| Default avatar name | `backend/Application.ts` | `profile.name?.givenName ?? 'Unnamed'` | provider-agnostic `defaultAvatarNameFor(provider, profile)` (Google: `givenName ?? displayName`; Twitch: `displayName ?? login`) |
| Collections/indexes | `backend/PersistenceManager.ts` | `Collections.GoogleProfiles`; indexes `users.googleProfileId`, `google_profiles.{googleId,email}` | + `Collections.TwitchProfiles`; indexes `twitch_profiles.twitchUserId` (unique), `users.twitchProfileId` |
| Session | `PassportConfig` serialize/deserialize | `{ id }` | `{ id, authProvider }` |

The data stays two explicit FK fields (`googleProfileId?`,
`twitchProfileId?`) with an at-least-one invariant — no generic
`identities[]` map.

---

## Test plan (keyed to acceptance criteria)

| Acceptance criterion | Test |
|---|---|
| Twitch login → `User`+`TwitchProfile`, ciphertext at rest, transparent decrypt on read | `TwitchProfile.test.ts`: save with plaintext tokens, assert raw PM doc fields are envelope objects (not the plaintext), reload via `findById` and assert decrypted plaintext matches |
| Returning Twitch login → same `User` (no duplicate) | Application provider test: call `findOrCreateUserFromProvider('twitch', ...)` twice, assert one `User` |
| Twurple refresh persists rotated token encrypted (`onRefresh` write-back) | `TwitchProfile.test.ts`: `applyRefreshedToken(...)`, reload, assert new plaintext + raw doc is ciphertext |
| Google path + `AUTH_MODE=test` seam unchanged | Existing Google login regression test stays green; test seam asserted to call `provider:'google'` |
| only-google / only-twitch / both valid; zero-provider rejected | invariant test on `User.hasAnyProvider` + `unlinkProvider`/create paths |
| Linking both directions → login via either lands same `User` | link test: Google-origin links Twitch and vice versa; subsequent provider resolve returns same `_id` |
| Different-owner link refused, clear message, no mutation; re-link no-op | `linkProvider` collision test (asserts `collision`, no field change) + idempotent re-link test (`already-linked`) |
| Unlink clears FK + deletes orphaned Profile (gone from collection); only-provider refused; not-linked no-op; post-unlink login = fresh account | `unlinkProvider` tests: assert FK cleared, `Profile.findById` returns null, `only-provider` refusal holds invariant, `not-linked` no-op, fresh-login path |
| Twitch-origin default avatar name uses `displayName`/`login` not `'Unnamed'` | `defaultAvatarNameFor` unit test |
| `EncryptedStringMarshaller` round-trip + tamper detection | `EncryptedStringMarshaller.test.ts`: encrypt→decrypt equality; corrupt envelope → throws |
| Secrets documented | manual check that `deployment.md` + `.env` example list `TOKEN_ENC_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`(, `TWITCH_CALLBACK_URL`) |

---

## File manifest (ordered)

**Created**
1. `packages/server/src/mud/lib/persistence/EncryptedStringMarshaller.ts`
2. `packages/server/src/mud/seeds/lib/persistence/EncryptedStringMarshaller/seed.yaml`
3. `packages/server/src/mud/lib/identity/TwitchProfile.ts`
4. `packages/server/src/mud/lib/persistence/__tests__/EncryptedStringMarshaller.test.ts`
5. `packages/server/src/mud/lib/identity/__tests__/TwitchProfile.test.ts`
6. Application/Backend provider+link+unlink tests under `packages/server/src/backend/__tests__/`
7. (test helper) an `installEncryptedStringMarshaller()` registration helper under `packages/server/src/mud/lib/persistence/__tests__/`

**Modified**
1. `packages/types/src/index.ts` (User optional FK + twitchProfileId, TwitchProfile, PassportTwitchProfile, AuthProvider, SessionUser.authProvider)
2. `packages/server/src/mud/lib/paths.ts` (`TemplatePaths.encryptedStringMarshaller`)
3. `packages/server/src/mud/lib/identity/User.ts` (optional FKs, `profileFieldFor`, `hasAnyProvider`)
4. `packages/server/src/backend/PersistenceManager.ts` (`Collections.TwitchProfiles`, indexes)
5. `packages/server/src/backend/Application.ts` (provider-param find-or-create, `linkProvider`/`unlinkProvider`, `defaultAvatarNameFor`)
6. `packages/server/src/backend/Backend.ts` (`handleProviderAuth`/`handleProviderLink`/`handleProviderUnlink`, session principal)
7. `packages/server/src/services/auth/PassportConfig.ts` (Twitch strategies, `authProvider` serialization)
8. `packages/server/src/services/auth/AuthRoutes.ts` (twitch login + link/unlink routes)
9. `packages/server/package.json` (`passport-oauth2`, `@types/passport-oauth2`, `@twurple/auth`)
10. `docs/deployment.md` + `.env` example (new secrets)
11. (sweep) `docs/subsystems/connection.md`

## Open items flagged for the build agent
- **Link strategy shape**: separate `'twitch-link'`/`'google-link'`
  strategies (recommended) vs single strategy + `passReqToCallback` +
  session `linkMode`. Pick one.
- **Key absence at boot**: lazy validation on first round-trip
  (recommended) — confirm no boot path eagerly round-trips a
  `TwitchProfile`.
- **Minimal Twitch identity scope**: requirements say "minimal identity
  only"; `user:read:email` covers email, bare token covers
  `login`/`displayName` via Helix. Confirm the exact scope string against
  current Twitch docs at build time (no chat scopes).

## Cross-references
- Requirements: [auth-providers-requirements.md](../requirements/auth-providers-requirements.md)
- Seeding slate: [auth-providers-slate.md](../slates/tails/auth-providers-slate.md)
- Subsystem: [connection.md](../subsystems/connection.md)
- Track: [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md) (Phase 1)
