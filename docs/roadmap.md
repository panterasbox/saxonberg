# Saxonberg 2.0 Roadmap

This is a forward-looking roadmap. The foundation is shipped: auth,
persistence (both `Persistable` and the template/clone track), the
Standard Model + mixins, locations, command framework, navigation /
exits / doors / Cartesian and Spherical zones, the unified state model
(Shadow, PostRegistration), the call-security framework (interceptor
pipeline, decorators, policies), the messaging subsystem (MML, scene
composer, movement-message settings), and the say/tell controllers. See
[architecture.md](./architecture.md) for the layout and
[subsystems/](./subsystems/) for individual subsystem references.

What remains is organized below by topic, not by phase number — the
old PLAN.md phase numbering is no longer load-bearing.

## Phase numbering note

The original `PLAN.md` defined Phases 0–10. Phases 5 and 6 in that doc
map to:

- **Phase 5 ("Communications")** — say/tell commands, `Sensor`/`Vocal`
  mixins, `MessageApi`. **Effectively absorbed**: `Sensor`/`Vocal` shipped
  in Phase 3, and `say.yaml` / `tell.yaml` plus `SayController` /
  `TellController` are in `mud/cmd/` and `mud/obj/command/`.
- **Phase 6 ("Extended Object Model & Mixins")** — `Thing`, `DetailedMixin`,
  `PropertiedMixin`, `CartesianLocation`. **Effectively absorbed**:
  `Thing.ts`, `Detailed.ts`, `Propertied.ts` are in `lib/stuff/`;
  `CartesianLocation.ts` in `lib/spatial/`.

Treat the legacy phase numbers as historical. The remaining work below is
organized by area.

## What's left

### Event System — DONE

The event subsystem shipped as the **EventApi** global pub/sub bus
plus the **Witness pattern** for object-local hooks, backed by an
`EventRegistry` Idea bootstrapped via `BootstrapManager`. See
[subsystems/events.md](./subsystems/events.md) and
[subsystems/bootstrap.md](./subsystems/bootstrap.md). The
`MobileMixin` hook stubs that motivated this entry are now real
optional methods on the spatial mixins (Containable / Mobile /
Container / Exitable / HasInteractive) dispatched from
`ContainmentApi.move`, `Mobile.traverse`, and `ConnectionApi`.

### Interactive Prompt Stack (Framework 11)

- **What**: Per-`Interactive` prompt stack on the server
  (`PromptApi.confirm`, choice, text, MQL-object), plus matching client UI
  mode in `CommandBar.tsx` and a `prompt` / `prompt_clear` message protocol.
- **Why**: Lets commands ask follow-up questions (`give sword` → "to
  whom?"), enables confirmations and multi-step workflows like crafting/
  character creation. Nothing exists for this today.
- **Size**: medium (server) + small (client).
- **Dependencies**: none.

### Module hot-reload (Framework 12)

- **What**: `HotReloadApi.reload(modulePath)` with module registry,
  dependency graph, admin `reload` command, `recreateClone` helper.
- **Why**: Iterate on blueprints without restarting. Mostly an authoring
  quality-of-life win, but it also unlocks the future modding workflow.
- **Size**: medium.
- **Dependencies**: works better with the Event System (emits
  `ModuleReload`).

### MQL extensions

The bulk of MQL shipped on the `mql` branch — pronouns (`me`, `here`,
`it`/`him`/`her`/`them`, `$$`), multi-object selection (`type:
objects` / `MqlMany`), the chain grammar (`:keyword`, `:i`/`:e`,
brackets, set ops), filter expressions inside `[…]`, scope-as-MQL
evaluation, drill-additive focus, the `focus` verb, the predicate
registry, pronoun memory, the online-provider seam, and `PathTrie`-
backed glob seeds. See [subsystems/mql.md](./subsystems/mql.md) and
[mql-grammar.md](./mql-grammar.md).

What's left:

- **Globbable / fungible items**. Quantity syntax (`drop 2 roses`,
  `get all coins`) needs a `Globbable` flag on Stuff plus a
  natural-language transform on the desugar pass. The cardinality
  contract anticipates it; `MqlResult` may grow a `quantity` slot.
- **Disambiguation prompts**. Single-cardinality fields with multiple
  top-scored matches today pick by stable order. The future prompt
  stack (Framework 11) turns `result.stuff.length > 1` into a UI
  prompt.
- **Sort / named-group operators** (`:sort.X`, `@@group`). Distinct
  syntactic shapes; can be added without grammar churn when demand
  is real.
- **Real authoring-tier permission check**. Today's stub treats
  `authoring` and `admin` identically against `_MqlAdminFlag`. Real
  zone-aware logic lands with the player-authoring work.

Size: medium-small per slice. Dependencies: prompt stack for
disambiguation; Globbable scoping for quantity syntax.

### Markup language (Phase 5+/9+ tags)

- **What**: Extend MML (`api/mml.ts`, ~300 lines today) with semantic tags
  (`<command>`, `<direction>`, `<item>`, `<exit>`, `<npc>`, `<player>`,
  `<quantity>`), formal tags (`<color>`, `<size>`, `<link>`), and a
  corresponding `MarkupApi`. Client-side rendering for the new tags.
- **Why**: Enables clickable object links, colored output, and richer
  terminal rendering — the foundation for "click name to target" and any
  future GUI affordances.
- **Size**: medium (server tags + helpers) + medium (client renderer).
- **Dependencies**: none.

### Display-name composition (DescribeApi v2)

- **What**: Extend `DescribeApi` beyond today's two-step
  Named → Visible.shortDescription chain. Real-world display names
  are *composed*: a sword in someone's hand reads as `sword (wielded)`,
  an NPC currently scripted into a routine reads as
  `Dave is tending bar`, a hooded thief reads as `a tall figure in a
  black cloak` rather than the host's underlying short description.
  Today's `DescribeApi.getDisplayName` returns the bare core string;
  every surrounding decoration (state tags, shadow overrides,
  status lines) lives in ad-hoc code paths or doesn't exist yet.
- **Why**: As MQL settles and validators are routing more prose
  through `DescribeApi.getDisplayName`, the lack of decoration
  becomes structural. Old-school "You wield sword (wielded)." is
  the relic case — controllers should be able to produce
  `You wield the sword.` (no redundant tag) AND
  `inventory` should produce `sword (wielded)` from the same
  source of truth. The split between *core identity* and
  *decoration* needs to be a first-class API distinction.
- **Design constraints (informative, not committed)**:
    - **Pull-apart access** so consumers can render selectively —
      a `getDisplayParts(obj)` returning something like
      `{ core, tags?, status?, override? }` lets a verb composer
      choose which parts to include in which contexts.
    - **Standard composed form** so casual callers don't have to
      reassemble the parts — `getDisplayName(obj)` keeps doing
      the right thing for the 95% case.
    - **Decoration sources**: shadows (hood/disguise), worn-slot
      mixins (wielded / equipped), per-character status lines
      (NPCs running scripted routines), object-state tags
      (broken / locked / lit).
    - **MML-aware**: composition produces Mml fragments rather
      than raw strings, so the `<item>` / `<npc>` / `<player>`
      semantic tags from the Markup-language roadmap entry can
      land naturally.
- **Size**: medium (API + composition rules) + small per
  decoration source as they're brought in (worn slots, status
  lines, etc.).
- **Dependencies**: none blocking; benefits from the Markup
  language entry for the MML side.
- **Caller migration**: every `DescribeApi.getDisplayName` call
  site stays working — the v1 surface continues to return the
  bare composed string. Verbs / inventory rendering / scene
  bodies that want decoration switch to `getDisplayParts` or a
  new composer when those land.

### Race / species / organism subsystem

**v1 shipped** *(have)* — see
[docs/subsystems/race.md](./subsystems/race.md). Material substrate,
Clade taxonomic scope, BodyPlan + Species templates, OrganismMixin,
SexedMixin, SpeciesApi (kingdom resolution, lifecycle predicates,
`isAnimate`), animacy gating at the command layer. v1 acceptance
roster: Homo sapiens, Homo khazadicus, Lithobates catesbeianus,
Spathiphyllum wallisii, Constructa metallica.

What remains for follow-on builds:

- **What**: A real biological-style standard-model layer for organic
  agents. `OrganismMixin` distinguishes organic from inorganic
  agents (constructs, robots, ghosts). `Species` modeled as
  `Idea`-shaped templates in a Linnaean taxonomy
  (`/domain/species/animalia/chordata/…`), spanning real species
  (frogs, lizards, fish, humans) and fantasy (dragons, dwarves,
  elves) inside the same hierarchy. Body plan derived from species
  drives equipment-slot taxonomy. `Sexed` as a separate biological
  axis from the existing `Gendered` *(have — social / pronoun)*.
  Eventually genetics: alleles, inheritance, mutation, evolution.

  **Deferred from v1, sequenced for follow-on builds**:
  death/resurrection FLOW (state-machine + predicates ship in v1,
  the transition flow doesn't), `DietApi` + `Edible` + `Portable`
  (Material toxicity is authored as data, no consumer reads it),
  per-Detail materials and tissue authoring (v1 is bulk-only),
  genetics, per-individual variation feature mixins, sleep/circadian,
  aging, polymorph, character-creation UI, permission/rule machinery
  on zones.
- **Why**: Saxonberg's first audience is academic. STEM students
  studying biology should be able to *exercise* their classroom
  concepts inside the game — pathogens with realistic host ranges,
  Punnett squares for breeding, real toxicity tables, real
  metabolism. Not a model of reality (it's a fantasy game), but a
  pedagogically honest substrate underneath the fantasy. Also
  resolves several smaller design questions on its own: the
  long-pending `isLiving()` predicate, equipment-slot taxonomy,
  diet / edibility gating, who-gets-diseased.
- **Size**: large. The `Organism` mixin + species-template tree is
  medium; genetics is its own sub-subsystem on top.
- **Dependencies**: none blocking, but several mixins on the
  current slate are organism-shaped — see
  [mixin-slate.md](./mixin-slate.md) § "Organism subsystem
  awareness". Building those without awareness risks baking in
  assumptions (global slot enums, single-material bodies, blanket
  "all agents sleep") that the race system will then have to fight.
- **Open questions**:
  - How deep does the genetics layer go? (Mendelian basics,
    polygenic traits, sex-linked inheritance, full genome?)
  - How does evolution surface in play — long-running population
    sim, per-character mutation as quest reward / hazard, both?
  - Single-material vs. tissue-composition for `material` on
    organisms.
  - What's the construct (non-organic) hierarchy parallel to
    `Species`? Robots, golems, ghosts — do they get a templated
    `make` / `model` hierarchy?
  - Sex-determination systems — XX/XY only for simplicity, or
    model ZW/ZZ, environmental, haplodiploid for the relevant
    real + fantasy species?
  - Avatar customization at character creation vs.
    phenotype-from-genotype: does the player pick traits and
    the system derives a plausible genotype, or vice versa?

### Command system polish

- **What**: Model piping (PowerShell-style), an admin `reload`
  command plumbed into the framework, and an elegant fallback when
  `look` lands on a non-Visible room (a bare `Location` like
  `/domain/void` has no description by design — the current "You
  see nothing special." fallback reads wrong for rooms). Per-character
  command aliases (`AliasMixin`) shipped — see
  [subsystems/shell-alias.md](./subsystems/shell-alias.md).
- **Why**: Piping is foundational for future scripting; the look
  fallback is a content-quality fix that lower-level developers will
  hit any time they author a room without composing `VisibleMixin`.
- **Size**: small (look fallback) + medium (piping).
- **Dependencies**: hot-reload for the `reload` admin command.

### Utility APIs

`GrammarApi` (pronoun conjugation, articles, ordinal/article
lexicons used by the MQL desugar pass) and `ArrayApi` (`equal`,
`isPrefix`) shipped with the MQL work. Still wanted on demand:
`StringApi`, `TimeApi`, `ObjectApi`, `CallstackApi`, `FileApi`,
`AssertApi`. `MudlogApi` exists but is incomplete.

- **Why**: Clean utility surface so game/mod code stops re-implementing
  these. Take them on demand as commands need them.
- **Size**: small each — collectively medium.
- **Dependencies**: none.

### Templates, mods, and isolated-vm sandboxing (Framework 13)

- **What**: Mod base class with three flavors (Content / Capability /
  Full), mod registry and dependency loader, `isolated-vm` integration,
  bridged whitelisted APIs, resource limits (CPU/memory/timeout),
  monitoring hooks.
- **Why**: Required for v1.0. Also the security envelope for any
  third-party content.
- **Size**: large.
- **Dependencies**: Event System helpful; templates and `api/module.ts`
  already shipped, so the mod-loading half is partially scaffolded.

### Guest accounts

- **What**: Guest account generator with random surname assignment;
  bypasses Google OAuth.
- **Why**: Lower the barrier to first-time exploration and demos.
- **Size**: small.
- **Dependencies**: none.

### GraphQL admin API

- **What**: Type-GraphQL schema, resolvers over the running game state
  for inspection/admin tooling.
- **Why**: Replaces ad-hoc admin commands for richer tooling and
  dashboards.
- **Size**: medium.
- **Dependencies**: utility APIs help; not on the MVP critical path.

### Production hardening (Phase 10)

- **What**: Test coverage to >80%, integration/E2E flows, sandbox escape
  tests, MongoDB connection pooling, message batching, memory-leak audit,
  load testing, error boundaries, admin commands (user management, object
  inspection, sandbox dashboard).
- **Why**: Required for v1.0 ship.
- **Size**: large.
- **Dependencies**: sandbox must exist first.

### Deployment infrastructure

- **What**: Docker image, AWS CodeDeploy + Parameter Store + Secrets
  Manager + S3 + EC2 setup, GitLab CI pipeline, health-check endpoints.
  PLAN.md has a fully-specified AWS section to crib from.
- **Why**: Required to ship.
- **Size**: medium.
- **Dependencies**: Phase 10 hardening; can run in parallel with sandbox
  work.

### Idle eviction for Stuff lifecycle

- **What**: A mechanism for Stuff to clean themselves up if not
  accessed in a while. Triggering options (TTL on instance, per-class
  default, global LRU on registry, proxy-access hooks), granularity
  options (opt-in mixin vs opt-out decorator), interaction with
  `prepareDestroy` and shadow detach all open.
- **Why**: Today the registry is forever-growing. Acutely visible
  after the Persistable refactor — loaded `User`/`Template`/`GoogleProfile`
  instances stick around until explicit `StuffApi.destruct`.
- **Size**: medium — design pass first, then probably small to
  implement.
- **Dependencies**: needs design discussion.

See `subsystems/lifecycle.md § Open Design` for the open questions.

### Client UX enhancements

- **What**: Scroll-to-bottom button, message filtering, timestamps,
  copy/search; later split-pane layout (output + sidebar), tabs, mini-map,
  theming, accessibility, mobile responsive.
- **Why**: Quality-of-life on the existing terminal.
- **Size**: small (near-term polish) — large (long-term layout).
- **Dependencies**: prompt UI for the prompt-mode bar.

## Suggested order

1. ~~**Event System** — small, foundational, unblocks hooks and
   hot-reload.~~ Done.
2. **MQL `me`/`here` + multi-select + globbing** — visible UX win, no
   dependencies, the existing MQL is the clearest user-facing wart.
3. **Interactive Prompt Stack** — unlocks a class of commands and
   meaningfully improves UX.
4. **Markup language extensions + client renderer** — sets up clickable
   links and richer output before more commands accrete plain-text habits.
5. ~~**Command aliases** — small, high-value sit-up after MQL.~~ Shipped (`AliasMixin`).
6. **Module hot-reload** — accelerates all subsequent iteration. Will
   wire `Events.ModuleReloaded` once the subsystem lands.
7. **Mods + isolated-vm sandbox** — large, required for v1.0; start once
   core APIs feel stable.
8. **Utility APIs / Guest accounts / GraphQL** — opportunistic; pull in
   as needed.
9. **Phase 10 hardening + AWS deployment** — once sandbox is in.

## Aspirational / long-term

- **Domain mods**: Education mod (adaptive learning, course/quiz events),
  Retail mod, etc.
- **AI-driven NPCs**: LLM-backed faculty, staff, student NPCs as a
  Capability Mod.
- **Modding marketplace / community content** with the sandboxed mod API.
- **In-game scripting** for users (also sandboxed).
- **Web forms for complex commands** (crafting UI, character sheet) and
  graphical elements (avatar art, room illustrations).
- **Learning platform integration** (LMS sync, progress tracking, adaptive
  content).
- **Phase 11+ persistence**: `Thing` persistence with location
  reconstruction, advanced template diffing, distributed deployment.

## What got skipped or absorbed

- **Light & Boundary subsystem** — shipped. The Light value object,
  propagation walk, per-viewer perception, and the Boundary
  substrate (Window, Door retrofit) all landed in v1. Documented in
  [subsystems/light.md](./subsystems/light.md). Persistence followed
  the scalar-default rule the same MR introduced; the Marshaller
  framework landed alongside as the escape hatch
  ([subsystems/persistence.md § Marshaller Framework](./subsystems/persistence.md#marshaller-framework)).
- **Phase 5 ("Communications")**: absorbed into Phase 3 (mixins) + early
  Phase 4 (commands). Already shipped.
- **Phase 6 ("Extended Object Model")**: absorbed; `Thing`, `Detailed`,
  `Propertied`, `CartesianLocation` all live in the tree.
- **Phase 8 ("Advanced API Layer")**: partially shipped (`MqlApi`
  simplified, `MudlogApi` skeleton, navigation/path/schedule APIs exist).
  The remaining utility APIs are listed above as "Utility APIs."
- **`MarkupApi`** — PLAN.md spec'd a server-side helper class; the current
  code calls into `api/mml.ts` directly. Decide whether to keep that or
  formalize a `MarkupApi` wrapper.
- **VM2 alternative** to `isolated-vm` — PLAN.md compares the two and
  concludes `isolated-vm` wins. No action needed.
- **Phase 6-8 client features** (split-pane, tabs, mini-map, sound) —
  listed as "Future Enhancements" in PLAN.md and not on any critical path;
  rolled into "Client UX enhancements" above.
