# trade-distilling

The distilling trade — a **capability** pack (it ships `src/`).

- `src/thing/SpiritBottle.ts` — `/platform/thing/Bottle` with the spirits
  preset (0.75 L, sealed, `spirit` keyword). Every floor row is a row over
  it.
- `src/thing/Still.ts` — the distiller's station: the furnace family's
  composition plus the `still` tool capability. No recipe names it yet —
  the distillery build's.
- `content/trade/distilling/idea/material/` — the ten spirit materials
  (`ConsumableMaterial` rows; the `tags` carry the recipe category).
- `content/trade/distilling/thing/` — the generic floor bottles (one per
  material, `censusKey: spirit:<x>`, at target through the spawn sweep,
  home `container:` the floor outfit's Stock), `crowsfoot-gin` (flagged:
  consigned by the "small outfit" until the distillery build replaces it),
  the cash-and-carry `counter` (a `Stock` with **no** `stockLines` — a pure
  brokerage), the two outfit stocks, the racking, the still.
- `content/trade/distilling/location/` — the `cash-and-carry` (the
  distributor's showroom), the `warehouse` bundle exemplar, the two floors.
- `content/trade/distilling/idea/` — the distributor Business (`clerk`,
  `keeper` (purchases)), the two outfits (`hand` (purchases)), and the
  `distilling` discipline row.
- `content/trade/distilling/agent/` — the clerk and the two hands (the
  kernel's `consigns` brain, configured to the counter).

- `content/trade/distilling/location/veshko-yard.yaml` + `location/veshko-yard/{location,thing,agent,idea}/` — **Veshko's yard**:
  the zone that authors `stocks:` (the exemplar), the distillery floor,
  Veshko Distilling (`idea/outfit`, `parentOrganization: /corpo/veshko`),
  its stock, its hand, and the floor rows — Volk and the unbranded
  whiskey / rum / gin Hollis private-labels.
- the `hollis-*` rows under `content/trade/distilling/{agent,idea,location,thing}/` — **Hollis's bottling floor**: a
  warehouse that distils nothing; `old-hollis` / `hollis-cane` are rows
  whose `interiorMaterial` is distilling's whiskey / dark rum (the
  private-label fact, legible on `look`); Hollis Bottling (`idea/outfit`,
  `parentOrganization: /corpo/hollis`), its stock, its hand.

A corpo pack supplies capital + the mark; a corpo-owned producer is a
product of the trade and lives here, pointing UP at its owner. The trade
names nobody downstream. Every stub trade names
`/trade/distribution/thing/counter` in its hand's `consigns` config.

## ⭐ The roster — who makes what, and why it is legible

Four producers consign onto the one cash-and-carry counter. The shelf is
meant to *take a side* (corpos-slate), so every row has an owner with an
ethos and a position:

| producer | what it is | rows |
|---|---|---|
| **Veshko's yard** (`/corpo/veshko`) | the volume distillery — the Ruthless Optimizer | the six **unbranded rail** pours (gin, vodka, whiskey, light + dark rum, tequila) **and** Volk |
| **Hollis's floor** (`/corpo/hollis`) | mass retail; distils **nothing** | Old Hollis, Hollis Cane — Hollis's mark on Veshko's liquid |
| **Crowsfoot** | the small house across town | its premium gin **and** the four botanical specialties — bitters, orange and bitter liqueur, aperitivo |
| *(the cash-and-carry)* | the distributor — brokers, produces nothing | — |

**Same still, three positions.** Veshko's whiskey is sold unbranded on
the rail, and again as *Old Hollis* wearing Hollis's mark. A curious
player who reads `interiorMaterial` finds the same liquid at two prices —
the Kirkland structure, and the point of the whole exercise.

⭐ **The rail carries no mark, so it lives at the TRADE's paths**
(`/trade/distilling/thing/gin`), not under Veshko's yard; only its
`container:` says who makes it. That gap is deliberate: **the corpo is in
your glass even when there is no mark on the bottle.**

⭐ **The independent has a real position, not a curiosity's.** A negroni
needs bitter liqueur, a spritz needs aperitivo, an old-fashioned needs
bitters — so a bar cannot serve its menu without dealing with Crowsfoot,
however much cheaper the corpo's rail is.
