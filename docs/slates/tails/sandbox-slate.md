# Sandbox slate — the holodeck: anything goes, nothing escapes

> **Status: PARTIAL** — the containment layers, the wire-body crossing,
> the wardrobe, jurisdiction-targeted eval, and shared circles (guests +
> the group-titled cell) all shipped →
> [sandbox.md](../../subsystems/sandbox.md)
> **Left:** chronicle presentation of wire deeds · what counts as
> "power" at the release gate + combination exploits + instancing ·
> draft-overlay compose · circle transfer (move / sell an owned circle)
> · the governance inspection aperture's missing caller
> (`SecurityApi._armInspectionBypass` exists, `SandboxApi.inspect` does
> not — flagged, not designed here) · ⭐ the **scratch subject** — a
> disposable thing to try something on (below)
> **Size:** a tail

**Captured 2026-07-30**, out of the sandboxing design session. This slate
**consolidates the scattered holodeck design into one authoritative
artifact**: [property-slate §§D–I](../builds/property-slate.md) (the magic circle,
the wardrobe, the serialization boundary), the story-bible's administered
realm (wire/field, promotion), [cms-slate](../builds/cms-slate.md)'s author→test
loop, and [land-compute-and-license](../builds/land-compute-and-license.md)
Movement 1 (the pre-gate/post-gate split, the group-owned WIP cell). It
**is** the "sandbox/wardrobe slate" the apartment build defers to, and it
fills the never-written access-slate *Testing & the sandbox* section that
five docs point at. Those sources remain the archaeology; new design lands
here.

*The two-channel / two-gate doctrine, and why mutation-prohibition was
rejected as the safety mechanism, are now stated in
[sandbox.md § Doctrine — two channels, two gates](../../subsystems/sandbox.md).*

## The mechanism — four containment layers over one magic circle

*Shipped and documented in far more detail than this design sketch
carried — see [sandbox.md § The scope taint](../../subsystems/sandbox.md),
§ The write-path policy table, § The roots table, § Exempt-singleton
classification, and § The crossing (as built).*

Two claims from the design sketch the code audit could not fully
confirm are kept here rather than cut (everything else in this section
matches the as-built doc closely and was cut):

- **Symmetric** — field context cannot dispatch into a circle either
  (the privacy half; the wire is closed both ways). Two exceptions
  only: **system root** (maintenance must reach in — the residency
  sweep evicting a cold circle is how circles die) and the governance
  inspection channel the wire-privacy doctrine already requires: a
  `FromModule`-gated, logged aperture — due process, not a hole.

Privacy rider (locked earlier, restated): "traceless" means **no
shared-world footprint, not jurisdictional immunity**. The circle is
socially/spatially private, but government CAN and MUST inspect on abuse
via the governance channel, due-process and logged — the live zone and
its authored namespace are the inspectable record.

*Verification note: `SecurityApi._armInspectionBypass` (the due-process
latch this describes) exists in `api/security.ts`, but its documented
sole caller, `SandboxApi.inspect`, does not exist in `api/sandbox.ts` as
of this pass — the aperture's gate is unfinished. Flagged for the
coordinator; not fixed here.*

*The ledger walk, the reach walk, the roots table, and the performance
posture (indexing, O(1) dispatch, no per-session collections) all
shipped and are documented — verified writer-by-writer, in more precise
and current form than the draft classification here — in
[sandbox.md § The write-path policy table](../../subsystems/sandbox.md),
§ The roots table, § Read filters, discard, indexes, and § Exempt-
singleton classification.*

## The wardrobe — the delivery vehicle (recap of §G/§H)

*The wardrobe-as-exit mechanism, its skins, and the storage-unit-and-key
ownership split all shipped — see
[sandbox.md § The door, the aperture, the harness](../../subsystems/sandbox.md)
("A wardrobe is a skin, not the class" + "The public-booth rule").*

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

*Jurisdiction-targeted eval, and the "new content vs. edits to published
source" edge case, both shipped and documented — see
[sandbox.md § Jurisdiction-targeted eval (Decision K)](../../subsystems/sandbox.md)
and the "One honest edge" bullet beside it.*

*Shared circles (guests + the group-titled `/studio/<groupId>` cell,
and the no-home-to-home-trust decision) shipped and documented — see
[sandbox.md § Shared circles — guests and the group cell](../../subsystems/sandbox.md).*

## Phasing

*Superseded by the shipped build — all phases (0–4, and the "shared
circles" half of Phase 6) landed in the single build cycle documented
throughout [sandbox.md](../../subsystems/sandbox.md), including the
escape battery (`pnpm test:escape`, § The escape battery). The two
exclusions this section named are still real: **draft-overlay compose**
remains unbuilt (kept above, in the test-harness section) and
**compute billing** stays property-slate's, out of scope here (below).*

## ⭐ The scratch subject — a disposable thing to try something on

**Captured 2026-09-25**, from the template-inheritance build. The ask,
in the owner's words:

> *"eval a template into existence temporarily, call something in it,
> and then it gets dested or whatever next you want to happen to it"*
> — with the eval's own row `extends:`-ing an existing row, overriding
> `class:` because the eval is its own program.

### ⛔ The literal shape does not work, and inheritance shipping is why

`extends:` landed 2026-09-25 and **cross-class parenting is legal** —
D16 kept it deliberately, since every dressed `Cast` row extends a row
whose class is `Extra`. So `extends: /some/row` plus `class:
/platform/idea/EvalScript` parses fine.

⚠ What it produces is **orphan data keys**. The parent's `data:` is
merged in, `EvalScript` declares none of those fields, and the Hydrator
discards them in silence — which is exactly the harm D16 gated:
`check-instanceable-placement` invariant 12 refuses a key the effective
class does not declare, on a ratchet. An eval row extending a chair row
would be caught by the gate, and correctly. The inheritance link is the
wrong tool because **the eval script is not a kind of chair.**

### What already works

Cloning a row inside a circle. `StuffApi.clone(path)` is available to
in-circle code, the circle's containment layers keep the result inside,
and the taint rules already say what may cross out. *"Make me one of
those and let me poke it"* is a call, not a feature request.

### ⭐⭐ So the feature is the two things the ask actually wanted

1. **Guaranteed disposal.** *"…and then it gets dested"* — the scratch
   subject goes away when the scratch is over, whatever happens in
   between, including a throw, a disconnect, or a script that forgets.
   Today nothing reclaims a clone an eval leaves behind, and the circle
   accumulates. This is the real substrate: a disposal scope, not an
   inheritance link.
2. **Where it lives while alive.** A scratch subject has to be
   *somewhere* — in the circle, in the caller's hands, nowhere at all —
   and the answer decides whether it is reachable to MQL, visible to a
   guest in a shared circle, and whether the residency sweep can evict
   it out from under the script.

### Open questions

- **Scope shape.** A block the script opens (`withScratch(path, fn)` —
  disposal on exit, the `ExecutionContextApi.runRoot` precedent), or a
  lifetime pinned to the eval invocation and reaped after it? The first
  is honest about nesting; the second needs no author discipline.
- **Does disposal mean `destruct`?** A scratch subject that composes
  `Persistable` or holds a chattel id has state that outlives it. The
  clean answer is probably that a scratch subject may not be persistable
  — and that is a refusal an author should read, not discover.
- **Guests.** In a shared circle, is another guest's scratch subject
  visible? It is somebody's half-finished experiment, and the answer is
  the same shape as the draft-overlay question above.
- **Does it need a verb at all**, or is it purely an in-script call? The
  ask was phrased as scripting, and adding a verb would put a disposal
  scope in the player's hands with nothing to anchor its lifetime to.

⚠ **Not** an argument for `extends:` on an eval row. If a scratch
subject wants a parent's *data* it should clone the parent and patch
the clone — which is the positive rule `antipatterns.md` now states for
`StuffApi.create`.

## Open questions

- **Chronicle presentation** — a wire-scoped deed persists, but how does
  the `chronicle` verb render it ("slew a dragon *of their own
  authoring, in the wire*")? Deed vs claim treatment for in-circle feats.
- Q: *Accountability & consent* — resolved: `sandbox.md` § "Death inside
  a circle" + § "The accountability row is now actually WRITTEN"
  (2026-09) — `deriveBlame` ignores circle-marked `accountability_events`
  rows entirely, so no conviction can result from in-circle harm either
  way; the consent question is moot because nothing is ever adjudicated
  from it.
- Q: *Disposition symmetry* — resolved: the shipped write-path policy
  table classifies `disposition_events` **STAMP** (reverts at exit) —
  symmetry won, as this slate leaned.
- Q: *What the wire body mints with* — resolved, and superseded with
  more current detail: `sandbox.md` § "The crossing (as built)" lists
  more fork slices than this slate knew (Presentation, Contacts,
  Embodiment, ClientState, Environment/Alias), plus a later fork-only
  material family (Vitals/Trauma/CauseOfDeath/Anatomy) added by the
  mortality build — see `sandbox.md` § "Death inside a circle".
- Q: *SHADOW mechanics* — resolved: `sandbox.md` § "Unique-index /
  conservation interactions" — no unique index gains `circleScope` in
  this build; conservation is scope-aware at the `postTransaction`
  chokepoint via a per-scope balance overlay; overlay-mode reads are
  specified as the labeled attach point but no shipped collection needs
  it (all five SHADOW rows are skip-and-rebuild).
- Q: *Deny-all vs a read allowlist* — resolved: `sandbox.md` § "The read
  aperture (`SecurityApi.projectAcross`)".
- Q: *The infrastructure-exemption criterion* — resolved: `sandbox.md`
  § "Exempt-singleton classification".
- Q: *Async propagation coverage* — resolved: `sandbox.md` § "The roots
  table".
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
  review → atomic go-live) → [cms-slate](../builds/cms-slate.md) (law == code).
- **Hostile code / `isolated-vm`** → roadmap Framework 13. Until then,
  code authorship stays wizard-tier everywhere. Layer 4 raises the bar
  so that cheating requires *deliberately evasive* raw TS, but the
  floor under that bar is `isolated-vm`'s to build.
- **The compute economy** (allowance-gated circle size, billing,
  degradation) → [property-slate](../builds/property-slate.md) Phase 1. Circles
  are compute-priced from birth; the meter is property's build.
- **The canonical dwelling** (apartment / dorm / furnishing) → the
  apartment build. The home is field property; this slate is the thing
  behind its wardrobe door.
