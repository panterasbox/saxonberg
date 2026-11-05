# Potash — big ash and little ash

> **Status: PARTIAL** · opened 2026-10-18 from the cleanliness MR's ash lens
> pass (!380), **designed the same day** with the founder. Little ash
> shipped with cleanliness (!380); the heap at scale — the pit, the derived
> leach, the egg, the boil on the plateau, pearl ash, the flux/stabilizer
> retag, the Hanging Wood ashery and the ash round — shipped with the potash
> build (MR !440, 2026-10-22) → [potash.md](../../subsystems/potash.md).
> Compacted 2026-11-05.
> **Left:** rain spoiling open ash · bracken and straw as feedstock · spent
> ash on a field (waits on soil's potassium reserve) · the open sinks —
> bucking, the dye vat, fertilizer, saltpetre · potash as the Kestrel's
> downstream freight · big ash — burnt ground, its derived ash layer,
> leaching into soil and water, the aftermath as a foraging site · the kelp
> burn and soda (natron · Leblanc · Solvay hooks) · bagasse ash as little
> ash for the ashery
> **Size:** a tail (of fire + forestry + soil + the shore)

**Sits on:** [mining.md](../../subsystems/mining.md) § the clamp (`trade-fuel`) ·
[maturation.md](../../subsystems/maturation.md) § `evaporative` ·
[mould.md](../../subsystems/mould.md) · [glass.md](../../subsystems/glass.md) ·
[forestry.md](../../subsystems/forestry.md) · [fire.md](../../subsystems/fire.md) ·
[soil.md](../../subsystems/soil.md) · [instrumentation.md](../../subsystems/instrumentation.md) ·
cleanliness (this MR).

⚠ **Vocabulary**: *ash* is also a tree (forestry's `ash-standard`). Write
**wood ash** and **the ash tree**, never bare *ash*.

---

*Little ash (the grate, `sweep`, the choke, the hopper and the flux
competing by tag) shipped with cleanliness — [cleanliness.md § The
grate](../../subsystems/cleanliness.md), [fire.md § History — the potash
build](../../subsystems/fire.md). The requirement — one material, one set of
roles, one set of sinks whatever the source — is [potash.md § Why one
material](../../subsystems/potash.md).*

## 1. Three sources **[DECIDED]**

*The grate and the heap shipped — [potash.md § The
chain](../../subsystems/potash.md); burnt ground is § 7 below.*

**Did people set wildfires for ash? No.** Deliberate burning was
controlled — the ash-burner (*Aschenbrenner*) and the clearing settler
burned felled wood **in heaps or pits**, giving concentrated, high-grade ash
(settlers' ash was often their first cash crop). Wildfire ash was never a
potash source at scale: millimetres over the ground, mixed with soil and
char, ruined by the first heavy rains. So **big ash behaves like foraging,
not an RGO** — and foraging is not designed yet.

⭐ **The arithmetic is the lesson**: hardwood leaves ~1 % of its mass as ash
and that ash is ~10–20 % potash, so **a tonne of oak gives ~10 kg of ash and
~1 kg of potash.** That is why forest glasshouses (*Waldglas*) moved through
the woods consuming them, and why clearing the American colonies made them
the world's potash exporter (the first U.S. patent, 1790, was a potash
process). Big ash is the forest converted.

## 2. The burn — the clamp's other end **[DECIDED]**

*Superseded by the code: the heap shipped as `AshPit extends Firebox`, a
big Burner driven by `stoke`/`ignite`/`draught`/`sweep` in game time — not
the clamp at the open draught, and no `burn` alias of `char` —
[potash.md § The chain, "Why the pit is its own
`Firebox`"](../../subsystems/potash.md). Strength carried on the ash:
potash.md's blockquote + § The numbers.*

- **Yield = mass × the fuel's ash fraction, by PART**: ⭐ bark, twigs and
  leaves carry several times heartwood's ash, so forestry's **brash and
  stumps — today's waste — are the richest feed per kilo**. Bracken and
  straw were major potash sources (bracken-burning for glass and soap was an
  upland trade), so the moor's bracken is a feedstock once it is a row.
- ⭐ **Rain spoils open ash** — an open heap burns badly in the rain and its
  ash leaches as it lies (§ 7's rule); burn in dry weather and get it under
  cover. Why an ashery has a roofed ash-house.

## 3. The leach **[DECIDED]**

*Shipped — the derived strength, passes, hardness, the egg (`DensityReading`)
and caustic lye by slaked lime: [potash.md § The numbers · Lye / The egg,
§ Lime in the soap kettle](../../subsystems/potash.md); lye's harm route
is [materials-response.md](../../subsystems/materials-response.md) §
corrosion.*

- **spent ash** is a by-product — still carries lime and minerals, spread on
  fields historically; a soil amendment waiting on soil's mineral reserves.

## 4. The boil, and calcining **[DECIDED]**

*Superseded by the code: the boil is the kernel latent-heat PLATEAU
(`IronPot`), not a third `evaporative` profile — [maturation.md § Note —
the potash build](../../subsystems/maturation.md). The pot as mould, the
closed ash loop, `calcine` to pearl ash and grade end to end shipped —
[potash.md § The numbers, § The places](../../subsystems/potash.md); the
glass LEAN is resolved (the glass melt is ungraded — potash.md § Limits).*

## 5. Sinks **[DECIDED]**

| sink | what potash does | |
|---|---|---|
| **glass** | the flux | ✅ shipped; demand first |
| **soap** | lye + fat | ✅ the chandlery and this MR's cleansers |
| **caustic lye** | with slaked lime, for hard soap | ✅ **in this build** |
| bucking | laundry: lye through packed linen | cleanliness's, when it wants it |
| dyeing | the woad and indigo vat needs an alkali | a hook for the dye trade |
| glazes | ash glaze | waits on pottery (the moulding slate puts it after brick) |
| fertilizer | potassium for the field | waits on **soil's potassium reserve** (§ 7) |
| saltpetre | nitre-earth leached through wood ash | a hook for a powder epoch |

**Competition is the markets doctrine**: glass and soap bid on the same line
(*dealing is a bid on a line of any counter*), and **imports set the
ceiling** per commodity per town — a realm with no ash-burners still sees
potash at the import price; colonial potash was an export good for this
reason.

## 6. The venues, and the ash-man **[DECIDED]**

*Shipped, and the ashery moved: it stands at Hanging Wood (the pit, the
kiln, the lean-to) and Wharfside's chandlery BUYS; the ash-burner, the ash
round (`ashes` brain — a supplement, not a living, AC 9) —
[potash.md § The places](../../subsystems/potash.md).*

- ⭐ **Potash is the Kestrel's first downstream freight** — made at the
  headwaters, wanted at the confluence; downstream is cheap. This answers
  [river-slate](../builds/river-slate.md)'s lens-6 gap (*nothing along the
  Kestrel needs carrying yet*).

## 7. Big ash — burnt ground **[DECIDED]**, designed for later

*"I don't propose we implement wildfires but we can talk about their
aftermath as if they're fully designed, and the burned forest can be
authored content where the ash comes from."* Map-scale wildfire is on
fire.md's deferred list and an unwatched fire freezes, so:

- **"Burnt" is a state of a `Wood`'s ground** — a date and a severity. An
  author writes it now; **wildfire will write the same state** when it ships,
  and the fire tick need know nothing about potash.
- **The ash layer is derived, never authored**: the stand's biomass
  (forestry knows the timber volume) × wood's ash fraction × severity,
  ⭐ **leached by cumulative rain since the burn** — the same precipitation
  integral soil and rivers use; the first heavy rains decide what remains.
- ⭐ **Where the leached potash goes**: into **the soil**, which needs a
  **potassium reserve** it does not have (soil's four are moisture, nitrogen,
  organic matter, structure — *unmodelled is not zero*; a burn really does
  fertilize, which is why swidden works), and into **the water** — a burnt
  catchment's runoff is alkaline and turbid, and post-fire fish kills are
  real.
- **Gathering is the ground protocol** (extraction's `dig`/`split`),
  **foraging-shaped**: what lies on ground, taken until gone; low grade
  (mixed with soil and char), falling with the rain — why the glasshouse pays
  an ash-burner rather than sweeping a burnt hillside.
- **The aftermath as a foraging site**, recorded as hooks: **fire morels**
  (fruiting the spring after), **salvage timber** (fire-killed boles sound
  for a year or two until beetles and stain — possibly a small forestry row,
  since `fell` works on a standing bole), char lying about, **fireweed** and
  its honey.

## 8. Soda — the continuity **[DECIDED]**

| source | what | here |
|---|---|---|
| **kelp and glasswort ash** | seaweed or salt-marsh plants burned on the shore (the Scottish kelp boom, Spanish *barilla*) | ⭐ **in this build** — the same burn with **wrack** as feedstock; [underwater-slate](../builds/underwater-slate.md) § 13's strandline is the kelp-burner's input |
| natron | mineral soda from dried lake beds | a deposit hook for a desert realm |
| Leblanc (1791) | salt + sulphuric acid + limestone + coal | industrial; its acid gas killed the countryside and Britain's **Alkali Act (1863)** made the first pollution inspectorate — lens 4 and 7 for that epoch |
| Solvay (1860s) | the ammonia process | the epoch after |

⭐ **Not interchangeable everywhere, by chemistry**: in glass both are flux
(Venetian *cristallo* used soda ash, forest glass potash); in soap **soda
gives hard soap and potash soft** — sodium soaps set, potassium soaps stay
soft — so the soapmaker's choice of alkali is real.

*Roles as material tags (`flux` the glassmaker's, lime on `stabilizer`,
limestone on `smelting-flux`) shipped — [potash.md §
Tags](../../subsystems/potash.md).*

## 9. Shared with sugar

The sugar build (its [slate](./sugar-slate.md),
a draft to be talked through in its own session) shares: **the boil** (brine,
sap, lye and cane juice — four `evaporative` profiles of one mechanism) ·
**the set** (the pot cake here; the conical sugar-loaf mould that **drains**
its molasses there, the mould subsystem's draining shape) · ⭐ **the fuel
loop** (bagasse fuels the sugar boil, and **its ash is little ash** for the
ashery — cane-mill ash went back on the fields) · **lime** (causticizing
here, tempering the juice there) · **grade by sequence** (raw → pearl here;
first boiling white → later darker there).

## 10. The lens pass (2026-10-18)

1. **Pedagogy** — complete vs incomplete combustion; the tonne-to-kilo
   arithmetic; bark and twigs richer than heartwood; hardness; latent heat;
   causticizing; soda hard vs potash soft; rain leaching. The egg test makes
   strength readable.
2. **Expression** — the ordinary case is rows (an ash pit at any wood, kelp
   burning on any shore, a second ashery); personalization from supply-chain
   depth (soap from your own beech ash).
3. **Immersion** — smoke, white ash, black cakes. **Participation** — the
   ash-burner, the ash-man, the ashery's hands, the kelp-burner, the
   soapmaker; ⭐ *can the polity do something we didn't want?* — **burn a
   forest for its ash and sell the potash**, with forestry's regrowth the only
   recharge.
4. **Values** — ⚠ forest glass consumed Europe's woods; colonial potash came
   from clearing; ⚠ **the kelp boom drove the Highland Clearances** (tenants
   moved to the coast to burn kelp for the landlord); Leblanc poisoned its
   neighbours. *A forest or a glasshouse* has no right answer — lens 4 and
   the accountability ledger, never an engine rule.
5. **Continuity** — ash → soda → Leblanc → Solvay fill the same roles;
   `burn` rides `char`.
6. **Economy** — demand first (glass, soap); consumes wood waste, lime,
   firewood, rainwater; produces potash, pearl ash, spent ash; imports set
   the ceiling. ⚠ The weak point is the ash-man's arithmetic (§ 6).
7. **Governance** — leave to burn on another's wood; **smoke as a nuisance**
   ordinance; later a pollution inspectorate for alkali works.

**Altitude** — *invariant*: one material and one set of roles whatever the
source; the draught decides what stays. *Grain*: ash fractions, the egg
test's threshold, the leach rate. *Title*: Hanging Wood's ash-burner,
Wharfside's ashery.

## 11. Open

1. Q1 resolved: the part is its own material row (`wood/<species>-brash`,
   `extends:` the wood) — potash.md § The numbers · Ash.
2. Q2 resolved: `flux` is the glassmaker's; the retag landed in the potash
   build — potash.md § Tags, § History.
3. Q3 resolved: an NPC brain whose every act is a player verb — potash.md
   § The places, the ash round.
