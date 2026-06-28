# Dave's Bar — the integrating-vertical track

> **The sequencing roadmap for building toward Dave's Bar.** Authored
> 2026-06-26 at the end of a long design session that designed the bar end-to-end
> plus the substrates it rides. **Dave's Bar is the *integration target*, not a
> build** — "building the bar" = building ~8 substrates and then *authoring* the
> bar as content over them. This track sequences those substrate builds,
> **visible-life-first, with the bar as the recurring demo.** Entry point at the
> bottom.

## The reframe (read this first)

You never build "Dave's Bar." You build the **general substrate** the bar needs —
each piece reusable by the next venue — and then *author* Dave's Bar as content
(templates) over it. Every "how is X modeled" question resolves to "compose
existing mixins as a template" or "this needs a new general capability — build it
once." The bar is the **forcing function** that told us *what* substrate to
build; it is not itself a module. (See [daves-bar-slate](../slates/builds/daves-bar-slate.md)
§ *How it's modeled* for the discipline.)

## The foundational builds (status + home)

| Build | What | Status | Slate |
|---|---|---|---|
| **npc-behavior Wave 1** | `Behaved` + canned brains + wiring + cast; lights up the inert Activity substrate | **BUILT** (MR !90; subsystem doc [behavior.md](../subsystems/behavior.md)) | [npc-behavior](../slates/builds/npc-behavior-slate.md) |
| **Traits** | derived-from-behavior personality (= competence-for-dispositions); stress-as-divergence | **designed** | [npc-behavior § Traits](../slates/builds/npc-behavior-slate.md) |
| **npc-dialogue Wave 1** | responder seam + branching trees; voices from traits, warmth from regard (scripted banter deferred) | **shipped → [npc-dialogue.md](../subsystems/npc-dialogue.md)** | [npc-dialogue](../slates/tails/npc-dialogue-slate.md) |
| **Advancement** | Catalog / Transcript / Competence (the *learning core* — NOT deferred) | **designed**, increment-1 standalone | [advancement](../slates/builds/advancement-slate.md) |
| **Crafting v1** | the Dave's Bar slice (venue, recipes, tools, craft-resolve, provenance) | **designed**, buildable | [crafting](../slates/builds/crafting-slate.md) |
| **Banking** | accounts / ledger / cash; the deficit-as-target P&L | **designed** | [economy § Banking](../slates/builds/economy-slate.md) |
| **Corpos (marks)** | the corpo *marks* (brand→corpo ownership) — needed for the bar's brands | **designed** | [corpos](../slates/builds/corpos-slate.md) |
| **Scripting language** | recipe-scripts (programming-by-demonstration) + the `scripted-behavior` brain | **MVP designed** | [scripting](../slates/builds/scripting-slate.md) |

Shipped substrate it all leans on: Reserve, Activity (inert), affordance
attribution, Persona, templatePath, zones/access, bulk/glob/Material, location,
time, **belief/regard (shipped but inert — the social skills + traits are its
first consumers)**, recognition, perception, metabolism, the Scene composer,
provenance, chronicle, the command system.

## The dependency shape

Friendlier than it looks — **most of these are parallel, not a chain.**
Advancement, banking, crafting-v1, and npc-behavior each stand fairly alone on
shipped substrate. The only **hard edges**:

- **Traits** ride npc-behavior (the brains consume them) + advancement (they
  *are* its derive-from-a-behavior-ledger architecture, sharing the act-signature).
- **npc-dialogue** rides npc-behavior (the responder is a speech brain) and reads
  traits (voice) + regard (warmth).
- The bar's **economics** ride banking + crafting + corpos(marks).
- The **rituals + recipe-learning** ride the scripting language (the
  `scripted-behavior` brain).

So there's real ordering freedom; the lever to optimize is **earliest visible
life.**

## The sequence (each phase playable; the bar gets more alive)

1. **The world comes alive** — *npc-behavior Wave 1 + the traits roster feeding
   the brains.* Biggest visible transformation (dead museum → breathing world);
   standalone; design-done; lights up Activity. **Demo:** walk in — Mara's wiping
   the rail, Remy's holding court, the place moves.
2. **They talk** — *npc-dialogue Wave 1* (voices from traits, warmth from regard).
   **Demo:** talk to the cast, become a regular, watch the dialogue change.
3. **The venue works** — *crafting v1 (served path) + corpos(marks) + metabolism
   (shipped).* **Demo:** order a real drink, drink it, feel it; the corpo
   battlefield on the shelf.
4. **Money** — *banking + the magic-booze-faucet + the reserve subsidy.* **Demo:**
   pay or run a tab; the deficit-as-target ledger runs.
5. **You get better** — *advancement wired to the bar's activities* (darts,
   tolerance, the social skills through dialogue). **Demo:** the patron levels,
   combat-free, just by hanging out.
6. **Rituals + programming-by-demonstration** — *the scripting language* (the
   shift-change ritual, recipes-as-scripts). **Demo:** watch the shift-change;
   learn a recipe by making it.

Dave's Bar content (room + cast + recipes + brands + skill-Subjects) is authored
*incrementally alongside* these phases — never a separate "build the bar" step.

## The forks (decided / to-decide)

- **First build: npc-behavior, or advancement?** Advancement is the *thesis* but
  *invisible* until there are activities to practice; npc-behavior is *visibly
  transformative* day one and unblocks the social stack. **Decided: npc-behavior
  first**; advancement second-ish, its content filling in as activities land.
- **Banking timing.** Its value is invisible until there's something to buy.
  **Decided: phase 4**, not first (despite the "before anything" instinct — that
  was about it being a *prerequisite*, not the *first visible* thing).
- **Toward the bar, or substrates abstractly?** **Toward the bar** — keeps every
  build demoable and motivated.

## The meta-discipline

~Six substrate builds before the bar is fully itself — a long road. The rule
baked into the sequence: **never build blind.** Each phase lands a substrate
*and* a playable milestone, so you're always demoing a more-alive bar, not
assembling parts in the dark for months.

## Entry point

**`/requirements` on npc-behavior Wave 1** (`Behaved` + the canned brains +
wiring + the spec-list editor) — design-done, standalone, the biggest visible
win, the floor the entire social world (and the bar) stands on. The
[npc-behavior slate](../slates/builds/npc-behavior-slate.md) is requirements-ready
(model set, Wave 1 specified).
