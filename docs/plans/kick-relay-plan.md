# Kick relay — implementation plan

Kick becomes the **third transport** under the shipped unified streaming
surface ([streaming.md](../subsystems/streaming.md)): `watch` a Kick stream in
the cockpit embed and `tune` its chat into the console with full parity to
Twitch and YouTube, plus **Kick as a full auth provider** (`KickProfile` +
`/auth/kick` login + `/auth/kick/link`) so a player can sign in with Kick,
`tune <character>` resolves a linked Kick slug, and an
external Kick speaker with a linked character renders the `external-linked`
persona case. The surface layer (verbs, `StreamerTarget`, the composite-keyed
`StreamRelay`, presence-gating, `RelaySpeaker`, history/throttle) is already
built and shared — this build widens the platform vocabulary and adds one
transport pair (`KickClient`/`KickRelayReader`) plus the **first inbound
webhook receiver** in the streaming stack (Kick delivers chat by signed HTTP
POST, not an outbound connection). Kick enters as a **co-equal auth
provider** — login + link, one unified provider interface, no link-only
tier. Read-only v1: posting is a named phase 2
and reject-and-points. Read
`docs/requirements/kick-relay-requirements.md` in full before starting; its
decisions are closed and this plan implements them.

External API facts (already researched; do not re-research): OAuth 2.1 at
`https://id.kick.com/oauth/authorize` / `https://id.kick.com/oauth/token`,
PKCE S256 mandatory, client-credentials grant yields an app access token,
link scope `user:read`. Event subscriptions at
`https://api.kick.com/public/v1/events/subscriptions` (POST/DELETE; app token
may subscribe with explicit `broadcaster_user_id`; event `chat.message.sent`
name+version required; DELETE takes ids as query params; limits far above
presence-gated scale). Webhook deliveries carry `Kick-Event-Signature`
(Base64 RSA-PKCS1v15), `Kick-Event-Message-Id` (ULID), `Kick-Event-Message-
Timestamp` (RFC3339), `Kick-Event-Type`, `Kick-Event-Version`; verify SHA256
over `messageId.timestamp.rawBody` (period-joined) against Kick's public key
from `GET https://api.kick.com/public/v1/public-key` (cache; re-fetch once on
verify failure). Channels lookup: `GET
https://api.kick.com/public/v1/channels?slug=…` (app token) →
`broadcaster_user_id`. Embed: `https://player.kick.com/<slug>` iframe,
autoplay/muted params, renders offline channels gracefully (persistent
Twitch-style binding — no liveness gate, no auto-untune).

## Grounding (facts established by investigation)

- **The pure parser** (`packages/server/src/mud/lib/streaming/StreamerTarget.ts`):
  `Platform = 'twitch' | 'youtube'` (line 26); `TargetOpts {twitch?,
  youtube?}` (47–50); `parse` classifies URL → conflict-check → bare handle
  by opt → character fallthrough (70–111); `parseUrl` keys on host substrings
  then `URL`-parses with a defaulted scheme, stripping `www.` (138–194);
  `stripAt` (129–131). Twitch bare-handle branch strips a leading `@`
  (101–107); `@`-seed + `--youtube` is the `character-youtube` reject
  (93–99). Pure/total — no network/DB.
- **The relay singleton** (`packages/server/src/mud/obj/StreamRelay.ts`):
  local `type Service = 'twitch' | 'youtube'` (line 46); composite
  `channelKey(service, key)` (98–100); mutators return presence edges
  (`addTuned` 119–136, `removeTuned` 142–154, `dropPlayer` 177–192);
  `deliver` hand-builds the frame on `world.${service}.message` through
  `MessageApi.sendMessage` and emits `Events.RelayMessage` per line
  (312–368); overlay sentinel `OVERLAY_SENTINEL = 'overlay:broadcast'` (86);
  history ring, echo tags, token buckets are all service-agnostic. **Zero
  structural change needed** — only the `Service` union widens.
- **The bridge** (`packages/server/src/mud/obj/api/StreamLogic.ts`): local
  `type Service` (37); `resolveTarget` branches reject / character / youtube
  / twitch (60–73); `tune` drives the 0→1 subscribe per platform (77–97);
  `unsubscribeReader` switches on service (372–375); `dropPlayer` is the
  centralized logout drop (126–130); `resolveCharacter` walks online Avatar →
  `User.twitchProfileId` → `TwitchProfile.login` (343–368); module-scope
  overlay state + `openOverlayTwitch`/`openOverlayYoutube` sentinel-tune on
  `setOverlayReading` (284–297, 401–444); `resolveSpeaker` maps a Twitch
  sender to `external-linked` via `TwitchProfile.findByTwitchUserId` →
  `User.find({twitchProfileId})` → online avatar (517–543); `post` rejects
  `service !== 'twitch'` as `read-only` (213). The logic imports both readers
  directly (26–27) — the sanctioned Api→backend bridge.
- **The facade** (`packages/server/src/mud/api/stream.ts`): inline
  `'twitch' | 'youtube'` unions on `tune`/`untune`/`whoTuned`/`historyFor`/
  `post`/`dispatchInbound`/`dropChannel` signatures and on
  `TuneResult`/`UntuneResult` (68, 126–201); `NormalizedInbound` is already
  platform-agnostic (105–111); tail `SecurityApi.decorateApiClass(StreamApi)`
  (214).
- **The transport-pair shape to mirror**
  (`packages/server/src/backend/YoutubeClient.ts` + `YoutubeRelayReader.ts`):
  client = private-ctor singleton + `forTest(transport)` (140–155), env read
  in ctor, `isConfigured()` (158–164), token cached until near-expiry
  (172–199), memoized resolve cache (137, 207–227), injected transport
  interface for tests (49–58). Reader = singleton + `forTest(client)`
  (40–48), idempotent `boot()` with **no** `PlayerLoggedOut` observer (50–55
  — the drop is centralized in `StreamLogic.dropPlayer`), inbound wrapped in
  `ExecutionContextApi.runRoot(null, 'youtube.inbound', …)` →
  `StreamApi.dispatchInbound` (76–94), AppSetting read with try/catch
  fallback (110–118). `TwitchRelayReader` keeps a `broadcasterId → subId`
  map (39) and boots the single `PlayerLoggedOut` observer covering all
  readers (75–80). Boot site: `AppBootstrap.ts:292–296` boots both readers
  unconditionally.
- **The OAuth spine** (`packages/server/src/services/auth/PassportConfig.ts`):
  the Twitch strategies are hand-rolled on generic `passport-oauth2`
  `OAuth2Strategy` with `state: true`, skip-if-env-absent (147–159); the
  `twitch-link` strategy resolves the profile in the verify callback and the
  route binds it to the current user (201–241); identity fetched in
  `buildTwitchProfile` (300–345). **PKCE is natively supported by the
  installed `passport-oauth2@1.8.0`**: `options.pkce === true` selects S256
  and a session-backed `PKCEStateStore`, and **requires `state: true`**
  (`node_modules/.../passport-oauth2/lib/strategy.js:102–112`); session
  middleware is live before the auth routes (`Server.ts:114–125`), so
  `{ state: true, pkce: true }` works as-is — the one mechanical delta from
  the Twitch transcription.
- **The link/unlink route shape**
  (`packages/server/src/services/auth/AuthRoutes.ts`): `setupLinkRoutes(app,
  provider, strategyName)` with a per-provider scope ternary (169–231);
  `setupUnlinkRoute` POST behind `requireAuthApi` (329–356); the reauth flow
  (244–321) is Twitch-only and **not** transcribed this cycle (phase-2 seam).
- **The link data path** (`packages/server/src/backend/Application.ts`):
  `ProviderProfile = PassportGoogleProfile | PassportTwitchProfileWithTokens`
  (58–60); `findOrCreateProfile` branches on provider (404–414);
  `findOrCreateTwitchProfile` routes through the Document so the
  `EncryptedStringMarshaller` runs (460–483); `findProfileIdByIdentity`
  (536–552); `linkProvider` collision-check-then-upsert (562–604);
  `unlinkProvider` with the at-least-one **login**-provider invariant
  hardcoded as a binary google/twitch other-field check (614–656).
  `Backend.handleProviderLink`/`handleProviderUnlink` forward
  (`Backend.ts:348–397`).
- **The identity Document to transcribe**
  (`packages/server/src/mud/lib/identity/TwitchProfile.ts`): collection
  `twitch_profiles` (32), `persistentFields` (37–47), `fieldMarshallers`
  encrypting both tokens (54–57), `findByTwitchUserId` (108–113),
  `applyRefreshedToken` (122–133), `hasScope` (140–142). `User.ts`:
  `persistentFields` (32–36), `profileFieldFor` (45–49), `hasAnyProvider`
  over the two **login** FKs (87–89). `PersistenceManager.ts`:
  `Collections.TwitchProfiles = 'twitch_profiles'` (34); unique index on
  `twitchUserId` + Users index on `twitchProfileId` (615–626).
- **Express topology** (`packages/server/src/services/Server.ts`): global
  `express.json()` at line 90 — it consumes the body stream for every
  JSON request, so a route registered after it **cannot** recover raw bytes;
  session/passport middleware at 114–118; backend REST routes register in
  `setupRoutes` before the SPA `*` fallback (174–205). Therefore the webhook
  route must mount **before `express.json()` and before session/passport**
  (in `setupMiddleware`, right after CORS) with a route-local `express.raw`
  — which also satisfies "touches no session/auth middleware" by
  construction, and is trivially before the SPA catch-all.
- **Overlay forwarding** (`packages/server/src/backend/BroadcastFeed.ts`):
  env helpers `overlayTwitchLogin`/`overlayYoutubeChannel` (42–50);
  `isOverlayOwnChannel` matches the configured handle per service (58–66);
  the `Events.RelayMessage` listener filters + pushes `RelayChatEnvelope`
  (157–179); the 0→1/1→0 broadcast-presence edges drive
  `StreamApi.setOverlayReading` (115, 129).
- **Events** (`packages/server/src/mud/lib/events.ts`): `RelayMessageEvent`
  carries `service: 'twitch' | 'youtube'` (144–152).
- **Types** (`packages/types/src/index.ts`): `AuthProvider = 'google' |
  'twitch'`, documented as **login** providers (1353–1358);
  `PassportTwitchProfile`/`WithTokens` (1379–1397); `TwitchProfile` interface
  (1322–1347); `WatchTarget` three-variant union (1514–1517); `RelaySpeaker`
  service unions (2689–2701); `RelayMessagePayload.service` (2712);
  `TWITCH_SCOPE_*` consts (2677–2678).
- **Client**: `StreamEmbed.iframeFor` narrows twitch-then-youtube — a kick
  variant breaks the `else` narrowing, so the embed case must land with the
  type widening (`packages/client/src/components/embed/StreamEmbed.tsx:81–108`;
  test at `__tests__/StreamEmbed.test.tsx`). `relayTemplate` `SERVICE_COLOR`
  map (`packages/client/src/lib/templates/relayTemplate.tsx:31–34`) and the
  `tune <handle> --<service>` chip (84) are service-parameterized — one color
  entry lights up kick. Topic routing: `TemplateRegistry.ts:49–50` prefixes;
  `App.tsx` `RELAY_TOPICS` (39–42) + `relayFrameFields` (51–73);
  `store/index.ts` `ConsoleFrame.relay.service: "twitch" | "youtube"`
  (229–236). `WatchController.setWatch`/`embedFor` have the same narrowing
  coupling server-side (`WatchController.ts:145–175`).
- **Verbs**: `tune.yaml`/`watch.yaml` declare the boolean `twitch`/`youtube`
  options (`mud/cmd/stream/tune.yaml:27–35`, `watch.yaml:23–31`);
  `TuneController` has local `Service` (25), a `read-only` reject hardcoding
  the YouTube message (117–123), and reject texts naming only two flags
  (275–348). `stream.yaml`/`StreamController` is the overlay operator verb —
  **no kick change needed**.
- **Topic seed**:
  `mud/seeds/lib/messaging/Topic/world.twitch.message.yaml` (+
  `world.youtube.message.yaml` sibling) — class `/lib/messaging/Topic`,
  `topic`/`family`/`label`/`description` data.
- **AppSettings**: keys declared in
  `mud/lib/config/AppSettings.ts` (`youtubePollIntervalMs` at 415, the
  comment-block-per-namespace style) and seeded in
  `mud/config/app-settings.yaml` (youtube block at 238–247).
- **Conventions**: module-scope-declares lint with two sanctioned exceptions
  (CLAUDE.md 328–341); never `.js` import extensions (345); 80-char
  prettier; fixed module taxonomy (358+); secrets never logged
  (`YoutubeClient` header comment: "Tokens are never logged").
- **Test precedents**: `backend/__tests__/YoutubeRelayReader.test.ts`
  (forTest + mocked `StreamApi` spies), `YoutubeClient.test.ts`,
  `TwitchClient.test.ts`, `Application.providers.test.ts`,
  `BroadcastFeed.overlay.test.ts`, `HelpRoutes.test.ts` (supertest against a
  minimal Express app; `supertest@^7` is a devDependency),
  `mud/lib/streaming/__tests__/StreamerTarget.test.ts`,
  `obj/api/__tests__/StreamLogic.test.ts` (drives through the `StreamApi`
  facade with `vi.spyOn(TwitchRelayReader, 'get')` mocks),
  `obj/command/stream/__tests__/{Tune,Watch}Controller.test.ts`, client
  `StreamEmbed.test.tsx` + `TemplateRegistry.test.ts`.

Constraints honored throughout: no new Api/Logic pair (`StreamApi`/
`StreamLogic` absorb the kick branches); `KickClient`/`KickRelayReader`/
webhook pieces in `backend/` reached by the direct-import bridge (no DI port,
no new events); `KickProfile` in `mud/lib/identity/`; no `Kick*` verb
surface; `StreamerTarget.parse` stays pure/total; `kick.*` dials in
AppSettings; secrets never logged; the webhook route verifies before parsing
and touches no session/auth middleware; unconfigured env → fully dormant;
module-scope-declares lint; no `.js` import extensions; 80-char style
(server files single-quoted, client files double-quoted, matching their
surroundings).

---

## Decisions

- **DECISION A — Kick is a co-equal `AuthProvider`, not a link-only tier.**
  `AuthProvider` (types/index.ts:1353–1358) widens to `'google' | 'twitch'
  | 'kick'` — **no separate link-provider type** (one unified provider
  interface: if an identity can link, it can log in — a standing project
  rule). Every provider-typed surface follows from the widening with no
  signature forks: `User.profileFieldFor`,
  `Application.{findOrCreateProfile, findProfileIdByIdentity,
  findOrCreateUserFromProvider, linkProvider, unlinkProvider}`,
  `Backend.{handleProviderAuth, handleProviderLink, handleProviderUnlink}`,
  `AuthRoutes.{setupLinkRoutes, setupUnlinkRoute}`, `ProviderProfile`.
  Kick gets the full flow set: the `kick` **login** strategy (verify →
  `handleProviderAuth('kick', …)` → the already-generic
  `findOrCreateUserFromProvider`) + `/auth/kick` + `/auth/kick/callback`
  routes + the start-screen provider entry, alongside `kick-link` +
  unlink. The at-least-one invariant (`hasAnyProvider`, the unlink
  `only-provider` check) counts **all three** provider FKs — a kick-only
  user is a real login account and must keep at least one provider.
- **DECISION B — webhook route mounts pre-middleware with route-local raw
  body.** Because the global `express.json()` (Server.ts:90) consumes the
  stream, `KickWebhookRoutes.setup(this.app)` is called in
  `Server.setupMiddleware` immediately after the CORS block (after line 87,
  before body parsing). The route is `POST /webhooks/kick` with route-local
  `express.raw({ type: () => true, limit: '256kb' })`, giving byte-exact
  `req.body: Buffer` for signing, and — being registered before
  session/passport — structurally cannot touch auth middleware. It responds
  404 when the transport is unconfigured (dormancy, no info leak).
- **DECISION C — verification order and outcomes.** The verifier checks, in
  order: header presence (`malformed`) → signature over
  `messageId.timestamp.rawBody` against the cached public key, with **one**
  key re-fetch-and-retry on failure (rotation hedge) → timestamp within the
  `kick.replayWindowSec` window (both past and future skew) → ULID dedup
  ring insert (`duplicate` if already seen). Only `ok` dispatches. The route
  answers `200` for `ok` **and** `duplicate` (at-least-once redelivery is
  not an error; acking stops retries), `401` for signature/staleness/
  malformed (drop + `console.warn` with reason + messageId — never the body,
  signature, or any token), `404` when dormant.
- **DECISION D — subscription lifecycle rides the presence edges with an id
  map; no debounce v1.** `KickRelayReader` keeps `broadcasterId →
  subscriptionId` (the `TwitchRelayReader.subs` shape, line 39) and
  creates/deletes on the exact 0→1/1→0 edges `StreamLogic` already drives.
  Twitch's 1.5 s debounce exists for EventSub-session cost; Kick
  create/delete is a plain REST call with no documented rate limit — start
  undedounced (simpler), with the requirements' named fallback (hold
  subscriptions long-lived, gate dispatch) as a deferred seam.
- **DECISION E — persistent Twitch-style binding.** No liveness check at
  `watch`/`tune` time, no auto-untune, no `dropChannel` path for Kick
  (`player.kick.com` renders offline channels; chatrooms outlive broadcasts).
  The kick `StreamerTarget` is `('kick', broadcasterId, slugLower)` —
  `key` = the numeric `broadcaster_user_id` as a string (the subscription
  condition and the webhook `channelKey`), `handle` = the slug.
- **DECISION F — character-form resolution is Twitch-first, Kick-fallback.**
  `StreamLogic.resolveCharacter` keeps its Twitch walk; when the user has no
  `twitchProfileId` (or the Twitch profile has no login), it tries
  `kickProfileId` → `KickProfile.slug` → the kick resolve. A character with
  both links resolves Twitch (the two-way platform wins; deterministic,
  documented). `unlinked` is returned only when neither link exists.
- **DECISION G — `KickProfile` stores both the identity and the channel.**
  The link verify callback fetches identity from `GET
  https://api.kick.com/public/v1/users` (token owner) **and** the owner's
  channel from `GET https://api.kick.com/public/v1/channels` (token-owner
  form, no slug param) to capture `slug` + `broadcasterUserId` — the fields
  character-form `tune` and the reverse speaker-link need. A user with no
  Kick channel links fine with an empty `slug`; character-form resolution
  then rejects `unlinked`.
- **DECISION H — one new reject vocabulary entry, reuse the rest.** The
  parser's reject union is unchanged (kick conflicts reuse
  `url-opt-conflict`/`ambiguous-handle`); the `read-only` post reject is
  reused for Kick with a service-aware controller message naming the phase-2
  deferral. No new `TuneReason` values.
- **DECISION I — module homes.** New backend files: `KickClient.ts`,
  `KickRelayReader.ts`, `KickWebhookVerifier.ts`, `KickWebhookRoutes.ts` —
  all in `packages/server/src/backend/` (infrastructure singletons, the
  `BroadcastFeed`/`HelpRoutes` precedents; `backend/` is outside the
  `mud/**` module-scope lint but keeps the same discipline). New mud file:
  `mud/lib/identity/KickProfile.ts` (Document). New seed:
  `mud/seeds/lib/messaging/Topic/world.kick.message.yaml`. No new module
  categories, no new Api.
- **DECISION J — env + dials.** Env (all through the SSM deploy-time
  materialization, [deployment.md](../deployment.md)): `KICK_CLIENT_ID`,
  `KICK_CLIENT_SECRET`, `KICK_CALLBACK_URL` (the login callback,
  `https://<host>/auth/kick/callback` — the Twitch shape),
  `KICK_WEBHOOK_URL` (the public webhook URL registered in the Kick dev app;
  part of the reader's `isConfigured` gate), `OVERLAY_KICK_CHANNEL` (the
  owner's own slug, sibling of the two `OVERLAY_*` sentinels). AppSettings
  (`kick.*`, seeded in `app-settings.yaml`, keys in `AppSettingKeys`):
  `kick.replayWindowSec` = `"300"`, `kick.dedupTtlSec` = `"900"`,
  `kick.dedupMaxSize` = `"4096"`, `kick.resolveCacheTtlMs` = `"3600000"`.
  Transport dormancy gates on `KICK_CLIENT_ID` + `KICK_CLIENT_SECRET` +
  `KICK_WEBHOOK_URL`; the auth strategies gate independently on
  `KICK_CLIENT_ID` + `KICK_CLIENT_SECRET` + `KICK_CALLBACK_URL`
  (PassportConfig skip-if-absent precedent) — so local dev can run fully
  dormant, or provider-only without a tunnel. `KICK_CALLBACK_URL` is the
  **login** callback (`https://<host>/auth/kick/callback`), with the link
  callback derived via `.replace` exactly as Twitch does.

---

## Phase 1 — Vocabulary seams: platform unions, parser, watch embed, client cases

Everything compile-coupled to the union widening lands together (the
`WatchTarget`/`RelaySpeaker` narrowing chains force it). At the end of this
phase `watch` works end-to-end for Kick (the embed needs no external call),
and `tune … --kick` parses but reject-and-points `no-relay` (placeholder
resolve branch).

### Files

**`packages/types/src/index.ts`** —
- `WatchTarget` (1514) gains `| { platform: "kick"; channel: string }`.
- `RelaySpeaker` (2689): both `service` unions gain `'kick'`; update the doc
  comment (external-linked now spans twitch + kick).
- `RelayMessagePayload.service` (2712) gains `'kick'`.
- Add `export const KICK_SCOPE_USER_READ = 'user:read';` beside the
  `TWITCH_SCOPE_*` consts (2677).

**`packages/server/src/mud/lib/streaming/StreamerTarget.ts`** —
- `Platform` (26) → `'twitch' | 'youtube' | 'kick'`; `TargetOpts` gains
  `kick?: boolean`; update the header comment.
- `parse` (70): compute `wantKick = opts.kick === true`. URL branch: conflict
  when the URL's platform disagrees with **any** set opt (generalize the
  two-way check at 81–84 to: `url.platform !== each wanted platform` →
  `url-opt-conflict`). Bare-token branch: **more than one** opt set →
  `ambiguous-handle` (replaces the twitch&&youtube check at 89–92); then
  `wantKick` → `{ form: 'handle', platform: 'kick', identifier:
  stripAt(raw).toLowerCase() }` (slugs are case-insensitive; mirror the
  Twitch `stripAt`); `wantYoutube`/`wantTwitch`/character branches unchanged.
- `parseUrl` (138): add `kick.com` to `looksLikeUrl`; after the twitch host
  case add `if (host === 'kick.com') { const slug = segments[0]; return slug
  ? { platform: 'kick', identifier: slug } : null; }`. (Slug-only —
  `kick.com/video/…` and clip URLs are out of scope; the first path segment
  is the channel.)

**`packages/server/src/mud/obj/StreamRelay.ts`** — `Service` (46) gains
`'kick'`. Nothing else (the table, delivery topic
`world.${service}.message`, history, sentinel are composite-keyed already).

**`packages/server/src/mud/lib/events.ts`** — `RelayMessageEvent.service`
(145) gains `'kick'`.

**`packages/server/src/mud/api/stream.ts`** — widen every inline
`'twitch' | 'youtube'` union (`TuneResult` 68, `UntuneResult` 78–82, and the
`untune`/`whoTuned`/`historyFor`/`post`/`dispatchInbound`/`dropChannel`
signatures 126–193) to include `'kick'`. `dropChannel` stays
YouTube-semantics (kick never calls it; note in the doc comment).

**`packages/server/src/mud/obj/api/StreamLogic.ts`** — `Service` (37) gains
`'kick'`; `resolveTarget` (60) gains a placeholder branch **before** the
twitch fallthrough: `if (parsed.platform === 'kick') return { ok: false,
reason: 'no-relay' };` (replaced in Phase 4). `tune`'s platform switch (90)
gains a kick arm that is unreachable this phase (or guard identically —
implementers may land the full arm in Phase 4; keep it compiling either
way). `unsubscribeReader` (372) gains a no-op kick arm (Phase 4 fills it).

**`packages/server/src/mud/obj/command/stream/TuneController.ts`** —
- `Service` (25) gains `'kick'`; `TuneModel` gains `kick?: boolean`;
  `parseTarget` (73) passes `kick: model.kick`.
- `executePost`'s `read-only` case (117–123): service-aware message — kick →
  `'Kick chat is read-only for now — posting arrives with Kick phase 2.'`;
  youtube keeps its message.
- Reject texts mention the third flag: `empty`/`ambiguous-handle`/
  `unknown-character` messages become `--twitch/--youtube/--kick` variants
  (275–335); `rejectResolve`'s `no-relay` gains a kick line ("Kick relay
  isn't configured.", keyed on the parsed platform, 313–319).

**`packages/server/src/mud/obj/command/stream/WatchController.ts`** —
- `WatchModel` gains `kick?: boolean`; the `StreamerTarget.parse` call (78)
  passes it.
- `embedFor` (145): before the youtube classify, `if (parsed.platform ===
  'kick') return { platform: 'kick', channel: parsed.identifier };` (kick
  needs no resolve — slug is the embed key).
- `setWatch` label (168–173): add the kick arm (`Kick #${target.channel}`).
- Character branch (100–103): build the `WatchTarget` from
  `resolved.target.platform` instead of hardcoding twitch — twitch|kick →
  `{ platform, channel: resolved.target.handle }` (character never resolves
  youtube). This is inert until Phase 4 makes characters resolve kick.

**`packages/server/src/mud/cmd/stream/tune.yaml` + `watch.yaml`** — add the
option block:

```yaml
  kick:
    type: boolean
    field: kick
    description: "The target is a Kick channel slug"
```

and extend the `help` prose (a third bullet: `tune xqc --kick`,
`tune kick.com/xqc`; note Kick chat is read-only this cycle).

**`packages/server/src/mud/lib/config/AppSettings.ts`** — new commented
block (the youtube block at 408–424 is the style exemplar):
`kickReplayWindowSec: "kick.replayWindowSec"`, `kickDedupTtlSec:
"kick.dedupTtlSec"`, `kickDedupMaxSize: "kick.dedupMaxSize"`,
`kickResolveCacheTtlMs: "kick.resolveCacheTtlMs"`.

**`packages/server/src/mud/config/app-settings.yaml`** — seed the four keys
(defaults from DECISION J) with a comment block, after the youtube entries
(238–247).

**`packages/server/src/mud/seeds/lib/messaging/Topic/world.kick.message.yaml`**
— transcribe the twitch sibling: topic `world.kick.message`, family
`world.kick`, label `Kick Chat`, description mirroring the twitch one
(subscription-gated, provenance in payload).

**Client** —
- `packages/client/src/components/embed/StreamEmbed.tsx` — `iframeFor` (81)
  gains a kick case before the youtube fallthrough:

  ```tsx
  if (target.platform === "kick") {
    return (
      <iframe
        title="Kick stream"
        src={`https://player.kick.com/${encodeURIComponent(
          target.channel,
        )}?autoplay=true&muted=true`}
        sandbox={IFRAME_SANDBOX}
        allow="autoplay; fullscreen"
      />
    );
  }
  ```

  (muted autoplay so the embed starts under every browser autoplay policy —
  the Twitch-parity treatment; offline channels render Kick's offline card.)
- `packages/client/src/lib/templates/relayTemplate.tsx` — `SERVICE_COLOR`
  gains `kick: "#53fc18"` (Kick green); header comment updated. The
  `tune <handle> --kick` chip preview falls out of the existing
  `--${t.service}` template (84).
- `packages/client/src/lib/templates/TemplateRegistry.ts` — add
  `{ prefix: 'world.kick', template: relayTemplate }` beside lines 49–50.
- `packages/client/src/App.tsx` — `RELAY_TOPICS` (39) gains
  `"world.kick.message"`.
- `packages/client/src/store/index.ts` — `ConsoleFrame.relay.service` (230)
  gains `"kick"`.

### Tests

- **`mud/lib/streaming/__tests__/StreamerTarget.test.ts`** (extend): kick
  URLs — `kick.com/xqc`, `https://kick.com/xqc`, `www.kick.com/xqc`,
  `kick.com/xqc?something#frag` → `{form:'url', platform:'kick',
  identifier:'xqc'}`; bare `xqc --kick` → handle/kick; `@xqc --kick` strips
  the `@`; `--kick --twitch` (and each other pair) → `ambiguous-handle`;
  `kick.com/xqc --twitch` and `twitch.tv/shroud --kick` and
  `youtu.be/x --kick` → `url-opt-conflict`; bare `alice` (no opts) still →
  `character` (fallthrough unchanged); `kick.com` with no path → not a URL
  match (falls to character).
- **`obj/command/stream/__tests__/WatchController.test.ts`** (extend):
  `watch xqc --kick` writes `cockpit.watch = {platform:'kick',
  channel:'xqc'}` and pushes it; `watch kick.com/xqc` same; label text.
- **`obj/command/stream/__tests__/TuneController.test.ts`** (extend):
  `tune xqc --kick` with the placeholder resolve → the "Kick relay isn't
  configured." reject; `tune xqc --kick --twitch` → ambiguous message
  naming all three flags.
- **client `StreamEmbed.test.tsx`** (extend): kick target renders an iframe
  with `player.kick.com/xqc` src (+ autoplay/muted params), sandboxed.
- **client `TemplateRegistry.test.ts`** (extend): `world.kick.message`
  resolves to `relayTemplate`.

Green gate: `pnpm -r build && pnpm -r test && pnpm lint:module-scope`.

---

## Phase 2 — The Kick auth provider: `KickProfile`, login + link strategies, routes, data path

### Files

**`packages/types/src/index.ts`** —
- `AuthProvider` (1353–1358) widens to `'google' | 'twitch' | 'kick'` —
  co-equal login providers, one unified interface (DECISION A). Every
  provider-typed signature downstream follows from the widening.
- `PassportKickProfile { id: string; slug: string; displayName: string;
  email?: string; broadcasterUserId: string; _json: Record<string, unknown> }`
  and `PassportKickProfileWithTokens extends PassportKickProfile
  { accessToken: string; refreshToken: string; expiresAt: number;
  scopes: string[] }` (the 1379–1397 shape).
- `KickProfile` interface mirroring `TwitchProfile` (1322–1347):
  `kickUserId`, `slug`, `displayName`, `email?`, `broadcasterUserId`,
  `rawProfile`, `accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  timestamps.

**`packages/server/src/mud/lib/identity/KickProfile.ts`** (new) — transcribe
`TwitchProfile.ts`:
- `static collectionName = 'kick_profiles'`; `persistentFields =
  ['kickUserId', 'slug', 'displayName', 'email', 'broadcasterUserId',
  'rawProfile', 'accessToken', 'refreshToken', 'expiresAt', 'scopes']`;
  `fieldMarshallers` = `EncryptedStringMarshaller.templatePath` on both
  token fields.
- Fields with the same defaults style; `slug` lowercased at write.
- `static findByKickUserId(kickUserId: string)`, `applyRefreshedToken(…)`,
  `hasScope(scope)`, `toString()` — byte-parallel to TwitchProfile 108–147.

**`packages/server/src/backend/PersistenceManager.ts`** —
`Collections.KickProfiles = 'kick_profiles'` (beside line 34); in
`ensureIndexes` add the unique `{ kickUserId: 1 }` index on KickProfiles and
a `{ kickProfileId: 1 }` index on Users (the 615–626 pattern).

**`packages/server/src/mud/lib/identity/User.ts`** —
- `persistentFields` gains `'kickProfileId'`; field `kickProfileId?: string`
  (the third co-equal provider FK).
- `profileFieldFor(provider: AuthProvider)` returns
  `'googleProfileId' | 'twitchProfileId' | 'kickProfileId'` with a
  three-way map (45–49).
- `hasAnyProvider` (87–89) gains the third FK — a kick-only user is a real
  login account.

**`packages/server/src/backend/Application.ts`** —
- `ProviderProfile` (58) gains `| PassportKickProfileWithTokens`.
- `findOrCreateProfile`/`findProfileIdByIdentity` (404, 536) gain kick
  branches (signatures already `AuthProvider` — the widening flows
  through, including `findOrCreateUserFromProvider` at 370); new private
  `findOrCreateKickProfile(profile: PassportKickProfileWithTokens)`
  transcribing `findOrCreateTwitchProfile` (460–483) onto `KickProfile`
  (Document route so the marshaller runs; tokens never in a raw PM save).
- `unlinkProvider`'s only-provider check (629–638) is generalized per
  DECISION A: `const providerFields = ['googleProfileId',
  'twitchProfileId', 'kickProfileId'] as const;` — refuse when the field
  being cleared is the user's only set provider FK (all three counted).
  The orphan delete gains the `KickProfile` branch (644–650).
- `defaultAvatarNameFor` (518): kick arm returns `displayName || slug ||
  'Unnamed'` — a real path now (kick login mints accounts).

**`packages/server/src/backend/Backend.ts`** — no signature changes
(`handleProviderAuth`/`handleProviderLink`/`handleProviderUnlink` are
already `AuthProvider`-typed; the widening flows through).

**`packages/server/src/services/auth/PassportConfig.ts`** —
- Consts: `KICK_AUTHORIZE_URL = 'https://id.kick.com/oauth/authorize'`,
  `KICK_TOKEN_URL = 'https://id.kick.com/oauth/token'`,
  `KICK_USERS_URL = 'https://api.kick.com/public/v1/users'`,
  `KICK_CHANNELS_URL = 'https://api.kick.com/public/v1/channels'`;
  `export const KICK_IDENTITY_SCOPE = ['user:read'];`.
- `configure()` calls new `configureKick()`.
- `configureKick()`: gate on `KICK_CLIENT_ID`/`KICK_CLIENT_SECRET`/
  `KICK_CALLBACK_URL` (skip-with-warn, 152–158 precedent). Register the
  **strategy pair**, both `new OAuth2Strategy({ authorizationURL:
  KICK_AUTHORIZE_URL, tokenURL: KICK_TOKEN_URL, clientID, clientSecret,
  callbackURL, state: true, pkce: true }, verify)` — PKCE S256 + session
  state store, grounded above:
  - `'kick'` (login) — callback `KICK_CALLBACK_URL`; verify calls
    `buildKickProfile(…)` then `this.backend.handleProviderAuth('kick',
    withTokens, done)` (the twitch login shape, 160–198).
  - `'kick-link'` — callback derived
    `KICK_CALLBACK_URL.replace('/auth/kick/callback',
    '/auth/kick/link/callback')` (the twitch-link shape, 201–241); verify
    resolves the profile and `done(null, withTokens)` — the route owns the
    current-user binding.
  **No `kick-reauth`** (the phase-2 posting seam).
- `buildKickProfile(...)`: fetch `KICK_USERS_URL` with
  `Authorization: Bearer <accessToken>` → `{ data: [{ user_id, name,
  email, … }] }`; then best-effort fetch `KICK_CHANNELS_URL` (token-owner
  form) → `{ data: [{ broadcaster_user_id, slug, … }] }` (tolerate failure
  → empty slug/broadcasterUserId, DECISION G). Assemble
  `PassportKickProfileWithTokens` with `expiresAt`/`scopes` from `params`
  (reuse `normalizeScopes`, 351–359). Never log tokens.

**`packages/server/src/services/auth/AuthRoutes.ts`** —
- Login routes: `/auth/kick` (`passport.authenticate('kick', { scope:
  KICK_IDENTITY_SCOPE })`) + `/auth/kick/callback` with the
  `failureRedirect`/`auth=success` handler — transcribe the Twitch pair
  (67–83) verbatim.
- `setupLinkRoutes` (169): replace the twitch/google scope ternary with a
  small scope map — `google → ['profile','email']`, `twitch →
  TWITCH_IDENTITY_SCOPE`, `kick → KICK_IDENTITY_SCOPE`. (Signatures already
  `AuthProvider`-typed via the widening.)
- In `setup` (85–97): add `AuthRoutes.setupLinkRoutes(app, 'kick',
  'kick-link');` and `AuthRoutes.setupUnlinkRoute(app, 'kick');`.

**`packages/client/src/components/StartScreen.tsx`** — the data-shaped
`PROVIDERS` list (93–110) gains the kick entry: `{ key: "kick", label:
"Continue with Kick", href: "/auth/kick", … }` with the Kick-green accent,
matching the existing entries' shape (the list was built for exactly this
one-more-entry case; header comment 8–9).

### Tests

- **`backend/__tests__/Application.providers.test.ts`** (extend):
  `findOrCreateUserFromProvider('kick', profile)` mints a User + a
  `KickProfile` (the login path, mirrored from the twitch login cases);
  `linkProvider(userId, 'kick', profile)` creates a `KickProfile` (tokens
  round-trip through the marshaller — assert the loaded doc's plaintext,
  and that a raw collection read is not plaintext if the existing test
  harness checks that for twitch), sets `User.kickProfileId`, returns
  `linked`; same-user relink → `already-linked`; other-user → `collision`
  with no write; `unlinkProvider(userId, 'kick')` on a multi-provider user
  clears the FK + deletes the doc; a **kick-only** user unlinking kick
  gets `only-provider` (all three FKs counted); a google-only user with a
  kick link may unlink google freely (the kick FK counts toward
  at-least-one).
- If a PassportConfig-level test exists for twitch strategy registration,
  mirror it for the kick pair; otherwise strategy registration is covered
  by the skip-if-absent warn path (no new harness).

Green gate: full build + tests.

---

## Phase 3 — Backend transport substrate: `KickClient` + `KickWebhookVerifier`

Pure backend infrastructure with injected transports — fully unit-testable,
no tunnel, nothing wired to the relay yet.

### Files

**`packages/server/src/backend/KickClient.ts`** (new; the `YoutubeClient`
shape) —
- Consts: `KICK_TOKEN_URL = 'https://id.kick.com/oauth/token'`,
  `KICK_API_BASE = 'https://api.kick.com/public/v1'`.
- `export interface KickTransport { fetch: typeof fetch }` (HTTP-only — no
  socket; the webhook is the inbound half).
- Header comment: responsibilities (app-token auth, slug resolve,
  subscription create/delete, public-key fetch), layer note, "tokens and the
  client secret are never logged".
- `private constructor(opts?: { transport?: KickTransport })` reading
  `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` / `KICK_WEBHOOK_URL` from env;
  `static get()`, `static forTest(transport)` (YoutubeClient 140–155).
- `isConfigured(): boolean` — all three env values non-empty (DECISION J).
- `appToken(): Promise<string | null>` — client-credentials POST
  (`grant_type=client_credentials`, `client_id`, `client_secret`, urlencoded
  body) to `KICK_TOKEN_URL`; cache `{value, expiresAt}` with the 60 s
  early-refresh guard (YoutubeClient 172–199). `null` on failure; never
  throws, never logs the secret.
- `resolveSlug(slug: string, cacheTtlMs: number): Promise<{ broadcasterId:
  string; slug: string } | 'unknown'>` — lowercase/trim; TTL cache
  `Map<slug, {broadcasterId, expiresAt}>`; on miss GET
  `${KICK_API_BASE}/channels?slug=<slug>` with the app token; read
  `data[0].broadcaster_user_id` (+ canonical `data[0].slug` when present);
  `'unknown'` on any failure.
- `createChatSubscription(broadcasterId: string): Promise<{ id: string }>`
  — POST `${KICK_API_BASE}/events/subscriptions`, JSON body
  `{ broadcaster_user_id: Number(broadcasterId), events: [{ name:
  'chat.message.sent', version: 1 }], method: 'webhook' }`, app token; read
  the created subscription id from `data[0].subscription_id` (fall back
  defensively to `data[0].id`); throw on non-2xx (the reader catches +
  logs, `TwitchRelayReader.doSubscribe` precedent 155–165).
- `deleteSubscriptions(ids: string[]): Promise<void>` — DELETE
  `${KICK_API_BASE}/events/subscriptions?id=<id>[&id=…]` with the app
  token; ignore 404.
- `fetchPublicKey(): Promise<string | null>` — GET
  `${KICK_API_BASE}/public-key` (no auth needed; send none) → PEM from
  `data.public_key`; `null` on failure.

**`packages/server/src/backend/KickWebhookVerifier.ts`** (new) —
- `export interface KickEventHeaders { messageId: string; timestamp:
  string; signature: string; eventType: string; eventVersion: string }`.
- `export type KickVerifyResult = 'ok' | 'malformed' | 'bad-signature' |
  'stale' | 'duplicate' | 'no-key';`
- Class `KickWebhookVerifier`: `static get()`; `static forTest(opts:
  { fetchKey: () => Promise<string | null>; now?: () => number })`. The
  real key source is `() => KickClient.get().fetchPublicKey()`.
- State: `private keyPem: string | null`, `private dedup: Map<string,
  number>` (ULID → expiry, insertion-ordered for FIFO eviction).
- `async verify(headers: KickEventHeaders, rawBody: Buffer):
  Promise<KickVerifyResult>` — per DECISION C:
  1. any missing header / unparseable RFC3339 timestamp → `'malformed'`;
  2. signature: build the period-joined
     `messageId + '.' + timestamp + '.' + rawBody` payload (byte-exact;
     only the rawBody is untrusted bytes), verify with
     `createVerify('RSA-SHA256').update(payload).verify(keyPem,
     signature, 'base64')` (PKCS1v15 is the node default for RSA keys). If
     the cached key fails (or is null), re-fetch **once** and retry
     (`no-key` when fetch yields nothing; `bad-signature` when both
     attempts fail);
  3. staleness: `|now − Date.parse(timestamp)| > replayWindowSec × 1000`
     → `'stale'`;
  4. dedup: seen-and-unexpired messageId → `'duplicate'`; else insert with
     `now + dedupTtlSec × 1000`, evicting expired entries and, above
     `dedupMaxSize`, the oldest.
- Dial reads: private helpers over `AppApi.setting(AppSettingKeys.kick…)`
  with try/catch numeric fallbacks 300 / 900 / 4096 (the
  `YoutubeRelayReader.pollIntervalMs` shape, 110–118).

### Tests

- **`backend/__tests__/KickClient.test.ts`** — injected `{fetch}` transport
  capturing requests: `appToken` posts the client-credentials form and
  caches until expiry (second call = no fetch); `isConfigured` false when
  any env var absent (use `vi.stubEnv`); `resolveSlug` GETs
  `/channels?slug=xqc` with `Authorization: Bearer …`, returns the
  broadcaster id, caches within TTL, `'unknown'` on 404/error;
  `createChatSubscription` sends the exact body (name/version/method/
  broadcaster id as number) and returns the id; `deleteSubscriptions`
  builds the multi-`id` query; `fetchPublicKey` returns the PEM; error
  paths never include the secret in messages.
- **`backend/__tests__/KickWebhookVerifier.test.ts`** — generate a keypair
  with `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })`; sign
  `${messageId}.${timestamp}.${body}` with
  `createSign('RSA-SHA256')`; verifier via `forTest` with a fake
  `fetchKey` returning the public PEM and an injectable `now`. Cases:
  valid → `'ok'`; wrong key / garbage signature → `'bad-signature'` (and
  `fetchKey` called twice — the rotation re-fetch); altered body →
  `'bad-signature'`; timestamp older than the window → `'stale'` (and a
  future-skewed one); replay of the same messageId → `'duplicate'`;
  missing header → `'malformed'`; key rotation: first key fails, re-fetch
  returns the right key → `'ok'`.

Green gate: full build + tests.

---

## Phase 4 — The relay: `KickRelayReader`, webhook route, `StreamLogic` kick branches, overlay, boot

### Files

**`packages/server/src/backend/KickRelayReader.ts`** (new; the
`YoutubeRelayReader` shape) —
- Header comment: presence-gated webhook-subscription worker; inbound
  arrives via `KickWebhookRoutes` (not a socket); `PlayerLoggedOut` drop is
  centralized in `StreamLogic.dropPlayer` — **no observer here**
  (YoutubeRelayReader 50–55 precedent).
- Singleton + `forTest(client: KickClient)`; `boot()` idempotent
  `console.info('KickRelayReader: booted (read-only, webhook-subscription
  presence-gated).')`.
- `isConfigured(): boolean` → `client.isConfigured()`.
- `resolveSlug(slug: string): Promise<{ broadcasterId: string; slug:
  string } | 'unknown'>` — forwards to
  `client.resolveSlug(slug, resolveCacheTtlMs())` where
  `resolveCacheTtlMs()` reads `AppSettingKeys.kickResolveCacheTtlMs`
  (try/catch fallback 3 600 000).
- `private subs = new Map<string, string>()` (broadcasterId →
  subscriptionId; the `TwitchRelayReader.subs` shape).
- `async subscribe(broadcasterId: string): Promise<void>` — the 0→1 edge:
  return if `subs.has`; `client.createChatSubscription` → `subs.set`;
  catch → `console.error('KickRelayReader: subscribe <id> failed:', err)`
  (no debounce, DECISION D).
- `unsubscribe(broadcasterId: string): void` — the 1→0 edge: pop the id;
  `void client.deleteSubscriptions([id])` with catch-log.
- `handleInbound(event: unknown): void` — normalize; drop null; wrap the
  down-call: `void ExecutionContextApi.runRoot(null, 'kick.inbound', () =>
  StreamApi.dispatchInbound('kick', norm))` (YoutubeRelayReader 80–89).
- Module-tail `function normalizeKickChatEvent(ev): NormalizedInbound |
  null` — defensively read `broadcaster.user_id` → `channelKey` (String),
  `sender.user_id` → `senderUserId`, `sender.username` → `senderLogin` /
  `senderDisplay` (fall back to `sender.channel_slug`), `content` → `text`;
  null when channelKey or text missing (the `TwitchRelayReader.normalize`
  shape, 194–212).

**`packages/server/src/backend/KickWebhookRoutes.ts`** (new; class with
`static setup(app: Express)` — the `HelpRoutes` registration shape, mounted
per DECISION B) —
- `public static readonly PATH = '/webhooks/kick';`
- `setup`: `app.post(KickWebhookRoutes.PATH, express.raw({ type: () =>
  true, limit: '256kb' }), handler)`.
- Handler:
  1. `if (!KickRelayReader.get().isConfigured()) { res.status(404).end();
     return; }` (dormant).
  2. Read headers (case-insensitive via `req.header(...)`):
     `Kick-Event-Signature`, `Kick-Event-Message-Id`,
     `Kick-Event-Message-Timestamp`, `Kick-Event-Type`,
     `Kick-Event-Version`; `rawBody = req.body as Buffer` (guard
     `Buffer.isBuffer`).
  3. `const result = await KickWebhookVerifier.get().verify(headers,
     rawBody);`
  4. `'ok'` → `res.status(200).end()`, then if `eventType ===
     'chat.message.sent'`: `JSON.parse(rawBody.toString('utf8'))` in
     try/catch → `KickRelayReader.get().handleInbound(parsed)`. Other
     event types are acked and ignored.
  5. `'duplicate'` → 200, no dispatch. Everything else → 401 +
     `console.warn('KickWebhookRoutes: dropped delivery (<result>)
     messageId=<id>')` — never the body, signature, or tokens.
- Doc comment states the security invariants: raw-body byte-exact
  verification precedes all parsing; the route mounts before body-parser/
  session/passport and carries no auth state.

**`packages/server/src/services/Server.ts`** — in `setupMiddleware`, after
the CORS block (line 87) and **before** `express.json()` (line 90):

```ts
// Kick webhook receiver — raw-body + signature-verified, sessionless.
// Mounted before body parsing (byte-exact body) and before session/
// passport (the route must touch no auth middleware).
KickWebhookRoutes.setup(this.app);
```

**`packages/server/src/mud/obj/api/StreamLogic.ts`** —
- Import `KickRelayReader` and `KickProfile`.
- Replace the Phase-1 placeholder: `resolveTarget`'s kick branch →
  `this.resolveKickSlug(parsed.identifier)`.
- New private `resolveKickSlug(slug: string): Promise<ResolveResult>` — the
  `resolveTwitchLogin` transcription (302–320): lowercase; cache-first
  `relay.resolveByHandle('kick', lower)`; else
  `KickRelayReader.get()` — `isConfigured()` false → `no-relay`;
  `resolveSlug` `'unknown'` → `unknown-target`; else
  `new StreamerTarget('kick', r.broadcasterId, r.slug)`.
- `tune` (90–95): kick arm `await KickRelayReader.get().subscribe(
  target.key)` on the opened edge.
- `unsubscribeReader` (372–375): kick arm
  `KickRelayReader.get().unsubscribe(key)`.
- `resolveCharacter` (343–368), DECISION F: keep the Twitch walk; when
  `!user?.twitchProfileId` **or** the Twitch profile/login is missing, try
  `user?.kickProfileId` → `KickProfile.findById` → `profile.slug` (empty →
  `unlinked`) → `this.resolveKickSlug(slug)` → on ok, wrap with the
  character ref (the 359–367 shape). Only when **neither** provider
  resolves: `unlinked`.
- `resolveSpeaker` (517–543): add the kick branch mirroring twitch —
  `KickProfile.findByKickUserId(senderUserId)` → `User.find({
  kickProfileId: profile._id })` → online avatar → `{ kind:
  'external-linked', service: 'kick', externalName: display, ref }`; else
  `external`.
- Overlay (the 391–444 block): `overlayKickChannel()` env helper
  (`OVERLAY_KICK_CHANNEL`, trim/lower); `openOverlayKick(relay)` — resolve
  via `resolveByHandle` cache or `KickRelayReader.get().resolveSlug`
  (skip when unconfigured/unknown), `relay.addTuned(OVERLAY_SENTINEL,
  'kick', key, slug)` → `subscribe` on the edge; `closeOverlayKick(relay)`
  — `removeTuned` → `unsubscribe` on emptied. Call both from
  `setOverlayReading` beside the twitch/youtube pairs (289–296). **No
  poll** — persistent binding (DECISION E).
- `post` unchanged — kick falls into the `service !== 'twitch'` →
  `read-only` reject (213), surfaced by the Phase-1 controller message.

**`packages/server/src/backend/BroadcastFeed.ts`** — add
`overlayKickChannel()` beside 42–50; `isOverlayOwnChannel` (58–66) gains
the kick arm (`service === 'kick'` → compare to the configured slug).

**`packages/server/src/backend/AppBootstrap.ts`** — after
`YoutubeRelayReader.get().boot()` (296):

```ts
// Kick read-only relay reader — webhook-subscription presence-gated.
// Inert until a player tunes a Kick channel (and KICK_* env is
// configured); safe to boot unconditionally.
KickRelayReader.get().boot();
```

### Tests

- **`backend/__tests__/KickRelayReader.test.ts`** (the
  `YoutubeRelayReader.test.ts` shape — `forTest` mock client +
  `vi.spyOn(StreamApi, 'dispatchInbound')`): `subscribe('123')` calls
  `createChatSubscription` once (idempotent on repeat) and stashes the id;
  `unsubscribe('123')` calls `deleteSubscriptions(['sub-1'])` (the id map
  exercised) and a second unsubscribe is a no-op; `handleInbound` with a
  well-formed `chat.message.sent` payload → `dispatchInbound('kick',
  { channelKey: '123', senderUserId, senderLogin, senderDisplay, text })`;
  malformed payload → no dispatch; `isConfigured` forwards.
- **`backend/__tests__/KickWebhookRoutes.test.ts`** (supertest against a
  minimal `express()` app, the `HelpRoutes.test.ts` harness; sign with a
  test keypair, point `KickWebhookVerifier` at it via a `forTest`/spy
  seam; spy `KickRelayReader.get`): valid signed POST → 200 and
  `handleInbound` called with the parsed payload; tampered body → 401, no
  dispatch; replayed messageId → 200, dispatch **once**; unconfigured
  reader → 404; a body containing multi-byte UTF-8 + odd whitespace
  verifies (raw-body byte fidelity); non-chat event type → 200, no
  dispatch.
- **`mud/obj/api/__tests__/StreamLogic.test.ts`** (extend; add a
  `mockKickReader` helper mirroring `mockReader`/`mockYoutubeReader`):
  kick handle resolve → `('kick', broadcasterId, slug)` target;
  unconfigured → `no-relay`; unknown slug → `unknown-target`; cache-first
  second resolve does not hit the reader; `tune` on a kick target
  subscribes on the 0→1 edge only; `dropPlayer` unsubscribes an emptied
  kick channel; character-form: twitch-linked resolves twitch (precedence),
  kick-only-linked resolves kick with the character ref, neither →
  `unlinked`; `post` to kick → `read-only`; `dispatchInbound('kick', …)`
  from a linked sender delivers an `external-linked` speaker with
  `service: 'kick'`, unlinked → `external`.
- **`backend/__tests__/BroadcastFeed.overlay.test.ts`** (extend): with
  `OVERLAY_KICK_CHANNEL=ownerslug`, a `RelayMessage` for
  `('kick', 'ownerslug')` pushes a `RelayChatEnvelope`; a different kick
  channel is filtered; `setOverlayReading(true)` sentinel-tunes the kick
  channel (assert via the mocked reader subscribe).

Green gate: full build + tests. Manual acceptance on the live box (webhook
URL registered in the Kick dev app): `watch`/`tune`/`untune`/`list`/`who`/
`history` against a real Kick channel; overlay forwarding; dormant boot with
no `KICK_*` env.

---

## Phase 5 — Documentation + sweep

- **`docs/subsystems/streaming.md`** — add the Kick transport section: the
  webhook shape (signature scheme, raw-body route before body-parser/
  session, replay window + dedup ring, 200-on-duplicate), app-token
  subscriptions per presence edge (`broadcasterId → subscriptionId` map),
  persistent Twitch-style binding (no liveness gate / no auto-untune),
  the `KickProfile` auth provider — co-equal login + link
  (character-form Twitch-first precedence, the
  `external-linked` kick speaker), the `kick.*` dials, the third
  `OVERLAY_KICK_CHANNEL` sentinel, and the read-only v1 / phase-2 posting
  boundary. Update the module-layout table and the `RelaySpeaker` prose
  ("spans `'twitch' | 'youtube' | 'kick'`").
- **`docs/subsystems/connection.md`** — note the third provider profile
  (`KickProfile`, the third co-equal `AuthProvider` — login + link)
  beside the Twitch spine.
- **`docs/deployment.md`** — env additions (`KICK_CLIENT_ID`,
  `KICK_CLIENT_SECRET`, `KICK_CALLBACK_URL`, `KICK_WEBHOOK_URL`,
  `OVERLAY_KICK_CHANNEL`) in the SSM flat-key list (line ~105) + a note:
  the webhook URL must be registered in the Kick developer app and must
  match `KICK_WEBHOOK_URL`; Caddy already terminates TLS for it; local dev
  needs no tunnel (transport-dormant).
- **CLAUDE.md** — extend the streaming.md summary line with the Kick
  transport (webhook receiver, KickProfile) so the doc map stays accurate.
- Slate `docs/slates/tails/kick-relay-slate.md` → shipped-status; plan +
  requirements retirement per `docs/workflow.md` — run `/finalize` at the
  pre-merge sweep.

---

## Deferred seams (clean attach points, not stubs)

- **Posting (phase 2)** — a `kick-reauth` incremental-scope strategy (the
  `twitch-reauth` transcription, PassportConfig 244–290) acquiring
  `chat:write`, `POST /public/v1/chat` on `KickClient`, send-then-mirror
  through the existing `tryAcquireSend` throttle + `noteEcho`/`isEcho`
  suppress (StreamRelay 258–301 — already service-agnostic). Attaches at
  `StreamLogic.post`'s service switch; `KickProfile.hasScope` is already
  there.
- **Long-lived-subscription fallback** — if create/delete-per-edge ever
  throttles: hold subscriptions and gate *dispatch* on presence — a
  reader-local change (the requirements' named fallback), invisible above
  `dispatchInbound`.
- **Subscription reconciliation on boot** — orphaned webhook subscriptions
  from a crashed process (the id map is memory-only). Cheap hedge later: a
  boot-time `GET /events/subscriptions` sweep deleting stale
  `chat.message.sent` subs. Harmless meanwhile — deliveries for un-tuned
  channels drop at the `channelByKey` miss (StreamLogic 269–270).
- **Kick URL video/clip forms** (`kick.com/video/…`) — slug-only this
  cycle; a `classifyKickRef` sibling would attach in `StreamerTarget` if
  ever needed.
- **Patron intake / moderation / posting-as-bot** — requirements non-goals;
  the event-type-parameterized subscription body is the attach point.
- **`stream.*` dials for the grandfathered relay constants** (history cap /
  throttle / echo TTL, StreamRelay 50–55) — noted since the Twitch build;
  unchanged here.
- **Dev tunnel recipe** — a README nicety; the verifier + route are fully
  unit-tested with synthetic keypairs.

---

## Critical files for implementation

- `packages/server/src/backend/KickClient.ts` (new) +
  `packages/server/src/backend/KickRelayReader.ts` (new) — the transport
  pair (app token, slug resolve, subscription lifecycle, inbound
  normalize → `dispatchInbound('kick', …)`).
- `packages/server/src/backend/KickWebhookVerifier.ts` +
  `KickWebhookRoutes.ts` (new) + `packages/server/src/services/Server.ts` —
  the signed inbound receiver and its pre-body-parser mount.
- `packages/server/src/mud/obj/api/StreamLogic.ts` — the kick resolve /
  tune / drop / speaker / overlay branches (the Api→backend bridge).
- `packages/server/src/mud/lib/streaming/StreamerTarget.ts` — the pure
  parser's `Platform`/opt/URL widening.
- `packages/server/src/mud/lib/identity/KickProfile.ts` (new) +
  `packages/server/src/services/auth/PassportConfig.ts` +
  `AuthRoutes.ts` + `packages/server/src/backend/Application.ts` — the
  `kick`/`kick-link` PKCE strategy pair and the provider data path
  (+ the `StartScreen` provider entry).
