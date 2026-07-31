# Sandbox slate — the holodeck: anything goes, nothing escapes

**Captured 2026-07-30**, out of the sandboxing design session. This slate
**consolidates the scattered holodeck design into one authoritative
artifact**: [property-slate §§D–I](./property-slate.md) (the magic circle,
the wardrobe, the serialization boundary), the story-bible's administered
realm (wire/field, promotion), [cms-slate](./cms-slate.md)'s author→test
loop, and [land-compute-and-license](./land-compute-and-license.md)
Movement 1 (the pre-gate/post-gate split, the group-owned WIP cell). It
**is** the "sandbox/wardrobe slate" the apartment build defers to, and it
fills the never-written access-slate *Testing & the sandbox* section that
five docs point at. Those sources remain the archaeology; new design lands
here.

## The doctrine — two channels, and every real mutation is governed or void

There are exactly two ways an actor's work can touch durable state, and
the platform's anti-cheat is the *routing* between them:

- **The governed channel** — the published field: your committee's
  subdivision, your titled parcels, the commons. Mutations here are
  **real, lawful, and accountable**: they land in governed namespace,
  under real law (the civics build's "real law binds players"), with
  receipts (`authoring_events`, the ledgers, git history, the parcel
  chain-of-title). Cheating here is **possible but criminal** — a wizard
  who abuses code-trust in canon acts inside a jurisdiction that can see
  it, prove it, and prosecute it. Every standing derives on read;
  a disputed fortune has a ledger ([lenses/cheatability](../../lenses/cheatability.md)).
- **The sandbox channel** — the wire: your holodeck, a group cell.
  Mutations here are **real while inside and void at the boundary**.
  Cheating is **structurally impossible, not administratively
  forbidden** ([property-slate §E](./property-slate.md)) — safety never
  depends on trusting the actor, so it holds for wizards, for guests,
  and **by accident**. You cannot cheat in your sandbox even if you try,
  and you cannot un-cheat your way around the law by calling a governed
  act "a test."

The invariant, stated once: **every durable mutation is either governed
or discarded.** There is no third channel. That is why the sandbox can be
anything-goes: to move the real world you must step into the room where
the law is watching, and *that* act — not a permission bit — is what the
apparatus defends.

Corollary (this session's correction of an earlier framing): the threat
model is **not** wizard-gated. Content alone can cheat — a +5 sword, a
farmed transcript, a minted stamp — so the boundary must hold against
*content power and ledger writes*, not just code. Code-trust is the one
axis the sandbox never opens (below); everything else is contained by
structure, not review.

## What "anything goes" means — the two gates

The sandbox opens exactly one of the two orthogonal gates
([property-slate §G](./property-slate.md)):

| Gate | Protects | Sandbox opens it? |
|---|---|---|
| **Release / balance** | game balance (unreviewed content power in canon) | **Yes** — unreleased content *works* inside; rollback contains the leak. |
| **Code-trust (`isWizard`)** | server security (arbitrary TypeScript) | **No** — TS stays wizard-gated everywhere, sandbox included. |

Rollback contains *game state*, not *code execution* — a malicious class
could melt the box before any exit-reconcile. Hostile code is
`isolated-vm`'s job (roadmap, different mechanism, later). So "absolute
authoring authority" inside the sandbox = absolute over **content**
(compose, configure, script over the published command bus, author
unreleased templates), never over **code**. "No hacking, no code that
undermines the apparatus itself" is not a sandbox rule — it's the one
platform rule the sandbox inherits unchanged.

**Mutation-prohibition is rejected** as the safety mechanism. The sandbox
is a **test harness** as much as a playground — unreleased content must
*genuinely run* (an NPC fights, a shop sells, an augment fires, standing
accrues *within the visit*), or testing inside it proves nothing. Safety
comes from restore-to-baseline, not from a dead world.

## The mechanism — four containment layers over one magic circle

The circle ([property-slate §D](./property-slate.md)): *material* state is
domain-local, *epistemic/social* state is global. Inside a circle,
material state is fully real; it **does not cross out**, and the boundary
is **symmetric** — it binds the owner too, so the owner can't be the
cheater. No world-instancing: everyone stands in the same room; only the
*writes* are scoped.

**Layer 1 — bodies: the wire body; nothing crosses.** *(Settled
2026-07-30; retires property-slate §H's entry-snapshot reconcile.)* No
body crosses the boundary at all. Entering mints a **wire body** — a
disposable vessel carrying your **same identity** — and the Interactive
re-attaches to it (a third principal state on the shipped
Login→Avatar handoff seam, [connection.md](../../subsystems/connection.md));
the **real avatar parks where it stands, presence-frozen, exactly like
linkdead** (`onLinkdead` + presence-freeze, shipped) — and inherits the
full linkdead *protections*, since it stands unattended on the field
for the whole visit. Exit reaps the vessel wholesale and re-attaches
the parked avatar; die inside → reap and re-mint. This deletes the hard machinery the old design carried: no
serialization contract at the portal (the spine's documented limits —
shadows dropped, equip/unequip, live-refs — are moot when nothing is
saved or restored), no per-visitor entry-snapshot bookkeeping, any
number of doors trivially airtight, and crash/linkdead mid-visit is just
the parking state it already was. The matter boundary becomes absolute
and symmetric: **read-in allowed, write-out void** — capture is a read,
so you clone *copies* of field things you own to test against; nothing
material leaves in either direction, ever. Identity is the one thread
that crosses: the wire body acts as you for identity-keyed epistemic
state (beliefs / contacts / chronicle), while all material state lives
in the disposable vessel. Runtime state travels by an explicit
**fork/merge** protocol — objects fork themselves per-mixin
(presentation, implant, channel subscriptions, contacts), the
persistence spine's sibling; merge back is **epistemic-only**, and
shadows may opt to follow. And comms are **seamless**: messages are
epistemic, so they cross both ways (see the reach walk). The fiction
carries it natively — the wire projection, the aether's two bodies.

**Layer 2 — standing: circle-scoped ledger appends, discarded at
reconcile.** Character power is ledger-derived and timestamped, so
rollback of *earned* state is cheap: every ledger append made under a
circle's execution context carries the circle scope; exit **discards the
circle-scoped appends**. Two properties fall out:

- *Inside the visit, progression works.* Derive-on-read inside the circle
  reads global state ∪ circle appends — you can level, earn, and spend
  within the session, so the harness exercises the real advancement and
  economy machinery. The discard is at the boundary, not at the emit.
- *The stamp is the seam — and the seam is real.* *(Verified 2026-07-30.)*
  **`PersistenceManager` is the single Mongo boundary**: one
  `.collection()` call site in the entire server, collection names a
  typed enum in PM, and an existing **around-save/around-delete hook
  system keyed `(collection, operation)`** with `obj/hooks/` as its
  sanctioned module category. Raw-driver stragglers are down to
  **one** (`DiagnosticLogic`; `PackLogic` and `belief.ts` already
  flow through the facade — verified at plan time). So enforcement is **a per-collection policy
  table applied at PM** (the vocabulary below), driven by the circle
  scope on the ExecutionContext — one seam, below every producer
  (accountability's producers-not-chokepoint shape included), never
  per-writer discipline. Stamping ships **before** the holodeck exists
  and is inert until a circle does; retrofitting scope onto grown
  ledgers later is the expensive path. Riders: an **orphan sweeper**
  (a crashed session never reconciles — sweep scoped rows of dead circle
  sessions, residency-style, TTL as belt) and **scope-aware
  conservation** — which is a feature: the circle can freely mint
  scoped play-money for testing (it evaporates), no need to fund a test
  shop from your real balance.

**Layer 3 — the room: authored truth is the baseline.** The sandbox's
durable content is what you **deliberately saved** — templates and
documents in your `/home/<playerid>/` namespace (the three trees;
write-authority follows namespace ownership). Its *runtime* is
disposable: instances materialize from authored truth on entry, clutter
evaporates, and the cold circle **evicts to nothing** on the landless
residency graph (already shipped). "Exit restores the baseline" is not a
diff-and-undo pass — it's re-materialization from the authored record.
Persist-by-saving, never persist-by-happening; in the CMS loop's words,
**nothing persists but the edit**.

**Layer 4 — reach: the boundary policy on live dispatch.** *(Settled
2026-07-30, same session.)* The channel the other layers miss: circle
context calling a mutator on a live **field** object — a minted weapon's
`addSpell()` against someone outside — launders past the PM seam,
because the durable write happens later, through the *target's* own
save path, in field context. Reachability only soft-constrains it
(system-mode MQL, registries, and stashed live refs all yield
out-of-circle references). Per-method guards ("`addSpell` checks its
caller") are the wrong altitude — N-mutator discipline, reopened by
every new mixin. The check lives **once, at the call-security proxy's
dispatch site** — the single `new Proxy` site in the server
(`api/proxy.ts`; verified 2026-07-30): on method dispatch, the
ExecutionContext's circle scope must equal the receiver's
(zone-derived); mismatch → deny.

- **Symmetric** — field context cannot dispatch into a circle either
  (the privacy half; the wire is closed both ways). Two exceptions
  only: **system root** (maintenance must reach in — the residency
  sweep evicting a cold circle is how circles die) and the governance
  inspection channel the wire-privacy doctrine already requires: a
  `FromModule`-gated, logged aperture — due process, not a hole.
- **Infrastructure-exempt — with one caveat.** `ApiLogic` singletons
  and registries carry no zone and stay callable from anywhere; any
  *world object* an Api touches on the caller's behalf is re-checked
  at that object's own proxy, and any durable write hits the PM
  policy — so the composition holds without auditing every Api. The
  caveat: some exempt singletons hold **mutable in-memory state that
  field code later reads** (catalogues, registries, caches) — circle
  code poisoning those crosses the boundary with no Mongo write and no
  world-object dispatch. The exemption criterion is therefore
  **"stateless or scope-aware,"** and the writable ones get scope
  checks at their mutation methods — the one place per-method guards
  are right, because the proxy deliberately waves these callers
  through.
- **A smuggled reference is worthless** — containment lives at
  dispatch, not reference hygiene. Lookup filtering (circle context
  resolves in-circle) is hygiene; the proxy is the backstop.

*The honest floor:* field-shaped access (`obj.field = x`) bypasses the
proxy by design (the Hydrator needs public persistent fields). But
content, compositions, and scripts over the command bus — everything
below raw TS — act only through verbs, Apis, and methods, all
proxy-dispatched. So Layer 4 contains every actor up to and including
a *sloppy* wizard; a **deliberately evasive** wizard poking fields in
raw TS is below the floor — exactly the `isolated-vm` boundary this
slate already defers to. The gain: cheating stops being a well-typed
call that happened to work and becomes code written specifically to
evade the apparatus. (Precedent if the audit flags hot fields worth
hardening now: `#templatePath` / `#zone` are already hard-private with
bracket-writes as runtime no-ops.)

*Enforcement semantics — taint, not stack inspection.* We never walk
call stacks. Stack-walking security (Java's SecurityManager, .NET CAS)
was abandoned industry-wide because stacks lie — callbacks detach from
their registrar, async hops erase frames — and Node's async model has
no meaningful cross-`await` stack anyway. Circle scope is an **ambient
taint on the ExecutionContext**, set once at the execution's *root* and
never changed mid-flight (the AsyncLocalStorage shape PM's hook
re-entry guard already uses). Purity then holds **by induction, not by
scanning**: the boundary policy is a one-hop check at every proxy
dispatch, so a chain that starts pure stays pure — impurity is denied
at the exact hop where it would enter. Consequences:

- **A circle frame under a field root is a contradiction, not a
  suspicion.** Zero tolerance, fail closed, no runtime adjudication:
  every boundary denial is a diagnostics event carrying full receipts
  (caller module-id, receiver, the scope pair). Mixed scope is
  definitionally a propagation bug or an attack; both get deny + log +
  alarm.
- **Scope transitions happen only at roots.** The portal crossing is a
  root-level principal switch (the wire body attaches), never a
  mid-stack change; there is no call a function can make that enters
  or leaves a scope.
- **Continuations carry their birth scope.** Anything registered from
  circle context — timer, hook, handler — either re-establishes circle
  scope when invoked (the `ScheduleApi`/`runRoot` propagation
  precedent) or is refused at registration. Below raw TS this is
  airtight: scripts ride the command bus, brains fire under their
  owner's context, hooks live on Stuff — every executable thing is
  attached to an owning object or fired through a seam we control. A
  wizard hand-rolling a naked closure in raw TS is below the floor
  (`isolated-vm`), unchanged.

Privacy rider (locked earlier, restated): "traceless" means **no
shared-world footprint, not jurisdictional immunity**. The circle is
socially/spatially private, but government CAN and MUST inspect on abuse
via the governance channel, due-process and logged — the live zone and
its authored namespace are the inspectable record.

## The ledger walk — first classification, as a PM policy table

Resolving property-slate §D's open "material-vs-epistemic enumeration."
Enforcement is **one policy per collection, applied at
`PersistenceManager`** — four verbs:

- **STAMP** — circle-context appends carry `circleScope`; field reads
  filter them out, circle reads include them (progression works inside);
  exit = one `deleteMany({circleScope})`.
- **REFUSE** — the write cannot originate from circle context at all
  (title, governance, conviction). With the wire-body model most of
  these have no path to fire anyway; the refusal is the belt.
- **PASS** — writes through unscoped (the epistemic set + the
  mechanism's own stores), scope-*marked* where noted.
- **SHADOW** — the tricky residue: current-state rows a circle session
  must genuinely mutate. A circle write lands in a scoped shadow row;
  circle reads compose **live ∪ overlay, overlay wins** — the CMS
  draft-overlay shape applied to runtime rows. Expected to be a small
  set (the rebuildable caches can also simply skip in circle and
  rebuild); its exact membership is a Phase-0 output.

Draft classification; Phase 0 verifies writer-by-writer.

**Material — STAMP/REFUSE (discarded or impossible):**

| Ledger | Policy | Note |
|---|---|---|
| `bank_ledger` / accounts / supply | STAMP | balances restore; scope-aware conservation lets the circle mint scoped play-money freely — it evaporates |
| `transcripts` | STAMP | competence earned inside reverts (the §D "levels" line) |
| `renown_events` | STAMP | §D explicit: reputation earned inside does **not** persist |
| `participation_events` | STAMP | wire time is not field standing (compute billing is separate and real) |
| `disposition_events` | STAMP | trait drift inside reverts — symmetric lean, edge-flagged below |
| `producer_events` | REFUSE | should never append — the faucet is release-gated ("unreleased earns nothing", provenance-slate) |
| `chattel` / `chattel_events` | REFUSE | no stamps mint inside; nothing carried crosses (wire body), so there is no carried-in case at all |
| `positions` | REFUSE | conviction is field governance |
| `contracts` / `contract_events` | REFUSE | a contract is void unless both ends are field-side; escrow refuses circle counterparties at formation |

**Epistemic — PASS (persists, wire-marked):** every epistemic record
formed in-circle carries the wire mark — not just chronicle. The
quarantine protects *mechanics*, not gullibility: a host can stage
scenes for guests (authored NPCs, staged "witnessed" events), so the
field must always be able to tell wire-witnessed from field-witnessed.

| Ledger | Policy | Note |
|---|---|---|
| `chronicles` | PASS | what you did in the wire is still part of your story — deeds persist marked wire-scoped; claim/deed presentation edge below |
| `beliefs` | PASS | recognition/having-met persists — the wire body carries your identity, so you really met the person |
| `contacts` | PASS | persists |
| `authoring_events` | PASS | authorship of what you built inside is real and immutable — it just **earns nothing until release**; credit fires with the producer faucet at publish, not at sandbox-save |
| `accountability_events` | PASS | the record persists (the due-process inspection channel *requires* it); how blame-derives weigh circle-scoped harm is the consent edge below |

**Infrastructure — the mechanism itself:**

| Store | Policy | Note |
|---|---|---|
| `holder_snapshots` | PASS | circle hosts persist under their own `(scope, key)` — the authored workshop, not visit state |
| `parcels` / `parcel_events` | REFUSE | nothing inside mints title (landless); the circle's *own* title row is field-side metadata about the circle |
| `documents` (`/home/` tree) | PASS | the authored truth — Layer 3's baseline; deliberate saves are the point |
| rebuildable caches (`renown`, `participation`, `producer`, `bank_accounts`, …) | SHADOW *or skip* | derive-on-read tolerates a stale cache in-circle; rebuild is free — decide per cache in Phase 0 |

## The reach walk — every channel of out-of-circle effect

Layer 4's audit is the sibling of the ledger walk — not "every mutator
like `addSpell`," but **every channel by which circle context can cause
out-of-circle effect**. The list is short, and most rows are one-seam
items:

| Channel | Coverage |
|---|---|
| Live method dispatch | the boundary policy — one check at the proxy (Layer 4) |
| Durable writes | the PM policy table (Layer 2) |
| Deferred execution (`ScheduleApi` timers, engagements) | circle scope **propagates** with the ExecutionContext (the `runRoot`/`causingCommandId` precedent); circle-scoped handles **cancelled at reap** |
| Comms (scenes, dm/tell, channels) | **seamless** (revised 2026-07-30): messages are epistemic, so delivery is an explicitly allowlisted cross-boundary channel carrying rendered MML only (no Stuff refs), with recipient resolution following identity → active body. Implant-blindness means *not surveillable*, not unreachable. Room-scoped `Vocal` doesn't cross for the ordinary reason: you aren't in the room |
| MQL subscriptions / client push | circle subscriptions die at reap |
| Lookup surfaces (MQL, registries) | hygiene filter — circle context resolves in-circle; the proxy backstops leaks |
| Mutable in-memory state on exempt infrastructure (catalogues, registries, caches) | the exemption caveat — "stateless or scope-aware"; the writable ones get scope checks at their mutation methods (the one sanctioned per-method case) |
| Shadow installation (`@ShadowSecurity` attach/detach) | attach is host-targeted and centrally policy-resolved (SecurityApi) — the boundary rule applies at that seam: context scope must equal the *host's* scope, so circle code can never shadow a field object nor field code a circle one (system root + the inspection aperture excepted, as everywhere). Circle-installed shadows are runtime-only and die with the reaped vessel/zone. No class-scope shadow surface exists; if one is ever added it inherits the rule. |
| Raw TS | below the floor → `isolated-vm` (deferred, unchanged) |

The Phase-0 audit's reach half is verifying this table is exhaustive —
that there is no tenth channel (nine are listed) — not
enumerating mutators.

**The roots table.** Every execution bottoms out at one of a small,
enumerable set of root kinds; each stamps scope at birth (this is where
the taint model's "purity by construction" is anchored, and the reach
audit verifies this table alongside the channels):

| Root | Scope comes from |
|---|---|
| Command dispatch from an Interactive | the acting principal — a wire body carries its circle, a field avatar carries none |
| `ScheduleApi` / `runRoot` callbacks | inherited from the scheduling context — explicitly propagated; circle-scoped handles die at reap |
| NPC brain fire / behavior cadence | the NPC's own residence — a circle-resident NPC acts with circle scope |
| Boot, framework lifecycle, maintenance sweeps | system root — omni-scope (what lets residency evict cold circles through the symmetric check) |
| WS/REST entry (the CMS session-attribution bridge) | the session's principal |

## Performance posture

The containment layers sit on the two hottest paths in the engine
(method dispatch, Mongo writes), so the cost model is a design
constraint, not a plan afterthought:

- **The dispatch check is O(1) or it's wrong.** An ALS read + two field
  compares. The design requirement: **receiver scope is a stamped
  field** — stamped at mint, restamped on the rare move (the cost-owner
  restamp precedent) — never a zone-chain walk per dispatch. And
  `null == null` short-circuits: pre-holodeck the check is two loads,
  and field↔field dispatch (the overwhelming majority forever) pays the
  same.
- **The write seam is noise; the *read filter* is the real concern.** A
  map lookup per write disappears next to Mongo I/O. But injecting
  `circleScope`-absent into field-side queries touches index usage:
  STAMP/SHADOW collections need **sparse/partial indexes on
  `circleScope`** so field reads stay covered and exit's
  `deleteMany({circleScope})` never scans. Per-session *collections*
  are rejected outright (the Atlas ~500-collection cap + index
  duplication) — same-collection + scope field is the shape.
- **SHADOW is the only structurally expensive semantics** (overlay-wins
  reads) — which is why its membership is minimized at Phase 0 and
  caches prefer skip-and-rebuild.
- **The wire body is per-crossing, not per-action.** A char-gen-order
  mint (milliseconds) at portal entry; parked avatars are
  linkdead-shaped memory the engine already prices; circle zones are
  lazy/dormant under residency.
- **Denials are exceptional by definition** (bugs or attacks), so
  receipts-on-denial cost nothing in the steady state.

## The wardrobe — the delivery vehicle (recap of §G/§H)

Summarized from property-slate, with a 2026-07-30 simplification: **the
wardrobe is just an exit.** The fixture's template carries a
**template-path destination** (the circle's zone path) — the ordinary
interzone-exit shape, content over the boundary substrate; the only
sandbox-specific machinery is the traversal hook that runs the
crossing. Skins (wardrobe, turbolift, mirror, drafting table) are pure
`Visible`/`Detailed` data. **Storage-unit-and-key** survives as the
ownership split: the fixture (chattel) is the *access*; the circle zone
(parcel) is the *asset*; the exit-to-canon resolves live to the
fixture's current location.

**Minting:** the personal circle is **never provisioned** — character
creation is the grant (`selfHomeOwnerOf` pure rule over
`/home/<playerId>/`, no parcel row, no act), with the zone
materializing lazily under residency. **Group circles are the
opposite**: provisioned by a governance act over `/studio/<groupId>/`
(office substrate) — personal space is a right, group space is a
grant. Move it → portable pocket dimension; sell empty (buyer mints a
fresh zone) or furnished (title + allowance-liability transfer; authoring
credit stays with the seller); destroy → reap any wire bodies present
(occupants simply re-attach to their parked avatars — the wire-body
model makes "evacuation" a non-event), then **orphan, don't destroy**.
Every maker gets one
circle from char-gen — the un-grown `HomeZone` self-home
(`selfHomeOwnerOf`, shipped) — with named projects inside it; the
canonical dwelling is NOT the sandbox (the holodeck is never a furniture
warehouse; the field home carries a door to it).

## The test harness — the CMS loop

The authoring loop this slate exists to serve: build in the CMS (or your
editor) → **test in the holodeck** → back to authoring. The CMS
launches/embeds a holodeck session against the running game —
**park-real-avatar, fresh test body, reaped wholesale**, which is no
longer a harness special case: it **is** Layer 1, the one crossing
mechanism every visit uses. Unreleased brains hot-reload into the circle
(behavior kept
brain resolution purely path-driven for exactly this). The **draft
overlay composes**: load a team changeset inside a circle to test the
zone *as it will be*, pre-publish. Exit: nothing persists but the edit.

**Eval is jurisdiction-targeted** *(2026-07-30)*: `eval
[--parcel <path>]`, default `/home/<self>/` — **one selector, never
unscoped** ("eval against anything" is the hole). A sandbox is just a
parcel on the wire, so one rule covers everything: the target is a
parcel; the gate is authority over it (`ownerOf` + `AccessApi.can`,
dispatching on owner kind — self-rule, group membership, committee);
the disposition falls out of the parcel's kind. Wire parcel → the
template mints there, execution carries circle scope, the four layers
quarantine it. Field parcel you administer → writes are *real*, reach
is bounded to the parcel's extents (the boundary check generalizes
from scope-equality to authority-domain membership), and the act is
receipted — the two-channel doctrine in one command: wire evals are
discarded, governed evals are lawful and accountable. Code-trust
(`isWizard`) required for every target — jurisdiction gates *where*,
never *whether*.

One honest edge, stated so nobody assumes otherwise: **the circle
contains new content at new paths — it does not contain edits to
*published* source.** Saving a change to a published brain/class changes
the live engine's code globally (the working tree *is* the live server —
[git-workflow.md](../../subsystems/git-workflow.md)'s snapshot-and-push
finding); the holodeck lets you *exercise* the edit safely, but the
edit itself is a field act on the governed channel, contained by
receipts and review, not by the circle. Draft overlays are the
containment story for content; for code it's git + the wizard axis.

## Shared circles — guests and the group cell

The stretch goal from this session — "extend trust so two players' homes
can mutate each other" — is **resolved as unnecessary**. Two private
universes with a trust protocol between them is heavy machinery for what
"stand in one circle together" gets free:

- **Guests**: invite into *your* circle — the shared-holodeck case,
  **symmetric rollback** (the boundary binds host and guest alike),
  access-controlled by your parcel. Guests project in like anyone else —
  wire bodies, real avatars parked at home; nothing crosses with them in
  either direction.
- **The group cell**: a circle whose parcel is **group-titled** — the
  land-compute "group-owned WIP space," an ownership question, not a new
  kind of land or a new mechanism — and **provisioned by governance**
  (office substrate), never self-serve: personal space is a right, group
  space is a grant. This is where committee/team content stages before
  publication (the eventual group-managed exemplar: the lounge / EU).
  Namespace resolved 2026-07-30: a dedicated `/studio/<groupId>/`
  branch; `/home/` is always personal.

Decision recorded: **no home-to-home trust extension.** Collaboration =
co-presence in one circle, personal or group-titled.

## Phasing

**The build cut (decided 2026-07-30): one maximal build.** All phases
ship in a single build cycle
([sandbox-requirements.md](../../requirements/sandbox-requirements.md));
the phase list below survives as **internal wave ordering** only. The
wizard-gated `sandbox` verb ships alongside the wardrobe as the
author's permanent fast door. The only exclusions are the two true
external dependencies: **draft-overlay compose** (waits on the CMS
drafts/changeset build) and **compute billing** of circles (property
Phase 1).

**The escape battery — the verification story.** The reach walk's
channel table doubles as an **adversarial test matrix**: every channel
row ships attempted-escape tests (the roadmap's "sandbox escape tests"
line, made concrete), and every containment finding in this slate is
closed only by a failing-then-passing escape test. The battery is a
first-cycle deliverable alongside the seams, and it's the regression
net every later phase runs under.

1. **Phase 0 — the two audits.** *Write-path:* verify the policy table
   writer-by-writer against PM's typed surface; fold the three
   raw-driver stragglers (`DiagnosticLogic`, `PackLogic`, `belief.ts`)
   onto it; enumerate SHADOW's exact membership; flag unique-index and
   conservation-check interactions with scoped rows. *Reach:* verify
   the channel + roots tables are exhaustive — enumerate every
   context-minting seam (`runRoot` callers), every comm dispatch seam,
   and every exempt singleton holding mutable state field code reads
   (classify each stateless / scope-aware / needs-a-guard). Cheap, mostly
   reading, and it does *not* wait on advancement maturing —
   derive-on-read means future semantics ride the same appends; only the
   write surface matters, and it exists today at one seam.
2. **Phase 1 — the policy seam at PM.** Circle scope on the
   ExecutionContext → STAMP/REFUSE/PASS/SHADOW enforcement +
   read-filter injection + discard-on-reconcile + the orphan sweeper.
   Ships inert (no circle exists yet); zero player-visible change; the
   earlier this lands the cheaper it stays.
3. **Phase 2 — the boundary policy.** The proxy dispatch check
   (context scope == receiver scope, symmetric, infrastructure-exempt,
   the gated inspection aperture) + scope propagation across the async
   seams + reap-cancellation of circle-scoped schedule handles and MQL
   subscriptions + the comms delivery allowlist + lookup-surface
   hygiene. Also ships inert until a circle exists.
4. **Phase 3 — the wire-body crossing.** Mint / park / re-attach / reap:
   the vessel mint, the Interactive's third principal state on the
   Login→Avatar handoff seam, linkdead-style parking of the real
   avatar, reap-wholesale on exit and death.
5. **Phase 4 — the circle + wardrobe.** The runtime subdivide/claim
   primitive mints the zone; the wardrobe exit-fixture + skins; the
   universal circle (by rule, no provisioning act); landless dormancy → eviction (already shipped)
   picks up the cold tail.
6. **Phase 5 — the harness integration.** CMS test button, draft-overlay
   compose, brain hot-reload into the circle.
7. **Phase 6 — shared circles.** Guest access control; the group-titled
   cell.

## Open questions

- **Chronicle presentation** — a wire-scoped deed persists, but how does
  the `chronicle` verb render it ("slew a dragon *of their own
  authoring, in the wire*")? Deed vs claim treatment for in-circle feats.
- **Accountability & consent** — is entering a circle consent to its
  owner's rules? A guest harmed by a host inside: the event record
  persists either way; what do blame-derives make of circle scope?
- **Disposition symmetry** — trait drift from in-circle acts reverts
  under the symmetric rule, but "your personality is always you" argues
  it persists like belief. Leaning revert (symmetry beats philosophy
  until a case proves otherwise).
- **What the wire body mints with** — appearance/species copied at entry
  (a read, fine), but do augment-conferred capabilities project (read-in
  copies of your rig) or does the vessel start baseline? Baseline is
  purer; copies make the harness honest about testing *as yourself*.
- **SHADOW mechanics** — the exact overlay-read composition, unique
  indexes that must gain `circleScope` in their keys, and which
  conservation checks go scope-aware vs scope-exempt.
- **Deny-all vs a read allowlist at the boundary** — deny-all dispatch
  is safer and simpler; "read-in" can ride the gated seeding aperture
  instead of free cross-boundary getters. Does any harness case
  genuinely need live reads of field objects?
- **The infrastructure-exemption criterion** — "carries no zone" as the
  test vs an explicit scopeless marker on `ApiLogic`/registries; pick
  the one that fails closed when a new module category appears.
- **Async propagation coverage** — every seam that mints a fresh
  ExecutionContext must carry circle scope; the Phase-0 reach audit
  enumerates them, but the *mechanism* (ambient vs explicit) is a plan
  decision.
- Carried from property-slate §D/§E, still open here: **what counts as
  "power"** for the release gate (augments clearly; crafted `Grade`,
  conferred verbs, standing — or do they route through augments/ledgers
  free?); **combination exploits** (two safe primitives, unsafe together
  → governance backstop, not a gate); **instancing** (only if ever needed
  beyond ledger-quarantine).

## What this slate does NOT cover

- **Promotion / chartering** (wire → field as a Lands & Works office
  act, the civic + technical gates) → story-bible § the administered
  realm + the civics build. This slate ends at the publish gate's door.
- **The publish/review gate itself** (drafts → changeset → forums
  review → atomic go-live) → [cms-slate](./cms-slate.md) (law == code).
- **Hostile code / `isolated-vm`** → roadmap Framework 13. Until then,
  code authorship stays wizard-tier everywhere. Layer 4 raises the bar
  so that cheating requires *deliberately evasive* raw TS, but the
  floor under that bar is `isolated-vm`'s to build.
- **The compute economy** (allowance-gated circle size, billing,
  degradation) → [property-slate](./property-slate.md) Phase 1. Circles
  are compute-priced from birth; the meter is property's build.
- **The canonical dwelling** (apartment / dorm / furnishing) → the
  apartment build. The home is field property; this slate is the thing
  behind its wardrobe door.
