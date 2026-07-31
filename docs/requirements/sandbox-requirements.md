# Sandbox (the holodeck) — requirements

The full sandbox build
([sandbox-slate.md](../slates/builds/sandbox-slate.md)), **one maximal
build, everything in one go**: the four containment layers' enforcement
seams, the wire-body crossing, the wardrobe portal fixture and its
lifecycle, the universal per-maker circle, the seeding aperture, the
author→test harness seam, guests and the group-titled cell, and the
escape battery that proves the whole thing closed. This is the build
that makes "every durable mutation is either governed or discarded"
true in code, and gives every maker the anything-goes workshop the
story bible promises. The slate's phase list survives as **internal
wave ordering**, not separate cycles. Load-bearing context:
[persistence.md](../subsystems/persistence.md) (the spine, PM),
[call-security.md](../subsystems/call-security.md) (the proxy, shadows,
policies), [residency.md](../subsystems/residency.md) (eviction),
[connection.md](../subsystems/connection.md) (Interactive↔principal
handoff, linkdead), [parcel.md](../subsystems/parcel.md) (title,
`selfHomeOwnerOf`), [zone.md](../subsystems/zone.md) /
[boundary.md](../subsystems/boundary.md) (the circle zone and its
doors).

## Goals

**The containment substrate:**

- **The scope taint exists.** A circle scope rides the
  ExecutionContext as ambient state, minted **only at execution roots**
  (the slate's roots table), propagated across every context-minting
  seam (schedule callbacks included), and carried by continuations at
  their *birth* scope. No API accepts scope as a parameter; it is
  always derived from context.
- **Durable writes are policy-governed.** Every collection in
  `PersistenceManager`'s enum has an enforced per-collection policy —
  STAMP / REFUSE / PASS / SHADOW — applied at PM when the writing
  context carries circle scope. Field-side reads exclude scoped rows;
  circle-side reads include the session's own. Exit (and the orphan
  sweeper) discards a session's scoped rows completely.
- **Live dispatch is boundary-checked.** The call-security proxy
  denies method dispatch when context scope ≠ receiver scope, in both
  directions, with exactly two pass-throughs: system root and the
  `FromModule`-gated inspection aperture. Every denial emits a
  diagnostics event with full receipts (caller module-id, receiver,
  scope pair).
- **Shadow installation is boundary-checked** at the central
  `@ShadowSecurity` resolution seam — circle context shadows only
  circle-resident hosts, and vice versa; circle shadows die at reap.
- **Inside a circle, the game genuinely runs.** Circle-context derives
  read global ∪ own-scope, so standing, money, and progression visibly
  work within a visit — and are gone after it.

**The crossing and the space:**

- **The crossing is the wire body.** Entering mints a disposable
  vessel carrying the player's identity; the Interactive re-attaches
  to it; the real avatar parks presence-frozen with full linkdead
  protections. Exit (or death inside) reaps the vessel wholesale and
  re-attaches. Nothing material crosses in either direction.
- **Runtime state crosses by an explicit fork/merge protocol.** A
  general `Forkable` substrate — objects fork themselves, composed
  per-mixin, the persistence spine's sibling — carries the state a
  projection needs (presentation, implant loadout, channel
  subscriptions, contacts) onto the wire body, and merges an
  **epistemic-only** allowlist back at exit. Shadows get an opt-in
  follow: a shadow may declare it wants to re-establish on the fork,
  and the framework re-attaches it **to the fork only** (a shadow
  never names its own target). Silent shadows stay dropped. The
  sandbox is the first consumer; the mechanism is host-agnostic.
- **Comms are seamless.** Inside a circle you are reachable and can
  reach out: `dm`/`tell` resolve to your **active body**, channel
  messages deliver exactly once, replies land. Messages are
  epistemic — the wire is *not surveillable*, which is different
  from unreachable — so delivery is an explicitly allowlisted
  cross-boundary channel carrying **rendered MML only** (no Stuff
  reference crosses, so the allowlist can't become a smuggling
  route). Room-scoped speech doesn't reach the circle for the
  ordinary reason: you aren't in the room.
- **Every maker has a circle, by rule.** Creating a character *is* the
  mint: `/home/<playerId>/` belongs to its player via the shipped
  `selfHomeOwnerOf` pure rule — no parcel row, no provisioning act,
  nothing to grant. The zone materializes lazily at first entry,
  dormant and evictable under residency when cold, re-materialized
  from authored truth on return.
- **The wardrobe is the door — and a door is just an exit.** A
  placeable chattel fixture whose template carries a **template-path
  destination** (the circle's zone path), the ordinary interzone-exit
  shape ([boundary.md](../subsystems/boundary.md)) — the wardrobe is
  *content over the boundary substrate*, not new machinery; the only
  sandbox-specific part is the traversal hook that runs the crossing
  choreography. Skins (wardrobe / turbolift / mirror / drafting table)
  are pure `Visible`/`Detailed` data. Moving it moves the door;
  selling transfers empty (the buyer's fixture points at their own
  circle) or furnished (title transfers; authoring credit stays with
  the seller); destroying it reaps any wire bodies present and
  **orphans** the zone (re-bindable), which then follows normal
  dormancy → eviction. Multiple doors to one circle are allowed.
- **The seeding aperture exists — on the shipped `clone` verb.** A
  gated capture-as-read: from inside your circle, `clone` accepts a
  live thing you own as its source and mints a **copy** carrying its
  instance state (your gear's wear, grade, personalization). The
  original is untouched; the copy is circle-born and dies with the
  circle. This is the only sanctioned cross-boundary read of instance
  state — and it is a widening of an existing verb, not a new one.

**The people and the tooling:**

- **Guests work.** A host grants and revokes circle access; guests
  cross through the host's door with their own wire bodies (their real
  avatars park wherever they were); the boundary binds host and guest
  identically. Reaping a guest never touches the host's authored
  truth.
- **The group cell works — and is provisioned, never self-serve.** A
  circle over a `/studio/<groupId>/` namespace whose parcel is
  group-titled (the shipped group + parcel substrates), **granted by a
  governance act** (the office substrate, `requiresGovernor`-gated;
  founder-default holder today) — same containment, shared authored
  truth, member-gated entry. `/home/` stays personal, always.
- **Eval always runs against a parcel you hold.** One selector
  (`--parcel <path>`, default `/home/<self>/`) because a sandbox *is*
  a parcel on the wire: your circle, a group's `/studio/`, or a
  **published parcel you administer** (committee membership via the
  `ownerOf` walk + `AccessApi.can`) — one gate, no special cases.
  Unscoped eval does not exist. The `eval` command **mints a
  template** for the code in the target jurisdiction's namespace, so
  eval'd code always has *addressable provenance*, and executes under
  that jurisdiction's authority: **wire parcels quarantine** (circle
  scope — the four layers apply, nothing escapes), **field parcels
  govern** (writes are real, reach is bounded to the parcel's extent,
  and the act is receipted — the governed channel made concrete for
  code). Code-trust (`isWizard`) remains required for every mode;
  jurisdiction gates *where*, never *whether*.
- **The build adds no new verbs.** Entry is the wardrobe (content
  over the shipped boundary substrate); seeding widens `clone`; guest
  grants widen the shipped parcel grant surface; provisioning uses
  the shipped `subdivide` + `transfer`. The harness's entry is an Api
  call, not a verb.
- **The harness seam exists.** The server exposes the
  launch-a-test-session seam (crossing + fresh body + reap-wholesale)
  in a form the CMS can invoke, with a minimal CMS affordance wired to
  it. (Draft-overlay compose is excluded — see non-goals.)
- **Containment is proven, not asserted.** The escape battery — one or
  more adversarial tests per reach-walk channel — fails against the
  unguarded engine, passes against the seams, and runs as the
  permanent regression net.
- **The audits are done and recorded.** The write-path policy table,
  the roots table, and the exempt-singleton classification are
  verified against the actual code and recorded (graduating to the
  subsystem doc at sweep).

## Non-goals

- **Draft-overlay compose** ("test the zone as it will be" against a
  team changeset) — depends on the CMS drafts/changeset system, which
  is itself unbuilt ([cms-slate](../slates/builds/cms-slate.md)
  deferred remainder). The harness seam must not preclude it; it lands
  when drafts land.
- **Compute billing of circles** (allowance-gated size, freeze,
  metering) → property Phase 1. Circles are residency-governed only,
  this build.
- **Promotion / publish** — the release gate, CMS/forums review,
  chartering → their own builds. The circle's two exits stay: walk out
  (rollback) or publish (review) — this build ships the first and
  leaves the second's gate untouched.
- **Hostile raw TS** — `isolated-vm` (roadmap Framework 13). This
  build's floor is deliberate-evasion-required, per the slate.
- **Epistemic presentation** — how `chronicle` renders wire-marked
  records and how blame-derives weigh wire-scoped accountability
  events → the owning subsystems. This build guarantees the mark, not
  the rendering.
- **Augment/rig projection into the wire body** — the vessel mints
  baseline; "test as your equipped self" composes later from the
  seeding aperture if wanted.
- **Lease-scoped tree permissions** beyond parcel-title gating (the
  access slate's deferred surface) — group-cell entry rides group
  membership + parcel title, nothing finer.
- **Wardrobe commerce polish** — the furnished-sale *allowance
  liability* clause (waits on compute) and any storefront/market
  treatment of wardrobes (retail's business).

## Surface decisions

### Boundary reads: deny-all, no read allowlist

Cross-scope dispatch is denied wholesale — no allowlisted read surface
at the proxy. Reads-in are met by template cloning (templates and
commons data are not world objects) and the seeding aperture.
Rationale: a read allowlist would require classifying every method as
read/mutate — an audit with no end; the aperture gives reads a
chokepoint instead.

### The seeding aperture is own-things-only

`SandboxApi` capture-as-read accepts targets the requester **owns**
(chattel title, own body/gear) — not arbitrary field objects. Capture
runs through the persistence spine's existing capture path as the
owning principal; the clone is minted circle-born. Rationale: consent
and privacy fall out of ownership; "copy anything I can see" is a
scrying feature someone else can design.

### The wire body mints baseline

Appearance/species copied from the player's identity (a read); no
gear, no chattel, no augments. You are you, empty-handed, in a place
where you can author anything — and seed copies of what you own.

### Disposition is STAMP (symmetric revert)

Trait drift from in-circle acts reverts like every other material
ledger. Symmetry beats the "personality is always you" argument until
a real case proves otherwise; flipping one policy row later is cheap.

### Epistemic wire-mark at write, all five ledgers

`chronicles`, `beliefs`, `contacts`, `authoring_events`,
`accountability_events`: rows created from circle context carry the
wire mark (scope recorded, row persists). Written by the same PM seam
as STAMP — one mechanism, different disposition.

### The infrastructure exemption is explicit, never inferred

Exempt-from-boundary-check status comes from an explicit marker (the
`ApiLogic` base class plus an enumerated registry allowlist) — never
inferred from "has no zone." Anything unmarked and unscoped is denied;
fails closed when a new module category appears. The singleton audit
classifies every exempt holder of mutable state as stateless /
scope-aware / needs-a-guard; the guarded ones get scope checks at
their mutation methods (the one sanctioned per-method-guard case).

### Receiver scope is a stamped field

Stamped at mint/registration, restamped on the rare cross-boundary
move (cost-owner precedent). The dispatch check is an ALS read + two
field compares; a zone-chain walk on the dispatch path is a defect.

### One new facade: `SandboxApi`

The sandbox is a new subsystem: `api/sandbox.ts` (`SandboxApi`) +
`obj/api/SandboxLogic`, owning the crossing choreography
(mint/park/re-attach/reap), session lifecycle, circle mint/linking,
the seeding aperture, and discard-on-exit. **Explicitly signed off
against the one-Api-per-subsystem rule.** PM policy enforcement stays
in `PersistenceManager` (backend); the dispatch check stays in the
proxy/SecurityApi layer — the facade orchestrates, it does not absorb
the seams. The crossing's traversal hook and the wardrobe class live
in the subsystem's `lib/` home, with skins as template data.

### Zero new verbs — every affordance widens a shipped one

The sandbox needs no new command surface. Owner side: **the wardrobe
is the door** (content over the boundary substrate — a wizard with no
fixture clones one and places it, which is itself the authoring
ladder), and **seeding widens `clone`** (`mud/cmd/author/clone.yaml`)
to accept a live owned object as source when the context carries
circle scope. Guest grants widen the shipped parcel grant surface.
Management side: **provisioning is `subdivide` + `transfer`**
(`mud/cmd/system/`), the shipped title acts — a governor subdivides
`/studio/<groupId>` and transfers title to the group. The harness
enters through `SandboxApi.launchTestSession` (an Api call from the
CMS bridge), not a verb.

**Consequence to build:** `goto`/`teleport` (the shipped wizard
movement verbs) must **not** be able to place a real body inside a
circle — direct-placement paths into a circle zone are refused, and
the exit-hook crossing is the only way in. This is a required
denial, not a nicety: the wire-body model is the containment.

**Standing rule for convenience UX:** any quality-of-life affordance
this build wants lands as an **option or subcommand on `clone`** —
never a new verb, never a new dispatch surface. `clone` is the
sandbox's one authoring workhorse (mint a thing, seed a copy, stand
up a test rig), so its flag set is where ergonomics belongs. The
same rule governs follow-on work: if a later cycle wants a nicety,
the question is "which `clone` opt is that?"

### Guest access is host-granted, parcel-gated

Grant/revoke ride the shipped parcel grant surface on the circle's
parcel; entry checks it at the door. Revocation of someone currently
inside reaps their wire body (they re-attach at their parked avatar —
the non-event eviction the wire-body model makes free). No new verb:
the grant surface a host already uses for property is the same one.

### The group cell is governance-provisioned over `/studio/<groupId>/`

Resolves the land-compute open question for this build: a dedicated
`/studio/` branch (mirroring `/home/`'s shape), parcel row titled to
the group (`kind:'group'` — the shipped `ownerOf` walk), entry gated
on group membership. **Provisioning is a governance act performed
with the shipped title verbs** — `subdivide` mints
`/studio/<groupId>` out of the state-held `/studio` parcel (whose
owner is `core`, so acting on it is already a governance-gated act),
then `transfer` hands title to the group. Mirrors the chartering
doctrine: personal space is a right, group space is a grant. Shared
authored truth lives there; `/home/` remains personal, always.

The one gap to close: `transfer` today is player-to-player
(`mustBeAgent`, bilateral online consent). Granting to a **group**
needs the recipient side widened to accept a group ref (the parcel
registry already models `kind:'group'` owners, and a group can't
"consent" — acceptance collapses to the governor's act). That is an
extension of the shipped verb, not a new one.

### Personal circles are never provisioned

The mint question dissolves: **character creation is the grant.**
`/home/<playerId>/` is the player's by the shipped `selfHomeOwnerOf`
pure rule — no parcels row, no hook, no act, nothing revocable.
Materialization is lazy runtime behavior (residency), not minting;
"everyone gets one" costs nothing until used.

### The wardrobe is an exit template, not new substrate

The fixture's template carries its destination as a **template path**
(Pattern A path-string, [ref-shapes.md](../subsystems/ref-shapes.md)) —
the same shape as any interzone exit; no live ref to the zone
instance. The portal-mixin conception from property-slate §G shrinks
to the traversal hook that runs the crossing choreography; everything
else is boundary-substrate reuse plus data skins.

### Eval is jurisdiction-targeted — one selector, never unscoped

`eval [--parcel <path>]`, defaulting to `/home/<self>/`. **A sandbox
is just a parcel on the wire**, so there is exactly one rule with no
special cases:

- **The target is a parcel.** Your circle, a group's
  `/studio/<groupId>/`, a published subdivision — all parcels.
- **The gate is authority over it** — one call:
  `ParcelApi.ownerOf` + `AccessApi.can`, which already dispatches on
  owner kind (self-rule for `/home/`, group membership for
  group-titled, committee for published — the committee *is* the
  title-holding group).
- **The disposition falls out of the parcel's kind.** Wire namespace →
  quarantine (template mints there; execution carries circle scope —
  a sanctioned root-level scope assignment; the four layers contain
  it). Field namespace → **governed**: writes are real, the execution
  context carries a *jurisdiction bound* (dispatch and template writes
  only within the parcel's extents; the boundary check generalizes
  from scope-equality to authority-domain membership), and the act is
  receipted (`authoring_events` + diagnostics/mudlog). Terminus's
  committee can eval against Terminus — and nothing else.

There is **no unscoped mode** — "eval against anything" is exactly the
hole this build closes. Code-trust (`isWizard`) is required for every
target: jurisdiction gates *where* the eval reaches, never *whether*
you may run code. Jurisdiction-bounded contexts are rare, so the
parcel-extent membership test stays off the null fast path
(performance posture holds).

### Exit is discard, not archive

`deleteMany({circleScope})` per STAMP/SHADOW collection at reconcile;
the orphan sweeper (residency-style cadence) catches sessions that
died un-reconciled. No sandbox-ledger-history surface — the circle's
durable truth is its authored content only.

## Constraints

- **Performance posture** (slate § Performance posture, binding):
  dispatch check O(1) with `null == null` short-circuit; **no
  measurable overhead when no circle exists**; sparse/partial indexes
  on `circleScope` for every STAMP/SHADOW collection (field-read
  filters stay covered; exit never scans); **per-session collections
  forbidden** (Atlas ~500-collection cap); SHADOW membership minimal —
  caches prefer skip-and-rebuild.
- **Scope is never a parameter.** Principal and scope derive from
  context (memory: gated-api-actor-from-context). No `doThing(scope)`
  surfaces.
- **Every minted id comes from `SecurityApi.uuid()`.** The
  project-wide id seam (nanoid under the name; server code never
  imports `nanoid` directly). Applies to anything this build mints —
  the session record's id, any correlation handle. **Not** an
  invitation to mint: the circle scope stays the **parcel path**
  (Decision A), not a nonce, because path-valued scope is what makes
  a crashed session's rows discardable and the jurisdiction bound
  expressible; and Stuff/chattel/diagnostics ids keep coming from
  their existing machinery.
- **No new zone classes.** The circle's space is an ordinary
  `SpatialZone`; `/home` keeps its existing `HomeZone` (untouched);
  `/studio` is a seeded `FolderZone`. A branch is *wire* by an
  inherited zone field (`wire: true` + `Zone.lookupField`), never by
  class identity or a hardcoded path list — so a future wire root is
  a seed row, not an edit to the containment layers.
- **Module discipline.** No new module categories; no free-floating
  helpers; the remaining raw-driver file (`DiagnosticLogic` —
  `PackLogic` and `belief.ts` already flow through the facade) folds
  onto PM's typed surface as part of this build. PM
  stays backend-layer (`#`-private conventions).
- **Shadows cannot cross the boundary.** Attach/detach is
  host-targeted and centrally resolved (`@ShadowSecurity` via
  `SecurityApi`); the boundary rule applies at that seam, both
  directions; circle shadows are runtime-only and die at reap.
  `@Unshadowable`/`@Final` seals unchanged.
- **Continuations carry birth scope.** Every registration surface
  either re-establishes the registrant's scope on invoke
  (`ScheduleApi`/`runRoot` precedent) or refuses circle registrants;
  circle-scoped schedule handles and MQL subscriptions are cancelled
  at reap.
- **No new global events.** Session lifecycle notifications are direct
  calls/witness hooks (memory: no-EventApi-unless-global).
- **Existing gates hold.** Code-trust (`isWizard`) unchanged
  everywhere; `saveTemplate` lockdown unchanged; the inspection
  aperture is `FromModule`-gated and logged, not a policy bypass.
- **Conservation is scope-aware.** The bank chokepoint treats scoped
  rows per-scope (scoped mint permitted — it evaporates); field
  conservation invariants must be provably unaffected by any circle
  activity.
- **The wardrobe respects the two-registry split.** Fixture = chattel
  (owner-stamped, transferable); circle = parcel (titled, extents);
  the `linkedSandboxPath` ref follows ref-shapes Pattern A/C rules —
  no live-ref to the zone instance
  ([ref-shapes.md](../subsystems/ref-shapes.md)).
- **Eval integration modifies the author subsystem, not the sandbox
  one.** The template-mint + scope-assignment lands in the existing
  `eval` path ([shell-author.md](../subsystems/shell-author.md) —
  AuthorMixin / EvalScript); `SandboxApi` supplies the scope root, it
  does not absorb eval.
- **Existing lints** (`lint:module-scope`, `lint:gates`) and the
  antipatterns table apply; the new Api ends with
  `SecurityApi.decorateApiClass`.

## Acceptance criteria

- **The escape battery exists and gates.** ≥1 adversarial test per
  reach-walk channel row (dispatch, durable write, deferred execution,
  comms, subscriptions, lookups, stateful singletons, shadow
  installation — both directions), each demonstrably failing without
  its seam and passing with it; wired into the suite as a named group.
- **The policy table is total and enforced.** Every collection in PM's
  enum carries a policy; tests demonstrate each verb (a STAMP row
  appears in-circle, is invisible to field reads, and is gone after
  exit; a REFUSE write throws from circle context; a PASS row persists
  wire-marked; a SHADOW overlay wins in-circle and vanishes).
- **The round-trip holds.** Enter (verb and wardrobe both) → author +
  clone + seed-a-copy + fight + transact (standing and money visibly
  accrue in-circle) → exit → field state unchanged on every material
  ledger (balances, transcripts, renown, chattel; the seeded
  original untouched), while epistemic records exist and carry the
  wire mark.
- **The crossing is safe.** Parked avatar has linkdead protections,
  is captured at park, vetoes eviction while its session lives, and
  does **not** announce a disconnect (a parked player reads as
  present-but-unreachable, never offline); death inside re-mints
  without touching the parked body.
- **Disconnect resumes; quit cascades cleanly.** A drop mid-visit
  keeps the session alive for a grace window — reconnecting inside it
  returns you **to the circle, on the same wire body**; past it, the
  sweeper reaps and discards and you return to your parked avatar in
  the field. A deliberate `quit` inside runs the exit choreography
  first, then logs the **parked avatar** out (its save runs, not the
  vessel's). A restart mid-visit loses only the transient rig.
- **The wardrobe lifecycle holds.** Place → link → enter → exit works
  through multiple doors to one circle; move relocates the door; sell
  empty hands the buyer a fresh-linking fixture; sell furnished
  transfers title with authoring credit intact
  (`authoring_events` unchanged); destroy with occupants inside reaps
  them safely and orphans the zone; the orphaned zone is re-bindable
  and dormancy-evicts when cold.
- **Guests and the group cell hold.** Guest grant → cross → act →
  exit round-trips with symmetric containment; revoke-while-inside
  reaps safely; a group-titled `/studio/` circle admits members and
  refuses non-members; shared authored truth persists across member
  sessions.
- **Comms round-trip.** A field player `tell`s someone inside a
  circle and it arrives; the reply lands; a channel message delivers
  exactly once (to the live body, never doubled); a Stuff reference
  obtained during a conversation still denies on a non-delivery
  dispatch.
- **Fork/merge holds.** The wire body mints with the forked slices
  (a `dm <friend>` resolves inside on forked contacts); a shadow
  that declares a follow re-establishes on the vessel and dies with
  it; one that doesn't is absent; contacts made in-circle survive
  exit while nothing material does.
- **Denials leave receipts.** A blocked cross-boundary dispatch or
  shadow attach produces a diagnostics event carrying caller
  module-id, receiver, and both scopes; the escape battery asserts on
  the receipts.
- **No new verbs ship.** `mud/cmd/` gains no file; the diff touches
  `clone.yaml`/`CloneController`, `eval.yaml`/`EvalController`, and
  `transfer` (group recipient) only. A wizard `goto`/`teleport` at a
  circle path is refused with a note pointing at the door.
- **The harness seam works.** A CMS-invokable entry launches a
  test session (fresh body), and reap-wholesale on exit leaves
  nothing but the edits.
- **Eval is jurisdiction-bound.** A circle-targeted eval that
  dispatches on a field object is denied with receipts, its template
  minted under the circle namespace and re-runnable. A
  `--parcel`-targeted eval by a committee member performs a real,
  receipted write **within** the parcel and is denied **outside** its
  extents; a non-member's `--parcel` attempt is refused; no invocation
  form runs without a named jurisdiction.
- **Group provisioning is governed.** The governance act provisions
  `/studio/<groupId>/`; a non-governor attempt fails; membership gates
  entry.
- **The audits are recorded.** The verified policy table, roots table,
  and singleton classification exist as durable artifacts (destined
  for `docs/subsystems/sandbox.md` at sweep).
- **Inertness is checkable.** With no live circles, the dispatch check
  short-circuits (code-review criterion: two loads, no walks) and no
  query gains a scope filter on PASS-only paths; full suite stays
  green with the seams installed.
- **Indexes exist.** Sparse/partial `circleScope` indexes on every
  STAMP/SHADOW collection; exit's `deleteMany` uses them.

## Cross-references

- Seeding slate: [sandbox-slate.md](../slates/builds/sandbox-slate.md)
  (the doctrine, four layers, walks, roots table, wardrobe recap)
- Subsystem docs: [persistence.md](../subsystems/persistence.md) ·
  [call-security.md](../subsystems/call-security.md) ·
  [residency.md](../subsystems/residency.md) ·
  [connection.md](../subsystems/connection.md) ·
  [parcel.md](../subsystems/parcel.md) ·
  [chattel.md](../subsystems/chattel.md) ·
  [zone.md](../subsystems/zone.md) ·
  [boundary.md](../subsystems/boundary.md) ·
  [access.md](../subsystems/access.md) ·
  [diagnostics.md](../subsystems/diagnostics.md) ·
  [document-store.md](../subsystems/document-store.md)
- Related slates (adjacent/later):
  [cms-slate.md](../slates/builds/cms-slate.md) (drafts → the overlay
  compose) · [property-slate.md](../slates/builds/property-slate.md)
  (compute → billing) ·
  [land-compute-and-license.md](../slates/builds/land-compute-and-license.md)
  (the pre-gate model)
