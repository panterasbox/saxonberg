# Character Generation (Intake)

How a brand-new player gets a body and a name. Covers the post-login
branch (roster vs. char-gen), the `enroll` verb as a draft state
machine, `Login` as the accumulator, the commit/spawn handoff, the
species/name-bank substrate, and the cockpit's char-gen phase.

This doc is the **intake** map. Sibling docs cover adjacent ground
without overlap:

- [connection.md](./connection.md) — the auth → WebSocket → `Interactive`
  → `Login` plumbing this rides on, and the disconnect/logout path.
  The Cast table (`User`/`Avatar`/`Interactive`/`Login`) lives there.
- [command-routing.md](./command-routing.md) — the MVC dispatch pipeline
  `enroll` is a verb on. char-gen adds no new dispatch mechanism.
- [race.md](./race.md) — `Species`/`BodyPlan`/`Material` substrate the
  species picks resolve against; char-gen consumes it, doesn't define it.
- [state-model.md](./state-model.md) — why there is no `Player` class,
  the `User.playerIds` ownership list, the template-vs-runtime split.

## The principle

**Char-gen rides the real command pipeline.** It is not a bespoke
wizard, not the prompt stack, not a special parser. `Login` is a
`CommandGiver`; `enroll` is an ordinary MVC verb dispatched through
`executeCommand`. Every pick is a real command (`enroll species human`)
that echoes in the command bar and is equally typeable from a bare text
client. The dedicated cockpit layout is a *skin* over that command
stream, not a parallel path.

**The server owns the draft; the client owns the layout.** The server
holds an unordered `EnrollmentDraft` and reports which fields are still
`missing` — it has no notion of a "current step" or cursor. The client
decides how to chunk the fields into screens. This split is deliberate:
a single-page variant of char-gen (for A/B testing) is a pure client
change, touching no server code.

## The post-login branch

When a connection authenticates, `Login` takes the `Interactive` and
branches on the user's character count (`Login.enter`,
`Login.ts:116`):

- **0 characters** → char-gen. `Login` runs the `enroll` flow itself
  (it's a real `CommandGiver`), accumulating picks in an
  `EnrollmentDraft` until `enroll confirm` commits a fresh `Avatar`.
  `Login` then destructs.
- **≥1 character** → the character-select roster. `Login` emits a
  `session.identity.roster` frame and stays alive, awaiting a
  `play <playerId>` (handled by `PlayController` → `Login.playCharacter`)
  or an `enroll` to mint an additional character. Multichar is on:
  signup creates **zero** avatars, so char-gen is the only path to a
  first character, and the roster is the hub thereafter.

Signup no longer provisions a default Avatar template — an abandoned or
disconnected char-gen leaves no playable character and no orphaned
template, because nothing persists until the commit's atomicity boundary
(below).

## `Login`: CommandGiver + Sensor + accumulator

```
const LoginBase = CommandGiverMixin(SensorMixin(HasInteractiveMixin(Idea)));
```

`Login` (`Login.ts:80`) is three things at once:

- A **`CommandGiver`** with a tight verb allowlist —
  `self: ['charactergen/enroll.yaml', 'charactergen/play.yaml']`
  (`Login.ts:90`). No world verbs leak into char-gen.
- A **`Sensor`**, so engine/narrative frames (welcome prose, enrollment
  narration, the char-gen state payload) reach the bodiless `Login` and
  render in the client. Sensory (modality-tagged) frames do **not**
  reach it — `Login` has no body, so smell/sound/sight channels have no
  receiver. This is what lets the same `MessageApi.scene(...).toSelf(...)`
  machinery serve a player who isn't yet embodied.
- The **home for the in-progress `EnrollmentDraft`** — a transient,
  never-persisted scratch object (`Login.ts:97`,
  `getEnrollmentDraft`/`setEnrollmentDraft`).

A locationless giver **dispatches** rather than being silently dropped:
the dispatch location guard was relaxed game-wide so `Login` (which is
intentionally placeless) can run verbs. Verbs that read location degrade
to an empty result rather than being gated; the embodied-avatar path is
unchanged. See [command-routing.md](./command-routing.md).

### `EnrollmentDraft`

The accumulator (`Login.ts:52`) carries the picks plus presentation
scratch: `speciesKey`/`speciesPath`/`speciesCommonName`, `sex`, `name`,
`surname`, `pronouns`, `aspiration`, the current name `suggestion`, the
caller's `realName`/`accountName` (from `resolveNames` — the OAuth/Twitch
display name, surfaced so the client can show "signed in as …"). It is
pure data; all validation and mutation lives in the controller.

## The `enroll` verb: a draft state machine

`EnrollController` (`obj/command/charactergen/EnrollController.ts`) is a
**field-keyed draft state machine**. The core is a `FIELDS` table
(`EnrollController.ts:136`) — one `FieldHandler` per settable field:

```
const FIELDS: Record<CharGenField, FieldHandler> = {
  species: { applicable, isSet, options, validate, apply },
  sex:     { … },
  name:    { … },
  pronouns:{ … },
  aspiration: { … },
};
```

`CharGenField` is `'species' | 'sex' | 'name' | 'pronouns' | 'aspiration'`
(`types/src/index.ts:936`). A `FieldHandler` knows how to: decide if the
field `applicable` to the current draft (sex only applies to a sexed
species), report whether it `isSet`, produce its option list, `validate`
a value, and `apply` it to the draft.

`execute` (`EnrollController.ts:479`) dispatches on the rest-of-line:

- **bare `enroll`** → re-emit the full draft state (no mutation).
- **`enroll <field> <value>`** → `FIELDS[field].validate` then `apply`,
  then re-emit the full state. This is **live-fire**: each field-set is
  its own command, applied and reflected immediately.
- **`enroll confirm`** → gate on `computeMissing(draft, cfg)`
  (`EnrollController.ts:272` — the `FIELD_ORDER` fields that are
  applicable but not yet set). If anything is missing, emit a
  field-scoped error; otherwise `commit`.

There is **no `currentStep`, `activeStep`, `goBack`, or `promptFor`** —
those belonged to the retired step model. Navigation is the client's
job. `species.apply` is idempotent: re-setting the same species is a
no-op, but *changing* species clears the now-stale downstream picks
(name/surname/sex) and refreshes the suggestion.

### Idempotent / order-free semantics

Because field-sets are commands and commands from one giver can arrive
back-to-back, the substrate is order-free and idempotent. The pipeline
also depends on **per-socket inbound serialization** (`Backend.ts`): a
single client's messages process in arrival order, never interleaved.
Without it, two concurrent `enroll` commands would each clone the one
`EnrollController` template and the second would trip
`StuffApi.clone`'s in-flight cycle guard. See
[connection.md](./connection.md).

## The wire payload

Every `execute` ends by emitting a `session.identity.state` frame
carrying a `CharGenStatePayload` (`types/src/index.ts:1004`) — the whole
picture, every time:

```
interface CharGenStatePayload {
  picks: CharGenPicks;            // what's chosen so far
  speciesOptions: CharGenOption[];
  sexOptions: CharGenOption[];    // empty ⇒ field N/A (non-sexed species)
  pronounOptions: CharGenOption[];
  aspirationOptions: CharGenOption[];
  suggestion?: { name; surname? };
  accountName?: string;
  missing: CharGenField[];        // drives the client's gating
  error?: { field; message };
}
```

The payload is **layout-agnostic**: option lists for every field, the
accumulated picks, and the `missing` set. The client renders whatever
screens it wants from this — it never asks the server "what step am I
on?" A `CharGenOption` carries `value`/`label`/`description`/`image` and,
for species, a `SpeciesDossier` (below).

## ⭐ Forward compatibility — read this before rebuilding the client

Char-gen is scheduled to be **replaced** by the lineage model (pick a
household from a gallery; species and aspiration demote from *fields* to
*filters*; a point budget appears) — see
[lineage-slate](../slates/builds/lineage-slate.md). That work is
**deferred behind the client rebuild**, so the question for anyone
building char-gen now is narrow: *what makes the replacement cheap
later?*

This section is the answer. It is written for the client-build agent.

### What is already right — do not regress it

The architecture is **server-authoritative and layout-agnostic**, and
that is precisely why lineage can be mostly a server change:

- every pick is a real command (`enroll <field> <value>`), dispatched
  through `executeCommand` like any other verb — **no bespoke char-gen
  protocol**;
- the server re-emits the **whole state** after every change;
- there is **no notion of a current step** — flow and layout are entirely
  client-side;
- `missing[]` drives completion gating, so the client never encodes which
  fields exist or in what order they are required.

⭐ Any new client must keep all four. A client that tracks its own step
index, or that knows the field order, re-couples the flow and makes
lineage a rewrite.

### ⚠ What will break — the payload is not actually generic

Despite being called layout-agnostic, the payload **names every field
twice**:

- `CharGenField` is a **closed union of five** (`species | sex | name |
  pronouns | aspiration`);
- `CharGenStatePayload` carries **one option array per field**
  (`speciesOptions`, `sexOptions`, `pronounOptions`,
  `aspirationOptions`), and `CharGenPicks` one key per field.

So **every new char-gen concept is a `types` change plus a client
change** — which is exactly the cost lineage would pay, repeatedly.
`CharGenStage.tsx` already carries the smell: an `optionsFor(field)`
switch, a `FIELD_HEADING` record keyed on the union, and an
`ILLUSTRATED_FIELDS` set. The component is *already* written as
"iterate fields, render each"; the switch exists only to adapt a payload
that should have handed it a list.

### ⭐⭐ The one change worth making now

Generalize the payload to a **field list with a renderer discriminator**:

```
interface CharGenFieldState {
  field: string;              // no longer a closed union
  kind: 'choose-one' | 'text' | …;   // which renderer to dispatch to
  label: string;
  applicable: boolean;        // replaces "sexOptions is empty ⇒ N/A"
  options?: CharGenOption[];
  value?: unknown;
}

interface CharGenStatePayload {
  fields: CharGenFieldState[];
  missing: string[];
  …
}
```

This is **justified by the rebuild on its own terms** — it deletes the
adapter switch, the heading record, and the illustrated-fields set, and
is strictly less client code than five bespoke pickers. It needs **no
lineage design decisions**, so it can land now without waiting on
anything.

The payoff is that lineage's new surfaces become *additive*: a new
`kind`, a new renderer, no change to the shell.

### The three interaction kinds lineage needs and this model lacks

Today char-gen can express exactly one interaction: **choose one of a
closed list**. Lineage needs three more, and they are the reason `kind`
matters more than the field list does:

| interaction | what it needs |
|---|---|
| **the gallery grid** | multi-column comparable rows, not `label` + `description` — the player compares households at a glance ([lineage-slate](../slates/builds/lineage-slate.md) § *It is a form, rendered two ways*) |
| **filters / query** | re-requesting the option set (species, trade, locality, aspiration-as-query) rather than picking from a fixed one |
| **budget allocation** | a constrained numeric allocator with a shared pool — not a pick at all |
| **reroll** | an *action with a cost*, which has no representation today |

⭐ **`SpeciesDossier` is the good precedent to copy.** It is a generic
`{heading, rows:[{label,value}]}` structure explicitly so "the client
renders them generically without knowing the field taxonomy." The
gallery card wants exactly that shape one level up — **structured rows
the client renders without knowing what a household is.** Build the grid
renderer generically and it will survive the schema settling later.

### ⚠ The dossier's in-world read path — checked 2026-08-11

The lineage slate adopts a rule that applies retroactively:

> **Char-gen must not be able to say anything the world cannot later
> confirm.**

**Designed: yes.** The wiki is the intended home.
`SubjectKind = 'template' | 'mixin' | 'command'` and a species *is* a
template, [wiki.md](./wiki.md) names species among the encyclopedia's
nouns, and its reveal table carries an explicit `Species` row whose
*left open* column — *"the natural history a field guide prints — diet,
lifespan, circadian band, vision, scent, reproduction, sentience"* —
is almost exactly the dossier's **Biology** section.

**Built: no.** `SpeciesApi.buildDossier` has exactly **one caller**,
`EnrollController`. No verb reads it, nothing bridges it to the wiki, and
the seeded wiki content is lore / snippet / guide / main — **no species
pages**. The wiki is community-maintained, so today the in-world path
exists as a schema and is empty of content.

⚠ So the rule is not *violated* (the data has a designed home) but it is
not *satisfied* either. The cheap fix, whenever the wiki or a `species`
lookup gets attention, is to let the same `buildDossier` output render
into a wiki template page — one caller becomes two and the promise is
kept.

### ⚠ The dossier drops the reveal level on the wire

`buildDossier`'s **Composition** section prints `Density` and `Edible`,
both of which carry `spoiler: 1`.

⚠ **This is not a leak, and it matters to say why.** The contract is
declared on `fieldMeta` in `lib/mixin.ts`, not by the wiki, and level 1
means **collapsed by default, not forbidden**:

> *"level 1 is collapsed by default rather than forbidden, so tagging a
> measurement costs a reader one click instead of locking them out."*

The doc is explicit that reclassifying density and hardness to level 1
was only coherent **because** that reader rung exists. So any player can
open these; the dossier is not showing secret data.

**The real gap is structural.** `spoiler` is declared on the field
precisely so it travels *"wherever it surfaces — a wiki panel, the
Studio, help, a future codex."* But `DossierSection.rows` is
`{ label, value }` — **no level.** The reveal level is dropped at the
char-gen boundary, so a client *cannot* collapse a level-1 row even if it
wanted to, and char-gen renders expanded what every other surface renders
collapsed.

⭐ **The fix is a wire-type change, not a content decision:** carry the
level on the row (`{ label, value, spoiler? }`) and let the renderer
collapse. That is cheap, it is the same generalization the rest of this
section argues for, and it puts char-gen back inside the model rather
than beside it.

The Biology, Classification and Anatomy sections are all level 0.

### ⚠ What is genuinely unfinished: reveal answers appetite, not epistemics

Worth recording so it is not rediscovered as a bug. The reveal model
answers *"does this reader want to be spoiled"* — an **appetite** axis,
resolved by a click. It does not answer *"does this character know
this"*, which is an **epistemic** question and has no substrate.

The deferred [identification-slate](../slates/tails/identification-slate.md)
(`analyze X with Y`, real Material chemistry, partial identification,
misidentification) is the other half — knowledge as something *earned*,
per-viewer, rather than revealed by preference. The two can coexist, but
only if it stays clear which is which: a collapse toggle is not a lock,
and a lock is not a collapse toggle.

Until that lands, char-gen showing material properties is a *presentation*
inconsistency and nothing more.

## Commit + spawn

`commit` (`EnrollController.ts:620`) is the only step that persists. The
sequence, in order:

1. **Build the per-character overlay** (the picks over the shared seed
   at `Avatar.SEED_TEMPLATE_PATH`). **No per-player template row is
   written** (the identity doctrine — ref-shapes.md § Identity,
   lineage, and backing): the character's durable state is its
   persistence-spine snapshot, not `domain` data.
2. **Register ownership — the atomicity boundary.** Push `playerId`
   onto `user.playerIds` and `user.save()`. Nothing before this entered
   the roster, so a crash mid-char-gen leaves no trace.
3. **Clone the runtime Avatar from the SHARED seed** with the overlay
   riding `StuffApi.clone`'s `dataOverlay` and the minted identity path
   via `asTemplatePath` (`postRegister` stamps identity, installs the
   baseline implant, self-places at the app-config spawn, and captures
   the FIRST snapshot — the moment the character becomes durable).
4. **Set sex** on the live avatar (species-constrained, so applied after
   the species is in place to avoid hydration-order coupling).
5. **Dress in the aspiration's themed outfit** — best-effort: each
   garment is cloned, moved onto the avatar (`ContainmentApi.move`), and
   its body-plan slot claims occupied (`SlotApi.occupyAll`), narrowed
   with `MixinApi.isContainable`/`isWearable`/`isSlotted`. Missing
   garments or slot mismatches are skipped (content may lag).
6. **Hand off**: `ConnectionApi.transfer(interactive, avatar)`, then
   `avatar.enter(interactive, { firstArrival: true })`, then destruct
   `Login`.

`Avatar.enter`'s `firstArrival` flag selects the greeting: a fresh
"Welcome, *name*." for a just-created character vs. "Welcome back,
*name*!" for a returning login (`Avatar.ts`). On the client, entering
the world from char-gen (or the roster) clears the terminal buffer so
the `enroll …` echoes don't bleed into the world; a reconnect keeps its
scrollback (`store/index.ts` `setConnected`).

## Species substrate consumed by char-gen

`Species` (`lib/species/Species.ts`) is a `Visible` template (it speaks
the standard `shortDescription`/`longDescription` surface — the old
`defaultDescription` was subsumed — and carries an `illustration` key,
the kind's portrait). char-gen reads:

- `commonNames` — the roster keys/labels (`'human'`, `'elf'`, …).
- `sexDeterminationSystem` — non-empty ⇒ the species is sexed ⇒ the
  `sex` field applies and offers male/female.
- `nameBankKeys` — references to one or more `NameBank` Documents that
  feed the name suggester.
- `illustration` — the bucket-relative key for the species portrait,
  surfaced on `CharGenOption.image` (the 3:4 detail-pane slot). The client
  resolves it via `MEDIA_BASE_URL`; see [media.md](./media.md).
- `getBodyPlanPath()` / Material path — drive the **species dossier**:
  the scientific binomial, the Linnaean classification ladder (derived
  from the taxonomic template path), and anatomy/composition lines. This
  is the showcase of the depth of the world model, rendered in the
  species detail pane.

**The dossier and the illustration are presentation, not controller
logic.** The dossier is built by `SpeciesApi.buildDossier(species, path)`
(`api/species.ts`) — a readout of the species model, not picker code;
`EnrollController` only pre-warms a per-species card (`{ dossier,
illustration }`) and surfaces it, staying about draft state (read the
choices, write the picks).

### The name suggester + `NameBank`

`NameBank` (`lib/species/NameBank.ts`) is a `Document` in its own
`name_banks` collection — **not** inlined on the `Species` template (a
shared "common human" bank can back several species). It holds `given`,
`surname`, and `style` pools. `NameBank.resolve(keys)` unions the pools
for the species' `nameBankKeys`. Banks are installed from the
`@saxonberg/content-species-and-names` content pack
(`content/name-banks/<key>.yaml`, file name = bank key) by the `PackApi`
`name-banks` content kind — see
[content-packs.md](./content-packs.md).

The suggester runs on `Species`: `suggestName(realName)` biases the
pick by the player's real/account name (e.g. same initial), and
`rerollName()` produces a fresh draw. `EnrollController.refreshSuggestion`
regenerates the suggestion onto the draft on species-change and on
`enroll name reroll`. Names support keep / re-roll / type-your-own and
reject values failing the validation rules (length, Unicode letters,
single internal hyphen/apostrophe, no digits/spaces).

### `PersonaMixin`

`PersonaMixin` (`lib/character/Persona.ts`) carries the **claimed
self-narrative** layer — two persistent fields on `Character` (so PCs
and any future storied NPC have them): `bio` (free-form authored prose)
and `aspiration` (the closed-choice of who you're becoming). The
aspiration seeds the starter `bio`, selects the themed outfit, **and
seeds the chronicle's `claim` prologue** (a parallel `claimSeeds` field,
distinct from `bioSeed`) at commit. `Persona` also affords the
**`chronicle`** self-view verb (the partitioned bio → prologue → deeds
readout — see [chronicle.md](./chronicle.md)). `Persona` is **not** for
witnessed deeds (those are chronicle `deed`s), perceived body description
(`Visible`), or proper-name identity (`Named`). `bio` *editing* still
defers to Wave 2 (a `records` verb); the deferred `records` *view* role
shipped as `chronicle`.

## The cockpit phases (client)

The client `connectionPhase` (`store/index.ts:47`) is a four-state
machine: `'unauthenticated' | 'character-select' | 'char-gen' |
'in-world'`. The `session.identity.roster` frame routes to the
character-select roster; `session.identity.state` flips to the
char-gen stage and drives it; `session.link` (always
carrying an avatar) is the unconditional in-world flip.

`CharGenStage.tsx` owns the layout. A `SCREENS` config
(`CharGenStage.tsx:457`) chunks the fields into screens —
species · sex+pronouns · name · aspiration · review — with client-side
Back/Next navigation. Card clicks live-fire `enroll <field> <value>`;
the name field flushes `enroll name <given> <surname>` on blur/Next
(deduped); the review screen's confirm fires `enroll confirm`. Continue
and Back are pure client pagination and send no command. Because the
server is layout-agnostic, the whole screen set is reconfigurable
client-side (the single-page A/B variant).

## History

The intake substrate shipped in the char-gen Wave 1 build
(branch `feature/char-gen-wave1`, GitLab #21 / MR !49). The original
build used a server-driven **step model** (`ENROLL_STEPS` / `currentStep`
/ `activeStep` / `goBack`); a late re-architecture (commit `6942674`)
replaced it with the field-keyed draft state machine + client-owned
layout documented here, so single-page vs. multi-step is a pure client
concern. That commit also added per-socket inbound serialization (the
concurrency fix the single-controller dispatch surface needs) and the
first-arrival greeting / terminal-clear-on-handoff polish.

Deferred to later waves: the `records` verb (bio *editing* — its *view*
role shipped as the `chronicle` verb, see [chronicle.md](./chronicle.md)),
vitals/language, the lounge and onboarding flow, and the name sanitizer
(the denylist is a seeded stub today). (Breadcrumbs were renamed and
shipped as the chronicle identity ledger.)
