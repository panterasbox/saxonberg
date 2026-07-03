# Bulletin (news ticker)

The **staff→player broadcast feed**: a chronological ticker of current
events — code changes, operator decisions, scheduled downtime, in-world
happenings — published by the author axis and read passively by
everyone. Deliberately **not** the forums ([forums.md](./forums.md), a
two-way *deliberation* substrate): a Bulletin is one-directional,
low-interaction, chronological — closer in spirit to the OOC Twitch
relay ([streaming.md](./streaming.md)) and the presence relay's
`world.social.roster` frame ([social-graph.md](./social-graph.md)).

Source of truth for this subsystem. Seeded by the
[requirements](../requirements/bulletin-requirements.md) +
[plan](../plans/bulletin-plan.md) (retired at sweep).

## The shape

A small platform service — **not** in-world Stuff:

- **`Bulletin`** (`lib/bulletin/Bulletin.ts`) — a reference-data
  `Document` in the `bulletins` collection (the `Recipe`/`Emote`
  precedent: `static collectionName`/`persistentFields`, plain getters,
  **never cloned, not a template**). Carries `bulletinId` (unique),
  `realm`, `kind`, MML `headline` + `body`, `author` (the publisher's
  durable `templatePath` — a stored identity string, **not** an
  `AuthoringEvent`), `publishedAt`, and the optional `pinned` /
  `expiresAt` / `retracted` controls. **Timestamps are epoch-ms
  numbers, not `Date`** (the `RenownEvent` event-track precedent). The
  two vocabularies live in the same file with their validation arrays:
  `BulletinRealm` (`ooc | world`) + `BULLETIN_REALMS`, `BulletinKind`
  (`changelog | decision | event | notice`) + `BULLETIN_KINDS`.
- **`BulletinBoard`** (`obj/BulletinBoard.ts`) — the boot-warmed
  registry singleton (`PostRegistrationMixin(Idea)`, manifest-registered
  at `/obj/BulletinBoard`, seeded by `seeds/obj/BulletinBoard.yaml`; the
  `RecipeCatalogue` shape). Caches the working set in memory — warmed
  from Mongo via `postRegister()→warm()` — and **owns the window
  semantics** (server owns all semantics), computing the window per call
  rather than storing it: `recentWindow()` = pins-first then
  `publishedAt`-desc, excluding `retracted` and expired, pin count capped
  at `bulletin.maxPins`, window length capped at `bulletin.tickerWindow`.
  Soft-retracted rows stay cached (reachable by id) but drop out of the
  window. `canDestruct()` refuses (singleton). Mongo is the source of
  truth; the board is a rebuildable warm cache. (Low-volume staff feed; a
  recency-bounded warm is the lever if the set ever grows large.)
- **`BulletinApi`** (`api/bulletin.ts`) + **`BulletinLogic`**
  (`obj/api/BulletinLogic.ts`) — the gated Api↔logic-singleton pair (the
  `CorpoApi`/`CorpoLogic` precedent). The Api is a thin forwarding shell
  ending in `SecurityApi.decorateApiClass`; the logic is `@internal
  @Unshadowable extends Idea` with every method gated
  `FromModule("/api/bulletin#BulletinApi")`, all real work in
  module-private `*Impl` free functions.

## The write/read surface (`BulletinApi`)

- `publish(req)` → `Bulletin` — the author is resolved from the
  execution context (`ExecutionContextApi.getActingAuthor`) inside the
  logic, **never caller-supplied** (the gated-API actor-from-context
  rule); fail-closed if there's no acting author. Persists, updates the
  board window, fans the feed.
- `edit(bulletinId, patch)` → `Bulletin | null` — in-place merge of the
  editable subset (`BulletinPatch`). Change-only-what-you-pass (realm/
  kind defaults are applied by the publish path in the controller, not
  the YAML, so they never bleed into an edit patch).
- `retract(bulletinId)` → `Bulletin | null` — a **soft** delete: the row
  is kept in Mongo, flagged `retracted`, excluded from the live window.
  The archive stays honest; there are no hard deletes.
- `recent(limit?)` → `Bulletin[]` — the live ticker window.
- `archive(query)` → `Bulletin[]` — the paged history straight from
  Mongo (`ArchiveQuery`: `realm`/`kind` filters + `before`/`limit`
  paging, limit clamped in the logic).
- `toRow(bulletin)` → `BulletinRow` — the pure projection to the
  client-facing wire shape, the **single source** shared by the frame
  fan-out and the session-establish window. Drops `expiresAt === 0`
  (never-expires) and an empty author; retracted rows never reach it.
- `boot()` — a thin warm/activation seam mirroring the other
  `*Api.boot()` call sites (wired from `AppBootstrap.run()`). The board
  warms via its manifest `postRegister`; the fan-out is inline, so there
  is **no event tap to install** — `boot()` exists for call-site
  symmetry only.

## Publishing — the `bulletin` verb

Afforded via `AuthorMixin.commandContributions` (`system/bulletin.yaml`,
the `stream.yaml` precedent), authorized by the **`requiresAuthor`**
validator over `AccessApi.isAuthor` (the `requiresStreamer` precedent —
reusing the author axis, no new role machinery). The controller
(`obj/command/system/BulletinController.ts`) is a void controller
dispatching on subcommand to `post` / `edit <id>` / `retract <id>`
(bare `bulletin <headline>` falls through to `post`, the chat/forum
fallthrough idiom), calling `BulletinApi` only (never the registry),
reading the overlaid `model.body` from the `{text, fields}` side-channel
([forums.md](./forums.md)). `headline` takes the greedy positional; the
long-form MML `body` rides the `payload:` side-channel (the GUI editor's
natural home). Length-checked against `bulletin.headlineMaxLength` /
`bulletin.bodyMaxLength`; success/rejection ride the dispatch-response
envelope (`MessageApi.scene(...).topic('system.bulletin')` /
`ctx.note`). The affordance+seed pair (`bulletin.yaml` in the Author
contributions + `seeds/obj/command/system/BulletinController.yaml`) is
what makes the verb reachable — invisible to unit tests, so it is
checked live.

## Delivery — passive, two reads

The feed reaches players live but **passively**: no unread badges, no
inline message-feed pokes, no per-Avatar `lastSeenAt`, no toasts. Two
read surfaces:

1. **The live window — `world.bulletin.feed` frame.** On
   publish/edit/retract, `BulletinLogic.fanFeedImpl` fans a
   `BulletinFeedFrame` (`upsert` / `remove`) to every online interactive
   — `MessageApi.scene(viewer).topic('world.bulletin.feed').toSelf(...)`
   over `PlayerApi.getAllAvatars()` (skip destroyed/linkdead, per-viewer
   `try/catch`; the `world.social.roster` `sendRosterImpl` precedent).
   The fan is **inline** inside the mutators (the trigger originates in
   the logic — not an event tap), and the payload is composed **once**
   (OOC-public, identical for every viewer — no per-viewer lensing,
   unlike the roster). The current window is also delivered at
   session-establish: `Avatar.enter()` folds
   `BulletinApi.recent().map(BulletinApi.toRow)` into the
   `ConnectionEstablishedPayload.bulletinWindow` beside `topicCatalogue`
   (bulletins have no presence event to hang a snapshot on, so the
   welcome payload is the seam). The `world.bulletin.feed` Topic is
   seeded at `seeds/lib/messaging/Topic/world.bulletin.feed.yaml`.
2. **The archive — `GET /api/bulletins/archive`.** A read-only REST data
   API (`backend/BulletinRoutes.ts`, the `HelpRoutes` precedent;
   `requireAuth`, registered before the SPA catch-all) for scrollback
   beyond the live window: `?before=&limit=&realm=&kind=`, realm/kind
   validated against the vocabularies (400 on bad value), rows projected
   via `BulletinApi.toRow`.

## The client pane

`NewsTickerPane` (`packages/client/src/components/`) renders the feed on
a **client-owned** third `rightPane` tab (`inspect | who | news`) in
`layouts/WorldLayout.tsx` — the `WhoPane` precedent. The cockpit-layouts
build's right-column axis is a pure Zustand toggle; the server picks the
*layout* (world vs forum) but not the right-column pane, so the news
ticker is a player-toggled tab, not an operator-placed slot. The store
`feed`/`feedOrder` slice mirrors the roster slice; the
`world.bulletin.feed` websocket handler routes
`snapshot`/`upsert`/`remove` by action; `setConnected` seeds the feed
from `payload.bulletinWindow`. Rows render pins-first with realm/kind
chips and MML `headline`/`body` through `MmlRenderer` (MML-safe, no raw
HTML). The client `orderFeed` mirrors the server's display ordering rule
(pins-first then recency) so incrementally-`upsert`ed frames — which
carry no order index — land deterministically in the keyed map; the
**authoritative semantics** (pin cap, expiry/retract filtering, window
length) stay server-only. A "Load older" control pulls the REST archive
and appends. The wire types
(`BulletinRow`, `BulletinFeedFrame`, `BulletinRealm`, `BulletinKind`,
`ConnectionEstablishedPayload.bulletinWindow`) live in
`@saxonberg/types`.

## Configuration

AppSettings ([app-settings.md](./app-settings.md), seeded from
`config/app-settings.yaml`, read via `AppApi`, no code defaults):
`bulletin.tickerWindow` (recent-window length), `bulletin.maxPins`
(pin cap), `bulletin.headlineMaxLength`, `bulletin.bodyMaxLength`.

## Non-goals (v1)

- **No threading/replies/reactions/voting** — any two-way deliberation
  is the forums' job ([forums.md](./forums.md)). A Bulletin is read-only
  to players.
- **No active delivery** — no badges, pokes, or `lastSeenAt`. The pane
  is passive. (A clean future addition.)
- **No edit trail** — edits are in-place; no lossless revision history
  (the forums argument-organizer has one; a staff announcement does not
  need it).
- **No divergent render per realm** — `realm` is a chip + filter over
  one render path; a diegetic in-world gazette can ride later as a
  *consumer*.
- **Not wired to the provenance ledger** — `author` is a stored
  publisher identity, not an `AuthoringEvent` ([provenance.md](./provenance.md))
  (that ledger tracks *template* authorship; bulletins are Documents).
- **Not MQL-queryable** — a platform feed, not in-world Stuff.
- **No new authorization axis** — reuses `AccessApi.isAuthor`; a
  grantable "herald" community-manager axis is deferred.

## Cross-references

[social-graph.md](./social-graph.md) (the `world.social.roster` frame +
`WhoPane`), [topics.md](./topics.md) (the session-establish snapshot
seam), [forums.md](./forums.md) (the `{text, fields}` body side-channel;
the deliberation surface this is *not*),
[streaming.md](./streaming.md) /
[livestream.md](./livestream.md) (OOC broadcast framing + the
`AuthorMixin`-afforded operator verb), [access.md](./access.md)
(`AccessApi.isAuthor`), [help.md](./help.md) (the read-only REST
data-API precedent), [app-settings.md](./app-settings.md),
[message-rendering.md](./message-rendering.md).
