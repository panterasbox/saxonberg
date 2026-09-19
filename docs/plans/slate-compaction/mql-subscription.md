# Slate-compaction pass — mql-subscription batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `mql-subscription.md`
only. Line numbers below are the ORIGINAL file's (1,837 lines); the
original is saved under the scratch dir `mql-subscription/orig/` and the
edit table that produced the cut is `mql-subscription/compact.py` (every
range below is one entry in it). Code was verified in
`packages/server/src/mud/api/mql-subscription.ts`,
`packages/server/src/mud/platform/idea/MqlSubscriptionRegistry.ts`,
`packages/server/src/backend/inbound/{index,mql,ping,affordance}.ts`,
`packages/types/src/index.ts` (the `Mql*` wire types), the eighteen
`packages/server/src/mud/api/__tests__/mql-subscription.*.test.ts` files,
`packages/client/src/services/websocket.ts`,
`packages/client/src/components/cards/useCardFeed.ts`,
`packages/client/src/components/frame/Shelf.tsx`, and every
`static subscribableFields` declaration in the tree (18 hosts).

Four things a reviewer should know first:

1. **The old `Left` was 6 items and 4 of them were mis-stated.** *"the
   client-side subscription lifecycle in the cockpit · widget
   composition + cache coherence"* shipped in a different shape — the
   client opens exactly ONE subscription (`chrome: 'self'`,
   `Shelf.tsx:479`) and every card is server-pushed (`card-opened`
   carries the first resolve; deltas ride `mql-subscription-delta` on
   the same id — `card-surface.md § One birth path`). *"`mixins[]` /
   `capabilities[]` wire fields"* — `capabilities` is SUPERSEDED by the
   `affordance-resolve` request/response channel
   (`backend/inbound/affordance.ts`, `AffordanceResultEnvelope`) and
   `mixins[]` is the admin projection `card-surface.md § What ships
   unbuilt` already owns; neither is a subscription item any more. The
   two that were right (`mql-subscribe-update`, the heartbeat / `closed`
   envelope) are still right: no `subscribe-update` message exists
   anywhere; the shipped heartbeat is a client-driven `ping`/`pong` RTT
   probe (`websocket.ts:165`, `HEARTBEAT_MS = 30_000`;
   `backend/inbound/ping.ts`) carrying no `frameId`; `'closed'` is in
   `MqlSubscriptionErrorReason` and nothing emits it. `Left` grew from
   6 to 17 because the body carried eleven open designs the stamp never
   named (the shadow model, gap detection, the resync policy, hover
   detail, `iconKind`, `options.coarse`/`debounce`/`throttle`, composite
   queries, the cap + performance contract, permission churn, `extend`,
   introspection).
2. **Two slate designs shipped MORE than the slate's own "v1" and the
   doc did not say so.** The *adaptive* dynamic-dependency strategy
   (slate: Tier 2) and the *v1.5 selective per-result reverse index*
   (slate: "when shadow churn becomes a perf issue") are what
   `MqlSubscriptionRegistry.reresolveAndEmit` does on every drain: tear
   down the handles, `deriveAndInstallDependencies` against the new
   result set (`MqlSubscriptionRegistry.ts:876–883`). Graduated as one
   paragraph (below). The slate's *coarse AST-walk* v1 never existed:
   dependencies come from result-set descriptors + the two holder-level
   flags, and field-keyed firing is global by field NAME.
3. **The Shadow-interactions design rests on a premise the code
   refuted.** The slate assumes disguise = a `Shadow` on the host
   (`wear hood` → `ShadowChangedEvent`). Disguise shipped with **no
   shadow at all** — `Stuff.getPresentation()` defers to
   `DisguisableMixin.getDisguise()`, a live worn-slot scan
   (`belief.md` l.180–190, which itself flags the recognition-shadow
   design as superseded). `ShadowChangedEvent` is still declared and
   still unfired (`lib/events/ShadowChangedEvent.ts`; the five
   descriptors reference it). Consequence for requirements: a hood
   going on fires `FieldChangedEvent { field: 'occupants' }` from
   `SlottedMixin.fireOccupancyChange` (`Slotted.ts:661`), which wakes
   only subscriptions whose field set includes `worn` (the `detail`
   alias does; `ref` does not) — so a `ref`-projected `displayName` of a
   person who just hooded up is NOT re-projected today. The Left item
   is kept under the slate's noun (*the `ShadowChangedEvent` firing
   site*), and the whole section is in *Uncertain* so requirements
   reconcile the noun rather than inherit it.
4. **One existing sentence in `mql-subscription.md` was changed**
   because the code proves it false (§ 3 allows this; recorded below):
   the *Where descriptors live* table's `worn` row named `SlottedMixin`
   with `dependsOnFields: ['worn']`. `worn` lives on `AttiredMixin`
   (`lib/slot/Attired.ts:503`) with `dependsOnFields: ['occupants']`,
   and `SlottedMixin` fires `'occupants'` from
   `occupy`/`vacate`/`vacateSole` (`Slotted.ts:661`; the Attired split
   moved it and renamed the wake so a chair's occupancy no longer fires a
   body concept). Two rows edited; nothing else in the doc was touched
   except the two inserts.

Doc drift found but NOT fixed (outside my slate's content — for the
coordinator): (a) § *Disconnect cleanup* says
`Application.handleUserDisconnect` calls
`MqlSubscriptionApi.cancelAllForInteractive`; the OO sweep moved it to
`Interactive.cancelAllMqlSubscriptions()` (`platform/idea/Interactive.ts:439`).
(b) § *The card catalogue's field sets* still tables `inspect` /
`location` / `self` as three cards — the doc's own later § *The card
catalogue LEFT this substrate* and `card-surface.md` say `subject` is the
one inspection row and `self` is not a card; the table is a build-time
snapshot. (c) § *The two structural findings*' "twenty-three descriptors"
table predates `Bulkable.bulkAmount` (`lib/bulk/Bulkable.ts:515`) and the
`Attired` move. (d) `packages/server/src/mud/api/event.ts:428` dispatches
listeners in a `queueMicrotask`, so the slate's *"EventApi fires
synchronously"* was never literally true; the graduated paragraph states
the microtask + `setImmediate` ordering instead.

---

## docs/slates/tails/mql-subscription-slate.md — 1837 → 1191 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the second narrative status paragraph *"**Status.** Server substrate has shipped … This slate stays alive for the client-side half…"* (21–29, 9) — history; the canonical block is kept and re-stamped (one-status-block rule); the client half it names shipped as the card feed
- `## Two channels, distinct concerns` → the intro, the message diagram, *The mental model* bullets (84–110, 27) — code: `backend/inbound/index.ts:54–58` (`ping`, `mql-subscribe`, `mql-unsubscribe`, `mql-query` beside `command`); doc: `mql-subscription.md` intro (*the second wire channel*). Pointer left; the *client-initiated housekeeping traffic* paragraph (111–117) is KEPT (its uses — resync, hover fetch, liveness — are the unbuilt items)
- `## Two channels` → *"Crucially: the MQL channel's message types all share the same underlying mechanism…"* (119–125, 7) — code: `MqlSubscriptionApi.handleQuery` shares parse+resolve+project with `handleSubscribe`; doc: `§ mql-query one-shot channel`
- `## Why MQL fits` body (130–163, 34) — the argument for a shipped decision; both "missing" pieces landed: `fields` as a message parameter (`MqlSubscribeMessage.fields`, `types/index.ts:1109`), the lifecycle on `MqlSubscriptionApi` + `MqlSubscriptionRegistry`; doc: `§ Surface`, `§ File layout`. Heading + pointer left
- `### Outbound` → the *`mql-query` is the one-shot form* paragraph (209–215, 7) — code: `handleQuery`; doc: `§ mql-query one-shot channel`
- `### Change ops` → the `Change` block + the `key` paragraph (293–304, 12) — code: `MqlSubscriptionRegistry.diff` (`op: 'add'|'remove'|'update'|'replace'`, `key`, `fields`; `Change` type at `types/index.ts:1760`); doc: `§ Diff algorithm`. Note left says the shipped shape (`{ op, key, fields? }`, identity change = `remove` + `replace`); the synthetic non-Stuff key is superseded (no non-Stuff records)
- `## Field projection — mixin-declared surface` → the two intro paragraphs (385–397, 13) — code: `MixinApi.getAllSubscribableFields`, `collectSubscribableFields`; doc: `§ Descriptor mechanism` (*no substrate-private synthetic table*). Heading + pointer left
- `### The composition walk + dependency derivation` (566–617, 52) — code: `MixinApi.getAllSubscribableFields`, `MqlSubscriptionApi.projectFields`, `MqlSubscriptionRegistry.deriveAndInstallDependencies` (`:634–690`); doc: `§ Descriptor mechanism`, `§ Meta-bus dependency index + scheduler`. Heading + pointer left
- `## Subscription lifecycle (server-side)` incl. `### Subscribe lifecycle` · `### Change lifecycle` · `### Unsubscribe / disconnect` (643–693, 51) — code: `MqlSubscriptionRegistry.handleSubscribe` / `reresolveAndEmit` / `cancelAllForInteractive` (`:522`); doc: `§ Surface` (the error ladder), `§ Meta-bus dependency index + scheduler`, `§ Disconnect cleanup`. State is on the Registry singleton, not a static map on the Api (the doc says why: HMR). Heading + pointer left; the three sub-headings are gone
- `## Change detection — dependency tracking` → the intro, `### The meta-bus and the dependency index`, `### The re-resolve pass (micro-batch)` (698–748, 51) — code: `MqlSubscriptionRegistry.index` (3-level), `ensureListener` refcounts, `markDirty`/`drainDirty` on `setImmediate` (`:785–830`); doc: `§ Meta-bus dependency index + scheduler`. Heading + pointer left; the two sub-headings are gone
- `### Race conditions and ordering` → paragraph 1 *"EventApi fires synchronously… no read-your-write hazards"* (795–798, 4) — graduated as the ordering sentence in the inserted paragraph (the literal claim is false — microtask dispatch — the property holds). Paragraph 2 (composite queries, Tier 2) is KEPT
- `### Resolution failures mid-stream` (849–861, 13) — code: `reresolveAndEmit` catch → `emitError` + `teardownSubscription` (`:853–870`); doc: `§ Surface` (*mid-stream resolve throws → emit reason, auto-cancel*; holder vanished → silent cancel). Heading + pointer left
- `## Throttling and batching` → the intro (866–869, 4) + the *Default: micro-batch* bullet (872–874, 3) — doc: `§ Meta-bus dependency index + scheduler` (*N events in one tick → ONE re-resolve*). Pointer left; the `debounce` / `throttle` bullets + closing are KEPT
- `## Worked example: inspection card` (945–971, 27) — code: `focusDependent` installs `(FieldChangedEvent.KIND, 'field', 'focus')` against the holder; `Focused.setFocus` fires it; doc: `§ focusDependent`, `card-surface.md § Inspection is ONE row`. No `FocusChangedEvent` exists. Heading + pointer left
- `### Cascading focus updates` (1133–1142, 10) — doc: `§ focusDependent`, `§ locationDependent` (independent subscriptions; only the holder-level entry wakes). Heading + pointer left
- `## Per-viewer everything` (1377–1396, 20) — code: `projectFields` renders `displayName` through `stuff.describeFor(viewer)` (`mql-subscription.ts:316–323`); every subscription is per-Interactive; doc: `§ displayName routes through Stuff.getPresentation()`, `belief.md`. Heading + pointer left
- `### Descriptor evolution: multi-source changes` → the lead + the `NamedMixin` code block (1435–1455, 21) — code: `changes: [{ on: ShadowChangedEvent, by: 'target' }]` on `Stuff.ts:222`, `Named.ts`, `Visible.ts`, `Detailed.ts`, `Tangible.ts`; doc: `§ What ships unfired`. Pointer left; the generalization paragraph + its four bullets (buffs-as-shadows, `iconKind`, sensory — open) are KEPT
- `## Non-goals` → *Subscriptions surviving disconnect* (1653–1655, 3) — shipped as designed: `Interactive.cancelAllMqlSubscriptions()`, the wire client replays only `chrome: 'self'`; doc: `§ Disconnect cleanup`, `card-surface.md § Reconnect behavior`. Replaced by a pointer bullet
- `## Open questions` → Q1 *`select { … }` grammar* (1666–1672, 7) — resolved as the slate leaned: a separate `fields` parameter, grammar untouched; doc: `§ Surface`. One-line *Resolved* left
- `## Dependencies` (1739–1756, 18) — every bullet shipped or superseded: `fields` parameter; `FieldChangedEvent { field: 'focus' }` in place of `FocusChangedEvent`, `PropertyChangedEvent` shipped (`§ Event-class pattern`); recognition at projection via `describeFor` (`belief.md`); `capabilities` → `affordance-resolve`. No `CapabilitiesChangedEvent`. Heading + note left
- `## Suggested build order` → the intro + waves 1–11 (1759–1798, 40) and wave 13 + the two wave-summary paragraphs + the stray duplicate *"10. Tier 2 polish"* (1801–1811, 11) — waves 1–7 are the substrate (`mql-subscription.md`), 8–10 the client as the card feed (`card-surface.md`), 11 as `affordance-resolve`, 13 as the per-re-resolve re-derivation (graduated below). Wave 12 (composite queries) is KEPT — it is a `Left` item
- `## What this changes upstream` → bullets 1–4 (1817–1827, 11) — the cockpit slate's section was cut by the card-surface batch, `InspectionFrame` is gone, `prompt-stack-slate.md:651–662` already says *subscription-driven token-format prompts*, `state-sync-slate.md` does not exist under `docs/slates/`. Note left; the `activity.md` bullet is KEPT (see Handoff)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Dynamic dependency sets` (772–792, 21) + `### Reverse-index challenge` (1480–1519, 40) + the `### Race conditions` paragraph 1 (795–798) — code: `MqlSubscriptionRegistry.reresolveAndEmit` tears down `sub.dependencyHandles` and re-runs `deriveAndInstallDependencies(sub, stuffList)` after every diff (`:876–883`); `by: 'target'` tuples are installed per result `stuffId` (`:678–680`); the drain runs each re-resolve under `ExecutionContextApi.runRootGuarded(null, 'mql.reresolve', …, 'swallow', { circleScope })` with the CURRENT holder's scope (`:793–830`); `EventApi.emit` dispatches in `queueMicrotask` (`api/event.ts:428`) → inserted at `mql-subscription.md § Meta-bus dependency index + scheduler`, after the drain paragraph, as one ⭐ paragraph *The dependency set is re-derived on every re-resolve* (17 lines: interest follows the answer; the per-result reverse index; the slate's "adaptive" shipped as the default; microtask + `setImmediate` ordering; the guarded per-subscription root and its sandbox consequence). Both headings left with a superseded-by-the-code note
- the framing paragraph's *why the pivot* (30–37) + `## Principle`'s three corollaries — code: three message types on the wire (`inbound/index.ts`), no `mql-mutate` → inserted at `mql-subscription.md` as a new `## Why this shape` after the intro (12 lines: fixed-delta taxonomy = a wire entry per widget, quadratic; query + field set = linear; MQL the one language; read-only, mutation on the command bus). ⚠ **Nothing was cut for this** — the framing paragraph is spine and `## Principle` is kept as doctrine (below); the doc simply lacked the why

### Superseded — cut
- `### Outbound (client → server)` — the code block is KEPT WHOLE (paragraph rule: it also holds the unshipped `MqlSubscribeUpdateMessage` + `HeartbeatMessage`); a ⚠ note above it records the shipped shapes: `cardinality: 'one' | 'many'` required, `fields?: string[] | 'ref' | 'detail'`, `detailKey?`, `focusDependent` / `locationDependent`, `chrome?: 'self'`, no `options` (`types/index.ts:1090–1113`, `1396–1423`)
- `### Inbound (server → client)` — block KEPT WHOLE (holds the unshipped `reason?`); ⚠ note records: envelopes carry `result` not `items`/`records`, no `cardinality`, no `reason`; error envelopes carry `detail?` not `message`; `'closed'` is in the union and unemitted (`types/index.ts:1748–1815`)
- `### Field sets` (307–321, 15) — by the code: `FieldAlias = 'ref' | 'detail'`, `FieldSet = string[]`; no `'minimal'`, no `{ include }` (`mql-subscription.ts:106–130`) → `§ Field-set aliases`. Heading + note left
- `## Result records` incl. `### Reference record` · `### Detail record` · `### Structured / path records` (326–380, 55) — by the code: `StuffRefRecord = { stuffId, displayName, quantity?, primaryKeyword? }` (no `iconKind`, no `capabilities`); `StuffDetailRecord` adds `shortDescription`, `longDescription`, `illustration`, `details`, `bulkMaterial`, `mass`, `contents`, `worn`, `exits` (no `properties`/`slots`/`lighting`/`atmosphere`/`admin`); no `PathRecord` — MQL speaks only Stuff (`types/index.ts:1563–1640`; `§ The two structural findings` finding 1). Note names the unshipped fields; the admin projection is `card-surface.md § What ships unbuilt`'s. Three sub-headings gone
- `### The descriptor shape` (400–438, 39) — by the code: `{ name, read?, perDetailRead?, dependsOnFields?, changes?, static?, durableKey? }` (`mql-subscription.ts:64–100`): `getter` strings → `read` closures; field wakes via `dependsOnFields` over `FieldChangedEvent`; `durableKey` for ledger-keyed figures → `§ Descriptor mechanism`, `§ durableKey`. Heading + note left
- `### Fact-mixin vs behavior-mixin` (441–460, 20) — by the code: the placement rule is *the mixin that owns the gate; universal renders on `Stuff`* (`§ Where descriptors live`), and the *mint a new fact-mixin* prescription was explicitly declined for the standing figures (`§ Ledger-derived fields`: *a `StandingMixin` for five fields on one class would be per-feature minting*). Heading + note left
- `### Worked example: dynamic scalar (Vitals)` (463–506, 44) — by the code: `lib/vitals/Vitals.ts` declares no `subscribableFields` (grep of all 18 hosts); the descriptor/event shape differs; every undeclared reading is one descriptor on its mixin (`§ The two structural findings` finding 2). Heading + note left
- `### The (one) substrate-side synthetic field` (620–638, 19) + `### Capability fields and their dependencies` (811–837, 27) + Open question 3 *Capability staleness* (1678–1686, 9) — by the code: `capabilities` is not projected; the radial and the action row send `affordance-resolve` (`inbound/affordance.ts`, `websocket.ts:resolveAffordances`) and `clearAffordances` runs on every command send; no `CapabilityChangedEvent`/`CapabilitiesChangedEvent` → `§ What doesn't ship at all`, `card-surface.md § The card's action row`. Headings + notes left
- `### Coarse dependencies (v1)` (751–769, 19) — by the code: no AST walk; result-set descriptors + holder-level flags; field-keyed firing global by field name (`deriveAndInstallDependencies`; `§ Holder-level dependency flags`, `§ Conservative-coarse dispatch policy`). Heading + note left
- `## Canonical subscription kinds (v1 catalogue)` (888–910, 23) — by the code: `registerKind` shipped in Wave 1 and was retired in MR review (`§ Build history`); the table's non-Stuff rows (`here.atmosphere`, `me.{ hp, … }`, `world.time`, `me.posture`) cannot resolve; the prompt-token rows belong to `prompt-stack-slate.md`. Heading + note left
- `## Worked example: inventory widget` (915–940, 26) — by the code: no inventory widget; `contents`/`worn` on the subject card, woken by `FieldChangedEvent` `contents` (Container) / `occupants` (Slotted) → `§ Where descriptors live`, `card-surface.md § worn vs contents`. Heading + note left
- `## Client cache and lifecycle` → the intro + the flat-cache block (976–989, 14) — by the code: card records live on the feed (`useCardFeed.applyChanges`, `:70–93`) plus a normalized `stuffRegistry` slice → `card-surface.md § Client stuff registry`, `§ Reconnect behavior`. Heading + note left; the *selectors* paragraph and every sub-section KEPT (see Uncertain)
- `### Widget mount / unmount` (1114–1122, 9) — by the code: cards are server-born; *live* is scoped to attention, the newest of a kind holds the subscription; no refcounted share → `card-surface.md § One birth path`, `§ One sweep`. Heading + note left
- `### MQL-query results in a card tab` (1125–1130, 6) — by the code: `find` renders to the terminal and *the client supplies an identity, never a query* (`card-surface.md § find verb`, `§ What ships unbuilt`); a *Make live* toggle contradicts the birth path. Heading + note left
- `### ShadowChangedEvent` → the payload block (1420–1427, 8) — by the code: `{ target: string, shadow: string, cause: 'attach' | 'detach' | 'mutate' }` (`lib/events/ShadowChangedEvent.ts:18–22`), declared and unfired → `§ Event-class pattern`, `§ What ships unfired`. Note left; the lead sentence + the *Emitted by the shadow lifecycle* paragraph (the unbuilt firing site) KEPT
- `## Non-goals` → *Arbitrary client-authored MQL queries* (1638–1642, 5) — by the code: the named-kind registry is gone and `handleMqlSubscribe` accepts a raw `query` (`inbound/mql.ts:46–60`), gated by MQL's per-viewer scoping + `MqlPermissionError` → `§ Surface`. Replaced by a superseded bullet
- Open question 4 *Result identity for non-Stuff records* (1687–1692, 6) — by the code: no non-Stuff records. One-line note left

### Kept (UNBUILT)
- the status block (re-stamped) · the two framing paragraphs · the *Supersedes* paragraph · *See also* (all six links still resolve; the cockpit-slate and prompt-stack descriptions are stale but spine)
- `## Two channels` → the *client-initiated housekeeping traffic* paragraph
- `## Wire shape` intro · `### Outbound` block (for `MqlSubscribeUpdateMessage` + `HeartbeatMessage`) · the `mql-subscribe-update` / `refresh: true` paragraph · the two heartbeat paragraphs · `### Inbound` block (for `reason?`) · the `reason` paragraph · the *heartbeat arrives as the same shape* paragraph
- `### Worked example: intrinsic-to-class field (HasIcon)` · `### Optional: hints from other mixins` (no `iconKind`/`HasIcon`/`iconHint` anywhere in server, client or types — see Uncertain)
- `### Race conditions and ordering` → paragraph 2 (composite queries — no composite/joined subscription exists)
- `### Catch-all events` (`options.coarse` — `MqlSubscribeMessage` has no `options`)
- `## Throttling and batching` → the `debounce` / `throttle` bullets + closing (no `options`)
- `## Client cache and lifecycle` → *Widgets read via selectors* · `### TTL: none` · `### Gap detection via frameId` (the client logs `frameId` — `websocket.ts:689` — and tracks nothing) · `### Server heartbeats` · `### Resync mechanism` + its trigger table · `### What the cache is NOT` (see Uncertain for each)
- `## Cascading UI patterns` intro · `### Hover tooltips on chips` · `### Refresh button on the inspection card` (see Uncertain)
- `## Shadow model (future)` — all five sub-sections (no normalizer, no `freshness`/`asOfFrameId`/`provenance`, no `locations`/`exits` topology, no `useTopology`, no mini-map — `CardBodies.tsx:1119` says *not a map and not a minimap*)
- `## Shadow interactions` → the intro · `### ShadowChangedEvent` lead + *Emitted by* paragraph · the *Descriptor evolution* generalization + bullets · `### Worked example: disguise on / off` · `### Edge cases` · `### What this requires` (see Uncertain — the whole section)
- `## Non-goals` → mutation · cross-subscription joins · multi-Interactive sharing · fine-grained dependency tracking (`§ What doesn't ship at all`: *per-detail-key dependency-index refinement*) · optimistic mutation
- `## Open questions` → Q2 permission churn · Q5 bandwidth ceilings (no cap anywhere in the Registry) · Q6 field-set `extend` · Q7 introspection (only the test seams `_getSubscriptionCount` / `_getDependencyIndexEntryCount`) · Q8 throttling on the initial result
- `## Decisions to pin before build` — intro + the whole table (see Uncertain)
- `## Suggested build order` → item 12 (composite queries)
- `## What this changes upstream` → the `activity.md` bullet (see Handoff)

### Doctrine — kept, labelled
- `## Principle` (59–79) — *Client declares; server notifies* + three corollaries. The why is now graduated (`§ Why this shape`); the thesis itself is kept for the coordinator's home decision. ⚠ Note for that decision: the first sentence is half-contradicted by the card surface — the client no longer *declares* anything but `chrome: 'self'`; the SERVER declares cards (`card-surface.md § One birth path`). Corollaries 1 and 3 hold literally; corollary 2 is a platform thesis (`mql.md`)

### Uncertain — kept
- `### Worked example: intrinsic-to-class field (HasIcon)` + `### Optional: hints` — no code; but the shipped-world analogue is the doc's `kind` line (`§ The three smaller gaps`: *derivable from composition → a candidate for `Stuff.subscribableFields`*), which contradicts the fact-mixin-with-authored-field design here; and the sketch uses the retired `getter`/`static: true` descriptor shape. Kept verbatim; requirements pick one
- `## Client cache` → *Widgets read via selectors, not directly* — contradicted by the code: `useCardFeed` reads card records directly; the `stuffRegistry` is read by `Map.get`; no selector layer exists (`card-surface.md § Eviction policy upgrade path` says *consumers only call `Map.get`*). Kept because it is the seam the Shadow model section depends on
- `### Server heartbeats` — shipped in a different shape: the CLIENT pings every 30 s and the server echoes the client's stamp (`websocket.ts:165,504–535`, `inbound/ping.ts`); a *server-driven* heartbeat carrying `frameId` does not exist. Kept as the unbuilt half; the ledger notes the overlap so requirements do not build a second heartbeat
- `### Resync mechanism` trigger table — two rows are answered differently by the card surface: *Reconnect after disconnect → all active subscriptions* (only `chrome: 'self'` replays; cards are server state — `card-surface.md § Reconnect behavior`) and *Explicit player gesture (silent refresh button)* (the shipped refresh control re-issues the card's COMMAND — `§ One identity: the normalized command`). Kept whole
- `### What the cache is NOT` → *Not normalized* — contradicted: `card-surface.md § Client stuff registry` IS a normalized, monotonically accumulating, never-evicted store keyed by `stuffId` (a slim version of this slate's Shadow store without `freshness`/`provenance`/topology). The other three bullets hold. Kept whole (one list)
- `### Hover tooltips on chips` — the design's three options are unbuilt; the shipped hover shows the row's COMMAND (`card-surface.md § MML identity-tag rendering`, `cockpit.md`) and the radial's cold path is `affordance-resolve`, not `mql-query`. Kept; requirements decide whether hover *detail* is still wanted
- `### Refresh button on the inspection card` — the *Look again* half shipped as the refresh control that re-issues the key command; the *silent ↻* half is unbuilt and depends on `mql-subscribe-update`. Kept whole
- `## Shadow model (future)` — no contradiction in the design, but `card-surface.md § Client stuff registry` already ships the shared-store idea in miniature, and `§ Per-viewer presentation isn't modeled on the client` / `§ Last-writer-wins` are its open edges; the slate's own last paragraph says the model *graduates to its own slate when build effort is committed*. Kept whole; overlap for the cluster pass
- `## Shadow interactions` (the whole section, incl. the disguise worked example and *What this requires*) — **contradicted by the shipped disguise model** (finding 3 above): disguise is `getPresentation()` → `getDisguise()` (worn-slot scan), not a shadow; hooding fires `occupants`, not `ShadowChangedEvent`. *What this requires* item 2 shipped (descriptors reference the event), item 3 shipped (finding 2), item 1 is the open one — and may be the wrong noun for the real gap (*disguise-aware wake for `displayName`*). Kept verbatim so requirements reconcile it
- `## Decisions to pin before build` table — one block, mixed: rows 1, 2, 5, 6, 10 shipped as leaned (equality-on-attribute index, keyed `(KIND, by, value)`, error + auto-cancel, `cancelAllForInteractive`, ordering not contracted — drain in insertion order); rows 3 and 4 superseded (re-derive per re-resolve; no `capabilities` field); rows 7, 8, 9 (per-Interactive cap — no `MAX`/limit in the Registry; permission churn; the initial-result performance contract) unbuilt and in `Left`. Kept whole
- `## Non-goals` → *Fine-grained dependency tracking — Tier 2* — half-true now: `by: 'target'` entries are per-`stuffId`; field-keyed entries are global by name and the per-detail-key refinement is the doc's own unshipped item. Kept
- Overlaps for the cluster pass: the `activity.md` wording ↔ `activity.md`'s own doc; the shadow model's shared store ↔ `card-surface.md § Known future considerations`; hover / radial ↔ `client-cockpit-slate.md` (card-surface batch); `vitals`/`posture` prompt tokens ↔ `prompt-stack-slate.md`

### Handoff (belongs in a doc outside my list)
- → `activity.md` (l.493 and l.543–545 still say *completion mutations flow through "the state-sync channel"*; the channel is the MQL subscription substrate). The slate bullet, kept verbatim in the slate and reproduced here for the owner of `activity.md`:

  > - **Activity subsystem doc** (`docs/subsystems/activity.md`)
  >   describes completion mutations as flowing through "the state-
  >   sync channel." Under the new model, completion side effects
  >   flow through whatever subscriptions happen to be watching the
  >   affected state (inventory subscription sees a crafted item
  >   appear; vitals subscription sees stamina change). The activity
  >   subsystem doc gets updated when the MQL substrate ships and
  >   rewires the completion path. Left as-is for now; the conceptual
  >   intent ("world-deltas flow on a separate channel from envelopes")
  >   remains correct.

  Suggested fix (not applied — outside my list): replace *the state-sync channel* with *the MQL subscription channel* and point at `mql-subscription.md`.
- → `card-surface.md § What ships unbuilt` — nothing to add; it already owns the admin projection (`mixins[]`) and `find`-as-card. Recorded so the coordinator knows why `mixins[]` left this slate's `Left` without landing anywhere new.
- → `mql.md` — nothing. The slate's MQL-grammar item (`select { … }`) resolved without a grammar change.

### Status block
- Status line: kept PARTIAL; the sentence now says the client half shipped as the server-pushed card feed (one subscription, `chrome: 'self'`) and points at `card-surface.md`
- Left: *the client-side subscription lifecycle in the cockpit · widget composition + cache coherence · shadow-aware projection · `mql-subscribe-update` · the heartbeat / `closed` envelope · `mixins[]` / `capabilities[]` wire fields* → *`mql-subscribe-update` (re-bind + `refresh: true`, the `reason: 'initial' | 'refresh'` result) · the frameId heartbeat + the `'closed'` envelope · frameId gap detection + the client resync policy · the silent ↻ beside look again · hover detail on chips · the `ShadowChangedEvent` firing site (shadow-aware projection) · the client-side shadow model (normalizer + freshness + topology; the mini-map) + the selector seam · `iconKind` (HasIcon + the hint chain) · `options.coarse` + `debounce` / `throttle` · composite queries · the per-Interactive cap + the initial-result performance contract · permission churn mid-session · field-set `extend` · subscription introspection · throttling on the initial result · the `activity.md` state-sync wording* (the body wins: two old items superseded, eleven open designs were unrepresented)
- Size: a wave → a wave (many small items, none its own cycle; the shadow model is the only candidate for a build and the slate itself defers it to its own slate)

### Verification
- `git diff --stat -- docs/slates/tails/mql-subscription-slate.md docs/subsystems/mql-subscription.md` → slate `1020 +++---` (1837 → 1191), doc `+32 −2` (two inserts, one two-row correction)
- every heading that left the slate (`### Reference record` · `### Detail record` · `### Structured / path records` · `### Subscribe lifecycle` · `### Change lifecycle` · `### Unsubscribe / disconnect` · `### The meta-bus and the dependency index` · `### The re-resolve pass (micro-batch)`) is inside a range listed above; all 55 other headings remain
- code fences balance (9 blocks); every `Left` item has a body section; no other file touched; nothing committed
