# The Api OO sweep — requirements

The Api tier has grown a procedural habit: a static that takes its
subject as the first parameter (`ThermalApi.depositHeat(stuff, joules)`)
where the type system already offers the honest form
(`stuff.depositHeat(joules)`). We have types for a reason. This build
shrinks the Api tier back to the four things only it can do, moves the
verbs onto the objects that own them in `lib/<subsystem>/`, and retires
the Apis and logic singletons that are left holding nothing.

It also lands the sibling complaint as its first phase: `Api.boot()` is
an operator-shaped run-once act sitting on the surface content
developers consume, and it exists only because the logic singletons at
`/platform/idea/api/*` are template-less and cannot ride the boot
manifest. Both slates shrink the same tier, so they are one build.

Seeded by
[oo-calling-conventions-slate](../slates/builds/oo-calling-conventions-slate.md)
and
[api-boot-retirement-slate](../slates/builds/api-boot-retirement-slate.md)
(both carry the 2026-09-02 scoping sections this doc formalizes).
Load-bearing background:
[architecture.md](../architecture.md) § The Api ↔ logic-singleton split,
[antipatterns.md](../antipatterns.md) § Thin Api Wrappers over Object
Methods, [call-security.md](../subsystems/call-security.md) §
Participant contracts, [content-packs.md](../subsystems/content-packs.md)
(the boot manifest).

## Goals

- **The four mandates hold.** After this build the Api tier contains
  only: (a) subjectless services, (b) framework lifecycle run *around*
  a least-trusted host, (c) the import/exterior boundary, and (d)
  subjectless cross-cutting dispatch. Every mutating verb between typed
  objects lives on an object.
- **The verbs land in `lib/`.** A moved verb takes its module-private
  helpers with it onto the owning mixin in `lib/<subsystem>/`, which is
  where the behavior belonged.
- **Whole Apis disappear.** The ten Apis whose every method takes a
  subject are retirement candidates; each that empties is deleted along
  with its logic singleton and its gate string.
- **Every moved verb carries a deliberate gate**, chosen by a stated
  rule rather than re-argued per method.
- **`AppBootstrap`'s sequencer contains zero `Api.boot()` lines**, and
  a fresh-DB boot still stands every roster.
- **The doctrine becomes checkable.** A script reports subject-first
  methods outside the four mandates, so the next Api is born on the
  right side of the line instead of being caught in review.

## Non-goals

- **Normalizing the Apis that survive.** Reorganizing what each
  remaining Api encapsulates, and whether a two-method survivor should
  keep its `XApi ↔ XLogic` split, is a separate pass the user has
  explicitly deferred. This build moves what can move; a three-file,
  two-method survivor is an acceptable intermediate state.
- **A `FromIdentity` security policy.** Not built (see *Surface
  decisions*); the rule about why is recorded instead.
- **The key-based ledgers.** `AccountabilityApi`, `ProvenanceApi` and
  `RecordApi`'s store surface are keyed by id and path strings, not by
  Stuff. They were never candidates and are not touched.
- **The doctrine-exempt orchestrators** — Containment, Locomotion,
  Condition, Scheduler, Persistable, Shadow, Stuff, Sandbox, Prompt,
  and Biome's resolve family. Re-litigating them is not this sweep.
- **`MixinApi`'s narrowing predicates** (145 after the bar-fight merge)
  — the sanctioned surface.
- **The `crafting.ts` request-object shape** — a fine third form, left
  undisturbed.
- **The relay transports' own `boot()`** (Twitch/Youtube/Kick) —
  transport lifecycle under mandate (c); they stay.
- **Any change to WHAT gets warmed at boot**, or to what any moved verb
  actually does. This is a relocation, not a behavior change.

## Surface decisions

### The two slates are one build; boot retirement goes first

One branch, one MR, one review. Phase A is mechanical and it deletes
logic singletons the later waves would otherwise touch twice, so it
lands while the tree is otherwise untouched.

### The default gate for a moved verb is a three-way test

Access is a judgment about **who is calling** and **why**, and some
object-to-object calls should simply be allowed because the two objects
trust each other. Applied per moved method, in this order:

1. **Trusted relationship → ungated.** The two objects have standing to
   talk: a container and its contents, two combatants already in a
   session, a body and the organ it composes. No decorator.
2. **Untrusted but structurally bounded → a participant contract.**
   `FromClass` / `FromMixin` names the kind of Stuff with standing, and
   the `where` predicate adds the relational half — "is that instance
   actually in the right relationship to me, for these arguments."
3. **Untrusted and context-dependent → `FromController`.** When the
   *reason* for the call is what's being checked, the callsite carries
   it: `FromController` is sugar over the caller's controller module id.

Orthogonally, `@Final @Unshadowable` goes on any moved method that owns
a field with an invariant — that seal, not a static home, is what makes
a chokepoint a chokepoint.

### Instance-level trust uses `where`, not a new identity policy

Three identity grains now exist — module id (`FromModule`), template
path (`FromTemplate`), and instance identity path — but only the first
two have policies, and identity path should not get one here.
`getIdentityPath()` is **deliberately overridable**: the sandbox
`WireBody` projects the real player's identity so derive-on-read
attribution composes onto the real avatar. The registry already
adjudicated this exact question and indexes on the raw caller-gated
slot (`Stuff._identityStampOf`), "never the overridable method," so a
vessel cannot file itself under the identity it projects. A policy
reading the method would be spoofable by precisely what the sandbox
boundary exists to contain.

The participant `where` predicate already covers the need and is
strictly stronger: it receives `(caller, target, method, args)` and can
compare **object identity** directly, which no path string can be
spoofed into. **Decision: no `FromIdentity` policy.** If one is ever
built it must read the raw stamp; that rule is recorded in
call-security.md by this build.

### The ledger family is two faces, not one — and not six ledgers

The parameter types had already sorted this. `AccountabilityApi.record`
takes no subject and `blameFor` takes a `victimId: string`;
`ProvenanceApi.authorOf` takes a `path: string`; `RecordApi`'s store
surface (`flush`/`recent`/`recall`/`wipe`) is subjectless. Those are
key-based evidence services under mandate (a) and are out of scope.

Five ledgers take a Stuff, in two honest faces:

- **What I believe about you** — `RegardApi` (every method a
  `(viewer, subject)` pair) and `BeliefStoreApi` (`(viewer, …)`). The
  host is the *viewer*; the subject is the argument. The belief lives
  in the viewer's head and can be wrong.
- **My own record** — `ChronicleApi`, `TraitApi` and `AdvancementApi`
  (the last two are near-identical `recordSignature`/`recordDeed`/
  `entriesFor` twins over `(owner, …)`). The host is the *owner* of the
  record, even when someone else writes to it.

The two faces stay distinct. Flattening them would erase the
deed-versus-claim distinction that [measurement.md](../measurement.md)
and [chronicle.md](../subsystems/chronicle.md) treat as load-bearing —
private fallible belief is not public contestable record.

### The move sharpens deed vs claim rather than threatening it

Today the only gate on a chronicle write is "ChronicleApi may call
ChronicleLogic," which says nothing about whether the entry is a
witnessed deed or an asserted claim. On the host the distinction
becomes the gate: a claim is self-callable, a deed carries a
participant contract naming who has standing to witness it. This is the
gate rule above applied to the case where it matters most, and it is a
goal of the build, not a side effect.

### `Interactive` gets real methods

Connection, Card, Prompt and Reaction's subject-first methods move onto
`Interactive`. It is a typed object like any other and is **not**
exempted as boundary-adjacent. The transports themselves — the actual
wire — stay under mandate (c). Sequenced after the mixin waves so the
recipe is proven before it reaches the connection path.

### Depth: all of it, Combat last

No stopping at the small Apis. `CombatApi` is the largest and most
coupled surface and moves alone, last, after every other wave has
established the recipe.

## Constraints

- **No migration shims.** The old static may survive as a forwarder
  only *within* a wave, never across a commit boundary that could ship.
  There are no users and no data: delete, don't deprecate.
- **The `XApi ↔ XLogic` split stays mandatory wherever an Api tier
  survives.** The Api is the non-HMR interface; the logic singleton at
  `/platform/idea/api/<x>` is the hot-reload boundary. Deleting an
  emptied logic singleton is fine; collapsing a surviving pair is not.
- **Nothing instances `/lib/`.** A verb moving onto a mixin lands in
  `lib/<subsystem>/`, which stays substrate-only —
  `pnpm lint:instanceable` gates it.
- **The import boundary holds.** Only `api/**` and
  `platform/idea/api/**` import outside `src/mud/`. A verb moving to a
  mixin must not drag an outside import with it; if it needs one, it
  keeps an Api fold (the `ScriptApi.compileSandboxed` pattern) rather
  than widening the boundary. `pnpm lint:imports` gates it.
- **Export discipline.** A moved verb becomes a method on the owning
  class or mixin — never a free-floating exported helper. No new
  `eslint-disable no-restricted-syntax` without the user's sign-off.
- **Boot ordering becomes manifest data.** Every ordering the imperative
  sequencer encodes must become an explicit `dependsOn` edge on the
  platform pack's `boot:` entries. The chain moves whole, or each hop is
  verified.
- **`AppSettings.warm()` is the ordering keystone.** It runs *after*
  `BootstrapManager.run()` today, so any warm moving into the manifest
  that reads a dial either needs settings warmed at step zero or must
  keep the seeded-literal `dial()` fallback discipline. Decided once, in
  this build.
- **The inert-at-boot guarantee must not regress.** A fresh-DB boot
  stands every roster — a recurring failure this project has already
  hit three times.
- **Full suite at two moments only** — before the MR opens, and at
  `/finalize`. Every wave in between is gated by `pnpm test:near`, the
  touched packs' own vitest, and the lint family. Size is not an
  exemption; a large structural wave is still a between-moments change.
- **The census will have moved.** The bar-fight merge adds `isWeapon`,
  `visibleArms`, `offerBreak` and `bumRush` to `CombatApi` and
  `isHeldGoodsShelf` to `MixinApi`. Step zero of the build is re-running
  the census against post-merge master; the slate's table is a scoping
  estimate, not the baseline.

## Acceptance criteria

- `scripts/check-object-verbs.ts` exists, is wired as `pnpm
  lint:object-verbs`, and reports **zero** subject-first mutating
  methods outside the four mandates. Advisory while the waves run;
  CI-gating when Phase G lands. Its exempt-Api list is **enumerated in
  the script**, not inferred, so widening it is a visible diff (the
  `lint:boundary` precedent).
- `scripts/check-thin-forwarder.ts` catches the void-guard shape
  (`if (!isX) return; param.m(…)`), and the ten methods that shape was
  hiding are converted. A test asserts the lint **fires** on a fixture
  of that shape — a gate that ships broken and silently passes is the
  failure mode this project has already shipped once.
- `AppBootstrap` contains zero `Api.boot()` calls; no Api exports a
  `static boot`; the author-surface projection shows no `boot()` in the
  consumer tier.
- A fresh-DB boot stands every roster (materials, conditions, the
  clock anchor, the standings, the frame store) with the manifest's
  `dependsOn` edges as the only ordering.
- **The `FromTemplate` gate strings shrink with the logic singletons.**
  29 distinct globs exist today; 21 are the `/platform/idea/api/<x>`
  "my own logic singleton may call me" arm, of which 5 name
  doctrine-exempt Apis and survive. Every one of the remaining 16 whose
  logic singleton is deleted goes with it, and none is left dangling —
  `pnpm lint:gates` proves every surviving string still resolves. The
  target is *no orphans*, not a number.
- Each retired Api is gone in full: the `api/<x>.ts` file, its logic
  singleton, its gate string, its doc-map line, and its entry in any
  Api barrel — with its tests rehomed beside the mixin that now owns
  the behavior, not deleted.
- `RegardApi`, `BeliefStoreApi`, `ChronicleApi`, `TraitApi` and
  `AdvancementApi`'s moved verbs each carry a gate chosen by the
  three-way rule, and the chronicle surface distinguishes a
  self-callable claim from a witness-gated deed.
- `pnpm lint` and the full lint family are green, including
  `lint:instanceable`, `lint:imports`, `lint:module-scope`,
  `lint:gates` and `lint:schema`.
- The full suite is green at the two sanctioned moments.
- Docs: [antipatterns.md](../antipatterns.md) gains the doctrine
  statement and the three-way gate rule;
  [architecture.md](../architecture.md) records what the Api tier is
  for after the sweep; [call-security.md](../subsystems/call-security.md)
  records the identity-path rule (read the raw stamp, never the
  overridable method) and the participant-contract-as-default posture;
  every subsystem doc whose Api was retired points at the mixin
  instead; CLAUDE.md's antipattern table is updated where a row named a
  moved static.

## Cross-references

- Seeding slates:
  [oo-calling-conventions-slate](../slates/builds/oo-calling-conventions-slate.md),
  [api-boot-retirement-slate](../slates/builds/api-boot-retirement-slate.md)
- [architecture.md](../architecture.md) — the Api ↔ logic-singleton
  split, the import boundary, export discipline
- [antipatterns.md](../antipatterns.md) — thin Api wrappers over object
  methods
- [call-security.md](../subsystems/call-security.md) — participant
  contracts, `FromModule` / `FromTemplate` / `FromController`, the
  shadow dispatch seam
- [content-packs.md](../subsystems/content-packs.md) — the boot manifest
  and `dependsOn`
- [chronicle.md](../subsystems/chronicle.md),
  [belief.md](../subsystems/belief.md),
  [trait.md](../subsystems/trait.md),
  [advancement.md](../subsystems/advancement.md),
  [renown.md](../subsystems/renown.md) — the ledger faces
- [measurement.md](../measurement.md) — why deed and claim stay distinct
- [testing.md](../testing.md) — the two-moments rule for the full suite
