# Traits — requirements

The **personality layer**: CK3-style opposed-pair dispositions, modeled as
*competence for dispositions* — a derived aggregate over a ledger of
disposition-valenced acts, never an assigned stat. Traits are the personality
**input the NPC brains read** and the **innate baseline for `regard`**. This
build delivers the trait *substrate* plus its two read-only consumers (behavior
+ regard baseline); the **stress / composure** consumer (job 3) is a deliberate
fast-follow.

Seeded by [npc-behavior-slate § Traits](../slates/builds/npc-behavior-slate.md)
and [advancement-slate § Credit assignment](../slates/builds/advancement-slate.md).
Rides the shipped advancement substrate (`ActSignature`, the Transcript-shaped
ledger, derive-on-read) and the shipped belief/regard substrate. Prototyped on
the Dave's Bar cast.

## Goals

- A **disposition roster** exists as a vocabulary: ~15 opposed-pair axes
  (Calm/Wrathful, Generous/Greedy, Gregarious/Shy, Temperate/Gluttonous,
  Curious/Incurious, …) with both poles and a validation array — the CK3
  personality core, three reframed, one dropped, one added (per the slate).
- A character's **trait-position** on every axis is **derived on read** from an
  append-only ledger of disposition-valenced acts — a signed *magnitude* per
  axis (a position on every axis, not 3 slots; most near-neutral, a few
  pronounced). Never stored, never assigned. The same derive-don't-track
  discipline as competence / renown / participation.
- The **form → define → entrench lifecycle** is observable: a new character is
  near-neutral; accumulated evidence makes axes pronounced (*defined*); a heavy
  aggregate **resists drift** (*entrenched*). Drift + inertia replaces a
  lock-at-maturity rule.
- Trait evidence rides the **shared `ActSignature`** — the `dispositionValence`
  channel the advancement build declared-but-left-unpopulated is now populated
  and consumed, with **no reshaping of the type** and **no advancement
  dependency on the trait layer**.
- **Job 1 — drive behavior (light):** trait-position is readable by brains, and
  **one demonstrator brain** visibly modulates the bar cast's behavior by
  personality.
- **Job 2 — regard baseline:** **trait compatibility** between two characters
  yields the *starting* regard, derive-on-read, feeding the shipped regard
  substrate without belief gaining a trait dependency.
- The **bar cast** has its defining personality **at spawn** (Mara reserved &
  temperate, Remy gregarious, …) — via seeded disposition *evidence*, honoring
  derive-don't-track.
- Traits are **observable**: a self-view verb shows a character their pronounced
  axes.

## Non-goals

- **Stress / composure (job 3)** — the composure/equanimity Reserve, the break
  condition via the conditions cascade, and the cope-drinking → tolerance
  spiral. Deferred to a **fast-follow traits-stress build**; it couples into
  metabolism/conditions and still carries open design questions
  (frazzled-condition vs forced coping-behavior, spiral depth, numbers). See
  [reserve.md](../subsystems/reserve.md) and the slate's *Stress* section.
- **Full-surface disposition-valence authoring** — only a starter set of
  valenced `ActSignature`s (bar-relevant + a few social acts) sufficient to make
  the ledger observable. Tagging the whole verb/recipe surface is ongoing
  authoring, not a deliverable here.
- **npc-dialogue voice-from-traits** — the dialogue build consumes the readable
  trait-position; this build only exposes it. See
  [npc-dialogue-slate](../slates/builds/npc-dialogue-slate.md).
- **Trait-shock events** — entrenchment (resists drift) is in scope; the
  dramatic "shock an entrenched trait" event and its tuning are not.
- **Char-gen intake changes** — new-player trait seeding beyond what char-gen's
  existing claim-seeding already affords; cast seeding is the deliverable.
- **The advancement skill side** — shipped; untouched.

## Surface decisions

### Scope line: substrate + jobs 1 & 2; stress deferred

Decided. The three slate jobs are wildly different sizes; job 3 (stress) alone
rivals the other three combined and pulls in metabolism/conditions coupling plus
still-open design. This build ships the substrate + behavior-input + regard
baseline — a fully demoable result that unblocks npc-dialogue — and leaves stress
to a fast-follow.

### Behavior depth: readable + one demonstrator brain

Decided. Trait-position is exposed for any brain to read; **one** brain (new or
an extended existing one) demonstrates trait-modulation on the cast (e.g.
cadence scaled by Gregarious↔Shy). Broad trait-awareness across the brain set is
left to the dialogue / follow-on builds — the light touch keeps this build off
the critical path of shipped brain behavior.

### The ledger: a sibling `DispositionEntry`, mirroring Transcript

The disposition-valenced-act ledger is a **plain `Document`** in its **own
collection**, one row per disposition sub-check, owner-indexed — the exact shape
of `TranscriptEntry`, and a **sibling, not a child** of it (the renown↔regard,
transcript↔chronicle precedent). The skill-evidence and disposition-evidence
ledgers stay separate stores even though they share one authored signature
("instrument once" = author the signature once, not store in one table).

### Recording: `TraitApi.recordSignature`, no advancement→trait coupling

Traits get a `TraitApi.recordSignature(owner, signature, opts)` mirroring
`AdvancementApi.recordSignature`; it fans the `dispositionValence` channel into
`DispositionEntry` rows. An act-resolution site that records skill evidence also
records disposition evidence by calling both Apis with the **same** signature.
**Advancement must not import the trait layer** — the layering is trait → (reads
advancement's `ActSignature` type + belief's regard), never the reverse. (Exact
"two calls vs one combined helper" is a planning detail, subject to that
constraint.)

### No new Character mixin

Mirror advancement: trait-position is derived via `TraitApi` from the
owner-keyed ledger; nothing is stored on the Character. This resolves the
slate's open "a mixin?" question — **no mixin**.

### Derived trait-position + entrenchment, on the game clock

`TraitApi` derives, per axis, a signed magnitude from a **time-decayed weighted
sum** of valences, plus a **band** classifier (`unformed` / `defined` /
`entrenched`). Entrenchment is a monotone function of accumulated evidence mass:
more mass → more inertia → drift resists. Decay/drift run on **game-time**
(`WorldClock`) — disposition is in-world character formed over a lifetime, the
renown-style game clock, not participation's real-time clock. The estimator is
intentionally simpler than advancement's BKT/IRT (a decaying accumulator), with
the dials in `AppSettings`.

### Compatibility → regard baseline: derive-on-read in the trait layer

`TraitApi.compatibility(a, b)` derives a signed scalar from both trait-positions
(compatible axes → +, opposed → −). The **regard baseline** is a derive-on-read
read owned by the trait layer: when no interaction-driven regard row exists
(`RegardApi.regardsHeldBy` has no entry), the effective regard falls back to
compatibility; once interaction writes a regard, that governs ("sets the
*starting* regard… interaction moves it from there"). No stored seed, no
belief→trait dependency. Consumers (brains, future dialogue warmth) call the
trait-layer read.

### Cast personality at spawn: seed evidence, not a stat

The bar cast NPCs are given starting disposition **evidence** — `claim`-kind
`DispositionEntry` rows representing their established character — so derive-on-read
yields their defining traits immediately. This mirrors char-gen's
chronicle/transcript **claim-seeding** ([char-gen.md](../subsystems/char-gen.md),
[chronicle.md](../subsystems/chronicle.md)) and keeps the model honest
(personality came from a history, not a slider).

### Home + module shape

A new `lib/trait/` subsystem folder (parallel to `lib/advancement/`,
`lib/standing/`): the `Disposition` axis vocabulary (value-object + validation
array), the `TraitPosition` and band value-objects, and the `DispositionEntry`
Document. The gated facade `api/trait.ts` (`TraitApi`) forwards to the logic
singleton `obj/api/TraitLogic.ts`. A self-view verb (`traits`) as a
YAML-view + controller pair, Persona-afforded like `standing` / `chronicle` /
`competence`.

## Constraints

- **Derive-don't-track** — no stored trait field; ledger + derive-on-read only,
  per [antipatterns.md](../antipatterns.md) and the renown/participation/competence
  precedent.
- **Reuse `ActSignature` / `DispositionSubcheck` verbatim** — do not reshape the
  type; advancement owns it.
- **Layering** — the trait layer depends on advancement (`ActSignature`) and
  belief (regard); neither may gain a dependency on trait.
- **Durable keys** — `owner` keyed on `templatePath` (the Phase-0 re-key
  precedent); the disposition **axis key** (not its templatePath) on each row so
  the roster can be re-pathed without invalidating evidence — exactly as
  `TranscriptEntry` keys `discipline`.
- **Persistence via the `PersistApi` chokepoint**; new collection indexed on
  `owner`, declared in `PersistenceManager.createIndexes`; `lint:pm` clean.
- **Module categories** — `Api` + logic singleton + value-objects/vocabulary +
  Document + controller/YAML only; **no `lib/mixins/`**, no free-floating
  helpers. New `lib/trait/` folder is a subsystem home, not a category invention.
- **Gated-API actor-from-context** — `TraitApi` derives any acting principal
  from execution context, never an actor parameter (the `owner` of recorded
  evidence is the established subject of the act, as in `AdvancementApi`).
- **Build prerequisite:** the `feature/traits-build` branch must be cut from
  **`origin/master`** (where `ActSignature` + the advancement substrate live).
  This `build-1` worktree is currently behind master on
  `feature/npc-behavior-build` — fetch + branch off `origin/master` first.

## Acceptance criteria

- The ~15-axis `Disposition` roster exists with both poles per axis and a
  validation array; unit-tested.
- A `DispositionEntry` ledger Document + owner-indexed collection exists;
  `TraitApi.recordSignature` fans an `ActSignature`'s `dispositionValence`
  channel into rows; tested.
- `TraitApi` derives a per-axis signed-magnitude trait-position + band
  (`unformed`/`defined`/`entrenched`) on read over a synthetic ledger;
  entrenchment resists drift; game-time decay; tested.
- `TraitApi.compatibility(a, b)` and the trait-layer regard baseline behave as
  specified; **belief/regard source is unchanged** (no new dependency); tested.
- One demonstrator brain reads trait-position and **visibly** modulates the bar
  cast's behavior by personality, observable in-world.
- The bar cast NPCs, via seeded evidence, derive to their intended defining
  traits at spawn (e.g. Mara reserved/temperate, Remy gregarious); tested.
- A `traits` self-view verb shows a character their pronounced axes;
  Persona-afforded.
- Subsystem doc `docs/subsystems/trait.md` authored; CLAUDE.md doc-map +
  MongoDB-collections list updated.
- `pnpm lint`, `lint:pm`, `lint:gates`, `pnpm test`, `pnpm build` all green.

## Cross-references

- Seeding slates: [npc-behavior-slate § Traits](../slates/builds/npc-behavior-slate.md),
  [advancement-slate](../slates/builds/advancement-slate.md),
  [daves-bar-slate](../slates/builds/daves-bar-slate.md)
- Subsystem docs: [behavior.md](../subsystems/behavior.md),
  [belief.md](../subsystems/belief.md) (regard),
  advancement subsystem doc (on `origin/master`),
  [reserve.md](../subsystems/reserve.md) (the deferred stress consumer),
  [char-gen.md](../subsystems/char-gen.md) /
  [chronicle.md](../subsystems/chronicle.md) (claim-seeding precedent)
- Follow-on: **traits-stress** (job 3), **npc-dialogue** (consumes readable
  traits)
