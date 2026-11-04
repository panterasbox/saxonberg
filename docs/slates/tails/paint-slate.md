# Paint slate — the sacrificial layer, pigment in a binder

> **Status: SHIPPED (MR !513, 2026-11)** — the paint build built most of this
> slate: the coat as a sacrificial layer that weathers (every outside, the
> exposure rule), paint as a binder + pigments, how each binder sets, `paint`,
> `write … with` a pot, the glued joint, lead · oily rags · turpentine, the
> colorman and the house painter. → [painting.md](../../subsystems/painting.md).
> **Left:** the corrosion jar (vinegar on lead or copper → white lead,
> verdigris) and the madder-lake strike — the colorman stocks them · thinning
> oil paint with turpentine (a pour joins only like with like) · glue on
> `fit`'s replace arm · starch paste mixed bulk with bulk · the house painter
> restocking his own pot · upstream supply: a lampblack lamp, the
> fishmonger's skins, the pig's bristle, a tannery's and knacker's counter ·
> the signwriter and the artist as trades · the epoch ladder (alkyd, latex —
> the same `paint`) · Duncan Hall's structure row · a `sets badly` coat word
> **Size:** a wave

## 0. ⭐⭐ What already ships — `Faced` is the coat on goods (ceramics, 2026-10)

The ceramics build shipped the coat substrate this slate needs, on goods:
`FacedMixin` ([faces.md](../../subsystems/faces.md)) on every `Good` — per
face (`outside`, and `inside` for a vessel), an ordered list of coats outermost
first, each construction's own layer shape (`{material, thicknessM}`) plus a
`state` (`wet · set · crazed · run · crawled`). The outermost coat decides what
meets the world (the lead leach, whether the face holds water, how it cleans);
a sound coat's look word is its material's `coatWord`. Walls and floors stay
construction's layers, as § 1 says. ⭐ **This build EXTENDS `Faced`; it must not
build a coat model beside it.** What it adds:

1. **Setting by the binder.** `Faced` sets a coat only by heat
   (`fuseCoats`, the glaze's case). Paint sets by its binder (§ 2) — make
   setting the coat MATERIAL's rule, heat one case of it.
2. **Wear.** A coat never weathers today. The sacrificial layer (§ 1) — a
   coat that thins on the exposure clock until the next layer down meets the
   world — is new.
3. **Color.** `Dyed` owns the color model (`Colour`, the subtractive stack)
   and a coat shows none. One read: an opaque outermost coat (by hiding
   power), else the dyed fiber, else the body. ⭐ The dye/pigment line of § 2
   is the line between the two mixins: a dye goes INTO the fiber (`Dyed`), a
   pigment in a binder sits ON it (`Faced`).
4. **One stack for two hosts.** Construction's wall layers and `Faced`
   share the layer shape, not the logic. Setting, wear and color written
   twice would be two coat models — extract the stack the two hold.

Open § 7.2 is answered for goods: a coat is per face. `dip` stays the bath's
verb (the vessel affords it), as § 3 says.

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
[decomposition](../builds/decomposition-slate.md)'s exposure clock for things left
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
"the arts", routed here by the [paper and printing slate](../builds/paper-and-printing-slate.md)
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
   *(Goods: per face — § 0. Places: still open.)*
3. **The artwork's form** — a canvas good carrying an image (the
   [media](../../subsystems/media.md) pipeline) and how `look` shows it.
4. **Galvanizing and tarring** — whether they ride the same coat model in this
   build or later.
