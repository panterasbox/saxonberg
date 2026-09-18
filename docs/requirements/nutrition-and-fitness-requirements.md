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
⭐ Widened 2026-09-18 after the pedagogy pass: **the gym is in scope as
an archetype** — one set of semantics a home gym, an office gym, an
apartment gym and a public one all share — with devices as rows over
the one exertion producer. Fitness is *active*, and that changes the
player surface; nutrition stays mostly passive.

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
figure nothing ever sets; ⚠ **nothing composes climbing either** — the
winze at Ferrow *describes* a ladder and has no `down` exit, so `climb`
has never been reachable (corrected at plan time; the survey had
counted it) — and **no location in any pack can be swum** — the estuary
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
- **A routine trains what its shape trains.** Exertion has two numbers
  — effort and duration — and the two things a body can train read them
  differently: muscle grows only when the load exceeds what the body
  can already produce (overload); wind grows on duration at a pace you
  can hold. A haul is short and heavy; a run is long and light; rowing
  is both. Nothing is authored per routine; the physiology is the
  routine table.
- **A gym is a place where you choose the load.** The world's work sets
  its own load — a sack weighs what it weighs, and once you outgrow it
  the mill stops making you stronger. A gym device is a row whose one
  affordance is a load or a pace *in the player's hands*. There is one
  `gym` archetype, and a room is a gym to the degree it meets its needs:
  a bar in a dorm room, a rack in an office, a hall full of machines
  are the same semantics with different slots filled — zero code per
  variant.
- **Gym devices are made things.** A bar is a smith's iron; a bench is
  carpentry. Equipment enters the crafting economy on day one — one
  exemplar shipped by a trade that already exists.
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
- **The gym as a business past the door** — membership as a standing
  term, the trainer as a service vocation, the group class → the
  business ladder / [credential](../subsystems/credential.md) (a
  membership is a credential kind), [vocations.md](../vocations.md) (the
  trainer sells *which load* — knowledge, which is why `sports` sits on
  that channel), and the scripting seam (a written routine is a script
  over device verbs — the trainer's product, later). Charging at the
  door rides the shipped room tariff and needs nothing.
- **Supplements and the diet-plan industry** → content over the shipped
  kind vocabulary: a protein shake is a bulk with amounts; a snake-oil
  powder is a branded thing whose label says less than its mark claims
  — the honest-label lesson, the corpo/brand substrate's, not this
  build's.
- **A third body axis (flexibility, mobility)** → nowhere, deliberately
  — expression is inelastic; two stocks and one conditioning Discipline
  are what the engine honestly measures. Yoga is authorable as a
  low-load, long-duration routine today; what it distinctively trains
  is either unmodelled (flexibility) or the mind slate's (composure).
- **Martial arts as a discipline** → combat's: a dojo is the gym
  archetype with a mat and a bag in its slots, and a bout on the mat
  credits `melee-combat` (skill) the way any exchange does, plus wind
  and muscle like any exertion. No new mechanism; the consequence
  slate's "contusion as sparring currency" already prices the bout.
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
`starvation` and `emaciation`. The **`gym` archetype** is a platform
archetype document (the byre/hospitality shape: needs stated as
capabilities a fixture can meet, reported never enforced); its two
device families — something you **load** and something you **sustain**
— are the capability kinds it mints, and a device row declares which it
offers and the range it allows. The exemplar device and its recipe ship
with the trade that makes it.

⭐ **The second-instance test:** a second gym — a home gym, an office
gym — is a room whose fixtures meet the archetype's slots, zero code; a
second device is a row with a load profile and the verb it confers; a
second trade whose work should tire
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
- **The residences and the furnishing rules** — a bar `place`d in a
  dorm room is the home gym; the estate slice persists it, the room
  overlay shows it, and the archetype reads the room as meeting its
  load slot. The four furnishing archetypes and the room class are
  untouched; `gym` is one more archetype document. **Campus grounds**
  (unbuilt) still owns the athletic field as `sports`' venue; a hall of
  machines is a gym, a running track is not.
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
choices — and a badge for time is the named failure. Where a rung is a
verb the body already has (`run`, `climb`, a shift), reach is the body
deciding whether you can sustain it; where it is a verb you did not
have (the swim), it is the Discipline's band-gated conferral. Same
reward, two doors.
**The first ladder** (content on the row; chosen so the drive can prove
each): **the sustained `run`** — a fresh body's run breaks to a walk
after a few exits, winded, and a conditioned one holds; **the climb
without the rest** — the winze ladder; **the double shift** — a second
durative act back-to-back without the endurance floor refusing. The swim
is authored when there is water.
**Decay.** `wind` fades on the **active-play clock** — advancement's
Law 2 (*never tax absence*) and metabolism's deficiency precedent. Lay
off while playing and the band falls; log off for a month and nothing
moves. `alcohol-tolerance` fades the same way and becomes true. *(How
the band is derived — a fold over the ledger or a read over a body
stock — is the plan's; the plan chose the stock, 2026-09-18.)*
**Who says so.** Nobody. Fitness is private; sport confers standing and
is another build's.

### A routine is its shape; a device is a load you choose

**Question.** Cardio vs weights — do different routines train at
different rates, and does the game need a routine table?
**Answer.** Two readers over one event, no table. Muscle reads
**intensity against the body's own ceiling** (overload — a load that no
longer exceeds what you can produce stops training you); wind reads
**duration at a sustainable pace**. So routines differ because their
shapes differ, and the *only* thing a gym adds to the world's work is
that the load and the pace are the player's to set.
**Devices.** Two families, matching the two readers: something you
**load** (a bar: `lift <load>`, the load an argument within the row's
range) and something you **sustain** (a rower, a wheel — and the
treadmill, which is honestly the run that goes nowhere, and says so).
Each row confers its verb, as every instrument does. The infomercial
machine is welcome: it is a row claiming a profile, and the cooking
slate's **unitasker test** decides whether the profile is one nothing
else gives — and a machine whose profile equals a walk is content too,
because it teaches what the advert hides.
**Reasoning.** Lens 1: overload and aerobic threshold are the two real
principles of exercise physiology, and both are derivable from numbers
the event already carries. Lens 2: the maze of machinery is rows over
one producer, and a joke machine costs nothing to author. Lens 6: the
gym's price is the wage foregone; its device is a crafted good.

### One archetype, every gym

**Question.** Home gym, office gym, apartment gym, public gym, dojo,
studio — how many kinds?
**Answer.** One archetype, `gym`, whose slots are the two device
families (and a surface to do it on); a room is a gym to the degree it
fills them. The variants are *which slots a room fills and who owns the
room*, never a second archetype. A dojo is the same archetype with a
mat and a bag; a studio is one with a mat and nothing to load.
**Reasoning.** The byre precedent — needs stated as capabilities,
reported never enforced, a mixed holding satisfying two archetypes at
once. Practices (martial arts, yoga) are *routines* — a shape and the
Disciplines it credits — not places, and the Disciplines they credit
already exist or are deliberately absent (non-goals).

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
6. **Economy.** *Produces:* labour capacity — the double shift is more
   output, fitness is the labourer's capital; and crafted goods (the
   bar, the bench). *Consumes:* time above all — the gym's price is the
   wage foregone, the miner never pays it, the clerk does; and food,
   **differentiated** — muscle eats protein, wind eats carbohydrate, so
   the hauler's basket is not the clerk's, which is the demand the
   butcher and the dairy were waiting on. *Who pays:* time, or money at
   a gym's door (the shipped tariff), never standing. *Was the demand
   there:* yes — reach is a want nobody is obliged to have, and the
   sedentary vocations (banker, clerk, author, wizard) already exist.
   **Gap recorded:** the trained body's protein demand has no dairy to
   meet it until ranching's next phase; bread and eggs carry it until
   then.

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
6b. **The load you choose.** After the season, H `mill`s again: the
   physician's band does not move — the sack no longer overloads a
   body that has outgrown it. H `place`s a bar (one the smithy made —
   the drive `forge`s it, or buys it at the counter) in their dorm
   room; the room reports itself as meeting the gym's load slot.
   `lift 60`: the muscle figure moves again. `lift 200`: refused as
   beyond the row's range or beyond the body, with an honest line.
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
- A bar placed in any room makes that room meet the `gym` archetype's
  load slot, with no code and no second archetype; a room with a mat
  and a bag reads the same way.
- A body that has outgrown the world's load stops gaining muscle from
  it and gains again on a device at a chosen heavier load; a body on a
  sustained device gains wind and not muscle.
- The exemplar device is made by a shipped trade and priced at the
  counter.
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
- Lens 6 (economy) added to [design-lenses.md](../design-lenses.md)
  with this build as its worked example.
- Subsystems: [furnishing](../subsystems/furnishing.md) (archetypes,
  `place`, the room overlay) ·
  [content-packs](../subsystems/content-packs.md) (the `archetype`
  document kind) · [crafting](../subsystems/crafting.md) (the exemplar
  device's recipe) · [metabolism](../subsystems/metabolism.md) ·
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
