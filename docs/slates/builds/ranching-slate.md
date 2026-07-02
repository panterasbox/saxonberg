# Ranching slate (STUB) — livestock, husbandry, and the animal economy

> **Status: STUB — spun out of the pets design conversation; not yet explored on
> its own.** Ranching is the **economic** half of owned animals: raising
> livestock (managed as herds, not befriended as individuals) for renewable
> products — milk, eggs, wool, meat, hide, draft labor, breeding stock. It is the
> **sibling of [pets](./pets-slate.md)** (the *relationship* half) and of the
> **farming/agriculture** work being designed separately (the *plant* half); all
> three sit on a shared husbandry / possession substrate. This stub captures the
> integration architecture and the divergent layer so the design has a home; the
> deep pass comes when the farming session opens.

See also:
[pets-slate](./pets-slate.md) (the sibling — the relationship half; the shared
husbandry base + the gap map live there) ·
farming/agriculture (separate session — the plant half; the **feed loop** is the
coupling; slate forthcoming) ·
substrates: [race.md](../../subsystems/race.md) (`Creature` tier · `Species`
domesticability · `SexedMixin`) · [vitals.md](../../subsystems/vitals.md) +
[metabolism.md](../../subsystems/metabolism.md) (eat / grow / die; feed) ·
[crafting.md](../../subsystems/crafting.md) (yield → processed goods) ·
[banking.md](../../subsystems/banking.md) + [employment.md](../../subsystems/employment.md)
(the ranch as a `Business` + ranch hands) ·
[document-store.md](../../subsystems/document-store.md) (herd persistence).
Related: **[property-slate](./property-slate.md) (the parent — the
possession / real-estate / compute-scarcity substrate; ranching is its heaviest
customer: owned herds + owned land)**; the tenure / "resource-tenure not
politics" land line; the possession/theft structural gap named in the pets gap
map.

---

## The frame — animals as a managed resource, not a relationship

A rancher does not *win over* a cow. Livestock are **owned, fungible-ish,
managed at scale for yield** — the opposite content stance from a carved,
bonded pet. The pets slate established the clean mapping the engine already
supports:

| Axis | **Pet** | **Livestock** |
|---|---|---|
| Engine tier | `Character` (rich) | `Creature` (thin) |
| Content stance | individual **carve** | systemic **herd** |
| Relationship | **bond** (regard) — *won over* | **yield** — *managed resource* |
| Domesticability | mid — needs the taming encounter | max — born owned, no encounter |

The Creature/Character split **is** the livestock/pet split. Livestock are the
thin `Creature` tier — they need a body, vitals, metabolism, sex, and
containment (enough to eat, grow, breed, yield, and be herded), but **not** the
belief / regard / sensor / engaged stack pets require. And **domesticability is
one axis spanning wild → pet → livestock**: livestock species are the maximally
domesticated end — fear-baseline zero, born into custody, no taming encounter.

## The shared husbandry base (reuse, designed for both)

Ranching and pets consume the same substrate. These belong to a husbandry /
possession layer, **not** to either consumer specifically (build them so a herd
*and* a companion both reuse them — the `lib/standing/` precedent):

- **Custody / possession** — livestock *are* property; the possession gap named
  in the pets slate is even more central here (owned herds + owned land).
- **Vitals + metabolism** — they eat and can die; this is the seam into farming.
- **Species domesticability + maturation** — raise a calf to a cow. Ranching is
  the primary forcing function for the **maturation driver** (the `age` /
  `lifecycleState` / empty `Species.ageCurve` seam that has no driver today).
- **Husbandry-grade persistence + dependent presence** — an owned herd survives
  logout; same owner-proxy-freeze answer as pets, stressed at scale.
- **The `Business` + labor wrapper** — a ranch is a `Business` with a P&L and
  ranch hands (the employment engine), the Dave's-Bar precedent.

## The divergent layer (ranching-specific — the new design)

What ranching adds beyond anything in the pet design:

- **Yield / production** — the core loop: *an animal produces X (milk / eggs /
  wool) on a cycle.* A time-driven passive production tap over `WorldClock`,
  feeding **crafting** (milk→cheese, wool→cloth, fleece→yarn). This is the
  headline ranching mechanic and does not exist today.
- **Breeding at scale** — `SexedMixin` gives sex as a body attribute, but a
  **reproduction / gestation / offspring driver almost certainly does not
  exist** (verify at requirements — likely a genuine gap). The herd-grows loop
  pets don't have; also the substrate for selective breeding / stock quality.
- **Butchering / slaughter → crafting inputs** — livestock terminate into meat /
  hide / bone. The death→resource path (pets can't; livestock is where it
  lives). Ties to the vitals death seam + crafting.
- **Herd management** — moving / counting / penning a flock as a *group*, not
  per-individual. Mild use of the (Wave-2-pets) fear/flight axis for herding, and
  its darker use: **predators vs the herd** (wolves raiding — a real ranch
  threat, and a fear-axis consumer).

## The farming coupling (the integration seam)

Ranching is the animal half of agriculture; it closes a conserved loop with the
crop half:

> **crops → feed → livestock → products → crafting → market** — all conserved,
> nothing from nothing.

That **feed-supply coupling** is the concrete integration point between the
ranching and farming sessions: grain grown by farming becomes feed consumed by
livestock metabolism, whose yield re-enters crafting and the economy. Both halves
also share **land tenure** (a ranch/farm is claimed land = possession-of-place,
tying into the resource-tenure line) and the **`Business` + labor** wrapper.

## Structural gaps this leans on (from the pets gap map)

Ranching is a heavier customer of the same structural gaps pets surfaced:

- **Possession / property** — *the* central one. Owned herds + owned land +
  livestock-as-tradeable-goods. Ranching may be the strongest forcing function
  for the possession substrate (and its land-tenure sibling).
- **Maturation** — forced (raise stock to yield age).
- **Reproduction/breeding driver** — probable net-new gap (verify).
- **Yield/production cycle** — net-new mechanic (not in any current subsystem).
- **Dependent-presence + persistence at scale** — reused, stressed harder by
  herd counts.
- **Fear/threat axis** — partial reuse (herding, predation) but not central.

## Open questions (for the deep pass)

- **Where does yield live** — a `Produces` mixin on the animal? A ranch-level
  production tap? Per-animal vs per-herd accounting?
- **Herd as an aggregate** — do we model 100 individual `Creature`s, or a herd
  abstraction with a headcount + representative individuals (perf + UX)? The
  fungibility of livestock invites an aggregate, but conservation + individual
  breeding/quality pull toward instances.
- **Breeding model** — gestation over `WorldClock`, offspring inheriting
  species + quality; selective breeding as a slow optimization game?
- **Slaughter ethics/economics** — the meat path; how butchering conserves mass
  into crafting inputs.
- **Land tenure dependency** — does ranching wait on the possession/tenure
  substrate, or ship with a thin custody v1 like pets Wave 1?
- **Scope with farming** — sequence relative to the farming session; the feed
  loop wants both halves to exist to be meaningful.

## Scope guardrails

- **Reuse the husbandry base; don't fork it.** Custody, domesticability,
  maturation, persistence are shared with pets — build them once, for both.
- **Livestock are systemic, not carves.** The opposite of the "NPCs are
  expensive carves" rule — a herd is data-driven and fungible; do not hand-author
  individual cattle.
- **No new module categories.** Yield/breeding are mixins + a production driver
  on existing tiers; the ranch is a `Business` + Location; verbs are ordinary
  YAML+controller pairs.
- **The economy stays conserved.** Yield is a *transform* (feed → product), not a
  faucet; it plugs into the same conserved-economy model as the rest.
