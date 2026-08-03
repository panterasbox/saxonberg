# lib/ vs obj/ taxonomy — requirements

`mud/lib/` and `mud/obj/` have drifted into an unprincipled split. The
architecture doc calls `lib/` the "Standard Model — Stuff hierarchy +
mixins per subsystem" and `obj/` "instantiable game objects", but the
seed tree contradicts it: **410 of 828 templates resolve their `class:`
to a `/lib/` module**, and **254 seed templates plus all 70
content-pack templates live at `/lib/…` template paths**. A `Topic`, a
`Discipline`, a `Weapon` and a room are all cloned from `lib/` today.
The distinction has stopped carrying information — you cannot tell from
a path whether something is substrate or content.

This build restores the split as a load-bearing invariant, on both axes
(TS class placement *and* template path), and makes it checkable by the
build rather than by convention.

No seeding slate — this is an engineering reclassification, not new
substrate (`workflow.md` §1 admits "a fresh idea not yet sloated"). The
ideation input was a full classification pass over every template and
every Stuff-descended class in the tree.

Load-bearing context:
[architecture.md](../architecture.md) (the `lib/`-vs-`api/` layering and
the file-structure tree), [CLAUDE.md](../../CLAUDE.md) (Module
Categories, File Naming Conventions, the backing-class-mirrors-template-path
convention), [templates.md](../subsystems/templates.md) (the clone
pipeline that reads `class:`), [content-packs.md](../subsystems/content-packs.md)
(the pack `content/lib/` convention this build changes), and
[persistence.md](../subsystems/persistence.md) (the stored
`templatePath` refs the migration must rewrite).

## The rule

> **`/obj/` holds anything instanceable** — anything a template's
> `class:` resolves to — including instanceable classes that are
> further specialized. **`/lib/` holds substrate that is only ever
> inherited**: abstract roots, mixins, value objects, and framework
> machinery that attaches to Stuff without being Stuff-shaped content.

Stated the user's original way — "things you clone are in `/obj/`,
things you inherit are in `/lib/`" — with one amendment forced by the
data: inheritance alone does not pull a class into `lib/`.
`obj/Chair → obj/FoldingChair` and `obj/Receptacle → obj/UnboundedReceptacle`
already exist and are correct; a concrete class specializing another
concrete class is ordinary OO. Only classes that are *never* instanced
belong in `lib/`.

The invariant this yields, and which this build makes literally true:
**nothing instances `/lib/`.**

## Goals

- Every template in the repo — seeds, content packs, and already-seeded
  Mongo rows — resolves its `class:` to a module under `/obj/`.
- No template path lives under `/lib/`. The `seeds/lib/` tree and the
  packs' `content/lib/` tree are gone.
- The backing-class-mirrors-template-path convention holds end-to-end
  for every moved class.
- The invariant is **enforced by the build**, not by convention: a lint
  fails when a template's `class:` resolves under `/lib/`.
- Existing databases — the live box and every dev DB — keep working
  across the move, via a migration that rewrites both the stored
  `class:` and the stored `path` on `domain` rows and every durable
  `templatePath` reference elsewhere.
- `lib/` is left holding only substrate: abstract roots, mixins, value
  objects, and the named framework exceptions below.
- No template declares a `hydratorClass` it has no use for, and the
  build prevents the redundant declaration coming back.

## Non-goals

- **No behavior changes.** This is placement and naming only. No class
  gains or loses a method, mixin, or field. A template that cloned
  successfully before clones successfully after, with identical
  runtime shape.
- **No `api/` ↔ `lib/` reshuffling.** The layering question
  ([architecture.md §api/ vs lib/](../architecture.md)) is orthogonal
  and untouched. `obj/api/*Logic` singletons keep their documented
  template-name exception (`obj/api/PartyLogic.ts` → `/obj/api/party`).
- **No authoring of missing content.** Classes that are authorable but
  unseeded (`Window`, `HaulingCreature`, `SphericalLocation`,
  `SphericalZone`, `Ticket`) move to `obj/` without gaining seeds.
  Writing those templates is content work for whatever build demands
  them.
- **No `domain/` reorganization.** Domain content keeps its paths;
  only the `class:` values it points at change.
- **No new subsystem docs.** This build updates existing docs; it does
  not graduate a new one.

## Surface decisions

### Scope covers both axes, in one migration

**Decision:** move backing classes *and* template paths, together.

The deciding fact: `SeederManager` is **insert-only, keyed by path** —
*"the seeder inserts into `Collections.Domain` ONLY when no document
exists at that path… Schema migrations on already-seeded templates are
out of scope."* The `class:` string lives in the Mongo row, and that
stored value is what `StuffApi.loadClassByPath` resolves at runtime.
So moving a class file breaks every already-seeded row that still names
the old module — **a class-only move needs a migration too.**

Since a migration is required either way, deferring the path axis buys
nothing and costs a second migration against live data plus an interim
state where `/lib/`-pathed templates are backed by `/obj/` classes.
Doing both at once is one script with two extra field mappings.

Content packs are the easy half: `PackApi` **reconciles** rather than
insert-only, so pack rows self-heal once the pack's `content/` tree and
`class:` values move.

### `obj/` layout: flat by default, cluster at three

**Decision:** moved classes land flat at `obj/<Name>.ts`; a
`obj/<cluster>/` directory is created only where **three or more**
cohesive classes land together — the existing `obj/instrument/`
precedent (10 files). Template paths mirror.

Rejected: mirroring `lib/`'s subsystem folders wholesale, which would
create ~30 directories, roughly half holding a single file. Also
rejected: pure flat, which takes the `obj/` root from 70 to ~144 files.

The eight clusters this yields:

| Directory | Classes |
|---|---|
| `obj/equipment/` | Armor, Garment, Handcart, Pack, PortableLight, Shield, Weapon |
| `obj/modalities/` | the seven `*Modality` singletons |
| `obj/location/` | CartesianZone, FurnishableRoom, SphericalLocation, SphericalZone |
| `obj/species/` | BodyPlan, Clade, Species |
| `obj/magic/` | GlowlightOrb, SparkSource, Spell |
| `obj/corpo/` | Brand, BrandedBottle, Corpo |
| `obj/persistence/` | EncryptedStringMarshaller, PersistentHydrator, QuantityMarshaller |
| `obj/sandbox/` | CircleFloor, SandboxCrossing, WireBody |

A subclass lands beside its base when the base clustered. The remaining
~44 classes land flat.

### Eleven classes are both cloned and inherited

**Decision:** where the base is genuine substrate *and* is being cloned
generically, **split** — the abstract base stays in `lib/`, a new
concrete class in `obj/` absorbs the generic clones. Where the base is
concrete and merely has a specialization or two, **move both**.

Split (base stays in `lib/`, new concrete class in `obj/`):

| Base (stays) | Clones | New concrete class |
|---|---|---|
| `lib/stuff/Thing` | 11 | `obj/Prop.ts` — the generic prop (gutter-litter, rations, anvil, toilet) |
| `lib/location/CartesianLocation` | 37 | `obj/location/Room.ts` |
| `lib/npc/NPC` | 8 | `obj/NPC.ts` |
| `lib/stuff/Vessel` | 1 | `obj/Vessel.ts` |
| `lib/boundary/Exit` | 2 | `obj/Exit.ts` |
| `lib/material/Material` | 24 (pack) | `obj/Material.ts` |
| `lib/biome/Biome` | 3 (pack) | `obj/Biome.ts` |
| `lib/creature/Creature` | 1 | `obj/Corpse.ts` — see below |

Move whole (base and its single subclass both go to `obj/`):
`lib/equipment/Weapon` (→ StunBaton), `lib/equipment/Garment`
(→ DisguiseGarment), `lib/craft/ToolItem` (→ Whetstone).

`Creature` is the odd one: its single clone is `/lib/mortality/corpse`,
and `Creature` is mid-spine substrate (`Agent → Creature → Character`).
Rather than a generic concrete creature, the corpse gets a real
`obj/Corpse.ts` — a corpse is a game object, and the forensic-Creature
role is already documented in
[mortality.md](../subsystems/mortality.md).

`obj/Prop.ts` names the generic-`Thing` clone target because a class
literally named `Thing` in `obj/` extending `Thing` in `lib/` reads
badly. Naming is redlineable at plan time; the split is not.

### Classes that are instanced but never stamped stay in `lib/`

**Decision:** the test is **does an instance carry a template-path
stamp**, not "is it ever `new`'d".

A class minted anonymously as an internal fixture — never authored,
never addressable by path — is not content, and moving it to `obj/`
would weaken the rule rather than serve it.

Stays in `lib/`: `BoundaryAnchor` (a fixture on its boundary),
`SandboxCrossingExit` (minted by the crossing), and `LightningStrike`,
whose own source states the case — *"a strike is a transient
single-use vessel — minted, conducted, and reaped inside this one
call, never authored, never persisted… A template would be a seed row
nothing ever edits."*

Moves to `obj/` because it *is* stamped: `Party`
(`PartyLogic` calls `setTemplatePath(rec.path)`) and `EvalScript`
(`ScriptLogic` does the same).

### `Shadow` is a named framework exception

**Decision:** `lib/stuff/Shadow` stays in `lib/` permanently and is
documented as an exception, not an oversight.

Shadow is part of the Stuff framework: it attaches to any Stuff, models
nothing on its own, and is never template-backed — despite carrying its
own identity. This is a third `lib/` category alongside abstract roots
and mixins, and it must be written down so the next sweep doesn't
"fix" it.

### Authorable-but-unseeded classes move anyway

**Decision:** a class designed to be hydrated from a template moves to
`obj/` even with no seed yet — `static fieldMeta` plus a documented
authoring path is sufficient evidence of intent.

`Window` is the exemplar: its header says it is *"template-loadable
like `Door`"*, and the declarative-content integration test authors it
as a template and clones it via `StuffApi.singleton`. `Door`, its
sibling, already ships two seeds. Same for `HaulingCreature` (its
header: *"Cast templates set `class: /lib/character/HaulingCreature`…"*),
`Ticket`, `SphericalLocation`, and `SphericalZone`.

`ExitableVessel` is the one deferral — it has no `fieldMeta` and no
documented authoring path. It stays in `lib/` until a consumer demands
a concrete `obj/` class.

### The framework trio moves

**Decision:** `PersistentHydrator`, `QuantityMarshaller` (30
templates) and `EncryptedStringMarshaller` move to
`obj/persistence/` like everything else.

They are persistence machinery rather than game objects, which made
them the natural candidate for "an `/obj/` template legitimately backed
by a `/lib/` class". Rejected: they are instanced from templates, so
the rule applies, and a carve-out here is the loophole that lets the
next one through. `Shadow` is the exception precisely because it is
*not* template-instanced.

### The `hydratorClass` declaration is audited both ways

**Decision:** drop `hydratorClass` where it does nothing, and gate both
failure directions with lint.

`hydratorClass` is **already optional** (`hydratorClass?: string`), and
`StuffApi.clone` step 5 is explicit: *"When absent, no hydration step
runs — templates that want generic mixin-field copy must opt in."* So
no schema change is needed; this is a data-hygiene pass over the files
the codemod is rewriting anyway.

The audit (real YAML parse over all 838 templates) found the surface is
narrower than it looks, and asymmetric:

| | Count |
|---|---|
| Declares `hydratorClass`, has real `data` — load-bearing, keep | 580 |
| Declares `hydratorClass`, `data` empty or absent — **redundant, drop** | 8 |
| No `hydratorClass`, no `data` — already clean | 249 |
| No `hydratorClass`, **but has real `data`** — silently discarded | 1 |

The 8 redundant ones are all the stateless-singleton shape: the
`HelpCatalogue` / `RecipeCatalogue` catalogues, the `BulletinBoard` and
`CentralBank` singletons, the three `*Update` singletons, and
`EncryptedStringMarshaller`.

**Command controllers are already clean** — all 217 are `class:` +
`data: {}` with no `hydratorClass`. They are the largest stateless
family and needed no change; noted here so the question isn't
re-opened.

Dropping the declaration anywhere with a non-empty `data` block is
**forbidden** — absent means no hydration, so it would silently discard
authored content. The empty-`data` test is the criterion, not a guess
about whether the backing class "has state".

### One unreferenced `obj/` class is deleted — not five

**Decision:** delete `LitterBin`. Keep `Candle`, `Lamp`, `Sextant` and
`Sundial`.

The original decision was to delete all five, on the strength of a scan
that looked only for `new X(` and template `class:` references. That
scan was wrong: it saw neither `instanceof` nor imports. Re-checked
properly:

| Class | Verdict |
|---|---|
| `LitterBin` | zero references anywhere, tests included — **delete** |
| `Candle` | fixture for 6 test suites (`VisionModality.shadow`, `LightSource`, `Door.light`, `SmellModality`, `Window.integration`, its own) — **keep** |
| `Lamp` | fixture for 5 suites (`SwitchController`, `AnalyzeLightController`, `VisionModality`, `Window.integration`, its own) — **keep** |
| `Sextant` | live `instanceof` gate in `MeasureAltitudeController` — **keep** |
| `Sundial` | live `instanceof` gate in `MeasureShadowController` — **keep** |

Deleting `Sextant`/`Sundial` would break the `measure altitude` and
`measure shadow` verbs. `Candle` and `Lamp` are not dead code — they
are the canonical light-source and switchable-device exemplars the
perception, light, and device suites are built on.

What all four *do* lack is a **template**, so no player can obtain one.
That is a content gap, not a placement problem, and authoring those
templates is out of scope here (see Non-goals). Recorded so the next
audit doesn't mistake them for dead again.

## Constraints

- **`SeederManager` stays insert-only.** Do not "fix" it to upsert as a
  shortcut around the migration — its insert-only contract is what
  makes hand-tuned template rows survive restarts. The migration is a
  separate, explicit, one-shot script.
- **The migration must be idempotent and re-runnable**, and must run
  against a DB in either state (pre-move or already migrated) without
  corrupting rows. It runs against the live box
  (`mud.panterasbox.com`), so it needs a dry-run mode reporting what it
  would change.
- **Durable `templatePath` references must all be found.** At minimum:
  `domain` (`path` and `class`), `holder_snapshots` (`PersistedRecord.scope`
  and container refs), `parcels`, and `chattel` (`Estate` entries).
  Persistence slices marshal Stuff refs as templatePath strings, so the
  sweep must cover marshalled field values, not just top-level columns.
- **`lib/paths.ts`'s `TemplatePaths` registry** is the single source of
  truth for well-known paths and must move in lockstep with the seeds.
- **The pack content convention changes.** `PackLogic.readContent`
  reads `pack.contentRoot/lib`; that becomes `obj`, and both shipped
  packs (`@saxonberg/content-base-library`,
  `@saxonberg/content-species-and-names`) move their trees. Packs
  reconcile, so no pack data migration is needed — but the format
  change is breaking for any out-of-tree pack.
- **Import-statement style**: no `.js` extensions; ~5,258 relative
  imports resolve into `lib/` today and many will be rewritten.
- **No new module categories.** Every moved file must still land in one
  of the CLAUDE.md Module Categories. If a moved class doesn't fit,
  that is a signal to stop and discuss, not to invent a category.
- **`obj/api/*Logic` keeps its exception** — module-id and template
  path deliberately differ there.
- Existing CI gates must stay green: `lint:gates`, `lint:imports`,
  `lint:boundary`, `lint:module-scope`.

## Acceptance criteria

- No file under `mud/seeds/lib/` and no `content/lib/` directory in
  either shipped pack.
- No `.yaml` in the repo has a `class:` value beginning `/lib/`.
- A new CI-gating lint (the `lint:gates` family) fails when a
  template's `class:` resolves under `/lib/`, and is wired into the
  same script set. Deliberate `lib/` residents are not exempted by a
  list — they are simply never named by a template.
- The same lint fails on **both** `hydratorClass` defects: a
  declaration on a template with empty/absent `data` (redundant), and
  a non-empty `data` block on a template with no `hydratorClass`
  (silently discarded). The 8 redundant declarations are gone and the
  one discarded-data template is resolved.
- `pnpm build`, `pnpm test`, `pnpm lint` and every `lint:*` gate pass.
- The migration script exists, has a dry-run mode, is idempotent, and
  has tests covering: a pre-move DB, an already-migrated DB, and a DB
  containing a hand-edited row at a moved path.
- A dev DB seeded **before** the move boots clean **after** it, with
  no template-resolution errors in the log.
- Verified by driving, not only by suite: log into a migrated world and
  confirm a moved-class object still clones and behaves — at minimum a
  Topic route, an equipment item, and a room.
- Docs updated: `CLAUDE.md` (Module Categories, File Naming
  Conventions, the mirror convention), `architecture.md` (the
  file-structure tree and the `lib/` three-flavors list, which gains
  the framework-attachment category `Shadow` occupies),
  `content-packs.md` (the `content/obj/` convention), and every
  subsystem doc that cites a moved path.
- The stale reference in `lib/boundary/Window.ts` — its header cites
  `class: '/lib/perception/Window'`, a path that does not exist — is
  corrected as part of the move.
- `Shadow`'s permanent `lib/` residency and `ExitableVessel`'s
  deferral are both recorded in `architecture.md`, with reasons.

## Cross-references

- No seeding slate — fresh engineering cycle
- [architecture.md](../architecture.md) — layering, file structure, export discipline
- [CLAUDE.md](../../CLAUDE.md) — Module Categories, File Naming Conventions
- [templates.md](../subsystems/templates.md) — clone pipeline, Hydrator, `class:` resolution
- [content-packs.md](../subsystems/content-packs.md) — pack format, reconcile installer
- [persistence.md](../subsystems/persistence.md) — `holder_snapshots`, `PersistedRecord`
- [ref-shapes.md](../ref-shapes.md) — identity/lineage/backing doctrine
- [antipatterns.md](../antipatterns.md) — the sieve for placement calls
