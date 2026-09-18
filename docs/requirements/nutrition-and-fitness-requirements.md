# Nutrition & fitness — requirements

**Kind:** feature
**Leads from:** kernel — first consumer is **every body that already
works**: the miller at the quern, the smith at the anvil, the farmstead's
plough, the two `eats` cast who buy bread every morning. The producers
are running today; nothing warms them, they are simply not read.

What a life writes on a body, and the reach it buys. Today the game runs
food's *hours* clock (satiation, hydration, endurance recovery) and half
its *months* clock (a fat stock nobody but a stockman can see). This
build finishes the months clock for people — a body that shows what its
life has been, one honest muscle figure, hard work that costs the same
everywhere and adds up to something you can now *do* — and cashes the
2026-06 micronutrient punt against the fruit already on the shelf.
Seeding slate: [nutrition-and-fitness-slate](../slates/builds/nutrition-and-fitness-slate.md).
⭐ The decision that decides the rest: **the reward for fitness is reach —
where you can go and what you can do — never a number or a rank.**

---

## What already exists

Surveyed 2026-09-18 at the product level.

**The body.** Every living thing carries `endurance`, `satiation`,
`hydration` and — since the farmstead build — `flesh`, body condition as
fat cover on a months clock (*satiation is hours; flesh is months*). It
is banded by eye (emaciated · thin · good · fleshy · fat) — **but the only
people who can read it are stockmen**: `draft`, `return` and `handle`
print it for livestock, and `look <person>` prints name, description,
age, attire, combat state and wetness, never the body. Muscle exists too,
**per body part**, as tissue mass beside fat and bone — the substrate the
capability-magic slate says strength *is* (read as force; bounded 2–3×;
atrophies) — and the physiology slate already lists *exertion = muscle ×
circulation × respiration* as a planned derived read. Nothing aggregates
it; a known tissue-sum bug (92.9 kg of parts on a 70 kg body) sits where
that aggregate would be. The injury build (build-4, unmerged) adds the
function axis — six body capacities in four bands, worst-band-wins — and
an internal **heat load** with the note *"the seam exertion wants next."*

**Work.** Roughly forty durative verbs hold your hands for a duration —
`hew` `drive` `shore` `plough` `mow` `smelt` `mill` `knead` `bake`
`hammer` `spin` `weave` `sew` `dye` `char` `cast` `boil` `stir`… — and
they tire you **three different ways**: mining, farming and smelting each
debit `endurance` up front by a flat figure (hew 4 %, plough 14 ÷
draught, smelt 10); every other trade's work costs nothing; hauling a
wheeled cart is free by design, and every self-powered step over a
quarter-load drains a little. The vitals and reserve docs both list
"exertion draining endurance" as *the* deferred producer.

**Moving.** `run`, `sneak`, `walk`, `climb`, `swim`, `fly`, `ride`,
`drive`. `run` is faster and louder and **costs nothing and never
tires** — every pace mode authors a `costMultiplier` that nobody reads.
`climb` and `swim` are real substrate gated on a `swimming`/`climbing`
figure nothing ever sets; one exit in the world is climbable (the Ferrow
winze ladder) and **no location in any pack can be swum** — the estuary
declares water and nothing composes swimming.

**Advancement.** A Discipline is `skill`, `knowledge` or `conditioning`
("the body adapts — bounded and bidirectional; lay off and it fades").
Competence is a derive-on-read fold over an append-only Transcript with
**no forgetting term**; a Discipline's bands can confer verbs. The
`conditioning` channel has one row, `alcohol-tolerance`, which nothing
credits and nothing reads. `sports` is a knowledge-channel ISCED node
(darts hangs off it); there is no train, spar, lift or race verb, and
combat's "gym" is a balance bench, not a place. `practice` is a
wizard-only harness. Advancement's ratified Law 2: *capacity, not decay —
never tax absence*; participation already runs a recency-decayed fold
as the sanctioned shape.

**Food.** `eat` credits four macro tags (`carb` `sugar` `fat` `protein`)
plus water; protein routes to an inert tissue-repair pool that delivers
nowhere. A nutrition label exists but only dishes, loaves and puddles
carry it; a bare `Provision` does not. The grain chain made a loaf know
its **parts**, so a 0.72 loaf and a wholemeal loaf are one material with
different composition. **Fruit is already food**: orange, lemon, lime,
grapefruit, cherry, cranberry, grape, olive, mint are edible things,
minted by the crate — but stocked only as the Lounge bar's garnish, with
no nutrient amounts (tags `water, sugar`). Scurvy was designed in the
metabolism slate (full ledger, curated consequences, active-play clock,
expedition-grade) and claimed as "the consumer appearing" by the cooking
slate; neither shipped it.

**What the player sees.** `assess` says unhurt / hurt / seriously
injured, dying, afflictions by sign, wounds. `score` is the identity
card. Hunger, thirst, tiredness and build reach the player **only as
floor conditions** (starvation, collapse, emaciation) — there is no
readout of any reserve, which is correct (no gauges) and also means the
mirror has never been held up to a person.

**Ruled elsewhere, and consumed here rather than re-decided:**
[mirror-slate](../slates/builds/mirror-slate.md) owns the real-world
bridge (density not verification · absence neutral · *recognition, not
advantage* · never the raw feed); [lineage-slate](../slates/builds/lineage-slate.md)
owns the body's *endowment* — fat/muscle/bone at one mass, and stature
— dealt at char-gen; `race.md` sealed stature at species level;
[metabolism-slate](../slates/tails/metabolism-slate.md) owns scurvy's
shape; [campus-grounds-slate](../slates/builds/campus-grounds-slate.md)
owns the athletic grounds as `sports`' venue.

**Therefore what is genuinely new here is:** the mirror held up to a
*person*; one muscle figure the whole body agrees on, and the two
derived numbers it makes possible (BMI, density); one way that work
tires you, feeding three things; a conditioning Discipline that is
actually read, and the first three things it lets you do; ten materials'
worth of nutrient amounts and the one deficiency that makes them matter;
and rates you can turn.

---

## Goals

- **A person's body is legible to the people around them.** Looking at
  someone says what their life has made of them — *gaunt · wiry · in good
  flesh · heavyset · fat* — in the same register livestock already get,
  with no authored line. The mirror shows you, and shows you first to
  others.
- **A body has one muscle figure.** The stockman's palpation, the
  physician's `assess`, the tailor's tape, the water's buoyancy and a
  strength read all agree, because there is one thing to read. Muscle
  grows from work and protein and wastes without either, on the same
  months clock as fat.
- **Body-mass index and body density are derivable** from what the
  engine honestly measures — mass, the species stature, the fat/lean
  split — and never shown as a number to the person they describe. The
  physician can say the band; the water can float or sink you.
- **Hard work tires you the same way everywhere.** Every durative verb
  and every self-powered step is one kind of exertion, in proportion to
  its real work; the three packs that charged up front and the thirty
  that charged nothing now charge alike. Exertion is also **heat**: it
  costs water through the thermal path, a coat stops it getting out, and
  a shift in a steam-filled cellar has nowhere to put it.
- **Fitness is reach.** A conditioning Discipline, `wind`, is credited
  by exertion and read at the verbs it confers: a `run` you can sustain,
  a climb without the rest, a double shift. Lay off *while playing* and
  it fades; be absent and nothing moves. `alcohol-tolerance` becomes
  true by the same rule.
- **The fruit on the shelf is food that matters.** Citrus carries its
  vitamin; a long haul on bread alone ends in scurvy; an orange ends the
  scurvy. A loaf's composition decides what it feeds you, so wholemeal
  and white from one wheat nourish measurably differently, with nothing
  authored per loaf.
- **A season can be compressed honestly.** The rates that decide how
  fast a body changes are operator dials, so a wizard, a demo or the
  drive can watch a season in an hour and turn it back.

## Non-goals

- **Per-individual stature** → [lineage-slate](../slates/builds/lineage-slate.md)
  (the endowment dealt at char-gen; revisit with lineage). BMI reads the
  species stature until then.
- **The real-world exercise-device adapter** → [mirror-slate](../slates/builds/mirror-slate.md).
  This build ships the `exertion` seam with one shape; whether a device's
  session buys reach or only recognition is the mirror slate's ruling
  (*recognition, not advantage*, as it stands) and is **not decided here**.
- **Any readout of a reserve, a BMI, a fitness figure or a rank to the
  person it describes** → nowhere, deliberately (measurement.md § the
  mirror is never a gauge; the consequence slate's "never render endurance
  as a number").
- **Sport — races, matches, lifts, and the standing they confer** →
  [campus-grounds-slate](../slates/builds/campus-grounds-slate.md) (the
  athletic grounds) and the `sports` Discipline's own build. Fitness is
  private; sport is where others say so.
- **A gym as a place, and train/spar/lift verbs** → the same; a gym is
  fixtures that afford exertion for its own sake, once exertion exists.
- **Swimming as reach** → the underwater/fishing build; nothing is
  swimmable today. The swim conferral is authored when there is water.
- **The wider deficiency roster (anaemia, rickets…)** → content against
  the shipped kind vocabulary, per pack, as the foods arrive; the
  metabolism slate's tail.
- **kcal / joule energy accounting, per-individual metabolic rates, the
  fuller-stomach coupling** → the metabolism slate's tail, unchanged.
- **Dairy, honey, legumes, fish, the butcher's yield tables** → their
  own chains (ranching's next phase after pets; farming Stage B; fishing;
  butchery).
- **Appetite, body image, the psychology of eating** → nowhere,
  deliberately. The engine measures mass and two stocks; what a person
  feels about them is theirs.
- **The hours clock** (hunger as a timer) → unchanged, deliberately.
  Never invent a need to create a market.

---

## Placement

**Kernel.** The body, the exertion event, the conditioning fold, the
nutrient kinds and the readouts are platform substrate every pack's
content composes on; no trade owns them. The `wind` Discipline row and
its conferrals are platform content (`/platform/idea/Discipline/`)
beside `alcohol-tolerance`. The nutrient amounts are rows in the packs
that own the foods (`trade-farming` for the fruit, `trade-milling` for
the parts of a loaf). Scurvy is a platform condition row beside
`starvation` and `emaciation`.

⭐ **The second-instance test:** a second trade whose work should tire
you needs zero code — its durative verbs already ride the one step
mechanism, and the effort figure is a number on the row. A second
conferral (the swim, when there is water) is a line on the `wind` row. A
second deficiency is a condition row plus amounts on the foods that
cure it.

Host placement — which class carries the stock, whether the stock
drives the per-part tissue or aggregates it — is the plan's.

---

## Collisions

- **Every living body, everywhere.** `flesh` shipped as a no-op on
  bodies that predate it; the muscle figure and `wind` follow the same
  rule. No migration: a dev DB is dropped, a fresh body starts at the
  species figure.
- **The three packs that already charge endurance** — trade-mining
  (`hew` `shore` `drive`), trade-farming (`lime` `ditch` `grub` `mow`
  `plough`), trade-smelting (`smelt`). Their flat debits become effort
  figures on the one event; the *felt* cost of a hew or a plough must
  not change out from under the players who know it.
- **Encumbrance's traversal drain** at the one self-powered chokepoint —
  the exertion producer *is* this producer, extended, never a second
  drain beside it. Riders and forced moves still cost nothing.
- **The tailor** — `measure figure`, `cut`, `alter --for` read a girth
  off mass and species stature and already say *"you have moved since
  last time."* Untouched; a body that changes composition changes mass
  and the tape notices.
- **The stockman's reads** — `draft`, `return`, `handle` print body
  condition for livestock through the same band the person-facing line
  will use. One vocabulary; the animal's read must not change.
- **The physician's `assess`** — build-4 rewrote it for the function
  axis; the body-condition band lands beside its afflictions-by-sign,
  not in a second verb.
- **`look`** — gains a body line for a person in the same slot the age
  line and the attire impression already occupy. Recognition rules
  apply: the line describes a body, never names a person.
- **The Lounge bar** stocks the citrus as garnish; the distribution
  counter at Wharfside prices what the trades ship. **A person must be
  able to buy an orange** — today the fruit exists only behind a bar.
- **The two `eats` cast** at Heart's Delight buy bread; their bodies now
  carry the stocks and their brains do no work. They stay in good flesh
  on bread alone until the deficiency clock, which is long — correct,
  and worth watching.
- **Combat** — endurance already caps poise recovery and tempo; combat
  exchanges become an exertion producer, so a long fight tires and heats
  you. Combat's `reach` is a *range band*; this doc's *reach* is a
  product word and never a code identifier.
- **Magic** — build-4's heat pump already deposits into the heat load;
  the mana-economy slate priced casting at ~300 W, "about the cost of
  walking" — `cast` and `study` are durative and tire you like work.
- **Build-4 (`design/harm-survey`, unmerged)** — the function axis and
  the heat load are read off that branch. It should merge first; if it
  does not, the heat consumer waits and nothing else here depends on it.

---

## Surface decisions

### Two stocks, one muscle figure

**Question.** Is body composition one stock (fat) or two (fat + lean)?
**Answer.** Two — and muscle is *one figure*, never a second copy.
**Reasoning.** Lens 1: a stevedore and an alderman at the same mass have
the same BMI and are not the same body; an engine with one stock cannot
teach the canonical thing BMI gets wrong. Muscle already exists per body
part; a whole-body stock that could disagree with the parts is the
two-models-for-one-fact defect build-4 just spent a wave removing from
thermal. The requirement is agreement: stockman, physician, tailor, water
and strength read the same figure. (Fat already has this defect —
`flesh` beside the per-part tissue — and the plan may take the chance to
close it the same way; not required.)

### Stature stays the species'

**Question.** Does a person get a height?
**Answer.** Not here — lineage's.
**Reasoning.** BMI is mass/stature² and mass already varies per person;
density reads the split; the tape reads mass. Stature buys only "a tall
man", which is an endowment and lineage owns endowments. `race.md`
sealed the seam; reopening it for a cosmetic is the wrong build.
**Revisit** with lineage in char-gen.

### Exertion is one event, and it is THE producer

**Question.** Does the exertion event replace the three packs' endurance
debits or sit beside them?
**Answer.** Replace — unify. (User, 2026-09-18.)
**Reasoning.** Three trades tire you and thirty do not; that is a product
defect, not a tuning. And an exertion path beside the shipped traversal
drain is the second-drain the vitals and reserve docs warn against. One
event, in real units (a duration and an effort), from every durative
verb and every self-powered step; three readers — endurance now, muscle
over months, `wind` over the transcript — and the heat load, so that
work costs water through the thermal path and a coat stops it getting
out. Felt costs are preserved: a hew still costs what a hew cost.

### Fitness is a Discipline, and its reward is reach

**Question.** Is fitness a conditioning Discipline, or just the stocks?
**Answer.** Both — stocks are what the body IS, `wind` is what it can
DO. Lens 4 chose: the reward must be a thing you can now do, spent on
choices; a Discipline's band-gated conferrals are exactly that, and a
badge for time is the named failure.
**The first ladder** (content on the row; chosen so the drive can prove
each): **the sustained `run`** — a fresh body's run breaks to a walk
after a few exits, winded, and a conditioned one holds; **the climb
without the rest** — the winze ladder; **the double shift** — a second
durative act back-to-back without the endurance floor refusing. The swim
is authored when there is water.
**Decay.** `wind` folds with a half-life on the **active-play clock** —
advancement's Law 2 (*never tax absence*) and metabolism's deficiency
precedent. Lay off while playing and the band falls; log off for a month
and nothing moves. The Transcript stays append-only; nothing is stored.
`alcohol-tolerance` folds the same way and becomes true.
**Who says so.** Nobody. Fitness is private; sport confers standing and
is another build's.

### The mirror is a line in `look`, and only that

**Question.** How does a person see what their life wrote on them?
**Answer.** The way everyone else sees it: `look` describes the body in
the stockman's register — *gaunt · wiry · in good flesh · heavyset ·
fat*, one vocabulary over two stocks — and the physician's `assess` says
the BMI *band* in words. No number, no meter, no card field.
**Reasoning.** measurement.md § 6.3, verbatim; the mind slate's line
that *a body condition is something the game tells you about*; and the
lived observation that other people see it before you do.

### Scurvy is consumed, not re-decided

**Question.** What shape do micronutrients take?
**Answer.** The metabolism slate's, unchanged: a small kind vocabulary
on materials (vitamin C first; iron, the B group, calcium, fibre as the
content earns them), carried through a food's composition exactly as the
macros are, and **curated** consequences — scurvy, the canonical: no
vitamin C over an expedition-length of active play → a progressing
condition the physician can see, resolved by fruit. Wholemeal-vs-white
falls out of the loaf's parts; nothing is authored per loaf. The label
gains the kinds where a label already exists.
**Reasoning.** Designed in June, claimed by cooking, shipped by nobody
because the consumer never appeared. The consumer is ten fruit rows that
already exist as things. Cooking keeps its galley set-piece; the
condition lands here and both slates say so.

### Rates are dials

**Question.** How does anyone see a months-scale consequence?
**Answer.** Every rate that decides how fast a body changes — muscle
gain and loss, `wind`'s half-life, the deficiency clock — is an operator
setting, like the freshness and equip scales already are. A wizard turns
a season into an hour and back.
**Reasoning.** No verb moves the world clock and no drive has yet proved
a months-scale claim; a build whose whole payoff is months-scale needs
an honest way to be watched. This is a product need (a demo, a
classroom), not a test convenience.

---

## Lens pass

1. **Pedagogy.** BMI computed and its famous failure teachable (two
   stocks); body density as a real derived quantity with a mechanical
   consumer; wholemeal-vs-white *derived* from extraction, not labelled;
   scurvy resolved by provisioning. Disciplines: `wind`; the physician's
   `assess`; the stockman's band, now on people.
2. **Creative expression.** The ordinary case is rows: an effort figure
   on a verb, a conferral on the `wind` row, amounts on a food, a
   condition. A Cast row's body is its species figure plus whatever the
   dossier claims. The bespoke case — a new deficiency, a new conferral,
   a sport — is content, never a kernel edit. **Gap:** a Cast row cannot
   author *a wiry man* until lineage or the dossier carries a body
   claim; recorded, lineage's.
3. **Immersion & roleplay.** The body is a `look` line, not a stat;
   clothes stop fitting; the miner and the clerk diverge after a season
   with nobody narrating it. RP emerges from a body that is honestly
   what its life made it.
4. **Gamification & self-improvement.** The choice forced: what you eat
   and what you do, over a season — and it is a choice only because the
   menu has alternatives that differ. What it tells you: the mirror,
   through other people. The reward: reach, spent on choices. Standing:
   none from exertion (*you can't farm a god*); sport's, elsewhere. The
   bridge is opt-in and the game is complete without it.
5. **Technology & magic.** One exertion event from a quern to a
   treadmill to a spell; the vehicle is the dynamics. Magic moves energy
   (the heat pump deposits into the same load) and cannot make a body; a
   working that "grants strength" is priced like every other working and
   fades like conditioning.

---

## The drive

Run against the live game before the MR opens; written as a wire file.
Two sessions: **H** (the hauler) and **L** (the lounger), same species,
enrolled fresh. Dials are turned up at step 5 and back at the end.

1. **Enroll both.** `look <H>` from L's session, and `look <L>` from
   H's: each reads *in good flesh* in the body line — the line exists,
   and it is the species baseline.
2. **`assess`** as each: says the body-condition band in words, no
   number.
3. **The tape.** At the tailor, `measure figure` on H and on L records
   the same figures (same species, same mass) — the baseline for step 9.
4. **A fresh body cannot sustain a run.** H at the Terminus lane:
   `run` exit after exit; within a few exits the run *breaks to a walk*
   with a winded line, and endurance has fallen. `run` again is refused
   or drops to a walk until rested.
5. **Turn the season up.** A wizard sets the body-rate dials high
   (muscle gain/loss, `wind` half-life); the drive records the settings
   it changed.
6. **A season of work.** H at the Heart's Delight millsite: `mill`
   repeatedly (the quern holds the hands), then to the farmstead yard:
   `mow`, `plough`; each act costs endurance in proportion (the plough
   still costs what it cost), and between acts H rests to recover.
   L sits in the Lounge and does nothing but `eat` and `drink`.
7. **Heat.** H, wearing a coat, does one more shift at the smithy: a
   sweat line arrives during the work and hydration falls faster than
   the same shift without the coat; `remove coat` and repeat: no sweat
   line. (Requires build-4 merged; skipped with a named reason if not.)
8. **The mirror.** `look <H>` from L: *wiry* or *in good flesh, hard*;
   `look <L>` from H: *heavyset* or *running to fat*. Two different
   lines from one starting body, nothing authored.
9. **The tape again.** `measure figure` on H: *"you have moved since
   last time"* — the body changed mass and the book knows.
10. **Reach.** H `run`s the same lane as step 4 and holds it past where
    it broke; at the Ferrow winze, H `climb`s without the rest line. L
    tries the same run and breaks where H did in step 4.
11. **Fade.** H stops working and idles in-session for the dial's worth
    of active time; `run` breaks again. Then L's session and H's both
    log off; the dial's worth of *wall* time passes; log in: nothing has
    moved for either — absence is not taxed.
12. **Provisioning.** Turn the deficiency clock up. H eats nothing but
    bread for the dial's worth of active time: `assess` reports the
    early sign (bleeding gums, bruising); H `buy`s an orange at the
    Wharfside counter (it must be for sale), `eat orange`; over the next
    interval `assess` reports it clearing.
13. **Composition.** `look` at a wholemeal loaf and a white loaf from
    the same wheat: the label shows different amounts, and neither loaf
    row authored them.
14. **Turn the dials back.** The wizard restores every setting from
    step 5; the drive asserts they are restored.

---

## Acceptance criteria

Observable from outside the code.

- Looking at any person prints a body line in the stockman's register;
  looking at livestock prints exactly what it printed before.
- `assess` names the body-condition band in words and never a number;
  no verb, card or label shows a reserve, a BMI or a fitness figure to
  the person it describes.
- A hew, a plough and a smelt cost what they cost before; a mill, a
  knead, a hammer and a weave now cost *something*, in proportion to
  their work; a cart on wheels still hauls free.
- A fresh body's `run` breaks to a walk within a few exits; a body that
  has worked a (dialled) season holds it; a body that idles a (dialled)
  season loses it; a body that is *absent* for any length of time loses
  nothing.
- The climb at the winze reads differently for the conditioned body and
  the fresh one.
- Working in a coat produces a sweat line and costs more water than the
  same work without it; the same shift in cold air produces neither.
  (Conditional on build-4.)
- Two bodies of one species that spend a dialled season differently read
  differently to `look`, and the tailor's tape says the worked body has
  moved.
- A person can buy an orange somewhere a person can go.
- Bread alone for a dialled expedition produces a condition the
  physician can see; an orange resolves it.
- A wholemeal and a white loaf from one wheat show different nutrient
  amounts, and no loaf row authored an amount.
- The body-rate dials are visible in `config`, and turning them back
  restores the pre-drive figures.
- Alcohol tolerance fades on the active-play clock and not with absence.

---

## Cross-references

- Seeding: [nutrition-and-fitness-slate](../slates/builds/nutrition-and-fitness-slate.md).
- Consumed rulings: [mirror-slate](../slates/builds/mirror-slate.md)
  (the bridge) · [lineage-slate](../slates/builds/lineage-slate.md)
  (endowment, stature) · [metabolism-slate](../slates/tails/metabolism-slate.md)
  (scurvy's shape) · [capability-magic-slate](../slates/builds/capability-magic-slate.md)
  (strength = muscle, bounded conditioning) · [advancement-slate](../slates/builds/advancement-slate.md)
  (Law 2; the conditioning channel) · [physiology-slate](../slates/builds/physiology-slate.md)
  (tiers; the exertion read; the tissue-sum bug) · [cooking-slate](../slates/builds/cooking-slate.md)
  (keeps the galley; scurvy lands here).
- Subsystems: [metabolism](../subsystems/metabolism.md) ·
  [vitals](../subsystems/vitals.md) · [reserve](../subsystems/reserve.md)
  · [encumbrance](../subsystems/encumbrance.md) ·
  [locomotion](../subsystems/locomotion.md) ·
  [activity](../subsystems/activity.md) ·
  [advancement](../subsystems/advancement.md) ·
  [participation](../subsystems/participation.md) (the decay shape) ·
  [thermal](../subsystems/thermal.md) + [harm](../subsystems/harm.md)
  (build-4) · [textiles](../subsystems/textiles.md) ·
  [presentation](../subsystems/presentation.md) ·
  [ranching](../subsystems/ranching.md) (the band) ·
  [measurement](../measurement.md) · [design-lenses](../design-lenses.md).
- Slates to touch at the sweep: metabolism (strike scurvy + rates from
  Left), cooking (scurvy pointer), vitals + encumbrance (the exertion
  seam leaves Left), physiology (the exertion read is built),
  advancement (a second conditioning leaf), textiles/race (no change —
  stature stayed), campus-grounds + odometer + cooperative (one-line
  cross-refs), `docs/slates/README.md` (the index row).
- In flight: build-4 `design/harm-survey` (the function axis, the heat
  load) — merge first.
