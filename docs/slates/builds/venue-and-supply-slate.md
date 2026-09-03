# Venue & supply slate — sellable businesses, archetypes, and the input graph

> **Captured 2026-09-03**, out of the towns design session, in answer to
> one goal: **NPC-run businesses that can be easily sold to players when
> the time comes for players to run them.**
>
> **Status: direction decided, nothing built.**
>
> ⭐ **Its own slate rather than a section of
> [towns-slate](./towns-slate.md), deliberately.** None of this is about
> towns — the sellable-venue contract, the archetype test, the supply
> graph and the ladder apply to *every* business in the game, and someone
> building a trade pack would never look for them in a locality slate.
>
> ⚠⚠ **The governing constraint is scale.** The user's estimate is that
> shipped content today is **roughly a tenth** of what will exist at
> launch. So **a venue list is worthless** — anything enumerated now is
> 10 % of the final and mostly wrong. What survives a 10× is a
> **generator**: the shapes, the coverage rule, the ladder, and the
> placement discipline. This slate holds only those. Actual venues live
> per-locality in `docs/staging/`.

Substrate: [employment](../../subsystems/employment.md) ·
[governance](../../subsystems/governance.md) ·
[parcel](../../subsystems/parcel.md) ·
[chattel](../../subsystems/chattel.md) ·
[banking](../../subsystems/banking.md) ·
[content-packs](../../subsystems/content-packs.md) (the `archetype`
document kind) · [crafting](../../subsystems/crafting.md) (Recipe docs) ·
[retail](../../subsystems/retail.md) ·
[smallholding](../../subsystems/smallholding.md) ·
[behavior](../../subsystems/behavior.md)

Siblings: [towns-slate](./towns-slate.md) ·
[ranching](./ranching-slate.md) (⚠ **ships first** — § 8) ·
[farming](./farming-slate.md) · [stewardship](./stewardship-slate.md) ·
[economy](./economy-slate.md) · [supply-chain](./supply-chain-slate.md) ·
[corpos](./corpos-slate.md) · [freight](./freight-slate.md) ·
[vocations](../../vocations.md)

---

## 1. ⭐⭐⭐ The sellable-venue contract

`appointingAuthority` already takes **three kinds** — `entity`, `office`,
`committee`. The counting-houses and the registry use `committee`; the
Compact's tests use `office`. But **almost every shipped business uses
`kind: entity`** pointed at an NPC: the storekeeper, the collier, the
smelterman, the Hearthworks smith, the general store, the lounge.

> ⭐⭐⭐ **An `entity`-authored business is hardcoded to that NPC and
> cannot be sold. An `office`-authored one is held by whoever holds the
> seat.**

Which restates a doctrine already written down elsewhere — *check offices,
never the founder*:

> **The NPC is the DEFAULT HOLDER of a proprietor's seat. Never the
> owner.**

### The four parts, and three of the transfers already ship

| part | what it is | how it transfers |
|---|---|---|
| **the seat** | `appointingAuthority: { kind: office }` — the proprietor's position | governance: offices already transfer |
| **the premises** | a titled parcel | `ParcelApi` — shipped |
| **the fixtures** | chattel stamped to the **business**, never the NPC | chattel chain-of-title — shipped |
| **the account** | `banksAt`, following the seat | banking — shipped |

**Selling a business = transfer the title + transfer the seat; the account
follows.** No new mechanism.

⚠ **What is genuinely missing is a PRICE.** What a going concern is worth
— premises + fixtures + stock + the earning power of the seat — is
unmodelled, and there is an `appraisal` Discipline shipped with nothing to
appraise. That is the one real gap in the contract.

### ⚠ The uniformity sweep

**DECIDED (user, 2026-09-03): everything uniform, swept at build time.**
Not "author new ones correctly and leave the old" — one pass, every pack,
every business that a player could ever plausibly hold becomes
`kind: office` with the incumbent NPC as default holder.

Small per row, but it touches: `rejection` (×4), `hearthworks`,
`terminus` (general store, counting-houses, market, registry),
`saxonberg-lounge`, `eternal-university`, and every trade pack's producer
outfit.

⚠ **A business that should NOT be sellable is then a positive
declaration** rather than an accident — the Compact's own bodies, a
government department, a committee-run registry. `kind: committee` and
`kind: entity` both stay legitimate; they just have to be *chosen*.

---

## 2. ⭐⭐ Bespoke vs archetype — the test is *foundable*

Not "special versus generic." The test is whether a player can make a
second one:

- **Bespoke** — ownable, unique, **sellable once**. There is one Ferrow,
  one packing house, one Institute, one tower. A player can buy it; a
  player cannot found another.
- **Archetype** — **foundable**. A player can open one anywhere the land
  use allows.

And the distinction is economically load-bearing, so it must be
deliberate rather than incidental:

> ⭐⭐ **Bespoke venues are RENT** — a position nobody else can occupy.
> **Archetype venues are COMPETITION** — anyone can open one next door.

The Ferrow is a monopoly because there is one orebody. A farm is
competitive because there is a lot of land. That decides whether owning
the thing is a *position* or a *business*, and it should be an authoring
decision made on purpose.

### ⭐⭐⭐ Which the basic/support split sorts for you

From [towns-slate](./towns-slate.md)'s frame:

> **The basic sector is bespoke. The support sector is archetypal.**

Every settlement has exactly one reason to exist — the mine, the valley,
the subdivision — and that thing is unique. It then needs the **same four
or five support venues**, differing only in flavour:

| the support kit | Rejection | Heart's Delight | Hinkley |
|---|---|---|---|
| **general store** | Provisioning | the store + post office | the shop at the stop |
| **public house** | the Tallow | Rovere's | — |
| **lodging** | the Rest | the shed / boarding | — (title only) |
| **smithy** | the sharpening shop | implement repair | — |
| **depot** | the weighbridge | the loading dock | the rail platform |

⭐ **Build five archetypes once and you get every town's second half** —
and every one is foundable, so a player can open a store in a town that
has none. The connective tissue and the player on-ramp in one object.

### The archetype substrate ships

The `archetype` document kind is real:
`{ archetypeId, label, industry, capabilities: [{ key, needs, default? }] }`,
warmed into `ArchetypeCatalogue`, and ⭐ **an archetype describes and
materializes itself** (`archetype.describe()` is the effective floor,
`archetype.materialize()` builds a venue). Nine ship: `mining`,
`brewhouse`, `hospitality`, `winery`, `still-house`, plus `kitchen`,
`living`, `bathroom`, `bedroom`.

⚠ **But `needs` is a closed six** — `tool · heatK · bulkSource · surface ·
seating · coldStorage` — with **no word for ground, water, or sun.** A
producer archetype (any farm, a pasture, a coppice) does not fit today.
Extending that vocabulary is one of this slate's two substrate asks.

---

## 3. ⭐⭐⭐ Coverage is a LINT, not a list

The supply graph is **already declared** by shipped content. Every recipe
is an edge:

```yaml
inputSlots:
  - { slot: malt,  category: malt,  minGrade: poor, measureL: 4 }
  - { slot: water, category: water, minGrade: poor, measureL: 16 }
outputMaterial: /trade/brewing/idea/material/wort
outputTemplate: /trade/brewing/thing/wort-bucket
```

Input **categories** in, an output material/template out. So the chain is
machine-readable today — and the missing half is small:

> ⚠ **Nothing declares `yields`.** No producer says *this ground gives
> grapes.*

Add that one field to the archetype schema and the graph closes:

> ⭐⭐⭐ **`pnpm lint:supply`** — walk every shipped recipe, build the
> category graph, and report every input category that no recipe produces
> and no producer archetype yields.

**An uncovered category is a FAUCET** — matter arriving from nowhere,
which the conservation doctrine does not permit and which no reviewer can
see today.

It ships the way `lint:test-content` does: a **shrinking allowlist**,
where a listed faucet warns and a new one fails. And because it is
*derived*, it stays correct at 10× content with no maintenance. ⭐ **That
is the answer to "have we covered all our inputs" — permanently, rather
than once.**

### Holes visible by inspection already

| category | state |
|---|---|
| **malt** | `mash` needs it; nothing outputs it. ⚠ **Barley is not a shipped species.** |
| **fibre** | textiles needs it; flax/cotton/wool none shipped |
| **nitrogen** | ⚠⚠ a faucet at **both ends** — see § 8 |
| **apricot / plum** | the valley's signature fruit; `prunus avium` (cherry) ships, the others do not. Same genus, cheap. |

⚠ These were found by eye. **The point of the lint is that nobody should
have to.**

---

## 4. ⭐⭐ The universal ladder

Rungs must differ by more than acreage, or the ladder is one number.

| rung | you buy | what is actually different |
|---|---|---|
| **0** | a **tool** | you can do the work; you have no premises |
| **1** | **premises** | a titled parcel; nothing on it |
| **2** | a **one-person operation** | a going concern that feeds one household and sells a surplus |
| **3** | **a business with a roster** | employees, an account, a place in the market |
| **4** | **a position others depend on** | ⭐ scarce for a reason that is not price |

The farm instance: garden bed → bare ground → market garden → farm → the
flats.

> ⭐⭐ **Rung 4 is not purchasable.** In the valley it is *water
> seniority*, which is first-in-time and moves only when a holder sells.
> Elsewhere it is the orebody, the crossing, the only shed. The top of the
> ladder is scarce because of the world, not the price.

⭐ The shape generalises across every trade, which is why it is here and
not in a locality doc — it is what survives when the specific venues do
not.

---

## 5. Farm archetypes — six shapes

**DECIDED (user, 2026-09-03): several, not one.** The honest axis is
**what the ground does × how long the cycle is**:

| archetype | the ground | cycle | state |
|---|---|---|---|
| **orchard** | perennial trees | years to bear | ⭐ Stage A's fruit cycle ships |
| **row crop / field** | annual, ploughed | one season | ⚠ needs the field-room (unbuilt) |
| **vineyard** | perennial vines | years + vintage | grape ships; `winery` covers the *making* half |
| **market garden** | intensive, mixed, small | continuous | ⭐ the rung-2 bridge from Hinkley's bed |
| **pasture** | grows feed; the animal is the product | continuous | ⚠ ranching — and ⭐ *pasture is a field* (§ 8) |
| **coppice / woodlot** | cut and regrow | 7 years | ⭐⭐ **already ships** — Rejection's fuel yard is one and nobody calls it a farm |

⭐ **The coppice is the exemplar**: the one producer shape that already
works end to end, so it can prove the `yields` field before anything new
is authored.

⚠ And note what this does *not* multiply: `pasture is a field` means
grazing rides the same soil substrate, so six shapes do not mean six
substrates.

---

## 6. ⭐⭐ The going-concern model — and the loop already runs

> **You do not found a business. You buy one that already works.**

⭐ **This ships**, and it is stronger than the design conversation
assumed:

- **`wallet use house`** links a business's operating account into the
  holder's `PaymentCredential` and makes it active — resolved via
  `actor.buysFor()` (every Business where you hold a non-exited
  `purchases` position, plus one you are proprietor of).
- **While active, `buy` stamps the chattel to the business** and
  `consign` consigns *as* the business.
- **`/lib/behavior/restocks`** ships as a brain (one live use): count the
  rail against par, buy the shortfall on the business's account, stock it.

⭐⭐ So an NPC business with an account, a par manifest and a `restocks`
beat is **DAU-independent** — it runs with nobody watching. A player then
takes the seat and inherits something that already works.

Better onboarding than an empty shop, how small business actually
transfers, and it means **every venue authored does double duty**: economy
floor now, player business later.

⚠ Correction for the record: this was described in conversation as
`buy --for <business>`, "the one gap supply-chain Part 3 named." That was
the *slate's proposed* shape; what shipped is the wallet conferral above.
The gap is closed.

---

## 7. Scaling discipline for 10× content

> ⭐ **The mechanism is the trade pack's. The instance is the locality's.**

`trade-farming` owns the orchard archetype; each actual orchard is content
in the locality's pack.

> ⭐⭐ **The test: a second valley needs ZERO pack code.**

The same falsifiable test the metal chain used for a second mining town
(*"the machinery never names a room row"*). If a new farm requires
touching `trade-farming`, the archetype is underspecified — that is the
signal, and it is checkable.

### ⭐ Corpos are how you avoid authoring 140 owners

Five corpo packs ship. At scale, *who owns all these businesses* is
answered partly by consolidation: some independent, some corpo-owned, and
the mix is real economic texture — the chain store beside the family farm.

⭐⭐ And it lands on Heart's Delight exactly. The valley's theme is that
**nobody takes it; it sells, one owner at a time.** So **corpo ownership
of farms is the visible progress bar on that happening** — you can walk
the valley and count how many gates carry somebody else's mark. The theme
rendered as a number nobody had to invent.

---

## 8. ⚠⚠ Ranching ships first

**DECIDED (user, 2026-09-03).** And it is more load-bearing than
sequencing convenience:

> ⭐⭐⭐ **Nitrogen is a faucet at both ends today.**

`smallholding.md`: nitrogen is a **reserve** on beds, harvesting
**exports** it, and `feed` puts it back — from nowhere specified. Ranching
is the producer that closes it, and `ranching-slate` already did the
design: **"pasture is a field,"** grazing is a second harvest method,
*"which makes hay mechanically necessary and makes crop rotation through
pasture emerge from correct soil accounting."*

⭐ The nutrient cycle is not something to invent. It falls out of the soil
model already shipped, once there are animals — which is also the first
real consumer of the `yields` field in § 3.

### ⭐⭐⭐ And the valley ranched first

Martin Murphy's grant was **Rancho Pastoria de las Borregas** — *pasture
of the ewes.* The Santa Clara Valley was stock before it was fruit, and
the orchards came by subdividing the ranchos. So Halloran's grant was a
stock ranch, which slots into the founding sequence between *the land* and
*the rail* — and turns that sequence into the theory:

> ⭐⭐⭐ **Before the rail: cattle, because livestock transports itself.
> After the rail: fruit, because now perishables can move.**

The land use changed because the **transport cost** changed. Von Thünen
demonstrated by the town's own history, in one sentence, with no lecture —
and it retroactively explains why the rail mattered enough for a man to
give away his best ground.

⭐⭐ **It also means the valley has already done this once.** Ranch →
orchard is the same story as orchard → suburb, one generation earlier:
the older use is worth less than the newer one, sold one owner at a time,
nobody doing anything wrong. The player sees the **completed previous
round**, which makes the coming one legible with no foreshadowing — and
the last Halloran works the pack because his family's first loss already
happened.

### Where the animals go

Von Thünen's rings, inside one valley:

- **the flats** — orchards. Best ground, deep alluvium, senior water.
- **the bench** — marginal orchards, junior rights, private wells.
- ⭐ **the hills above** — grazing. No irrigation, extensive, the older
  land use pushed to ground nobody could orchard.

The manure/feed exchange is then **walkable**: manure down to the flats,
crop residue and pomace and prunings up as feed. A real trade between two
land uses in one town.

⭐⭐ And the political payoff, which a second town could not give you
because the parties would not have to live together:

- **The co-op is a *growers'* association.** It does not represent
  ranchers. So the valley's one working institution has no instrument for
  water **and** no membership for half its land — the *built for the wrong
  commons* point from a second angle.
- **The fence.** Open range versus enclosure, between neighbours, in one
  polity, with one side already losing on water.

### ⭐ But the serious range is not a town

A valley of orchards has no room for real herds, and cramming them in
shortchanges a trade getting its own build. Von Thünen again: intensive
mixed farming near the market, **extensive grazing beyond it.**

So the range is a **fourth place that is deliberately not a settlement** —
ranches are isolated, there is no main street. An *area* with outfits
scattered through it, whose signature activity is **the drive to market**
rather than anything done standing still. A genuinely different content
shape from all three towns.

⚠ **Open:** does the range get a name and a build of its own, or is it the
valley's back country? It decides whether ranching ships a fourth locality
or extends the valley's.

---

## 9. Decisions

- **V1 — The NPC is the default holder of a proprietor's seat, never the
  owner.** Sellable ⇒ `appointingAuthority: { kind: office }`.
- **V2 — Sweep to uniform `kind: office` in one pass at build time.** A
  non-sellable business becomes a positive declaration.
- **V3 — Bespoke vs archetype is decided by *foundable*, and it is rent vs
  competition.** Basic sector bespoke, support sector archetypal.
- **V4 — Five support archetypes, built once, every settlement**: general
  store · public house · lodging · smithy · depot.
- **V5 — ⭐⭐⭐ Coverage is a derived lint, not a list.** `lint:supply`
  over the recipe category graph, with a shrinking faucet allowlist.
- **V6 — Producer archetypes declare `yields`**, and the archetype `needs`
  vocabulary is extended past the closed six to admit ground/water/sun.
  ⚠ **The two substrate asks in this slate, and the only two.**
- **V7 — The universal five-rung ladder**, whose top rung is scarce for a
  reason that is not price.
- **V8 — Six farm shapes**, by what the ground does × cycle length.
  Coppice is the exemplar; pasture is a field.
- **V9 — You buy a going concern, not an empty shop.** The loop ships
  (`wallet use house` + `buy` + `restocks`).
- **V10 — Mechanism in the trade pack, instance in the locality.** Test: a
  second valley needs zero pack code.
- **V11 — ⚠⚠ Ranching ships before the towns work.** It closes the
  nitrogen faucet and supplies the valley's first land use.
- **V12 — The range is an area, not a settlement.**

---

## 10. Grounding (verified 2026-09-03, at `4e25aeb93`)

- **`appointingAuthority` kinds**: `entity` · `office` · `committee`.
  Shipped content is almost entirely `entity`; `committee` is used by the
  counting-houses and the registry; `office` appears only in tests.
- **Recipes** declare `inputSlots[].category` (+ `minGrade`, `measureL`)
  and `outputMaterial` / `outputTemplate` / `outputResidue`. `mash` needs
  category `malt`; nothing outputs malt.
- **Archetypes**: the `archetype` document kind, nine shipped;
  `needs` ∈ `tool · heatK · bulkSource · surface · seating · coldStorage`;
  `describe()` / `materialize()`; ⭐ **there is no `ArchetypeApi`**.
- **Nitrogen**: a reserve on **beds only** (percentage points); harvesting
  exports, `feed` restores. No declared producer.
- **`ranching-slate`**: core loop DECIDED; *pasture is a field*; rotation
  emerges from soil accounting; disease/breeding/herd-UX still open.
- **The business-account loop ships**: `actor.buysFor()`,
  `wallet use house`, `buy` stamping chattel to the business, `consign` as
  the business, and `/lib/behavior/restocks` (one live use).
- **`appraisal`** is a shipped Discipline.
- **34 content packs** ship, incl. 11 trades and 5 corpos.
- **Species gaps**: no barley, no fibre crop, no apricot/plum (cherry
  `prunus avium` ships).

---

## 11. Open questions

- **What is a business worth?** The one gap in the sellable contract.
  Premises + fixtures + stock + the earning power of the seat — and
  `appraisal` exists with nothing to appraise.
- **Does the range get its own build?** (§ 8.)
- **Does the fence question resolve?** Open range vs enclosure has a real
  historical answer (enclosure won, and it was ugly). ⭐ Lean: do **not**
  resolve it — let the valley's polity be the thing that cannot settle it,
  which is why nothing gets settled.
- **How many rungs does a given trade actually expose?** Five is the
  shape; not every trade has all five, and which are missing is a
  per-trade design question.
- **Who owns the support kit in a new town?** A player who opens the first
  store in a settlement that has none is doing something valuable; whether
  that earns anything beyond the business is unmodelled.
