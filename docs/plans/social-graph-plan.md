# Social-graph Wave 3 — implementation plan

Implementation spec for the attention-management layer, driving against
[social-graph-requirements.md](../requirements/social-graph-requirements.md)
(the closed source of truth — scope and surface decisions are settled
there). Four independently-shippable phases; the build never lacks the
`notify` floor after Phase 1.

## Grounding: the real seams (verified)

- **Late-bound per-viewer fragment mechanism exists and is exactly what
  the occupant block needs.** `Mml.compose`'s `renderValue`
  (`api/mml.ts:170-182`) unwraps any interpolated object exposing
  `toMml(viewer)` *at `toString(viewer)` time*, and `Scene.send`
  materializes each frame body against its recipient (`Scene.ts:238-239`,
  `af.body.toString(recipient)`). So the occupant block is a plain object
  `{ toMml(viewer) { return SocialLogic.renderOccupants(viewer, …) } }`
  dropped into the `look` body — no new MML payload kind, no eager
  controller-time string.
- **`RecognitionApi.describe` / `salientFeatures` are the compose-through
  primitives.** `obj/api/RecognitionLogic.ts` exports `describeImpl` and
  `salientFeaturesImpl` (species + most-notable-worn tuple) — the social
  formatter composes *through* `describe` per named occupant and reads
  `salientFeatures` for similarity grouping.
- **The Api↔Logic split is uniform.** `RecognitionApi`→`RecognitionLogic`,
  `GroupApi`→`GroupLogic`, `RegardApi`→`RegardLogic`,
  `RenownApi`→`RenownLogic` all follow `StuffApi.singletonSync` +
  `HotReloadApi.getCurrentExport` +
  `@CallSecurity(FromModule('mud/api/social#SocialApi'))`.
  `SocialApi`/`SocialLogic` mirrors it verbatim.
- **The event-consumer + in-memory-registry + rate-limiter precedent is
  `RenownLogic`** (`obj/api/RenownLogic.ts`): `installXTap()` idempotent
  guards, `EventApi.on`, a transient `Map` rate-limiter (`receptionSeen`),
  `EventApi.restrictSubscribe(KIND, RenownLogic)`, booted from
  `AppBootstrap.run()` via `RenownApi.boot()` (`AppBootstrap.ts:178`).
- **Login events are emitted but unconsumed.** `obj/Avatar.ts:446` emits
  `Events.PlayerLoggedIn {playerId, userId}`, `:684` emits
  `Events.PlayerLoggedOut {playerId}`. Default policy is open
  `emittableBy()` (`api/event.ts:369-370`). Nothing relays them — this
  build supplies the consumer.
- **Online scan is `PlayerApi.getAllAvatars()`** (`api/player.ts:103`);
  membership test is `GroupApi.isMember(playerId, ref)` (`api/group.ts:57`);
  ref-source discrimination is `GroupApi.parseRef(ref).source`
  (`'managed'|'mql'|'contacts'`).
- **Arrival reuses the look seam.** `MobileMixin.traverse` auto-looks on
  arrival via `CommandApi.forceCommand(giver,'look')` (command-spec.md §6),
  landing in `LookController.lookAtLocation`. Wiring the formatter at the
  single `Mml.list(...)` occupant site (`LookController.ts:226-247`) covers
  **both** look and enter — no second seam needed for v1.
- **Storage precedent is `ContactsMixin`** (`lib/social/Contacts.ts`):
  `static persistentFields = ['_contacts']`, plain-JSON array,
  legacy-tolerant `= []` default, `commandContributions.self` carries the
  verbs. The rule store is its structural sibling.
- **Settings discipline**: `social.verbosity` declares as `static settings`
  *on the social mixin* (schema-on-owner, `shell-environment.md`), an
  `Enum` over `minimal|standard|verbose`, default `standard` — not on the
  `EnvironmentMixin` substrate.
- **Client push precedent is the style overlay**:
  `HasInteractiveMixin.pushClientStateUpdate(key,value)` →
  `client-state-update` wire message → `services/websocket.ts:402-411` →
  `setLocalClientState`. The settings pane reads a server-pushed projection
  through this exact path. Banner notifications mirror the `ReconnectBanner`
  + store-slice shape (`store/index.ts` prompt slice is the closest queue
  precedent).

---

## Phase 1 — Rule store, shared resolution, and the `notify` verb (the floor)

**Why first / independently shippable:** the floor the requirements name
explicitly ("the build does not ship without `notify`"). Establishes the
value-objects, the per-character store, the `SocialApi`/`SocialLogic`
singleton, and the one shared `ruleFor` primitive that **both** later
consumers call. Fully testable in isolation (controller integration +
`ruleFor` unit tests) with no render or client work.

### Files to create

- **`packages/server/src/mud/lib/social/NotifyRule.ts`** — value objects (no logic):
  ```ts
  export type NameRendering = 'name' | 'feature-string' | 'count-only' | 'hidden';
  export type ConnectSurface = 'banner' | 'log-only' | 'silent';
  export type MessageSurface = 'full' | 'summary' | 'silent';
  export type PaletteToken = 'amber' | 'teal' | 'rose' | 'slate' | /* … */ 'neutral';

  export interface NotifyRule {
    groupRef: GroupRef;             // any GroupRef; bare contacts names normalized to contacts:<me>:<label>
    nameRendering: NameRendering;
    boostInDense: boolean;
    onConnect: ConnectSurface;
    onDisconnect: ConnectSurface;
    onMessage: MessageSurface;
    color: PaletteToken;
  }
  // Reserved baseline identifiers (virtual, not persisted until edited):
  export const RESERVED = { foes:'foes', friends:'friends', everyoneElse:'everyone-else', strangers:'strangers' } as const;
  ```
- **`packages/server/src/mud/lib/social/NotifyPolicy.ts`** — the
  `NotifyPolicyMixin` (ContactsMixin twin), composed on `Character`:
  ```ts
  export interface NotifyPolicy {
    notifyRules(): readonly NotifyRule[];           // stored order
    upsertNotifyRule(rule: NotifyRule): void;       // by groupRef, in place or append-at-tail (just above everyone-else)
    removeNotifyRule(groupRef: GroupRef): boolean;
    reorderNotifyRule(groupRef: GroupRef, anchor: GroupRef, where: 'above'|'below'): boolean;
  }
  static persistentFields = ['_notifyRules'];
  _notifyRules: NotifyRule[] = [];
  static settings: SettingsSchemaEntry[] = [{
    key:'social.verbosity', type:SettingTypes.Enum,
    enumValues:['minimal','standard','verbose'], default:'standard',
    description:'Room-occupant collapse aggressiveness.' }];
  static commandContributions = { self:['social/notify.yaml'], environment:[], inventory:[], peers:[] };
  ```
  Pure storage (no resolution) — the 50-rule soft cap is enforced at
  `notify` set-time, not here, mirroring how Contacts keeps storage dumb.
- **`packages/server/src/mud/api/social.ts`** — `SocialApi` face (thin
  forwarding shell, `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`
  + `SecurityApi.decorateApiClass`). Phase-1 surface:
  ```ts
  static ruleFor(viewer: Stuff, person: Stuff, opts?: { excludeMql?: boolean }): ResolvedRule
  static listRules(viewer: Stuff): NotifyRule[]            // effective list = stored + virtual baseline tail
  static setRule(viewer: Stuff, ref: GroupRef, patch: Partial<NotifyRule>): SetResult
  static removeRule(viewer: Stuff, ref: GroupRef): boolean
  static reorderRule(viewer: Stuff, ref: GroupRef, anchor: GroupRef, where:'above'|'below'): boolean
  static boot(): void                                      // Phase 3 installs the login tap here
  ```
- **`packages/server/src/mud/obj/api/SocialLogic.ts`** — the singleton
  (`extends Idea`, `@Unshadowable`, per-method
  `@CallSecurity(SocialApiCallers)` where
  `SocialApiCallers = SecurityPolicies.FromModule('mud/api/social#SocialApi')`).
  Real logic in module-private free functions (the RenownLogic discipline —
  avoids intra-singleton self-calls tripping the gate). **The load-bearing
  primitive:**
  ```ts
  function ruleForImpl(viewer, person, opts): ResolvedRule {
    const list = effectiveRuleList(viewer);                  // stored rules in order, then baseline tail
    for (const rule of list) {
      if (opts.excludeMql && parseRef(rule.groupRef).source === 'mql') continue;
      if (matchesRule(viewer, person, rule)) return resolved(rule);   // FIRST MATCH WINS
    }
    return resolved(baselineEveryoneElse);                   // tail catch-all
  }
  ```
  `matchesRule` dispatches: reserved `strangers` →
  `!RecognitionApi.recognizes(viewer, person)`; reserved `everyone-else` →
  always true (the tail); `friends`/`foes` →
  `GroupApi.isMember(personPlayerId, 'contacts:<viewerPlayerId>:'+label)`;
  any other ref → `GroupApi.isMember(personPlayerId, rule.groupRef)`.
  `effectiveRuleList` merges the player's stored rules with the **virtual
  reserved baseline** (`foes → friends → …custom… → everyone-else →
  strangers`) — a reserved label only materializes a stored row once the
  player edits it; otherwise it resolves at its baseline position with
  baseline defaults. **Baseline defaults (and a custom rule's neutral
  color) are read from the `AppSettings` keyspace** (deployment defaults —
  `AppApi.setting`, the RenownLogic precedent), never code constants.
- **`packages/server/src/mud/cmd/social/notify.yaml`** — mirror
  `group.yaml`'s structure. Uses `fallthrough: true` (the `chat.yaml`
  pattern) so `notify` (bare list), `notify <ref>` (show), and
  `notify <ref> k=v…` (set) coexist with reserved subcommands. Reserved
  subcommand `remove`; options `--above <ref>` / `--below <ref>`; bare
  `args: [{name:ref,type:string}, {name:assignments,type:string,greedy:true,required:false}]`.
  `validators: [/lib/command/validators/requiresAnimate]`. `<ref>` stays a
  **string** (resolved to a `GroupRef` in the controller — bare `friends`
  → `contacts:<me>:friends`), deliberately *not* `type:object`, because the
  subject is a group ref, not a Stuff.
- **`packages/server/src/mud/obj/command/social/NotifyController.ts`** —
  thin caller (the `GroupController` shape): bare-name→ref normalization;
  parse `k=v` assignments (`login=`, `disconnect=`, `message=`, `render=`,
  `boost=`, `color=`); enforce the **50-rule soft cap** with a friendly
  rejection note; dispatch `--above/--below` to `SocialApi.reorderRule`,
  `remove` to `removeRule`, bare to `listRules`. Every mutation fires prose
  via `MessageApi.scene(...).topic('system.shell.notify')` + a structured
  note, and (Phase 4 hook) `pushClientStateUpdate('social.rules', projection)`.
- **`packages/server/src/mud/seeds/obj/command/social/NotifyController.yaml`** —
  the third leg (`class: /obj/command/social/NotifyController`).

### Wiring
- Compose `NotifyPolicyMixin` into the Avatar base chain at the **same
  site `ContactsMixin` is composed** (the `AetherMixin(ContactsMixin(ShelledCharacter))`
  stack — `obj/Avatar.ts`). Rides every Avatar; NPCs opt in like Contacts.
- `social.verbosity` registers via the schema-on-mixin walk (free —
  `static settings` on the composed mixin).

### Tests (`lib/social/__tests__/`, `obj/command/social/__tests__/`)
- `ruleFor` first-match: multi-match resolves to first in order; reorder a
  `foes` deny above a broad allow → muted; a force-allow above a broad deny
  → surfaced (both directions). **→ AC "strict ordered first-match."**
- `notify <ref> k=v` set/persist/read-back incl. `color`; bare-name
  contacts normalization; `--above`/`--below`; `remove`;
  fall-to-`everyone-else`; 50-cap rejection. **→ AC "notify … sets and persists."**
- Managed-group ref accepted; MQL ref stored but `ruleFor({excludeMql:true})`
  skips it. **→ Phase-3 AC seed.**

---

## Phase 2 — Display-lensing formatter (the per-viewer occupant block)

**Why second:** depends only on Phase 1's `ruleFor` + `RecognitionApi`.
Highest-value, lowest-risk visible feature; exercises the late-bound-fragment
seam before the heavier notification wiring. Independently shippable.

### Files
- **Extend `obj/api/SocialLogic.ts`** with the formatter (sibling of
  `describe`, one cardinality up):
  ```ts
  function renderOccupantsImpl(viewer: Stuff, occupants: Stuff[], roomSize: number): Mml {
    const tier = densityTier(roomSize, verbosityOf(viewer));   // reads social.verbosity
    // 1. partition by ruleFor(viewer, each): boosted (boostInDense) | named-default | collapsible
    // 2. boosted + named → Mml.name(occupant) (composes through describe per-occupant, viewer-late-bound)
    // 3. collapsible strangers → groupBySalient(...) → "12 dwarves in red robes" or "(N others present)"
    return Mml.list([...boostedNames, ...namedDefaults, ...groupedCounts]);
  }
  ```
  - **Density tiers** (`<10`/`10–30`/`30–100`/`>100`) from the requirements
    table; `minimal` shifts one step more aggressive, `verbose` disables
    collapse. `roomSize` = renderable-occupant count.
  - **Similarity grouping** keys the `(species, most-distinctive worn
    feature)` tuple from `RecognitionLogic.salientFeaturesImpl` (exposed via
    `SocialApi`→`RecognitionApi.salientFeatures`); no shared tuple → the
    `(N others present)` bucket.
  - **The collapsed line is a targetable handle**, not a dead string: emit
    it as an MML fragment carrying its **MQL seed** so the four client
    addressability paths work (`look at patrons` / `look at dwarves in red
    robes`). Use the same `<item>`/handle MML the contents list already
    emits, plus a `mudq:`-style query payload the renderer previews on hover
    (`message-rendering.md` custom URI schemes; `mudq:` = the reserved
    inert-but-styled scheme the inspection-pane drill + `mqlMany` upgrade later).
- **`api/social.ts`**: add `static occupantBlock(occupants: Stuff[],
  roomSize: number): { toMml(viewer): Mml }` — the **late-bound wrapper
  object**. Controllers stay thin: they gather occupants and hand the
  wrapper to `Mml.compose`; the per-viewer collapse happens at
  `toString(recipient)`.
- **Modify `obj/command/perception/LookController.ts`** — at the existing
  seam (`:226-247`), replace the eager
  `Mml.list(topLevel.map((item)=>Mml.item(item)))` occupant render with
  `SocialApi.occupantBlock(occupants, roomSize)` interpolated into the body.
  **Keep** the existing `learnIdentity` repeat-perception loop (`:233-237`)
  and keep non-organism loose contents (`ContainmentApi.looseContents`) on
  the plain path — the social block governs *organism* occupants only.
  Single chokepoint; arrival reuses it through `forceCommand('look')`.

### Architectural decisions this phase settles
- **Exact MML fragment shape**: a `Mml.list` of three concatenated segments
  (boosted names, default names, grouped counts), each grouped count an
  inline handle `<item …>` whose hover preview is its `mudq:` MQL seed.
  Reuses the shipped renderer + command-bar-preview contract; no bespoke
  widget (AC "aggregate stays targetable").
- **How the fragment reaches `SocialLogic` at render time**: the
  `{toMml(viewer)}` object closes over `(occupants, roomSize)` only —
  viewer-independent inputs — and calls `occupantBlock`'s logic with the
  late `viewer`. No controller-time viewer binding; future multi-recipient
  enter broadcasts collapse per-recipient for free.
- **Color at the boost seam**: a boosted name carries its rule's `color` as
  an MML attribute (`<player … color="amber">`) that the client theme maps
  via the stylesheet `attribute.color.<token>` selector to a palette
  treatment — the same single per-label attribute reused by the Phase-3
  banner and message restyle. (Alternative: the existing `BucketResolver`
  stuffId→bucket→treatment stub named in `message-rendering.md`; explicit
  `color` attribute is more direct and matches "named token, not hex" —
  note BucketResolver as the fallback if per-stuffId resolution is later wanted.)

### Risks / bounds
- **Reverse-scan cost is *not* incurred here** — display resolves `ruleFor`
  per *visible occupant in one room* (bounded by room size), once per
  render. MQL refs are valid display subjects, evaluated once per render.
- **`describe` purity**: the formatter never mutates belief; composes
  through `describe` (already pure). The `learnIdentity` write stays on the
  controller loop, unchanged.

### Tests (`obj/api/__tests__/SocialLogic.*.test.ts`)
- Tier thresholds render the right mix of named/feature-string/grouped.
  **→ AC density tiers.**
- Similarity grouping renders "N dwarves in red robes" with a shared tuple,
  `(N others present)` otherwise. **→ AC stranger collapse.**
- `social.verbosity` minimal/standard/verbose shifts aggressiveness.
  **→ AC verbosity.**
- Boosted friend lifted above collapse and full-named at every tier;
  `color` attribute present. **→ AC boosted render + color-at-seam.**
- Collapsed line carries an MQL seed and remains resolvable.
  **→ AC "aggregate stays targetable."**

---

## Phase 3 — Notification consumer (login fan-out + message restyle) + client queue

**Why third:** the substantive net-new wiring; reuses the *same* `ruleFor`
(now a second caller, validating "one resolution, two consumers"). Splitting
it after display means the resolution primitive is already battle-tested.

### Server
- **Extend `obj/api/SocialLogic.ts`** with the consumer (the `RenownLogic`
  tap shape):
  ```ts
  private loginSub: Subscription | null = null;
  private logoutSub: Subscription | null = null;
  private rateLimiter = new Map<string, number>();   // `${actorPlayerId}|${viewerId}|${event}` → last-emit ms; in-memory, nothing persisted

  installPresenceTap(): void {                        // idempotent, called from SocialApi.boot()
    if (this.loginSub) return;
    this.loginSub  = EventApi.on(Events.PlayerLoggedIn,  p => relayPresence(p.playerId, 'connect',    this.rateLimiter));
    this.logoutSub = EventApi.on(Events.PlayerLoggedOut, p => relayPresence(p.playerId, 'disconnect', this.rateLimiter));
  }
  ```
  `relayPresence(actorPlayerId, event, limiter)`:
  1. Resolve the acting Avatar; for each online viewer in
     `PlayerApi.getAllAvatars()` (skip the actor):
  2. `rule = ruleForImpl(viewer, actor, { excludeMql: true })` — **MQL refs
     excluded as notification subjects** (`parseRef.source === 'mql'` skipped).
  3. surface = `event==='connect' ? rule.onConnect : rule.onDisconnect`;
     `silent` → skip.
  4. **Privacy gate**: the match came from the viewer's *own* rule list
     under the viewer's identity; `ContactsGroupProvider` is owner-only at
     the provider boundary; fan-out runs as substrate code (no command
     context). Never expose *who policied whom*.
  5. **Rate-limit** per `(actor, viewer, event)` window (in-memory `Map`,
     RenownLogic's `receptionSeen` precedent); within window → drop.
  6. Push the notification **frame**:
     `MessageApi.scene(viewer).topic('world.social.presence').toSelf(body, payload).send()`,
     `body` = the colored banner MML (rule `color` tints it),
     `payload = { kind:'presence', event, actor: refOf(actor), surface, color }`.
     `banner` → client queue; `log-only` → renders quietly inline (same
     frame, client routes by `surface`); `silent` → never sent.
- **Message restyle** — *not a new event*. The contact's message already
  rides the buffer. Expose `styleMessageFor(viewer, speaker, body): Mml` in
  `SocialLogic` that the messaging restyle seam consults — applies
  `ruleFor(viewer, speaker).onMessage` (`full`→highlight MML in rule color,
  `summary`→aggregated count line, `silent`→*notification* suppression
  only, never feed-filtering) and the same `color`. Late-bound per-recipient
  (the `describe`/Scene per-recipient materialization already gives
  per-viewer bodies). Rate-limited via the same limiter keyed
  `(speaker, viewer, 'message')`.
- **`api/social.ts`**: flesh out `boot()` → `logic().installPresenceTap()`.
  **`AppBootstrap.run()`**: add `SocialApi.boot();` after `RenownApi.boot()`
  et al. (`AppBootstrap.ts:178`).
- **`packages/types/src/index.ts`**: add `SocialNotificationPayload`
  (`{ event:'connect'|'disconnect'; actor: StuffRef; surface; color;
  country?: string }`). The `country?` field is the **reserved seam**
  for the deferred connection-origin substrate
  ([connection-origin-slate](../slates/tails/connection-origin-slate.md)):
  left `undefined` in this build; once geo lands, `relayPresence` reads
  `ConnectionApi.originOf(actorPlayerId).country` and the client banner
  renders "from <country>" when present. No other rework.

### Client
- **`packages/client/src/store/index.ts`**: new **notifications slice** (the
  prompt-slice shape): `notifications: SocialNotification[]`,
  `pushNotification`, `dismissNotification(id)`, `clearNotifications()`, TTL
  in the component. Ephemeral; cleared on disconnect alongside `clearPrompts`.
- **`packages/client/src/services/websocket.ts`**: in the `MessageFrame`
  inbound path (near `:463`), recognize `topic === 'world.social.presence'`
  with `payload.surface === 'banner'` → `pushNotification(...)` (queue, not
  terminal buffer); `log-only` → `appendFrame` (quiet inline);
  highlight-class messages already ride the transcript. No new inbound
  *type* — banners ride the existing frame channel, demuxed by topic (like
  chat frames).
- **`packages/client/src/components/frame/NotificationQueue.tsx`**: the
  banner/toast component, sibling of `ReconnectBanner.tsx` — renders the
  queue with the rule `color` token mapped through the theme, a dismiss
  affordance, TTL auto-clear. Mounted in `Frame.tsx` next to `ReconnectBanner`.

### Architectural decisions
- **Rate-limiter**: in-memory `Map<string,number>` keyed
  `(actorPlayerId|viewerId|event)` → last-emit ms; per-source-per-window
  cap; transient (resets on HMR/clear), nothing persisted (RenownLogic
  `receptionSeen` precedent).
- **Reverse-scan bound**: cost `O(online viewers × rules × membership-check)`.
  Bounded because (a) default surface for non-contacts is `silent` (only
  bucketed non-silent rules emit), (b) MQL refs — the expensive live-query
  case — are *excluded* as notification subjects, leaving only roster-lookup
  `isMember`. No persisted reverse index. Note the scale ceiling in the doc;
  a persisted reverse index is the deferred Layer-2 if `getAllAvatars()`
  grows large.
- **Banner vs frame**: banners are MessageFrames (one delivery chokepoint,
  audit/replay for free) demuxed client-side by topic+surface — *not* a
  parallel wire channel (honors messaging.md "Sensors are the only
  recipient type").

### Tests
- A policied-managed-guild member logging in notifies a viewer who policied
  that guild non-silently **with no contacts entry**; an unmatched login
  produces nothing; an MQL ref is rejected as a notification subject
  (accepted for display). Assert on the push frame. **→ AC group-keyed
  notification + MQL rejection.**
- Logout symmetry; rate-limiter suppresses a second emit inside the window.
  **→ AC connect/disconnect relay.**
- Message restyle applies first-match treatment + color, rate-limited,
  asserted on the frame; `silent` suppresses the *notification* but never
  drops the message. **→ AC message restyle.**
- **No movement notification**: enter/leave produces only the plain
  movement line, never a presence frame. **→ AC movement non-goal.**
- Privacy: no frame/command exposes a viewer's rule list or which groups
  they policied; fan-out fires only on groups the viewer may read.
  **→ AC owner privacy.**
- Client: banner-class renders in the new queue and clears on dismiss/TTL;
  highlight-class inline. **→ AC client queue.**

---

## Phase 4 — Settings pane + docs + slate

**Why last:** pure thin-front UI over Phase-1's verb + Phase-3's wire, plus
docs. Descopable (the verb is the floor).

### Client
- **`packages/client/src/components/settings/SocialNotificationsPane.tsx`**
  ("Social / Notifications", from `AccountMenu`): the **ordered rule list as
  drag-to-reorder rows** (order *is* precedence), each row a color swatch, a
  render/verbosity control, connect/disconnect/message toggles, plus an "add
  group" control.
  - **Reads** a server-pushed projection: `NotifyController` calls
    `host.pushClientStateUpdate('social.rules', projection)` on every
    mutation (style-overlay precedent); the pane reads
    `clientState['social.rules']` reactively. Read-only cache — **the rule
    store stays the single source of truth; no second persistence path**
    (writes always go through `notify`).
  - **Every control previews its command** (global contract): hover/drag
    shows the equivalent `notify …` in the command bar; commit issues it.
  - **Drag-reorder → `notify --above/--below`**: dropping X above row Y
    issues `notify <Xref> --above <Yref>`; below → `--below`. The pane
    computes the anchor from the drop neighbor; the server's ordered store
    is authoritative; optimistic local reorder reconciled by the next
    `social.rules` push.
- **Store/types**: add `social.rules` to the `clientState` typed selectors;
  the projection type lands in `@saxonberg/types`.

### Docs
- **`docs/subsystems/social-graph.md`** (new): the display-lensing +
  notification-policy layer — `SocialApi`/`SocialLogic`, the `ruleFor`
  shared primitive, strict-ordered-first-match with positional authority,
  the `NotifyPolicyMixin` store (sibling of `_contacts`), the `notify` verb,
  density tiers + similarity grouping, the login fan-out + rate-limiter +
  reverse-scan bound, MQL-display-vs-notification split, the client queue +
  pane. Cross-link `contacts.md`, `grouping.md`, `belief.md`, `messaging.md`,
  `shell-environment.md`, `client-shell.md`, `inspection-pane.md`, `prompt.md`.
- **Update `docs/slates/builds/social-graph-slate.md`** to mark Wave 3 shipped.

### Tests
- Pane lists ordered rules as drag-to-reorder rows with editable
  color/render/notification controls; each previews its `notify …` on
  hover/drag and issues it on commit; reads from `social.rules` (no second
  persistence path). **→ AC settings pane.**
- Color tints consistently across banner, highlighted message, and boosted
  room render through the theme cascade (named token, not hex), asserted at
  each render seam. **→ AC color consistency.**

---

## Ordering rationale

1. **Store + `ruleFor` + `notify` first** — the resolution primitive is the
   shared dependency of both downstream consumers; building it once, tested
   in isolation, is the spine. Also the named floor.
2. **Display lensing second** — depends only on `ruleFor` + `RecognitionApi`,
   exercises the late-bound-fragment seam at one well-understood chokepoint,
   the headline feature with no client-wire risk.
3. **Notification consumer third** — the heavy net-new wiring; reuses the
   now-proven `ruleFor` as a second caller.
4. **Pane + docs last** — thin front over the verb + wire, descopable, plus
   the graduation doc.

Each phase is independently shippable and testable; the build never lacks
the `notify` floor after Phase 1.

## Cross-cutting constraints — honored

- New module categories: **none.** `SocialApi` + `SocialLogic` +
  value-objects in `lib/social/` + `notify` in the existing `social/`
  command category. No `lib/mixins/`, no free-floating helpers.
- Presentation logic in `SocialLogic`, a late-bound per-viewer sibling of
  `describe` composing through it; controllers are thin callers.
- One `ruleFor(viewer, person)` feeds the render formatter and the login
  fan-out.
- Policy subject any `GroupRef`; strict ordered first-match; storage the
  `NotifyPolicyMixin` per-character store (sibling of `_contacts`), **not**
  the settings keyspace — only `social.verbosity` is a setting.
- Fan-out taps `PlayerLoggedIn/Out`, scans online viewers, tests
  `GroupApi.isMember`, excludes MQL refs as notification subjects, in-memory
  rate-limiter, nothing persisted (RenownLogic precedent), privacy-gated at
  the provider boundary.
- Client: new notification queue (topic + slice + banner) + thin "Social /
  Notifications" pane over `notify`.
- New `docs/subsystems/social-graph.md`; tests colocated in `__tests__/`
  (Vitest).

## Critical files

- `packages/server/src/mud/obj/api/SocialLogic.ts` (new — `ruleFor`, the occupant formatter, the presence tap)
- `packages/server/src/mud/lib/social/NotifyPolicy.ts` (new — the per-character rule store mixin + `social.verbosity` schema)
- `packages/server/src/mud/lib/social/NotifyRule.ts` (new — value objects)
- `packages/server/src/mud/api/social.ts` (new — the `SocialApi` face)
- `packages/server/src/mud/obj/command/perception/LookController.ts` (modify — the occupant-block render seam at the `Mml.list(...)` site)
- `packages/server/src/mud/obj/command/social/NotifyController.ts` + `packages/server/src/mud/cmd/social/notify.yaml` (new — the verb)
- `packages/client/src/services/websocket.ts` + `packages/client/src/store/index.ts` (modify — the notification-queue slice + topic demux)
- `packages/client/src/components/frame/NotificationQueue.tsx` + `packages/client/src/components/settings/SocialNotificationsPane.tsx` (new — client surfaces)

## Cross-references

- [social-graph-requirements.md](../requirements/social-graph-requirements.md) — the closed requirements (source of truth)
- [social-graph-slate.md](../slates/builds/social-graph-slate.md) — Wave 3 seed
- Subsystem docs: contacts, belief, grouping, messaging, message-rendering, shell-environment, client-shell, inspection-pane, prompt
