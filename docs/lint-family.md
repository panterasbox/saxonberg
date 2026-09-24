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

### ⚠⚠ Three ways a census lies, all three paid for in 2026-09

**1. A classifier that reads the NAME instead of the thing.** The
`lib/` statics sweep filed 40 rows as *"inline and delete"* from their
caller counts; reading the bodies, **5 actually were**. It filed 15
`isX`-named functions as vocabulary guards; they were pure arithmetic
that had landed there by their prefix. It warned that `TravelNodes.of`
had *"~129 call sites, check before touching"*; it had **zero** — the
grep had counted the `TravelNode` TYPE. And `check-formulae` shipped
counting mixin FACTORIES as single formulas, because a factory's body is
an entire class.

> ⭐ **A census's classifier must read the thing it classifies.** A
> signature scan is a way to find candidates, never a disposition — and
> a count derived from one is not evidence, so say so when you publish
> it.

**2. A ratchet whose own test pins the number.**
`check-lib-statics.test.ts` asserted `expect(LIB_STATICS_CEILING)
.toBe(392)` under the title *"holds a ceiling that may fall and may
never rise"* — so the one thing a ratchet exists to permit was a failing
test. The gate could not see the disagreement, because `--lint` reads
the constant while the test kept a copy; four lowerings passed it and
only the full suite found the pin.

> ⭐ **A ratchet's test asserts the INVARIANT, not the number** — at or
> below the high-water mark, and above zero. Then a sweep lowers the
> constant and touches nothing else.

**3. A gate that has never been seen to fail.** `lint:binder-models`
reported zero the moment it was written, which is indistinguishable from
a gate that cannot report anything. It was proved by reverting a real
fix and watching it fire, and then pinned with fixtures that assert the
POSITIVE — a violation is found — not merely that a clean tree is clean.
⚠ This repo has shipped broken gates that silently passed before.

---

## Architecture & call security

- **`lint:gates`** — every concrete `FromModule`/`FromController`
  string, every `FromTemplateMethod('<template>', '<method>')` **pair**,
  and every `*_MODULE_ID` constant resolves to a real module + export.
  A script rather than an ESLint rule because ESLint 8's legacy config
  can't load a local rule without `--rulesdir`.
  ⭐ **The method half is the one that earns its keep.** A mistyped
  module id makes a gate that admits nobody, which fails loudly the
  first time somebody tries it; a mistyped METHOD name does the same
  thing while looking correct in the policy list, and the reads
  `FromTemplateMethod` guards are the ones whose silent denial reads as
  *"the world has no banks"*. The template half knows the one
  deliberate naming exception — a logic singleton registers at
  `/platform/idea/api/<feature>` while its class is `<Feature>Logic.ts`.
  ⚠⚠ It also refuses a **`#Name` suffix naming a DEFAULT export** — a
  default-exported class's module id is the bare path, so the suffixed
  form denies everybody forever while reading correctly. That one had
  shipped: six posture verbs had never worked over the wire, and 225
  unit tests passed either way because they call the mixin methods
  directly where `SelfOnly` admits them.
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
- **`lint:lib-statics`** — ⭐ the other half of the same invariant.
  ⭐⭐ **The question is: does the static answer something about the TYPE
  or about the WORLD?** Type-level — construction (`Quantity.of`), a
  guard over the type's own closed vocabulary (`Construction.isForm`), a
  lookup of it (`Currency.all`) — **stays on the value class** and is
  documented: the projection admits it as a `value-static`, its own
  consumer kind. Those were never the antipattern; being *invisible* was.
  World-level logic (`Freshness.growthRate`, `CombatNarration.narrate`)
  belongs on a `platform/idea/api/<X>Logic.ts` logic singleton with the
  subsystem's Api forwarding — the split `CLAUDE.md` already calls
  mandatory. Census-then-ratchet, **ceiling 337** (opened at 563; the 2026-09 sweep drove it down — `LIB_STATICS_CEILING`) across the kernel's
  `lib/` and `platform/` plus every pack's `src/`: the population may not
  grow while the sweep moves the world-level half out. ⚠ Statics inside a
  mixin factory's returned class expression are out of scope by
  definition — they are reached through the composed host, which is a
  different question. See
  [value-object-statics-slate](./slates/builds/value-object-statics-slate.md).

**So the ~50 world-level statics in Api-less subsystems stay where they
are**, and the ratchet stops at ≈50 + the type-level population instead
of at 0. That is a floor with a name and a reason, not a shortfall:
`lint:lib-statics` records it, and the number falls to 0 when the
normalization pass gives those systems faces (from the lib-statics
dossier, 2026-09).

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
- **`lint:committees-are-players`** — ⭐ no group that holds title enrols
  an NPC (economic bootstrap, retrofit gate 1). A committee IS whoever
  holds title; committees are players only — a committee assignment is
  governance, a position is a job. Reads every manifest's
  `requires.title[]` `{group}` holders against every manifest's
  `requires.groups[].members[]` (a claim may name a host's group) and
  reports any member id with an `/agent/` segment that is not a player's
  `/platform/agent/Avatar/…`. Ceiling **0**: Walter and Katie — the two
  NPC seats 1.0 shipped — became staff of Organizations in the commit
  that added the gate.
- **`lint:no-authored-faucet`** — ⭐ no authored number becomes money
  (economic bootstrap, retrofit gate 2; the institutions slate's rule).
  Three populations summed: an `openingCapital:` key in any shipped row;
  the three retired settings keys (`banking.onboardingStipend`,
  `banking.openingCapital`, `banking.openingFloat`) wherever a
  `settings/*.yaml` still declares them; and every code line in the
  kernel or a pack `src/` that posts a `mint` or issues coin, attributed
  to its enclosing function and matched against a `file#function`
  allowlist naming exactly the sites the requirements permit — the two
  rules (`reconcilePerpetualImpl`, `windowAdvanceImpl`), the recorded
  override (`overrideImpl`) and the harness seams (`issueCashImpl`,
  `issueCash`, `mint`; a call to them from anywhere else counts). Census
  10 at W3 of the bootstrap; **0** at W6, where the gate holds.
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
  declares `requires:` (a mixin name — the kernel registry's **or a
  capability pack's own**, since the 2026-09-14 federation — or `any` for
  deliberately unconstrained). An undeclared arg makes the verb menu
  assert things the controller will refuse — `attack` on a chair — and
  the client is forbidden from re-deriving semantics, so a wrong figure
  on the wire is a wrong figure on screen. Also fails on any spec it
  cannot **parse**: an unreadable spec silently shrinks every total. And
  on a required mixin with no refusal phrase — `MixinRefusals` for a
  kernel one, `static _mixinRefusal` for a pack's, because a pack cannot
  edit a kernel const.
- ⭐⭐ **`lint:binder-models`** — a controller test that builds its model
  **by hand** skips the binder, so the day a view DECLARES an object arg
  the test still compiles, still passes, and the controller reads
  `undefined` in production. The gate joins each view's
  always-bound args (`required: true`, or ⭐ optional **with a
  `default:`** — the shape that actually bites) to every test that
  constructs that controller and passes an object literal to `.execute`.
  ⚠ Its ceiling is 0 and the point is **not** that it stays there: it is
  that declaring a new object arg RAISES the census, so the gate fails
  in the same commit and the tests are fixed there. Written after
  `consign` gained a `shelf` arg and three suites — including a BRAIN
  suite, which nobody had thought to check — shipped broken for several
  commits behind a note in a slate.
- ⭐⭐ **`lint:mixin-names`** — the gate on the **flat mixin namespace**.
  A mixin is addressed by a reserved name in one global namespace, which
  survived only because that namespace was the kernel's alone. It stopped
  being so when `requires:` was federated, so this checks three things:
  **no duplicate `_mixinName`** across the kernel tree and every pack's
  `src/` (ceiling 0); **no declaration the reader cannot resolve** — a
  literal, a same-file const or `Mixins.<Key>`, because the runtime's own
  reader resolves exactly those three and a fourth form would be a mixin
  nothing could name; and **every KERNEL name present in the `Mixins`
  const**, which CLAUDE.md already claimed and nothing verified —
  `BodyPlanSlotsMixin` and `SeatedDrivableMixin` had been missing from it
  long enough that no `requires:` could name either.
  ⭐ It is also the **trigger** the design decision is waiting on:
  path-addressed mixins were declined because a TS type predicate cannot
  be path-addressed (156 irreducible `isX` narrowings), with the revisit
  condition recorded as *"two packs collide on a `_mixinName`"*. The day
  this gate fails for real, the flat namespace has actually broken. See
  `docs/slates/builds/content-packs-slate.md` § RESOLVED.
- **`lint:field-meta`** — field metadata is ONE field-keyed static: no
  legacy `persistentFields` / `fieldMarshallers` / `instructionFields` /
  `stackIdentityFields` returning, every entry well-formed. Registration
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
[consequence build](./slates/tails/consequence-slate.md) is about to
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

Measured **7** on `design/consequence` before any build work; **5** after
the consequence build's W8a collapsed `decayingMagic` + `infections` +
`progressing` into one arm dispatching on the row's declared
`progression.law`. It may fall, never rise. ⭐ What remains is four
genuinely different mechanisms — integrate (trauma) · circuit (shock) ·
pull (sustained) · countdown (dying) — plus the one affliction arm;
driving it lower would mean unifying mechanisms that really are distinct.
`KNOWN_PARALLEL_STORES` is enumerated in the script so a second parallel
store is a visible diff.

### `lint:spell-cost` — a published science with no reader (2026-09)

⭐⭐ **The rules were binding, and the flagship spell broke them by a
factor of forty-five.** `docs/arcane-science.md` rule 1 says magic *moves
and rearranges* and does not manufacture energy; rule 6 caps efficiency at
`η ≤ 1`. Neither had a reader anywhere in the tree, and `firebolt`
authored `cost: 20` — 20 kJ committed — against `joules: 900000`
delivered. Worse, the **content had been tuned to the violation**: the
practice dummy's mass carried a comment explaining that it was chosen so
one firebolt's deposit would carry it past oak's autoignition point, and a
test held that in place.

The gate walks every `Spell`-class row in every pack and holds the
violation count at **zero**, on the census-then-ratchet shape.

⚠⚠ **Channel-aware, and a flat `η ≤ 1` would have been worse than no gate
at all** — it would make a heat pump illegal, and rule 4 explicitly
requires one:

| shape | the check |
|---|---|
| **delivery** — `joules` on a depositing channel (`heat`) | `joules ≤ cost × 1000 × η(channel)`, η from the price list |
| **cooling** — `channel: cold` | ⚠ **not** an η check (a COP above 1 is what a heat pump *means*). The row must declare `costModel: {kind: heat-pump}` — the machine-readable form of rule 4's *"cooling has no fixed price"*. A flat-cost cold spell is itself the physics error. |
| **no `joules`** — twelve of thirteen shipped spells | outside its jurisdiction. `energy` is an abstract covering-fold token, not a quantity of anything, and checking it against joules would be the dimensional mistake the gate exists to prevent. |

⭐ The η table lives in the script beside its doc citation rather than in a
row, which is a known duplication — a later build may lift it so the wiki
and the gate read one source (`capability-magic-slate`).

### `lint:conditions` — the value gate the effect channel needed (2026-09)

⭐ **The third of the trio, and it exists because the consequence build's
own new surface could reintroduce the failure it was written to end.**

Since the eight-arm unification a `Condition` row declares **how its stage
advances** (`progression.law`) and **what carrying it does**
(`signature`). Both are YAML, and both fail closed and silent when wrong:
a **missing or misspelled law** falls through the arm's switch and the
condition never progresses — authored, warmed, afflicted, read, inert; an
unknown effect `kind` is skipped by the interpreter; a `vital` effect
naming a sign that does not exist is a no-op.

⚠⚠ **That last one is why the gate has to exist**, because a *deliberate*
no-op is a real feature: a bloodless clade absorbs a bleed effect
silently, on purpose (D22). An accidental one is **indistinguishable from
it in play**. Only a build-time check can tell them apart.

⭐ Both vocabularies are **read out of their own source files by text** —
not imported (pulling `Vitals.ts` into a script drags the mudlib decorator
machinery in and dies at module load) and not copied (which is how a gate
silently stops matching). The reader throws rather than passing if it
cannot find the literal.

`lint:unconsumed-seams` counts fields nothing reads; this counts fields
whose *value* nothing can read. Same failure class, other end.
A `progression: null` row is fine and common — five shipped rows have a
driver outside the condition collection that owns their clock.

### `lint:unconsumed-seams` — the sibling census: declared and unread (2026-09)

⭐⭐ **The gate `lint:condition-arms` implies.** The arm census counts what
a build *added* when it found a dead field. This one counts the dead
fields, so the next build has the number in front of it rather than
having to notice.

It counts two shapes across the kernel **and every pack's `src/`**:

1. **An unread authored field** — a `static fieldMeta` key on a data Idea
   under `platform/idea/**` (not `cmd/`, not `api/`) that no other file
   reads. ⚠ **A write is not a consumer.** The Hydrator sets every
   persistent field by reflection and a YAML row authoring a value is the
   *supply* side; what makes a seam real is somebody reading it.
2. **An un-overridden extension hook** — a `@hook`-tagged **terminal**
   (empty body, or `return` of a bare constant, or an interface contract)
   that nothing anywhere composes.

⭐ **Body shape is what separates the two things `@hook` marks**, and it
is the whole difficulty of the gate. `Combatant.onDefeated` is a no-op
terminal nothing composes — dead surface. `Detailed.applyDetails` is a
Hydrator applier with a real body, invoked by name through reflection: no
textual caller, no override, and perfectly alive. "Zero overrides" alone
cannot tell them apart.

⚠ **The read surface is DERIVED, never guessed.** The first cut reported
38 seams and twelve were false, from three shapes: a `protected _foo`
read through `getFoo()`; a boolean read through its predicate-form getter
(`respires` → `isRespiring()`, which no name derivation reaches); and an
interface hook the mixin implements *in the same file*. The fix was to
stop deriving the accessor's name and instead ask which methods actually
read `this.<field>`. All three are pinned in the fixture.

⚠ Neither class is a bug on its own — a hook one wave ahead of its first
consumer is good sequencing. This is a **ceiling**, not a zero-gate: what
it refuses is the *accumulation*, where the authored surface grows faster
than the engine that honours it and a row that says what the author wants
is silently ignored.

Measured **21** on `design/consequence` before any build work.
⭐⭐ **Seventeen of the twenty-one are combat**: `Combatant` (7),
`CombatReactive` (6) and `CombatVenue` (3) are the three `@hook` surfaces
[combat-hooks.md](./subsystems/combat-hooks.md) calls *"the wizard-facing
combat extension grammar"* — and **not one is composed by anything that
ships**, in the kernel or in any of the 43 packs. The grammar is
complete, documented, and spoken by nobody. `KNOWN_EXTENSION_ONLY` is
**empty on purpose**, so the first allowlisting is a diff somebody has to
defend.

### `lint:instrument-args` — an instrument is an ARGUMENT, not a search (2026-09)

⭐⭐ **Found in review, not by a gate — which is why it became one.** A
controller needed the thing its verb acts *with* (the stones, the
furnace, the clamp) and hunted for it: walk the room's contents, narrow
by type, take the first hit.

```typescript
// BAD — the controller re-deriving what the binder already resolves
const mill = room.getContents().find((c) => c instanceof GristMill);
```

`buy.yaml` already carried the fix, in a comment left by whoever made it
there: *"WHERE you are buying from, DECLARED rather than re-derived. The
controller used to hunt for a counter itself; now the binder resolves it
like any other object and the controller just reads it."* The shape had
been removed once and grew back, which is the definition of something a
gate should hold.

**Two costs, and the second is silent:**

1. **The instrument becomes unaddressable.** A room with a hand quern
   *and* a water mill hands you whichever the walk hits first, and no
   sentence a player can type changes it. A declared arg gets `mill the
   wheat at the quern` for free.
2. ⚠⚠ **The walk almost always narrows on a CLASS.** `ComminutingMixin`
   is kernel substrate for exactly one reason — the metal chain's stamp
   mill is its second consumer, in a pack with no ancestor in common —
   so `instanceof GristMill` silently refuses to find the very thing the
   mixin was lifted to the kernel *for*. The mixin query finds both.

⚠ **Why `lint:world-scan` did not catch it, and is right not to.** These
walks are **bounded** — one room, one inventory — so there is nothing for
that gate to fire on. This is a different rule: not *"you may not be
handed the world"* but ***"resolution belongs to the binder."***

**The gate is deliberately narrow.** It fires only where both hold: the
receiver is the actor or their surroundings (never an object the
controller was already handed), **and** the type test is applied to the
**candidate** rather than to the receiver.

⭐ That second condition is the whole difference between a gate and a
nuisance. The first cut matched anywhere in a three-line window, so the
near-universal guard

```typescript
if (!MixinApi.isContainer(giver)) return null;
for (const item of giver.getContents()) { /* …read its contents… */ }
```

read as a type-narrowed search and produced **a third of the census as
false positives** (25 findings, of which 11 were noise). A gate that
cries wolf teaches people to ignore it, which is the mirror image of the
failure this family already knows — gates that ship broken and silently
pass.

Asking an object you already hold for its own contents is the
`ask-the-owner` rung and is always fine: `pit.getContents()` for the
charge inside the clamp, `counter.getContents()` for what is on the
shelf.

**Census 14 → 0, in the build that wrote the gate**, in three kinds of
fix — and each names a different thing that was missing:

1. **Five were expressible all along.** `check` and `consign` hand-rolled
   a keyword match against inventory — the binder's own job — three lines
   below a comment saying the *rack* was "bound by the view, not hunted
   for here". `char`, `stake` and `smelt` wanted a fixture by class or
   mixin.
2. ⭐ **Seven needed a word the query language did not have.** Every one
   asked *"which thing here can do job Y"* and the bracket vocabulary had
   only kinds of thing, so **`[capability.X]`** was added to close them.
   Before it, declaring an arg would have bound any tool at all and then
   failed the verb's own check — the "fix" would have been a regression.
3. ⭐⭐ **Two needed a different SHAPE of arg.** `scry`'s instrument was
   an *option* (options carry no `default:`), and its walk did something
   a singular arg could not survive: **try each candidate until one can
   reach *this* target**. `type: objects` keeps both — the binder
   resolves every candidate, the controller asks each about the pair.

⭐ **The general lesson.** When resolution looks like it has to live in a
controller, the honest question is usually *what can the view not say
yet* — a missing atom, or a plural — rather than *this one is special*.

⚠ A controller may still narrow on **state** after the binder resolves
**identity**: `bake` checks lit + fuelled, `sharpen` checks unbroken,
`scry` checks reach. No predicate expresses those, and pretending one
could would be the worse lie. The gate watches for the walk, not the
check.

4. ⭐⭐⭐ **Twenty-six more were hiding behind a base class — the day
   after the ratchet closed at zero.** A design conversation about the
   capability vocabulary traced its consumers and found
   `ManualBuildController.findCapability` and `findBuildVessel`: the
   same walk, hoisted into the shared base so that **24 controllers
   across seven packs** hunted through a method call the census could
   not see. The walk had a shape the gate did not know — spread the
   surroundings into an accumulator, then loop — and five more
   controllers had written it directly (`eat`'s cutlery, `wash`'s water,
   `dye`'s bath, `butcher`'s blade and block, `measure figure`'s book).
   The gate learned the shape, the count went **0 → 13 → 0**, and every
   fix was the same: a plural arg with a default, and the controller
   narrowing on the one thing no predicate asks — best rate, clean,
   holds water, holds dyestuff, bladed.

   ⚠⚠ **And it found a shipped defect the walk had been covering.**
   `hammer ingot` had *always* been refused — the arg said `requires:
   DurableMixin`, which no `Ingot` satisfies — and the verb only ever
   ran through the fallback walk, which the wire suite triggered by
   naming a word (`glowing`) that matched nothing at all. A hunt is not
   merely unaddressable; it hides the view being wrong, because the
   view is never exercised.

   ⭐ **A ratchet at zero is only as honest as the shapes it knows.** The
   number had been reported as closed for a day while the pattern was at
   its widest. The lesson is not "gates lie" — it is that a new gate's
   first census is a hypothesis about what the antipattern looks like,
   and the second reader should go looking for the shape it missed.

### `lint:authored-prose` — a player's sentence may not carry YAML escaping (2026-09)

⭐⭐ **The gate a live browser walk bought, and the argument for it is
the failure it caught.** Five reading rows across four packs shipped an
unquoted YAML scalar opening with an escaped quote:

```yaml
instrumentNoun: \"a surveyor's compass or a miner's dial"
```

so the backslash and the quotes went *into the string*, and a prospector
asking what he needed was told

> It wants \"a surveyor's compass or a miner's dial".

⚠⚠ **Neither the suite nor the wire drive could see it.** A content row's
value is never parsed again, never compared, never rendered through a
template — it is pasted into a sentence and shown to somebody. And the
wire checkpoint covering that exact line matched `/compass/`; `compass`
IS in there, wrapped in junk. **A substring assertion is blind to
everything it is not asserting on, which is most of the sentence.**

The check is narrow on purpose — a properly double-quoted value may
contain whatever it likes, and a block scalar is not a quoting context —
and the ceiling is **0**: the census over the whole content tree came
back clean once the five were fixed, so it starts where it ends.

### `lint:capabilities` — a capability kind is minted by a CONSUMER (2026-09)

⭐ **The open vocabulary has a contract, and this is it.** A capability
(`digging`, `anvil`, `shaker`) is the third axis of what a thing is —
a mixin says what it IS, `commandContributions` says what it AFFORDS,
`capabilities:` on a tool row says what it OFFERS, a role in somebody
else's work. It is the only one of the three that is **row data**, which
is the point: a realm's bespoke bone saw writes `capabilities: [cutting]`
and the tailor's `cut` finds it, with no class and no kernel list edit.
So the kernel keeps no list, and neither does this gate.

What it keeps is the rule the openness rests on: **a kind exists because
something consumes it** — a recipe slot (`toolCapabilities:`), a view's
instrument arg (`[capability.X]`), or a controller's read
(`hasCapability('X')`, `paceMs(…, ['X'])`). Instruments *declare* kinds;
they never *mint* them. Two directions:

1. **required-never-declared — ceiling 0, forever.** A recipe or verb
   wants a kind no row and no class offers: a dish nobody can ever make.
   It is the **data** link of the four reachability links and it fails
   silently. The first run found one — `boil` paced on `['pot',
   'cauldron']` and nothing anywhere offers `cauldron`, because a
   cauldron row would declare `pot` (the *role*), which is the doctrine.
2. **declared-never-consumed — census, then ratchet, and the ratchet
   closed the same day.** A row offers a kind nothing asks for. The
   first census said **4**, and the four were three different things —
   which is the useful part:
   - `assay-scale` and `winning` were the **scanner's** miss: the mine
     archetype's `needs: { tool: winning }` is a consumer
     (`Archetype.ts` reads it with `hasCapability`) and the census had
     not counted archetype slots. A gate's first census is a hypothesis
     about who consumes; the fix was to the gate.
   - `prying` on the pinch bar was a **role with no verb** — nothing
     bars down loose ground yet. The tag came off; the row says why and
     that the kind returns with the verb.
   - `watering` on the watering can was a **kind standing in for a
     class** — the row's own comment said *"what the can IS"*. `water`
     binds any carried vessel with water in it (a bucket too), so the
     can's role is its class's affordance, not a capability. The tag
     came off, and `water`'s source became a declared arg with a `me:i`
     default while it was open (the last `for … of giver.getContents()`
     hunt in the tree, which `lint:instrument-args` had not fired on
     because it type-tested nothing — it read the contents).
   Ceiling **0**.

⭐ **The listing is the catalogue.** `pnpm -C packages/server
lint:capabilities --list` prints every kind with who offers it and who
wants it — the derived catalogue an author reads before minting
`slicing` beside an existing `cutting`. It is generated from the census
and never hand-maintained, so it cannot drift; the vocabulary stays open
and stops being undiscoverable.

⚠ Tests count for neither side. A fixture minting `blender` proves the
mixin, not the vocabulary. And a consumer's argument must be a literal
or a same-file `const` — a kind computed at runtime is not a kind the
catalogue can show anyone.

### `lint:verb-collisions` — two views, one verb, and one of them is gone (2026-09)

⭐⭐ **The failure it exists for shipped, and nothing noticed.** The
consequence build added `platform/cmd/work/watch.yaml` for standing a
guard's post. `platform/cmd/stream/watch.yaml` had claimed `watch` since
the streaming build. **Both are afforded from `self`** — the streaming
one off `Avatar.commandContributions`, the new one off the born-with
credential wallet — so the new view shadowed the old for **every
character alive**:

```
help watch              → "WATCH: Stand a guard's post"
watch twitch.tv/shroud  → declined: no-watch-claim
```

⚠⚠ Not a test, not a lint, not the boot. A shipped feature simply became
unreachable by its own name, in a project whose market thesis is
livestream communities, and it surfaced only because somebody asked what
the new verb was for.

**What it counts:** every `verbs:` entry across every pack's command
views — ⚠ *every* pack, not just the capability ones, because a locality
ships domain-local verbs and collides just as hard. Aliases count
(`verbs: [job, jobs]` claims both). Controller rows under
`<root>/idea/cmd/**` are skipped by the shipped path rule.

**Measured nine already shipped**, so it is an **allowlist with a reason
per row** rather than a zero — and it ratchets **both ways**: a fresh
collision fails, and a fixed one still listed also fails, because a list
nobody prunes stops meaning anything.

⚠ Only `lease`/`unlease` is understood safe (domain-local, two different
localities, never afforded together). The other seven — `me`, `pour`,
`hang`, `mount`, `dress`, `drive`, `butcher` — are **undiagnosed**: the
census measured which verbs are claimed twice, not which of them actually
shadow, or in which direction. ⭐ `dress` is the instructive one — *dress
a wound* and *dress a carcass* are both correct English and both correct
game, which is why "just rename one" is not automatically the answer. The
alternatives are one view with subcommands, or a rename; **never a new
line in the allowlist.**

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

### `lint:ground` — what is every room standing on? (2026-09)

Two lists and five clauses (`scripts/check-ground.ts`).

**List 1** (`--report`) is derived: every one of the **139 Location rows**
and how its ground is decided — an authored floor row, a `floor:` spec on
the room, `noDefaultFloor`, or the default floor resolving its own material.
⚠ Rung 3 of that ladder, *the ground beneath*, cannot be resolved
statically: it needs a zone-citation walk and a seed off the covering
Locality's address, both runtime facts. So an on-grade default reads
`default:on-grade` — *a `GroundSource` answers this, or the outdoor dial
does* — and the drive is what reads them out loud.

⭐ **The Location count is 139, not 184.** The plan's opening figure counted
`/platform/idea/location/*` ZONE rows with the rooms. 139 Locations + 57
zones.

**List 2** is hand-curated, and the docblock states the inclusion test so it
can be argued with: *the prose names a floor material or construction, and
the room authors neither.* 28 entries, against **66** the `--seed` heuristic
proposed. What curation removed is the interesting part — idiom (*"rooms let
by the floor"*), similes (*"a ledger the size of a paving slab"*), **a trade
FLOOR being a room and not a ground** (six goods-yards rows are *named*
`…/location/floor`), other things made of boards (bulletin boards, a price
board, boards over a shaft), dust and sawdust, a detail's own floor, and
⭐ rooms this build now ANSWERS (the mine's workings read their host rock
through rung 3; that is the mechanism working, not a debt).

⚠ Coverings — rugs, carpets, matting — are deliberately **excluded**, with
their own seam on the field-substrate slate. A covering is not what a floor
IS, and listing them would make one meter measure two debts.

**The clauses.** (a) the list may fall and never rise; (b) every listed path
is a real Location row, so the list cannot fill with ghosts; ⭐ (c) **a
listed row that now authors a floor FAILS** — the debt is paid, so delete
the line and lower the ceiling, and the gate refuses to let the credit go
unrecorded, which is what makes the meter move; (d) every row whose `class:`
composes `FloorMixin` carries **both** `ground` and `floor` in its own
`keywords:`; (e) every Location class overriding `postRegister` chains
`super.postRegister`.

⚠⚠ Clause (d) is not tidiness, and it found three shipped rows on its first
run. The MQL scope walk pools a thing's own `getKeywords()`, and
`pushDetails` gives a detail the pool `[<its id>]` and **never** its authored
keyword list — so a floor's `details.floor.keywords: [ground]` is dead text.
`weeping-floor` authored `[flagstones, wet]` and was therefore a floor
nothing could sit on or look at. `FloorMixin` unions both words onto the
class so the failure is impossible; this clause makes every row say them out
loud as well, so a row reads honestly on its own.

⭐ Clause (e) exists because `PostRegistrationMixin`'s default is a
**non-chaining** no-op: an override that forgets `super` silently leaves its
rooms floorless and nothing else goes wrong. Six of the Location family's
overrides had no `super` call before the ground build. The kernel's roster
test covers the kernel's classes; a pack's cannot be imported by a kernel
test, so the gate covers those. ⚠ Its first draft asked *does the FILE
mention `Location`?* and flagged `CommandGiver`, `CardRegistry` and `Screen`,
none of which is a room — the honest test is the class walk
(`composesMixin(classPath, 'Location')`).

### `lint:get-or-create` — `singleton` already does it (2026-09)

⭐ **`StuffApi.singleton(path)` IS the get-or-create** — index read
first, clone only on a miss — so a `findByTemplatePath` guard in front
of it on the same path is the same lookup written twice, and collapses
to one line.

⚠⚠ Worth a gate rather than a note because it is not merely redundant.
Both helpers throw on a duplicate row, so in the `try`-wrapped form the
pre-check's throw ESCAPES while the `try` catches only the second call:
the fault a reader most needs to see takes the unhandled path. And the
accompanying `catch { return null }` makes an unresolvable row
indistinguishable from the ordinary empty answer — *tolerate, but never
silently*.

⭐⭐ **The spread is the lesson.** One site wrote it believing the sync
hit was an optimisation `singleton` did not do; twelve more copied it
across the kernel and five packs, several citing the previous site as
precedent *in their own comments*. A mistaken comment is the most
portable thing in a codebase — it travels further than the code it
explains, because the next author reads the reason and trusts it.
Thirteen sites, no test ever failed.

⚠ **Its own first run over-matched, and that is recorded here on
purpose.** It flagged eight kernel sites that are NOT defects —
memoized module refs whose lookup does real cache-invalidation work, and
sync accessors beside async ensures. A gate that cries wolf is a gate
somebody disables, so the rule was narrowed to the form whose `if` body
is exactly `return <thatvar>;`, and
`scripts/__tests__/check-get-or-create.test.ts` pins the boundary in
**both** directions — four cases that must flag, five that must not.

Ratchet at zero; all thirteen swept in the commit that added it. Full
rationale: [antipatterns.md § A resident pre-check in front of
`StuffApi.singleton()`](./antipatterns.md).

### `lint:person-keys` — a PERSON keys on `getIdentityPath()` (2026-09)

⚠⚠ **Every player Avatar shares one `templatePath`.** D17 stamps lineage
and identity separately, so a durable record keyed on the template path
does not identify one player — it identifies **every player at once**,
and the collapse is invisible to a suite because fixtures author distinct
template paths per avatar. It has cost a shared bank account and a dead
labor market (MR !251), and the metallurgy build's grounding found a
fourth: **every mining claim in the game was owned by everybody**,
because `StakeController` passed `giver.getTemplatePath()` into the
parcel register while every kernel site writing that same field passes an
identity path. The field's meaning was never in doubt; one pack simply
never got the sweep.

⭐ **A ratchet at zero, not a census** — the one offender was fixed in the
commit that added the gate, so there is no backlog and the ceiling starts
where it ends (the `check-drive-scripts` precedent).

⭐⭐ **Deliberately a literal, not a classifier.** It matches one written
shape — a `kind: 'player'` owner whose `templatePath` is fed by
`getTemplatePath()`, in either key order, comments stripped — across the
kernel and every pack `src/`. A gate that tried to decide in general
whether a given `getTemplatePath()` names a person would be wrong in both
directions and teach nobody anything; see *Three ways a census lies*
above. The broader disease, and the one open half the literal cannot see
(the maker's-mark `makerPath` fallbacks in five controllers), are
documented at
[antipatterns.md § Keying a PERSON](./antipatterns.md).

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
  ⚠⚠ **And blind a third way until 2026-09-17: it could not read a PACK
  class.** A pack names its kernel base by package specifier
  (`import Provision from '@saxonberg/server/mud/platform/thing/Provision'`),
  and the walk resolved that against the file's directory — a path that
  exists nowhere — so `Loaf` read as unable to rot. It went unseen for a
  different reason: **49 rows across eight packs authored `material:`,
  a key the Hydrator never writes** (`_materialPath` is the field), so
  the loaves, the crops, the plants and the watering can had NO
  material, and a gate that reads `_materialPath` had nothing to read.
  Fixing the key is what let the gate speak, and it said three true
  things at once: the pack walk was broken; a `Crop` (root vegetables)
  was not a `Provision`; and 23 `Plant` rows are made of tissue that
  rots — which is right, and is not spoilage: a LIVING thing's tissue is
  not yet dead matter, so a class composing `GrowingMixin` is exempt by
  rule, not by list. The clock starts at the harvest, which is a `Crop`.
- **`lint:kept-animals`** — the kept-animal triangle closes (pets build,
  2026-09): a species dial the kernel cannot read (`handlingRange`,
  `biddability`, `feedingStyle` on a row whose class is not `Species`);
  a species a `Bonded` class is cloned with that declares no
  `biddability` (*not askable at all* — the silent default the
  cat-versus-collie difference rides on); a `feedingStyle` vessel rung
  no `Feeder` row provides (a canary that eats only from a hopper, and
  no hopper). ⚠ It follows a pack's local `const Base = Mixin(X)` and
  `@saxonberg/server/mud/…` specifiers — it first reported the collie as
  unable to bond *on the commit that gave it its bond*, because it read
  only the `extends` clause. All three directions were proved by
  breaking them.
- **`lint:world-scan`** — **you may not be handed the world.** Two
  patterns: a raw `StuffApi.getAllObjects()` enumeration (three
  sanctioned homes) and a `world:` query or `scope: world` (the owners
  named in `RegistryWideReaders`, `api/mql.ts`).
  ⚠⚠ **This gate used to point offenders AT the second pattern.** Its
  header said the fix for a hand-rolled loop was
  `MqlApi.resolveMany('world:[mixin.X]', …)`, so the scan was not drift
  — it was the documented house style, and it spread to seventeen
  sites. Inverting the guidance shipped in the same change as the
  refusal, deliberately: a gate whose rationale still recommends the
  thing it forbids gets argued away the first time it is inconvenient.
  ⭐ And the third rule the header now carries: **when an allowlist
  entry's REASON expires, the entry goes.** The water catalogue was
  allowlisted because "a capability pack cannot ship a mixin"; a pack
  gained a `lib/`, and the entry went.
- **`lint:whole-table`** — **an Api may not hand back its table**: the
  same defect from the other end, gated on the CONSUMER. A whole-table
  read (`allX()` / `getAllX()` / a bare `all()`) immediately narrowed
  with `.find`/`.filter`/`.some`/`.every`/`.flatMap`, or indexed into
  with `[0]`, says out loud that the caller wanted one thing and asked
  for all of them. Ratchet at 0; `EXEMPT` ships empty.
  ⭐ **An owner narrowing its OWN table is the fix, not the defect** —
  a `this.` receiver, or the class the file is named for, is not a
  finding. That exemption is not a loophole; it is where the keyed read
  is supposed to live. Whether a whole-table read is legitimate at all
  (does it grow with the world? is it keyed via the execution context
  rather than by an argument?) stays a review judgment, because no
  regex can make it — `BankingApi.accountsOf()` looks unkeyed and is
  not.

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

### The trades-and-labor three (2026-09)

All three came out of one build, and each closes a link of the
**reachability chain** that fails closed and silent.

**`lint:counters` — a counter is a vocation's instrument (ceiling 4).**
A *counter* is the front-of-house thing somebody stands behind: it holds
the goods, prices them, takes them into custody, or leases the customer's
attention. It is never generic — it is what one TRADE does for a living,
so the instanceable class a row names ships in `/trade/<x>`. The
MECHANISM may stay kernel (`lib/retail/Stock.ts` is substrate the price
index and the credit ladder read, and nothing instances it). The four the
kernel keeps are named in the script with their reasons, and `BankCounter`
is explicitly the one **to-do** — trade-banking is deferred with a stated
reason, so when it ships the ceiling drops to 3.

⚠ **The census read 2 where the truth was 4**, on the first cut. The plan
named four composition markers; `BankCounter` composes `BankMixin` (not
`AttendantMixin`) and `Menu` reaches the offer surface by **inheritance**
(`extends CommerceMenu`). A ceiling that undercounts is a ceiling that
means nothing — it would have admitted two more counters silently.

**`lint:openings` — an opening judges a PERSON (ceiling 0).** Six arms:
the `requires` vocabulary is closed to `{gigs, discipline, band}` (nothing
may select on species, lineage, trait, renown or wealth); a band must be
in the ladder and a discipline must key a shipped row; ⭐ a house that
advertises must be a `boot:` producer of its own pack, because the sign is
derived from LIVE businesses and standing a house up from a `look` would
make walking past a shop an economic act; a `fulfills` seat must name
premises and its rostered holders must stand on them; and a seat that
advertises a WAGE must author the `banksAt` the wage comes from.

⭐ **The fifth arm was found by driving**, not by reading: `clock off` at
a house with no `banksAt` threw out of the pay path, so the shift stood,
the worker was never paid, and nothing anywhere said the job was
unpayable.

⭐⭐ **And the sixth was found by the SWEEP** — every `parLines[].supplier`
must resolve to a house whose operating locations include a ROOM holding
a counter, because that is how `restocks` turns a supplier path into a
place a hauler can buy at. A house that lists only its counter *fixture*
is not a supplier: the bucket is dropped with a `continue`, the brain
declines nothing, the dispatch log prints declines only, and the order
simply never exists. It cost the build its own *work from more than one
supplier* acceptance criterion, and the only instrument that could see it
was a Mongo read of `contracts` on a live world.

**`lint:controller-rows` — a `controller:` is a TEMPLATE PATH (ceiling 0).**
309 refs across every pack's command views, each checked against the set
of shipped rows. A controller class with no row resolves to nothing and
the verb answers `controller-error` — every time, for everybody, forever.

⚠⚠ **It is invisible to the whole suite by construction.** A controller
test instantiates the class directly (`new ApplyController().execute(…)`);
a view test parses YAML. Nothing between the two asks *does this path
resolve*. `apply` and `clock` shipped with their views, their affordances
and fifteen green controller tests, and died on dispatch — found on the
third checkpoint of a live drive. This is the **data** link of the
reachability chain, and it had no gate until now.
