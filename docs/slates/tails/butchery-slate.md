# Butchery slate — the tail of the carcass chain

> **Status: PARTIAL** — the carcass chain and the butchery build both
> shipped → [butchery.md](../../subsystems/butchery.md)
> **Left:** dry-aging on the hook · trimming as its own verb · species-adjusted
> `partArea` · horn, glue and gelatin — three sinkless products with
> named buyers · soap · the shambles ordinance (the governance limb) ·
> `Material.toughness` vs `Muscle.work` · ⭐⭐⭐ **AC1 of the carcass chain
> is UNMET — leather still has no path to a worn garment**
> ✅ **RETRACTED by the reachability sweep (2026-10-07): BEESWAX HAS A
> SUPPLY** — the chain is whole and this slate was wrong (see below).
> ✅ **SHIPPED by the reachability sweep: POULTRY CUTS** — the three cut
> rows are the hen's `butcheryYield` now, and there is a hen; the claim
> about the biped plan was about the wrong plan (`fowl` names the
> muscles).
> ✅ **FIXED in the sweep:** the two drives' collision (they are one file
> now) and the "25-day wedge" (never a wedge — a compressed-clock
> thundering herd the drive manufactured; see below).
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

## ⛔⛔ `buy <two-word good>` is BROKEN — and it is not this build's

A product defect, found by the drive, owned by retail.

```
buy dog loaf
→ "a loaf of bread isn't a shelf you can trade from"   [validator-failed]
```

`buy.yaml` declares **`thing` (a string)** and then **`counter` (an
optional object, `prepositions: [from]`, with a default)**. Positionals
bind in declared order and nothing stops `counter` binding positionally
when no `from` is present — so `thing` took *"dog"*, `counter` took
*"loaf"*, that resolved to a loaf on the counter, and the shelf validator
refused it.

⚠⚠ **Every multi-word good in the game is affected.** This one bakery
sells *dog loaf* and *lean loaf*; the refusal a player gets names a shelf
they never mentioned, which is the worst kind of wrong answer — it
describes a mechanism the player was not using.

⭐ It is the same failure class CLAUDE.md records for the mill (*"`mill
wheat 0.72` handed the number to the instrument"*), and the same remedy
applies: a later positional that can swallow part of an earlier one needs
either a required preposition or a greedy first arg. `harvest`/`buy`-shaped
verbs with a trailing optional object are the population to check.

⚠ The drive works around it with `dogbread` — one of the row's own
keywords, which the binder cannot split — because a drive should not be
the thing that fixes a kernel verb's grammar.
→ `retail` / the retail slate.

### ⚠ And a third note kind `refusedFor` cannot see

`validator-failed` joins `command-rejected` in the set of outcomes the
drive's `refusedFor()` helper reads as *success*, because it only looks
for `controller-rejected`. That is how `buyOrWait` reported *bought* while
inventory went 6 → 6. ⭐ The helper answers a reason string now and the
checkpoint asserts on the note kinds AND the prose, which is what turned
three runs of guessing into one decisive message.

---

## ⚠ Two different prompt failures, and I conflated them

⚠⚠ **Recorded with a correction, because the first write-up of this was
wrong.** There are TWO distinct failures behind the drive's prompt
errors, and treating them as one cost several runs.

**1. A genuine ambiguity.** With the payload visible, the prompt is real:

```
"label":"which target?","matches":[
  {"displayName":"the body of a sheep"},
  {"displayName":"a sheep"}]
```

A bare `look` in a yard holding both a live drafted sheep and an earlier
carcass has two candidates, and the harness reports that correctly —
*"raised a PROMPT and is waiting for an answer, not hanging"*. Nothing
is wrong with the harness here; the drive simply put two sheep in one
room and then used an unqualified target.

**2. A misleading message when there is NO prompt.** The other shape is
`(promptId=undefined, match=undefined)`, which means `awaitPrompt(5_000)`
**timed out** — there was no prompt at all — and the helper nevertheless
throws *"raised a prompt this helper cannot answer … give the command a
less ambiguous target."* That advice is wrong for this case and sent the
sweep hunting ambiguity that did not exist.

⭐ **The lesson is mine, not the harness's:** I generalised from the
second shape to the first and wrote down that the harness lies. It does
not, in the case that actually recurs most — it lies only when
`awaitPrompt` times out, and distinguishing *no prompt* from *an
unanswerable prompt* is the narrow fix worth making.
→ `wire-suite-growth-slate`.

⭐⭐ And the drive-side discipline that falls out of it: **name targets
that cannot be ambiguous, and read notes with `cmd` rather than prose**
when the claim is about notes. A room this drive has been butchering in
accumulates sheep-shaped things by design.

---

## ⛔⛔ RETRACTED — BEESWAX HAS A SUPPLY, and this section was wrong

**The claim this slate carried, in its own status block and at length
below, was that beeswax is obtainable nowhere in the realm. It is
false.** Retracted 2026-10-07 by the reachability sweep, which went
looking for unreachable content systematically and found the opposite
here.

The SUPPLY exists, and every link of it is a shipped row:

> **nucleus** (`/trade/apiculture/thing/nuc`, a general-store line at par
> 1 for **45 coin** — `general-store/counter.yaml:139` and `:396`, the
> dearest thing on the shelf under the musket) → **hive**
> (`/trade/apiculture/thing/hive`, par 2 at 12) → `rob` → **comb**.

⚠⚠ **And then it stops, for a different reason than this slate gave.**
The reachability sweep's drive typed `crush` and got *"I don't
understand."* `crush` is a KEYWORD on `recipes/crush-comb.yaml`, not a
verb — and every trade in the game resolves its own catalogue recipes
through its OWN verb's controller (`BakeController`, `MillController`,
`DipController`, `ForgeController`, each calling `CraftingApi.craft`).
Apiculture ships exactly one verb, and `apiculture.md` says so in terms:
*"`rob` is the trade's ONE verb."* `make` is not the answer either — it
dispatches a recipe SCRIPT, which is the same wall AC 1 hits with
`make leather-jerkin`.

⭐ So `crush-comb` and `spin-comb` — two authored recipes with input
slots, a tool capability, a portion, an output and a residue, written up
as a TABLE in `apiculture.md § What comes out is comb` and called *the
epoch ladder* — **are resolved by nothing.** The far end is reachable:
`melt-wax` and `dip` both work, which is the carcass chain's own fix
(`DipPot.ts`). It is the comb→honey rung in the middle that was never
built. → **`apiculture-slate`**, because whether crushing is a verb, a
`rob` subcommand, or the second rung of an epoch ladder is a question
about what the trade teaches, and the verb-collision ladder's first rung
is *unify behind an interface*.

⚠ This correction is itself the lesson repeating. The retraction above
was first written claiming the chain was whole END TO END — because
the rows were all there and nobody typed the verb. **Rows being present
is not a chain being walkable**, which is the entire thesis of the sweep
that found it, applied to the sweep's own prose.

⚠⚠ **How the error was made, and it is the instructive part.** The
original search was for `colony|swarm` and never for **`nuc`**. The
beekeeper's word for a starter colony is a nucleus, the counter's own
comment calls it *"ONE labelled faucet: the bees themselves"* and explains
in four lines why it is one line at par 1 rather than a par on every
product — and the search that produced *"beeswax has no supply"* could not
see the word. An absence found by grep is only as good as the vocabulary
of the grep.

⛔⛔ **Worse: a drive checkpoint PINNED the falsehood.** `carcass-chain.dirty.wire.test.ts`
step 16 was titled *"the WAX half has no supply in the realm"* and
asserted it, so the suite was enforcing the mistake nightly and this
slate inherited it from the test rather than the other way round. The
step is rewritten.

⭐ What the sweep DID fix is the reachability of the far end: the
apiculture drive stopped at `rob` and nothing had ever walked the tail at
all, so the missing crush act had never been noticed. The tail is a drive
checkpoint now — asserting that `melt` and `dip` are understood at the
pot, and asserting as a POSITIVE that `crush` is not a word the game
knows, so the day apiculture ships the act that checkpoint fails and
tells whoever shipped it to come and finish the chain. The claim *one
recipe, two fats* remains unit-proven in `CraftingLogic.dipped.test.ts`
through the real resolve.

⭐⭐ **The lesson worth keeping from the whole episode** is not about bees.
It is that *a premise stated once gets cited* — this one travelled from a
grep, into a test title, into a slate's status block, and was quoted back
in planning for two builds before anybody checked the counter. Three
documents agreeing is not evidence when all three descend from one
search.

---

## ⛔ Five red checkpoints in the merged drive — ALL pre-existing, none from the merge

**27 passed · 5 failed · 2 skipped (34).** Every failure predates the
merge and each has a named fix. Two of them are worth more than the rest:

⚠⚠⚠ **AC15 has never killed anything.** The checkpoint drives a death
through `ConditionApi.die` rather than through `slaughter`, to prove there
is one death path — the build's central claim — and it does it with:

```
eval const t = MqlApi.one("here:a ewe").stuff; await ConditionApi.die(t, …)
```

**`MqlApi.one` does not exist and never has.** The surface is
`resolveOne(query, ctx)`. So the eval throws, nothing dies, no body
appears, and the checkpoint fails on the assertion *after* the one that
mattered. ⭐ The room listing in the failure message proves the sheep was
standing right there — *"a sheep"* — so the drive had everything it
needed and reached for a method name nobody checked. A checkpoint whose
setup silently throws is the vacuous-assertion hazard with the halves
swapped: it cannot pass, so nobody mistook it for green, but it has also
never tested AC15.

⚠⚠ **Checkpoint 18 hits the same ambiguity class as the cut probe.**
`look bread counter` raises a prompt the helper cannot answer, poisons the
session and burns 181 s. Same root as the deleted probe: the harness
recovers from a prompt by re-sending, and replies correlate by order.
→ a less ambiguous target, or the harness learns to answer.

### And three that conjure their inputs

All three are the same line:

```
'clone /trade/cooking/thing/tallow-crock --here' → declined (access-denied)
'clone /trade/apiculture/thing/beeswax-cake --here' → declined (access-denied)
'clone /trade/ranching/thing/bone --here' → declined (access-denied)
```

⚠⚠ **This is the carcass build's OWN drive finding 9**, in its own words:

> `clone … --here` is `access-denied`, correctly: a player holds no title
> over a room. The requirements say *without anything being conjured*, so
> the fix was the better drive.

That fix was applied to the knife, the lantern and the rations — which
are **bought** at the general store — and never to the candle and bone
legs, which still conjure. ⭐ And the drive record says its own table was
*"a union across runs"*, which is the tell: **this drive never had one
clean pass**, and the greens were assembled from runs where different
checkpoints happened to work.

⭐⭐ **The fix is the one the requirements already demand, and the chain
already produces two of the three inputs:**

- **bone** — the butchering at the yard yields it. Carry it, don't clone
  it. The honest version is strictly better, because it proves the bone
  came off *this* animal, which is the AC.
- **suet → tallow** — likewise: the butchering yields suet, `cook
  render-tallow` makes the crock. That is the chain this build shipped,
  and driving it would prove the fat leg end to end rather than starting
  from a conjured crock.
- **beeswax cake** — genuinely foreign to this chain; it comes off
  apiculture's `crush-comb`. Either buy it, or let the candle checkpoint
  prove the two-fats claim with tallow alone and leave the wax half to
  `apiculture.dirty.wire.test.ts`.

⚠ Worth saying plainly: fixing these would make the drive prove *more*
than it does today, not less. A conjured input skips exactly the links
the build exists to have built.

---

## ✅ "The session wedges after 25 game days" — DIAGNOSED, and it was not a wedge

Recorded here because the first diagnosis was **wrong**, and the way it
was wrong is the useful part.

The symptom: after `advance('25 days')` at the tannery, the next command —
a bare `look` — got no dispatch-response in 30 s, then still none at 90 s.
It was written up as a possible player-facing bug on the reasoning that
the tanning arc *is* ~25 days, so a player laying a hide in the pit and
coming back three weeks later walks this path.

⭐⭐⭐ **The server log settled it: the world was never hung, it was
SATURATED.**

```
TestHooks: advanced world-time '25 days' (31697s → 2191968s)
[Behaved:…] brain 'stocks' threw …
[Behaved:…] brain 'consigns' threw …
```

It kept printing the whole time. One jump of 2.16 million seconds makes
**every behaved agent in the realm deliberate and every roster tick fire
at once**, and the `look` queues behind the herd. Raising the frame
timeout did not help because the work is simply longer than the window —
which is the tell that it is throughput, not a deadlock.

⚠⚠ **So it is a DRIVE artifact, not a game defect, and the distinction is
the whole finding.** A live world never jumps three weeks in one step: it
advances continuously and the catch-up is spread over thousands of small
reads. The drive manufactured a thundering herd that the game never
produces. Fixed by walking any jump over two days in day-sized steps with
a beat between — faster in wall-clock *and* a truer model of the clock.

⭐ Two lessons worth keeping:

- **"No dispatch-response" is not a synonym for "hung."** It says only
  that nothing came back inside the window. Reading the SERVER's log
  rather than the client's timeout is what told hung from busy apart, and
  nothing else would have.
- ⚠ **A compressed clock is a test instrument, and instruments lie.**
  Three separate findings in this sweep turned out to be the harness
  rather than the game (this, the cut probe's in-flight collision, and
  `analyze sky`). *Validate the instrument first* — the project already
  had that rule written down.

⭐ And it is amplified by real content defects: the duplicate-counter rows
below make three brains throw on **every** deliberation beat, which is
wasted work piled on top of the catch-up.

---

## ✅ The two drives could not run in one world — FIXED by merging them

`butchery.dirty.wire.test.ts` and `carcass-chain.dirty.wire.test.ts` each
drafted a head out of the **same persisted Delight flock** and worked in
the **same yard** (`/world/terminus/hearts-delight/location/farmstead-yard`).
There is one file now — `carcass-chain.dirty.wire.test.ts` — and this
section is kept because the reasoning is why.

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
2. ⭐⭐ **Merge the two files — THIS IS WHAT WAS DONE.** They drive one
   subsystem and one chain over one farmyard, they duplicated the same
   `say`/`read`/`refusedFor` harness under the same names, and the
   butchery file's comments already cited *"the carcass drive's finding
   7"*. They were one document split by having been two builds, not by
   anything in the fiction.
   ⭐⭐⭐ **And the fix is the one the build itself argues for: ONE BODY,
   taken apart in stages.** Merging the files alone would not have helped
   — the ambiguity came from two ewes down in one yard, not from the file
   boundary. A carcass reduces and persists until spent (AC6), which is
   precisely what lets a knife-only butchering and everything downstream
   of it be the *same animal*. The merged drive drafts one ewe and asserts
   in a single act that the five products came off, that the sentence
   NAMES the saw it could not reach, that the carcass is still there, and
   that a cut reads as a texture. Nothing was dropped.
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

---

## ⭐ Two defects the sweep's server log handed over — NEITHER is this build's

Both found by reading `packages/wire/.wire/server.log` while chasing a
drive hang, both verified as **master's and untouched by this branch**,
and both offered to their owning trade rather than fixed here.

### ⛔⛔ `grain-whisky-aging` fails to stand up at boot — the grain half of a blend does not mature

```
MaturationProfileCatalogue: '/trade/distilling/idea/maturation/grain-whisky-aging'
  failed to stand up: RangeError: MaturationProfile.setTurnDays: days must be
  positive, got 0
```

`grain-whisky-aging.yaml` authors **`turnDays: 0`** and the setter demands
a positive number, so the profile **never joins the roster.** Shipped by
the whiskey-styles build (`806eef1ae`, W4). ⚠ The row's own prose
describes the maturation it is supposed to drive — *"it comes good sooner,
~17 game-days to drawable"* — so the feature reads as built and is inert:
this repo's recurring failure class, caught here only because a boot log
was being read for another reason.

⭐ **And it is a design question, not a typo.** `turnDays: 0` most likely
means *this cask never needs turning*, which is a legitimate thing to say
about a grain cask — in which case the **setter's contract is wrong** (0
should mean never, or the field should be optional) rather than the row.
Deciding that belongs to whoever owns the cask model.
→ `trade-distilling` / the whiskey slate.

### ⚠ The distributor's counter is instanced TWICE, and a brain throws on every beat

```
[Behaved:Dez Okoro] brain '/trade/shopkeeping/behavior/consigns' threw:
  StuffApi.findByTemplatePath('…/distributor/thing/counter'): expected
  singleton, found 2
```

**Two `props:` lists name the same row** —
`counting-houses/distributor/idea/business.yaml:37` and
`counting-houses/cash-and-carry.yaml:55` — so it is placed twice and the
singleton read fails. Pre-existing (`457998d0f`). It fires for **every
floor hand running `consigns`**, observed for three NPCs in one boot, so
the distributor's consignment leg is silently dead for all of them.
⭐ The lesson is the general one about `props:`: a designation is a claim
of ownership over placement, and two claims on one row is a duplicate the
schema cannot see. A `lint:` census of rows named by more than one
`props:` would close the whole class.
→ `trade-shopkeeping` / the retail slate.

---

## ⭐ Two seams salvaged out of the retired plans

The carcass-chain plan carried these and nothing else did; they are kept
here so the plan can be deleted.

### ⚠⚠ A corpse's MINTED IDENTITY has no reader, and this build multiplied the mint ~50×

Raised by `build-3` (instance-addressing) mid-build and settled across
two exchanges; recorded because **the multiplication is ours** — every
death now mints a corpse where only a handful used to.

`corpseIdentityFor` mints `<corpseRow>/<deceased identity>/<gameSecond>`
and **nothing keys on it.** Checked on both sides at the time:

- the ledgers key on the DEAD THING — `AccountabilityApi.record` and
  `recordDeathDeed` take `body.getIdentityPath()`, pinned in
  `ConditionLogic.die.test.ts`;
- `Corpse` composes no `PersistableMixin` and neither does `Creature`, so
  a corpse is a runtime clone and gone on restart;
- the belief leg is closed — the recognition-name path is gated on
  `isPersona`, which a corpse does not compose, and no production caller
  hands one to `learnIdentity`/`recognizes`.

⭐ So the only reader is the mint's own ordinal probe, which exists
*because* it minted. A closed loop. ⚠ The question worth keeping is
whether the mint should happen at all: **durability is not the test for a
discriminator, legibility is**, and nothing in the UX reference ladder
(keyword → the `distinguishing` form → an ordinal) can hold a path or a
timestamp. → `recognition-slate` owns the reference ladder; this line is
the carcass chain's evidence for it.

### ⚠ The `BulkPayload` tannin field

The tanpit's liquor carries bark concentration as pit state rather than
on the payload. If a **third** liquor consumer wants concentration to
travel with the bulk itself, that is the moment to put it on
`BulkPayload` — the subsystem-declares-its-own-fields rule in
[bulk.md](../../subsystems/bulk.md). Two consumers do not earn it.
→ `rendering-slate` (the tanning chain's), promote at the third.
