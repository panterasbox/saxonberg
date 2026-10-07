# Butchery slate — the tail of the carcass chain

> **Status: PARTIAL** — the carcass chain and the butchery build both
> shipped → [butchery.md](../../subsystems/butchery.md)
> **Left:** ⛔⛔ **the session wedges after a 25-game-day jump at the
> tannery** — the one thing the sweep found and did not fix (see below) ·
> poultry cuts (the biped plan names no muscles) · dry-aging on
> the hook · trimming as its own verb · species-adjusted `partArea` ·
> horn, glue and gelatin — three sinkless products with named buyers ·
> soap · the shambles ordinance (the governance limb) ·
> `Material.toughness` vs `Muscle.work` · ⭐⭐ **the two drives collide in
> one world** (see below) · ⭐⭐⭐ **AC1 of the carcass chain is UNMET —
> leather still has no path to a worn garment**
> **Size:** a wave

See also — the chain: [ranching](../builds/ranching-slate.md) (the
supplier) · [rendering](../builds/rendering-slate.md) (horn · glue ·
gelatin · soap · kibble — the destinations the requirements assigned) ·
[cooking](../builds/cooking-slate.md) (the law's consumer) ·
[hearth & larder](./hearth-and-larder-design-pack.md) (the victualler) ·
[trade-roster](../builds/trade-roster-slate.md) (`leatherwork` is minted
now, so it comes OFF the unminted roster) ·
[pets](../builds/pets-slate.md) · [forestry](./forestry-slate.md) (bark).
Substrates: [butchery.md](../../subsystems/butchery.md) ·
[race.md](../../subsystems/race.md) (`BodyPlan`, `Species`) ·
[spoilage.md](../../subsystems/spoilage.md) ·
[crafting.md](../../subsystems/crafting.md) (`applyMethodFit`) ·
[textiles.md](../../subsystems/textiles.md) (the hide's terminus).

---

## ⭐⭐⭐ AC1 is unmet, and it is the sharpest thing on this slate

A player can take an animal from alive to **leather** without leaving the
realm. They cannot get from leather to a worn garment.

`leather-jerkin` is an authored recipe in `trade-tailoring` that nothing
can invoke: `make` dispatches a recipe *script*, not a catalogue recipe,
and `cut` requires `StackableMixin` — a BOLT, which a tanned hide is not
and **must not become** (two hides must never merge; each is a particular
skin with its own grade).

⛔ **The carcass chain shipped a `tailor` verb to close this and it was
reverted in review**, correctly: tailoring is a discipline with its own
designed surface, and that design had already made the call —
[textiles.md](../../subsystems/textiles.md) says *"`cut`/`sew` take hide
the day it exists."* A butchery build does not get to mint a tailoring
verb to close its own acceptance criterion.

So the work is **a tailoring design session**, not a verb: how `cut` and
`sew` take a single non-stackable skin, and what a leather pattern is
when a cloth pattern is a bolt and a measurement. Until then the recipe
header says it is unmakeable and the carcass drive **asserts** `tailor`
is absent, so the gap is stated aloud rather than silent.

---

## ⛔⛔ The session stops answering after 25 game days at the tannery

The last two checkpoints of the carcass drive fail, and the symptom is
not an assertion: **the session stops answering anything.** After
`advance('25 days')` at the tannery, a bare `look` gets no
dispatch-response in 30 s, and `tailor` one suite later gets none either.

What is known:

- It is **not** `analyze sky`. That was the first suspect, and replacing
  the daylight helper with the room-reading one (which the butchery drive
  had already worked out) moved the timeout onto `look`.
- It is **only reachable now.** The dry pit had been blocking the tanning
  leg, so neither this checkpoint nor the nine build-time runs had ever
  got here in a working state. ⭐ Fixing one defect is what buys the next.
- `reconcileTanning` is **O(1)** — no stepwise loop, no far-past walk —
  so the obvious suspect is innocent. Something else in a 25-game-day
  jump, at a room that now holds 2000 L of liquor with a hide standing in
  it, does not come back.
- The preceding checkpoint spends ~38 s in the advance before the 30 s
  timeout, so the advance itself completes.

⚠ Whether this is the tanning pack's, the clock's, or the bulk/thermal
reconcile's is **not established**, and guessing from a 9-minute
iteration is how the wrong thing gets fixed. The honest next step is to
run that one checkpoint with the frame timeout raised
(`WIRE_FRAME_TIMEOUT`) to find out whether it is slow or wedged — those
are different bugs — and to try the same 25-day jump at a room with a
charged pit and NO hide in it, which separates the liquor from the hide.

⚠⚠ **The branch's drive is therefore 17 of 20, not green**, and this is
the gate on merging it.

---

## ⭐⭐ The two drives cannot run in one world

`butchery.dirty.wire.test.ts` and `carcass-chain.dirty.wire.test.ts` both
draft a head out of the **same persisted Delight flock** and work in the
**same yard** (`/world/terminus/hearts-delight/location/farmstead-yard`).

The wire suite boots **one world** and runs every file in it, dirty files
last in **alphabetical** order — so `butchery` runs first, leaves a
part-broken carcass and its offal in the yard, and `carcass-chain` then
runs into it. Seven checkpoints fail: `look gut` becomes ambiguous and
raises a prompt the helper cannot answer (which poisons its session and
times out the three checkpoints after it), `carcass-chain`'s *"the
carcass is gone"* finds the wrong things in the room, and its hide is not
where it butchered one.

⭐ Each file passes **alone**. The collision is the finding, and it is the
`.dirty.` contract meeting itself: the flag says *this consumes something
the world does not regenerate*, and two files consuming the SAME
unregenerated thing is a case the sequencer cannot order its way out of.

⚠⚠ **And it cannot be patched probe by probe — that was tried at the
sweep.** Teaching the butchery file's cut probe to treat an ambiguity as
positive evidence and re-open its poisoned session fixed that file
(8/8, alone and together). The very next run moved the failure to the
carcass file's `look ewe`, because with two ewes in the yard *every*
noun the two files share is ambiguous and any one of them can leave a
prompt hanging. **The shared noun space is the defect; the individual
commands are symptoms**, and chasing them is unbounded.

Three honest fixes, in preference order:

1. **Give the butchery drive its own yard and its own flock.** The
   cheapest, and it is what the second instance claim is for — a second
   farmstead needs no pack code.
2. ⭐⭐ **Merge the two files — probably the right answer.** They drive one
   subsystem and one chain over one farmyard, they duplicate the same
   `say`/`read`/`refusedFor` harness, and the butchery file's comments
   already cite *"the carcass drive's finding 7"*. They are one document
   that was split by having been two builds, not by anything in the
   fiction — and one file has one session sequence, so the collision
   becomes unrepresentable rather than guarded against.
3. **Make the sequencer aware of what a file consumes** — `DIRTY_REASON`
   is already the declaration; it would have to become structured. ⚠ The
   most work and the least value: two files are the problem, not the
   ordering.

⚠ Worth keeping: this would have failed on master with nobody able to
know, which is the exact decay the drive-graduation rule exists to stop.
It was caught by running both files in one world on purpose at the sweep.

---

## Poultry has no muscles

The `biped` plan names no muscle tissues, so a hen yields trim and offal
and no joints — correct today and visibly thin the moment anybody wants a
breast off a bird.

Two routes, and they are a real fork:

- **Name the biped's muscles** — `breast-white` and `breast-red` already
  exist as rows with their `work` authored (.10 and .70), because the
  `fowl` plan was written for exactly this and a hen is not on it.
- **Move `gallus` to `avian`** and name those instead. ⚠ `avian` is
  shared with the canary, so anything authored there is authored for a
  20 g bird as well — which is the whole point of shares, but it means
  the plan has to be honest for both.

⭐ The second is probably right and is cheap: `fowl` exists, `extends:`
makes the swine case a three-line row, and the same move serves a goose,
a duck and a turkey with no further code.

---

## Dry-aging on the hook

A carcass **reduces** as you take cuts off it and it hangs there while
you do. `hanging-carcass` and a `meat-hook` with `airExposure: 1` are the
shape, and `WaterActivityMixin` already dries a surface over time.

⚠ **Nothing rewards the wait**, which is why it is not built: the grade
is set at the cut, so a carcass hung a week and one hung an hour give the
same joint. The design question is not the mechanism (it is shipped) but
**what the patience buys** — a grade band, a texture shift, or a
freshness cost you trade against it.

---

## Trimming as its own verb

`butcher <body> for <cut>` takes a named cut; everything else comes off
as trim. Trim is where an unskilled hand's waste goes, and that works.

What has no act is **choosing to trim** — taking the cheap yield
deliberately because trim is what a sausage wants and a joint is not. A
`trim` verb would be the first act in the chain whose point is to produce
*less valuable* output on purpose, which is interesting and is also the
argument for leaving it until sausage demand is real.

---

## Species-adjusted `partArea`

`partArea` is `(Σ share)^(2/3)` over a part's tissues, and it feeds the
depth ladder and the surface fractions a blow resolves against. It reads
the **plan's** shares, so every species on `quadruped` has the same
belly-to-torso ratio as a target.

A fatter species' belly is not a bigger target today. ⚠ Low value and a
real hazard: the two readers are ratio-only, which is exactly why the old
absolute-kilogram masses were a lie nobody noticed for a year. Anything
done here needs a reader that actually cares first.

---

## Horn, glue and gelatin — sinkless, with buyers named

⛔ **Horn was cut from the build and the false claim came off**:
`trade-ranching`'s old `ButcherController` docstring promised *"bone and
horn to crafting"* and nothing delivered a horn. Adding a horn row with
no sink would manufacture the exact dead end the carcass chain existed to
close.

The buyers, so a later build does not have to rediscover them: **combs,
cups, lantern panes, buttons** — horn is the pre-plastic thermoplastic,
which makes it an epoch-ladder story rather than a row. Glue and gelatin
are bone's second and third sinks and nothing demands them; bone's ONE
shipped sink is the field.

→ [rendering-slate](../builds/rendering-slate.md), which owns all four.

---

## The shambles ordinance

Butchering is the one source of the silent second population
(`ContaminableMixin`), and the contamination band is a **measurement** —
which means meat inspection is expressible as governance over a number
the engine already computes, rather than as a new mechanism.

⚠ That is the whole appeal and also the whole risk: a criterion that
judges a PERSON needs its appeal and its entrenchment tier named
(lens 7), and *"the inspector condemned your carcass"* is a judgement
with real money behind it. → the governance limb.

---

## Two smaller seams

- **`Material.toughness` vs `Muscle.work`** — two axes that a bite
  (`blunt` on flesh) could one day relate. Nothing relates them now and
  nothing should until a third consumer appears.
  → [materials-response](../builds/materials-response-slate.md).
- **A named dead pet's body is butcherable.** `ButcherController`'s name
  check is behind an `isAlive()` guard, so the refusal that protects a
  named animal stops protecting it the moment it is a corpse. Shipped
  seam, unchanged by this build. → [pets](../builds/pets-slate.md).
