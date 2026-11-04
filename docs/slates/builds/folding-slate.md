# Folding slate — creases in paper and cloth, wrinkles, pressing, and folding as craft and art

> **Status: UNBUILT** — designed at high level 2026-11-04 with the owner, out
> of the paper build's review ("the foldable thing is just a boolean — is that
> all we care about, folded or no?"). Paper ships a fold *count* on `Sheet`
> (sheet → folio → quarto → octavo) and nothing else; cloth has no folds,
> creases, wrinkles or pressing at all.
> **Left:** the crease substrate (a crease set on anything that folds, its
> behavior decided by the material) · wrinkles from wear and storage ·
> pressing as the laundress's act, with the iron · pleats · wear along folds ·
> paper: formats, letterlocking, folded boxes and envelopes, origami ·
> cloth: folded storage, napkins, flags · folding as craft (declare a model,
> measure the distance — the recipes slate's machinery) and as art (player
> designs, diagrams, prior art) · flat-foldability (Maekawa, Kawasaki) ·
> diagrams that render for sharing
> **Size:** a build — kernel-led (the crease substrate on `Sheet` and
> `Garment`); **first consumers:** the laundress's pressing (cloth) and folded
> paper goods (paper).

---

## 0. What already exists (verified 2026-11-04)

| piece | where | what it does |
|---|---|---|
| `FoldableMixin` | `lib/slot/Foldable.ts`, over `Bistate` | a yes/no `folded`; affords `fold`/`unfold`. Composers: `FoldingChair`, and `Sheet` (paper build) |
| the sheet's formats | `platform/thing/Sheet.ts` (paper build, MR !521) | overrides the boolean with a **count** 0–3 (sheet · folio · quarto · octavo), `foldRefusal()` refuses a fourth; `unfold` resets it |
| tearing | `lib/material/Tearable.ts` (paper build) | a sheet into halves, a page out of a book, a garment into rags, an envelope or bag torn open |
| garments | `platform/thing/equipment/Garment.ts`, `textiles.md` | covering, fit, dye, soiling and washing, durability — **no fold, crease, wrinkle or press of any kind** |
| the laundress | `cleanliness.md` — `order wash <garment>`, `Garment.launderBy`, `Tariff.quoteFor` | washing for pay, with a garment's own account of what washing does to it |
| localized wear | `assembly.md` — the parts record's per-part wear | the precedent for wear that lives *somewhere* on a thing |
| the recipes machinery | [recipes-slate](recipes-slate.md) | declared intent, nearest-reference distance, your own design in your book, recognition through *known-of*, prior art, exhibition and player judgment |
| heat, moisture, weight | `Thermal`, `Wet`/`Moisture`, the screw press and `bearingLoadN` | the three things pressing is made of |
| carrying | `encumbrance.md` | **mass only** — no container or pack has a volume capacity |

**Therefore what is genuinely new here:** a crease as state (where, which way,
how firmly set) on paper and cloth; the material deciding how creases set,
relax and wear; wrinkles; pressing; pleats; folding as a sequence that can be
measured against a named model; flat-foldability; rendered diagrams.

## 1. A crease, and the material that decides it (decided)

A fold leaves a **crease**: a line across the thing, **mountain or valley**,
set to some **firmness**. One crease state for paper and cloth; **the
material decides how it behaves** — the codebase's *one rule, the material
decides* shape (firing's kinetics, the glue's damp-resistance).

| | paper | cloth |
|---|---|---|
| what a crease is | fibers broken along a line | fibers bent and held by their own bonds |
| setting | full firmness at once, on any firm fold | by the fiber: a crease sets lightly in use, firmly when **pressed** (heat · moisture · pressure) |
| relaxing | never | damp and heat relax it (a wool coat in a steamy room drops its wrinkles) |
| wear at the line | **fold endurance** — refold the same line enough and it splits | the fold line goes threadbare when stored the same way for years |

Fiber behavior (the **grain**, authored on material rows, derivable from the
fiber): **wool** takes and holds a pressed crease (trouser creases, kilt
pleats) and relaxes in steam; **linen** wrinkles at a glance and presses
crisp; **silk** creases softly; **cotton** wrinkles and presses well;
**paper** never relaxes.

⚠ **The folding chair stays a boolean.** A hinge is a mechanism, not a
crease; `FoldableMixin` over `Bistate` remains its truth. The crease state is
a separate substrate that `Sheet` and `Garment` compose — never a widening of
`Foldable` that the chair would then answer "no" to on every field (the
host-placement test).

## 2. Wrinkles (decided: in scope)

Wrinkles are **creases nobody chose**, and the most common thing anyone ever
notices about cloth — which is what makes pressing worth paying for (lens 6:
the demand is there first):

- **from wear** — sitting, bending, a day's movement, by fiber;
- **from storage** — a garment thrown in a heap wrinkles; folded, it creases
  along its folds; hung, it does neither;
- **from washing** — a garment comes out of the wash wrinkled, by fiber;
- **relaxing** — damp and warmth let them drop out (hang it in the steam).

A garment reads its state on `look` in words — *crisply pressed*, *creased
from the drawer*, *badly wrinkled* — never a number (lens 3a: you can see who
looks after their clothes).

## 3. Pressing — the laundress's act, with the iron (decided)

**The iron goes with the laundress** (the owner). Pressing is the third thing
the laundress does, beside washing and the cover she pays:

- **the act** — heat, moisture and pressure on cloth: relaxes wrinkles, sets
  the creases you mean to keep (a trouser's crease, a shirt's sleeve). Built on
  the shipped pieces: an iron is a heated tool (`Thermal`), damp is the
  cloth's moisture, pressure is weight;
- **the iron** — a flat iron heated at the fire (the medieval and industrial
  rungs); scorching is real (too hot for the fiber marks it — silk and wool
  first);
- **the trade** — `order press <garment>` at the laundress, beside `order
  wash`; a player can also press their own;
- **the epoch** — the sad iron, the box iron, the electric iron: the same act,
  a different heat source (lens 5).

## 4. Pleats (decided)

A **pleat** is a permanent pressed fold — set by heat in a fiber that holds
it, or by stitching. A garment feature with a real cause; it wears like any
crease, and a laundress who presses it wrong loses it.

## 5. Paper (decided)

- **Formats** — folio, quarto, octavo become three *in half* folds on the
  crease model; the bookbinder's ladder survives unchanged in meaning.
- **Letterlocking** — a letter folded, slit and tucked so it locks itself shut
  and shows if it was opened: real history, and a sibling of the seal (the
  paper build's `seal`).
- **Folded paper goods** — an envelope, a bag, a box: creases, some of them
  glued. The paper build sells these made because their bills were deferred;
  the crease model lets them be **made**, and some need no glue (a folded box).
- **Origami** — models made by folding alone.

## 6. Folding as craft and as art — the recipes machinery (decided)

**A named model is a recipe**: a crane, a boat, a hat, a box, a folded napkin,
a folded flag. Everything in the [recipes slate](recipes-slate.md) applies:

- **declare** what you are folding (*"a crane"*, or *"my own design"*);
- the engine measures your folding against the **reference** model and the
  distance shows in the result (a lopsided crane, a box that will not close);
- **your own design** goes into your book; *"you've reinvented the
  waterbomb"* happens here too;
- you **recognize** a model only if you know of it;
- **original designs are art**: published, credited by prior art, exhibited,
  judged by players.

**It crosses into the real world better than food:** a crease pattern or a
fold sequence renders as a **diagram**; players fold real paper from it and
post photos. No safety surface.

## 7. Flat-foldability — the honest geometry (recommended, O1)

A crease pattern folds flat or it does not, and two theorems decide it at
every point where creases meet: **Maekawa** (mountains and valleys differ by
exactly 2) and **Kawasaki** (the alternating angles sum to 180°). The game can
tell you *why* your model will not lie flat, and the reason is real
mathematics — lens 1 at its strongest.

## 8. Cloth: storage, napkins, flags

- **Folded storage** — a folded garment takes less room. ⚠ **Blocked on a
  volume model:** containers carry mass only today, so "less room" has no
  meaning yet (O3).
- **Napkin folding, the folded flag, the linen stack in a shop window** —
  named cloth models on the same machinery as § 6.

## 9. Tearing, alongside

- **Along a crease** a sheet tears clean; elsewhere it tears ragged — the
  edge is part of the result.
- **Strips** — paper torn or cut into strips (quilling, papier-mâché) is a
  later consumer; the edge rule serves it.

## 10. Lens pass

1. **Pedagogy** — fiber behavior is derivable (why wool holds a crease and
   linen wrinkles); flat-foldability is real geometry; the distance tells you
   what went wrong.
2. **Creative expression** — folding a known model needs no code; original
   origami and napkin designs are player art, published and credited.
3a. **Immersion** — wrinkles and a pressed crease are seen in words; a
   letterlocked letter shows it was opened.
3b. **Participation** — the laundress's pressing is a service with a visible
   result; a well-kept wardrobe is something people notice.
4. **Values** — prior-art credit for original designs (the recipes slate's
   rule).
5. **Continuity** — the iron changes its heat source across the epochs, not
   the act.
6. **Economy** — pressing creates laundress demand (wrinkles first); folded
   goods made rather than bought; paper demand from origami and packaging.
7. **Governance** — judging original designs is crowdsourced through renown.

## 11. Opens

| # | question | recommendation |
|---|---|---|
| O1 | geometry: a real crease pattern with Maekawa/Kawasaki, or a named-fold sequence matched without geometry | the real crease pattern, built from named folds — a sequence-only matcher is a lookup table pretending to be paper |
| O2 | the crease state's resolution: exact lines on a unit square, or a coarse grid of fold lines | exact lines for paper; a few named lines (sleeve, trouser, center) for garments |
| O3 | volume: folded storage needs a volume model containers lack | a dependency, not this build's — record it; folding still matters for creases and wrinkles without it |
| O4 | wrinkle rates per fiber and per activity | authored on fiber material rows (the grain), checked against real behavior |
| O5 | the iron's scorch thresholds per fiber | real values, on the fiber rows |
| O6 | does `Sheet`'s fold count retire | yes — it becomes three *in half* creases; `format()` reads the creases |

## 12. Reuse ledger

| need | reuses |
|---|---|
| fold/unfold verbs | `fold.yaml`, `unfold.yaml` (shipped), the controller asking the thing (`foldRefusal`, paper build) |
| tearing | `TearableMixin` (paper build) |
| heat, damp, pressure | `Thermal`, `Wet`/`Moisture`, `bearingLoadN` |
| the laundress | cleanliness's `order wash`, `Garment.launderBy`, `Tariff` |
| wear at a place on a thing | assembly's per-part wear |
| models as references, declare, distance, own designs, recognition, prior art, exhibition | the [recipes slate](recipes-slate.md) |
| the seal beside letterlocking | `Sealable.seal` (paper build) |
| *genuinely new* | the crease state and its material behavior; wrinkles; pressing and the iron; pleats; flat-foldability; diagrams |

## Cross-references

- [recipes-slate](recipes-slate.md) — the declare-and-measure machinery folding reuses
- [textiles-slate](textiles-slate.md), [textiles.md](../../subsystems/textiles.md) — the fibers and garments
- [cleanliness.md](../../subsystems/cleanliness.md) — the laundress, whose trade pressing joins
- [paper-and-printing-slate](paper-and-printing-slate.md), [paper.md](../../subsystems/paper.md) (on `reqs/paper`)
- [assembly.md](../../subsystems/assembly.md) — localized wear
- [encumbrance.md](../../subsystems/encumbrance.md) — mass-only carrying (O3)
