# Character generation (Wave 1) — requirements

New players have no intake flow today: an avatar is silently forked at
OAuth signup (Google name + human default) and dropped straight into
the world, and the login path hard-throws on anything but exactly one
character per user. This build introduces the **front-door flow that
creates a character** — a closed-choice, heavily-defaulted intake
(species → sex → name → pronouns → aspiration) driven by an `enroll`
command verb, presented through a **dedicated cockpit char-gen layout**
plus a **character-select roster**, that hands a fully-formed avatar
into the world at the existing lobby. It also turns on **multiple characters per
account**, which the data model already supports and which interlocks
naturally with a create-a-character flow.

The governing principle from the seeding slate is **light by design,
earned not chosen**: you are a student enrolling, not building a
min-max sheet. Intake is a handful of picks; everything else defaults;
there are no stats. The build is deliberately scoped to what is
*buildable today as content or as patches to shipped substrate* —
anything that would require standing up a whole new system (breadcrumbs,
vitals, language, the lounge Warren, campus services) is consumed-if-
present or deferred, never built here.

Seeded by [docs/slates/char-gen-slate.md](../slates/char-gen-slate.md).
Consumes the race substrate
([docs/subsystems/race.md](../subsystems/race.md)), the login/connection
seam ([docs/subsystems/connection.md](../subsystems/connection.md)),
`PromptApi` ([docs/subsystems/prompt.md](../subsystems/prompt.md)), the
Wearable/Slot substrate
([docs/subsystems/embodiment.md](../subsystems/embodiment.md),
[docs/subsystems/slot.md](../subsystems/slot.md)), and the cockpit
prompt-rendering surface
([docs/slates/client-cockpit-slate.md](../slates/client-cockpit-slate.md)).
Hands off (eventually) to onboarding
([docs/slates/onboarding-slate.md](../slates/onboarding-slate.md)).

## Goals

### Intake flow (server engine)

- **Signup creates zero avatars.** OAuth signup stops auto-forking a
  default avatar; a new user starts with an empty character roster.
  The Google profile name is retained only as the *seed for the name
  suggester* (below), not as a pre-minted character.
- **Char-gen runs on the real command pipeline.** `Login` is a genuine
  `CommandGiver`, and `enroll` (plus `play`/`look`) are **real MVC
  verbs** (YAML view + controller) dispatched through the same
  `executeCommand` path as any in-world verb — not a bespoke parser.
  The whole point is to put the player on our actual command
  infrastructure from the first keystroke. Login carries a tight
  **verb allowlist** (`enroll`/`play`/`look` via `commandContributions`),
  so no world verbs leak — the recency stack *is* the sandbox.
- **The `enroll` verb** takes a **field-named subcommand** per pick,
  in this order: **species → sex → name → pronouns → aspiration →
  confirm** (`enroll species elf`, `enroll name reroll`, `enroll
  confirm`), typed or sent by clicking the dedicated-layout affordances
  — both go through the same command channel, so input is visible and
  echoed. Mirrors the slate's "one command, field-named subcommands"
  Model A (cf. `records <field>`, `measure <field>`); no two-word verbs
  (the field is an argument). Order is **species-first** (deviating from
  the slate's name-first listing) so the name suggestion can be
  species-themed; species is body-foundational, so this is natural.
- **Picks accumulate on the transient `Login`.** During char-gen the
  Interactive's holder is the `Login` object (not yet an Avatar); the
  `EnrollController` records each pick as `EnrollmentDraft` state on
  Login (reached via `ctx.commandGiver`). Login is discarded (GC'd) the
  moment char-gen commits, so it is the natural, zero-cleanup
  accumulator.
- **The dispatch location guard is removed (a game-wide fix).** The
  command pipeline silently dropped commands from any giver with no
  location — which both blocks an incorporeal giver like Login and
  soft-locks a stranded player (who most needs `help`/`recall` to
  work). Location becomes **optional context**: dispatch always
  proceeds, and the handful of verbs that truly need a location emit a
  clean "you're nowhere" instead. Near-nil risk for live play (healthy
  avatars are never locationless); it's the correct model regardless of
  char-gen.
- **Atomic commit.** `enroll confirm` reads the accumulated picks off
  Login and commits a single fully-formed avatar (created, dressed,
  bio-seeded, placed, entered). An abandoned or disconnected intake
  produces **no playable character and no orphaned half-character** —
  there is no persisted "draft" state and no completion flag to manage.
- **`Login` becomes a Sensor.** Composing `SensorMixin` onto Login
  (a ~dozen-line patch mirroring Avatar's `handleMessage`/
  `handleEnvelope`) lets the de-emphasized char-gen terminal receive
  and display **system/narrative frames** during enrollment (welcome
  text, per-step narration, validation feedback, and any non-modality
  broadcast frames). `Sensor` is a message-receipt harness orthogonal
  to embodiment: a bodiless Login has no sensorium, so *sensory*
  (modality-tagged) frames are naturally filtered out, while
  system-family frames deliver unconditionally — exactly the right
  behavior. This reinforces the terminal's role even while it is
  secondary, and keeps the prompt path open as a latent option.
- **The login roster branch.** `Login.enter` replaces its
  `avatars.length !== 1` throw with a 0 / ≥1 branch: **0 characters →
  char-gen**; **≥1 → the character-select roster** (play an existing
  character, or create a new one → char-gen). The roster is the post-
  login hub whenever the user owns at least one character.
- **Defaults are filled from species** at commit: description (new
  `Species` field, below), sensorium (already derived from
  body plan / vision / olfaction profiles), pronouns and species set by
  the picks. Cohort/home/tier defaults ride the existing seed defaults.
  The baseline DM+emote capability needs **no intake action** — the
  `AetherImplant` is already auto-installed at avatar bootstrap and
  `SoulMixin` is on every Character.
- **Spawn at the existing lobby** (`/domain/eternal/duncan-hall/lobby`)
  and enter the world. The lounge and onboarding are deferred (see
  Non-goals); char-gen ends by entering the world normally.

### Multiple characters per account

- **Multichar is on.** A user may own and play more than one character.
  The data model already supports this (`User.playerIds` is an array;
  avatar templates are keyed per-character); this build wires the
  remaining seam.
- **Character-select roster** lists the user's characters and offers
  "create new character." Selecting one enters the world as that
  character; creating routes into char-gen.
- A character created via char-gen is appended to the owning user's
  roster; nothing about one character constrains another.

### Race & identity substrate (content + patches)

- **The seven-race organic roster ships as content.** Human and Dwarf
  exist today; **Elf, Halfling, Half-orc, Tiefling, Dragonborn** are
  authored as new `Species` seeds over the shipped `Species`/`BodyPlan`
  classes, all reusing the existing biped body plan. All seven are
  dioecious.
- **Species carry per-race sensory flavor** — each seed tunes the
  existing `visionProfile` / `olfactoryProfile` / body-plan
  `sensoryPorts` fields (elf keen sight, dwarf scotopic shift, tiefling
  infernal smell, …) so the species pick is *mechanically* meaningful,
  not cosmetic.
- **`Species` gains a default-description field** — a themed short
  description per race, consumed as the avatar's default appearance at
  commit (gives the player a body to `look` at). Authored per seed.
- **Name banks are their own `Document` collection** — the per-race
  given-name / surname pools (melodic Elf, hard-consonant Dwarf/Half-orc,
  compound "Smallberries/Underhill" Halfling, …) are bulk authored
  content, so they live as plain-JSON `NameBank` `Document`s in their own
  collection (the persistence-rethink substrate), seeded from YAML —
  *not* inlined on the `Species` template. `Species` carries only a
  **reference** (a bank key, possibly more than one to blend, e.g.
  half-orc = orcish + common). The suggester resolves the reference and
  reads the bank(s). Prior art: the Emote/`SoulCatalogue` content-Document
  pattern. → memory [[feedback_stuff_has_residency_cost]],
  [[project_persistence_rethink]].
- **`SexedMixin` is composed onto Character.** It ships but is unwired;
  composing it enables the sex sub-pick (dioecious → male/female;
  species with `sexDeterminationSystem: none` get no sub-pick). Sex is
  biology, species-constrained; pronouns are free and independent.
- **A new `PersonaMixin`** (in `lib/character/`) carries the **claimed
  self-narrative** layer — a `bio` field (persistent authored prose,
  who you are across time) and an `aspiration` field (closed-choice,
  who you're becoming). Distinct from witnessed breadcrumbs and
  perceived body description; composed on Character. Char-gen **seeds**
  the bio from the chosen aspiration; player-facing *editing* of bio
  defers to Wave 2 services.
- **The `aspiration` field** (on `PersonaMixin`, above) ships with the
  six-archetype roster as content: **Something Better**
  (default) · **Healer** · **Teacher** · **Guardian** · **Founder** ·
  **Seeker**. Its real, buildable effects: it **seeds the starter bio**
  and selects the **themed starting outfit**. Its third slate-effect —
  seeding breadcrumbs — is deferred (no breadcrumb substrate).

### The name suggester

- **Species-themed, real-name-riffing suggestion.** At the name step,
  char-gen proposes a fantasy name built from the chosen species' name-
  flavor bank, *lightly biased by the player's real (Google) name* —
  keeping an initial or first syllable so it feels personal, then
  restyled to the species ("Bobby Schaetzle" + Halfling → "Bobalu
  Smallberries"). This is phonetic riffing, **not** semantic
  translation.
- **Keep / re-roll / type-your-own.** The player accepts the
  suggestion, re-rolls (re-samples the bank, cheap), or types a name of
  their own (which runs the validation rules). Characters created after
  the first (no fresh real-name seed needed) draw suggestions from the
  species bank directly.
- **Structured name.** Given is required (the suggester always offers
  one, so intake is never blocked); surname is encouraged and defaulted
  from the bank if skipped (mononym is a deliberate opt-out). Both ride
  the shipped structured `NamedMixin` fields.
- **Validation rules** (controller-inline, not a moderation system) —
  v1 defaults: each field 2–24 characters; Unicode letters plus a
  single internal hyphen or apostrophe (so `O'Brien`, `Mary-Jane`
  pass), no leading/trailing/doubled separators, no digits, no internal
  spaces; whitespace trimmed; capitalization left as typed. A **seeded
  denylist stub** (reserved/abuse tokens — `admin`, `system`,
  `moderator`, `null`, a few obvious slurs) demonstrates the hook,
  structured to be swapped for the real sanitizer. Names are **not** a
  uniqueness key (IDs handle uniqueness). The real sanitizer/moderation
  system is deferred.

### Themed starting outfit (content)

- **Per-aspiration signature outfits** authored as garment content over
  the shipped Wearable/Slot substrate: a shared student base plus a
  signature item per aspiration. The avatar is dressed at commit via the
  existing `SlotApi` / `ContainmentApi` (no new dressing mechanism).

### Cockpit (client tandem)

- **Connection-phase routing.** The client gains a connection-phase
  notion (not-authenticated / character-select / char-gen / in-world)
  in the Zustand store, driving which top-level layout renders. The
  login takeover, the roster, the char-gen layout, and the default
  cockpit are mutually exclusive.
- **Character-select screen** — a new component rendering the user's
  character roster (name, species, themed description) with a play
  affordance per character and a "create new character" affordance.
- **A dedicated char-gen layout** (not a modal, not an inline pane) —
  a bespoke phase layout that gives intake the stage: the char-gen
  **stage** (current step, closed-choice affordances, the name
  suggestion with keep/re-roll/type) gets the main area, the **command
  bar stays front-and-center**, and the **terminal is present but
  secondary** (a slim strip showing the enrollment narration Login now
  emits). On `enroll confirm` the layout **flips to the default cockpit**
  (terminal-dominant + inspection pane) — a deliberate "now you're in
  the world" reveal.
- **Affordances send real commands.** Every clickable element on the
  char-gen stage sends the same `enroll <field> <value>` string the
  player could type, through the existing `sendCommand` path; the
  command echoes in the bar. Clicks and typing are unified, and the
  player learns the command surface while enrolling (the cockpit-slate
  principle). **No new wire shapes** beyond a small char-gen-state
  frame (current step / picks / suggestion) the layout reads and the
  character roster carried in the post-login payload.

## Non-goals

- **Breadcrumbs.** No breadcrumb substrate exists (deep design
  deferred); aspiration does not seed them in this build.
  → [breadcrumb-slate.md](../slates/breadcrumb-slate.md).
- **Vitals baseline & language defaults.** Whole systems with no
  consumer yet; species do not carry vitals or native-language fields
  here. → [vitals-slate.md](../slates/vitals-slate.md),
  [language-slate.md](../slates/language-slate.md).
- **The lounge Warren & onboarding.** Char-gen spawns at the existing
  Duncan Hall lobby; the elastic lounge, Dr. Limen, and the campus
  journey are their own builds. →
  [lounge-slate.md](../slates/lounge-slate.md),
  [onboarding-slate.md](../slates/onboarding-slate.md).
- **Campus services (registrar / clinic / housing / outfitter).** All
  ongoing-change services, and the **`records` command** (view *and*
  edit), are Wave 2. Bio is seeded but not yet editable in-world;
  major and deity picks live with campus services.
- **Real name moderation.** Only inline validation here; the shared
  sanitizer/denylist system defers. →
  [access-slate.md](../slates/access-slate.md).
- **Species / sex change.** Picked once at intake; transformation (the
  clinic/body-shop) is out of scope.
- **The RPG stat/skill layer, augment loadout selection, appearance
  shopping.** Depth is earned, not chosen; these wait for their systems.
- **Aging over time / birthday substrate.** `age` stays the existing
  static field; no birthday-mint mechanic in this build.

## Surface decisions

### Intake order: species first

Chosen so the name suggestion can be species-themed. Species is body-
foundational ("no body, no materializing"), so leading with it reads
naturally. The slate's listed name-first order existed to guarantee a
name before world-attribution; since char-gen commits before the
avatar ever acts, order within the flow is free.

### Signup creates zero avatars; char-gen is the only character path

With multichar on, auto-minting one default avatar that intake then
reconfigures is awkward (and additional characters would take a
different path). Instead signup creates nothing, the empty roster
routes to char-gen, and every character — first or fifth — is created
the same intentional way. This also makes char-gen atomic and removes
any "draft character" concept.

### Mechanism: the real command pipeline, not the prompt stack or a bespoke parser

Char-gen rides a real command verb (`enroll` + field-named
subcommands) on the **genuine command pipeline**, not a `PromptApi`
sequence and not a Login-local mini-parser. `Login` is made a real
`CommandGiver` and `enroll`/`play`/`look` are real MVC verbs.
Decisive reasons: the flow is one atomic transaction whose partial
state has a natural, GC'd home on the transient `Login`; the bespoke
char-gen layout renders its own affordances, so the prompt stack's
free chip rendering is moot; and most importantly, **introducing the
player to our real command infrastructure is the whole point** — a
fake parser would teach them nothing transferable, whereas real verbs
on the real pipeline make interaction one a genuine lesson in the CLI
that is the backbone of the UX. A Login-scoped bespoke handler was
explicitly rejected for this reason.

### The location-dispatch guard is removed (game-wide)

Making Login a `CommandGiver` surfaced that the dispatcher silently
drops commands from any giver with no location. That guard is wrong
beyond char-gen: a stranded player most needs commands (`help`,
`recall`) to work, and silently swallowing them is a soft-lock. So
location becomes **optional context** — dispatch always runs;
location-requiring verbs degrade with a clean "you're nowhere." This
is near-nil risk (healthy avatars are never locationless) and removes
any need to make Login `Containable` or place it in a staging room —
it's simply a locationless `CommandGiver` + `Sensor`, which is the
honest model of a pre-world presence.

### Login is a Sensor

To show enrollment narration/feedback in the de-emphasized terminal,
Login composes `SensorMixin` (orthogonal to embodiment; bodiless Login
simply receives no sensory frames). This is preferred over a
"transient avatar host" workaround: it's a smaller, cleaner patch, it
reinforces the terminal's role during char-gen, and it opens Login to
non-modality broadcast frames if wanted.

### Aspiration kept, with real effects only

Aspiration earns its place because two of its three slate-effects are
buildable now (seed bio, themed outfit). Shipping it as a stored value
that does nothing would be a flavor-only prop; gating it on the
unbuilt breadcrumb system would cut good demo content. So it ships with
its real effects and its breadcrumb-seeding deferred.

### Tandem build: the char-gen layout ships now

The dedicated char-gen layout and character-select screen are built in
this cycle (not deferred to a later client pass). The surface is a
**dedicated phase layout**, chosen over a modal (which would cover the
terminal/command bar and fight the CLI goal) and over an inline pane
(lighter, but under-sells a new player's first-run moment while the
terminal still dominates). The client work rides shipped
infrastructure — the `sendCommand` path, MML/affordance rendering, and
the connection store — so the new work is phase routing, the roster
screen, the char-gen stage component, and reading the small
char-gen-state frame.

### Multichar roster is the post-login hub for ≥1 character

Even a user with exactly one character sees the roster (to reach
"create new"). The one-extra-click cost on the single-character fast
path is accepted for Wave 1; a fast-path auto-enter is a possible
later refinement.

## Constraints

- **Char-gen I/O is hosted on `Login`.** Input arrives as `enroll`
  commands dispatched while the Interactive's holder is Login; picks
  accumulate on Login; output reaches the client because Login now
  composes `SensorMixin`. The planner must wire Login to accept and
  dispatch the char-gen verb (Login is an `Idea`, not a Character, so
  it does not route the full command set today) and to emit the
  char-gen-state frame the client layout reads. `MessageApi`'s
  `Stuff & Sensor` delivery contract is satisfied by the Login-Sensor
  patch; only non-modality (system-family) frames will deliver to a
  bodiless Login, which is correct.
- **Data-driven, not switch-driven.** The `enroll` verb dispatches
  over a **uniform field/step model** (one declarative step spec the
  verb, validators, and the char-gen-state frame all read) — not a
  per-field `switch` or parallel hardcoded lists. Likewise the
  rosters and mappings live in **content**: species defaults / name
  banks on `Species` seeds, the aspiration→(bio, outfit) mapping on the
  aspiration roster content — never a lookup `switch` in the
  controller. New steps or aspirations should be addable as data, not
  code branches. (This is the right abstraction for a real N of
  fields/rosters that share structure — not premature generality;
  resist *adding* structure beyond the uniform step model.)
- **No new Api; no new module categories.** Species seeds are content
  (YAML); `Species`/`Character`/`Avatar`/`Login` changes are patches to
  shipped classes. Char-gen orchestration — the step spec, validation,
  and the commit — lives in the **`EnrollController`** (a real MVC
  controller, the genuine command handler), which calls the
  security-threaded Apis (`StuffApi`/`SlotApi`/`ContainmentApi`/
  `ConnectionApi`) the normal way. The `EnrollmentDraft` lives on
  **`Login`** (the giver); the name suggester lives on **`Species`**
  (colocated with its name-bank data); the aspiration roster is
  **content**. A controller is not an Api — **no `EnrollmentApi`.**
  → CLAUDE.md "Module Categories", "No new Apis by default".
- **Inter-stuff contract & field conventions.** New fields follow the
  property-vs-instruction split and put per-field invariants on setters;
  boolean fields (if any) use noun-form field + `is`-predicate getter.
  → CLAUDE.md, [feedback rules in memory].
- **Mixin placement.** `SexedMixin` composition and any new identity
  state land in their owning `lib/<subsystem>/` homes (character /
  species / description), never a `lib/mixins/` dump.
- **Props real or cut.** Every authored content object must be backed
  by real shipped substrate and make only honest claims — species/
  garments by real mixins (`Species`/`Wearable`/`Slottable`), name
  banks by the real `NameBank` `Document` + suggester.
- **No new wire shapes** for the client beyond extending the post-login
  payload to carry the character roster; the kiosk reuses the
  `PromptEnvelope` / `prompt-response` protocol.
- **Reuse the Api layer.** Avatar creation goes through `StuffApi` /
  `TemplateApi`; placement and dressing through `ContainmentApi` /
  `SlotApi`; never raw `new`/`destroy`/field-pokes.

## Acceptance criteria

- A brand-new user, on first login, has an empty roster and is routed
  into char-gen; on completion a fully-formed avatar enters the world
  at the lobby. (Test.)
- A returning user with one character sees the roster and can play that
  character; with two or more, can pick among them. (Test.)
- Signup no longer creates an avatar; an abandoned/disconnected char-gen
  leaves no playable character and no orphaned template. (Test.)
- All seven species are pickable; selecting one fills a themed default
  description and species-appropriate sensory profile; a sexed species
  offers the male/female sub-pick and `none` species do not. (Test.)
- The name step offers a species-themed suggestion biased by the real
  name, supports keep / re-roll / type-your-own, and rejects names that
  fail the validation rules. (Test.)
- Choosing an aspiration seeds the starter bio and dresses the avatar in
  the matching themed outfit. (Test.)
- Pronouns and sex are set independently; any pronouns are selectable
  regardless of sex. (Test.)
- Char-gen is driven by the `enroll` verb + field-named subcommands on
  the **real command pipeline** (`Login` is a `CommandGiver`; `enroll`
  is an MVC verb dispatched via `executeCommand`); picks accumulate on
  the transient Login and commit atomically on `enroll confirm`; the
  same verb is exercisable from the text client without the dedicated
  layout. (Test.)
- Login exposes only `enroll`/`play`/`look` (no world verbs leak), and
  a **locationless giver dispatches** rather than being silently dropped
  — the relaxed location guard leaves the embodied-avatar path
  unchanged. (Test + regression.)
- Login composes `SensorMixin` and displays system/narrative frames
  (welcome/enrollment narration) during char-gen; sensory
  (modality-tagged) frames do not reach the bodiless Login. (Test.)
- The cockpit renders the character-select roster and the char-gen
  layout as distinct phases; char-gen-stage affordances send the same
  `enroll …` commands as the text client (observable in the command
  echo), and the layout flips to the default cockpit on commit.
  (Client behavior, manually verifiable; unit coverage where
  practical.)
- Subsystem doc `docs/subsystems/char-gen.md` exists, documenting the
  intake flow, the `enroll` verb + Login accumulator, Login-as-Sensor,
  the login roster branch, the species default/name-bank fields, and
  the cockpit phases.

## Cross-references

- **Seeding slate:** [char-gen-slate.md](../slates/char-gen-slate.md)
- **Consumed substrate:** [race.md](../subsystems/race.md),
  [connection.md](../subsystems/connection.md),
  [command-routing.md](../subsystems/command-routing.md),
  [command-spec.md](../subsystems/command-spec.md),
  [response-envelope.md](../subsystems/response-envelope.md),
  [persistence.md](../subsystems/persistence.md) (the `NameBank`
  `Document`), [emotes.md](../subsystems/emotes.md) (content-Document
  precedent), [embodiment.md](../subsystems/embodiment.md),
  [slot.md](../subsystems/slot.md),
  [lifecycle.md](../subsystems/lifecycle.md)
- **Client:** [client-cockpit-slate.md](../slates/client-cockpit-slate.md),
  [message-rendering.md](../subsystems/message-rendering.md),
  [response-envelope.md](../subsystems/response-envelope.md)
- **Deferred dependencies:**
  [breadcrumb-slate.md](../slates/breadcrumb-slate.md),
  [vitals-slate.md](../slates/vitals-slate.md),
  [language-slate.md](../slates/language-slate.md),
  [lounge-slate.md](../slates/lounge-slate.md),
  [onboarding-slate.md](../slates/onboarding-slate.md),
  [access-slate.md](../slates/access-slate.md)
