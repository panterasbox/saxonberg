# Character generation slate (working doc)

> **Status: shape set, build it tiny.** The new-player intake — kept
> deliberately minimal (closed choices + heavy defaults), framed
> diegetically as campus/city services, and mostly *content* over a thin
> engine. Hands off to onboarding (its own slate) at the lounge.

Working slate for **char-gen** — the front-door flow that sets up a new
character. It's the integration test for the underlying systems (race,
vitals, augmentation, senses, language) but is intentionally *light*:
you're a **student enrolling**, not building a min-max sheet.

The load-bearing decisions:

1. **Light by design.** Audience = learners + investor demos, and the
   character is a student. So intake is fast, welcoming, low-commitment,
   forgiving (most choices editable later via in-world services).

2. **Depth is *earned*, not *chosen*.** Per the capability-magic slate's
   horizontal-mastery stance — there are no stat points; capability is
   derived and *learned in-world*. Char-gen never becomes a stat screen,
   even as systems mature. You start a freshman and grow.

3. **Closed choices + heavy defaults; no open-ended authoring.** Intake
   is a handful of *picks*; everything else defaults. Open-ended things
   (descriptions) do **not** belong here — too much to think about at
   intake. Description is defaulted by species.

4. **Diegetic, via campus/city services** — admissions/registrar, the
   clinic, housing. Not an abstract wizard; an enrollment. The same
   *services* framing covers ongoing changes (visit the registrar to
   rename, the clinic to add an implant), so customization continues
   in-world.

5. **Thin engine, content-heavy.** The engine is a tiny char-gen gate in
   the avatar-enter flow + closed-choice prompts + default-by-species.
   The services, rosters, and the lounge are content.

6. **Command-bus shape** (cockpit): intake is a sequence of commands; the
   kiosk/wizard is clickable-affordance sugar that previews/sends them.
   You learn the command protocol *while enrolling*.

See also:

- [docs/slates/onboarding-slate.md](./onboarding-slate.md) — char-gen
  hands off here (you spawn in the lounge post-intake).
- [docs/subsystems/race.md](../subsystems/race.md) — `Species`/`BodyPlan`
  supply the defaults (description, language, vitals baseline, native
  languages); species is a pick only once a roster exists.
- [docs/slates/augmentation-slate.md](./augmentation-slate.md) — the
  **baseline DM+emote implant is issued at intake** so you can talk.
- [docs/slates/senses-slate.md](./senses-slate.md) — sensorium derives
  from species + the baseline implant (ESP channels).
- [docs/slates/vitals-slate.md](./vitals-slate.md) — vitals baseline from
  species; `age` field (a starting-age pick feeds it).
- [docs/slates/language-slate.md](./language-slate.md) — native language
  from species (default common).
- [docs/slates/client-cockpit-slate.md](./client-cockpit-slate.md) — the
  char-creation modal/kiosk (clickable affordances → commands).
- [docs/subsystems/connection.md](../subsystems/connection.md) — the
  `Login`→`Avatar.enter` handoff the char-gen gate hooks.
- [docs/slates/access-slate.md](./access-slate.md) — name validation/
  moderation (the entity-name dependency) first bites here.
- [docs/design-philosophy.md](../design-philosophy.md) — light-by-design;
  liberal diegesis (services).

---

## Principle

1. **Light + welcoming** (a student enrolling, not a build).
2. **Earned, not chosen** (no stats at creation).
3. **Closed picks + heavy defaults**, no open authoring.
4. **Diegetic via services** (intake *and* ongoing changes).
5. **Thin engine, content-heavy.**

---

## The intake

What the player **picks** (closed choices — the "who am I" essentials
that earn their place):

| Pick | Mechanism | Notes |
|---|---|---|
| **name** | **given** (req) + **surname** (encouraged, defaulted) + **nickname** (NPC) | given runs the sanitizer; surname defaulted if skipped (mononym = opt-out); see *Identity & the records command* |
| **pronouns** | pick a few | `Gendered` |
| **backstory / origin** | closed-choice **aspiration** menu | what you want to *become* (not a student type); seeds **breadcrumbs** (locked) + a starter **bio** (editable); **no stats**. See *Identity & the records command* below. |
| **age / birthday** | *not a pick* | age = backstory flavor (no computed number); the only datum is **birthday = mint** (players) / authored (NPCs). See *Identity & the records command*. |
| **species** | **closed-choice pick** (7-race organic roster) | **pre-lounge** (body-foundational). Human / Elf / Dwarf / Halfling / Half-orc / Tiefling / Dragonborn. See *Body identity* below. |
| **sex** | sub-pick (if the species is sexed) | dioecious → M/F; `none` → no pick. *Sex = biology (species-constrained); gender/pronouns = free.* |

What's **defaulted** (no choice): description (by species), language (by
species → common), vitals baseline (by species), cohort (freshman),
home/recall (dorm), tier (player). **The baseline DM+emote implant is
issued** so the player can talk the moment they arrive.

A few picks, a welcoming kiosk over them, defaults for the rest.

## Diegetic via services

Intake is framed as **admissions/the registrar** (the "who are you"
desk); the **clinic** issues the implant; **housing** assigns the dorm.
The same services pattern handles *ongoing* changes (registrar to
rename, clinic to add implants, an outfitter for appearance presets
later) — so customization is in-world and continuous, not a one-shot
wizard. Services are **content** (NPCs/kiosks running closed-choice
dialogue + existing mutation verbs), not a new engine.

## Engine vs content

- **Engine (thin):** a **char-gen gate in the avatar-enter flow** (new/
  unset character → run intake before placing in the lounge; returning
  players skip it); the intake as **closed-choice prompts** (PromptApi)
  that set character fields, issue the baseline implant, and place the
  avatar; **default-by-species** (the `Species` template provides the
  defaults).
- **Content:** the admissions kiosk + the services + the choice rosters
  (backstory options, age brackets, pronoun set) + the lounge.

## The flow

`enroll` (post-login) → **pre-lounge char-gen** (name / species / sex /
pronouns / **backstory-aspiration** — your *core identity*; issues seed
breadcrumbs + starter bio + a themed starting outfit) → baseline implant
issued, defaults filled → **spawn in the lounge** (already dressed as your
aspiration; the lounge mints your first *earned* breadcrumbs) →
**onboarding** → **campus services** (advisor: **major**; chapel: **deity**;
outfitter: appearance shopping; + all ongoing changes). A handful of
commands and you're in.

---

## Identity & the records command (session refinements — 2026-06-07)

**Three distinct identity layers** (don't conflate):
- **`getLong`** — *perceptual*: what you perceive looking at the body now
  (sense/light/viewer-gated).
- **`bio`** — *claimed narrative prose*: who you are across time; read
  deliberately (not ambiently perceived); free-form, editable forever; on
  players + *storied* NPCs (not every Stuff). The "claimed" layer.
- **breadcrumbs** — *witnessed atoms*: minted structured records of what
  actually happened (own substrate — see
  [breadcrumb-slate.md](./breadcrumb-slate.md)). Backstory = the *seed*
  set; story = *earned*. The "witnessed" layer.

**Per-field decisions:**
- **name** — *structured:* **given** (required; free-text + moderation;
  intake-minimum, needed pre-lounge for attribution) + **surname**
  (encouraged, not required; **defaulted from a roster if skipped**;
  mononym = a deliberate opt-out with a soft nudge; for *human*
  disambiguation, *not* a uniqueness key — IDs handle uniqueness) +
  **nickname** (optional, mainly an NPC-authoring field). The
  **registrar** administers changes. **Presentation:** everyday handle =
  `nickname ?? given`; full/formal = `given + surname` (surfaces for
  disambiguation). This is the **Gus pattern** structured — nickname
  "Gus" shows on sight, formal "Augustus" + surname stays watch-lore.
- **pronouns** — closed-choice list, quick pick; personal expression →
  change *anywhere*; not free-text v1 (grammar-engine cost).
- **backstory/origin** — a closed-choice **aspiration** menu (what you
  want to *do/become*, not a student type), picked in char-gen. Each
  origin seeds **breadcrumbs** (locked) + a starter **bio** (editable).
  Demo roster (trans-genre archetypes, each mapping invisibly to a real
  learner vertical): **Something Better** (default; the degree-dream
  striver) / **Healer** (nursing+counseling) / **Teacher** (teacher cert)
  / **Guardian** (military) / **Founder** (business+finance+real-estate)
  / **Seeker** (science+AI). Genre-collage, never named-vertical.
- **age / birthday** — **age is not a pick**; it's narrative flavor (part
  of backstory), never a computed integer (fragile against a self-rate
  clock). The one real datum is a **birthday**, *decoupled from age*:
  **players' birthday = mint** (a witnessed, celebratable anniversary — no
  backdating; arrival is your "gameday"). A pre-arrival birth date is
  fabricated/claimed → backstory fuzz, not real data. **NPC birthdays are
  authored directly** when one's wanted (a child's party); apparent age
  lives in the description; *never* compute birthday from
  age-relative-to-spawn (the rate trap). Aging-over-time / child
  development = deferred (vitals + a world-time-rate decision).

**Identity tail (folded or deferred):** *nickname* → NPC presentation
override (see name, above). *surname* → structured/defaulted (above).
*hometown · personality · accent · handedness* → fold into the **bio** (no
separate fields, no trait system). *title/honorific* → **earned/granted**
status, not picked (`StatusMixin`; future witnessed-status hook).
*religion/faith* → **a char-gen pick** (a patron *demigod*; opt-in,
"seeking" default) — see
[alignment-religion-slate.md](./alignment-religion-slate.md). *Alignment*
itself is **not** a pick (derived from deeds; RPG-layer).

**The change mechanism — one command, subcommands (Model A):**
- A single records command with subcommands (`<cmd> name`,
  `<cmd> pronouns`, `<cmd> bio`, …) — not a verb-zoo (cf. `measure
  <field>`).
- **Place-vs-anywhere rule** *(generative — applies to appearance / major
  / housing too)*: *official records & institution-administered things →
  a place you visit; personal expression & preferences → anywhere.* So
  `name` is registrar-gated; `pronouns` / `bio` are anywhere.
- Gating is a **per-subcommand validator**. `name` validates "registrar
  present" and otherwise rejects-and-points-you-there (the rejection
  doubles as wayfinding).
- **"At a registrar"** = a `PropertiedMixin` ad-hoc property on the
  Location (`registrar`), content-set per-instance — *not* a class field,
  *not* a service-provider abstraction. Off-campus registrar = tag
  another room. (v1: location prop; move to a kiosk only if portable
  service points are ever wanted.)
- **bio** is prose, so its subcommand opens a **text-entry surface**
  (PromptApi text / cockpit text-area) pre-filled with current text — not
  a one-liner arg.

**The fast-pass (the graduation):**
- The place-requirement dissolves via a **capability** the actor carries:
  `validator = (registrar prop present) OR (actor has remote-records
  capability)`.
- The capability rides **augmentation** — the in-world "campus app-suite"
  implant (the EU Guide-wristcomp lineage). First in-person use
  **activates** remote access for that service; thereafter you transact
  from anywhere. (Same guided-first-then-free graduation as
  origin-menu→free-bio-edit and dorm-theme→personalize.)
- **Cost** ("charges your card") = parked **economy/bursar hook** (per-use
  fee + fast-pass subscription); v1 the graduation is free.

**Service split:** **registrar** = legal records (renames, ongoing);
**advisor** = academic enrollment (the **major** vertical-fed default).
*Backstory + bio are set in **pre-lounge char-gen** (core identity), not at
a campus desk.*

## Body identity (species / sex) — session refinements

**Species is a launch pick — *not* human-only.** Players are **organic**
(biological *animalia* humanoids); constructs and the rest of the
*constructa* kingdom (the seeded tutor-bot, etc.) are **world/NPC content**,
not playable. The demo roster covers the **familiar popular canon** — what
players already *main* (race loyalty is real), not the most "demoable"
species:

> **Human** · **Elf** · **Dwarf** (*homo khazadicus*, seeded) · **Halfling**
> · **Half-orc** · **Tiefling** · **Dragonborn** — seven, organic, all
> dioecious.

Each slots into the real Linnaean tree (the fantasy-race-as-`homo`-subspecies
joke the seeds already play). The **un-genred *range* lives in the
world/NPCs** (constructs, the peace-lily exchange student, the frog adjunct,
cosmic/xeno denizens) — *familiar self, strange world.* The senses substrate
rides for free: elf keen sight/hearing, dwarf stone-sense, halfling size
axis, tiefling infernal sensory flavor — so `deriveSensorium` /
`getModalities` visibly matter, attached to races people actually want.

**Placement — pre-lounge char-gen = your *core identity*:**
`name + species + sex + pronouns + backstory-aspiration` (+ talk-implant).
Species/sex earn their place by **necessity** (no body, no materializing);
**backstory** rides along because it's *who you are* — and the lounge mints
your first *earned* breadcrumbs, so the origin prologue must precede it.
*Institutional/optional* choices (**major**, **deity**) and **appearance
shopping** defer to **campus services**. All fast closed-choice (sex a
sub-pick under a sexed species; defaults for skippers).

**Sex vs. gender:** **sex = biology**, species-constrained (dioecious → M/F;
`none` → no pick); **gender/pronouns = free and independent.** Any pronouns
with any sex; identity flexibility lives on the (free) pronoun pick, never by
forcing options into the biological-sex field.

**Changing body identity = the clinic / body-shop** (the legacy Dr.
Frankenstein lineage). Species/sex change is a **transformation** — a real
procedure, a *place* (place-vs-anywhere), not a casual desk-swap or a
default-and-fix path. Picked once at intake; changed only deliberately.
*(Whether change is even a v1 feature, or "picked once, transformation
far-future" — open.)*

**The identity-space split:**
- **Core identity (pre-lounge char-gen)** — name, species, sex, pronouns,
  **backstory/aspiration** (+ seed breadcrumbs + bio + a themed starting
  outfit).
- **Campus services** — **major** *(advisor)*, **deity** *(chapel)*,
  appearance shopping *(outfitter)*, and all ongoing changes (renames →
  registrar; species/sex transformation → clinic).

## What this reveals (new systems / dependencies)

- **Campus/city services pattern** *(new, mostly content)* — service
  NPCs/kiosks that present closed choices and perform character/account
  mutations (set a field, issue an augment, assign housing). NPC-dialogue
  + prompts + existing mutations; a declarative "service transaction"
  helper is a maybe-later convenience.
- **Light identity fields** — `backstory`/origin + `age` (+ their choice
  rosters); age ties to race/vitals.
- **Default description/appearance by species** — the `Species` template
  carries a default description; appearance is *not* authored at char-gen
  (an outfitter offers presets later).
- **Name moderation** — validation + the sanitizer at intake (the flagged
  entity-name dependency).
- **The avatar-enter char-gen gate** — a real touch-point in connection/
  login.

---

## Open questions / forks (kept minimal)

1. **Species in v1** — *Resolved:* a **7-race organic roster** (Human / Elf
   / Dwarf / Halfling / Half-orc / Tiefling / Dragonborn), picked
   **pre-lounge**; constructs are NPC/world content. See *Body identity*.
2. **What backstory/age *do*** — *Lean: pure flavor + a readable origin/
   age field; no stats/bonuses* (depth is earned).
3. **One character per account?** — *Lean: yes v1* (matches the per-
   playerId default avatar; multi later).
4. **Editable post-creation** — *Lean: name + appearance editable
   in-world (via services); species fixed; augments change via install.*

---

## Build order

**Wave 1 — the tiny intake.** The avatar-enter char-gen gate; the
pre-lounge closed-choice prompts (name / species / sex / pronouns /
backstory-aspiration); default-by-species; issue seed breadcrumbs + a themed
starting outfit + the baseline implant; spawn in the lounge; hand off to
onboarding (major / deity / appearance complete at campus services). The
admissions kiosk + rosters as content.

**Wave 2 — services + editing.** The campus/city services pattern
(registrar/clinic/housing/outfitter) for ongoing changes; name
moderation wired to the real sanitizer; appearance presets (outfitter).

**Wave 3+ — depth as systems mature.** Augment loadout (when augmentation
matures); any background/skill axis (deferred RPG). *(Species is a launch
pick now — see Body identity.)*

---

## What this slate does NOT cover

- **Onboarding** (lounge → campus journey → dorm + customization) →
  [onboarding-slate.md](./onboarding-slate.md). Char-gen hands off to it.
- **The RPG stat/skill layer** — there isn't one at creation; depth is
  earned (capability-magic, deferred).
- **The economy** — no fees at char-gen.
- **The underlying systems** (race/vitals/augmentation/senses/language)
  — char-gen *consumes* their defaults; it doesn't define them.
- **Char-gen UI internals** — the cockpit owns the kiosk/modal rendering.

---

## Once shaped into formal requirements

This slate boils down to:

- **Light-by-design + earned-not-chosen** principles; closed picks +
  heavy defaults; no open authoring.
- The **pre-lounge char-gen set** (name / species / sex / pronouns /
  backstory-aspiration) + campus-completed (major / deity / appearance) +
  the **defaults** (description/language/vitals/cohort/home/tier) +
  **baseline implant + seed breadcrumbs + a themed starting outfit**.
- The **diegetic-services** framing (admissions intake + ongoing service
  changes), as content.
- The **thin engine**: the avatar-enter char-gen gate + closed-choice
  prompts + default-by-species.
- Tests: a new login runs intake then spawns in the lounge; a returning
  login skips intake; defaults fill from species; the baseline implant is
  issued; a bad name is refused; intake choices are commands.

Species choice, augment loadout, appearance presets, and any
background/skill depth wait for their systems.
