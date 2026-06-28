# Social graph (Wave 3) — the attention-management layer — requirements

The social-graph subsystem's first slice — the **bucket storage**
substrate (per-Avatar named lists of durable identifiers) — already
shipped as `ContactsMixin` (see
[contacts.md](../subsystems/contacts.md)). This build delivers the
layer that storage was always a means to: **attention management**. In
a busy social space, recognition isn't just "who do I know" — it is
*whose attention do I spend*. Strangers go more ambiguous in a crowded
room so the people who matter stand out, and the people who matter
announce themselves when they arrive. Concretely, two halves over the
shipped Contacts buckets:

1. **Display lensing** — bucket-keyed verbosity when rendering a room's
   occupants: friends boosted and full-named, strangers collapsed into
   density-aware, similarity-grouped counts. The "a 200-player tavern
   renders as a manageable scene" thesis.
2. **Notification policy** — per-*group* rules (keyed on any `GroupRef`,
   not just contacts) for what a person's connect / disconnect /
   message surfaces to the player (banner / highlight / summary /
   silent), resolved by a strict ordered rule list, rate-limited,
   delivered through a new client notification surface.

Seeded by
[social-graph-slate.md](../slates/builds/social-graph-slate.md) (Wave 3);
builds on [contacts.md](../subsystems/contacts.md),
[belief.md](../subsystems/belief.md) (`RecognitionApi.describe`),
[messaging.md](../subsystems/messaging.md) (the Scene composer),
[shell-environment.md](../subsystems/shell-environment.md) (`social.*`
settings keyspace).

## Goals

- **Room occupants render with bucket-keyed verbosity.** A viewer
  looking at / entering a location sees their friends named and
  boosted to the top, mid-priority labels named, and low-priority /
  stranger occupants collapsed according to the room's density.
- **Stranger collapse is similarity-grouped, not generic.** Dense-room
  aggregation reads salient features and renders "12 dwarves in red
  robes," falling back to "(N others present)" only when occupants
  don't share a groupable feature. The aggregate remains
  MQL-targetable (`look at patrons`, `talk to mead-merchant`).
- **Verbosity is player-tunable.** A global `social.verbosity`
  (`minimal` | `standard` | `verbose`) setting shifts the density
  thresholds; `standard` is the density-aware default, `verbose` names
  everyone, `minimal` aggregates aggressively even at low density.
- **Policy attaches to any group, not just contacts.** A viewer's
  display + notification rules are keyed on `GroupRef` — a managed group
  (a guild), a contacts label, an MQL query — through the `GroupApi`
  facade. "Notify me of all Fighter Guild logins" is the *same*
  mechanism as "boost my friends"; contacts labels are simply one kind
  of subject. A reserved baseline (`friends`, `foes`, `everyone-else`,
  `strangers`) ships sensible defaults; any group's rule is authorable
  (name-rendering, boost-in-dense, color, per-event notification
  surface).
- **Conflicts resolve by a strict ordered rule list.** When a person
  matches several of the viewer's rules, the **first match down the
  viewer's ordered list wins outright** (allow or deny); a broad
  default sits last. Ordering a rule *above* the broad allow is how it
  is made authoritative / un-overridable (e.g. a `foes` deny placed
  above an all-logins allow mutes that person regardless).
- **People in a policied group produce notifications on connect /
  disconnect / message.** When someone matching a viewer's rule comes
  online, goes offline, or messages the viewer, the viewer is notified
  at the surface their first-matching rule specifies, subject to
  rate-limiting. The connect/disconnect relay is **net-new** — the
  login/logout events exist on the bus today but nothing relays them to
  any player; this build supplies that consumer. Message rides the
  existing buffered message, restyled per policy. **Room movement is
  not a notification event** (see non-goals).
- **Each label can carry a highlight color, applied consistently.** A
  label's color (a theme-palette token, legible across themes) tints
  its highlight wherever it surfaces — the connect/disconnect banner, a
  highlighted message, the boosted name in a room.
- **Notification & display settings are player-managed through one
  surface.** A new dedicated `notify` verb is the source of truth (not
  `contacts`, not `group` — see *Managing settings*); a client settings
  pane is a thin front over it (each control previews/issues the
  equivalent command), so a player views, edits, and reorders every
  rule in one place.
- **A client notification surface exists.** Banner-class notifications
  render in a new ephemeral, dismissable client queue (today only
  `ReconnectBanner` exists); highlight-class render inline with
  prominent markup.
- **Owner privacy is preserved.** Bucket membership and policies are
  the bucketer's private state; this build adds reverse lookups and a
  notification fan-out without ever leaking *who has bucketed whom* to
  the bucketed party or to third parties.

## Non-goals

- **Message filtering / moderation (feed censorship).** A `foes` /
  `ignore` policy here governs *display de-emphasis* and *notification
  suppression* only. Actually dropping a blocked player's speech from
  your feed is a comms concern — deferred to
  [comms-slate](../slates/tails/comms-slate.md).
- **Mutual / consent friending.** Bucketing stays unilateral and
  private (the shipped Contacts model). Accept-required friending is
  deferred to the recognition-family build.
- **Recognition gating of `contacts add`** ("you can't bucket a
  stranger") and **offline/encounter-memory targeting** — remain
  deferred per [contacts.md](../subsystems/contacts.md).
- **Account-level bucket federation across a player's characters** —
  per-character v1; deferred to Wave 4 of the slate.
- **`onProximity` / `onActivity` notification surfaces.** v1 covers
  connect/disconnect and message. "Notable activity" notifications need
  an activity-salience notion that doesn't exist yet — deferred.
- **Movement-based notifications (enter *and* leave).** Room movement
  is not a notification event; it stays the existing ungated movement
  line, with no per-bucket policy knob (see *Notification policy
  fields*).
- **Remote per-room presence tracking.** Knowing *which room* a contact
  is in while you're elsewhere (a presence feed) is out of scope.
  Connect/disconnect gives global online/offline; that is the only
  presence axis.
- **Geographic origin of a connection.** Surfacing *where* a contact is
  connecting from (country, IP) is a separate connection-origin
  substrate — see
  [connection-origin-slate](../slates/tails/connection-origin-slate.md).
  This build only **reserves the seam**: the presence-notification
  payload carries an optional `country?: string`, populated from
  `ConnectionApi.originOf` once that substrate lands, so the connect
  banner gains "from <country>" with no rework here. Capturing the IP,
  the geo lookup, and the country/IP privilege split are all out of
  scope for this build.
- **Raw / arbitrary highlight colors.** Label colors are named
  theme-palette tokens only; free-form hex (and a custom palette
  editor) is deferred so highlights stay theme-legible.
- **MQL-query refs as *notification* subjects.** A live
  membership query per login is too costly for v1; notification rules
  accept managed-group and contacts refs only. MQL refs remain valid
  *display* subjects (evaluated once per room render). Deferred.
- **Server-defined institutional buckets** (faculty/students/staff as
  admin-pushed labels) — out of band for v1.
- **A new persistence model for buckets.** Reuses the shipped
  `ContactsMixin` storage; policies persist per-character alongside it.

## Surface decisions

### Policy subject — any `GroupRef`

Policy attaches to a **`GroupRef`**, not a bare contacts label. The
`GroupApi` facade (grouping.md) already unifies three group kinds
behind one ref shape — **managed** groups (`managed:fighter-guild`),
**MQL** queries, and **contacts** labels (`contacts:<pid>:<label>`) —
so a single mechanism covers "all Fighter Guild logins,"
"my friends," and "anyone matching this query." Contacts labels are
one kind of subject, already valid refs, so they fold in unchanged.
(MQL-query refs as *notification* subjects are deferred for cost — see
Constraints; they remain valid for display.)

### Policy resolution — strict ordered first-match

A viewer holds an **ordered list of group rules**. To resolve a person
against it (for a notification *or* a room render), walk the list
top-to-bottom and take the **first rule whose group contains that
person** — its surface/treatment decides, allow or deny, full stop. A
broad default rule (`everyone-else`, and `strangers` for the
unrecognized) sits at the tail. This replaces both prior conflict
rules ("max salience," "lowest priority wins") with one predictable
walk. **Authority is positional:** a rule placed *above* a broad allow
can't be overridden by it — a `foes` deny above an all-logins allow
mutes that person; a `family` force-allow above a broad mute always
fires. No separate priority integer or lock flag — list order *is* the
precedence.

The **reserved baseline** seeds a sensible default order — `foes`
(deny-ish: de-emphasized in render, notifications suppressed) →
`friends` (boost, full name, all notifications) → … custom groups … →
`everyone-else` (the fallback) → `strangers` (unrecognized,
feature-string/count by density). A new custom group inserts just above
`everyone-else` until the player reorders it.

*Storage:* the **global** `social.verbosity` dial lives in the
`EnvironmentMixin` `social.*` settings keyspace (static schema). The
**ordered rule list** is a structured per-character store (a sibling of
`_contacts`), each entry `{ groupRef, display fields, notification
fields, color }` in list order — a settings schema can't hold a dynamic
ordered list of arbitrary refs, so it's a dedicated store the `notify`
verb + `SocialApi` own.

### Display policy fields

Per rule: `nameRendering` (`name` | `feature-string` | `count-only` |
`hidden`), `boostInDense` (surface even when the room is noisy), and
`color` (a theme-palette token — see *Highlight color* — tinting the
rule's boost decoration, shared with its notification rendering). There
is **no `priority` integer** — when a person matches several rules, the
**first rule in list order** wins (see *Policy resolution*); the room
render uses that rule's display fields.

### Notification policy fields

Per rule, per event: `onConnect`/`onDisconnect`
(`banner`|`log-only`|`silent`) and `onMessage`
(`full`|`summary`|`silent` — a *notification* surface, never
feed-filtering). When a person matches several rules, the **first rule
in list order** decides the surface (allow or deny), and that same
rule's `color` (see *Highlight color*) tints the render — no salience
combine.

**All movement-based notifications are omitted.** Room enter *and*
leave are not notification events. Movement stays the existing ungated
in-world movement line ("X walks in from the south" / "X leaves
north"), already delivered to a room's occupants by the
movement-message system. There is no per-bucket movement knob: in-room
churn is something the co-present viewer can already see, and the only
motive for a silence toggle is a high-traffic room a player doesn't
linger in. Presence that matters when you're *not* co-present — a
contact coming online or going offline — keeps its `onConnect` /
`onDisconnect` surface; in-room movement does not (resolves slate
open-Q 1 by removing the question).

### Event sources — net-new relay vs. restyling

The two notification events differ in implementation weight:

- **connect / disconnect — net-new relay.** `Events.PlayerLoggedIn` /
  `PlayerLoggedOut` are emitted today but have **no buffer-relay
  consumer** — nothing turns them into a player-facing notification.
  This build delivers that missing consumer: a `SocialLogic` subscriber
  that, on login/logout, resolves which online viewers have a rule
  whose group contains the acting player and whose first-match surface
  is non-silent, and pushes the notification frame. This is **global
  presence** — surfaced wherever the viewer is — and is the substantive
  new wiring.
- **message — restyling.** A contact's message is already in the
  buffer; this build only applies highlight/summary treatment (and the
  label color) per policy.

Because the default policy is `silent` for non-contacts, neither is a
firehose — only bucketed contacts with a non-silent surface emit
anything, which also bounds the connect/disconnect online-scan fan-out.

### Highlight color

Each label carries one `color`, drawn from a **named theme palette**
(e.g. `amber`, `teal`, `rose`) rather than raw hex, so the highlight
resolves through the existing theme/overlay cascade and stays legible
under any theme. The color is a single per-label attribute applied
wherever that label's highlight surfaces: the connect/disconnect
notification, a highlighted message, and the boosted name in a room
render. Implemented as an MML semantic-tag attribute the client theme
maps to a concrete color; no per-call styling. Reserved labels ship
with distinct defaults (`friends` warm, `foes` muted/red); a custom
label inherits a neutral default until set.

### Managing settings — the `notify` verb

The attention-rule list is owned by a **new dedicated verb, `notify`**
— *not* `contacts` (which manages your private lists) and *not* `group`
(which administers managed groups as objects: `group make` / `add` /
`role`). Those are the wrong homes: a `notify` rule is your **private
lens over any group** — a guild you're not in, an MQL query, a contacts
label — owner-private like contacts but with an arbitrary `GroupRef`
subject. There is exactly one surface; no `contacts policy` alias.

```
notify                          # list your ordered rule list + a compact summary
notify <ref>                    # show one rule
notify <ref> k=v [k=v…]         # set fields (login=banner message=summary
                                #   render=name boost=on color=amber)
notify <ref> --above <ref>      # reorder: place this rule above another (order = precedence)
notify <ref> --below <ref>      # reorder: place below another
notify <ref> remove             # drop the rule (group falls to the default tail)
```

`<ref>` is any `GroupRef` — `managed:fighter-guild`, an MQL query, or a
contacts label by **bare name** (`notify friends …` resolves to the
viewer's `contacts:<me>:friends`). A `silent` surface *is* the mute, so
allow and deny share the verb (`notify exes login=silent --above
all-logins` is the un-overridable mute). The global verbosity dial
stays the existing settings verb
(`set social.verbosity = standard|minimal|verbose`).

The **client settings pane** ("Social / Notifications", reachable from
the account menu) is a **thin front over `notify`**: the ordered rule
list renders as **drag-to-reorder rows** (order *is* precedence), each
with a color swatch, a render/verbosity control, and connect /
disconnect / message toggles; an "add group" control resolves a group
to a rule. Per the global "every control previews its command" rule,
hovering or dragging a control previews the equivalent `notify …`
command in the command bar and committing issues it; the pane reads
current state from the same `SocialApi` the verb writes. No second
persistence path. *(If the pane is descoped, the `notify` verb is the
floor — the build does not ship without it.)*

### Density tiers

The room's renderable-occupant count drives verbosity for occupants
matched only by the broad-default tail (`everyone-else` / `strangers`),
modulated by `social.verbosity`. Occupants matched by a `boostInDense`
rule (e.g. `friends`, a policied guild) are lifted above the collapse
at every tier:

- **`<10`** — every occupant rendered fully.
- **`10–30`** — `everyone-else` named; `strangers` as feature-strings.
- **`30–100`** — `strangers` aggregated to similarity-grouped counts;
  `everyone-else` named; boosted rules lifted above.
- **`>100`** — only boosted rules named; the rest as grouped counts /
  `(N others present)`.

`minimal` shifts every tier one step more aggressive; `verbose`
disables collapse entirely.

### Similarity grouping

Strangers/aggregated occupants group by the tuple **(species,
most-distinctive worn feature)** drawn from
`RecognitionLogic.salientFeaturesImpl` — author-friendly and already
computed. Occupants with no shared groupable feature fall to a generic
`(N others present)` bucket (resolves slate open-Q 4).

### Client interaction — drilling into collapsed occupants

The governing principle: **collapse is a display lens, never a
targeting wall.** Collapsing hides names from the *transcript*; it must
never make an occupant unaddressable. A single gesture — or an MQL
query — always restores full addressability. The collapsed line is a
first-class targetable handle, not a dead string. Four addressability
paths, each reusing a shipped client surface:

1. **Hover → command-bar preview** (the global "every clickable
   previews its command" contract). A collapsed line is an MML handle
   bound to its MQL seed; hovering `(35 other patrons present)`
   previews `look at patrons`, hovering `12 dwarves in red robes`
   previews `look at dwarves in red robes`. The collapse teaches the
   query that reaches it.
2. **Expand-on-pull** (mirrors the reactions aggregation precedent —
   familiar-biased sample + pull-to-reveal). The line carries a small
   inline sample and a pull affordance that unfolds a few more *in
   place* — a quick peek without leaving the transcript.
3. **Drill → the inspection pane.** Clicking the group handle opens the
   cardinality-many body of the inspection pane as a **live roster**
   (MQL-subscription-backed), each member rendered via
   `RecognitionApi.describe` and itself a target handle. Keeps the
   transcript clean while giving a full scannable list on demand.
4. **Verb-time `mqlMany` prompt.** When a verb's target resolves to a
   collapsed group, `PromptApi.mqlMany` raises the same roster as a
   numbered pick-list, each choice previewing `<verb> #N`.

Because targeting is MQL underneath, the player can also type past the
collapse entirely — ordinals, feature filters, and post-`look` pronoun
memory all resolve against the live room scope (`the 3rd dwarf`, `the
dwarf with the scar`). Both the inline **pull** (quick peek) and the
inspection-pane **drill** (act-on-one) ship — they serve distinct
intents and both reuse existing patterns; inline-expand-only is
rejected because re-cluttering the transcript fights the feature's
reason for existing.

### Resolved slate leans (recorded, not re-litigated)

- **Bucket storage shape** (open-Q 2) — already settled by shipped
  Contacts: multi-membership via multiple labelled entries; no
  single-bucket record field.
- **Default for recognized, non-bucketed actors** (open-Q 6) —
  `everyone-else`.
- **Bucket events to the target** (open-Q 7) — none; buckets are the
  bucketer's private state.
- **Max user-defined rules** (open-Q 8) — soft cap 50, enforced at
  `notify` set time with a friendly rejection.
- **Server-defined institutional buckets** (open-Q 9) — out of band.
- **Notification-channel routing** (open-Q 10) — `banner` → the new
  client notification queue; `highlight` → inline prominent MML in the
  main transcript; `summary` → an aggregated count line; `log-only` →
  rendered quietly inline, no banner (no separate activity-log surface
  in v1); `silent` → not surfaced.
- **Cross-character sharing** (open-Q 5) — per-character v1.

## Constraints

- **Module taxonomy.** The new logic is a single subsystem concept and
  lands in the existing `lib/social/` home. The dev-facing surface is a
  new gated **`SocialApi`** (`api/social.ts`) backed by a **`SocialLogic`**
  singleton (`obj/api/SocialLogic.ts`) per the Api ↔ logic-singleton
  split; the display/notification policy value-objects live in
  `lib/social/`. The new `notify` verb is an ordinary command — YAML
  view in `mud/cmd/social/notify.yaml` + a controller in
  `mud/obj/command/social/NotifyController.ts` (the `group`/`contacts`
  verbs' category), afforded per-character (the rule store rides a
  mixin on `Character`, the `ContactsMixin` precedent). **No new
  free-floating helpers, no `lib/mixins/`-style dirs, no new module
  category** — if something doesn't fit, stop and raise it (per
  CLAUDE.md).
- **Presentation logic lives below the controllers, in `SocialLogic`.**
  Grouping / ordering / density-collapse is **not** controller code. It
  lives in `SocialLogic` (behind the gated `SocialApi`), a **sibling of
  `RecognitionApi.describe` one cardinality up**: `describe` names *one*
  target viewer-aware; the social formatter orders/groups/collapses a
  *collection* and calls `describe` per named occupant (composes
  *through* it, never re-implements naming). Two reasons it can't sit on
  a controller: (1) it's reused across render sites (look, arrival, the
  inspection-pane roster) — one shared formatter, many callers; (2) it
  is **per-viewer and late-bound** — a multi-recipient scene collapses
  differently for each viewer, so the occupant block must be a late-bound
  MML fragment resolved at `toString(viewer)` time (the `describe`
  pattern), not an eager controller-time string.
- **One shared resolution feeds both consumers.** The first-match
  `notify`-rule resolution — "given viewer + person, the first matching
  rule" — is a single `SocialLogic` primitive (`ruleFor(viewer,
  person)`) used by **both** the render formatter (display treatment)
  and the login-notification fan-out (notification surface). Neither
  consumer reimplements it; the controller and the event-consumer are
  thin callers.
- **Inject at the existing render seam, don't fork it.** The occupant
  list rendered in `LookController.lookAtLocation` (today a bare
  `Mml.list(...)`) becomes a thin call into the `SocialApi` formatter;
  the arrival/enter path calls the same formatter. The formatter is the
  **single chokepoint** so future render sites reuse it. v1 wires the
  known sites explicitly (controllers gather occupants and invoke);
  weaving it into the Scene composer so *every* occupant render routes
  through it automatically is the heavier alternative, deferred.
- **Notification fan-out is reverse-keyed, group-general, and
  bounded.** The connect/disconnect consumer subscribes to
  `Events.PlayerLoggedIn` / `PlayerLoggedOut` (no consumer today). On a
  login, v1 scans online viewers and, for each, walks their ordered
  rule list testing membership via `GroupApi.isMember(actor, ruleRef)`,
  taking the first match — cost `O(online viewers × rules ×
  membership-check)`, acceptable at current scale, no persisted reverse
  index. Membership checks are cheap for managed/contacts refs (roster
  lookup); **MQL-query refs are excluded as notification subjects in
  v1** because a live query per login is the expensive case (they stay
  valid for *display*, evaluated once per room render — see non-goals).
  The scan and the rate-limiter state are **in-memory, nothing
  persisted** (the reactions-registry precedent); rate-limiting caps
  per-source-per-window.
- **Privacy gate holds.** Reverse lookups and fan-out run as substrate
  code (no command context) and must not expose one player's rules to
  another, matching the existing `ContactsGroupProvider` owner-only
  boundary. A notification fires only when the viewer can legitimately
  read the matched group's membership; policying a group never leaks
  the viewer's rule list to its members or to third parties.
- **Settings discipline.** `social.verbosity` and the server-default
  policy seeds follow the `EnvironmentMixin` schema-on-mixin pattern
  and (for deployment defaults) the `AppSettings` keyspace — no code
  constants.
- **Aggregate stays targetable.** A collapsed "(N others)" / grouped
  count must remain resolvable by the existing MQL room-scope so
  `look at` / `talk to` against a grouped occupant still works. The
  client drill-in surfaces (see *Client interaction*) reuse shipped
  patterns — the command-bar preview contract, the reactions
  expand-on-pull aggregation, the cardinality-polymorphic inspection
  pane, and `PromptApi.mqlMany` — rather than a new bespoke widget; the
  collapsed line carries enough payload (member refs + feature-strings,
  or a live MQL subscription seed) for expansion without a stale list.

## Acceptance criteria

- Looking at / entering a room renders boosted rules (friends, a
  policied guild) named-and-lifted, default-tail occupants named, and
  strangers collapsed per the density tiers; covered by tests across
  the `<10` / `10–30` / `30–100` / `>100` thresholds.
- Stranger collapse renders similarity-grouped lines ("12 dwarves in
  red robes") when a shared (species, feature) tuple exists and
  `(N others present)` otherwise; tested.
- A collapsed group is fully addressable through all four paths —
  hover command-bar preview of its MQL seed, expand-on-pull inline
  sample, inspection-pane drill into a live member roster, and
  verb-time `mqlMany` disambiguation — and no display collapse ever
  renders an occupant untargetable (ordinals/feature-filters still
  resolve against the live room scope); covered by tests at the
  collapsed-group targeting boundary.
- `social.verbosity` set to `minimal` / `standard` / `verbose`
  observably shifts collapse aggressiveness; tested.
- `notify <ref> <field>=<value>` sets and persists a per-character rule
  (including `color`) on any `GroupRef` (contacts labels addressable by
  bare name); `notify` / `notify <ref>` read it back; `--above` /
  `--below` reorder it; `remove` drops it; an un-policied group falls to
  the `everyone-else` default; tested. Soft cap of 50 user-defined rules
  enforced.
- **Strict ordered first-match resolves conflicts.** A person matching
  several rules is decided by the first rule in list order, for both
  notification surface and room render; reordering a deny *above* a
  broad allow flips the outcome to muted, and a force-allow above a
  broad deny flips it to surfaced; tested both directions.
- **Group-keyed notification works for a managed group.** A member of a
  policied guild (`managed:fighter-guild`) logging in notifies a viewer
  who policied that guild with a non-silent surface, even with no
  contacts entry for that person; tested. An MQL-query ref is rejected
  as a notification subject (accepted for display only); tested.
- The client settings pane lists the **ordered rule list as
  drag-to-reorder rows** with editable color/render/notification
  controls, each previewing its `notify …` command on hover/drag and
  issuing it on commit, reading from the same `SocialApi` the verb
  writes (no second persistence path). *(The `notify` verb is the floor
  if the pane is descoped.)*
- A rule's `color` tints its highlight consistently across the
  connect/disconnect notification, a highlighted message, and a boosted
  room render; resolves through the theme cascade (named palette token,
  not raw hex); tested at the render seam.
- A person in a policied group **logging in or out** emits a
  first-match-specified notification to each viewer whose rule matches
  them with a non-silent surface — a relay that does not exist today
  (`PlayerLoggedIn` / `PlayerLoggedOut` currently reach no player);
  asserted server-side on the push frame, and an unmatched person's
  login produces nothing.
- A person in a policied group messaging the viewer restyles the
  existing buffered message to the first-match treatment (highlight /
  summary, in the rule color), rate-limited; asserted on the frame.
- No movement (enter *or* leave) ever produces a contact notification;
  room movement renders only as the existing plain movement line;
  tested.
- The client renders banner-class notifications in a new dismissable
  queue and highlight-class inline; the queue clears on dismiss/TTL.
- Owner privacy: no command or frame exposes a viewer's rule list or
  which groups they've policied to the matched party or third parties;
  notifications fire only on groups whose membership the viewer may
  read; tested at the reverse-lookup boundary.
- A subsystem reference `docs/subsystems/social-graph.md` exists
  documenting the display-lensing + notification-policy layer and
  cross-links `contacts.md`; the slate is updated to reflect Wave 3
  shipped.

## Cross-references

- **Seeding slate:** [social-graph-slate.md](../slates/builds/social-graph-slate.md) (Wave 3 — the live remainder).
- **Shipped substrate:** [contacts.md](../subsystems/contacts.md) (bucket storage + `GroupApi` read surface), [grouping.md](../subsystems/grouping.md) (the `GroupApi` facade + `GroupRef` shape — the policy subject), [belief.md](../subsystems/belief.md) (`RecognitionApi.describe`, `salientFeaturesImpl`).
- **Render seam:** [messaging.md](../subsystems/messaging.md) (Scene composer), [message-rendering.md](../subsystems/message-rendering.md), [reactions.md](../subsystems/reactions.md) (in-memory aggregation precedent).
- **Settings:** [shell-environment.md](../subsystems/shell-environment.md) (`social.*` keyspace), [app-settings.md](../subsystems/app-settings.md) (deployment defaults).
- **Client surface:** [client-shell.md](../subsystems/client-shell.md) (`ReconnectBanner`, the frame/store pattern a notification queue extends), [inspection-pane.md](../subsystems/inspection-pane.md) (the cardinality-polymorphic drill-in roster), [prompt.md](../subsystems/prompt.md) (`PromptApi.mqlMany` verb-time disambiguation), [mql-grammar.md](../subsystems/mql-grammar.md) (ordinals/feature-filters for type-past-the-collapse targeting).
- **Downstream:** [comms-slate.md](../slates/tails/comms-slate.md) (the deferred message-filtering/moderation consumer of `foes`).
