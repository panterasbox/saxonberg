# Cannery & bottling slate — fill a vessel, seal it, and (for canning) kill what's inside

> **Status: UNBUILT** — designed at high level 2026-10-19 with the owner, out of
> the gap walk; the owner wants it **high on the list, as one build**.
> `trade-bottling` ships as a stub that fills nothing (its README: *"it fills
> vessels … the can-making and refining trades are both gaps"*); its seven
> mixer materials (soda, tonic, cola…) are stocked with no source. The
> [aluminium-can slate](../tails/aluminium-can-slate.md) designs the `fill`
> recipe, carbonation going flat, the deposit and remelt.
> [towns-slate](./towns-slate.md) designs **Cannery Row** (Heart's Delight's
> support half: the pack, the co-op, the packing house, Halloran). Spoilage ships
> `botulinum` with its spore floor, and says *"alcohol and acidity are not
> modelled as preservatives"* ([spoilage.md](../../subsystems/spoilage.md)).
> **Left:** acidity as a hurdle (the pH 4.6 line) · the seal as anaerobic · the
> water bath and the pressure retort · the blown can and the leaker · the vessels
> (jar, bottle, cork and crown, ⭐ the tinplate can) · ⭐ the metal-forming rung
> (rolling, tinning, the can maker) · bottling's fill + forced carbonation +
> flat-on-opening + the returnable bottle · ⭐ the label as a claim (the
> static display rung, the lot code, the recall; imported labels at first) ·
> the pack as seasonal hiring ·
> Cannery Row as the venue, the fish cannery as the second · the provisioning
> consumers (ship, voyage, garrison)
> **Size:** a large build (content-led, with two kernel deltas)

## 0. One build, because it is one act

**Fill a vessel and seal it; canning adds a kill.** Bottling handles what is
already safe — acid, carbonated or alcoholic drinks. Canning handles what is not,
and its whole science is one organism.

## 1. ⭐⭐⭐ The can is dangerous because of the seal **[DECIDED — lens 1]**

A seal does two things: it keeps contamination out, and it takes the air away.
Air-breathing spoilers stop. *C. botulinum* grows without air — and it is
already a spoilage row: a spore-former whose survivors wake as food cools and
then make toxin. **The seal creates the hazard the kill must answer.** The can
is safe because of the kill and dangerous because of the seal — the single most
important thing canning teaches.

⚠ **Kernel delta 1 — the sealed vessel is anaerobic.** Lean: derived from the
vessel's `closure: sealed` and its `open` state, never authored per can; an
aerobic row stops in a sealed vessel and an anaerobic one does not.

## 2. ⭐⭐⭐ Acidity is a hurdle — the pH 4.6 line **[DECIDED — lens 1]**

⚠ **Kernel delta 2.** *C. botulinum* cannot grow below about **pH 4.6**, and
that one line divides the craft:

| | examples | the kill it needs |
|---|---|---|
| **high-acid** | fruit, pickles, jam, tomatoes with lemon | a **boiling-water bath** |
| **low-acid** | beans, meat, fish, soup, milk | **pressure** — steam at about 121 °C, the retort or the pressure canner (spoilage already notes pressure cooking as *"the boiling-point cap under pressure"*) |

It is the rule everybody gets wrong at home. Acidity joins water activity as a
hurdle on the food; vinegar (which ships) becomes a preservative for the first
time, and pickling is canning's sibling for free. This is the spoilage hurdles'
work, and the cannery is its first consumer.

## 3. Failure is honest **[DECIDED]**

- **An under-processed can gives no sign you can sense** — spoilage's silent
  second population, unchanged.
- ⭐ **The one tell is the swollen lid** — gas from growth. A **blown can** is a
  real sense report, and *"if in doubt, throw it out"* becomes something a player
  can derive rather than be told.
- **A leaker** — a bad seal lets the outside back in.
- **The canner's skill** is headspace, the seal, and holding time at
  temperature — the shipped kill (`requiresHeatK` × `holdS`) already expresses
  the last.

## 4. The vessels **[DECIDED]**

| vessel | made from | status |
|---|---|---|
| the glass jar, a two-part lid with a rubber ring | glass, rubber, tinplate | glass and rubber ship |
| the bottle, corked or crown-capped | glass; cork; sheet steel | ⚠ **cork has no source** — cork-oak bark is a tap ([taps.md](../../subsystems/taps.md)), rows on a shipped mechanism |
| ⭐ **the tinplate can** | rolled iron sheet, tinned, formed and seamed | ⚠ the **metal-forming rung** (§ 5) |
| the aluminium can | the aluminium-can slate | designed |

## 5. ⭐⭐ The metal-forming rung **[DECIDED IN — the owner]**

The most-wanted missing process in the whole gap walk, brought in by the can:

- **The rolling mill** — bar or slab passed between rolls into sheet; thickness
  is the reading, and each pass work-hardens until it is annealed.
- **Tinning** — sheet dipped in molten tin: tinplate, iron that does not rust
  where it is coated (and does at a scratch).
- **The can maker** — cut, form, solder or seam the body, the ends. ⭐ Can-making
  is a process distinct from filling: bottling and canning *fill*; they never
  make the vessel (the trade-as-process rule the bottling README already states).
- **Tin** is designed in the [metal-chain slate](./metal-chain-slate.md) Stage C
  (the bottom of the Ferrow; the Weeping Moor stream-tin) — this build is its
  first big consumer, not its designer.
- **What else it unblocks** — nails and wire (wire drawing is the rung's second
  act), gutters and flashing, springs, eyelets, the crown cap, and the aluminium
  can's forming.

## 6. Bottling's real work **[DECIDED]**

- **The fill** — the aluminium-can slate's `fill` recipe: a clean empty vessel,
  filled, marked, closed.
- **Forced carbonation — Henry's law.** CO₂ dissolves under pressure, and cold
  liquid holds more. The CO₂ comes from fermentation (the cellars already make
  it, [maturation.md](../../subsystems/maturation.md)) or chemically — chalk and
  vitriol, as the first mineral waters were made. ⭐ This gives soda, tonic and
  cola a source.
- **Flat on opening** — the aluminium-can slate's reconcile-on-read design.
- **The returnable bottle** — a deposit attached by law, the return at any
  counter, and the collector who exists only because a polity priced the bottle.

## 6a. ⭐⭐⭐ The label is a claim about what you cannot see **[DECIDED — added 2026-10-19]**

A sealed can hides its contents from every sense — that is what the seal is
for. So **the label is the only way anyone knows what is inside**; before
labels, you opened it or you trusted the seller.

- **An unlabeled can reads as "a can."** Naming it *"a can of apricots"* with
  no label would be the engine telling you what nobody in the world could know.
- **The label is evidence, not truth.** It can lie — mislabeling, adulteration,
  a counterfeit brand: [belief.md](../../subsystems/belief.md)'s *disguise is
  perceptual*, applied to goods.
- ⭐ **The brand becomes legible here.** A brand resolves on read
  ([corpo.md](../../subsystems/corpo.md)); on a sealed good the label is the only
  place a buyer can see it, and counterfeiting is a forged label.
- ⭐ **The lot code ties the can to its batch.** When a batch is under-processed
  and a lid domes, the code on the end is what makes a **recall** possible;
  without it every can of the season is suspect. The inspector reads the process
  record; the lot code is how they find which record.
- **The law lands on the label** — contents, net weight, maker. Weights and
  measures and food standards act on the label, never on the can.
- ⭐ **The label is a static display** — the same rung the printed page takes in
  [paper-and-printing-slate](./paper-and-printing-slate.md). **This build ships
  the rung** because it is first and needs it; its labels begin as an
  **imported** printed good (imports are the backstop's ceiling, which our
  doctrine allows), and the paper and printing build replaces the import with
  the mill, the press and the jobbing printer. The cannery is the paper mill's
  first big customer before the mill exists — demand first.

## 7. ⭐⭐ Why it matters — the economy **[DECIDED — lens 6]**

Canning turns a **seasonal glut into a shippable, year-round good**: the valley's
apricots on a city shelf in winter. It is what **feeds the ship's cook, the
research voyage and the army** — Appert's prize (1810) came from the French
state, for feeding its armies. Every voyage designed in
[ships-and-harbors-slate](./ships-and-harbors-slate.md) has a provisioning
problem this solves; the garrison (a gap-walk cluster) will be the third.

## 8. The venue and the labor **[DECIDED]**

- **Cannery Row, at Heart's Delight**, as towns-slate designs it — *"warm and
  shabby, with a demimonde: the people who came for the pack and stayed."*
- ⭐ **The pack is seasonal hiring** — a position with a **term that ends on a
  condition** (*"until the pack is in"*); [contract.md](../../subsystems/contract.md)'s
  clauses over verifiable conditions already have the shape. Paid **in a lump**,
  which is why a bad season is a solvency event and why seasonal credit (the
  crop loan, [credit.md](../../subsystems/credit.md)'s working-capital rung)
  matters. A Rejection miner on off-cores can work the pack: two labor markets
  meet on the valley road.
- **The first chain** — the valley's fruit pack: apricots and cherries in syrup
  (high-acid, the water bath) — which needs **sugar**, in progress on build-1, so
  this build lands after it.
- **The fish cannery at the wharf is the second venue** — low-acid, the
  pressure retort — and **rows only**: the *a second venue needs no pack code*
  test.
- **The order of rungs** — the glass jar and water bath first (the historical
  start), the tin can and retort as the industrial rung, aluminium later.

## 9. The drive, in one line

You take the pack at Cannery Row; you can apricots in syrup in a water bath and
seal them; one batch you short on time — and three weeks later a lid is domed. The
good jars ride the freight to Terminus and sell in winter for three times the
summer price, and a ship's cook buys a case for the voyage.

## 10. Lens pass

1. **Pedagogy** — the seal as hazard; the pH 4.6 line; time at temperature; the
   blown can; Henry's law; rolling and work-hardening. Decided §§ 1–3.
2. **Expression** — a second cannery is rows (fish at the wharf); any locality's
   preserved goods are rows on the pack.
3. **Immersion** — the packing house in season and empty after; the domed lid.
   **Participation** — the pack as an entry point for a player with nothing; the
   co-op; the bottle collector.
4. **Values** — safety against the margin (shorting the time); the deposit as a
   polity's price on waste.
5. **Continuity** — jar → can → retort → aluminium: the same fill, seal and kill
   at every rung.
6. **Economy** — time-shifting a glut; provisioning every voyage; the can maker,
   the canner, the packer, the collector. The demand was there first: the bar's
   mixers and every ship.
7. **Governance** — the deposit law; food safety as a polity's standard (an
   inspector reading the process record, never the can).

## 11. Open

1. **The anaerobic derivation** (§ 1) — exactly what a sealed vessel changes for
   each pathogen row.
2. **Acidity's home** — on the material, on the payload, or derived from what was
   added (lemon, vinegar).
3. **The metal-forming pack's root and name** — its own trade, beside smithing.
4. **Cork** — the cork-oak tap and where it grows.
5. **The hand of the soldered seam** vs the double seam — which rung ships first.

## ⭐ A label is a NOUN (user, the underwater review, 2026-10-20)

*"labels are nouns and we're going to want to have labels on real goods
… `label bottle` is gonna be the natural expression of affixing a label
to a bottle … labels exist and they mean something specific, not just
any old text."* So bottling's `label <bottle>` AFFIXES a label — a made
good (printed, bought, a brand's) — to the bottle. ⚠ The shipped
platform `label <thing> <text>` (write a name a thing answers to) is
writing on it, not a label: this build reconciles the two — the shipped
verb's renaming job either becomes `write … on` or keeps a word that is
not `label`.
