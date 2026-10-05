# Wizardry curriculum slate — teaching the one subject whose answer key is the build

> **Status: UNBUILT.** The academic apparatus is designed but unbuilt
> ([college-slate.md](./college-slate.md)); the Discipline it would teach is
> designed but unbuilt ([wizardry-slate.md](./wizardry-slate.md)). What
> *ships* and makes this cheap: the generated reference layer (the
> `authorable` field metadata + `authorable-coverage.test.ts`,
> `author-surface.json`'s three tiers, the Studio's `describeClass` +
> 147 blueprints), the sandbox as a metered lab, and the shipped
> annotated exemplars (`hearts-delight`).
> **Left:** the kind-of-content intake · the eight topics of W101 as
> lessons · the exemplar set (one per kind) · the detail-density mirror ·
> the crit · the cohort · the token grant · the recursive `CourseNode` ·
> the Discipline's taxonomy nodes
> **Size:** **a build** for W101; the program is several.

**Captured 2026-10-04**, continuing the wizardry thread. The premise:

> **User: "the one thing that every student does walk in with (or should)
> is at least an idea. an idea of something they wish existed but didnt.
> the wizard course promises graduates the ability to change that fact for
> yourself."**

⭐⭐⭐ **Wizardry is the better first curriculum than arcana**, and not
because it is well documented. Because **the evaluator is the build**:
`lint:family`, `pnpm test`, and *does the row boot*. Every other subject's
answer key is a physics subsystem that somebody must keep honest;
wizardry's is kept correct for unrelated reasons and updates itself when
the engine changes — the one property
[college-slate](./college-slate.md)'s evaluator contract demands and the
hardest one to hold.

> ⚠ **Two different "firsts", and they must not collide.** Wizardry is
> the first curriculum for **the world**. **Magic 101 stays the first
> curriculum for the pitch** — its job is *here is your schema,
> populated, running*, and wizardry proves nothing about study.com's
> schema. Wizardry is not off-catalogue (what it teaches is systems
> analysis, schema literacy, writing for an audience, cost estimation),
> but it does not do the import demo.

---

## 1. ⭐⭐⭐ The admission ticket is an idea, so the first assessment is a classification

Not a quiz. **Classify your own idea into a kind of content**, because
that one judgment decides whether you are spending an afternoon or a
semester, and it is the judgment a new author gets wrong.

> ⚠⚠ The corpus has the monument to getting it wrong: **the Africa cabal
> does not exist.** Its only surviving record is a planning package in
> somebody else's sewer directory — a surface city map with sixteen
> labelled institutions, a 21-room sewer plan *"for aligning purposes"*,
> and **one room built.**

## 2. The seven kinds, with what it actually costs

| the idea attaches to | what you write | cost |
|---|---|---|
| **a moment** — *"the thing where the crowd parts"* | prose, one detail, maybe one affordance | ⭐ **hours** — the highest memorability per hour in the corpus |
| **a thing** — *"a pocket watch that…"* | a row; sometimes a composition | hours |
| **a place** — *"a lighthouse"* | location rows + zone + details + exits | days |
| **a person** — *"a rival who remembers me"* | `Cast` + dispositions + brains | days |
| **a venue** — *"a coffee shop"* | archetype + business + seat + offers | ⭐ **a week** (`timeguess`'s measured figure) |
| **a chain** — *"coffee grown, roasted, ground"* | a trade pack, mechanism | months, and probably a wizard |
| **a rule** — *"a guild that can fine you"* | law as content, an office | its own thing |

⭐⭐ **Point a first-week student at the top two rows.** They are where
*"I could never do that"* dies, and they are where the ancestor's
thirty-year reputation actually lives —
[eotl-craft.md](../../eotl-craft.md)'s frame says a **moment** costs *"one
good idea and the discipline not to explain it."*

⚠ **And the three kinds are remembered three ways**: moments verbatim,
systems by having done them, atmospheres as an unquotable feeling about a
place. ⚠⚠ *"We have built almost exclusively the third column."* W101
teaches atmospheres and moments. **Systems are upper division**, and they
are where the reputation came from.

## 3. The two columns — what is decided for you, and what you decide

`hearts-delight` is a working valley in **four row files**, and it is the
course's primary text because ⭐⭐⭐ **the rows are already written as
lessons.**

| decided for you | you decide |
|---|---|
| that it gets dark, and how dark (`ambientIntensity: 20000`) | the lamp's `seniority: 3` — *the first to stand cold when the oil runs short*, a values choice encoded as a number |
| the grammar — you set `register: definite` + keywords, `NounPhrase` does the six forms | the keywords: `[millsite, mill, wheel, weir, fall]` |
| time, weather, biome (`_biomePath`) | `coords` — **and why**: power is `ρ·g·Δh·Q·η`, the drop and the flow MULTIPLY, so a mill goes where the water **falls** |
| what a `Street` answers | the three props and one cast member it composes |
| the employment machinery — `call: rota`, the roster tick that relocates and covers | `wageRate: 4`, `hours: [5, 19]`, and that the miller's real income is **the toll in kind**, not the wage |
| species → body → vitals (`_speciesPath`) | `sociability: 40`, `composure: 50`, and three idle lines |
| competence bands | `asserting: proficient`, with `lint:dossiers` checking you claimed what the seat needs |

> ⭐ The millsite's own comment teaches the siting error **and** the second
> siting error (the Kestrel falls have no grain within a day of them — von
> Thünen). The miller's comment explains why millers have been
> structurally suspect for a thousand years *in every language that has a
> word for one*, "entirely because nobody can see the scoop" — which is
> why her idle animation levels the toll bin **in full view**.

⭐⭐ **So the lesson format is the annotated exemplar: read this row, then
make yours.** EotL never had one — its best design document belongs to
Culhaven, which is **560 rooms at 8% detail density.**

### The venue trace, checked against disk

*"I want to make a coffee shop"* is **rows only, today.** The material
`/trade/cooking/idea/material/coffee` exists with density, specific heat,
`tastes: [bitter]`, `waterActivity: 0.3`, `spoilActivationEnergy`. The
supply exists — a 5 kg jute `coffee-sack`, `gradeBand: fair`, in the
goods-yard pantry with `censusKey: pantry:coffee` and `regionTarget: 4`.
The recipe exists (0.25 L, `discipline: bartending`, into a mug). It is
**already on the lounge's menu at price 3**.

What the author actually decides, and these are the interesting ones:

1. ⚠ **Is a café a bar or a shop?** There is no `cafe` archetype.
   `hospitality` has 14 capability slots, `shop` has four. A café wants
   heat + water + surface + seating + counter and none of the shaking.
   **Authoring a third archetype row is the right answer and needs no
   code** — and an archetype is *reported, never enforced*, so a missing
   slot leaves you incomplete rather than refused.
2. ⚠ **The barista is diegetically a bartender** — `discipline:
   bartending` is what the recipe requires.
3. ⚠ **The bean and the brew are one material.** The sack says *"roasted
   coffee, still warm-smelling"*; the material is tagged `liquid,
   beverage, drinkable` at water's specific heat. ⭐ A judgment call
   visible in a row whose own comment admits it (*"the brew is a
   hearth's"*) — **a defect you can see, argue about, and fix without
   writing code**, which makes it the best teaching artifact in the tree.
4. ⭐ **Where the line is:** green bean → roast → grind as a real supply
   chain is a trade pack, not rows. **That boundary is lens 2's test** —
   the ordinary case with no code, the bespoke case without breaking —
   and locating it is most of what separates a wizard from somebody
   filing requests.

## 4. The capability tiering — lead with the shared infra

⭐⭐⭐ **An author never picks a mixin.** Composing mixins is a TypeScript
act. What an author picks is a **class**, and the class arrives with its
stack — `class: /platform/thing/Tool` is one line that inherits
`CraftedMixin(ToolMixin(DurableMixin(Good)))`. So a mixin matters as the
answer to exactly two questions: **what may I set, and what will it
answer?** Which is why the ranking is possible: of **178** registry
entries, ~45 appear in work anyone will do.

| tier | ~n | members |
|---|---|---|
| **0 — you get these whether you know it or not** | 10 | `Named` · `Visible` · **`Detailed`** · `Perceptible` · `Propertied` · `Container`/`Containable` · `Placing` · `Tangible` |
| **1 — place** | 10 | `Exitable` · `DoorBearing` · `Sealable`/`Lockable`/`Switchable` · `AmbientLit` · `LightSource` · `Addressable` · `SkyExposed` · `Atmospheric` · `Floor`/`GroundSource` · `Fixture` · `Adornable` |
| **2 — people** | 12 | `Cast` · `Organism` · `Vitals` · `Slotted`/`Attired`/`Wearable`/`Wieldable` · `Postured`/`Posed` · `Behaved` · `Dispositioned` · `Advancement` · `Staged`/`Costumed` · `BeliefStore` |
| **3 — commerce** | 12 | `Business` · `Employed` · `Attendant` · `PricedOffer` · `ConsignmentShelf`/`HeldGoodsShelf` · `Stackable` · `Bank` · `CredentialWallet` · `Organization` · `Chattel` · `Estate` |
| **4 — the craft chain** | 20 | `Tool` · `Crafted` · `Durable` · `Graded` · `Keen` · `ManualBuild` · `Bulkable` · `VesselKind` · `Serviceable` · `Cutlery` · `Composed` · `Comminuting` · `Steepable` · `Thermal` · `Fresh` · `WaterActive` · `Contaminable` · `Palatable` · `NutritionLabel` · `Maturing` |
| **5 — the specialties** | ~115 | `Radioactive` · `Alloyed` · `Meltable` · `Feeder` · `Soil` · `Cultivable` · `Hazard` · `Hiding` · `Disguisable` · `Combatant` · `Respiration` · `Metabolic` · `Exerting` · `Mountable`/`Drivable` · `Haulable` · `Scryable` · `Forkable` · `Publisher` · `Registrar` · `Forums` · `Aether` … |

- ⭐ **Tier 0 is where quality lives** — `Detailed` is the only measurable
  craft signal in 45,000 files (§ 7).
- ⭐⭐ **Tier 3 is where the labour savings live.** `timeguess` priced 18
  shops at 4.5 of 9 months, *"a week apiece, which includes coding up the
  items to be sold"* — tier 3 is the whole of that sentence.
- ⭐ **Tier 5's lesson is not to learn it.** Know it exists and look it
  up. That is the teachability doc's category B, where enactment fails and
  reference wins.

## 5. ⭐⭐⭐ The class is not the noun — the first reflex to break

> **In EotL one noun was one file.** That is why there are **19,703 room
> files** and ~2,750 thing files: the file *was* the object.
>
> **Here, one capability set is one class, and nouns are rows.**

A flask, a vial and a phial are **one composition and three rows**;
`NounPhrase` + keywords carry the name. An author who brings the
file-is-the-object reflex will mint a class per noun and blow the
taxonomy up in a week.

⭐ **The lesson compresses to one sentence: your idea is almost always a
row.** See [object-taxonomy-slate.md](./object-taxonomy-slate.md) for the
mechanism side.

## 6. Teach by substitution — the reflex they arrive with

⭐⭐⭐ The organising question is not *"what do we have to teach"* but
**"what will they reach for that we have taken away, and what is the
answer?"** The census is brutal here: **4,472 files add a bespoke verb**
— more files than there are monsters — and every memorable mechanic in
the corpus is a hand-rolled verb (`push eyes` · `om ma ni pay me hung` ·
`fantasize` · `say the answer is` · `buy X to go`). Verb conferral is
retired on purpose. ⚠ **Hitting that wall without an answer is how an
area ends up 41% hollow.**

| their reflex | our answer |
|---|---|
| `add_action` — mint a verb | the collision ladder (unify behind an interface · reafford · subcommands · `keyword::verb`), and **the instrument affords the verb, not the furniture** |
| `set("descs", keyword→prose)` | `Detailed` — ⭐ the one reflex that transfers nearly 1:1, so teach it early as the bridge |
| `day_long` + `night_long` + two light levels per room | zone field inheritance over real time/weather/light. ⚠ **A strict upgrade that will feel like a loss** — they give up authoring the exact night sentence, and that must be sold, not announced |
| `MonsterCode` + `set_chat` | `Cast`/`Extra`, brains, dialogue — ⭐ and teach **the ask**, since only 5% of their NPCs could be asked anything |
| `ArmorCode` with a number on it | materials × construction × response grids; layered armour emerges |
| a shop, a week apiece | tier 3 |
| a quest | they wrote **48 in 45,380 files**. The census says they did not need them |
| a transit fiction to justify an off-genre area | ⭐ **the Smurf probe** — build it from materials, construction, textiles, employment and a locality, or admit the models do not reach |

⭐ **And the audience problem resolves itself.** EotL authors *were*
programmers — LPC, every room a program. The 2026 cohort is bimodal.
**Gating TypeScript collapses them into one audience**, because
composition is the answer for both: the coder unlearns `add_action`, the
non-coder never learns it. Same course.

## 7. ⭐⭐⭐ The rubric is measured, not invented

Better than one we would write, and it corrects an earlier overreach of
mine — **the lenses are what a crit scores; they are not what a course
teaches.** The lenses are upper division. The rubric for W101 comes off
the corpus:

- ⭐⭐⭐ **Detail density is the only reliable completeness signal in
  45,000 files** — *in every case the unfinished room is the one with an
  empty or absent detail map* — and the right use is **a mirror, not a
  gate**: *you have authored 560 rooms; 46 have anything to examine.*
  That is `measurement.md`'s Mara/Aletheia property, and it is the
  course's progress instrument.
- ⚠ **Unevenness is within an author, not between them.** The same
  author, the same week, wrote the tanned-leather box seats and *"This is
  a standard room. There are a couple tables and chairs to sit on."* So
  the rubric applies **per room**, and the lesson is about finishing, not
  talent.
- ⚠⚠ **The checklist city.** Mean pairwise institution overlap **0.39**;
  they derived their building list by looking at each other. Gnomelands is
  memorable partly because **you cannot buy armour there.** ⭐ *So
  distinctiveness is subtraction* — and ⚠⚠ the hazard is ours:
  `settlement-model.md`'s sixteen needs are a demand model that **our own
  map entry calls "also the archetype list."** Taught as a building list,
  our doc reproduces the failure faster and more uniformly than imitation
  ever did.
- ⭐ **The connective tissue rots first.** The graph between content had
  no owner and no artifact; Entesia's entire charter was restoration.
  Teach the boundary manifest.
- ⭐⭐ **The status file.** Not one inflated estimate in the corpus,
  *because they were written sideways to the two or three people who would
  inherit the work.* That is the shape for the declared-intents record —
  it lives in the content directory, and it is honest precisely because
  nobody could reward or punish it. See
  [labor-standing-slate.md](./labor-standing-slate.md) § 9a.

## 8. ⭐⭐⭐ The textbook is generated — the real reason this is cheap

Three artifacts ship:

1. **The authorable field metadata** — `authorable: true` on a mixin's
   `fieldMeta` (e.g. `ToolMixin`'s `capabilities` and `epoch`), ~360
   fields across 102 mixin files + 65 platform classes, with
   `authorable-coverage.test.ts` as the tripwire. **A field cannot ship
   unclassified.**
2. **`author-surface.json`'s three tiers** — `callable == visible ==
   cared-about`, so *"what is in the Api layer"* is a generated list, not
   prose.
3. **The Studio** — `describeClass` renders any class's effective mixin
   set as a form of exactly its authorable fields, over 147 blueprints.

> ⭐⭐⭐ So *"the course cites, it never restates"* has unusual force here:
> **the reference layer regenerates when the engine changes, and the
> coverage test means it cannot silently fall behind.** We author
> sequence, objectives and exercises. Nothing else. **That is why this
> course is cheap and Magic 101 is not.**

## 9. One course: W101 — Build a Place

⚠ A curriculum organised by **subsystem** is a manual wearing a course's
clothes. Organised by **the thing you are making** it is a studio course
— which is how these authors actually worked, incrementally on one area
for months. Eight topics, each a layer of one place you keep returning
to, every lesson ending with *your* place changed. That lands on
study.com's own sizing (~8 nodes × 5–8 lessons, 5–10 min each).

1. **A room that exists** — paths, the five namespace axes, `class:`, the
   row boots. ⭐ 100% machine-graded, zero marginal cost.
2. **A room worth standing in** — voice repeats nouns, atmosphere repeats
   adjectives; describe-then-wonder; specify by household object; the
   detail chain. Graded on detail density.
3. **Two rooms and the way between** — exits, doors, *the obvious exit is
   the wrong one*.
4. **Light and time** — the zone, field inheritance, why you do not write
   night prose. ⚠ The pitch-black-interior trap, whose tell is every
   object reading *"something"*.
5. **Things in it** — composition over new classes (§ 5).
6. **Somebody there** — `Cast`/`Extra`, the handle chain, chatter vs
   dialogue, **the ask**.
7. **A shop** — ⭐ the expensive unit made cheap. The topic that repays
   the course.
8. **What you did not get to mint** — the collision ladder, the Smurf
   probe, the boundary manifest, the status file.

**Capstone:** a place somebody else walks through, with a refrain held
across all of it — *144 rooms that all say blanket of heat.*

### The program above it

study.com's own top tier is literally **`Program`**, so wizardry is a
program and W101 is one course in it. ⭐⭐⭐ **Order the rest by who can
grade it** — 101 fully machine-graded, the middle mixed, the top pure
crit, the capstone graded by reception over time. That is not tidiness:
**it is the cost curve.** Thousands take 101 for free; only the few who
reach the top consume human or model judgment, and the enrolment funnel
and the spend curve are the same shape.

Above the place course: **systems** (the second column we have no doctrine
for), **the crit** (the lenses + `eotl-craft`'s fourteen techniques and
seven failure modes — ⭐ whose reading list is **the corrections**, every
`⚠` in the tree being a documented case of a competent person being
confidently wrong, with the error, the fix and the reason, which is the
item generator's misconception bank **already populated**), and a pack
that ships. ⚠ **There is no TypeScript anywhere in the program** — which
is what makes the ladder honest and the gate at the top honest too.

## 10. study.com — the structure, and three corrections

⚠ **`platform-reality.md` wins by its own declaration** (verified against
the live stage DB; *"where any design doc conflicts with this one, this
one wins"*).

**The stored hierarchy is `Program → Course → Topic → Lesson`, and
"chapter" is not an entity** — it is a derived display index,
`Topic.getChapterNumber()`. The CX product presents a **unit** tier that
no doc mentions; the tree is a single self-referential
`Academy_Asset_Tree`, so Topics plausibly nest and *unit* is the outer
one. ⚑ Worth confirming, but:

> ⭐⭐⭐ **Do not resolve it — make our model immune.** One ordered,
> recursive `CourseNode` that may contain nodes or lessons, **with
> assessment attachable to any node.** Then *assessment at different
> layers* (lesson quiz → chapter test → unit test → practice final →
> proctored final) needs zero tier-specific code, and however
> unit/chapter resolves it costs us nothing. Their own assessment
> containers are already this shape: `QuestionBank → Quiz`,
> `ExamTemplate / Section / Page`, `Exam_Instance` with an
> `AlgorithmType`, `Proctored_Exam`.

⛔ **[college-slate](./college-slate.md)'s "load-bearing decision" is
stale** — it commits to adopting *course → chapter → lesson* "field for
field" and names a tier that does not exist. Recursive node is both the
fix and strictly more faithful.

Three more that change what we build:

- ⛔ **There is no learning-objective entity.** Zero hits for `objective`
  in `academy-services`; the tag is a `Concept` or `ExamTaxonomyNode` id.
  So **items tag to a Discipline node on our side and the crosswalk is
  proprietary-adapter work.** For wizardry this is free: the Discipline
  graph is ours, so wizardry's nodes are ours to define.
- ⭐⭐ **The crit and the viva already have sockets on their side.**
  `Question.Type` has ~20 values: `ESSAY` with an authored **`llmRubric`**
  (LLM-graded), **`AI_MASTERY`** as multi-step `LLM_CHAT /
  USER_MULTIPLE_CHOICE / USER_CONFIRMATION / USER_TEXT`, and
  `GradableCourseProject` — and **all of those live on the CX side**, plus
  `Question_Passage.case_study` with authored progressive reveal
  (`case-reveal="N"`). The classroom is not foreign to their product; it
  is their newest surface with a world behind it.
- **Lessons are already dual-register** — a Wistia video *plus* a full
  text transcript *plus* longform text. Our text client renders their
  lesson natively, no adapter.

⭐ **And the teachability verdict is the strongest available.** The three
modes are *direct enactment · allegory · reference*, and **wizardry is
the only subject where the "real mechanism the sim models honestly" is the
sim itself** — no allegory needed, no reference tier, no sensorimotor
layer out of reach.

## 11. The virtual classroom — two things, not a room

⚠ **Do not build a room-and-bell simulator.** The lecture hall is nearly
free (the watch embed ships) and teaches us nothing. Build **the cohort**
and **the crit**, because they are what a content library structurally
cannot do, they deliver the social layer the strategy doc names as
study.com's gap, and **they are the measurement wizardry needs** (the
Discipline slate's open Q2: the band must derive from reception or it is a
churn metric). ⭐ **For this course the build order inverts: assessment
first, room last.**

⭐⭐ **Wizardry is a studio discipline — architecture school, not
physics** — so the dominant mode is the **crit**: your work on the wall,
against a rubric, judged by a master and your peers. `college-slate`
already nominates the viva as the mode *"structurally impossible for a
content library and the most human-feeling in the set"*; here it is not an
exotic extra, it is the main event.

| academic thing | what it actually is |
|---|---|
| the reading | `docs/` — ⭐ the one corpus guaranteed current, because stale docs break builds |
| the lab | ⭐ **the sandbox**, shipped and isolated — and the finding that the sandbox needs *tighter* resource limits than prod is exactly a student bench being metered |
| homework | a template that boots. Engine-graded, pass/fail |
| applied hours | `authoring_events` — the deed mode, from work you would do anyway |
| lesson one | ⭐ already designed — [onboarding-slate](./onboarding-slate.md)'s "authoring climax", the dorm customisation on-ramp, with Dr. Limen already a model-backed brain on campus |

### ⭐⭐⭐ The four roles, and the allocation rule

> **Spend tokens where being wrong is in character.**

- **The student — NPC, and the one to lead with.** A student's job is to
  be confused, so error is *diegetic*; it is the cheapest model role. It
  solves cold start (a class of one is not a class) and ⭐ a cohort who
  actually *use* your work and can be wrong about it is an honest
  reception signal that is not a popularity contest.
- **The TA — ⭐ a mode cartridge.** Not a second thing:
  [automata-slate](./automata-slate.md) already has modes as slotted
  `Slottable` Ideas, and mode cartridges are already named as an
  intermediate good in the wizard supply chain. The university ships a
  tutor cartridge, issued on enrolment. ⚠ And it attaches to **the
  student** — an automaton sees exactly what its own player sees, so a
  general-purpose TA looking over other students' shoulders is not the
  shape; attaching it to the student makes the asymmetry problem vanish.
- **The examiner — never the model.** Deterministic, and for wizardry it
  *can* be. ⛔ **The automaton is a tutor, never the examiner.**
- **The master — a player, or an office.** Judgment plus accountability.

### The money, which is already solved

⛔ **Art. I §2 kills a per-student tutor** — a paying student with a
conversational TA against a free student with a canned tree is bought
advantage, unamendable. The inversion is already settled: **a patron funds
the role; it is articulate for everyone.** Plus the **parity floor** —
everything the model can say must be reachable through the deterministic
path — and `automata-slate`'s *capability gates modes, it does not dim
them*, so the unfunded get **no tutor**, not a worse one.

⭐⭐ Which lands in the scarcity design with no new machinery: **a course
is a budget holder.** It takes a grant on the `tokens` line in one of the
three forms, the section spends it, and the university becomes a real
institution competing for tokens against NPC speech and the automata.

## 12. The lens pass

**⭐⭐⭐ 1 — pedagogy.** The strongest limb, and § 10's teachability
verdict is the reason: the referent and the apparatus are the same object.
Derivable from ledgers that already exist (`authoring_events`, reception).

**⭐⭐ 2 — expression.** The course's entire promise is *the thing you
wished existed, you can make*. ⚠ Risk: a measured practice becomes an
optimised practice — mitigated only by the mirror-not-gate rule (§ 7).

**⚠ 3a — immersion.** A classroom about authoring is the meta-layer at
its most exposed. ⛔ And it is where **§ 7.1 of the Discipline slate
breaks**: a classroom is exactly where someone will teach thaumology and
wizardry as one subject. **They are separate departments.**

**⭐ 3b — participation.** *The world has an author-shaped hole*; a course
is how you advertise the vacancy.

**⚠ 4 — values.** The grading institution and the licence-admitting
institution must not be the same one (§ 13.2). And the detail-density
mirror is a gauge converting an undecidable (*is this good?*) into a
calculable (*is this finished?*) — ⚠ **honest only while it stays a
mirror.**

**⭐⭐ 5 — continuity.** Epoch-invariant by nature: wizardry is about the
substrate, not the world.

**⭐⭐ 6 — economy.** The course's graduates relieve the actual bottleneck,
and ⭐ **the coursework output is content** — contribution-as-coursework
stops being a Wiki-Education analogy and becomes the economics.

**⚠ 7 — governance.** A competence band judges a person: name the
criterion (the rubric), the appeal (`chronicle`'s deed vs claim), the
entrenchment tier. All three have homes; none is written.

## 13. Open questions

1. ⭐⭐⭐ **Write the rubric first** — unchanged from
   [wizardry-slate](./wizardry-slate.md) § 2, and now load-bearing twice:
   the Discipline's defensibility *and* the crit syllabus. One document,
   two jobs.
2. ⚠ **Who admits to the apex?** If the university teaches the course
   *and* admits to the licence that gates the substrate, that is capture.
   ⭐ Lean: **the university grades, an office admits, the chronicle is
   the appeal** — how every licensed profession works.
3. **Is the detail-density mirror a course instrument only, or the same
   instrument the Discipline band later reads?** If both, the firewall
   between *what the craft says* and *what the polity thinks* runs through
   one number.
4. **Does the `cafe` archetype get authored as course content?** ⭐ Lean
   yes — the single best first assignment in the curriculum, and it ships
   something real.
5. **The bean/brew conflation** — fix it, or preserve it as the teaching
   case? (Cannot be both.)
6. ⚑ **Is CX's unit tier stored or derived?** Idle curiosity if we go
   recursive; it decides how we talk to them.
7. **Do wizardry's Discipline taxonomy nodes get defined now?** Items
   must tag somewhere (§ 10).
8. **Does W101 stay fully deterministic for v1**, or get
   `AI_MASTERY`-shaped activities from the start, since that is where
   their CX already is?

## Cross-refs

- [college-slate.md](./college-slate.md) — the academic apparatus. ⛔ Its
  taxonomy decision is corrected here (§ 10).
- [wizardry-slate.md](./wizardry-slate.md) — the Discipline this teaches.
- [object-taxonomy-slate.md](./object-taxonomy-slate.md) — the mechanism
  half of § 5: naming, collapse, and what a non-wizard may mint.
- [eternal-university-slate.md](./eternal-university-slate.md) — the
  campus this furnishes.
- [automata-slate.md](./automata-slate.md) — the TA, as a mode cartridge.
- [../../eotl-craft.md](../../eotl-craft.md) +
  [../../eotl-census.md](../../eotl-census.md) — ⭐⭐⭐ the reference the
  whole slate judges against.
- [../../study-com/platform-reality.md](../../study-com/platform-reality.md)
  — verified ground truth; it wins over every other study.com doc.
- [../../study-com/teachability-boundary.md](../../study-com/teachability-boundary.md)
  — the three modes, and why wizardry is mode 1.
- [../../design-lenses.md](../../design-lenses.md) +
  [../../measurement.md](../../measurement.md) — the crit's rubric, and
  the mirror rule.
