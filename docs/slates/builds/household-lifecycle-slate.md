# Household lifecycle slate — the parents, the neighbourhood, and the estate

> **Status: UNBUILT** — and much smaller than it looks, because **the
> estate machine already ships** (`credit.md § The three estate states`:
> active · dormant · escheated, with a seven-step escheat). It is
> **Avatar-gated by construction** — *"An NPC is never absent"* — and
> pointing it at NPCs is most of the work.
> **Left:** the household as ordinary content (a template row, unstamped)
> · the generator as an author · minting parents at char-gen with a
> residence · **un-gating the estate machine from `Avatar`** · death as
> the terminal event with **no reclaim** · the NPC-never-names-a-
> beneficiary rule · vacancy → decay → **ruin** · the necropolis as the
> one permanent residue · ⚠ blocked on
> [pack-boundary](./pack-boundary-slate.md) for the vanish case.
> **Size:** a build.

Opened 2026-09-25. The premise is the user's:

> *"we're asking the player in chargen to tell us who their parents are,
> and that's essentially an NPC generated… using the person's parents is
> basically a labor factory if we need it, and it's sounding like we'll
> need it. a lot of our economy depends on having labor ready to run all
> these systems we've been designing and labor means NPCs. as the player
> base grows we can grow the labor market for free."*

[lineage-slate](./lineage-slate.md) already treats parents as **person
records with their own existence** (*"the debt is the parent's"*), so this
is that sentence taken literally.

---

## ⭐⭐⭐ It is ordinary content, and that is the architecture

The tempting design is a specialised store — generated households as
documents, managed by a manager, with bespoke tooling. **Rejected, and
the reason is the architecture's actual promise:**

> **User:** *"we're a universe of objects and these objects are all
> Stuff… all Stuff is MQL addressable and lands on a fixed taxonomy of
> Stuff classes. on top of that taxonomy, you can build any content where
> content is just data. it's very easy to create new content, it takes a
> wizard to change how it functions internally. that's the promise the
> architecture makes to the consumer, labor and capital."*

⭐⭐⭐ **The load-bearing argument is GRADUATION.** Someone rolls a
character, likes their mother's street, and decides to make something of
it — real personalities, a shop, a build-out. If the household lives in a
specialised store, that is a **conversion**; if it is content, they just
start editing.

> **The generated thing and the authored thing must be the same kind of
> thing, because the whole design is that one becomes the other** —
> sandbox → enclosing parcel → beyond, with the governance layer deciding
> who may.

A parallel store puts a conversion step in the middle of the only
progression the platform promises, and **re-creates the author tier by
the back door**: the people who could extend the most numerous content in
the world would be the people who can write TypeScript. That is the
category error [everyone-is-an-author](../../subsystems/access.md)
exists to forbid. It also silently opts that population out of **MQL**,
the **CMS**, the in-runtime **`git`**, and `sourcePack` provenance — all
infrastructure already built.

### ⚠ The doctrine that looks like it forbids this, and does not

`ref-shapes.md` calls a per-instance `domain` row **the anti-pattern** —
but read the reason: *"it parks **RUNTIME DATA** in the CMS tree where
hand-edits bypass call security."* The objection is about **kind**, not
**provenance**. A balance, a position, a wound must not be hand-editable.

**A household is not runtime data. It is content** — a name, a species, a
look, a disposition, a trade, a dwelling. That a generator wrote it
rather than a person does not change what kind of thing it is.

⭐ So the split is the one every Stuff already has:

| | where | who may touch it |
|---|---|---|
| **the household** — names, looks, dispositions, the dwelling | a **template row**, unstamped, CMS-editable, MQL-addressable | authors, per the governance layer |
| **the living NPC's state** — position, inventory, hunger, employment, coin | `holder_snapshots`, gated | call security only |

**Exactly how an authored NPC already works.** A generated NPC works
identically **because it is an authored NPC** — authored by a generator.

> ⭐⭐ **The generator is an AUTHOR**: a participant in the same pipeline,
> writing rows a wizard could have written.

⚠ It writes **unstamped** rows — realm-local, never a pack's. See
[pack-boundary-slate](./pack-boundary-slate.md), which this conversation
forced out.

---

## The neighbourhood is a `Locality`, and it already exists

- `address.md`: **"One concept, variable depth… There are no `Region` /
  `Block` / `Spot` classes."** A neighbourhood is a Locality with a
  deeper prefix. Nothing to build.
- ⚠ Honour the stated limit — *"never a street-address model."*
  **A street is a Locality; a house is a parcel under it.**
  `terminus/hinkley-hills/larkspur-row` is a node; the houses on it are
  `PlatBook` lots with titles. No "123 Elm Street" anywhere.
- `settlement-model.md` already answers the *two kinds of neighbourhood*
  question, and better than the framing that raised it:

> ⭐⭐ **The street does not decide; the parcel does.** Some plats have
> capacity left and some do not… **A generative street matures into an
> authored one:** new ground → frontage for sale → built out → secondary
> market → high street.

⭐ So Terminus's authored districts are **what Hinkley Hills becomes** —
not a second kind of thing, a later stage. The axis is **capacity
remaining**, not residential-vs-commercial. (The doc names the two axes
that correlate and are not the same: *frontage availability* is a fact
about the plat; *bespoke vs archetype* is a fact about the business.)

### ⭐ No hidden neighbourhoods — empty lots

An earlier draft of this design had households as a *seeded field*
revealed by char-gen. **Dropped, and the simpler answer is more honest:**

> **A plat has lots. A lot is empty until a household is written into
> it.**

Visible, diegetic, purchasable empty lots filling as players arrive; when
the plat is exhausted, `PlatBook` extends — the shipped growth mechanism
doing its actual job. No new concept, and nothing appears out of nowhere.

---

## ⭐⭐⭐ The lifecycle — and the estate machine already is it

The user's chain: *NPCs minted retired → needed or not → retirement runs
out → no welfare creep, so they die → demand for the necropolis → but
their estate must not reach the player (patricide) → so it goes to market
→ so what about long vacancies?*

**That chain and `credit.md`'s estate machine are the same machine.**

| state | shipped trigger | here |
|---|---|---|
| **active** | connected, or inside `estate.dormantAfterDays` | employed, or funded |
| **dormant** | past the short clock — account **frozen**, seats **vacated**, a shop shows the **closed sign** | unfunded: they stop working, the house stands |
| **escheated** | past `estate.escheatAfterDays` — the estate **passes**, treasury holds the balance as **unclaimed property** | **death** |

> ⭐ **Absence and death are one lifecycle with different terminal
> events.** The clocks exist and are config.

### The three honest divergences

1. ⚠ **Un-gate the machine from `Avatar`.** The doc states the seam:
   *"An NPC is never absent: every read narrows on an Avatar identity
   before it consults the snapshot."* This is the one real code item.
2. **Death replaces absence, and there is NO RECLAIM.** For a player,
   escheat is reversible forever on login. For a dead NPC it is terminal.
3. ⭐⭐ **An NPC parent never names a beneficiary.** One rule, and it is
   the whole patricide answer — see below.

### ⭐⭐ Money: the pension is the PARCEL

*How do retired NPCs have zorkmids without throwing off the economy?* The
money doctrine forbids the obvious answer — **write-offs automatic,
write-ups never**, and `postTransaction` is sealed.

> **A retired NPC holds no money and needs none. Their pension is their
> parcel.**

Historically exact: pre-industrial retirement was a **retirement
contract**, a real legal instrument — deed the farm to your child in
exchange for board and lodging. The retiree holds land and a larder,
never cash.

⭐ **The two halves of the design solve each other**: the parents need a
residence for the neighbourhood, and the residence is the pension for the
money. Neither works alone.

- A retired NPC is **off the ledger** — no balance, nothing to reconcile.
  Conserved by construction.
- Employ them and **your money pays them.** A transfer.
- ⭐ So the labour factory is honest: **labour enters the economy only
  when somebody pays for it.** You cannot conjure workers; you pay wages
  out of revenue.
- *"If the player wants to keep them alive, the player funds the
  retirement"* is likewise a **transfer** — conservation-safe.

⚠ **Real dependency, not hand-waved:**
[naked-cast-starve](../../subsystems/vitals.md) — every unfed Cast is
dead by game-hour ~7 with the dials ~10× off. A retiree subsisting on a
garden is the `smallholding` machinery and it has to work.

### ⭐⭐ Patricide is already answered — by escheat step 3

> *"player-held titles **transfer to the parent parcel's owner** (or to
> the named **beneficiary**, if they are themselves active)"*

Default is **up the title tree** — the plat holder, the landlord,
ultimately the municipality — and onto the market. So the rule is one
line: **an NPC parent never names a beneficiary.**

⭐ And the second-order case is *good*: a player may buy the ground under
their parents' house and take it by situs. **That is not patricide, it is
buying real estate** — the incentive it creates is the one we want.

### ⭐⭐⭐ Vacancy ends in a RUIN, and the cycle closes

The genuinely open link, and the answer is lying in two other slates.
An unmaintained dwelling decays
([structure-and-decor](./structure-and-decor-slate.md) puts **maintenance
before construction**), and decay terminates in a **ruin** — which the
[guild slate](./guild-slate.md) already made doctrine: *ship ruins*, a
shuttered thing whose story you can read is **a slot a player can
claim.**

> **The end of life for an estate is a ruin, and a ruin is a lot at a
> discount.**

Which closes the settlement model's lifecycle into a **loop**:

> new ground → frontage → built out → secondary market → **vacancy →
> decay → ruin → cheap ground**

⭐ A pressure valve nobody has to tune: a neighbourhood that outgrows its
population does not accumulate empty houses forever, it **visibly goes to
seed.** Which is what happens to towns, and it is content rather than a
garbage collector.

### ⭐ The permanent residue is the grave

Everything recycles — the house decays, the title transfers, the money
escheats and stays reclaimable, chattel is finders-keepers. **The
necropolis plot is the only permanent thing**, it is already a `PlatBook`
plat (`civic`, ~4 m²), and it makes the necropolis **the realm's only
monotonically growing content.** A true and slightly haunting fact about
towns, arrived at by arithmetic.

---

## ⚠ Rejection has no dwellings — and that is the interesting case

Asked directly. The pack ships a pithead yard, assay shed, claims office,
smelter, fuel yard, provisioning and the workings, plus eight NPC agents
(hewer, collier, smelterman, onsetter, storekeeper, registrar, buyer,
independent) who **work** there. **Zero residences.**

⭐ Not a gap to fill thoughtlessly. A mining camp historically *does*
house people, badly, and *"where do the hewers sleep?"* has an honest
answer with politics attached — a barracks, a lodging house, **company
housing**. And Rejection is the realm's only **stake** market (first
come, enforced against a register) rather than *sell*, so its housing
would be **squatters and shacks, not lots** — a third neighbourhood shape
distinct from both Hinkley's and Terminus's, and the one that would teach
the most.

---

## Decided

1. **A household is ordinary content** — an unstamped template row, not a
   specialised store. Graduation is the argument.
2. **The generator is an author**, writing rows a wizard could have
   written.
3. **A neighbourhood is a `Locality`; a street is a Locality; a house is
   a parcel.** No street-address model.
4. **No hidden neighbourhoods — empty lots.**
5. **A retired NPC is off the ledger; the parcel is the pension.**
6. **An NPC parent never names a beneficiary.**
7. **Death is terminal — no reclaim.**
8. **Vacancy ends in a ruin**, and a ruin is cheap ground.

## Open

1. **What the generator IS, architecturally.** It writes content rows, so
   it is doing a wizard's job — a pack? an Api? something the CMS
   invokes? ⭐ **No precedent exists**, and this is where the real design
   work is.
2. **The retirement clock's units and price.** Funding a parent is a
   recurring cost and wants pricing **against a wage**, or keeping mum
   alive is a rounding error rather than a decision.
3. **Does a household mint eagerly at char-gen, or lazily on first
   visit?** Eager is simpler and makes the street real immediately; lazy
   is cheaper. ⚠ Lean eager — the consistency rule (*real content you can
   walk to*) is the lineage slate's own standard for the `Place` cell.
4. **Rejection's housing** — worth doing precisely because it is the
   stake market, but it is its own content pass.
5. ⚠ **Blocked**: the vanish-with-dependents case
   ([pack-boundary](./pack-boundary-slate.md)) — a pack shipping the plat
   that realm-local households sit in.

---

See also: [pack-boundary-slate](./pack-boundary-slate.md) (**forced by
this**, and blocks it) · [lineage-slate](./lineage-slate.md) (parents as
person records) · [credit.md](../../subsystems/credit.md) (the estate
machine) · [settlement-model.md](../../settlement-model.md) (the plat,
the lifecycle, the three land markets) ·
[address.md](../../subsystems/address.md) (the Locality tier)
