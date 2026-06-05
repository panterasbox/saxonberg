# Inspection pane

The persistent right-column cockpit surface that displays what the
player is currently **focused** on. Sourced from a long-lived MQL
subscription on the canonical kind `'me.focus'`, the pane composes
a live-updated header (focus name), a paint/clear-gated body
(detail when single-focus, list when multi-focus), session-scoped
breadcrumbs, a Refresh button, and an admin-gated extras section.

Pane policy is **paint/clear**: focus changes clear the body to a
placeholder; an explicit `look` against the current focus paints
it from the live subscription record. The substrate is policy-
agnostic — paint/clear is a client concern that exists to teach
the verbs: *focus is a pointer; look is the verb that paints what
the pointer points at.*

See:

- `docs/subsystems/mql-subscription.md` — the substrate this build
  consumes and extends (canonical kinds, `mql-query` one-shot,
  `primaryKeyword` + `contents` field-set extensions).
- `docs/subsystems/prompt.md` — the prompt's focus token; the pane
  header mirrors it visually but reads from the subscription, not
  the prompt push.
- `docs/slates/client-cockpit-slate.md` — the cockpit layout the
  pane slots into.

## File layout

| File | Role |
|---|---|
| `packages/server/src/mud/api/mql-subscription.ts` | `CanonicalKindSpec`, `MqlSubscriptionApi.registerKind`, `handleQuery`, `REF_FIELDS` / `DETAIL_FIELDS` extensions |
| `packages/server/src/mud/lib/description/Perceptible.ts` | `primaryKeyword` persistent field, `getPrimaryKeyword` / `setPrimaryKeyword`, fail-soft pool validation, `Stuff.subscribableFields` descriptor with universal-shape gate |
| `packages/server/src/mud/lib/spatial/Container.ts` | `contents` descriptor on `ContainerMixin.subscribableFields`, per-viewer visibility projection, `FieldChangedEvent { field: 'contents' }` fires from `addContainable` / `removeContainable` |
| `packages/server/src/mud/lib/command/Focused.ts` | `setFocus` / `clearFocus` fire `FieldChangedEvent { field: 'focus' }`; `subscribableFields` declares the `focus` descriptor so the index entry installs |
| `packages/server/src/mud/cmd/find.yaml` | `find` verb YAML view (snapshot enumeration, no `updates_focus`) |
| `packages/server/src/mud/obj/command/FindController.ts` | `find` controller — renders one MML row per match, admin viewers see template-path suffix |
| `packages/server/src/mud/seeds/obj/command/Find.yaml` | Controller seed |
| `packages/server/src/mud/cmd/look.yaml` | `--peek` option + `skip_focus_when_option: peek` on the `target` arg |
| `packages/server/src/mud/api/command.ts` | `skip_focus_when_option` `FieldDefinition` shape and the dispatcher hook that consults it |
| `packages/types/src/index.ts` | `MqlQueryMessage` / `MqlQueryResultEnvelope` / `MqlQueryErrorEnvelope` wire types; `StuffRefRecord.primaryKeyword`; `kind?` on subscribe / query |
| `packages/client/src/store/index.ts` | Pane slice (paint/clear flag, breadcrumbs, focus name, last result), stuff-registry slice (`Map<stuffId, StuffMetadata>`), `upsertStuffMetadata` |
| `packages/client/src/services/websocket.ts` | `subscribeToCanonicalKind` / `unsubscribe`, subscription envelope routing, recursive ref-walk that feeds `upsertStuffMetadata` |
| `packages/client/src/components/InspectionPane.tsx` | Pane component — header, paint/clear body, breadcrumbs, Refresh, admin extras |
| `packages/client/src/components/ui/` | Shared cockpit primitives: `<List>` / `<ListItem>` / `<Field>` / `<FieldList>` / `<EntityName>` / `<Button>` + semantic theme `tokens` (see "Shared UI components and theme tokens" below) |
| `packages/client/src/components/MmlRenderer.tsx` | `commandFor()` extended to `<item>` / `<name>` / `<location>` / `<object>` — registry lookup → `look <primaryKeyword>`, label fallback |

## Canonical subscription kind: `'me.focus'`

The substrate exposes a canonical-kind registry on
`MqlSubscriptionApi`:

```ts
interface CanonicalKindSpec {
  query: string;
  cardinality: 'one' | 'many';
  fields?: FieldSet | FieldAlias;
  detailKey?: string;
  focusDependent?: boolean;
}

static registerKind(name: string, spec: CanonicalKindSpec): void;
```

The wire surface gains an optional `kind?: string` field on both
`MqlSubscribeMessage` and `MqlQueryMessage`. When present, the
substrate resolves the kind against `#canonicalKinds` and overlays
the registered spec onto the request — `query` / `cardinality` /
`fields` / `detailKey` / `focusDependent` come from the spec, not
the wire. Unknown kind names emit
`MqlSubscriptionErrorEnvelope { reason: 'parse' }` (subscribe) or
`MqlQueryErrorEnvelope { reason: 'parse' }` (query).

Raw `(query, fields)` subscribes (no `kind` field) continue to
work; canonical kinds are the additive surface. Clients prefer
the canonical form because the substrate's invariants are
author-controlled — the spec for `'me.focus'` is `{ query:
'$focus', cardinality: 'many', fields: 'detail', focusDependent:
true }`.

Registered at server boot in `Application`'s initialization
sequence, alongside `EventRegistry` registration, before client
connections are accepted.

### `focusDependent` and the holder-level dependency entry

For a query like `$focus` (the canonical `me.focus` kind), the
result set is whatever the focus fragment resolves to — NOT the
`FocusedMixin` host. The natural descriptor walk (which iterates
`collectSubscribableFields(stuff)` for each Stuff in the result
set) would miss the focus dependency entirely.

The `focusDependent: true` flag tells the substrate to install
an additional `(FieldChangedEvent.KIND, 'field', 'focus')`
dependency entry against the **subscription holder** at subscribe
time, in addition to the per-result-Stuff descriptor walk. When
`setFocus` / `clearFocus` fires `FieldChangedEvent { field:
'focus' }` on the holder Avatar, the index entry matches, the
subscription marks dirty, re-resolve runs against the (now-
updated) `$focus` fragment, and the diff produces a delta.

`focusDependent` is meaningless for `mql-query` one-shot reads
(no subscription state to wake on focus change) — when a
resolved canonical-kind spec carries it for a query, the
substrate ignores it.

### `$focus` expansion at re-resolve time

The substrate runs `ShellApi.expandVariables` against the
holder before each (re-)resolve. For `'me.focus'`, the query
string is literally `'$focus'`; expansion produces the holder's
current focus fragment fresh on every re-resolve, which is what
makes the cascade work end-to-end.

## Focus-change signaling

`FocusedMixin.setFocus(fragment)` and `clearFocus()` both fire
`FieldChangedEvent { field: 'focus' }` via the substrate's
`MqlSubscriptionApi.fireFieldChange` helper (same pattern as
`NamedMixin.setName`, `VisibleMixin.setShortDescription`). The
helper's strict-equals short-circuit suppresses no-op
emissions — setting the same focus twice fires once.

`FocusedMixin.subscribableFields` declares a `focus` descriptor
purely so the substrate's dependency index installs the
`('stuff.fieldChanged', 'field', 'focus')` entry. No v1 client
field-set asks for `focus` directly; the descriptor exists for
its side-effect on the index. Without it, `setFocus` fires
events into the void.

The alternatives (a purpose-built `FocusChangedEvent` class, or
modeling focus as a per-Interactive observable in the dependency
index) were rejected because the existing `fireFieldChange`
plumbing handles this exact shape with one line on the setter
and one descriptor on the mixin — zero substrate-level changes.

## `PerceptibleMixin.getPrimaryKeyword()` surface

```ts
getPrimaryKeyword(): string | undefined;
setPrimaryKeyword(value: string | undefined): void;
```

A persistent `primaryKeyword` field on `PerceptibleMixin`
(added to `static persistentFields`). The **primary keyword** is
the *guaranteed-resolvable handle* an MML affordance can click —
`look <primaryKeyword>` is the canonical disambiguator.

**Default behavior**: when unset, `getPrimaryKeyword()` returns
`keywords[0]` (the first entry in the derived pool — typically
the first authored keyword, falling back to the first tokenized
name word). When the authored value is set and validly in the
pool, the getter returns it. When the pool is empty (no name,
no authored keywords) and no authored override is set, returns
`undefined`.

**Fail-soft validation on the setter**: the value must appear in
the derived `keywords` pool. Invalid values are ignored with a
warning (so authors can iterate keyword sets without crashes);
state is not corrupted. The getter never calls the setter — they
are strictly independent (a stale invalid stored value is
silently shadowed by the derived-pool head).

**Set-fires-field-change**: real changes route through
`MqlSubscriptionApi.fireFieldChange(this, 'primaryKeyword', ...)`
so subscriptions on `'primaryKeyword'` (any ref record on a
Perceptible host) wake.

## `REF_FIELDS` extension: `primaryKeyword`

```ts
export const REF_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
];
```

Every ref record shipped by the substrate carries `primaryKeyword`
for Perceptible hosts. Non-Perceptible hosts return `undefined`
from the descriptor and the substrate omits the field on the wire
(same as `quantity` for non-Globbable hosts).

The descriptor is **universal** — declared on
`Stuff.subscribableFields`, not on `PerceptibleMixin`. The
descriptor's `read` does the mixin gate inline (`MixinApi.isPerceptible(stuff) ? stuff.getPrimaryKeyword() : undefined`).
This mirrors how `displayName` is universal on `Stuff` despite
reading mixin-gated state — the alternative (descriptor on
`PerceptibleMixin`) would require the substrate's `REF_FIELDS`
mention to filter at the descriptor-walk site. Universal +
in-descriptor gate is the cleaner shape.

`dependsOnFields: ['primaryKeyword', 'name', 'shortDescription']`
— the getter result changes when any of the derived-pool inputs
change. `changes: [{ on: ShadowChangedEvent, by: 'target' }]` —
keyword pool can be reshaped by shadows.

## `DETAIL_FIELDS` extension: `contents`

```ts
export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  'shortDescription',
  'longDescription',
  'details',
  'bulkMaterial',
  'mass',
  'contents',
];
```

The `contents` descriptor lives on `ContainerMixin.subscribableFields`.
For container hosts, it ships an array of `'ref'`-shape records
(via `projectFields(child, REF_FIELDS, viewer)`) for visible
contained Stuff. Non-container hosts return `undefined` from the
descriptor and the substrate omits the field on the wire.

**Per-viewer visibility filter**: the descriptor walks
`host.getContents()` and excludes anything the viewer's `Sensor`
perception check rejects (sensory occlusion, etc.). Adornments
and the actor (self) are excluded. The viewer is the
subscription holder threaded through the substrate's
`#projectStuff` pass.

**Containment add/remove diffs** ride
`FieldChangedEvent { field: 'contents' }` fires installed
inline on `ContainerMixin.addContainable` and `removeContainable`.
No new event class, no specialized add/remove diff shape — when
the field-change fires, the substrate re-projects the host, the
new `contents` array goes through the diff machinery, and the
client receives an `op: update` change carrying the patched
list. The cycle is end-to-end via the existing primitives.

The choice to put `contents` directly into `DETAIL_FIELDS`
(rather than a new `'detail-with-contents'` alias or a secondary
subscription on `things in $focus`) trades a minor inefficiency
on non-container detail subscriptions for a uniform projection
policy. If contents grow heavy enough that this matters, that's
the moment to split.

## Paint/clear policy

Client-side; the substrate is policy-agnostic. The pane's body is
gated by `paneBodyPainted` (a flag on the inspection-pane Zustand
slice):

- **On mount** — cleared. Header populates from the initial
  subscription result; body shows placeholder text adaptive to
  cardinality (single: *"focused — `look` to inspect"*; multi:
  *"N <summary> focused — `look` to list"*). The placeholder is
  itself clickable and sends `look`.
- **On focus change** (incoming subscription delta where the
  focus fragment differs from the slice's `paneFocusFragment`):
  set painted = false, update the fragment, push the previous
  fragment to the breadcrumb LRU.
- **On `look` against the current focus** (player typed `look`
  with no target, or `look <X>` where `<X>` matched the focus):
  set painted = true, capture the most recent subscription
  result snapshot to `paneLastResult`, render from it.
- **While painted**: deltas update `paneLastResult` and the body
  re-renders in place (React's natural diff). Containment add /
  remove diffs patch the contents list without re-painting the
  rest of the body.
- **While cleared**: deltas update `paneFocusName` (header
  tracks live focus) and `paneLastResult` (cache stays warm)
  but the body stays in placeholder mode.

The two paths to "the body just changed" — outbound `look` paint
toggle and inbound subscription delta — compose: the command
sent → painted = true → delta arrives → result captured → body
renders. The fragment-change-clears-the-body rule applies to
`focus` verb usage, not `look` verb usage (because `look` is
itself the verb whose semantic is *paint the body*).

Pedagogically this matters: auto-painting on focus change would
blur `focus` and `look` into "the thing that updates the pane"
and erase the lesson at the moment players are most likely to
internalize the model. Keeping them visibly distinct teaches the
verb pair.

## Body discipline: percepts, not state dump

The pane body renders **what a perception verb would reveal to
this viewer**, not the focused thing's internal state. `look` is
vision — it reveals appearance and gross features; an estimate at
best for hidden quantities ("looks warm," never "37.4°C").
Internal properties are not perceivable just because they exist.

This is the inspection-pane reconciliation principle (see the
inspection-pane slate's *Reconciliation note* and the
[message-rendering-slate](../slates/message-rendering-slate.md)):
every fact has a *revelation condition* — which modality /
instrument / skill reveals it, at what fidelity. The viewer
perceives only the facts whose condition they satisfy. The pane's
v1 surface walks this back to the simplest cut:

- **Player body = percept projection.** The substrate's `'detail'`
  field-set ships only percept-shaped fields (display name, short
  / long description, visible contents — already per-viewer
  filtered server-side in `ContainerMixin.contents`); the renderer
  shows them as the look output. No slot maps, mixin lists, raw
  fields, or property bags surface here.
- **Raw internal state → admin section only**, role-gated. Template
  path, stuff id, mixin composition, container path, JSON dump
  belong in the admin extras block; never in the player body.
- **Per-fact revelation gating beyond visible/admin is parked.**
  The sense/modality system (feel/smell/listen as separate
  channels), the magic lens, skill-deepens-perception, and per-
  fact provenance all wait for the perception subsystem; the
  spine (fact → revelation condition) is recorded here for the
  future build, the implementation cut is "visible vs admin"
  only.

### Accumulate vs. latest — v1 ships latest-only

When a viewer performs successive perception acts on the same
focus (look, then measure, then appraise), does the pane show
the *union* of percepts each act has revealed, or just the
*latest* act's output?

**Choice: latest-only.** The pane's `paneLastResult` snapshot is
replaced by each subscription result / delta; there is no per-
fact union across multiple `look` / `examine` / `measure`
invocations. The latest-only path stays internally consistent
because the substrate re-projects the *currently-perceivable*
field set on every re-resolve — what the pane shows is what's
true *now*, from this viewer, by the modalities currently in
play.

Accumulate-per-focus is the natural target once the revelation-
condition spine lands; that work is parked alongside the
sense/modality system. v1 does not block on it; the simpler
shape ships and stays correct for the percepts the substrate
currently projects.

## Cardinality-polymorphic body

Same subscription, same field-set (`'detail'` always). The
renderer branches on result-array length:

- **Single (length 1)**: detail view — display name + long
  description (rendered via `MmlRenderer` so embedded MML
  affordances become clickable) + contents list of clickable
  affordances when the focused host is a container.
- **Multi (length > 1)**: list view — one row per match, each
  row's display name rendered as an `<item>`-affordance.

The substrate doesn't know about this branching. Cardinality-
adaptive projection (ship `'ref'` for multi-focus, `'detail'`
for single) was considered and deferred — `'detail'` always for
v1 in exchange for a single uniform projection policy. The minor
inefficiency on multi-focus is accepted.

## `find` verb

```yaml
verbs: [find]
controller: FindController
args:
  - name: query
    type: objects
    required: true
    greedy: true
    scope: ["$focus", "reachable"]
```

**Snapshot semantics.** `find` resolves the query through the
existing MQL pipeline, ships an MML list to the terminal scroll,
one row per match. No `updates_focus` (the absence is load-
bearing — defaults to `'none'`); the giver's focus is unchanged
after `find`. No subscription is registered; no live updates.

**Admin gating.** For admin / Author viewers (checked via
`MixinApi.isAuthor(commandGiver)`), each row appends the
template path in parens — `brass thermometer (/obj/Thermometer)`.
Non-admins see display name only.

**Discovery.** Contributed to `PerceiverMixin.commandContributions.self`
alongside `look`, `scry`, `locate` — `find` is the
enumeration counterpart to `focus`, both surfaced on the
perceiver's verb set.

**`mql-query` integration.** The player-typed `find` rides the
command bus exactly like any other verb (controller renders
prose, player reads it). The `mql-query` one-shot wire surface
exists in parallel for future programmatic consumers — a widget
issuing a `find`-shape read without going through the command
bus. v1 does not exercise that path; the substrate is in place
for when it does.

## `mql-query` one-shot channel

Wire shape in `@saxonberg/types`:

```ts
interface MqlQueryMessage {
  type: 'mql-query';
  queryId: string;
  query?: string;
  cardinality?: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;
  kind?: string;
}

interface MqlQueryResultEnvelope {
  type: 'mql-query-result';
  frameId: number;
  queryId: string;
  result: (StuffRefRecord | StuffDetailRecord | StuffDetailFocusRecord)[];
}

interface MqlQueryErrorEnvelope {
  type: 'mql-query-error';
  frameId: number;
  queryId: string;
  reason: MqlSubscriptionErrorReason;
  detail?: string;
}
```

`MqlSubscriptionApi.handleQuery(req: QueryRequest)`:

- Reuses ONLY the parse + resolve + project pipeline.
- NO registration in `#registry`, NO dependency-index entries,
  NO listener installation. This is the "share the pipeline,
  skip the state" pattern.
- Holder, cardinality, and canonical-kind checks mirror
  `handleSubscribe` so a client's error-handling code can branch
  by `reason` uniformly across subscribes and queries.
- On a registered canonical kind, the spec's
  `focusDependent` field is silently ignored (meaningless
  without subscription state to wake).

`Application.processUserMessage` routes inbound `'mql-query'`
messages through `handleQuery` — same shape as the existing
`'mql-subscribe'` route. Server-side programmatic one-shot
reads call `MqlApi.resolveOne` / `resolveMany` + `projectFields`
directly; this surface is the wire-facing channel.

## `look --peek`

Adds the `peek` boolean option on `look.yaml`:

```yaml
args:
  - name: target
    type: object
    scope: ["$focus", "reachable"]
    updates_focus: extend
    skip_focus_when_option: peek
    prepositions: [at]
    default: "$focus"
options:
  peek:
    type: boolean
    description: "Render prose without changing focus"
```

**`skip_focus_when_option`** is a generic `FieldDefinition`
field on the YAML view. When set to the name of a boolean
option, the dispatcher reads `model[<option>]` at the focus-
update site; if true, the focus update for this arg is skipped
even when `updates_focus: extend` is declared. The arg's bind
runs unchanged; only the side effect on focus is suppressed.

`LookController.execute` is unchanged — it renders the prose
body and emits the existing Scene the same way it always has.
The "peek doesn't change focus" semantic is the dispatcher's
job, not the controller's.

The generalization (a YAML field, not a `look`-specific
dispatcher branch) lets future verbs with similar peek-style
flags reuse the pattern without rewiring the dispatcher.

## Client stuff registry

A single Zustand slice on `useStore`:

```ts
interface StuffMetadata {
  stuffId: string;
  displayName: string;
  primaryKeyword?: string;
}

interface StuffRegistrySlice {
  stuffRegistry: Map<string, StuffMetadata>;
  upsertStuffMetadata: (records: StuffMetadata[]) => void;
}
```

**Populated** by every subscription consumer the client owns.
When the wire client receives an `mql-subscription-result` or
`mql-subscription-delta` envelope, it walks every record and
calls `useStore.getState().upsertStuffMetadata([...records])`
before dispatching to widget handlers. Nested ref-shape fields
(currently just `contents`; future `equipped`, `inventory`,
etc.) are recursively walked so the registry picks up every
stuff-id mentioned anywhere in the subscription payload.

**Merge semantics**: fields present in the new record
overwrite; fields absent leave existing values intact. A ref-
only delta does not clobber detail data; a detail delta
upgrades a previously ref-only entry.

**Read by**: `MmlRenderer.commandFor()` at click-resolution
time. The renderer reads the registry directly from the global
store snapshot (`useStore.getState().stuffRegistry.get(stuffId)`)
— not via a React subscription, since the renderer just needs
the snapshot at render time. Re-renders happen naturally when
the parent (terminal, pane body) re-renders.

**No eviction in v1.** Sessions are bounded; the registry is
cheap memory. The "forgotten ref leads to broken click" failure
mode (which eviction would create) is more painful than the
"registry grows unbounded" trade-off (which it prevents).

**The registry is a side-effect cache for rendering metadata,
not a source of truth for client logic.** Widgets that need live
state subscribe for it; they do not query the registry. The
registry's only legitimate reader is rendering paths that need
a per-stuff lookup (currently: `MmlRenderer.commandFor`). If a
widget reaches for the registry to answer "what's in this
container" or "is this thing visible," that's the on-ramp to a
client-side shadow model — stop and have that conversation
explicitly rather than slipping into it by accumulation.

## MML identity-tag rendering

`MmlRenderer.commandFor()` extends to four identity tags:

```ts
case 'item':
case 'name':
case 'location':
case 'object': {
  const stuffId = node.attrs['stuff-id'];
  if (stuffId) {
    const meta = useStore.getState().stuffRegistry.get(stuffId);
    if (meta?.primaryKeyword) return `look ${meta.primaryKeyword}`;
  }
  return `look ${node.label}`;  // label fallback
}
```

**Click target** is `look <primaryKeyword>` when the registry
hits, falling back to `look <node.label>` when the registry
misses or the stuff has no primary keyword. Pedagogically this
matters: `look thermometer` is what the player would type.
Showing them that command on hover and sending it on click
teaches the typed-command surface; sending an opaque `stuff-id`
would not.

**Hover preview** rides the existing `onCommandPreview` surface
unchanged.

`<direction>` and `<speech>` remain non-actionable (no
`commandFor` branch). `<exit>` continues to emit `go <dir>`.

**MML identity tags carry `stuff-id` only.** Per the architectural
rule this build establishes, do not add per-stuff attributes to
`<item>` / `<name>` / `<location>` / `<object>` beyond
`stuff-id`. New per-stuff metadata is a projection field on a
subscription, not a tag attribute.

## Shared UI components and theme tokens

The pane composes from a small **shared** primitive set under
`packages/client/src/components/ui/`, not pane-private styled
divs. Three rules govern it:

1. **Reusable primitives, not bespoke JSX.** Future cockpit
   widgets (inventory, self-state strip, group windows) compose
   from the same surface — and so does the layout-MML library
   the [message-rendering-slate](../slates/message-rendering-slate.md)
   schedules for its Wave 2. When that lands, its `<table>` /
   `<list>` / `<field>` tags map onto these same React
   components, so the subscription-driven rendering path and the
   message-rendered path converge on one DOM shape. The pane
   does not block on that library; it ships its own
   subscription-record → React-component path today.

2. **Semantic DOM = the flatten-linear-labeled floor.** Every
   primitive renders the real HTML element: `<List>` is a `<ul>`
   / `<ol>`, `<FieldList>` is a `<dl>` of `<dt>` / `<dd>` pairs,
   `<EntityName>` is a `<button>`, `<Button>` is a `<button>`.
   No ARIA props are needed to fake what the platform already
   announces. Visual-only `<div>` grids are the smell to avoid.

3. **Theme tokens; no hex literals.** All color / spacing / font
   values come from `tokens.ts` — semantic names (`surface`,
   `fg`, `accent`, `border`, `sectionLabel`) that a theme can
   swap wholesale. There is **no** `<color>` or `<size>` MML
   tag; coloring is a stylesheet rule keyed off semantic markup
   (the principle from the message-rendering slate).

| Primitive | Role | Renders |
|---|---|---|
| `<List>` / `<ListItem>` | semantic sequence | `<ul>` / `<ol>` + `<li>` |
| `<FieldList>` / `<Field>` | labeled key/value pairs | `<dl>` + `<dt>` + `<dd>` |
| `<EntityName>` | clickable name carrying `stuff-id` | `<button data-stuff-id="...">` |
| `<Button>` | action target with `primary` / `action` / `ghost` variants | `<button>` |
| `tokens` | semantic theme values (color / space / font / radius) | `as const` exports |

### `stuff-id` is double duty: interactivity and styling

`<EntityName>` emits a `data-stuff-id` attribute on the rendered
button. The same attribute drives **two** layers from one source:

- **Interactivity** — the click target resolution layer maps
  `stuffId` (via the stuff registry's `primaryKeyword`) to the
  command this affordance sends. `MmlRenderer.commandFor`
  applies the same registry-then-label fallback for identity
  tags; the pane mirrors it for contents-list rows and multi-
  focus rows via the parent's `onSendCommand` sink.
- **Styling** — a future theme stylesheet selects on
  `[data-stuff-id]` against the viewer's social-graph bucket
  (friend / foe / self) to colour the name. The
  [social-graph slate](../slates/social-graph-slate.md) +
  [message-rendering slate](../slates/message-rendering-slate.md)
  describe the bucket model. The attribute is emitted today;
  bucket selectors land when that subsystem does, without any
  pane changes.

One attribute, two duties — that's the slate's economy. **There
is no `<color>` or `<size>` MML tag**, and no per-tag color
attribute; coloring is always a stylesheet rule keyed off
semantic markup.

### Multi-focus rows: groups, eventually

Per the [grouping slate](../slates/grouping-slate.md), the multi-
cardinality `me.focus` result is in principle a **group** — `focus
friends` resolves a group via `GroupApi`; the pane renders its
members. v1 has neither `GroupApi` nor friend/foe bucketing, so
the row shape is just "a list of styled names" — and that's the
shape it stays. When `GroupApi` lands, the pane resolves the
group server-side via the canonical kind's query and the row
component (`<EntityName>` already carrying `stuff-id`) absorbs
the bucket selector without further work.

## Breadcrumbs, Refresh, admin extras

**Breadcrumbs.** Session-scoped LRU of the last 6 distinct focus
fragments. Pushed by the paint/clear handler when focus changes.
Click sends `look <fragment>` through the command bus (paints
the body in one motion). The command-bus route is intentional —
clicking a breadcrumb is a "show me this again" gesture, not
"set my pointer but don't show me." Not persisted across
reconnects.

**Refresh button.** In the pane header. Clicks send `look`
through the command bus exactly like any other click affordance
— no special API. Stays enabled in the cleared-body state
(that's its primary use). Clicks queue if a command is in-
flight.

**Admin extras.** Visible only when the local viewer is admin
(read from auth state). Renders `templatePath` / `stuffId` /
mixin composition / container path / raw data dump (expandable
JSON pretty-print) / quick-action buttons (`clone`, `reload`,
`eval`). Each button sends the corresponding command through
the command bus. Hidden entirely for non-admins.

## Reconnect behavior

On WebSocket `connection-established`, the wire client re-
subscribes every active subscription (replays the same
`mql-subscribe` message with `kind` + `subscriptionId`). The
server's substrate ships the initial result. The pane's header
populates from the first record. The body stays cleared —
`connection-established` is not a `look`.

The substrate's per-subscription state on the server is rebuilt
fresh on each subscribe; there is no resume / replay shape.
Mid-reconnect message loss is invisible because the initial
result envelope is authoritative.

## What ships unbuilt

Per the closed-scope requirements:

- **Tabs / tab strip.** v1 ships a single focus tab with no
  strip UI.
- **Pinned `find` results in the pane.** `find` renders to the
  terminal scroll; pinning lands with tabs.
- **Display-flag vocabulary on `find`** (`--bare`, `--with
  vitals`, etc.).
- **`find --focus` flag.**
- **Shift-click alternative on multi-row.** Plain click sends
  `look <that>` (drill-in).
- **`<peek>` MML tag for scrollback clicks.** All clickable
  affordances in the terminal scroll route as plain
  `look <X>` (focus-shifting). No "peek by default for
  backscroll" rule.
- **Per-row aspect families** on multi-focus rows (vitals,
  slots, position).
- **DescribeApi v2 affordances.**
- **Inventory widget** and the `inventory` verb migration.
  Separate tandem slice.
- **New MML tag types** beyond the four already-emitted
  identity tags (`<npc>`, `<player>`, `<command>`, `<quantity>`,
  `<focus>`, etc.).
- **Right-click context menus on MML affordances.** Click →
  `look <label>` is the universal default; tag-specific
  alternative actions ship when the broader gesture vocabulary
  lands.
- **Multi-pane / split view.** Single pane only.
- **Persistent breadcrumb history across reconnects.**
- **Animated focus transitions.**
- **Mobile responsiveness.**
- **Other Chunk 2.6 supporting infrastructure** — heartbeat,
  `ShadowChangedEvent` firing, MQL global seeds
  (`online` / `world`), `mql-subscribe-update` with
  `refresh: true`. Only the `mql-query` one-shot ships here
  because `find` motivates it.
- **Cardinality-adaptive projection** — `'detail'` always.
- **Other canonical kinds** — only `'me.focus'` registered in
  v1; `me.inventory`, `me.location`, `online`, `world` defer
  until the consuming widgets demand them.
- **Sense/modality system** (feel / smell / listen as separate
  perception channels), the **magic lens**, and
  **skill-deepens-perception.** Recorded as the future
  revelation-condition spine; v1's cut is "visible vs admin"
  only. See the *Body discipline* section above.
- **Per-fact revelation gating beyond visible/admin.** Each
  property today is either projected into the detail field-set
  (perceivable as part of the look output) or held to the admin
  block. Per-fact provenance (which act revealed this fact, at
  what fidelity) ships with the perception subsystem.
- **Accumulate-per-focus body.** v1 ships latest-only — each
  subscription result / delta replaces the snapshot. The union
  of percepts across `look` / `measure` / `appraise` waits for
  the revelation-condition spine.
- **`GroupApi` wiring on multi-focus rows.** The grouping
  subsystem isn't built; the row shape (`<EntityName>` carrying
  `stuff-id`) is forward-compatible without component changes.
- **Social-graph bucket styling.** `<EntityName>` already emits
  `data-stuff-id`; the friend / foe / self stylesheet rules land
  when the social-graph subsystem does.
- **Channel stylesheets, `<color>` / `<size>` / heavy layout
  tags.** Out of scope per the message-rendering slate's wave
  ordering; the core stays semantic, presentational tags wait
  for opt-in channel scopes.

## Known future considerations

Flag-don't-fix; just record so future debugging knows the
substrate's choices.

### Per-viewer presentation isn't modeled on the client

Disguise / recognition will eventually want different
`displayName` / `primaryKeyword` per observer. The substrate
already projects per-viewer (each subscription's `viewer` is the
holder's Interactive, so wire payloads are already viewer-
specific). The single client-side `stuffRegistry` slice assumes
one viewer per session, which is true for v1's player-only
client; admin spectating, multi-viewer surfaces, or any "see
this through another's eyes" feature will need to revisit the
registry's keying. Likely shape: a `viewerId` axis on the Map
key, or a per-viewer sub-slice that the renderer routes through.

### Last-writer-wins on conflicting records

Two subscriptions could ship records with different `displayName`
for the same stuff-id — legitimately (under per-viewer
projection, recognition state shifting between subscribes) or as
a bug. Today's merge ("fields present overwrite; absent stay")
accepts the first case silently and provides no signal for the
second. Worth knowing when debugging "why does this thing's
name suddenly differ from what I expected." A future contention-
detection pass could log when an upsert overwrites a non-empty
field with a different value; today the registry is intentionally
quiet.

### Eviction policy upgrade path

Sessions are bounded today, so the never-evict policy is fine.
When sessions get long (long-running NPC tutors, persistent
classroom sessions, etc.), eviction will need a strategy (LRU,
reference-counted by active subscriptions, or session-cap). The
upgrade is clean: consumers only call `Map.get`, so any eviction
policy lands behind the existing read shape without changing
call sites. The decision point is when the registry footprint
crosses whatever profiling threshold makes it the next
optimization candidate.
