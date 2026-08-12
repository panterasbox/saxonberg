# Brand marks

Six SVGs, all `viewBox="0 0 100 100"`, no external dependencies. Drop them into
either repo as-is or inline them.

| File | Use |
|---|---|
| `saxonberg-rings-white.svg` | The mark standalone — banners, the flag, headers on Old Glory Blue |
| `saxonberg-rings-mono.svg`  | Inherits `currentColor` for the ink; set the casing var for the ground |
| `saxonberg-seal.svg`        | The mark **applied** — for sitting on a blue surface it does not own |
| `panterasbox-hex-white.svg` | Studio mark standalone |
| `panterasbox-hex-mono.svg`  | `currentColor` version |
| `panterasbox-seal.svg`      | Studio mark applied |

## The one rule that governs all of them

**Red never touches blue.** White is the separator, exactly as on the flag. That
is why the applied versions are seals rather than plain red marks: the white rim
is simultaneously the required separation and what makes the mark read as struck
rather than printed. Never place `saxonberg-rings-white.svg` recoloured to red
directly on the blue field — use the seal.

## Standalone vs applied

- **Standalone** (white on blue) is the mark *itself*. Use where the mark owns
  the surface.
- **Seal** (red field, white rule and figure) is the mark *applied*. Use where it
  sits on a surface it does not own — a blue page header, a document, a favicon.

## The casing is structural, not styling

Each ring carries a ground-coloured stroke beneath its ink stroke. That casing is
what interrupts the ring passing underneath — without it three same-colour rings
simply stack and no crossing reads at all.

So **the casing colour must match whatever is behind the mark.** In
`-white.svg` it is hard-coded to `#002868`. On any other ground, edit that
value or use the `-mono` version, which exposes it.

## Topology

Genuine Borromean: each ring passes over one neighbour and under the other, so
**no two are linked yet all three hold** — cut any one and the remaining two fall
apart untouched. That is the Make / Fund / Play argument, and it is only true if
each pair is *consistently* one-over-the-other. If you edit the paths, both
crossings of a given pair must stay the same way round; alternating them links
that pair and the claim becomes false.

The hex is the same argument in a different form: a regular hexagon divides into
exactly three rhombi and no other equal division exists — three is not imposed on
the shape, it falls out of it.

## Geometry, if you need to regenerate

Rings: `R = 26`, centres `33` apart on an equilateral triangle (vertices taken
off the circumcircle at 210° / 330° / 90°), ink stroke `4.7`, casing `× 2.55`.
Measured against `docs/manifesto/background.png`, the existing flag.

Hex: pointy-top, the three rhombi scaled `0.895` about their own centroids to
open the gaps.

## Small sizes

Both hold to 16px. The seals carry no rim lettering — two concentric rules read
as struck on their own, and the words crowded the figure.
