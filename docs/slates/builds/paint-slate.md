# Paint slate — the sacrificial layer, pigment in a binder

> **Status: UNBUILT** — designed at high level 2026-10-19 with the owner, out of
> the gap walk (it absorbs "binders and finishes" and the easel half of "the
> arts"). **No paint exists**, yet the holding shell's weathering readout already
> says *"the paint has gone; rain has gotten into the sills"*
> ([holding.md](../../subsystems/holding.md)), and repair's W7 already decided
> that *"a building's walls and roof are layers … each weathers at its material's
> pace, and `maintain` replaces what time took"* ([repair-slate](./repair-slate.md)).
> **Left:** the coat as the outermost, sacrificial layer · paint derived from a
> pigment and a binder (lime, linseed, glue, casein, egg, resin) · how each binder
> sets (carbonation, oxidation, evaporation) · pigments (earths, lampblack, chalk,
> verdigris, lead white) and the dye/pigment line, the lake · color on `Colour`
> and the subtractive stack · one `paint` verb for a wall and a picture ·
> `maintain` with paint in hand · the oily-rag fire, lead, fumes · the colorman,
> the house painter, the signwriter, the artist · the epoch ladder
> **Size:** a build (content-led, on construction's layers and W7)

## 1. ⭐⭐⭐ A coat is a sacrificial layer **[DECIDED — lens 1]**

**The job of paint is not color. It is to be the layer that weathers so the wood
does not.**

A coat is the **outermost layer** of a face, very thin — composed onto
[construction.md](../../subsystems/construction.md)'s layer list (outermost
first), with W7 weathering each layer at its own material's pace:

- **Painted wood** weathers at the paint's pace, and rain stops at the coat
  (`Exposure` already computes whether rain reaches a face).
- **When the coat is gone**, the wood beneath starts weathering at wood's pace —
  much faster, toward rot.

⭐ The economics become derivable: **repaint cheaply on schedule, or replace the
sills later.** One principle covers three trades: galvanizing (zinc corrodes so
the steel does not), tarring a hull (tar ships), and paint.

**On goods**, a coat on a cart or a sign rides
[decomposition](./decomposition-slate.md)'s exposure clock for things left
outside. Economy Law 2 holds — nothing weathers on the calendar except through
exposure.

## 2. ⭐⭐ Pigment in a binder; the binder decides how it sets **[DECIDED]**

Paint's properties are **derived from its constituents' material rows**, never a
paint table. The binders come from chains we ship:

| binder | how it sets | suited to | from |
|---|---|---|---|
| **lime** (limewash) | ⭐ **carbonation** — takes CO₂ back from the air and becomes limestone again | masonry; it breathes | the limekiln ✅ — closing the lime cycle |
| **linseed oil** | ⭐ **oxidation** — hardens by taking up oxygen, not by drying | wood, metal; it seals | flax seed, pressed ✅ |
| **glue** (distemper) | evaporation | interior walls | rendering's glue — its second customer |
| **casein** (milk paint) | evaporation and curdling | furniture, barns | dairy ✅ |
| **egg** (tempera) | drying, then curing | panels; the artist | the hen ✅ |
| **resin** (varnish) | solvent evaporation | a clear coat | pine resin tapped ([taps.md](../../subsystems/taps.md)); turpentine distilled |

**Pigments** — the earths (ochre, umber, sienna: iron oxides; goethite ships) ·
lampblack (the fuel chain) · chalk white (ships) · verdigris (copper) · lead white
(toxic — § 4).

⭐ **A dye and a pigment differ by one fact: a dye dissolves, a pigment is
suspended.** A **lake pigment** is a dye precipitated onto alum — the dyer's own
mordant — so dyeing and paint meet there.

**Color** composes on the shipped `Colour` ([glass.md](../../subsystems/glass.md))
and the [textiles](../../subsystems/textiles.md) subtractive stack: pigments mix
subtractively, cover by their hiding power, and fade by their lightfastness.

## 3. ⭐ One verb — a wall and a picture **[DECIDED]**

Pigment in a binder, applied to a surface, is **`paint`**. On a wall it is a coat;
on a canvas whose image is the author's, it is an artwork — the easel half of
"the arts", routed here by the [paper and printing slate](./paper-and-printing-slate.md)
§ 0; the image is the player's own. **`maintain` with paint in hand** is how a
shell gets its coat back. **`dip` stays dip-coating** — already decided as the
generative primitive for accreting a layer from a bath
([command-spec.md](../../subsystems/command-spec.md)).

## 4. ⭐⭐ Danger, derived from what ships **[DECIDED]**

- ⭐ **Oily rags catch fire by themselves.** Linseed's oxidation gives off heat;
  a heap of rags cannot shed it, and [fire.md](../../subsystems/fire.md)'s
  ignition balance gets there with no special case — a real and classic workshop
  fire.
- **Lead white poisons slowly** — painter's colic, a chronic dose through
  [metabolism](../../subsystems/metabolism.md)'s toxins.
- **Turpentine fumes** in an unventilated room
  ([respiration.md](../../subsystems/respiration.md)).

## 5. The trades and the chain

| who | what they do |
|---|---|
| **the colorman** | grinds pigments into oil and sells paint — the paint shop |
| **the house painter** | lives on the shell's upkeep |
| **the signwriter** | the printed-things family, by brush |
| **the artist** | the easel painting |

Upstream: the ochre pit, the oil mill, the limekiln, the resin tapper and the
still.

**The epoch ladder** — lime and oil → alkyds → latex (through rubber, and later
plastics). `paint` is the same act at every rung (lens 5).

**The drive, in one line:** your cottage's survey reads *"the paint has gone; rain
has gotten into the sills"*; you buy ochre and linseed from the colorman,
`maintain` the walls, and the shell holds at weathered instead of sliding to worn
— and that night the oily rags in the shed begin to smolder.

## 6. Lens pass

1. **Pedagogy** — the sacrificial layer; carbonation vs oxidation vs evaporation;
   dye vs pigment; subtractive mixing; spontaneous combustion. Decided §§ 1, 2, 4.
2. **Expression** — the artwork's image is the author's; a coat's color is a
   choice; a second colorman is rows.
3. **Immersion** — peeling paint as the readout's cause line made real; the
   smoldering rags. **Participation** — the house painter's round; the neighbor
   who paints your frames (`maintain` refuses nobody).
4. **Values** — lead white's brilliance against its poison.
5. **Continuity** — lime and oil → alkyd → latex; the same `paint`.
6. **Economy** — the colorman between the oil mill and the painter; upkeep as
   somebody's income. The demand (every shell's weathering) was there first.
7. **Governance** — lead paint law; building codes that require a coat.

## 7. Open

1. **The coat's thickness and wear rate** — authored on the paint, or derived
   from binder and pigment.
2. **Per face or per structure** — whether a coat is applied face by face.
3. **The artwork's form** — a canvas good carrying an image (the
   [media](../../subsystems/media.md) pipeline) and how `look` shows it.
4. **Galvanizing and tarring** — whether they ride the same coat model in this
   build or later.
