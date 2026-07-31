# Health vertical slate — clinical practice, public health, teaching

> **Status: design captured 2026-07-31, not built.** The **vertical** that sits
> on top of [disease](./disease-slate.md) and [harm](../../subsystems/harm.md) —
> clinical assessment, diagnosis, treatment, prevention, and public health,
> across **people and animals both**. Its own doc because it spans four layers
> that no single existing slate owns: the **engine** (disease/harm), the
> **institutions** (a government department + the College of Physic), the **demo
> set** (the aid post, the health-cohort cut), and the **teaching seam** (the
> external-mastery credential).
>
> **The one-line differentiator:** in every prior game the healer's question is
> *"how much healing do I apply?"* — **ours is "what is wrong with them?"**
>
> This is a commercially load-bearing vertical (health is a large academic
> field, and its graduates go into far more than bedside nursing), so
> **accuracy here is doubly load-bearing.** Nothing in this doc should overclaim
> what the game teaches or what a credential means.

See also — the engine: [disease-slate](./disease-slate.md) (**read first** — the
burden-that-grows model, `ContagionSpec`, host range, husbandry-as-immunity) ·
[harm.md](../../subsystems/harm.md) (`ConditionApi`, the five trauma behaviors,
the medic vertical as shipped) · [vitals.md](../../subsystems/vitals.md) ·
[metabolism.md](../../subsystems/metabolism.md). Institutions:
[guild-slate](./guild-slate.md) (**the College of Physic** — its demand anchor
already names *polity public-health paper*) ·
[civics.md](../../subsystems/civics.md) (departments as Businesses under a
Government) · [stewardship-slate](./stewardship-slate.md) (quarantine is a
land-use power). Stage + pedagogy: [demo-slate](./demo-slate.md) (**the aid
post** — "the wishbook's clinical daily loop made real"; the health-cohort cut)
· [eternal-university-slate](./eternal-university-slate.md) ("a nursing
scenario" as a named vertical the un-genre campus hosts) ·
[farming-slate](./farming-slate.md) (§ *The University & the external-mastery
seam* — the credential design this vertical is the best fit for) ·
[advancement.md](../../subsystems/advancement.md) (the `medicine` Discipline,
shipped).

---

## The differentiator

The prior art is remarkably consistent, and the pattern is worth stating plainly
before designing against it:

| Game | What the healer actually does |
|---|---|
| D&D cleric · FF white mage | cast Cure. Health is a number |
| MMO healer (WoW et al.) | throughput + target priority under time pressure — genuinely skilled, but it is numbers management |
| TF2 Medic | a beam and an ubercharge; a positioning game |
| Trauma Center · Surgeon Simulator | surgery as a dexterity minigame |
| Darkest Dungeon | closer — real afflictions, stress, camping |
| Escape from Tarkov | genuinely good — limb-specific injury, different items for different wounds |
| Dwarf Fortress | the deepest simulation by far — but you **manage** doctors, you are never one |

> **In every one of them, healing is a *resource* to apply. Here it is a
> *practice* — and the practice begins with not knowing what's wrong.**

We do not have to build toward that. It falls out of conventions this project
already committed to for other reasons.

---

## The clinical-reasoning trainer we built by accident

Three shipped decisions combine into one:

1. **Honest opacity** — no gauges; you read the world, not a stat.
2. **`observableSigns`** — every `Condition` already carries prose signs
   (`[nauseous, cramping, sweating]`).
3. **A catalog with overlapping signs** — **eleven authored conditions ship
   today**: hyperthermia, hypothermia, torpor, asphyxiation, starvation,
   ptomaine, lead, venom, alcohol, dread, overchannel-strain.

> **Differential diagnosis therefore *emerges* rather than being scripted.**
> Flushed, sweating and disoriented is consistent with hyperthermia, with a
> toxin burden, and (once disease lands) with an infection. Separating them
> takes more signs, a history, or an instrument.

That is the thing scripted clinical sims structurally cannot do, because their
scenarios have one correct answer fixed in advance. Ours has a **simulated
patient whose state derives from a model**, so the reasoning is real even when
the case is unremarkable.

**The anti-wiki rule carries over verbatim from farming:** knowing influenza's
sign set never tells you that *this patient* has it. Knowledge is portable; the
assessment is not skippable.

---

## The chain of infection is already our schema

The six-link **chain of infection** is taught in every infection-control course.
[disease-slate](./disease-slate.md)'s `ContagionSpec` was derived from how
transmission actually works — and so it lands on the same six links, which is
convergence rather than coincidence:

| Chain-of-infection link | Our field |
|---|---|
| Infectious agent | the affliction template (Kind A `Idea`) |
| Reservoir | `reservoir` |
| Portal of exit | `infectiousWindow` — when the host sheds |
| Mode of transmission | `routes` |
| Portal of entry | the route's receiving door (ingest / inhale / contact) |
| Susceptible host | `hostRange` + the **live** immunity factor |

**The interventions map too** — sanitation breaks transmission, barriers block
portals, **isolation is our closed-door firebreak**, and husbandry-as-immunity
is host susceptibility. Breaking the chain in-game is breaking the actual
framework.

---

## The loop, and why it travels past nursing

The nursing process is **assess → diagnose → plan → implement → evaluate**. It
travels because it is a general structure for **acting under uncertainty on
incomplete observation** — the scientific method with a deadline.

The game's loop *is* that loop: observe signs → hypothesise → gather more
(instrument, history) → intervene → evaluate whether it worked. Which is the
same shape [farming](./farming-slate.md) teaches with soil and
[ranching](./ranching-slate.md) teaches with body condition.

> **The transferable skill is not "nursing." It is structured diagnostic
> reasoning under uncertainty** — which is why the vertical reaches paramedic,
> lab, public health, health administration, and honestly any diagnostic
> profession.

*(Care with the vocabulary: "nursing diagnosis" is a term of art distinct from
medical diagnosis. This slate models **clinical reasoning**, and should not
claim to model either credentialing framework specifically.)*

### The veterinary track is free

[disease-slate](./disease-slate.md) designs disease **across species**, with
`hostRange` as the axis. So the same reasoning loop runs on a cow, a dog, and a
person, and the differences are real ones — different signs, different normal
ranges, a patient that cannot report symptoms.

**No other game runs human and animal medicine on one substrate.** That is a
genuine vet-tech alignment available to us and nobody else, and it costs nothing
extra because ranching and pets are already building the animals.

---

## Prevention is the unexplored half

Every game in the table above is **reactive**: something is damaged, you repair
it. Public health is **preventive** — and prevention is unplayable in most games
because nothing bad happens until a designer decides it does.

Ours has a model where the outbreak **follows from density, care, and contact**.
That makes prevention a real act with a real counterfactual, and it means the
whole preventive layer is already designed in disease-slate: sanitation,
spacing, quarantine, reporting, and husbandry-as-immunity.

**This is the most defensible "nobody has done this" claim in the vertical**,
and it is worth protecting in the build order — reactive treatment is the
familiar half and will eat the design if it goes first.

---

## The institutions

### Public health is a department, not a new institution

No new substrate. A Government already runs departments as Businesses — Terminus
ships Registry, Watch, Works, Almonry. **A public health office is one more.**

- **Staffed via the College of Physic**, whose guild-roster demand anchor
  already reads: *"combat + hazards generate injury natively; treatment fees,
  retainers (Company, mines), **polity public-health paper**."* Public health
  was already its funding line — this vertical just supplies the work.
- **Powers, all of which already exist elsewhere:** surveillance (read the
  ledger) · investigation (disease-slate's outbreak-as-mystery) · **quarantine**
  (a movement/land-use power [stewardship](./stewardship-slate.md) gives
  localities) · **reporting requirements**.

### The reporting dilemma is the best mechanic here

> **A rancher who reports a sick herd may lose it to a cull. One who hides it
> starts an epidemic.**

That is the foot-and-mouth problem exactly. It is a genuine moral and economic
choice with no dominant answer, it ties the [pets](./pets-slate.md) welfare law
to public health, and it gives the office something to actually *do* besides
exist. It also makes compliance a **player-versus-player** matter rather than a
player-versus-rule one, which is where the interesting politics lives.

---

## Authoring an outbreak — the commons rule, at its clearest

The property slate's governing line is *"governance is reserved for the commons
+ shared rules only — **never your couch**."*

> **A contagion is definitionally not on your couch.** It is the one kind of
> content *designed* to leave your parcel; everything else in the property model
> is contained by construction.

So the split is clean, and needs no new doctrine:

| Act | Nature | Governed by |
|---|---|---|
| **Authoring** a disease | ordinary content — a new Kind A `Idea` | the review-the-vocabulary rule (a new primitive, reviewed once) |
| **Releasing** one into shared space | a **governance act** — it crosses boundaries without consent | within a locality: that **government's** public health office (diegetic). Across realms / into the commons: a **committee** (meta) |

That is the same two-layer shape [stewardship](./stewardship-slate.md) uses for
land use — **vocabulary is meta and closed; assignment is diegetic and local** —
so it reuses a decision rather than making a new one.

**The content opportunity:** an authored outbreak is a **scenario with a source,
a curve, and a resolution** — a live event with a real simulation underneath
rather than a scripted timer. That is a genuinely novel shape for a live event,
and it is the thing a content committee would actually run.

---

## Where the education thesis lands best

[farming-slate](./farming-slate.md) designed the **external-mastery seam**:
complete real course material → get trained in-game; demonstrate real, proctored
mastery → capability feeds back, riding the shipped
[credential](../../subsystems/credential.md) substrate, with the chronicle's
**deed-vs-claim** split doing the rest.

**Health is a better vehicle for that seam than agronomy**, because it is an
accredited vertical with standardised, proctored competencies and an existing
examination culture. If the seam is ever demonstrated to an education partner,
this is the cohort where *"real mastery collapses the two learners honestly"* is
most legible.

**Guard rails, restated because this is the commercially sensitive part:**

- **Build the seam, not the dependency.** External mastery is *one issuer*
  behind the credential substrate. The game must be whole and fun taught
  entirely in-game.
- **Real mastery raises the ceiling; it never gates the floor.**
- **Never overclaim.** The game teaches *reasoning*, not licensure. No in-game
  artifact should imply a real clinical qualification.

---

## What already exists

Encouragingly, the stage is partly built or already planned:

| Piece | State |
|---|---|
| **The aid post** | planned content in [demo-slate](./demo-slate.md) — "a room, a stock of dressings, patients arriving via the existing harm/hazard systems. *V2's stage; the health-cohort cut's set*" |
| **The health-cohort video cut** | already on the education-video track |
| **"A nursing scenario"** | named in [eternal-university-slate](./eternal-university-slate.md) as a vertical the un-genre campus hosts |
| **`medicine` Discipline** | ships (`seeds/lib/advancement/Discipline/medicine.yaml`) |
| **`assess`** | ships (`cmd/perception/assess.yaml`) — the assessment verb |
| **11 authored conditions** | ship, with overlapping `observableSigns` |
| **`treat` + dressings** | ships — but see the gap list |

---

## What's missing (verified 2026-07-31)

Stated honestly, because the medic vertical reads richer than it is:

- **`treat` is bandage-only.** It filters to `kind === 'trauma'` and only
  arrests bleeding lacerations/punctures/avulsions. Contusion, fracture and burn
  have no-op resolves. **It structurally cannot see an affliction.**
- **There is no diagnosis surface.** `assess` reads; nothing lets a player
  *record*, *commit to*, or *be evaluated on* a hypothesis. The diagnose half of
  the loop is the largest single gap.
- **`resolution.by` has no dispatcher.** Every Condition authors it
  (`antitoxin`, `rest`, `food`, `air`, `warmth`) and **nothing reads it**. It is
  dead prose — and therefore a free, well-shaped hook for "what cures this."
- **`applyAntidote` is the only clearance primitive**, with no verb, no item,
  and no medicine `Material`.
- **No revive or stabilise-the-downed** anywhere; rescue of the fallen is social
  (`intervene`), not medical.
- **An affliction cannot be inflicted through `ConditionApi`** — `inflict` is
  trauma-only (see harm.md's 2026-07-31 correction).

> **Read positively:** the treatment half is close to greenfield, so it can be
> designed *as clinical practice* from the start rather than retrofitted around
> a healing-potion economy that does not exist yet.

---

## Four traps

1. **Don't build the MMO healer.** Throughput-under-pressure is a fine game, but
   it replaces the diagnosis question with a resource question, and the
   resource question is what everyone else already built.
2. **Don't build Trauma Center.** Dexterity minigames teach dexterity.
3. **Don't let it become a wiki lookup.** Overlapping signs + this patient's
   live state means knowing the disease never skips the assessment (farming's
   rule).
4. **Don't make treatment instant.** The healing potion is precisely the thing
   to be the opposite of — and since `resolution.by` has no dispatcher yet, we
   get to define what "cure" means from scratch.

---

## Open questions

- **What the diagnose surface actually is.** A verb that commits to a
  hypothesis? A chart/record object? Something the `medicine` Discipline scores
  against outcome? *(This is the vertical's defining design problem.)*
- **Does `resolution.by` become the cure dispatcher**, and is that this build's
  job or the deferred medicine branch's?
- **How much epidemiology surfaces to a player** — R₀ and prevalence as
  instrument reads (the farming error-bar tier), or bands only?
- **Human/animal asymmetry** — how much do normal ranges, signs, and the
  can't-report-symptoms difference actually diverge, and is that content or
  code?
- **Whether the public health office ships with civics content or waits** for a
  second city to make its politics real.
- **Where the aid post sits** relative to the College of Physic's hall — demo
  content first, institution later?
