# Bulletin (news ticker) — requirements

A staff→player **broadcast feed**: a chronological ticker of current
events — code changes, operator decisions, scheduled downtime, in-world
happenings — published by a privileged few and read passively by
everyone. It is deliberately **not** the forums. Forums
([forums.md](../subsystems/forums.md)) are a *deliberation* substrate:
threaded, two-way, player-authored, organizer-ranked. A Bulletin is the
opposite shape — a one-directional announcement, low-interaction,
chronological, closer in spirit to the OOC Twitch relay
([twitch-relay.md](../subsystems/twitch-relay.md)) and the presence
relay's `world.social.roster` frame
([social-graph.md](../subsystems/social-graph.md)) than to anything in
the forum stack.

This requirements doc was seeded by an in-conversation design pass
(2026-06-29), not a standing slate. Scope is closed below.

## Goals

- **A `Bulletin` is a persisted, editable announcement.** Reference-data
  `Document` in a new `bulletins` collection (the `Recipe`/`Emote`
  precedent — not a template, never cloned), carrying a `realm`, a
  `kind`, an MML `headline` + `body`, the publishing author's identity,
  a publish timestamp, and the optional `pinned` / `expiresAt` /
  `retracted` controls.
- **Publishing is gated to the author axis.** An `announce` verb,
  afforded on `AuthorMixin`, authorized through `AccessApi.isAuthor` —
  no new role machinery. Authors can `publish`, `edit`, and `retract`.
- **A boot-warmed registry serves the live window.** A `BulletinBoard`
  singleton (the `TopicCatalogue`/`RecipeCatalogue` shape) warms the
  recent window from Mongo at boot, holds it in memory, and is the
  fan-out source on every publish/edit/retract.
- **The feed reaches online players live, passively.** A
  presence-PUBLIC `world.bulletin.feed` wire frame (the
  `world.social.roster` precedent) is fanned from `BulletinApi.boot()`
  on publish/edit/retract to all online interactives, and the current
  window is delivered at session-establish. No per-viewer gating — the
  feed is OOC-public by construction.
- **Players can read recent items and scroll a durable archive.** The
  ticker shows the recent window (pins first); a paged archive read
  reaches older items beyond the window.
- **Realm and kind are first-class, taggable, filterable.** `realm`
  (`ooc` | `world`) visibly distinguishes dev/platform announcements
  from in-world events; `kind` (`changelog` | `decision` | `event` |
  `notice`) is the orthogonal category. Both surface as chips and as
  filter axes in the pane.
- **A client news-ticker pane renders the feed.** A new cockpit pane
  (the `WhoPane` precedent — fed by the frame, not by MQL) on the
  server-authoritative layout axis, so operators can place or hide it.
- **A subsystem doc exists** at `docs/subsystems/bulletin.md`.

## Non-goals

- **No threading, replies, reactions, or voting.** Any two-way
  deliberation belongs in forums ([forums.md](../subsystems/forums.md)),
  not here. A Bulletin is read-only to players.
- **No active delivery.** No unread badges, no per-Avatar `lastSeenAt`,
  no inline "📰 new dispatch" message-feed pokes, no toasts. The pane is
  passive — players see the feed if they look at it. (Active delivery is
  a clean future addition; explicitly out for v1.)
- **No edit trail / revision history.** Edits are in-place. The forums
  argument-organizer has a lossless `entry-edited` trail; a staff
  announcement does not need one in v1.
- **No divergent rendering per realm.** `realm` is a tag (chip + filter)
  over a single render path in v1, not two rendering treatments. A
  diegetic in-world gazette front can ride later as a *consumer*.
- **Not wired to the provenance ledger.** The `author` field is a stored
  publisher identity on the Bulletin, not an `AuthoringEvent`
  ([provenance.md](../subsystems/provenance.md)) — that ledger tracks
  *template* authorship; bulletins are Documents.
- **Not MQL-queryable.** Bulletins are a platform feed, not in-world
  Stuff; no `subscribableFields`, no inspection-pane integration.
- **No new authorization axis.** Reusing `AccessApi.isAuthor`; a
  grantable "herald" community-manager axis was considered and
  explicitly deferred.
- **Not a wiki.** Community-authored reference content with the spoiler
  model is the separate wiki build
  ([wiki-slate.md](../slates/builds/wiki-slate.md)).

## Surface decisions

### Framing: both realms, tagged
One feed carries both OOC platform announcements and in-world events,
each row tagged `realm: 'ooc' | 'world'`. In v1 the realm drives a chip
+ a filter, **not** a divergent render. Rationale: keeps one feed and
one render path while letting dev changelog and lore events visibly
differ; the diegetic front is a later consumer of the same data.

### Publishing: reuse the author axis
`announce` is afforded via `AuthorMixin.commandContributions` and
authorized via `AccessApi.isAuthor` (enforced by a `requiresAuthor`
validator mirroring the existing `requiresStreamer` gate on
`stream.yaml`). Rationale: no new role machinery; anyone trusted to
author content is trusted to announce. A separate grantable "herald"
axis (the `streamers` precedent) was considered and deferred — easy to
add later without reshaping the verb.

### Lifetime: recent ticker + scrollable archive
The `BulletinBoard` holds a recent in-memory window (size an AppSetting);
older items persist in `bulletins` and are reachable through a paged
archive read. `pinned` items stick to the top of the ticker regardless
of recency, capped (an AppSetting, default ≤3). `expiresAt` drops an
item from the live ticker but it remains in the archive. `retracted` is
a **soft** flag (the row is kept, hidden from the live feed) — the
archive stays honest; no hard deletes.

### Delivery: passive pane only
The live window rides the `world.bulletin.feed` frame (push + at
session-establish); the pane renders it. No unread tracking, no inline
pokes, no Avatar state. Rationale: minimal footprint — the Avatar state
model and the message-frame path stay untouched.

### Archive read: read-only REST data API
Scrollback beyond the live window is served by a read-only REST endpoint
(`GET /api/bulletins/archive?before=&limit=&realm=&kind=`, `requireAuth`)
— the help system's REST data-API precedent
([help.md](../subsystems/help.md)). Rationale: keeps the live push lean
and the archive a simple paged pull, consistent with an existing
read-only data surface; avoids overloading the wire-frame path with
pagination.

### Body authoring: the `{text, fields}` side-channel
The long-form MML `body` is carried past the tokenizer on the command
`{text, fields}` side-channel (the forums post-body precedent), overlaid
by `CommandLogic.overlayBodyFields` before resolve. `headline` is a short
positional/flag.

### Module shape
- `lib/bulletin/Bulletin.ts` — the `Document` + the `BulletinRealm` /
  `BulletinKind` vocabularies (value-object/vocabulary category).
- `obj/BulletinBoard.ts` — the boot-warmed registry singleton
  (`PostRegistrationMixin(Idea)`, manifest-registered).
- `api/bulletin.ts` — `BulletinApi` thin forwarding shell.
- `obj/api/BulletinLogic.ts` — gated `@internal` logic singleton at
  `/obj/api/bulletin`, methods gated
  `FromModule('mud/api/bulletin#BulletinApi')`. Surface: `publish` /
  `edit` / `retract` / `recent(limit)` / `archive(query)` / `boot()`.
- `mud/cmd/system/announce.yaml` + `obj/command/system/AnnounceController.ts`.
- `seeds/lib/messaging/Topic/world.bulletin.feed.yaml` — the frame's
  Topic seed (the `world.social.roster.yaml` precedent).
- Client: `NewsTickerPane.tsx` + a Zustand slice fed by the frame +
  layout-axis placement.
- `docs/subsystems/bulletin.md`.

## Constraints

- **Go through the Api layer.** All reads/writes thread `BulletinApi` →
  gated `BulletinLogic`; nothing imports the Logic singleton directly
  (the no-logic-module-imports rule). The `announce` controller calls
  `BulletinApi`, never the registry.
- **Gated APIs derive the actor from context.** `publish`/`edit`/
  `retract` resolve the publishing author via
  `ExecutionContextApi.getActingAuthor` — never a caller-supplied actor
  parameter (the gated-API actor-from-context rule).
- **AppSettings, no code defaults.** Window size, max pins, and any
  length caps are `AppSettingKeys` seeded from
  `config/app-settings.yaml` ([app-settings.md](../subsystems/app-settings.md)),
  read via `AppApi`. No `constants.ts`.
- **Source of truth is Mongo; the registry is a warm cache.** The
  `BulletinBoard` window is rebuildable from the `bulletins` collection;
  it never holds state the collection doesn't.
- **Client owns zero semantics.** The pane renders server-pushed frames
  and issues the archive read; realm/kind chips, ordering, and the pin
  cap are decided server-side (the cockpit-layouts "client owns zero
  command semantics" rule).
- **MML-safe rendering.** `headline`/`body` are MML, rendered through the
  existing `parseMml`/`MmlRenderer` path
  ([message-rendering.md](../subsystems/message-rendering.md)); no raw
  HTML injection.
- **No new module category.** Every file lands in an existing category
  (Stuff/Document, registry singleton, Api, Logic singleton, Controller,
  command YAML, Topic seed, client pane).

## Acceptance criteria

- A `Bulletin` Document persists to `bulletins` with `realm`, `kind`,
  `headline`, `body`, `author`, `publishedAt`, and the optional
  `pinned`/`expiresAt`/`retracted` fields; tests cover round-trip
  persistence and the soft-retract (row kept, excluded from the live
  window).
- `BulletinApi.publish` is rejected for a non-author principal and
  accepted for an author; tests cover both via `AccessApi.isAuthor`.
- `announce` is reachable (afforded via `AuthorMixin`, seeded so it
  dispatches) and produces a Bulletin; verified live, not only in unit
  tests (the affordance+seed pair is invisible to unit tests — the
  social-inspection-build lesson).
- Publishing fans a `world.bulletin.feed` frame to online interactives;
  the current window is present at session-establish; tests cover the
  fan-out tap and the session-establish payload.
- `BulletinApi.recent(limit)` returns pins-first then recency-ordered,
  honoring `expiresAt` and excluding `retracted`; `archive(query)`
  pages older items filtered by `realm`/`kind`. Tests cover ordering,
  the pin cap, expiry exclusion, and paging.
- `GET /api/bulletins/archive` requires auth and returns paged,
  filterable results; registered before the SPA catch-all.
- The client news-ticker pane renders the feed (pins, realm/kind chips,
  recency order) and can scroll the archive; it appears on the
  layout axis and can be hidden.
- AppSettings knobs (`bulletin.tickerWindow`, `bulletin.maxPins`, any
  length caps) are seeded from `config/app-settings.yaml` and read via
  `AppApi`.
- `docs/subsystems/bulletin.md` exists and is the source of truth for
  the subsystem; the CLAUDE.md documentation map gains its entry; the
  `bulletins` collection is added to the CLAUDE.md collections list.

## Cross-references

- **Seeding**: in-conversation design pass 2026-06-29 (no standing
  slate).
- **Precedents**:
  [social-graph.md](../subsystems/social-graph.md) (the
  `world.social.roster` presence-PUBLIC frame + `boot()` fan-out tap +
  `WhoPane`), [topics.md](../subsystems/topics.md)
  (`TopicCatalogue` boot-warm + session-establish snapshot),
  [crafting.md](../subsystems/crafting.md) /
  [emotes.md](../subsystems/emotes.md) (the `Recipe`/`Emote`
  reference-Document + catalogue pattern),
  [forums.md](../subsystems/forums.md) (the `{text, fields}` body
  side-channel; the deliberation surface this is *not*),
  [livestream.md](../subsystems/livestream.md) /
  [twitch-relay.md](../subsystems/twitch-relay.md) (the OOC broadcast
  framing + `AuthorMixin`-afforded operator verb + `requiresStreamer`
  validator precedent), [access.md](../subsystems/access.md)
  (`AccessApi.isAuthor`), [help.md](../subsystems/help.md) (the
  read-only REST data-API precedent for the archive),
  [app-settings.md](../subsystems/app-settings.md),
  [message-rendering.md](../subsystems/message-rendering.md).
- **Not this build**: [wiki-slate.md](../slates/builds/wiki-slate.md)
  (community-authored reference content), forums
  ([forums.md](../subsystems/forums.md)) (deliberation).
