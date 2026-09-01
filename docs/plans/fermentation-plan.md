# Fermentation — plan

**Input:** [fermentation-requirements.md](../requirements/fermentation-requirements.md)
(D1–D10 locked). One stage, eight waves, one MR. The lane: grown grapes
→ must → wine → spirit → vermouth → Dave's unmodified martini; beer at
the process tier over bought malt; the distributor decoupled from
distilling on the way.

## Plan-level decisions

### P1 — The batch state, and how temperature history is honest

`FermentingMixin` (kernel, `lib/ferment/`) composes on the vessel.
Batch state: `phase` (`idle · active · finished · turned`), the must's
starting sugar (read off the input material at fill), fraction
converted, and the **worst-stretch record**. Reconcile-on-read over
game-time, no far-past guard (D1). Temperature history rides the
husbandry trick — **windows are segmented at events, not integrated
from history**: each reconcile reads the vat's own reconciled
temperature (`ThermalMixin`'s lazy read — the vat Newton-cools toward
its room, which is what makes the cellar real) and credits the closed
window at that temperature. Conversion rate = the profile's curve at
window temperature; too cold contributes ~zero (stall, forgiving); the
hot band writes the worst-stretch record (grade damage); past
`finished`, an **open** vessel converts ethanol → acetic acid
(`turned`), a **sealed** one holds (D3). Sealed = `Sealable`'s existing
bistate (`close`/`open` — the vat's bung; zero new verbs).

### P2 — Profiles are Idea rows; a catalogue warms them at boot

`FermentProfile` is a kernel concrete at `platform/idea/ferment/`
(the Species-row pattern): `inputCategory` (+ optional tags),
`temperature band` (stallBelowK / happyK / damageAboveK), `rate`
(fraction per game-day at happy), `productMaterial`,
`turnedMaterial` (vinegar), optional `sealedOnly` (bottle
conditioning). Trade packs author rows under
`/trade/<x>/idea/ferment/…`. `FermentLogic` (the Api/logic pair at
`/platform/idea/api/ferment`) **warms the profile roster at boot** —
⚠ the reference-Ideas-inert-at-boot recurrence (3×) is the named risk;
the boot warm is a wave-1 acceptance test, not a hope. Profile match is
by the must's material category; two matching profiles is an authoring
error surfaced as a diagnostic, never a roll.

### P3 — The seam: `BulkableApi.transfer` carries the batch's identity

The one shipped chokepoint every fill/pour already routes through.
When the source holds a graded batch, the transfer stamps the target's
`GradedMixin` band and the **maker's mark** (D6, D9). The mark's owner
is the actor who filled the vat (the batch's founder — recorded at
fill, carried through). Built and tested FIRST (W0): the acceptance is
Dave's `minGrade: fair` accepting a player bottle.

### P4 — Zero new verbs: every act is a shipped shape

- **crush** (grapes → must) and **mash** (malt + water → wort) are
  **Recipe documents** — the simple-syrup shape verbatim (input slots,
  `toolCapabilities: ["press"] / ["mash-tun"]`, bulk output into the
  vessel). The press and mash-tun are pack fixture rows conferring the
  capability, the anvil precedent.
- **distil**, **compound** (spirit + juniper → gin), **fortify**
  (wine + spirit + botanical → vermouth) are Recipes too:
  `toolCapabilities: ["still"]`, `requiresHeatK: 351` (ethanol's
  boiling point — the number IS the lesson).
- **rack** = `pour` (shipped), **seal** = `close` (shipped),
  **bottle** = `fill` (shipped). Fermenting itself is passive on the
  vat. The craft is timing and conditions, not a verb list.

### P5 — The vat family, and sparkling by bottle conditioning

`platform/thing/Vat`: `FermentingMixin` over
`Bulkable + Sealable + Thermal + Detailed + Thing` — the one concrete
every trade's rows name (D2/D10). Sizes are authored data (a carboy is
a small vat). **Sparkling is honest**: a `conditioning-bottle` row over
the same class with a `sealedOnly` profile — the second ferment happens
sealed in the bottle, which is what sparkling *is*. No mixin on
`Bottle`, no second mechanism.

### P6 — The `distribution` pack (D10's decoupling)

New pack `distribution`, root `/trade/distribution`, depends on
platform only. The cash-and-carry venue (rooms, `counter` Stock, clerk,
its Business) moves in; **eight `consigns` shelf configs repoint** to
`/trade/distribution/thing/counter` (farming, hearth-cooking, bottling,
brewing, winemaking, and distilling's own three hands), Wen's restock
supplier likewise; ~67 files reference the old paths — mechanical, and
`lint:gates`/`lint:instanceable`/pack `requires` make misses loud.
Every trade pack swaps its distilling dependency for distribution;
sibling trades end the wave with **no edges between them**. **Malt**:
material row in base-library (the commons, D10), the sack + its
floor-stock at target in the distribution pack — the honestly-labelled
imported-input faucet.

### P7 — The producer brains, and the B2B leg

Winemaking and brewing ship a `cellars` brain (`src/behavior/`, the
`farms` shape: literal player verbs, bounded, home in `finally`) —
crush/mash when a vat is idle, read the vat, rack + seal at finished,
bottle, consign. Crowsfoot's hand runs a `distills` brain — and the
**vintner's fortify step BUYS spirit at the distributor with the house
card** (the shipped hire-time deal; the purchase lands in
`bank_ledger` — the observable B2B leg). No new employment machinery.

### P8 — Reads, disciplines, the switchover

- **Senses**: the vat's phase derives its description and an audible/
  smell detail (bubbling / still / the vinegar edge) — state-derived
  details, honest-fog, no gauges.
- **Hydrometer**: a generic-objects instrument row mirroring the
  thermometer's pattern exactly (readings are channels, procedures are
  verbs); it reads the batch's gravity (derived from sugar remaining).
- **Disciplines**: `distilling` ships already (trade-distilling);
  `fermenting` is one new row in base-library (both trades credit it —
  the horticulture practised-leaf pattern).
- **Switchover** (last wave, atomic — farming P0 discipline): the
  winemaking and brewing floor products stop arriving at target and
  the brains' production takes over; bottling and farming faucets
  untouched.

## Waves

### W0 — The grade seam
`BulkableApi.transfer` carries band + maker's mark from a graded
source. Tests: vat→bottle stamps both; ungraded sources unchanged;
a stamped bottle passes a `minGrade: fair` recipe slot. **Smallest,
first, load-bearing** (D6).

### W1 — The kernel transform
`lib/ferment/Fermenting.ts` + `platform/idea/ferment/FermentProfile` +
`FermentLogic` (boot-warmed roster — with the inert-at-boot test) +
`platform/thing/Vat`. Tests: the two-temperature experiment (two vats,
profiles' slopes recovered from gravity reads over stepped game-time);
stall/resume; worst-stretch banding; finished+open → `turned` with the
profile's `turnedMaterial`; finished+sealed holds; conservation (sugar
in = ethanol fraction out); zero `Math.random` in the tree.

### W2 — Distribution + malt
The pack, the venue move, the eight repoints, the dependency swap, the
malt material/sack/floor line. Full pack suites + lint battery green;
the dependency graph shows no sibling-trade edge.

### W3 — Winemaking produces
Crush recipe + press fixture; profiles: red, white, the
`sealedOnly` conditioning profile for sparkling, vinegar as every
grape profile's `turnedMaterial`; the vintner floor becomes the
working winery (vats, press, cellar room with authored thermal mass);
the `cellars` brain; vinegar consignable + a pantry par line for it
(the cook buys the failure path). Fixture-world brain test.

### W4 — Brewing produces
Mash recipe + mash-tun fixture; wort; ale/lager profiles; the brewing
floor reworked; the same `cellars` brain with brewing config. A keg of
ale carries its batch band.

### W5 — Distilling produces
Wash profile (malt wort → wash), distil recipe (wash → neutral
spirit), gin compounding (spirit + juniper), brandy (wine → spirit —
the grape lane's own spirit); **vermouth recipes in winemaking**
(wine + bought spirit + botanical + sugar for sweet); the Crowsfoot
floor venue + `distills` brain; the vintner brain's buy step (the B2B
ledger test). The martini's inputs now all exist from lane output.

### W6 — Reads, disciplines, marks
Vat sensory details; the hydrometer row + reading; the `fermenting`
Discipline + act credits on crush/rack/distil; the maker's-mark
surface on look (band + mark readable on the rail). The
author-expressiveness proof lands here as a test: **cider from rows
alone** (apple exists? if not, the test authors a synthetic fruit +
profile under `/test/**`) — zero kernel edits asserted by construction.

### W7 — The switchover + checkpoint drive
Floor faucets for wine/beer replaced atomically by brain production.
**Drive (the checkpoint):** compressed clock (≤6000×), live server —
crush grapes, ferment, catch and seal the batch, bottle, distil the
wash, compound the gin, fortify the vermouth, `order martini` at
Dave's and watch it settle; one batch deliberately left open past
finished and its vinegar sold to the pantry. Docs:
`docs/subsystems/fermentation.md`; content-packs rows for the three
trades + distribution; slate annotations.

## Risks

- **The boot-warm recurrence** (reference Ideas inert at boot, 3×) —
  named, tested in W1, not discovered in W7.
- **The venue move's blast radius** (~67 files) — mechanical, but the
  hunk-splice lesson from the !212 merge applies: audit key membership
  after any scripted edit, never trust the textual join.
- **Clock compression ceiling** (~10000× starves the event loop —
  measured in the farming drive): ferment day-counts in profiles must
  fit a ≤6000× drive window.
- **Build coordination**: the wash draws water from shipped
  standpipe-shaped sources only; if build-2's water infra lands mid
  build, W3+ rebases onto it rather than designing around it.
