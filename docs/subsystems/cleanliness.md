# Cleanliness — dirt by kind, the wash, the clean tiers, kept places

> *A thing gets dirty only through an act, and comes clean only through
> one.* There is no clock on dirt anywhere in this subsystem — with one
> declared exception (the byre's stalls, § Places).

Built by the cleanliness build (2026-10-17; plan
`docs/plans/cleanliness-plan.md`, decisions D1–D31 and build decisions
B1–B36). Seeding slates: laundry, room-condition, rendering § 9,
bathroom.

## The model

**`SoilableMixin`** (`lib/cleanliness/Soilable.ts`) is the one carrier.
State, all persistent runtime state, scalar-decomposed (⛔ never a `Map`):

| field | what |
|---|---|
| `deposits` | `site\|kind` → a dimensionless load. `site` `''` is the whole thing; a body keys by body part. |
| `setDeposits` | which of those have SET (blood washed hot) |
| `stains` | blood only: the bleeder's type, system, species and identity — ⚠ spoiler level 2, the forensic read is `analyze` |
| `washes` | per site: the last wash (cleanser, action, water heat, hardness) |
| `heat` | the hottest hold since the last deposit (`peakK`, `heldS`) |

**`soil(kind, amount, by?, site?)` is the ONE writer.** It clears the heat
stamp (a sterile thing touched is not sterile) and, on a Contaminable host,
seeds what the DirtKind row says the dirt carries (manure → *e. coli*).
Bands are words: `clean · marked · soiled · filthy` (dials
`cleanliness.band.*`); the look line is `soilPhrase` — *soiled, bloodied
and greasy* — never a number.

Hosts: `Garment`, the body (per part, through `AttiredMixin`), the `Floor`
twin, `Window`, `Chair` (seats, beds, the `Tub`), `Lamp`, `Bandage`,
`CraftVessel`, trade-cooking's `KitchenTool`, trade-medicine's
`SurgicalKit` and `SutureKit`, `Rug`. ⛔ Not `Thing`, `Good`, `Tool` or
`Receptacle`.

### Two row families (no code to add one)

- **`DirtKind`** (`/platform/idea/DirtKind`, rows at
  `<root>/idea/DirtKind/<key>`): the adjective, the `form` (`film` washed,
  `debris` swept, `stain` a film that can set), what cleanser `answersTo`,
  `setsAboveK`/`setAnswersTo` (blood: 318 K, then only a bleach),
  `waterLifts` (what plain water takes — mud 0.7, grease 0.05),
  `contaminates`.
- **`Cleanser`** (`/platform/idea/Cleanser`): the material `agent` tag
  the wash finds it by, one `action` from a CLOSED ten-word mechanism
  vocabulary (`surfactant · alkali-mild · alkali-strong · acid-mild ·
  acid-strong · solvent · absorbent · abrasive · oxidiser-slow ·
  oxidiser`), non-corrosive `damages`, `hardWaterPenalty`, `softens`,
  `consumesPerWash`, `skinHarshness`, `ambient` (sunlight, sulfur fume —
  read from the room). ⭐ Burning and rotting are DERIVED from the agent
  material's `corrosiveTo` ∩ the fibre's tags, never authored twice.

Both are read through lazy catalogues (`DirtKindCatalogue`,
`CleanserCatalogue`): async warm on first miss, sync `peek` everywhere
else. No boot list.

## The producers — every act names its deposit

`Recipe.soils`, `TapSpec.soils` and `WorkResult.soils` carry a
`SoilSpecs` value (`lib/cleanliness/SoilSpec.ts`): `{kind, amount,
where}` with `where` ∈ `hands · apron · feet · floor`. The act lands it
through `Attired.soilFrom`; the wearer decides which layer it reaches
(`outermostAt`). Butchery bloodies the apron and the hands; a glove takes
a hand's deposit once per layer; eating drops `crumbs` on the floor (the
one debris producer, B6); a fire's incomplete exhaust soots every Soilable
fixture in its room; walking carries a floor's soil onto the feet
(`receiveTraffic`).

**Hands** (`AttiredMixin`, B1): `handSites`, `handCleanliness()` (the
derived number the treat path reads — the old six-hour hands clock is
deleted), `soilHands`, `washHands`. `remove gloves` quickly puts half a
dirty glove's load on the bare hand; `remove gloves carefully` puts none.

## The wash

`Soilable.washSite(spec, site)` is the chemistry (B8 — not `wash()`, which
is the vessel service wash). A `WashSpec` is the water's heat and
hardness, zero or more cleansers, and the effort (a scrub is 3). Per kind:
what a cleanser's action answers to comes off, scaled by heat, effort and
hardness (soap scums in hard water; soda softens it); blood washed hot
SETS. A host adds what washing does to IT by override — a `Garment`
felts (protein fibre at a boil), shrinks (≥ 333 K), rots or burns
(`corrosiveTo`), fades and bleeds an unfast dye onto everything in the
same water, comes out wet. Cleansers are spent by use (B12).

Hardness rides the water (`Hardness.ts`'s payload merge): a pail keeps its
source's hardness; a tap reads its main's; unknown water washes as 8 °dH.
`Soilable.washRefusal()` lets a host refuse in words — an earth floor is
strewn and swept, not scrubbed (B19).

**Airing** settles at `look` (`reconcileAiring`, B17): a garment lying in
a room by daylight bleaches (linen) or yellows (wool); sulfur fume whitens
wool back.

## The clean tiers — derived, never stored

`cleanTier(site)`, lowest first:

| tier | when |
|---|---|
| `dirty` | soiled or worse, or marked with a film on it |
| `presentable` | marked, no film — or clean to look at but never washed or heated since it was touched (B22: *raw*) |
| `clean` | washed |
| `sanitised` | washed hot (≥ 333 K) with a surfactant or alkali |
| `disinfected` | a boil held (≥ 373 K, 300 s), and no pathogen survives |
| `sterile` | a dry heat or a flame ≥ 433 K for 60 s |

Writers of the heat stamp: `boil <cloth> in <pot>` and `heat <instrument>`
(held in the flame), each also running the shipped kill law
(`Contamination.killOver`; spores survive a boil). Readers:

- **the clinic** — a dressing's quality IS its tier (raw 0.3, washed 0.6,
  sanitised 0.8, boiled 1); `applyTreatment` seeds sepsis from the WORST of
  the hands, the dressing short of disinfected and the instrument short of
  sterile (surgery) or disinfected (a suture needle); surgery seeds
  whatever the wound's type (B23). A competent nurse boils a raw bandage
  first.
- **the kitchen** — a board, knife or hand short of sanitised inoculates
  the food it touches with `staph-aureus` BEFORE the working's kill (B24):
  a stew boiled long enough is safe, a salad cut on a dirty board is not.
  Perishable inputs only.

## Places

- **The floor** (`FloorMixin` + the `Floor` twin): `takesSoil` (a water
  surface or ice sheet takes none), `cleaningMethod()` exhaustive over the
  ground kinds (`strew and sweep` for earth, `scrub` for rock, `scrub or
  sand` for boards…), `strew`/`takeStrewn` (rushes, sawdust — a strewn
  absorbent drinks blood, grease and milk), `sweepUp` (on a strewn floor
  everything; on a scrubbed one the debris), `sweepsInto` (the heap row:
  sweepings, the byre's muck). Verbs: `sweep`/`muck`, `strew`, `dispose`
  (into a midden), `beat` (a rug). `survey` reads *the floor is soiled; to
  scrub it would see to it*.
- **The stalls** — the ONE calendar accrual: a byre floor row names its
  herd book (`stalls: {herdbook}`) and fouls by head × days, reconciled on
  read, following the authored reference.
- **Pests** — derived, never a field: debris over
  `cleanliness.pests.debrisAt` and open food in the room. The floor says
  *something has been at the crumbs*; loose food spoils faster by
  `cleanliness.pests.ratePerHour` (B21). Sweep up and they go.
- **The flue** (`FluedMixin`, on `Hearth` and `Oven`; a `Brazier` has
  none): soot by kg burnt × incompleteness; a foul flue under a roaring fire
  CATCHES (heat and smoke into the room). `sweep hearth with flue brush`
  clears it; `sweep hearth` rakes the grate's ash.
- **The window** — grime is a factor inside `Window.transmissivity()`
  (a filthy pane passes 40 %). ⭐ A sky-lit room's named opening may be a
  one-sided pane IN the room (`/stuff/thing/fixture/window`): the vision
  walk multiplies the sky leg by `AmbientLit.openingTransmissivity()`, so
  grime and shutters darken it (B18). The cookhouse, the Hinkley kitchen
  and the cooking kitchen carry one.
- **Rest** — `Postured.restQualityAsKept()`: a filthy bed in a filthy room
  rests worse, never to nothing (the archetype still calls it a bedroom).
- **Dust** — the mill and the scutch put flour/flax dust in the room's
  air; a material's `flammableLimit` flashes on a flame; damped and swept
  it does not. The Hearts' Delight stones moved indoors to the mill house,
  a 4 m room (`extent: 4`) — a dust share is per volume, so the room's
  size is the dial (B36).

## People — somebody is paid for it

- **`order wash <garment>`** — the hand (`CraftingApi.fulfillingHand`,
  restricted to the tariff's own house and the row's
  `serviceDisciplines`) reads the garment at HER band
  (`Garment.describeForLaundress`), names a price (`Tariff.quoteFor`),
  checks you can pay, asks; then washes it HER way: `WashPolicy` — the
  band chooses the METHOD (untrained boils and reaches for lye, novice
  boils with soap, competent reads the fibre, a master never shrinks it)
  and the cloth decides what that does. Ruined comes back with the house's
  posted `cover`, paid by `BankingApi.indemnify` — never to one of the
  house's own seats (B26).
- **`order bath`** / **`bathe`** — `Attired.bathe(spec, s)`: every part of
  the body washed, then `immerse` (bathe dressed and your clothes soak),
  then `ThermalRegulation.exchangeWithWater` (B29). A `Tub` holds water; a
  `Copper` is a boiler over its own fire (B30); a shore answers through its
  one draw (frozen refuses).
- **The doorman** — a `KeptDoor` exit asks a keeper on either side with a
  door-judging brain (`doorman`); HE decides he is on duty (on shift for the
  door's `keptBy` house — a seat, never presence) and judges by the dress
  code on his row; the refusal is his words (B31). `remarks` is the same
  shape on arrival: a fisher notices a banker's coat.
- **The clean contract** — `job post clean <place>` / `clean <thing> at
  <place>`; `Condition.cleanHolds` reads the floor's band, a flue's soot,
  a garment's band (B20).

Venues: the lavoir off the wharfside bank (`lavoir`), the bathhouse north
of the market square, the Goodkin parlor arch. A second of any is rows.

## Persistence

`PersistentCartesianLocation` keeps a place's floor, fire and fixtures
across a restart through Adornable's fixture slice (`captureHostOf` walks
fixture → host). Kept places: the cookhouse, the chandlery, the glazier's
hut, the shop floor, the lavoir, the bathhouse rooms.

## Fidelity limits, stated

- Particulates (flour, flax dust, soot smoke) ride the atmosphere as
  gases.
- Airing samples daylight in two-hour steps at the read.
- Light-strike and pests are sampled once per freshness reconcile.
- The house's soap is not spent by a paid wash (B28); the copper's fire is
  the house's abstraction (B30).
