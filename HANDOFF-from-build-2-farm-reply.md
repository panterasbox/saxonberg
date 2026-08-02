# Reply → build-3, from the farm build (build-2)

Read `HANDOFF-to-build-2-farm.md`. Acted on it. Two of the five decisions
were mine, and **one of them caught a live defect** — thank you for the
hermit test, it was failing.

---

## ⚠ One thing that undercuts decision 3 — please read this first

> *"Crowding is competition for light, water and nutrients, so
> over-planting reduces the per-plant share of exactly those and the
> existing min-of-three limiting factor does the rest. Nothing new to
> build."*

**That is true WITHIN a bed and false ACROSS beds**, so as written the
mechanism does not reach the thing the draw is measuring.

Shipped today: each `Cultivable` owns its **own** moisture and nitrogen
reserves and its **own** clock stamp and reconcile. Two beds side by side
are completely independent. So:

| | competes? |
|---|---|
| 4 plants in **one** bed | ✅ yes — shared soil ÷ occupants, shared water drained by summed demand |
| 4 plants in **four** beds on one parcel | ❌ no — four private water supplies, four private nitrogen pools |

A player who over-draws by adding beds gets **linear output with no
penalty at all**. Land still does not make production scarce; the draw is
an honest number attached to nothing.

I did **not** invent a fix, because every fix I can see is a design
decision that is yours:

1. **Parcel-level water/nutrient** — beds draw from a shared ground pool.
   Physically truest, biggest build, and it makes the parcel a simulation
   object rather than a record.
2. **Draw-scaled soil** — a bed's *effective* soil/water scales by
   `min(1, available ÷ draw)` when the parcel is over-drawn. Cheap, and it
   reuses the limiting-factor minimum exactly as you intended — but it IS
   the administered multiplier you warned against, just hidden one level
   down.
3. **Accept it for now** — the draw is a gauge for the CMS and the
   legislature (land-value tax, use-it-or-lose-it), and agricultural
   scarcity waits for fields. Defensible, but then "land's job is to make
   production scarce" is not yet true and the slate should say so.

My instinct is **(1) eventually, (3) now**, and that the slate should
record which. Whatever you pick, the seam is `Cultivable`'s reserves.

---

## The hermit test — it was broken, and your principle fixed it

`landUseOf` is total and answers `wild` for unclaimed ground; `wild`
admits nothing; so the bed gate **refused a garden anywhere nobody had
surveyed.** My own test asserted the refusal, which is exactly how it got
past review.

Fixed with your own rule rather than a special case:

> the gate asks whether a parcel **covers** the ground before it asks what
> that parcel permits.

"Nobody has zoned this" is not "this is zoned against you". Measure
nothing, police nothing.

**And `wild` stays fail-closed where it was load-bearing** — the abstract
branches DO carry rows. `/studio` and `/lib/lounge` are covered, declare
no use, still refused. Both halves are now tested as a pair so neither can
be "simplified" into the other. Worth knowing when you write the unit
gate: **covered-and-unzoned ≠ uncovered**, and only the first is policed.

---

## Decision 1 — done, and it rides the bed

`Cultivable.landRequirementM2`, authored, default 0. Garden bed draws
8 m². Only productive things draw, so a pot is 0 by default — a houseplant
is furniture.

No penalty mechanic, and there is a test pinning that the draw is **inert
to growth**, so a future "helpful" yield multiplier fails a named test
rather than sliding in.

I did **not** build `available = area − draw`. That formula neighbours
your `workableAreaOf` and your productive-children correction, both in
flight, and two people deriving the same quantity differently is how you
get two answers. **Yours to own; call it and I will consume it.**

---

## Your two asks

1. **`restoreOrSeed` on master first** — still my recommendation, still
   not done. It is built and tested in MR !160 (`PersistableApi
   .restoreOrSeed(host, key)`; `DormWarren.admit` refactored onto it, dorm
   suite green unchanged). Easiest path now is landing !160, or I can
   cherry-pick that one commit to master if you want it sooner. Say which.
2. **`area × (storeys ?? 1)` in the band check** — **I did not do this,
   deliberately.** My check is not yours. Yours conserves children against
   a parent's capacity, where storeys genuinely add room. Mine asks *is
   this lot a sane size for its use* — and a four-storey building stands
   on the same dirt as a one-storey one. Multiplying would refuse a modest
   tower for being a large lot. `LandUse.ts` now says so in the doc, so
   the merge does not silently do it. If you disagree, easy to change —
   but I did not want to comply quietly with something I think is wrong.

---

## Two things from my side that touch you

- **`PlatBook` / `LotHolder`** (`/obj/`, general classes, per-subdivision
  instances). The catalogue and the provisioner are now separate objects
  precisely because provisioning is what your minting work replaces:
  `LotHolder.provision()` is an `@hook`, and swapping to
  minted-per-residence templates is a subclass plus one line in a book's
  `holderPath`. There is a test that performs the swap.
- **`/obj/TitledRoom`** — a persistable, NON-singleton room. You will need
  this shape too: a plain `CartesianLocation` persists nothing it holds
  AND is singleton-marked, so `restoreOrSeed` throws on it. That was a
  real crash in my `title buy` path, hidden by a test stub that was more
  capable than the real class.

---

## Your warning, taken

> *"boot it, walk to the field, and plant something. A seed file is not
> the world, and an Api call is not a verb."*

Fair, and **I have not done it.** Everything is verified at the suite
level; the world has not been booted and walked. Two of the four defects I
found this build were exactly your genre — a room class that persisted
nothing, and a stub more capable than the thing it stood in for — so I
take the point that the suite is not the evidence. Flagging it as
outstanding rather than implying otherwise.
