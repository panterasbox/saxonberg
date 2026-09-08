# The lint family

The build-time gates. Each is a script under
`packages/server/scripts/check-*.ts`; together they are the enforcement
layer that keeps the conventions in `CLAUDE.md` and
[antipatterns.md](./antipatterns.md) from being merely written down.

## ⭐⭐ The roster is DERIVED, and runs as one gate

```bash
pnpm -C packages/server lint:family          # every gate, all failures
pnpm -C packages/server lint:family --list   # the roster
pnpm -C packages/server lint:family --bail   # stop at the first failure
```

`lint:family` reads `package.json` and runs **every `lint:*` script
except itself**. There is no list to maintain: adding a gate makes it
run in CI, in the pre-merge sweep and locally, automatically.

⚠ **Why it is derived.** On 2026-09-03 the enumerated lists had drifted
badly: **25 gates existed, CI ran 19, `CLAUDE.md` documented 13, and the
`/finalize` skill named 3.** Four gates that `CLAUDE.md` explicitly
called *"CI-gating"* — `lint:gates`, `lint:boundary`, `lint:census`,
`lint:locations` — were in no pipeline at all, plus `blessed-bands` and
`perishable` which nothing ran anywhere. All six passed when finally
run, so nothing was broken; it was **unenforced**, which is the same
class as *gates ship broken and silently pass*. Enumeration is what
rotted, so enumeration is what got removed.

## ⭐ The pattern these gates share: census, then ratchet

The strongest gates here started as a **burn-down meter** and became a
**ratchet**. `lint:object-verbs` describes itself as exactly that: it
counted every Api static whose first parameter is a world object
(338 of them), the sweep drove it to 0, and the gate now holds it there.

That is the reusable shape for any antipattern worth removing:

1. Write a census that counts it.
2. Gate **today's count as the ceiling** — it may fall, never rise.
3. A refactor build's acceptance is *count N → 0*, and the gate flips
   from ratchet to zero.

Step 2 is the affordable part: a new antipattern can be stopped from
growing the day it is noticed, without being fixed first.

---

## Architecture & call security

- **`lint:gates`** — every concrete `FromModule`/`FromController`
  string and `*_MODULE_ID` constant resolves to a real module + export.
  A script rather than an ESLint rule because ESLint 8's legacy config
  can't load a local rule without `--rulesdir`.
- **`lint:imports`** — the driver/mudlib import boundary: nothing under
  `src/mud/` imports outside the tree (Node built-ins included) except
  the Api tier, which imports and wraps. `import type` is exempt
  everywhere; the built-in and npm allowlists are enumerated so a
  widening is a deliberate edit. The per-file exception registry is
  **empty** — ask before adding the first.
- **`lint:module-scope`** — module scope declares; lifecycles
  initialize. No import-time executable statements in `src/mud/**`, with
  two sanctioned exceptions (branch registration, an Api's trailing
  `decorateApiClass`).
- **`lint:pm`** — the persistence lockdown: `PersistenceManager.get()`
  only through the `PersistApi` facade or a sanctioned framework
  boundary.
- **`lint:boundary`** — the sandbox boundary's exemption lists, checked
  by the build: every exempt template path resolves to a real seed row,
  and the symmetric vs inbound-only method sets stay disjoint. It
  deliberately does not judge whether an exemption is *justified* —
  that is a review call.
- **`lint:thin-forwarder`** — no Api method that only forwards to a
  parameter's own method.
- **`lint:object-verbs`** — the OO-conventions census: a verb whose
  subject is a typed world object lives **on the object**, not as
  `XApi.verb(host, …)`. Two enumerated lists (`EXEMPT_APIS`,
  `NON_SUBJECT_TYPES`) live in the script so a widening is a visible
  diff.

## Content, templates & vocabulary

- **`lint:instanceable`** — **nothing instances `/lib/`.** Six
  invariants over every template: no `class:` resolves under `/lib/`,
  no template path lives there, every `class:` resolves to a real
  module + export, every `hydratorClass:` to a real row, no redundant
  `hydratorClass`, and no orphaned `data` (a data block with no
  hydrator, whose keys `clone()` silently discards). No exemption list,
  by design.
- **`lint:census`** — every template-path-valued field in every shipped
  row resolves to a real row, and `clone()`'s `asTemplatePath` channel
  stays retired. A path naming no row cannot be edited, addressed or
  zoned.
- **`lint:untitled`** — every shipped template path under a claimed
  root lies within some pack's `requires.title` claim. The title roots
  are **derived** from the claims themselves, so a new root needs no
  kernel edit. An unclaimed path is one nobody can ever edit.
- **`lint:locations`** — three checks over the location vocabulary: the
  `FurnishableRoom` roster and the minted `CartesianLocation` roster are
  enumerated (adding a row is a design question a reviewer should see),
  and structurally, **a zone row that zones nothing fails**.
- **`lint:schema`** — the collection ↔ schema doc ↔ record class ↔
  subsystem doc link. Six assertions, including that every
  `static collectionName` is `Collections.X` and never a literal (this
  failed on 11 classes when written) and that the three generated tables
  are current.
- **`lint:topics`** — topic-vocabulary totality: every emitted topic key
  resolves to an **authored** descriptor and every root is one of the
  seven. The catalogue *derives* a plausible descriptor for an unknown
  key, so without this a typo fails silently — 45 of 105 emitted topics
  had no authored descriptor when the gate was first run. Resolution is
  **file-scoped first**; a tree-wide table once resolved a name against
  an unrelated file.
- **`lint:descriptors`** — descriptor banks stay disjoint from the
  materials vocabulary. A collision is a **parser ambiguity bug**, and
  it fires in both directions, so a new material colliding with a
  shipped descriptor is caught too — the direction nobody checks.
- **`lint:arg-kinds`** — affordance honesty: every object-typed slot
  declares `requires:` (a Mixins-registry name, or `any` for
  deliberately unconstrained). An undeclared arg makes the verb menu
  assert things the controller will refuse — `attack` on a chair — and
  the client is forbidden from re-deriving semantics, so a wrong figure
  on the wire is a wrong figure on screen. Also fails on any spec it
  cannot **parse**: an unreadable spec silently shrinks every total.
- **`lint:field-meta`** — field metadata is ONE field-keyed static: no
  legacy `persistentFields` / `fieldMarshallers` / `instructionFields` /
  `globIdentityFields` returning, every entry well-formed. Registration
  only validates classes it loads; this sees the whole tree.

### `lint:condition-arms` — the ratchet that ships before its build (2026-09)

⭐⭐ **The strongest census this family has, because it was written
*before* the work it governs rather than after.**

`VitalsMixin.reconcileConditions` is one method containing **seven arms**,
each added by a different build, each discriminated by *which optional
field happens to be set on the record* — traumas · shocks · sustained ·
decayingMagic · infections · progressing · dyings. An eighth mechanism
(`Metabolic.reconcileToxinConditions`) keeps its state outside the
condition collection entirely and mirrors a band into `stage`, which is
why `progressAffliction` has to explicitly skip rows carrying a
`toxinBehavior`: two mechanisms owning one field.

⚠⚠ **The trap has already been sprung once, with a comment proving it.**
The `progressing` arm's own docstring records that `ProgressionSpec` *"was
authored by three rows, and was read by nothing… This is the arm that
fills it."* Somebody found a declared-and-unread field and **added an
arm** — and `signature`, `resolution` and `contagion` are three more such
fields, which the
[consequence build](./slates/builds/consequence-slate.md) is about to
wire. So the gate ships in that build's **W0**, before any of it.

The rule it enforces: a condition's **progression law** (decay · logistic
· stage · integrate · countdown · burden) and its **effect** on the body
are independent. A new condition kind needs a law plus a `signature`,
never a new arm.

⭐ **The definition is a census of MECHANISMS, not of loops**, and getting
that wrong is instructive: the first cut counted `MagicLogic.execRelieve`
(the dispel selection) and `AssessController.execute` (the readout), both
of which genuinely discriminate the collection and iterate it, and neither
of which advances anything. An arm must also *progress state over time* —
either it sits in a `reconcile*` method or its loop references a game-time
cursor. The fixture pins both halves, must-fire and must-not-fire.

Measured **7** on `design/consequence` before any build work; ceiling set
there. It may fall, never rise. `KNOWN_PARALLEL_STORES` is enumerated in
the script so a second parallel store is a visible diff.

### The identity build's three (2026-09)

Each guards a failure that is **closed and silent** — the family's
recurring shape.

- **`lint:dispositions`** — an authored `dispositions:` seed naming an
  axis that does not exist is written, read back, matched against
  nothing, and contributes to no trait position. Measured before it
  existed: **five authored valences across four rows landing nowhere.**
  It also catches an out-of-band valence, which the estimator clamps — so
  an authored 500 reads as 100 and nothing says so. ⚠ A **move**, not an
  invention: `lib/npc/tree.ts` already validated the same vocabulary for
  dialogue guards, at one seam, for one consumer.
- **`lint:identity`** — the world must agree with the prose. A proper
  name on an `Extra`; a definite article on an `Extra` (or an indefinite
  one on a nameless `Cast`); a `Cast` row instantiated twice (which
  `SingletonMixin` would turn into a *boot* failure, worse to debug); a
  dossier on an `Extra`; and ⭐⭐ **a sentient `Extra` that answers to
  nobody** — if hurting something is a crime, the victim must be
  *someone*.
  ⭐ The rung is resolved **from the class FILE**, not from a list: a
  row's `class:` resolves through `classFileOf` and its `extends`
  expression is walked through its own imports until `CastMixin` turns
  up. So a combination written tomorrow is covered the day it is written.
  ⚠ The first draft used `cls.endsWith('/Cast')` and silently missed
  every pack-owned character class — five people the census counted as
  not existing.
- **`lint:dossiers`** — ⭐ **assert-vs-derive.** `Competence.seedRunFor`
  is run for real and its fold compared to the author's `asserting:`.
  This is the only thing stopping a dossier drifting back into a stat
  sheet, because *a declared value cannot disagree with itself and a
  seeded history can*. Also: a dossier with no `archetype:` (the stamp is
  **unrecoverable later**), an unknown Discipline, a band outside its
  vocabulary, and a **census-then-ratchet** on dossier-less `Cast` rows —
  censused at 33, driven to **0** by the content pass in the same build.

⚠ `lint:dossiers` deliberately does **not** fold renown: its derive is
not a pure function of its seeds (AppSettings' value function, the Emote
documents' valences, the world clock), so the build-time fold that makes
the competence check worth having is unavailable. Vocabulary is checked
here; the arithmetic at seed time, where `RenownApi.seedTo` writes
nothing at all if it cannot reach the band.

⭐ `composesMixin` / `classPathOfFile` live in `scripts/pack-roots.ts` —
the family's shared reader — because both new gates need to answer *does
this class compose X?* from the class file.

## Domain honesty — the gates that buy a narrowing

These exist because the failure they prevent is **silent and looks
configured**.

- **`lint:does-nothing`** — materials-response legibility: no
  construction or implement that does nothing.
- **`lint:inert-weapon`** — no seeded weapon derives an inert profile.
- **`lint:combat-dynamics`** — the combat engine branches on physics;
  dynamics come through hooks.
- **`lint:blessed-bands`** — composing `Blessable` obliges you to author
  it: a template whose class carries the mixin must carry a working that
  authors band variation. Before it, a cursed item could be cursed in
  name only — it reported its band, `remove curse` worked on it, and
  nothing said the axis was inert. ⭐ The only honest way to skip BUC is
  to not compose the mixin.
- **`lint:perishable`** — every row made of matter that can rot is a
  class that can rot. Perishability belongs to the **Material**, not the
  class, which argues for composing `FreshnessMixin` as widely as
  possible — and it was, first onto `ThingBase` (all 152 `Thing`
  classes) then onto `Prop`, putting five spoilage methods on the author
  surface of a rock. The answer was that a food class already existed
  (`Provision`) and four rows were on the wrong one. ⚠ **This gate is
  what buys that narrowing**: a perishable material on a class that does
  not compose the mixin would simply never rot, silently. ⚠⚠ Its textual
  class walk was blind twice over until 2026-09-06 — it read only the
  first identifier of an `extends` clause (missing a mixin-wrapped base)
  and it matched the mixin name inside COMMENTS, so every bare `Thing`
  row passed on a comment saying the mixin is deliberately NOT there. See
  [spoilage.md](./subsystems/spoilage.md).
- **`lint:world-scan`** — MQL is how you search: no bespoke
  `getAllObjects()` scans.

## Tests

- **`lint:test-bootstrap`** — anything touching the wired runtime
  imports `test-bootstrap`. Fails only in the cheap direction; a
  redundant import is free because the bootstrap is once-guarded.
- **`lint:test-bootstrap:verify`** — …and that the gate can *see* every
  file vitest runs. Scanning only `*.test.ts` silently missed two
  `.test.js` files, and the check meant to catch that was itself
  filtered through `grep test.ts` — so it confirmed the undercount
  instead of exposing it. This asks vitest directly, unfiltered, across
  **every** config: the server's two **and each capability pack's own**.
  ⚠ It asked only the server's two until 2026-09-03, so all 80 pack test
  files read as phantoms and the gate failed on master — while those
  suites were running and passing the whole time (a pack ships its own
  `vitest.config.ts` + `test` script; root `pnpm -r test` runs them).
  The walk side had always read `packSources()`; now both sides do.
- **`lint:test-content`** — kernel tests naming shipped content
  (`/world/<locality>`) are a **shrinking allowlist**: a listed one
  warns, a new one fails, and a listed path that no longer offends is
  stale and fails too.

---

## Where the family runs

| moment | what runs |
|---|---|
| CI (`validate` stage, MR-only) | `pnpm lint` then `lint:family` |
| the pre-merge sweep (`/finalize`) | `lint:family`, treated as a blocker |
| locally, mid-build | whichever single gate the change touches |

⚠ The family is cheap relative to `pnpm test` (~15 min) and is the
right thing to run often. See [testing.md](./testing.md) for the suite's
own cost model.
