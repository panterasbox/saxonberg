# `@saxonberg/content-trade-dyeing`

Colour, and ⚠⚠ **two chemistries rather than one.**

|  | madder · weld | woad |
|---|---|---|
| chemistry | **mordant** dye | **vat** dye |
| needs | a metal ion, applied first | an alkaline reduction vat |
| a mordant | decides the colour family | **refused** — wasted alum |
| the bath | **exhausts** (deep, paler, paler) | **accumulates** (each dip builds) |
| the moment | the colour is there when you lift it | the colour arrives in the **air** |

Shipping all three through one uniform grid would have asserted that
every dye works one way. What ships is **two mordant dyes × four
mordants, plus woad as the deliberate exception** — eight outcomes plus
one, rather than a false twelve.

## ⭐⭐ Mordanting is its own act, and it supplies the missing failure

`mordant <cloth> with <alum>` **then** `dye <cloth>`. Two baths, as it
really is, and the skill is front-loaded: you commit to a colour family
before you can see it.

> Dye something un-mordanted and the colour **does not hold** — it
> washes straight out on the first launder.

Real, nearly free (fastness ≈ 0.02), and it is exactly the *something to
be bad at* that every competence answer in this build needs to be
visible against.

⚠ Where the mordant lives: an entry on the cloth's own `dyeStack` at
**`strength: 0`** — a thing applied to the cloth at zero colour
strength, which is what a mordant is. Mordanted cloth is therefore a
real intermediate good you can prepare in advance and stockpile,
`getColorTag` stays honest (below legibility, so it shows no colour),
and no kernel field was needed.

## ⭐⭐⭐ Linen is hard to dye — which retires the "degenerate axis" worry

> **Cellulose does not hold metal ions.** Protein fibres — wool, silk —
> take alum directly. Cotton and linen need a **tannin pre-mordant** to
> give the metal something to bind to.

Which is exactly why linen was historically worn undyed or bleached and
**wool was the coloured fabric**. So one fibre does not make
`f(dyestuff, mordant, fibre)` degenerate — **it makes dyeing the hard
case**. Three consequences, all good: tannin is not one option of four
but the workhorse; wool's arrival is a genuine unlock rather than a
second row; and the trade is **harder now and easier later**, which is
backwards from the usual game shape and far more interesting.

⚠ **Accepted with eyes open: the launch palette is MUTED.** Linen +
tannin + alum + madder is a real red, just softer, and a world of
heathery, chalky, sun-faded colour is a coherent look rather than a
deficient one. **Saturation is a thing wool brings. Do not "fix" the
muted palette by fudging cellulose chemistry.**

## ⭐ What competence buys: fastness and repeatability, never a hue

The hue comes from the dyestuff. What the craft decides is how many
washes it survives — and whether you can match last month's lot, which
is visible in whether your bolts stack (see `trade-textiles`'
`ClothBolt`). **A master dyer's batches merge. A novice's do not.**

## The vats

⭐ The tool ladder for the third time. A **household pot** is rung zero
— yours, cheap, small, poor control. A **dyehouse copper** is rung N,
with `rate` for scale and `control` for **evenness**, which is the
quality axis this trade already needs. ⭐⭐ **Evenness is what the
dyehouse sells**, and garment-dyeing at home is the worst stage on the
worst equipment: visibly amateur, which is correct and is another
legible social signal.

⚠ That makes dyeing the **domestic** trade and tailoring the
professional one — you go to a tailor to be measured, but you recolour
your own coat at home. Deliberate: it is what makes "recolour often"
actually often.

## ⭐⭐ The woad vat is a different machine, and it is ALIVE

```
> dye shirt in the woad vat
  You draw the linen out yellow-green. As the air takes it,
  the colour walks up through jade to a deep, even blue.
```

The change in air is free — it is simply what indigo does. The vat is
fermentation-shaped, so `FermentingMixin` models it, and the honest
version is therefore a **living thing**: kept by feeding it, killed by
oxygen or the wrong pH, days to bring back. **The dyer's most valuable
possession, and the thing that punishes neglect.** ⚠ A harsher failure
than anything else in the chain: neglect destroys *capital*, not a
batch.

⭐ And magic does not beat it. A magically-fixed colour is a **binding**
— it fades when the charge runs out — so magic gives you a brilliant
colour that does not last and the craft gives you a modest one that
does. A player should take that bargain once and regret it.
