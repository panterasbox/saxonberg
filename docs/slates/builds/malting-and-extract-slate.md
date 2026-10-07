# Malting as a trade — and the extract branch, which is the half we did not build

> **Status: PARTIAL** — malting shipped as a **distillery capability**, not
> as a trade: `trade-malting` (rows only), a `malting` Discipline, the
> steep/floor/kiln chain, and a `malting` seat on Crowsfoot's hand
> → [maturation.md](../../subsystems/maturation.md) (the `enzymatic`
> mechanism the floor runs on). ⛔ Every
> product of the chain is **alcoholic**, and malt's real footprint is
> about half non-alcoholic.
> **Left:** malt **extract** (the hinge — it rides the shipped
> `evaporative` mechanism) · **specialty malts + diastatic power** (the
> range that makes malt a product rather than an ingredient) · malted
> milk, which gives [dairy](./dairy-slate.md) its first sink · malt
> vinegar as a feedstock for the acid hurdle
> [preservation](../tails/preservation-slate.md) already owns · a maltster
> seat that is not the distillery's hand · and killing the malt faucet.
> **Size:** a build — content-led, with one kernel field.

---

## Why this exists

The whiskey build gave Crowsfoot a malting floor, a kiln, a quern and a
`malting` seat, and in doing so shipped a trade nobody designed — it rode
along inside the whiskey design. The user's review question is the one
that matters:

> *"what else actually cares about this link in the supply chain besides
> whiskey?"*

⚠ And the first answer given was wrong, because it was a **grep** rather
than a question about the world: *"brewing, and nothing else."* That is
what the codebase consumes. What **malt** is for is much wider, and the
gap between those two answers is this slate.

---

## ⭐⭐ The finding: we built the drunk half

Every product of the chain as it stands converts starch → sugar →
**alcohol**: wash, new-make, whiskey, blended whisky, ale, lager, and the
wine / vermouth / gin next door.

⭐⭐⭐ **That is a values gap, not a content gap.** A world in which the
only thing to do with converted starch is get drunk excludes every person
in it who does not drink — concretely including the children in the
household-lifecycle design, and anyone whose character would not. Malt's
real-world footprint is roughly half non-alcoholic, and the entire half is
absent.

---

## Grounding — VERIFIED 2026-10-06

### What malting is for in the world, and what the tree already has

| implication | status | the mechanism it rides |
|---|---|---|
| **malt extract / syrup** (concentrated wort) | ⛔ absent | ⭐⭐ `evaporative` maturation — **SHIPPED** for maple sap, birch sap and the saltern's brine. Wort + evaporative **is** malt extract |
| **malted milk** → malts, milkshakes | ⛔ absent | ⭐ `milk` **SHIPPED** (ranching's tap + the `milk` verb) |
| **malt vinegar** | ⛔ absent | ⭐⭐ `turnedMaterial` + `turnDays` — **SHIPPED**: it is exactly how wine becomes `wine-vinegar`. Ale left open turns |
| **diastatic / malted flour in dough** | ⛔ absent | `trade-baking` ships dough and bread |
| **barley water · barley tea · roasted-barley "coffee"** | ⛔ absent | ⭐ `coffee` already ships, so this is the *poor man's substitute* — more interesting economically than a gap-filler |
| **spent grain as animal feed** | ⚠ half there | already a recipe residue; ranching is the consumer nobody connected |

⭐ Three of the four biggest ride a mechanism **already in the tree with a
different feedstock**, which is the rule that should have been applied
first: *before designing a mechanism, look for the shipped one with a
different feedstock.*

### The codebase demand census (what it is today)

Consumers of `grist`: `mash` → ale wort, `lager-mash` → lager wort
(brewing); `wash-mash`, `grain-wash-mash` (distilling). **Four recipes,
two trades.** And then:

| customer | can it self-serve? |
|---|---|
| **Crowsfoot (distillery)** | ⛔ **completely** — floor + kiln + quern + the seat, all shipped by the whiskey build |
| **the brewery** | ⛔ **not at all** — mash tun, standpipe, board, two vats, barm. No floor, no kiln, **no mill**; its seat fulfils `fermenting` only |

So **the brewery is a captive customer with no supplier**, served entirely
by `/trade/distribution/thing/malt-sack` on a par sweep. ⭐ That row's own
comment has been waiting for this slate:

> *"nobody in the world malts barley yet, so the sacks simply arrive … and
> **the first thing a malting trade replaces**."*

⚠ Sharper: the counter advertises an arbitrage — *"malt at 5 plus your own
time at a quern, against grist at 7"* — and **the brewery has no quern**,
so it can only ever buy grist at 7. The choice the pricing implies is not
available to the one venue that needs it.

⚠⚠ `lint:no-authored-faucet` is about **money**, not goods, so nothing in
the repo catches a goods faucet. A goods-faucet census may be worth its
own gate; recorded here, not proposed.

### ⛔ There is no enzyme model

`amylase` appears in exactly two prose comments
(`MaturationProfile.ts`, `malting.yaml`) and nowhere in any mechanism.
⚠ And the whiskey build **modelled the consequence and skipped the
cause**: `grain-wash-mash` takes *"a little malt grist for the enzymes"*
as an authored slot with nothing behind it.

---

## The five criteria ([vocations.md](../../vocations.md))

| # | | verdict |
|---|---|---|
| 2 | **gated capability** | ✅ `malting: proficient` licenses the two STANDARD kiln lines. ⚠ `steep-barley` is `easy` — the steep is the **chore**, the kiln is the **job** (`kiln-malt.yaml` calls it *"the ONE decision in the trade"*) |
| 3 | **repeatable loop** | ✅ steep → five days on the floor → kiln |
| 5 | **failure mode** | ✅ and a good one: above ~350 K you destroy the enzymes the floor spent five days making |
| 1 | **unmet demand** | ⛔ the only customer that could pay **self-serves**; the one that cannot is **faucet-fed** |
| 4 | **income PAID, not minted** | ⛔ **there is no payer.** Malt arrives free |

⭐ 1 and 4 fail for the same reason, and it is how the whiskey build
shipped it: **malting arrived as a distillery capability, which consumed
the demand that would have made it a trade.** A distillery that malts its
own does not buy malt.

⚠ The historically honest counter-note: most Scotch houses **did** malt on
site, which the floor's own comment says. So self-serving is not wrong —
it means **the maltster's market was always brewing**, and that market is
entirely faked.

---

## ⭐⭐ What a malting trade should be doing and is not

**Malt is not one product. It is a range, and the range is the kiln.**
Pale, amber, crystal, chocolate, roasted, black — a real maltings sells
ten grades, and that range *is* a brewer's palette. The tree ships one
`malt` material plus peat as a payload concentration.

⭐⭐⭐ And the number that makes the range matter is **diastatic power** —
enzyme content. Pale malt has enzyme to spare and can convert adjuncts;
roasted malt has none. Put the two together and a grain bill becomes a
**calculation**: how much pale malt do I need to convert the rest?

That is a decision at the **maltster's** rung that changes the right
answer at the **brewer's** — the same shape as peat moving the cut, and
the thing that makes somebody pay for *a specific malt* rather than for
"malt".

⭐ A second consumer for diastatic power that has nothing to do with food:
**textile desizing.** Malt amylase was used to strip starch sizing out of
woven cloth, and `trade-textiles` ships. Obscure, real, and it keeps the
enzyme from being a single-trade number.

---

## The seven lenses

**1 pedagogy.** ⚠ Half-passing today. The kiln band is genuinely derivable
and has a real failure mode, but **getting it right pays nothing** — pale
and dark malt are indistinguishable downstream. Diastatic power is what
turns *"don't overheat"* into arithmetic a player can do, and the grain
bill into a derivation. Discipline: `malting` ships; no new one wanted.

**2 creative expression.** ✅ Strong. A second maltings needs zero code; a
specialty malt is a row; extract is a row plus an existing mechanism.
⭐ The ordinary case stays free — a material that malts into nothing
special authors nothing.

**3a immersion.** ⚠ A maltings producing one undifferentiated "malt" when
every brewery in history had a grain bill is a thin fiction. And ⭐ the
alcohol-only chain is the bigger betrayal: a malthouse that cannot make a
malted milk is not a malthouse.

**3b participation.** ⛔ **Weakest.** There is no seat anywhere but the
distillery's hand, which fulfils three trades — *every NPC doing two jobs
is a vacancy we deleted.* The maltster is named in `vocations.md` and
nothing stands there.

**4 values.** ⭐⭐ The lens that found the real gap. Two decisions with no
derivable right answer: what counts as "amber" (colour has a real unit,
°L/EBC, so this is the familiar *number vs band* question — the no-gauge
rules say the player reads bands); and ⭐⭐⭐ **whether the grain economy
has a non-alcoholic branch at all**, which is a question about who the
world is for rather than about malt.

**5 continuity.** ✅ Strong and clean: floor malting → pneumatic drum →
industrial plant. Same commands, different throughput — the lens's own
test. Extract survives it too (open pan → vacuum evaporator).

**6 economy.** ⛔ **The failing lens.** Produces malt; consumed by brewing
and distilling; **paid for by nobody**; and the demand was there first —
the faucet is the proof — but is served by a stub. ⭐ Extract is what
widens the customer list from *two brewers* to *a bakery, a dairy, a
confectioner and a brewer*, which is the difference between a link and a
trade.

**7 governance.** ⭐ Does not bite structurally, but there is a real hook:
**malt was excised at the maltings**, historically, because the kiln is
the countable chokepoint — you can hide barley, you cannot hide a kiln.
A locality-revenue mechanism with a reason attached rather than a flavour
tax. Recorded, not scoped.

---

## Scope to plan

1. ⭐⭐ **Malt extract** — wort + the shipped `evaporative` profile, a
   material, a vessel. **The hinge**: it is what makes 2, 3 and 4 below
   reachable, and it is the third sweetener beside honey and sugar in a
   pre-sugar economy.
2. ⭐⭐⭐ **Specialty malts + diastatic power.** The kiln's intensity
   produces a range; enzyme is the number that makes the range matter. One
   kernel field on the malt payload; the rest is rows.
3. **Malted milk** — extract + milk. ⚠ Gives [dairy](./dairy-slate.md)
   its **first sink**; see dependencies.
4. **Malt vinegar** — ale + `turnedMaterial`, exactly the wine-vinegar
   shape. ⚠ The *acid hurdle* it feeds belongs to
   [preservation](../tails/preservation-slate.md); this slate ships the
   feedstock, not the hurdle.
5. **A maltster seat** somewhere that is not the distillery's hand, and
   **kill the distributor's malt faucet** — the forcing function that row
   has been waiting for. ⚠ Sequence matters: remove the faucet before a
   supplier exists and the brewery simply stops.
6. **Spent grain to ranching** as feed — a residue that already exists,
   with a consumer that already exists, and no link between them.

### Out, and why

⛔ **Dairy processing** — cheese, butter, cream are zero files and belong
to [dairy-slate](./dairy-slate.md), which is a build of its own. This
slate consumes `milk` and does not process it.
⛔ **The acid hurdle / pickling** — `f_pH` is
[preservation-slate](../tails/preservation-slate.md)'s named Left item.
⛔ **Barley varieties.** One barley exists; a second is a farming content
lift and the specialty range comes from the **kiln**, not the field.
⛔ **The malt tax.** Governance has a real hook here and it is not a
trade build's to open.

### ⚠ Dependencies, stated as a sequence

- **3 needs 1.** Malted milk is extract + milk; there is no malted
  anything without extract.
- ⭐ **dairy-slate and this one unblock each other.** It calls itself *"the
  source with no sink"* and records that nothing consumes milk; malted
  milk is a sink that does not need cheese, butter or cream to exist. So
  extract can land first and dairy inherits a customer — but a real dairy
  makes the drink worth buying.
- **5 is last.** The faucet is load-bearing until a producer replaces it.

---

## Hard constraints

- ⛔ No new Mongo collections. No migrations.
- ⛔ A pack must never need a kernel list edit — ⚠ and diastatic power
  must not arrive as a closed kernel vocabulary;
  `lint:closed-vocabularies` counts those now.
- ⚠ Prefer ROWS. Three of the four products ride a shipped mechanism; if a
  wave is writing a new mechanism, check the feedstock question first.
- ⚠ A specialty malt is the **same material carrying different numbers**
  wherever the difference is continuous (peat's precedent), and a separate
  material only where it is a different *kind*.
- ⚠ Every new Thing row authors `mass`; a recipe slot's target material
  must carry the tag the slot names, or the slot fails closed and silent.
- `lint:menu-staff`: any board line a venue offers must be makeable by
  somebody seated there.

---

## Cross-references

- [dairy-slate](./dairy-slate.md) — ⭐ the source with no sink; malted milk
  is the sink, and this slate's extract is its precondition
- [preservation-slate](../tails/preservation-slate.md) — owns the acid
  hurdle that malt vinegar feeds
- [whiskey-styles-slate](./whiskey-styles-slate.md) — where malting
  shipped as a side-effect, and the peat/cut precedent for "a decision at
  one rung moves the right answer at another"
- `docs/vocations.md` — the five criteria, and the maltster/cooper
  vacancies
- `docs/subsystems/maturation.md` — `evaporative` and `turnedMaterial`,
  the two shipped mechanisms three of these products ride
- `docs/subsystems/ranching.md` § The taps — where `milk` comes from
