# Bulletin (news ticker) — implementation plan

Drives one build cycle against
[bulletin-requirements.md](../requirements/bulletin-requirements.md).
Self-contained: a fresh build agent can execute against this without the
originating conversation. Every precedent below was verified against the
real code; five places where the requirements' assumed precedents did
not match reality are flagged inline and consolidated at the end.

## Grounding (verified precedents)

| Concern | Real file + pattern confirmed |
|---|---|
| Reference-data `Document` | `lib/craft/Recipe.ts`, `lib/social/Emote.ts` — `extends Document`, `static collectionName`, `static persistentFields`, plain getters, no lifecycle. |
| Boot-warmed catalogue | `obj/RecipeCatalogue.ts` (Document-backed, closest precedent) + `obj/TopicCatalogue.ts` — `PostRegistrationMixin(Idea)`, transient `cache`, `postRegister()→warm()`, `warm()` reads the collection, `ensureCache()` empty-on-unwarmed, `canDestruct()` singleton refusal. |
| Api↔Logic gated pair | `api/corpo.ts` + `obj/api/CorpoLogic.ts` — `logic()` via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`, `LOGIC_PATH`/`LOGIC_CLASS_FILE`, `SecurityApi.decorateApiClass(...)`; logic `@Unshadowable extends Idea`, methods `@CallSecurity(SecurityPolicies.FromModule("mud/api/bulletin#BulletinApi"))`, all real work in module-private `*Impl` free functions (no intra-singleton `this.x()` — the gate denies it). |
| Presence-PUBLIC frame fan-out | `obj/api/PresenceLogic.ts` — `fanImpl` over `PlayerApi.getAllAvatars()` (skip `isDestroyed`/`!isConnected`), per-viewer `try/catch`, `sendRosterImpl` = `MessageApi.scene(viewer).topic('world.social.roster').toSelf(Mml.fromMarkup(''), payload).send()`. Installed by `SocialApi.boot()` (`api/social.ts`) at `backend/AppBootstrap.ts:217`. |
| Session-establish snapshot | `obj/Avatar.ts:388-437` — `enter()` builds `ConnectionEstablishedPayload` carrying `topicCatalogue: catalogue?.getSnapshot()` (line 409), sends `system.connection.established`. |
| Verb affordance | `lib/shell/Author.ts` — `static commandContributions.self: string[]` (includes `'stream/stream.yaml'`). |
| Authorization validator | `lib/command/validators/requiresStreamer.ts` — `CommandValidator<boolean>` + `validator.preload = (ctx) => AccessApi.isStreamer(ctx.commandGiver)`. **`requiresAuthor` does NOT exist.** `AccessApi.isAuthor(subject: Stuff|null): Promise<boolean>` confirmed (`api/access.ts:81`). |
| Verb YAML + void controller | `cmd/stream/stream.yaml` + `obj/command/stream/StreamController.ts` — `execute(): Promise<void>`, response via `MessageApi.scene().topic().toSelf().send()`, rejection via `ctx.note({kind:'controller-rejected', reason, detail})`. |
| Body side-channel | `CommandLogic.overlayBodyFields` (called at `lib/command/CommandGiver.ts:922`) overlays `outer.bodyFields` into the model before resolve; `ForumController.resolveBody` reads `model.body`; `cmd/social/forum.yaml` declares `body` `required:false, greedy:true`. |
| REST data API | `backend/HelpRoutes.ts` — `static setup(app)`, `AuthMiddleware.requireAuthApi`, GET routes; registered in `services/Server.ts:175` **before** the `app.get('*', …)` SPA catch-all at line 187. |
| AppSettings | `lib/config/AppSettings.ts` (`AppSettingKeys`), `config/app-settings.yaml` (`- key:/value:` rows), `backend/AppSettingsSeeder.ts`, read via `AppApi.setting(key)` (sync, try/catch fallback per `PresenceLogic.idleAfterSeconds`). |
| Manifest / collections / paths | `mud/bootstrap.ts` `bootstrapManifest[]`; `backend/PersistenceManager.ts:31` `Collections` enum + `createIndexes()` at 587; `lib/paths.ts` `TemplatePaths`. |
| Client pane | `store/index.ts` roster slice (`roster`/`rosterOrder` + `applyRosterSnapshot/Add/Remove`, `orderRoster`); `services/websocket.ts:166` `onTopic('world.social.roster')`; `components/WhoPane.tsx`; `App.tsx:862-891` `rightPane` tab switch (`'inspect'`/`'who'`). |
| Wire types | `packages/types/src/index.ts` — `RosterRow`/`RosterFrame` (170/186), `ConnectionEstablishedPayload` (1410, `topicCatalogue` 1442), `TopicDescriptor` (1382). |

---

## Phase 1 — Server data + registry + gated Api/Logic

The reference-data Document, the boot-warmed window, the gated read/write
surface. Fully unit-testable with no verbs, frames, or REST.

**New files**

- `packages/server/src/mud/lib/bulletin/Bulletin.ts` — `export class Bulletin extends Document`. `static collectionName = "bulletins"`; `static persistentFields = ['bulletinId','realm','kind','headline','body','author','publishedAt','pinned','expiresAt','retracted']`. Co-locate the vocabularies (the Emote precedent): `export type BulletinRealm = 'ooc' | 'world'`, `export type BulletinKind = 'changelog' | 'decision' | 'event' | 'notice'`, each with its validation array (`BULLETIN_REALMS`/`BULLETIN_KINDS`). Fields: `bulletinId` (unique key, the Recipe `recipeId` precedent), `realm`, `kind`, `headline` (MML), `body` (MML), `author` (the publisher's durable `templatePath` — a stored identity string, NOT an `AuthoringEvent`), `publishedAt`/`expiresAt` (**epoch-ms numbers, not `Date`** — the `RenownEvent.at/realAt` precedent; flag #3), `pinned`, `retracted` (booleans). Plain getters (inter-Stuff methods-only rule).

- `packages/server/src/mud/obj/BulletinBoard.ts` — `export default class BulletinBoard extends PostRegistrationMixin(Idea)`. Mirrors `RecipeCatalogue`: transient `cache` (`bulletinId → Bulletin`), `postRegister()→warm()`, `warm()` = `Bulletin.find<Bulletin>({})` into the window, `ensureCache()` empty-on-unwarmed, `canDestruct()` refusal. Owns the **window semantics** (server owns all semantics): `recentWindow()` = pins-first then `publishedAt`-desc, excluding `retracted` and expired (`expiresAt>0 && expiresAt<Date.now()`), pin count capped at `bulletin.maxPins`, window length capped at `bulletin.tickerWindow` (both via `AppApi.setting` with try/catch fallback). `upsert(b)` mutator. Board holds only the warm window; the archive lives in Mongo.

- `packages/server/src/mud/api/bulletin.ts` — `export class BulletinApi` forwarding shell (verbatim `api/corpo.ts` structure): `LOGIC_PATH="/obj/api/bulletin"`, `logic()` resolver, statics `publish`/`edit`/`retract`/`recent(limit)`/`archive(query)`/`boot()` each forwarding one line. Re-export `Bulletin*` types + call-shape types (`PublishRequest`, `ArchiveQuery`, `BulletinRow`). Ends with `SecurityApi.decorateApiClass(BulletinApi)`.

- `packages/server/src/mud/obj/api/BulletinLogic.ts` — `@Unshadowable export class BulletinLogic extends Idea`, `@internal`. `const BulletinApiCallers = SecurityPolicies.FromModule("mud/api/bulletin#BulletinApi")`. All work in module-private `*Impl`; `board()` helper = `StuffApi.findByTemplatePath<BulletinBoard>(TemplatePaths.bulletinBoard)` (the `CorpoLogic.catalogue()` precedent). Methods:
  - `publish(req)` — resolve author via `ExecutionContextApi.getActingAuthor()` (**never caller-supplied** — gated-API actor-from-context rule; fail closed if null/no `templatePath`), construct `Bulletin` + set fields + `publishedAt = Date.now()` + `save()`, then `board().upsert(b)` and `fanFeedImpl('upsert', …)` (fan added Phase 3). Returns the persisted `Bulletin`.
  - `edit(bulletinId, patch)` / `retract(bulletinId)` — load (cache or Mongo), mutate in place (retract sets `retracted=true` — **soft**, no hard delete), `save()`, refresh window, fan (Phase 3).
  - `recent(limit)` — `board().recentWindow()` sliced.
  - `archive(query)` — `Bulletin.find<Bulletin>({...})` over Mongo by `realm`/`kind`, `publishedAt < before`, `retracted:false`, sorted desc, `limit`-paged.
  - `boot()` — idempotent warm/activation seam (flag #5; the fan is inline, not an event tap).

**Edits**

- `backend/PersistenceManager.ts` — `Bulletins = 'bulletins'` in `Collections` (line 31 block); in `createIndexes()` (line 587) a unique index on `bulletinId` (the `Recipes` precedent ~646) and `{ realm: 1, kind: 1, publishedAt: -1 }` for the archive query.
- `mud/bootstrap.ts` — append `{ templatePath: '/obj/BulletinBoard' }` to `bootstrapManifest` (the `RecipeCatalogue` precedent; warms via `postRegister`, no `dependsOn`).
- `mud/lib/paths.ts` — `bulletinBoard: "/obj/BulletinBoard"` in the singleton-catalogues block.
- `mud/lib/config/AppSettings.ts` — `AppSettingKeys`: `bulletinTickerWindow: "bulletin.tickerWindow"`, `bulletinMaxPins: "bulletin.maxPins"`, `bulletinHeadlineMaxLength: "bulletin.headlineMaxLength"`, `bulletinBodyMaxLength: "bulletin.bodyMaxLength"`.
- `mud/config/app-settings.yaml` — seed those four (e.g. window `30`, maxPins `3`, headline `120`, body `4000`) with a comment block (no code defaults).
- `backend/AppBootstrap.ts` — in `run()`, next to `SocialApi.boot()` (line 217), add `BulletinApi.boot()` (activation-seam mirror; the board warms via manifest `postRegister`).

**Tests** (colocated `__tests__/`, Vitest)
- `lib/bulletin/__tests__/Bulletin.test.ts` — round-trip to `bulletins`; vocabulary validation.
- `obj/__tests__/BulletinBoard.test.ts` — pins-first/recency ordering; pin cap; expiry exclusion; **soft-retract** (row kept in Mongo, excluded from `recentWindow()`); window length cap.
- `obj/api/__tests__/BulletinLogic.test.ts` — `publish` actor-from-context (never caller-supplied) + fail-closed on no author; `archive(query)` paging + realm/kind filtering. (The author-gating *verdict* is the verb validator's job — tested in Phase 2.)

Satisfies **AC1, AC5, AC8 (settings + collection — CLAUDE.md edit lands Phase 6)**.

---

## Phase 2 — The `announce` verb (affordance + authorization + body side-channel)

**New files**

- `packages/server/src/mud/lib/command/validators/requiresAuthor.ts` — **create it** (flag #4) next to `requiresStreamer.ts`, same shape with `AccessApi.isAuthor` swapped for `isStreamer`: `validator.preload = (ctx) => AccessApi.isAuthor(ctx.commandGiver)`, reject `you don't have permission to ${context.verb}`.
- `packages/server/src/mud/cmd/system/announce.yaml` — verbs `[announce]`, `controller: system/AnnounceController`, `validators: [/lib/command/validators/requiresAuthor]`. Args: `headline` (positional, **required**) + `body` (`required:false, greedy:true` — the `forum.yaml` body precedent; long MML rides the `{text, fields}` side-channel, overlaid into `model.body`). Options: `--realm` (default `ooc`), `--kind` (default `notice`), `--pin`, `--expires` (shell-duration). `edit`/`retract` as subcommands (`announce edit <id>` / `announce retract <id>`) to keep one affordance.
- `packages/server/src/mud/obj/command/system/AnnounceController.ts` — `extends CommandController`, `execute(model, ctx): Promise<void>` (StreamController precedent). Reads `model.headline`/`model.body`/flags, calls `BulletinApi.publish({...})` — **never the registry** (go-through-the-Api rule). Author NOT passed (logic derives from context). Response via `MessageApi.scene(ctx.commandGiver).topic('system.bulletin').toSelf(...).send()`; rejection via `ctx.note(...)`. Validates lengths against `bulletin.headlineMaxLength`/`bodyMaxLength`.
- `packages/server/src/mud/seeds/obj/command/system/AnnounceController.yaml` — `class: /obj/command/system/AnnounceController`, `data: {}` (the `StreamController.yaml` seed — the silent half of the affordance+seed pair).

**Edits**

- `mud/lib/shell/Author.ts` — add `'system/announce.yaml'` to `commandContributions.self` (the `'stream/stream.yaml'` precedent). Auto-loaded via `CommandApi.preloadAll` (`AppBootstrap.ts:147`) — no command-manifest entry needed.

**Tests**
- `lib/command/validators/__tests__/requiresAuthor.test.ts` — passes for author, rejects non-author (mirror `requiresStreamer.test.ts`).
- `obj/command/system/__tests__/AnnounceController.test.ts` — model→`publish` mapping; body overlay read; length-cap rejection; void-return + `ctx.note` on reject.

**LIVE VERIFICATION (explicit gate before Phase 3)** — the affordance+seed pair is invisible to unit tests (the social-inspection-build lesson, AC3). Run the server, dispatch `announce` live as an author: confirm (a) the verb is in the author's recency stack (affordance), (b) it dispatches (controller seed), (c) a non-author is rejected by `requiresAuthor`, (d) a `Bulletin` row lands in `bulletins`.

Satisfies **AC2, AC3**.

---

## Phase 3 — Frame fan-out + session-establish delivery

**Design note / flag #5**: unlike the roster (which subscribes to externally-emitted presence events in `SocialApi.boot()`), the bulletin trigger originates *inside* `BulletinLogic.publish/edit/retract` — so the fan is **inline** (no event tap). `BulletinApi.boot()` stays a thin warm/activation seam for call-site symmetry only.

**New file**

- `packages/server/src/mud/seeds/lib/messaging/Topic/world.bulletin.feed.yaml` — Topic seed (`{ class: /lib/messaging/Topic/world.bulletin.feed, data: { topic: 'world.bulletin.feed', family: 'world.bulletin', label: 'News Ticker', description: '…' } }`). **Flag #2**: the cited `world.social.roster.yaml` seed does **not** exist (roster rides `TopicCatalogue`'s three-tier fallback); a seed is optional but created here since the requirements list it and it yields a clean client label.

**Edits**

- `obj/api/BulletinLogic.ts` — add `fanFeedImpl(action: 'upsert'|'remove', row)`: iterate `PlayerApi.getAllAvatars()` (skip `isDestroyed`/`!isConnected`), per-viewer `try/catch`, `MessageApi.scene(viewer).topic('world.bulletin.feed').toSelf(Mml.fromMarkup(''), payload).send()` (the `sendRosterImpl` precedent). **No per-viewer lensing** — OOC-public, identical for every viewer, so the `payload` is composed once. Call at the tail of `publish`/`edit` (`upsert`) and `retract` (`remove`).
- `obj/Avatar.ts` — in `enter()`, add the window to `ConnectionEstablishedPayload` (~line 409, beside `topicCatalogue`): `bulletinWindow: BulletinApi.recent(window).map(toBulletinRow)`. (Bulletins have no presence event to hang a snapshot on — the welcome payload is the correct seam, exactly as the requirements direct.)
- `packages/types/src/index.ts` — `BulletinRealm`/`BulletinKind`, `interface BulletinRow { bulletinId; realm; kind; headline; body; author?; publishedAt; pinned; expiresAt?; }` (client projection — `retracted` rows never sent), `type BulletinFeedFrame = {kind:'bulletin';action:'upsert';row:BulletinRow} | {kind:'bulletin';action:'remove';bulletinId:string} | {kind:'bulletin';action:'snapshot';rows:BulletinRow[]}` (the `RosterFrame` precedent), and `bulletinWindow: BulletinRow[]` on `ConnectionEstablishedPayload`.

**Tests**
- `obj/api/__tests__/BulletinLogic.fanout.test.ts` — publish fans `upsert` to online interactives; retract fans `remove`; a destroyed/linkdead viewer is skipped without aborting the scan.
- `obj/__tests__/Avatar.enter.bulletin.test.ts` (or extend the enter test) — the session-establish payload carries the window.

Satisfies **AC4**.

---

## Phase 4 — REST archive

**New file**

- `packages/server/src/backend/BulletinRoutes.ts` — `static setup(app: Express)` (the `HelpRoutes` precedent): `const requireAuth = AuthMiddleware.requireAuthApi;` then `app.get('/api/bulletins/archive', requireAuth, …)` parsing `before` (epoch-ms), `limit` (clamped), `realm`, `kind` from `req.query`, validating realm/kind against the vocabularies (400 on bad value, the `HELP_KINDS` precedent), forwarding to `BulletinApi.archive({...})`, returning `BulletinRow[]`. Read-only — no CSRF, no attribution bridge.

**Edits**

- `services/Server.ts` — in `setupRoutes()`, `BulletinRoutes.setup(this.app);` alongside `HelpRoutes.setup(this.app);` (line 175), **before** the `app.get('*', …)` catch-all (line 187).

**Tests**
- `backend/__tests__/BulletinRoutes.test.ts` — 401 unauthenticated; paging by `before`/`limit`; realm/kind filtering; bad realm/kind → 400; recency-desc ordering; registered-before-catch-all assertion (mirror the help-routes test).

Satisfies **AC6**.

---

## Phase 5 — Client news-ticker pane

**Flag #1 (client layout)**: the requirements assume a "server-authoritative layout axis from the cockpit-layouts work." **No such system exists** — `App.tsx:862-891` is a hardcoded client `rightPane` switch (`'inspect'`/`'who'`). **Corrected**: follow the actual `WhoPane` precedent — extend the client-owned `rightPane` axis with a `'news'` value + a third `PaneTab`. Consistent with the cited "client owns layout, server owns semantics" rule (ordering/pins/chips stay server-decided).

**New file**

- `packages/client/src/components/NewsTickerPane.tsx` — reads `feed`/`feedOrder` from the store (the `WhoPane` precedent), renders pins-first rows with `realm`/`kind` chips in the server-given order (**no client reordering**). MML `headline`/`body` through the existing `parseMml`/`MmlRenderer` path (MML-safe; no raw HTML). A "load older" control issues `GET /api/bulletins/archive?before=&limit=&realm=&kind=` (fetch; help-pane transport precedent) and appends. `onSendCommand`/`onCommandPreview` props mirror `WhoPane`.

**Edits**

- `packages/client/src/store/index.ts` — a bulletin slice mirroring the roster slice: `feed: Record<string,BulletinRow>`, `feedOrder: string[]`, `applyBulletinSnapshot(rows)`, `applyBulletinUpsert(row)`, `applyBulletinRemove(id)`; ordering (pins-first then `publishedAt` desc) recomputed per mutation as a stable tiebreaker over the server-authoritative payload. Add `'news'` to the `rightPane` union + `setRightPane`.
- `packages/client/src/services/websocket.ts` — `this.onTopic('world.bulletin.feed', (frame)=>{ route by payload.action })` (the `world.social.roster` handler at line 166 precedent). In the `system.connection.established` handler, seed from `payload.bulletinWindow` (a `snapshot`), as `topicCatalogue` is consumed.
- `packages/client/src/App.tsx` — third `PaneTab` ("News") on the `PaneSwitch` (line 864) + render `<NewsTickerPane … />` when `rightPane === 'news'`.

**Tests**
- `client/src/store/__tests__/bulletin.test.ts` — snapshot/upsert/remove + pins-first ordering (the `roster.test.ts` precedent).
- `client/src/components/__tests__/NewsTickerPane.test.tsx` — renders pins, realm/kind chips, recency order; archive "load older" fetch (the `WhoPane.test.tsx` precedent).

Satisfies **AC7**.

---

## Phase 6 — Docs + the easy-to-miss CLAUDE.md edits

**New file**

- `docs/subsystems/bulletin.md` — source-of-truth doc: the module shape, the Document↔BulletinBoard↔BulletinLogic↔BulletinApi split, the inline-fan vs roster's event-tap divergence, soft-retract/expiry/pin semantics, the AppSettings knobs, the REST archive, the client pane, and the explicit non-goals (no threading/active-delivery/edit-trail/provenance/MQL).

**Edits**

- `CLAUDE.md` — (a) a `[bulletin.md](./docs/subsystems/bulletin.md)` Documentation-Map entry; (b) a `bulletins` row in the MongoDB Collections list (line 606 block): `bulletins — staff→player broadcast feed (Bulletin Document, one doc per announcement, unique index on bulletinId, indexed on {realm,kind,publishedAt}; the Recipe/Emote reference-data precedent, never cloned), managed by the BulletinBoard singleton`.

Satisfies **AC8**.

---

## Wiring touchpoints easy to miss (checklist)

1. **Manifest** — `mud/bootstrap.ts` `{ templatePath: '/obj/BulletinBoard' }` (P1). Without it the board never warms.
2. **Collections + index** — `PersistenceManager.ts` enum + `createIndexes()` (P1).
3. **`paths.ts`** — `bulletinBoard` `TemplatePaths` entry (P1).
4. **AppSettings** — keys in `AppSettings.ts` **and** seed rows in `app-settings.yaml` (P1).
5. **Boot call site** — `BulletinApi.boot()` in `AppBootstrap.run()` (P1).
6. **Controller seed** — `seeds/obj/command/system/AnnounceController.yaml` (P2); the silent half of the affordance+seed pair.
7. **AuthorMixin contribution** — `'system/announce.yaml'` (P2).
8. **Topic seed** — `world.bulletin.feed.yaml` (P3, optional-but-recommended).
9. **Session-establish payload** — `Avatar.enter` edit + the `ConnectionEstablishedPayload.bulletinWindow` types-package half (P3).
10. **REST ordering** — `BulletinRoutes.setup` before the SPA `app.get('*')` (P4).
11. **CLAUDE.md** — docs map + collections list (P6).

## Precedent mismatches (flagged) + corrected approaches

1. **No server-authoritative cockpit layout.** The assumed "cockpit-layouts / server-authoritative layout axis" does not exist; `App.tsx` uses a hardcoded client `rightPane` tab switch. **Corrected**: extend the client `rightPane` axis with `'news'` + a third `PaneTab` (the real `WhoPane` precedent) — client-owned layout, server-owned semantics.
2. **No `world.social.roster.yaml` Topic seed.** Roster rides `TopicCatalogue`'s three-tier fallback. **Corrected**: the frame sends fine without a seed, but create `world.bulletin.feed.yaml` anyway (a listed deliverable; gives a clean label).
3. **Timestamp type.** Event-track Documents (`RenownEvent`) store timestamps as **numbers**. **Corrected**: `Bulletin.publishedAt`/`expiresAt` are epoch-ms numbers, not `Date`.
4. **`requiresAuthor` does not exist** (only `requiresStreamer`/`requiresDeveloper`/`requiresCoreAccess`). **Corrected**: create it next to `requiresStreamer.ts`, backed by `AccessApi.isAuthor`.
5. **`BulletinApi.boot()` is not an event tap.** The requirements' "fanned from `BulletinApi.boot()`" conflates activation with fan-out. The trigger originates inside `BulletinLogic`, so the fan is **inline**; `boot()` is a thin warm/activation seam kept only for call-site symmetry.

## Cross-references

- Requirements: [bulletin-requirements.md](../requirements/bulletin-requirements.md)
- Precedents cited inline (Recipe/Emote/TopicCatalogue, CorpoApi/CorpoLogic, PresenceLogic/SocialApi, Avatar.enter, AuthorMixin/requiresStreamer, CommandLogic.overlayBodyFields, HelpRoutes, AppSettings, WhoPane/store/websocket).
