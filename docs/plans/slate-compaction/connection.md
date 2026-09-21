# Slate compaction ledger — batch `connection`

Assigned slate: `docs/slates/tails/auth-providers-slate.md`

Doc-insert allowlist: `docs/subsystems/connection.md`. Anything
belonging in another doc goes to this file's *Handoff* section, never
into that doc directly.

No prior ledger for this batch key exists in this directory as of
2026-09-20. Per the assignment brief, a prior batch this pass (the
streaming batch) already verified `connection.md` documents `KickProfile`,
the `kick`/`kick-link` strategies, and Kick as a co-equal `AuthProvider` —
confirmed by reading `connection.md` § The Cast before starting.

---

## docs/slates/tails/auth-providers-slate.md — 206 → 80 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Duplicate second status block (`> **Status: Waves 1+2 shipped
  (2026-06)...**`, 17 lines) plus the stale intro paragraph ("The front
  door is currently Google-only...") — history; superseded by the
  canonical status block (pilot rule: one status block) and no longer
  true (three providers exist today, not one).
- `## Principle` (all 6 points, 22 lines) — code: `services/auth/
  PassportConfig.ts` (per-provider login + link strategies, `state:
  true` CSRF nonce), `backend/Application.ts`
  (`findOrCreateUserFromProvider`, `linkProvider`/`unlinkProvider`),
  `Collections.TwitchProfiles`/`KickProfiles`,
  `EncryptedStringMarshaller`; doc: `connection.md` § The Cast (co-equal
  providers, three optional FK fields, "premature at N=3", identity vs.
  credentials, encryption) and § Phase 1 (login-consent vs.
  feature-consent — now resolved differently than proposed, see
  Superseded below; no-char-gen-coupling / no-merge).
- `## The data model` (33 lines) — code:
  `packages/server/src/backend/User.ts` (three optional FK fields,
  `hasAnyProvider()`, `profileFieldFor(provider)`),
  `TwitchProfile`/`KickProfile` Document classes; doc: `connection.md`
  § The Cast table + prose covers the same shape in more depth
  (including the third field the slate didn't anticipate).
- `## The spine generalization (engine)` (18 lines, the six-layer
  table) — code: verified every named touchpoint exists as designed —
  `PassportConfig.ts` (per-provider strategies), `AuthRoutes.ts`
  (`/auth/{provider}[/link]`), `Backend.handleProviderAuth`/
  `handleProviderLink` (not `handleAuthenticationSuccess`, renamed),
  `Application.findOrCreateUserFromProvider`,
  `Application.defaultAvatarNameFor` (the provider-agnostic accessor,
  now covering Google/Twitch/Kick — grepped and read the function body),
  `PersistenceManager` collections; doc: `connection.md` § Phase 1
  documents the same six touchpoints under their shipped names.
- `## Token storage & encryption` (14 lines) — code:
  `EncryptedStringMarshaller` (grepped, used by `TwitchProfile`/
  `KickProfile` `save()`); doc: `connection.md` § Phase 1 ("routes
  through the Document's `save()` so the `EncryptedStringMarshaller`
  encrypts the token fields") and `persistence.md` (outside my list,
  already documents it — no graduation needed). The slate's "open call"
  (a `CryptoApi` vs. a field marshaller) is resolved: the marshaller
  shipped.
- `## Scopes` (10 lines) → the **login-scope** bullet only — code:
  `PassportConfig.ts` `TWITCH_IDENTITY_SCOPE = ['user:read:email']`;
  doc: `connection.md` § Phase 1 ("The login scope is identity-only").
  The **chat-scope** bullet is SUPERSEDED, not merely shipped-as-
  designed — see below.
- `## Linking & collisions` (11 lines) — code:
  `Application.linkProvider`/`unlinkProvider` (grepped and read); doc:
  `connection.md` § Phase 1 "Linking & unlinking" paragraph — same
  collision-refusal, same "no merge" call, verbatim-equivalent.
- `## No char-gen coupling` (7 lines) — code:
  `Application.defaultAvatarNameFor` (provider-agnostic, three
  providers); doc: `connection.md` § Phase 1 references the same
  accessor; `char-gen.md` (per the slate's own See-also, already
  documents char-gen as provider-agnostic). No graduation needed.
- `## Out of scope (named downstream)` → the **Twitch chat relay**
  bullet (5 lines) — SUPERSEDED, not cut-as-shipped-per-design; see
  below.
- `## Build waves` (14 lines, Wave 1 + Wave 2 descriptions) — doc:
  `connection.md` § History "Multi-provider auth (auth-providers build,
  2026-06)" restates the same outcome in one paragraph. The Wave 3+
  bullet (chat relay / name-refraction / YouTube) is preserved in
  substance in the new `## Left` section.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
(none — every SHIPPED claim in this slate was already documented in
`connection.md`, mostly in more depth than the slate itself)

### Superseded — cut
- `## Scopes` → the **chat-scope** bullet (`user:write:chat`/
  `user:read:chat` "deferred to the relay slate") — SUPERSEDED by what
  actually shipped: an **incremental reauth flow**
  (`GET /auth/twitch/reauth?scope=<allowed>`, a dedicated
  `twitch-reauth` Passport strategy with `force_verify`), not the
  "requested at the moment of use, appended to `TwitchProfile.scopes`"
  shape the slate sketched. Documented at `twitch-relay.md` (superseded
  → `streaming.md`) § "incremental-scope reauth flow" and `streaming.md`
  lines 216, 332 (`kick-reauth` + `chat:write`). Outside my insert list
  but already fully documented — cut with a pointer, no graduation
  needed.
- `## Out of scope (named downstream)` → the **Twitch chat relay**
  bullet — SUPERSEDED: it shipped, and shipped via the reauth mechanism
  above rather than the "append to `scopes[]` at first use" shape this
  slate proposed as the *downstream* build's job. Pointer left to
  `streaming.md`.
- ⚠ **A doc statement the code proves false, fixed in `connection.md`
  (my insert-doc allowlist), not just noted here**: `connection.md` §
  History's "Multi-provider auth" entry said *"Deferred: chat scopes,
  account merge, provider-side token revocation, name-refraction,
  YouTube"* — stale, since chat-scope reauth and the third provider
  (Kick) both shipped after that sentence was written. Edited in place
  (the sanctioned exception: "fix a statement the code proves false") to
  read: *"Kick shipped later as a **third** co-equal provider... and
  incremental chat-scope reauth... shipped with the relay build... Still
  deferred: account merge, provider-side token revocation,
  name-refraction, YouTube as a linkable/login provider."* This is the
  one edit to *existing* prose in my insert-doc allowlist; flagged here
  per the skill's rule.

### Kept (UNBUILT)
- **Account merge** — confirmed still unbuilt/refused: grepped
  `mergeAccount`/`accountMerge` across `packages/server/src` — no hits;
  `Application.linkProvider` still hard-refuses a collision. Kept, with
  a note (new, in the compacted slate) that this reads as a deliberate
  "won't build without a real reason" call the code already embodies,
  not a scheduled backlog item — judgment call, flagged in Uncertain
  below in case the coordinator wants it framed differently.
- **Provider-side token revocation** — confirmed still unbuilt:
  `unlinkProvider` deletes the local `*Profile` Document but the only
  `revoke`/`revocation` hit in the auth/backend tree
  (`TwitchClient.ts`) is EventSub **subscription** revocation handling
  (an unrelated concept — a dropped webhook, not the game calling
  Twitch's token-revoke endpoint on unlink). Kept.
- **YouTube as a linkable/login provider** — confirmed still unbuilt: no
  `YouTubeProfile`, no OAuth passport strategy for YouTube anywhere in
  `services/auth/`; `YoutubeClient.ts`/`YoutubeRelayReader.ts` exist
  only for the **streaming** read side (API-key based live-chat
  reading, no user OAuth). `character-youtube` is still a live rejection
  reason in `StreamerTarget.ts` (grepped, three call sites: `Tune`/
  `WatchController` + the type union in `api/stream.ts`) — the slate's
  own named symptom is still accurate. Kept, reworded slightly to note
  the streaming-side YouTube classes now exist (so a reader shouldn't
  mistake their presence for the login provider shipping).
- **LLM name-refraction** — confirmed still unbuilt: `session.
  authProvider` is threaded through (`Backend.ts` comment: "name-
  refraction (reserved this build)"; `PassportConfig.ts` comment:
  "reserved for downstream name-refraction") but nothing reads it as a
  char-gen input and no LLM seam exists. Kept.

### Uncertain — kept
- The "account merge" framing I added ("a 'won't build without a real
  reason' call... not a scheduled piece of work") is my own editorial
  judgment about how settled this is, not a code-proven fact — the
  slate's original wording ("Account merge is explicitly out of scope
  — reconciling two `playerIds` sets is its own project") already said
  much the same, so I don't believe I'm asserting anything new, but
  flagging since it's the one place I added interpretive framing rather
  than a pure pointer.

### Handoff (belongs in a doc outside my list)
(none — the chat-scope-reauth and Kick-related graduations both landed
in `streaming.md`/`twitch-relay.md` by an earlier build directly, not
via this compaction pass; nothing new needed a home outside
`connection.md`)

### Status block
- Left: *account merge · provider-side token revocation · incremental
  chat scopes (`user:write:chat`) · YouTube as a linkable provider (a
  `@`-seed still rejects `character-youtube`) · LLM name-refraction* →
  *account merge · provider-side token revocation · YouTube as a
  linkable/login provider (a `@`-seed still rejects
  `character-youtube`) · LLM name-refraction* — incremental chat scopes
  removed (shipped, documented in `streaming.md`/`twitch-relay.md` via a
  reauth flow, not the shape this slate itself proposed).
- Size: a tail → a tail (unchanged)
