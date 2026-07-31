# Ranching slate (working doc) — livestock, husbandry, and the animal economy

> **Status: shared conventions DECIDED (2026-07-30 design session); the
> ranching-specific deep pass still open.** Ranching is the **economic** half of
> owned animals: raising livestock (managed as herds, not befriended as
> individuals) for renewable products — milk, eggs, wool, meat, hide, draft
> labor, breeding stock. This session ran ranching against **both** its neighbors
> at once — [pets](./pets-slate.md) (the relationship half) and
> [farming](./farming-slate.md) (the plant half) — and settled the four
> conventions all three must agree on, plus the divergences that are now
> deliberate. What remains open is ranching's *own* content design: the yield
> loop's feel, herd UX, and the breeding game.

See also:
[farming-slate](./farming-slate.md) (**the primary sibling** — same guild, same
production family; the feed loop + the shared genome) ·
[pets-slate](./pets-slate.md) (the *substrate* sibling — an owned animal, but a
different experience; see The family placement) ·
[fishing-slate](./fishing-slate.md) (aquaculture is ranching's aquatic casting;
`BodyPlan`→parts on cleaning is settled there) ·
[mining-slate](./mining-slate.md) (the commons-renewal counterpoint) ·
[guild-slate](./guild-slate.md) (**the Grange** — ranching is its herd wing) ·
substrates: [race.md](../../subsystems/race.md) (`Creature` tier · `Species` ·
`SexedMixin`) · [vitals.md](../../subsystems/vitals.md) +
[metabolism.md](../../subsystems/metabolism.md) (eat / grow / die; the
reconcile-on-read pattern) · [chattel.md](../../subsystems/chattel.md) (**the
custody answer**) · [persistence.md](../../subsystems/persistence.md) (the
`(scope, key)` multi-instance spine) · [reserve.md](../../subsystems/reserve.md) ·
[crafting.md](../../subsystems/crafting.md) (yield → processed goods) ·
[banking.md](../../subsystems/banking.md) +
[employment.md](../../subsystems/employment.md) (the ranch as a `Business` +
ranch hands).
Related: **[property-slate](./property-slate.md) (the parent — the parcel half;
ranching owns land *and* stock)**.

---

## The frame — animals as a managed resource, not a relationship

A rancher does not *win over* a cow. Livestock are **owned, fungible-ish,
managed at scale for yield** — the opposite content stance from a carved,
bonded pet:

| Axis | **Pet** | **Livestock** |
|---|---|---|
| Engine tier | `Character` (rich) | `Creature` (thin) |
| Content stance | individual **carve** | systemic **herd** |
| Relationship | **bond** (regard) — *won over* | **yield** — *managed resource* |
| Domesticability | mid — needs the taming encounter | max — born owned, no encounter |

The Creature/Character split **is** the livestock/pet split. Livestock need a
body, vitals, metabolism, sex, and containment (enough to eat, grow, breed,
yield, and be herded), but **not** the belief / regard / sensor / engaged stack
pets require. And **domesticability is one axis spanning wild → pet →
livestock**: livestock species are the maximally domesticated end — fear-baseline
zero, born into custody, no taming encounter.

---

## The family placement **[DECIDED]**

Ranching's nearest *slate* is pets (they were spun out of one conversation), but
its nearest *design family* is farming, fishing, and mining — and the
[guild roster](./guild-slate.md) already made this call, four weeks after the
pets/ranching/farming slates were written (none of them cite it):

- **The Grange** — "cultivation, soil, husbandry + breeding, genetics."
  **Farming and ranching are one vocation.** Ranching is its herd wing.
- **The Wardens** — survival, tracking, hazard-craft, **taming**; demand anchor
  is "the pet supply chain."

So the production family (farming · ranching · fishing · mining) shares a
convention set that three slates already converged on independently:
reconcile-on-read with no tick · a `Grade` band on the harvested thing ·
`BodyPlan`→parts on cleaning · an **automation ladder that caps at the boring
reward**. Ranching is a full member.

**Pets shares *substrate* with ranching (an owned, individually-identified
animal) but not *experience*.** The design goal is therefore **one shared
substrate under two distinct experiences** — not one unified system. Where the
two touch (custody, maturation, persistence, the clock) they must be *identical*;
where they part (bond vs yield) they part completely.

---

## The four shared conventions **[DECIDED]**

These bind ranching, farming, and pets alike. Build them once; do not fork.

### 1. Where identity lives — one density dial

Farming already answered ranching's biggest open question. Its **field vs bed**
split — aggregate matter with coverage, versus a `Slotted` bed where each plant
is an individual — *is* the **herd vs breeding-stock** split. One dial spans all
three systems, chosen **per content, not per system**:

> aggregate matter → slotted individual → carved individual

- **Aggregate (default for a production herd).** Don't instance 100 cattle. The
  herd is headcount + condition + composition, modeled like farming's continuous
  crop. Scales cozily; no 100-object room, no per-head `look` spam.
- **Slotted individual (breeding stock, the prize bull).** Where identity
  genuinely matters — lineage, quality, a name — the animal is an instance.
- **Carved individual** is the pet, the far end of the same dial.

The dial *replaces* the old open question ("do we model 100 `Creature`s or a herd
abstraction?"). Both, and content picks.

### 2. Custody — `ChattelMixin` on the Creature stack

**Verified in code:** `ChattelMixin` is composed in exactly one place —
`lib/stuff/Thing.ts` — and `Creature` descends from `Agent`, not `Thing`. So **no
animal can be owned today**; `ChattelApi.stamp` refuses a cow or a pet. But the
chattel gate is *structural* (`MixinApi.isChattel`), not tier-based.

> **Adding `ChattelMixin` to the Creature stack gives pets, livestock, and
> aquaculture per-instance ownership with chain-of-title, from shipped code.**

This is the whole possession answer, and it retires the pets slate's sketched
`CompanionMixin` + `ownerPath` — which would have been exactly the pet-shaped
custody edge that slate's own guardrail warns a hundred cattle can't reuse. The
property slate already classes a pet as chattel ("real property bottoms out at
the zone; everything finer is chattel or slots"), so this is consolidation, not a
new primitive.

Aggregate herds title at the **herd** level; slotted individuals title per head.

### 3. The clock — nothing freezes but the body you inhabit

**One engine: reconcile-on-read** (metabolism's pattern, which farming already
copies wholesale). No tick, no per-system time model.

> **Things you own reconcile against world time. The body you inhabit reconciles
> against played time.**

The avatar's own metabolic clock **keeps freezing** on logout (shipped behavior:
`isHasInteractive() && isLinkdead()`) — you can't hire someone to eat for you, so
offline decay of your own body has no fair mitigation. Everything you *own* —
crops, herds, pets — runs on world time whether or not you're logged in. The
existing far-past guard (`MAX_REASONABLE_GAP_SEC`) clamps the six-month absence
without special-casing anything.

**This supersedes the pets slate's "offline = freeze / owner-proxy presence"
line.** The goal that line was protecting — respect the player's time — survives
intact, because it was never about the clock; it was about the **shape of the
consequence** (see §4 of the divergence table below).

### 4. Yield — two shapes, not four systems' worth

| Shape | What it covers | Precedent |
|---|---|---|
| **Standing tap** | milk, eggs, wool — *and* an orchard, *and* a deployed fish trap | retail's `Stock.reset()` tops a counter back to authored `par` on the game-time reset sweep (`lib/retail/Stock.ts`, `lib/residency/Resettable.ts`) — structurally milk, and already Law-2-safe (items, not money) |
| **Terminal harvest** | grain, slaughter, a landed fish | fishing settled `BodyPlan`→parts on cleaning; butchering is that, on land |

Both are **transforms** (feed → product), never faucets — the conserved-economy
rule. The standing tap is the headline ranching mechanic and does not exist
today; the reset sweep is the shape it should copy rather than a new driver.

---

## The automation ladder — and the one thing it can't do

Farming's anti-idle ladder is **also ranching's offline-care model, and pets'**.
Each rung changes *who pays*, never *whether*:

| Rung | Who shows up | The cost |
|---|---|---|
| **By hand** | you | your real-time attention (participation) |
| **Hired NPC** | a `Behaved` brain (the employment engine) | **wages out of your account** |
| **Script** | the command-native interpreter | **metered compute** |

The limit on automation is a principle, not a number:

> **Automation maintains your assets. It cannot maintain your relationships.**

A hired hand feeds the herd, waters the field, and keeps a pet fed and healthy —
the **material floor** is covered for whoever pays. But **bond is only earned in
person.** A kennel keeps your dog alive and well; it does not keep your dog
*yours*. This gives pets a cheap survival floor (what the slate's retracted
boarding-fee economy was groping for) while keeping the actual pet fantasy
un-automatable — and it reads correctly in a barn, a field, and a dorm room.

**Compute note:** reconcile-on-read is lazy and scales for free (it computes only
when someone looks). Anything needing a *live tick* — a brain running, a predator
raiding the herd while you're offline — is real compute and is what the property
slate's allowance meter prices. That's the clean line between the two scarcities.

---

## The deliberate divergences

Same substrate, opposite surface — each with a stated reason:

| Axis | Farming / Ranching | Pets | Why they part |
|---|---|---|---|
| **What's measured** | yield | bond (regard) | never give a cow a bond or a pet a yield stat |
| **Content stance** | data rows (a herd is authored as a table) | a carve (NPCs are expensive carves) | fungibility vs identity |
| **Offline consequence** | material loss, up to death — that's the economic stake, and it's mitigable by wages | **bond drifts; the animal can go feral and leave — it never starves to death** | a business can hire; a relationship can't be delegated |
| **Renewal governance** | **private** — your seed, your breeding stock | n/a | — |
| *(vs mining/fishing)* | commons — quotas, office levers, catch limits | | **a property distinction, not a biological one** — same stock-and-recovery model, opposite political surface |

---

## The divergent layer (ranching-specific — still the open design)

What ranching adds beyond anything settled above:

- **The yield loop's feel** — cadence, the tend ritual, what makes milking a
  morning worth showing up for rather than a chore. The standing-tap *shape* is
  decided; its *play* is not.
- **Breeding at scale** — the herd-grows loop pets don't have, and the substrate
  for selective breeding / stock quality. Rides the **shared genome** (below).
- **Butchering / slaughter → crafting inputs.** Mechanically settled (fishing's
  `BodyPlan`→parts); the open part is tone and the ethics/economics of the meat
  path.
- **Herd management** — moving / counting / penning a flock as a *group*. Mild
  use of the fear/flight axis for herding, and its darker use: **predators vs the
  herd** (a real ranch threat, and a live-tick compute consumer).

---

## The farming coupling (the integration seam)

Ranching is the animal half of agriculture; it closes a conserved loop with the
crop half:

> **crops → feed → livestock → products → crafting → market** — all conserved,
> nothing from nothing.

That **feed-supply coupling** is the concrete integration point: grain grown by
farming becomes feed consumed by livestock metabolism, whose yield re-enters
crafting and the economy. Both halves share the `Business` + labor wrapper, land
tenure, and the Grange.

**The shared genome.** [Farming](./farming-slate.md) already claims the
`Genome` / reaction-norm genetics layer is **husbandry-wide**, not crop-only: an
animal has a `Species` + `BodyPlan` + vital-profile parameters, and
genes-as-reaction-norms bend *those* curves exactly as they bend a crop's
`GrowthParams`. Build it once, for crops and livestock both. The only divergence
is the surface verb (`pollinate` vs mate/gestation over `WorldClock`) and which
parameter set the genome bends. **Aquaculture is the third consumer** (fishing
names it explicitly), and pet breeding is a latent fourth.

**One catalog shape.** The `Species`/`Clade` taxonomy already spans `animalia`
*and* `plantae` (a sessile peace-lily row is the proof token). Crops, livestock,
and pets are one catalog shape — which resolves farming's open question 4 in
favor of the existing tree rather than a sibling catalog. *(Caveat: the
peace-lily row is documentation-only today — no seed exists in the tree.)*

---

## Gap map — verified against the code (2026-07-30)

| Gap | State | Detail |
|---|---|---|
| **Custody** | **CLOSED, one line** | chattel shipped; `ChattelMixin` needs to reach the Creature stack (§2 above) |
| **Individual persistence** | **mostly CLOSED** | `PersistableMixin` is *not* Avatar-only (a `ConsignmentShelf` and a `DormRoom` compose it), and multi-instance `(scope, key)` hosts shipped with the leased dorm room. No NPC composes it yet, but nothing in it is Avatar-shaped |
| **Soil / reserves on a place** | **CLOSED, no new substrate** | `SealedCellar extends ReservedMixin(CartesianLocation)` already holds an `air` reserve on a room |
| **Maturation** | **REAL — the shared gap** | `Organism.age` + `lifecycleState` are persistent fields with *no driver*: `setAge` has zero callers anywhere, and `lifecycleState` only ever transitions to `dead`. `ageCurve` is a reserved comment in `lib/species/Species.ts`. Contained build; forced by ranching (calf→cow) |
| **Reproduction** | **REAL, attachment points ready** | `SexedMixin` composes into every Creature; `Species.reproductiveMode` is authored + persisted but has **no reader**. Gestation/offspring/breeding: absent |
| **Genome / genetics** | **ABSENT** | net-new, and husbandry-wide (above) |
| **Yield tap** | **ABSENT** | net-new; `Stock.reset()` is the shape to copy |
| **Fear / threat axis** | **ABSENT** | regard is the only attitude axis. The `dread` condition's `observableSigns` is a good precedent for behavior-legible inner state. Partial reuse only (herding, predation) — not central to ranching |
| **Follow / flee brains** | **ABSENT** | `wanders.ts` is the template (claims `body`, yields to `attention`) |

---

## Open questions (for the deep pass)

- **Where yield lives** — a `Produces` mixin on the animal, or a ranch-level
  production tap? Per-head vs per-herd accounting, given the density dial.
- **Breeding model** — gestation over `WorldClock`; offspring inheriting species
  + genome; selective breeding as a slow optimization game. How much of the
  breeder's-equation depth lands in v1.
- **Herd UX** — what `look` shows for an aggregate herd; how you count, split,
  move, and pen it; how a slotted individual is promoted out of (and demoted
  into) the aggregate.
- **Slaughter tone** — the meat path's ethics/economics, and how butchering
  conserves mass into crafting inputs.
- **Land dependency** — does ranching wait on the parcel/tenure substrate, or
  ship with the thin custody v1 above? *(Lean: chattel covers the stock; the land
  rides whatever farming does.)*
- **Sequence with farming** — the feed loop wants both halves to be meaningful.
  The [launch worklist](../../launch-worklist.md) ranks farming as an
  economy-blocking extraction faucet and schedules ranching to ride the farming
  session; that ordering still looks right.

---

## Scope guardrails

- **Reuse the husbandry base; don't fork it.** Custody, the clock, maturation,
  persistence, and the genome are shared with pets and farming — build them once,
  for all consumers. **Don't build a custody edge a hundred cattle can't reuse.**
- **Livestock are systemic, not carves.** The deliberate inverse of the "NPCs are
  expensive carves" rule — a herd is data-driven and fungible; do not hand-author
  individual cattle. Slotted breeding stock is the *exception* the dial allows.
- **No new module categories.** Yield/breeding are mixins + a production driver on
  existing tiers; the ranch is a `Business` + Location; verbs are ordinary
  YAML+controller pairs.
- **The economy stays conserved.** Yield is a *transform* (feed → product), not a
  faucet.
