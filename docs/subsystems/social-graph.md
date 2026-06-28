# Social-graph subsystem (Wave 3 — the attention-management layer)

The layer the [contacts](./contacts.md) bucket *storage* was always a
means to: **attention management**. In a busy social space, recognition
isn't just *who do I know* — it is *whose attention do I spend*. Two
halves, over one shared resolution primitive:

1. **Display lensing** — a per-viewer occupant block when rendering a
   room: friends boosted and full-named, strangers collapsed into
   density-aware, similarity-grouped counts. The "a 200-player tavern
   renders as a manageable scene" thesis.
2. **Notification policy** — per-*group* rules (keyed on any `GroupRef`,
   not just contacts) for what a person's connect / disconnect /
   message surfaces to the player (banner / inline / silent), resolved
   by a strict ordered rule list, rate-limited, and delivered through a
   client notification surface.

Both halves call **one** `SocialApi.ruleFor(viewer, person)` primitive.
The store is a `NotifyPolicyMixin` per-character rule list — the
structural sibling of `_contacts`. The player surface is one dedicated
verb, `notify`, plus a thin client settings pane over it.

Seeded by
[social-graph-slate.md](../slates/builds/social-graph-slate.md);
builds on [contacts.md](./contacts.md),
[grouping.md](./grouping.md) (the `GroupApi`/`GroupRef` policy subject),
[belief.md](./belief.md) (`RecognitionApi.describe` / `salientFeatures`),
[messaging.md](./messaging.md) (the Scene composer),
[message-rendering.md](./message-rendering.md) (the theme palette + MML),
[shell-environment.md](./shell-environment.md) (`social.verbosity`).

## Module layout

| Concept | Home |
|---|---|
| Value objects (`NotifyRule`, surfaces, `PaletteToken`, `RESERVED`) | `lib/social/NotifyRule.ts` |
| Store mixin (`NotifyPolicyMixin`, `social.verbosity` schema) | `lib/social/NotifyPolicy.ts` |
| Gated dev-facing face | `api/social.ts` (`SocialApi`) |
| Hot-reloadable logic singleton | `obj/api/SocialLogic.ts` (`/obj/api/social`) |
| The `notify` verb | `cmd/social/notify.yaml` + `obj/command/social/NotifyController.ts` |
| Client queue + pane | `components/frame/NotificationQueue.tsx`, `components/settings/SocialNotificationsPane.tsx` |

No new module category: `SocialApi`/`SocialLogic` mirror the
`RecognitionApi`/`RecognitionLogic` and `RenownApi`/`RenownLogic`
Api↔logic-singleton split verbatim. All real logic lives in
module-private free functions in `SocialLogic.ts` (the `RenownLogic`
discipline — public-to-public self-calls would trip the `FromModule`
gate); each public method carries
`@CallSecurity(FromModule('mud/api/social#SocialApi'))`.

## The rule store — `NotifyPolicyMixin`

`NotifyPolicyMixin` is composed onto `Character` at the same site as
`ContactsMixin`, so every Avatar carries it natively; NPCs opt in
explicitly. It is **pure storage** — no resolution:

```ts
export interface NotifyPolicy {
  notifyRules(): readonly NotifyRule[];          // stored order
  upsertNotifyRule(rule: NotifyRule): void;      // by groupRef, in place or append
  removeNotifyRule(groupRef: GroupRef): boolean;
  reorderNotifyRule(groupRef, anchor, where: 'above'|'below'): boolean;
}
static persistentFields = ['_notifyRules'];
_notifyRules: NotifyRule[] = [];
```

Persisted as plain JSON via the Hydrator, the `_contacts` precedent
(legacy-tolerant `= []` default). The 50-rule soft cap is **not** here —
it's enforced at `notify` set-time, mirroring how Contacts keeps storage
dumb.

One `NotifyRule` row carries both the display treatment and the
notification surface, plus a single theme-palette `color`:

```ts
interface NotifyRule {
  groupRef: GroupRef;
  nameRendering: 'name' | 'feature-string' | 'count-only' | 'hidden';
  boostInDense: boolean;
  onConnect:    'banner' | 'log-only' | 'silent';
  onDisconnect: 'banner' | 'log-only' | 'silent';
  onMessage:    'full' | 'summary' | 'silent';
  color: PaletteToken;        // a named token, never raw hex
}
```

The **global** `social.verbosity` dial (`minimal` | `standard` |
`verbose`, default `standard`) is the one piece that *is* a setting —
declared as `static settings` **on the mixin** (schema-on-owner, see
[shell-environment.md](./shell-environment.md)), not on the
`EnvironmentMixin` substrate. A dynamic ordered list of arbitrary refs
can't live in a settings keyspace, so the rule list is its own store.

## Policy subject — any `GroupRef`

Policy attaches to a **`GroupRef`** (grouping.md), not a bare contacts
label. The `GroupApi` facade already unifies three group kinds behind
one ref shape — **managed** (`managed:fighter-guild`), **MQL**
(`mql:…`), and **contacts** (`contacts:<pid>:<label>`) — so "notify me of
all Fighter Guild logins" is the *same* mechanism as "boost my friends."
Contacts labels are addressable by bare name at the verb boundary
(`notify friends …` → `contacts:<me>:friends`).

### The reserved baseline (virtual until edited)

Four reserved identifiers seed a sensible default order without any
stored rows:

```
foes  →  friends  →  …custom…  →  strangers  →  everyone-else
```

`foes`/`friends` normalize to `contacts:<me>:<id>`; `everyone-else` and
`strangers` are **bare pseudo-subjects** (not `GroupApi` refs).
`effectiveRuleList(viewer)` splices the player's stored rules into this
baseline: a reserved label only **materializes** a stored row once the
player edits or reorders it; otherwise it resolves at its baseline
position with baseline defaults. Baseline field defaults and a custom
rule's neutral color are read from the **`AppSettings`** keyspace
(`social.baselineRules` / `social.defaultColor`), with a code-side
literal fallback for pre-warm reads — never code constants
(the `RenownLogic.receptionWindowS` precedent). `strangers` precedes the
always-true `everyone-else` catch-all so an *unrecognized* person
resolves to `strangers` and a recognized one falls to `everyone-else`.

## The shared primitive — `ruleFor`, strict ordered first-match

```ts
SocialApi.ruleFor(viewer, person, { excludeMql? }): Promise<ResolvedRule>
```

Walks the effective list top-to-bottom and returns the **first** rule
whose group contains the person — allow or deny, full stop.
`matchesRule` dispatches: `strangers` → `!RecognitionApi.recognizes`;
`everyone-else` → always true (the tail); any other ref →
`GroupApi.isMember(personDurableId, ref)` (covers the normalized
`friends`/`foes` contacts refs, managed groups, and MQL). The person's
durable key is `playerId` for an Avatar, else `templatePath` (NPCs).

**Authority is positional** — list order *is* the precedence. A `foes`
deny placed *above* a broad allow mutes that person regardless; a
force-allow above a broad mute always fires. There is no priority
integer and no lock flag. This single walk replaces both prior conflict
rules ("max salience," "lowest priority wins").

`ruleFor` feeds **two** consumers — the display formatter and the login
fan-out — and neither reimplements it. That "one resolution, two
consumers" contract is the spine of the build.

## Display lensing — the per-viewer occupant block

`SocialApi.composeOccupants(viewer, occupants, roomSize): Promise<Mml>`
is the formatter — a sibling of `RecognitionApi.describe` *one
cardinality up*: `describe` names one target viewer-aware; the formatter
orders / groups / collapses a *collection* and composes **through**
`describe` per named occupant (never re-implements naming).
`LookController.lookAtLocation` calls it at the single existing
`Mml.list(...)` occupant seam, so both `look` and arrival (which reuses
`look` via `forceCommand`) route through one chokepoint; non-organism
loose contents stay on the plain `ContainmentApi.looseContents` path.

### Density tiers + verbosity

`roomSize` (renderable-organism count) drives the four-tier table; the
viewer's `social.verbosity` modulates it (`minimal` shifts one tier more
aggressive, `verbose` disables collapse via a `-1` level):

- **`<10`** — every occupant rendered fully.
- **`10–30`** — `everyone-else` named; `strangers` as feature-strings.
- **`30–100`** — `strangers` aggregated to similarity-grouped counts;
  `everyone-else` named; `boostInDense` rules lifted above.
- **`>100`** — only boosted rules named; the rest as grouped counts /
  `(N others present)`.

A `boostInDense` occupant is always lifted and full-named (carrying its
rule's `color` as an MML `<name … color="amber">` attribute the client
theme maps via the stylesheet cascade); a `hidden`-render rule is
dropped.

### Similarity grouping

Collapsible occupants group by the tuple **(species, most-distinctive
worn feature)** — species via `OrganismMixin.getSpecies`, the worn
feature parsed out of `RecognitionApi.salientFeatures` (compose *through*
the shipped primitive, never re-derive). A group needs a shared tuple
**and** ≥2 members to read as a count line ("12 dwarves in red robes");
lone occupants and incomplete tuples fall to the generic "(N others
present)" bucket.

### The aggregate stays targetable

A collapsed line is **not** a dead string: it's a `mudq:` MML `<link>`
handle carrying its room-scope MQL seed (`dwarves in red robes` /
`others`), so the four client addressability paths
([client-shell.md](./client-shell.md) hover→command-bar preview,
expand-on-pull, the [inspection-pane](./inspection-pane.md) drill-in
roster, and the [prompt.md](./prompt.md) `mqlMany` verb-time pick-list)
have something to resolve. Collapse is a display lens, never a targeting
wall; ordinals / feature-filters / post-`look` pronoun memory all still
resolve against the live room scope. `mudq:` is inert-but-painted in v1;
the live click/preview wiring is the deferred seam.

Cost is bounded — display resolves `ruleFor` once per *visible occupant
in one room* (room-size bounded), once per render; MQL refs are valid
display subjects, evaluated once per render.

## Notification policy — the login fan-out

`Events.PlayerLoggedIn` / `PlayerLoggedOut` are emitted today but had
**no buffer-relay consumer** — nothing turned them into a player-facing
notification. This build supplies it. `SocialApi.boot()` (wired from
`AppBootstrap.run()` after `RenownApi.boot()`) installs an idempotent
presence tap on `SocialLogic` (the `RenownLogic` tap shape). On a
login/logout, `relayPresence`:

1. Resolves the acting Avatar; scans every online viewer
   (`PlayerApi.getAllAvatars()`, skipping the actor).
2. `ruleFor(viewer, actor, { excludeMql: true })` — first match.
3. `surface = event === 'connect' ? rule.onConnect : rule.onDisconnect`;
   `silent` → skip.
4. **Rate-limit** per `(actor, viewer, event)` via an in-memory
   `Map<string, number>` window (60 s; transient, nothing persisted —
   the `RenownLogic.receptionSeen` precedent; cadence is mechanism, so a
   code constant rather than an AppSettings dial). A flapping connection
   is dropped within the window.
5. Pushes a `world.social.presence` frame:
   `MessageApi.scene(viewer).topic(...).toSelf(body, payload).send()`,
   the banner line viewer-aware (`Mml.name`), the `color` riding the
   payload.

This is **global presence** — surfaced wherever the viewer is — and is
the only substantive new wiring. **Room movement is not a notification
event**: enter/leave stays the existing ungated movement line, with no
per-bucket knob.

### Bounds + privacy

Cost is `O(online viewers × rules × isMember)`. It's bounded because (a)
the default surface for non-contacts is `silent` (only bucketed
non-silent rules emit), and (b) **MQL refs are excluded as notification
subjects** (`excludeMql` skips `parseRef.source === 'mql'`) — a live
membership query per login is the expensive case; MQL refs stay valid
*display* subjects. No persisted reverse index; a persisted reverse index
is the deferred Layer-2 if `getAllAvatars()` grows large.

The fan-out runs as **substrate code** (no command context): the match
comes from the *viewer's own* rule list under the viewer's identity, and
the pushed frame carries only the actor ref / surface / color — never the
rule list or who-policied-whom. This matches the owner-only
`ContactsGroupProvider` boundary; policying a group never leaks the
viewer's rules to its members or to third parties.

### The MQL display-vs-notification split

| Ref kind | Display subject | Notification subject |
|---|---|---|
| `contacts:` / `managed:` | yes | yes (cheap roster lookup) |
| `mql:` | yes (once per render) | **no** (excluded — too costly per login) |

## The `notify` verb

The attention-rule list is owned by a **new dedicated verb** — *not*
`contacts` (your private lists) and *not* `group` (managed-group admin).
A `notify` rule is your **private lens over any group**, owner-private
like contacts but with an arbitrary `GroupRef` subject.

```
notify                          # list your ordered rules + a compact summary
notify <ref>                    # show one rule
notify <ref> k=v [k=v…]         # set fields: login= disconnect= message=
                                #   render= boost= color=
notify <ref> --above <ref>      # reorder above another (order = precedence)
notify <ref> --below <ref>      # reorder below another
notify <ref> remove             # drop the rule (group falls to the tail)
```

`NotifyController` is a thin caller: it normalizes the typed `<ref>`
(bare label → `contacts:<me>:<label>`; refs containing `:` and the bare
pseudo-subjects pass through), parses the `k=v` assignments, enforces the
**50-rule soft cap** at set-time with a friendly rejection, and dispatches
to `SocialApi.{setRule,removeRule,reorderRule,listRules}`. A `silent`
surface *is* the mute, so allow and deny share the verb. The global
verbosity dial stays the settings verb
(`settings set social.verbosity standard|minimal|verbose`).

## Client surfaces

### The notification queue

Banner-class presence frames ride the ordinary `MessageFrame` channel
(no new wire type), demuxed client-side by `topic ===
'world.social.presence'` + `payload.surface`. `surface: 'banner'` →
`pushNotification` into the **`notifications`** store slice (the
prompt-stack shape: ephemeral, idempotent on `id`, cleared on disconnect);
`'log-only'` → the normal quiet inline frame append; `'silent'` is never
sent. `NotificationQueue.tsx` (sibling of `ReconnectBanner`) renders the
queue as a dismissable toast stack, each tinted by its rule `color`
mapped through `tokens.palette` (named token, not hex — the same palette
the boosted room name and the message highlight use, so a theme swap
re-tints every social highlight in one edit).

### The settings pane

`SocialNotificationsPane.tsx` ("Social / Notifications", reachable from
the `AccountMenu`, toggled via a `socialPaneOpen` store flag) is a **thin
front over `notify`**:

- **Reads** the server-pushed `clientState['social.rules']` projection
  (`SocialRulesState` in `@saxonberg/types`) reactively. After every
  mutation — and on a bare `notify` list — `NotifyController` calls
  `host.pushClientStateUpdate('social.rules', projection)` (the
  style-overlay precedent; skipped for an NPC host with no connected
  Interactive). `social.rules` is **not** a persisted client-state key —
  a pure push cache. The rule store stays the single source of truth; the
  pane never writes it directly. On mount with no cached projection the
  pane issues a bare `notify` to request one.
- **Every control previews its command** (the global "buttons preview
  their command in the command bar" contract): hovering a control
  previews the equivalent `notify …` via `onCommandPreview`, and
  committing issues it via `onCommandClick` — the same path the command
  bar uses. Controls are option buttons + color swatches (one command per
  button), so the contract is exact and testable.
- **Reorder is up/down buttons** (order = precedence): "up" issues
  `notify <ref> --above <prev>`, "down" issues `notify <ref> --below
  <next>`. Drag-to-reorder is the ideal, but fiddly in this stack and an
  extra dependency; the up/down buttons issue the same `--above`/`--below`
  and the server's ordered store is authoritative, so the projection's
  next push reconciles the order.
- An "add group" input resolves a typed ref to a default rule
  (`notify <ref> render=name`, a default-preserving create), and a global
  `social.verbosity` control issues the `settings set` command.

## Two flagged deferrals

1. **Message-restyle live wiring (Phase 3b).**
   `SocialApi.styleMessageFor(viewer, speaker, body)` is implemented and
   unit-tested — it applies the first-match `onMessage` surface (`full` /
   `summary` → highlight in the rule color, `silent` → notification
   suppression only, **never** feed-filtering) and is late-bound
   per-recipient. But it is **not yet consulted by the live message
   path**. The clean per-recipient seam (`SensorMixin.onMessage` is a
   framework template method; the speech producers compose one
   multi-recipient `Scene`) would need a sync contacts-fast-path to clear
   the multi-recipient `async ruleFor` wall — deferred rather than forced
   here. `summary` currently renders like `full` (no clean per-recipient
   aggregation hook yet). A future `filterMessage`-shadow or late-bound
   producer-side wrapper calls `styleMessageFor` at the compose seam.

2. **The reserved `country?` geo seam.** The
   `SocialNotificationPayload.country?` field is left `undefined` in this
   build. Once the connection-origin substrate lands
   ([connection-origin-slate](../slates/tails/connection-origin-slate.md)),
   `relayPresence` reads `ConnectionApi.originOf(actor).country` and the
   banner gains "from <country>" with no rework here. Capturing the IP,
   the geo lookup, and the country/IP privilege split are all out of
   scope.

## Non-goals (this build)

- **Message filtering / moderation** — a `foes` policy governs display
  de-emphasis + notification suppression only; dropping speech from a
  feed is a comms concern (comms-slate).
- **Mutual / consent friending** — bucketing stays unilateral + private.
- **`onProximity` / `onActivity` / movement notifications** — v1 covers
  connect / disconnect / message.
- **MQL refs as notification subjects** — display only.
- **Raw / custom highlight colors** — named theme-palette tokens only.
- **Account-level bucket federation across characters** — per-character
  v1 (Wave 4).

## Related

- [contacts.md](./contacts.md) — the bucket storage substrate
  (`ContactsMixin`, `_contacts`) the rule store is a sibling of; the
  `contacts:<pid>:<label>` ref the reserved `friends`/`foes` normalize to.
- [grouping.md](./grouping.md) — the `GroupApi` facade + `GroupRef` shape
  (the policy subject) + the owner-only `ContactsGroupProvider` boundary.
- [belief.md](./belief.md) — `RecognitionApi.describe` / `salientFeatures`
  (the compose-through primitives).
- [messaging.md](./messaging.md) — the Scene composer + sensor routing the
  presence frame rides; [message-rendering.md](./message-rendering.md) —
  the theme palette + MML the `color` token resolves through.
- [shell-environment.md](./shell-environment.md) — the `social.verbosity`
  settings keyspace; [app-settings.md](./app-settings.md) — the
  deployment-default baseline-rule seeds.
- [client-shell.md](./client-shell.md) — the `ReconnectBanner` / frame /
  store pattern the notification queue extends + the command-bar preview
  contract; [inspection-pane.md](./inspection-pane.md) — the drill-in
  roster; [prompt.md](./prompt.md) — `mqlMany` verb-time disambiguation.
- [social-graph-slate.md](../slates/builds/social-graph-slate.md) — the
  seeding slate (Wave 3 shipped here).
