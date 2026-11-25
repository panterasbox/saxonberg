# Population biology — the body's biology at the scale a trade works

> **Status: UNBUILT** — seeded by the organism-biology review (MR !652,
> 2026-11-23), from a survey of every animal trade against the new biology.
> **Left:** herd-scale acts · gestation and birth · tap rates by instrument
> and epoch · bloodless castration · spaying · the fleece at slaughter ·
> the wild stock's stages and seasons · landed fish sex and age · hide by
> stage · whaling · feedlot and plant scale · the late-cut male (a ruling)
> **Size:** a build

The organism-biology build made biology a property of the **individual
body**: modules and parts, sex/neutered/stage variants, castration as an
operation, metamorphosis by life stage, phenology, taps gated by
condition, coats that insulate, cuts derived from the body
([body.md](../../subsystems/body.md)). It holds wherever one body is minted
and looked at — a drafted head, a pet, a landed fish, a carcass.

Every trade that keeps animals in numbers, though, **compresses** them:
the herd is a filed record ([ranching.md](../../subsystems/ranching.md)),
the fishery a derived one ([fishing.md](../../subsystems/fishing.md)), the
rearing a tray's state ([sericulture.md](../../subsystems/sericulture.md)),
the colony the animal itself ([apiculture.md](../../subsystems/apiculture.md)).
The new biology reaches those records unevenly, and none of the acts it
added has a shape above the Muscle epoch. This slate is the question
*how does a body-level act apply to a population record, at every epoch?*
— cross-cutting, so not a trade build's to solve.

## What reaches each scale today

| Trade | One animal | The record that stands for many |
|---|---|---|
| Cattle, sheep, goats, pigs, poultry | all of it (variants, castration, stage, phenology, taps, butchery) | sex and castration only as `femaleFraction` / `neuteredFraction` and the per-head overlay's `lostParts`, read at the draft; **no herd act** |
| Dairying | a milk tap on one drafted cow, by hand | nothing at herd scale |
| Sericulture | one exemplar worm | the tray's degree-days drive the stage — **holds by design** |
| Fishing | a landed fish gets length and pathogens; **no sex or age** | the fishery never sees stages or seasons |
| Apiculture | — | the colony is the organism; no body modules (deliberate) |
| Pets | a dog can be castrated; a bitch cannot be spayed | — |
| Tanning | pelt flaws and the winter grade | one generic hide whatever the animal's stage |
| Whales | body rows only | no stock, no place, no harpoon |

## Open design questions

1. **Herd-scale acts.** Should *cut this year's bull calves*, *wean the
   lambs*, *milk the herd* be acts on the herd record that write the
   overlay in bulk (and cost the hours a crew would spend), instead of a
   draft per head? ⭐ Labor, not a click: who does it, and who is paid.
2. **Gestation and birth.** Lactation at the draft is the
   `freshenAtDraft` stand-in for calving, and nothing writes a head's
   `bornAt`. Should `pregnant` → birth → `with-young` make lactation follow
   a birth, and the dam be recorded?
3. **Tap rate and tool by epoch.** `Producing.planTap` ignores the tool,
   and `takeMs` is per tap, so pail → machine → parlour and hand shears →
   powered shears cannot be rows. (Pre-existing: shearing needs no
   shears.) Should a tap's rate be an instrument capability?
4. **Bloodless castration.** The ring and the crush are later-epoch
   methods. Should an operation `resolution` drop the part without a
   bleeding wound and without minting it?
5. **Spaying.** Should the female body carry an organ the operation can
   address, so the commonest pet operation exists?
6. **The fleece at slaughter.** No path takes a standing fleece off a
   carcass (no wool line), and `Body.coatMassKg` reads the authored depth,
   not the tap fill, so shear-then-slaughter would pay twice once one
   exists. Should a slaughtered sheep give its fleece or a woolskin?
7. **The wild stock.** Should a fishery or a pond carry life stages and
   seasons (tadpoles that change, frogs that den), or only a landed
   individual?
8. **Landed fish sex and age.** Seeded from length, they would let roe,
   milt and maturity come from the body. Today every fish's gonad tissue
   maps to roe, male or immature (`torso-fish.yaml`).
9. **Hide by stage.** Calfskin, kip and hide by a variant's `comesOffAs`?
   (Unverified whether a variant delta can override `comesOffAs`.)
10. **Whaling.** A stock, where the whales are, and the harpoon's epoch.
11. **Feedlot and plant scale.** Many animals and nobody looking: does the
    herd record carry condition, castration and slaughter throughput, or
    does that wait on the movers of the
    [machines slate](machines-slate.md) § 5?
12. **A ruling: the late-cut male.** A male cut after maturity keeps the
    derived `entire` (D8: *a bull cut late stays a bull in his ways*), so he
    still ruts and serves without gonads. Ways, yes; serving, no?

## Small findings to fold in when this is built

- `Producing.ts` picks a closed tap's reason by the condition path's
  suffix (`/laying` → not-laying, else not-lactating): any new `activeIn`
  condition will refuse as "not in milk".

## Fixed in the review, for the record

Landed in MR !652: a boar and a cockerel carry gonads (barrow, capon); an
adult hen lays and a chick does not; a herd of cows and steers no longer
"serves" (`Livestock.breedRefusal` counts only the entire males).
