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
| **name** | entry + moderation | a label, not open-ended thought; runs the name sanitizer |
| **pronouns** | pick a few | `Gendered` |
| **backstory / origin** | pick from a few | flavor + a readable origin field; **no stats** (fork) |
| **starting age** | pick / bracket | sets `age` (race/vitals); flavor v1 |
| **species** | pick *if* roster | human-only v1 → not even a pick yet (fork) |

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

`enroll` (post-login) → closed-choice intake (name / pronouns /
backstory / age) → baseline implant issued, defaults filled → **spawn in
the lounge** → hand off to **onboarding**. A handful of commands and
you're in.

---

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

1. **Species in v1** — *Lean: human-only* (so species isn't even a pick).
2. **What backstory/age *do*** — *Lean: pure flavor + a readable origin/
   age field; no stats/bonuses* (depth is earned).
3. **One character per account?** — *Lean: yes v1* (matches the per-
   playerId default avatar; multi later).
4. **Editable post-creation** — *Lean: name + appearance editable
   in-world (via services); species fixed; augments change via install.*

---

## Build order

**Wave 1 — the tiny intake.** The avatar-enter char-gen gate; the
closed-choice prompts (name/pronouns/backstory/age); default-by-species;
issue the baseline implant; spawn in the lounge; hand off to onboarding.
The admissions kiosk + rosters as content.

**Wave 2 — services + editing.** The campus/city services pattern
(registrar/clinic/housing/outfitter) for ongoing changes; name
moderation wired to the real sanitizer; appearance presets (outfitter).

**Wave 3+ — depth as systems mature.** Species choice (when the roster
exists); augment loadout (when augmentation matures); any
background/skill axis (deferred RPG).

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
- The **intake field set** (name/pronouns/backstory/age picks; species
  when rostered) + the **defaults** (description/language/vitals/cohort/
  home/tier) + **baseline implant issuance**.
- The **diegetic-services** framing (admissions intake + ongoing service
  changes), as content.
- The **thin engine**: the avatar-enter char-gen gate + closed-choice
  prompts + default-by-species.
- Tests: a new login runs intake then spawns in the lounge; a returning
  login skips intake; defaults fill from species; the baseline implant is
  issued; a bad name is refused; intake choices are commands.

Species choice, augment loadout, appearance presets, and any
background/skill depth wait for their systems.
