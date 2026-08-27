# Power-utility slate — electricity as municipal infrastructure

**Captured 2026-07-28**, out of the demo-content requirements
session: authoring the crossing's lamppost raised "do we need to
model electricity as a utility?" — deferred deliberately, captured
here. This is greater-Terminus design (economy + governance), not a
content beat.

## Where the model stands

Electricity is **local physics, no network**: each `Energized`
thing carries its own potential ([electricity.md](../../subsystems/electricity.md)
— the Ohm's-law core, the conduction walk, SustainedShock, the
FloodedCell). Honest at the fixture; nothing connects the lamp to
the substation. The demo-content build keeps it that way (the
lamppost is locally Energized; its plate carries a **maker's mark +
"120 V"**, not a utility's name — nothing canonized by signage).

## Where the fiction already leans utility-ward

1. **The substation exists as content** (`seeds/world/substation/`
   — Foundry Row's flooded switch-cell).
2. **The electrician's daily loop** (wishbook): "walk the row's
   fixtures, `analyze` for wear and wet, swap what's failing,
   invoice the parcels' owners" — that is utility maintenance work.
3. **The storm contract** (wishbook vignette 2 / video cohort cut):
   "re-energize the substation before the front" — a gig whose
   *point* is restoring supply. With no network, completing it
   changes nothing anywhere else; the stakes are narration, not
   state.

## The middle tier (the likely v1)

Not wires, not metering: a **supply reference**. An `Energized`
fixture may declare its source — a resolve-on-read identity ref
([ref-shapes.md](../../ref-shapes.md)) to a substation —
and the source's state gates its dependents:

- The substation goes down → Foundry Row's lamps go dark. The
  storm contract acquires real consequences.
- **Outages become events that mint honest work orders** — the
  weather → wetness → circuit chain already exists; an outage is
  its downstream, and the contract board its consumer
  ([contract.md](../../subsystems/contract.md)). The maintenance
  round formalizes from fiction into a standing gig.
- Fixtures without a declared source stay locally Energized —
  the current model remains the honest default; the ref is
  opt-in per fixture.

> **⭐ The physical layer above the ref (added 2026-07-31)** —
> [delivery-slate § Distribution](./delivery-slate.md) resolves how
> supply actually *reaches* a point: **coverage is legal, connection is
> physical.** The prefix claim stays the **franchise area**; the
> **distribution network is edge attributes on exits** (which exits
> carry which service), so connectivity derives from a walk — the same
> trick as freight's emergent road network, with **zero new topology**.
> The payoff for this slate: **the supply ref can only fail wholesale,
> but a network fails locally and directionally** — the line to
> Wharfside is cut and *only Wharfside* goes dark, which is what gives
> the storm contract's work orders **a place to be** and the linemen
> **somewhere to go.** Utilities follow the road because of
> **rights-of-way**, which makes the easement (and the **holdout
> problem**) a live political object.

Open middle-tier questions: does the ref carry anything besides
on/off (a voltage the source sets? sag/brownout states?); does the
conduction walk ever traverse the ref (probably not — it's a
logical dependency, not a physical conductor); who may flip a
substation (access/governance gate).

## ⭐ Generation — DECIDED: Terminus runs on hydro

**(Recorded 2026-08-11. Decided in conversation earlier and never written
down; everything below and in the
[mana pack](./mana-economy-design-pack.md) Part 5b leans on it.)**

> **Terminus generates its power from HYDRO, because it sits on the rivers.**

The geography already carries it — [terminus-city](../../staging/terminus-city.md)
puts two rivers meeting at the **Confluence** at the north head, the combined
river running south between the banks, with **Wharfside** as the riverfront.
Generation is a site fact, not a policy choice: the city is where it is
*because* of the water.

⭐⭐ **And it is load-bearing beyond lighting.** Refining mana costs energy
(the [mana pack](./mana-economy-design-pack.md)), so cheap hydro is what lets
**Terminus refine mana it does not produce** — raw material in from the
frontier, refined mana out. That is the aluminium relationship (smelters
locate at cheap hydro and import their ore), and it turns a lighting decision
into the city's industrial identity.

⚠ **Note what this does NOT settle:** who *owns* the generation, who is billed
and how. Those stay open below. Generation is geography; ownership is politics.

## The municipal layer (the real fork — owner's call)

Everything past the middle tier is polity + economy design:

- **Who owns supply?** A governance office (a municipal service
  under [governance.md](../../subsystems/governance.md)) · a corpo
  concession ([corpo.md](../../subsystems/corpo.md) — the
  everything-is-a-business rule leans here) · a cooperative (the
  polity north star leans *here*). Genuinely open; decides who
  employs the linemen and who answers for outages.
- **Billing/metering** — if power is paid for, the flows ride the
  conservation economy (CB the only faucet/sink —
  [banking.md](../../subsystems/banking.md)): rates are transfers
  between players/businesses/the polity, never a mint. Metered
  per-parcel service echoes the parcel registry
  ([parcel.md](../../subsystems/parcel.md) — service to titled
  property; the invoice-the-owners loop).

  > ⭐⭐⭐ **CONSTRAINED 2026-08-11 — the recurring-charge call.** This slate
  > predates the [stewardship doctrine](../../stewardship-doctrine.md) and
  > was never checked against **Law 2**. It is now, and billing is bounded
  > by three rules:
  >
  > 1. **Meter on USE, never on connection or ownership.** Per-unit
  >    consumption ✅. A fixed **standing/connection charge** ⛔ — that is
  >    *"rent on owned space"* with the serial numbers filed off. An
  >    **ad-valorem holding tax** ⛔.
  > 2. **Dischargeable without attendance** — capital or a standing order
  >    must be able to pay it. *"The bill is paid in engagement + capital,
  >    never in showing up."*
  > 3. **Non-payment's ceiling is credit and comfort, never the asset**
  >    ([credit-slate](./credit-slate.md)'s property floor). This is what
  >    makes 1–2 safe.
  >
  > The framing that makes this natural rather than a restriction:
  > **utilities are the compute meter's fictional twin.** A lit lamp burns
  > supply the way a running zone burns compute and a torch burns fuel —
  > so **an empty house draws nothing**, and Law 2's *"mere ownership and
  > absence cost nothing"* is satisfied by the physics, not by an
  > exemption. ⚠ The *"invoice-the-owners"* loop above must therefore
  > invoice **consumption**, not **frontage**.
- **Labor** — the utility as employer: positions, shifts, the
  maintenance rotation ([employment.md](../../subsystems/employment.md));
  the storm contract as the surge case over the standing round.
- **Generalization** — water is the obvious sibling (the fountain's
  "municipal refill", plumbing, the cistern); same supply-ref
  shape. Don't build twice; design once, instantiate per utility.

## Consumers waiting

- The storm-contract cohort video (education-videos.md #6) — films
  today on local state; *lands* fully once the middle tier exists.
- The trades/electrician vertical's daily loop (wishbook).
- Foundry Row content, when the row builds out.

## Cross-references

- [subsystems/electricity.md](../../subsystems/electricity.md) —
  the local-physics core this extends
- [staging/terminus-city.md](../../staging/terminus-city.md) — the
  municipality this belongs to
- [staging/wishbook.md](../../staging/wishbook.md) — vignette 2 +
  the trades daily loop
- [requirements/demo-content-requirements.md](../../requirements/demo-content-requirements.md)
  — the lamppost decision that spawned this (unit 8)
