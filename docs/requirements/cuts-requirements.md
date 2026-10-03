# The cut — requirements

**Kind:** feature
**Leads from:** kernel — first consumer is **`trade-distilling`'s still
run** (`distil`, `brandy`, `grappa`), driven at **Crowsfoot's distillery
floor** in `terminus`, which already has a still and a still-book placed
and reachable.

A still run does not produce one liquid. It produces a **sequence** of
them, in boiling-point order, and the distiller decides where one ends
and the next begins. The first thing off is poisonous; the middle is the
spirit; the end is thin and foul. **Where you put the boundaries is the
whole craft** — and the shipped `distilling` Discipline already says so:
*"Control at the still — the wash, **the cut**, the run."*

Today the game performs one honest separation and mints one bottle.
`distil.yaml`'s own comment defers the rest: *"the cut (heads/hearts/
tails) is a later refinement rung."* This build is that rung.

⭐⭐ **It is built once and used twice.** Fractionating crude oil is the
same act with a different feedstock and more boundaries, so this is the
cheapest possible groundwork for refining — a **medieval-epoch** build
that pays for itself immediately in a shipped trade. That sequencing is
already decided and endorsed in two slates
([drilling](../slates/builds/drilling-slate.md) *Decided #4*,
[destructive-distillation](../slates/builds/destructive-distillation-slate.md)
*Open #2*) and repeated in
[maturation.md](../subsystems/maturation.md).

---

## What already exists

**The trade is complete and has no run.** `trade-distilling` ships the
still (a heat-gated tool that is also a furnace), five recipes, sixteen
materials, the still-book as an orderable work board, the warehouse and
still-house, and the `distilling` Discipline. It ships **zero verbs** —
its recipes are `order`ed. A run today is a single atomic act: inputs
consumed, the 351 K heat gate checked, one bottle minted. There is no
run state, no progress, and no fraction.

**The seam is already authored, and already named.** The wash's
maturation profile authors a foreshot character — *"harsh and
acetone-edged off the grey grist"* — annotated as the **inert** seam of
this exact rung, reading into metabolism's toxin dose. It is **prose**,
not a number, which turns out to be the right shape: the character is
the *evidence a distiller judges by*.

**The harm loop ships end to end.** The ledger
([accountability.md](../subsystems/accountability.md)) appends one `harm`
row when something consumed carries a maker's mark and the maker is
**somebody else** — *"eating your own risky food is a private gamble;
putting it in front of a paying customer is a choice about another
person."* The maker's mark is per-instance and un-spoofable, it travels
through a pour into an empty vessel, and a marked bottle already prints
*"Made by X"* when you look at it.

**The toxin substrate ships.** A dose on a substance, a per-body burden
with authored absorption/clearance/potency, and **one banded condition
per toxin** — with alcohol itself as the worked exemplar (Widmark BAC,
drunk and acute poisoning as bands of one axis). ⭐ **A new toxin type is
a content row**, not code.

**The fraction mechanism ships, one boundary short.** A finished
ferment holds its lees back as a **rack floor**: shadowed out of what
you can draw, and when a draw crosses it the residual **changes material
and re-keys at once**. Its own comment: *"AMOUNT-triggered, never
time-integrated."*

**The reads ship.** `smell` and `taste` are perception verbs. The
instrumentation ladder's governing rule is ⭐⭐⭐ *competence resolves
DETAIL, it never resolves ACCESS* — and a new reading channel is a row
in any pack, with no kernel list to edit.

**What does NOT exist:** no `drain`, `decant`, `siphon`, `rack` or
`swap` verb (racking is `pour`); no fraction, cut, or run progress
anywhere; no recipe producing more than two things, and the one
byproduct mechanism carries a fixed template and a count with no
material, grade or volume. ⚠ And **no drink in the game can be unsafe**
— spirits author no spoilage activation energy and are deliberately
inert to both microbial gauges, while grade is explicitly the maker's
verdict and *not* safety.

> **Therefore what is genuinely new here is an ordered fraction schedule
> on a batch — the shipped rack-floor split with a list of boundaries
> instead of a single one — plus the first substance in the game whose
> *safety* varies with how well somebody made it.**

⚠ A survey conclusion this replaces, recorded so it is not re-derived:
the first reading of this feature was that it needed *"the engine's
first durative act the operator steers from inside."* **It does not.**
The draw order *is* the boiling order, so the fraction is a function of
how much has come off — amount-triggered, exactly like the lees. No
clock, no mid-flight decision hook, no multi-output recipe, and no new
verb.

---

## Goals

- A still run yields its output as **ordered fractions** — foreshots,
  heads, hearts, tails — in the order their boiling points dictate, and
  which one is coming off now is a function of **how much has already
  come off**.
- A distiller **decides where each boundary falls** by reading the run,
  and can put different fractions in different vessels.
- **Keeping the foreshots makes the spirit harmful to whoever drinks
  it**, on the shipped dose model, and the harm is attributed to the
  maker through the shipped ledger when the drinker is somebody else.
- A **tight cut costs yield and a wide cut costs quality**, so neither
  is a dominant option and the decision is real every time.
- **Competence sharpens the read, never the access.** An untrained
  distiller may attempt any cut and will judge it badly; an expert
  judges it precisely and therefore wastes less. Nobody is refused for
  being untrained.
- The boundaries **move with the wash**, so there is no threshold to
  memorise — which is what keeps the dominant skill *judgment* rather
  than recall.
- The fraction schedule is **general enough that fractionating crude is
  rows and a different number of boundaries**, with no further kernel
  work.

## Non-goals

- **A whiskey recipe.** ⚠ Whiskey is consumed by four cocktail recipes
  and made by nothing — its only faucet is a corpo's yard stock. Closing
  that loop is a real gap and it is **not this build**. →
  [libations-slate](../slates/tails/libations-slate.md).
- **Petroleum, refining, or any second feedstock.** The schedule must be
  general; proving it on crude is → [drilling-slate](../slates/builds/drilling-slate.md).
- **Coal-tar cuts.** → [destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
  *Open #2*, which will use this rung.
- **Congeners worsening a hangover.** The pleasant-to-unpleasant end of
  the same chemistry. → [daves-bar-slate](../slates/builds/daves-bar-slate.md).
- **A lab assay that names the dose in a bottle.** Costs one row once
  somebody wants it. → [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md).
- **Inspection, licensing, recall or prosecution.** The ledger records;
  the polity decides. ⭐ This is deliberate and already designed that way
  — tier C, the players' to build. → [dairy-slate](../slates/builds/dairy-slate.md)
  § *Governance*, [civics](../subsystems/civics.md).
- **Spoilage on any fermentable or spirit.** ⚠ There is a standing
  instruction not to add a spoilage constant to a fermentable without
  first deciding which model owns the vessel. This build adds a toxin,
  which is a different gauge, and touches neither. → the note stays in
  [spoilage.md](../subsystems/spoilage.md).
- **Person-to-person illness.** Nothing here is contagious. → nowhere,
  deliberately; this is a chemical dose, not a population.

## Placement

**The fraction schedule is kernel.** It generalises the rack-floor split
that already lives in the maturation substrate, and its second consumer
is a different trade in a different epoch — which is the test. A pack
that wants fractions authors rows.

**Everything else is content.** The foreshot toxin is a condition row
with its own banded behaviour (a new toxin type is a row). The
boundaries, the fraction materials and their characters are rows on
`trade-distilling`'s own profiles. The spirit materials are the trade's.

⭐ **Does a second instance need code?** No. A second distilled product
is a profile with different boundaries; a second *feedstock* with a
different number of cuts is the same; and a non-drink fractionation
(crude, coal tar) is rows plus whatever that trade's own materials are.
That is the whole point of building it here.

## Collisions

- **Crowsfoot's distillery floor** (`terminus`) already has the still
  and the still-book placed, and it is where this is driven. **Veshko**
  runs it in fiction and the corpo's vertical integration is authored
  around it — *"same still, three positions on the shelf."* ⚠ Anything
  added here lands in a corpo's house, not an empty workshop.
- **The still-book** is an orderable board whose five recipes are the
  trade's whole surface. `distil`, `brandy` and `grappa` are all runs
  and all get fractions; `compound-gin` and `wash-mash` are not runs and
  must be untouched.
- **The bar** consumes the output. Cocktail recipes take `whiskey` and
  `neutral-spirit`; a change to what a run yields reaches the bar's
  recipes, and ⚠ the well pour is an unbranded bottle a bar reaches for
  when a guest does not specify.
- **The vat and the mash tun** compose both the maturation and the bulk
  substrates. The wash's profile is where the foreshot character already
  lives, so this build edits a row that a shipped ferment reads.
- **Every stock bottle** is marked and prints its maker on `look` — so
  the social consequence of a bad batch already has a surface, and this
  build must not invent a second one.

## Surface decisions

### Does a finished bottle reveal that it is harmful?

**No. No sense reports it.** You can see how it was *made* — whether a
first draw was poured off — and the bottle names its maker. You cannot
smell the methanol in the glass.

This follows the shipped doctrine exactly: the hazard is invisible, the
**risk** is legible. *"You can see that the meat is raw, that the board
was used for gutting… invisible to the senses, knowable by procedure."*
It is also simply true — methanol is not detectable by taste in spirit,
which is precisely why it has killed people.

⚠ The consequence, accepted deliberately: **a bad bottle cannot be
detected before drinking.** What protects a drinker is who they buy from
— the maker's mark, and the ledger behind it. That is the design, not a
gap: it is what makes provenance *matter* rather than decorate.

⭐ A lab reading would lift it later and costs one row. Named as a
non-goal above rather than built, so the social answer gets a chance to
be the answer first.

### Can an expert be perfectly safe?

**No, but a good cut is harmless.** Trace congeners are always present,
so the dose never reaches zero — but a well-judged cut puts it **below
the lowest band**, where it does nothing.

This keeps the butchering doctrine's spirit (*"the answer has to be
cooking and cold, never a good enough butcher"*) without making skill
into immunity, and it is chemically honest. What expertise buys is
**precision**: an expert reads the boundary closely and so cuts tighter,
wasting less spirit while staying under the band. A novice must choose
between wasting a lot and gambling.

### What does the cut cost, in both directions?

**Tight cut → less volume. Wide cut → worse grade *and* a dose.**

Two separate axes on purpose, because they are two separate facts: grade
is the maker's verdict on quality and is explicitly *not* safety, so the
toxin cannot ride it. A wide cut is both nastier and more dangerous, by
different mechanisms, and a player can discover one without the other.

⭐ This is what makes it a decision rather than a lesson. The dairy
slate already decided this shape for its own version — *"a real
trade-off, not a dominant option"* — and pouring the heads away has to
cost something or there is nothing to decide.

### Is the harm attributed, and to whom?

**To the maker, by the shipped ledger, and only when the drinker is
somebody else.** No new mechanism: the mark is already per-instance and
travels through a pour, and the ledger already appends exactly one row
on this condition.

Nothing notifies anybody. The row exists to be read — by a polity that
decides to care.

### How does a player know which fraction is running?

**By looking, smelling and tasting it — banded in words, with no number
in them.** The authored foreshot character is the evidence; competence
decides how sharply it reads. The underlying truth is seeded, never
drawn: *the read decides what you can tell, never what the world is.*

⚠ The material change at a boundary must **not** be announced. A notice
would convert judgment into a prompt, which is the failure this design
exists to avoid.

### Why is this not a new verb?

Because racking **is** `pour`, and the decision is *which vessel you
pour into and when you stop*. A run that yields in order, drawn with the
verb that already moves liquid, needs no new word — and a verb would
imply a mid-run interaction the physics does not have.

---

## Lens pass

**1 · Pedagogy.** Dominant Discipline: **distilling** — and the skill
that decides the outcome is *reading the run*, which is judgment under
uncertainty, not recall. ⭐⭐ The trap was explicit and was avoided: a
numeric cut point would have made the dominant skill menu-memorisation
while the design claimed judgment. **Derivable**: lower boiling point
comes off first (methanol 338 K, ethanol 351 K, fusel oils above), so a
player who internalises that predicts the order correctly without
looking anything up. Secondary: `chemistry`, `appraisal`,
`alcohol-tolerance` on the receiving end.

**2 · Creative expression.** The ordinary case is **rows**: boundaries,
fraction materials and characters on a profile. The bespoke case is a
different feedstock with a different number of cuts, which is also rows.
⭐ Supply-chain depth: a distiller's output becomes distinguishable by
*who made it*, which is personalization falling out of the chain rather
than being authored.

**3a · Immersion.** The fiction does not betray itself: the first of the
run is bad, you pour it away, and nobody can taste the difference
afterwards — all three are true of real distilling. ⚠ The one risk is
the boundary being *announced*; refused above.

**3b · Participation.** ⭐⭐ This is the strongest entry. It creates a
**blacksmith-shaped hole for a health inspector** — an office with a
real criterion (the ledger), a real appeal, and no code written for it.
The polity can do something we did not ask for: licence distillers,
prosecute one, or ignore the whole thing and let reputation sort it out.

**4 · Values.** The choice is forced and it is about somebody else:
**your yield against a stranger's health**, with the harm delayed and
invisible and the temptation therefore real. ⭐ No gauge converts it —
there is deliberately no number telling you how dangerous your batch is,
because quantifying it would make it an optimisation instead of a
judgment.

**5 · Continuity.** ⭐⭐⭐ The capability survives the epoch *by
construction*, which is unusual enough to be the reason for the build:
the same act fractionates a pot-still wash and a barrel of crude. Only
the feedstock, the number of boundaries and the consumers change.

**6 · Economy.** Produces: a graded spirit, plus waste. Consumes: wash,
fuel, the distiller's attention, and **yield given up for safety**. Who
pays: the distiller pays in volume; a careless one externalises onto the
drinker, which is the point. ⚠ The demand was there first — four
cocktail recipes take whiskey and the bar buys spirit today.

**7 · Governance.** ⭐ It judges a **person** — the maker — so the
criterion must be named: the criterion is *a dose above the lowest band
in something somebody else drank*, derived from the ledger, appealable
because the ledger is append-only and readable by anybody. ⚠ **Nothing
in this build imposes a penalty.** Entrenchment: the ledger row is tier
B (whoever ships the code); what is *done* about it is tier C (the
polity's).

⚠ **Gap recorded:** nothing here gives the drinker any way to learn they
were poisoned, beyond feeling ill hours later. Diagnosis is medicine's
and is named as out of scope by the build that created the demand.

---

## The drive

At **Crowsfoot's distillery floor**, which has the still and the
still-book.

1. **Order a wash** from the still-book (`wash-mash`: grist and water in
   the mash tun) and let it ferment to finished. → you have a wash with
   a grade.
2. **Look at the still.** → it is cold and empty, and says so.
3. **Charge the still with the wash and light it.** → it takes the
   charge; the run needs 351 K and refuses below it, in words that name
   the heat rather than a failure.
4. **Smell the still as the run starts.** → a banded character with **no
   digit in it**, and for an untrained distiller it reads vaguely. This
   is the foreshot character, and it should read as *wrong* —
   solvent-sharp.
5. **Pour the first draw into a slop bucket**, a little at a time,
   smelling as you go. → the character **changes** as you cross into the
   heads, and ⚠ nothing announces it: you notice, or you do not.
6. **Pour into a clean bottle once you judge the hearts are running.**
   → you get a graded spirit. Cut late and you have less of it; the
   grade is good.
7. **Keep pouring past the end of the hearts.** → the character turns
   thin and foul, and the grade of what is in the bottle falls.
8. ⭐ **Look at your bottle.** → it names you as the maker and gives a
   grade band. It says **nothing** about whether it is safe.
9. **Now do it badly on purpose**: charge a second wash and bottle from
   the very first drop. → a full bottle, a worse grade, and no warning
   of any kind.
10. **Drink some of the good bottle yourself.** → you get drunk on the
    shipped model and nothing else happens.
11. ⭐⭐ **Have a second character drink the bad bottle.** → they get
    drunk, and then ill — a banded condition from the dose, arriving
    *after* the drinking.
12. ⭐⭐⭐ **Read the ledger for that character.** → exactly one `harm`
    row, naming **you** as its initiator. Drinking your own bad bottle
    in step 10 wrote **no** row.
13. **Check the blame read.** → the harm is attributed and derived on
    read; nothing notified either of you, and no penalty was applied.

## Acceptance criteria

Observable from outside the code.

1. A player can run a still and **put different parts of the run in
   different vessels**, with no new verb to learn.
2. The character of what is coming off **changes during the run**, and a
   player can tell by smelling or tasting it — in words, with **no
   number**.
3. ⭐ Nothing announces the boundary. A player who does not look does not
   find out.
4. Two players of different competence reading the same run get
   **different sharpness of answer, and both may attempt any cut** —
   neither is refused for being untrained.
5. A tightly cut bottle holds **less** spirit at a **better** grade than
   a widely cut one; neither choice is free.
6. A bottle made by keeping the first draw is **indistinguishable by any
   sense** from a good one, and both name their maker on `look`.
7. A character who drinks a badly cut bottle becomes **ill after
   drinking it**, by a dose that depends on how badly it was cut.
8. ⭐ A well-cut bottle makes nobody ill, however much of it they drink
   — beyond ordinary drunkenness.
9. ⭐⭐ When somebody **else** drinks a badly cut bottle, the ledger holds
   exactly one harm row naming the maker. When the maker drinks their
   own, it holds none.
10. No penalty, notification, licence or prosecution occurs — the record
    exists and nothing acts on it.
11. Fermentation, the mash, compound gin, and every existing cocktail
    recipe behave exactly as before.
12. An author can give a different product a different number of
    boundaries **in rows alone**, and a reviewer can see that a
    non-drink feedstock would need no further engine work.

## Cross-references

**Seeding slates**
- [drilling-slate](../slates/builds/drilling-slate.md) §
  *Refining is the distiller's DEFERRED CUTS RUNG* — *Decided #4*: build
  this for whiskey first
- [destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
  *Open #2* — coal-tar cuts want this rung; *"build it once, use it
  twice"*

**Subsystem docs**
- [maturation.md](../subsystems/maturation.md) — the profile surface, the
  rack-floor split, and the inert `foreshotCharacter` seam
- [metabolism.md](../subsystems/metabolism.md) — the dose model, the
  per-toxin banded condition, alcohol as the exemplar
- [accountability.md](../subsystems/accountability.md) § *Producers* —
  the bad-meal harm row
- [crafting.md](../subsystems/crafting.md) — craft-resolve, grade, the
  maker's mark
- [spoilage.md](../subsystems/spoilage.md) — the risk-legible doctrine
  this follows, and ⚠ the fermentable-spoilage instruction it must not
  trip
- [instrumentation.md](../subsystems/instrumentation.md) — *competence
  resolves detail, never access*
- [advancement.md](../subsystems/advancement.md) — the `distilling`
  Discipline, which already names the cut

**Related, not in flight**
- [dairy-slate](../slates/builds/dairy-slate.md) § *Governance* — the
  designed position on negligence harming a stranger, which this build
  must not contradict and is now the ledger's *first* producer consumer
  rather than its second
- [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md)
  — where a bottle assay would land
- [libations-slate](../slates/tails/libations-slate.md) — the missing
  whiskey recipe
