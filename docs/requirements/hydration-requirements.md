# Hydration — requirements

**Kind:** refactor/sweep (with one shipped-defect repair that is feature-shaped)
**Leads from:** kernel — first consumers are an NPC's memory of you and the
authored-history seeding that two mixins duplicate today. Both ship in this
build; neither is new content.

A freshly constructed object is not yet usable: a TypeScript class
initializes in steps, and the runtime values it needs before the world can
touch it come from several different places. `hydratorClass` was minted as
the admission of that fact. This build asks what those places actually
are, and the answer is that **they are not one kind of thing** — so this
doc separates them instead of unifying them, and deletes the field that
pretended they were the same.

Seeded by [hydration-framework-slate.md](../slates/builds/hydration-framework-slate.md),
whose provenance is the user's own question in the pets review: *"the idea
was that you could have a `BeliefHydrator`… the point was to use a common
framework for all that 'hydration step' logic and keep post-registration
for actual post-hydration stuff, not just 'finish hydrating'."*

⚠ **The slate's framing — "one framework for filling a thing with its
state" — is the thing this doc rejects.** Measuring the sources found
three kinds with different keys, different failure modes and different
authorities, and one of the three turned out not to be hydration at all.

---

## What already exists

**Three kinds of filling-in, measured.**

| | source | keyed on | absence means | capture side |
|---|---|---|---|---|
| **A — authored, mine** | this row's `data:` block | the template path — identical for every instance | nothing; normal | none, and forcing one is the coin defect |
| **B — authored, somebody else's** | a different row, by path | the referenced path | a dangling reference | none |
| **C — remembered** | `holder_snapshots`, `beliefs` | **this instance's own identity** | a first mint | **yes** |

**A is one implementation and always has been.** 1,528 of 1,970 rows name
`hydratorClass`; **all 1,528 name the same value**; there has never been a
second implementation in the project's life. It applies whatever the class
declares, in two phases dispatched off the field's kind — a `set<Field>`
method for property fields, a required `apply<Field>` for instruction
fields.

⭐ **B is not a kind of hydration — it is a cache warm that already has a
sanctioned function.** The one example is a kept animal reading its own
species row. That path is `SpeciesApi.preloadAnatomy`, an idempotent
shared warm with **nine existing callers** across perception, locomotion,
the persistence spine, the avatar and the `requiresAnimate` validator,
whose own comment calls it *"the shared substrate."* A mixin calling it at
registration is **a tenth call site**, added eagerly because that mixin's
eight dial reads lacked one.

**C already has a framework, and it is class-composed.** A mixin declares
`captureSlice`/`restoreSlice`; the framework walks the prototype chain and
drives every layer it finds. Seven mixins declare a slice today. The row
is not consulted and should not be: nobody authors a snapshot.

**The census, re-measured, and the slate's number was wrong.** Its script
matched *docstring mentions* of the registration hook and scanned to the
next closing brace, so Api facades that merely document the hook counted
as implementations:

| | slate claimed | actual |
|---|---|---|
| implementations of the registration hook | 109 → 123 → 149 | **82** |
| …whose body loads state | 63 → 67 → 78 | **40** |
| …that are the defect | — | **7** |

**Thirty-three of the forty legitimately stay** — catalogues, registries,
standings and four wardens, each a singleton reading a collection that is
nobody's per-instance state.

**Nothing an author can see says what fills a row in.** `cat` prints the
hydrator line only when the row has one, so *"this row has no hydrator"*
and *"that field isn't shown"* are indistinguishable. The CMS ships the
value to the client and no UI renders it. No diagnostics channel mentions
hydration; a discarded data key produces no warning, no log line and no
error row.

⚠⚠ **And the Studio mints rows that discard their data.** Its create path
saves `{class, data}` and never sets the field, so the applier never runs
and every byte the form collected is thrown away — reported as
`committed`, with no warning, no log line and no error row. `write
--hydrator ''` is documented as the way to reach the same state from the
other side.

⚠ **Two separate gate facts, and they are easy to conflate.** The field is
wizard-gated as executable-code-naming, correctly, and the gate rejects a
write that *introduces* a code-naming field — a create has nothing to
compare against, so introducing one always violates. But `class` is
gated the same way, so **a non-wizard cannot create a template through the
Studio at all**: it requires a `classPath`, and the gate refuses that on a
fresh path for anyone who is not a wizard. A protowizard's authoring path
is a class-less child (`write --extends <parent>`), which inherits class
*and* applier from its parent and so passes.

So the data-discard defect is a **plain bug on the wizard path**, not
something the gate forced. What the gate genuinely costs is narrower and
still real: **the only way to author a row that applies data without
naming code is to have a parent to inherit from**, which is why the
protowizard door opened in 2026-09-25 by way of `extends:` rather than by
way of anything the Studio does.

⭐ **Therefore what is genuinely new here is**: the admission that A, B and
C are different. A becomes automatic and loses its declaration entirely. B
goes back to being a read. C keeps its framework and gets the driver it
never had. Plus the ruling that says which of the forty hooks were
finishing hydration all along.

---

## Goals

- **`hydratorClass` is deleted from the row vocabulary.** Not retired for
  the common case — gone. **An object either has data to apply or it does
  not**, and the engine applies it. There is nothing to declare because
  there has never been a choice.
- **The content step is named for what it does.** It is a
  **`TemplateApplier`**: it applies a template's `data:` to a fresh
  instance, in phases dispatched off each field's declared kind. It is not
  hydration, and calling it that is what made six unlike things look like
  one family.
- **Seeding becomes a third phase of that applier, not a declared
  anything.** A field flagged as a seed is written once into an
  append-only ledger through a required `seed<Field>` applier — the same
  shape as the two phases that already exist, needing a row declaration
  for exactly the same reason they do: none.
- **A value-bearing field is never pushed by going live.** Editing a row
  and taking it live must not overwrite live instances' values. Today it
  resets every coin stack in the world to one.
- **"Hydration" means filling an instance from what the world remembered
  about it** — and it is **declared by the class, through composition**,
  because capture is never authored. The vocabulary becomes symmetric:
  a layer **captures** and **hydrates**.
- **A hydration layer gets a driver that does not require a
  `holder_snapshots` record, and may name a source that is not
  `holder_snapshots`.** This is the whole of the original defect: an NPC's
  memory of you sat unread in the database for months because nothing
  drove its layer.
- **The species read goes back to the read path.** The capability is a
  warm with nine callers; the tenth belongs beside the reads that need it,
  not in a lifecycle hook and not in a new framework.
- **An author can see what will fill their row in** — the data keys that
  will apply, the ones nobody will, and the remembered sources the class
  brings — including when the answer is "nothing".
- **Four kinds of post-registration work are named, three stay, and the
  count is gated where it lands** so it can fall and never rise.
- ⭐ **The registration hook becomes `Stuff.onCreate()`, a terminal no-op,
  and `PostRegistrationMixin` is retired.** A marker mixin whose default
  does not chain has cost this tree the same bug twice — ten Location
  classes stripped in the ground build, and `Bonded` never running on a
  live animal, so no kept animal's home was seeded or species warmed. A
  terminal on the root deletes the failure class rather than re-ordering
  around it, which is what `onDestruct` already does.

## Non-goals

- **Re-homing the applier into a path-resolved lazy module.** →
  [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
  Wave 3, confirmed unstarted since 2026-08-08. ⭐ This build makes that
  wave *cheaper*, because once no row names the applier it no longer needs
  to be author-selectable by path.
- **The 33 roster-warming hooks.** → nowhere in this build; the ruling
  names them legitimate. ⭐ But record the observation for the next pass:
  **20 `*Catalogue` classes implement one hook each, all doing the same
  job.** That is one mechanism wanting to exist, under a different rubric
  than this build's.
- **A composition primitive for rows, and the costume-row modelling
  error.** → [row-composition-slate](../slates/builds/row-composition-slate.md).
  ⚠ That slate and this build both change the row's shape; they must not
  be in flight together.
- **How a child row unsets an inherited key.** →
  [legibility-slate](../slates/builds/legibility-slate.md) Part A's opens.
- **What a captured slice may legally contain**, and its size ceiling. →
  [estate-nesting-slate](../slates/builds/estate-nesting-slate.md).
- **Driver state off the avatar body.** →
  [avatar-family-slate](../slates/builds/avatar-family-slate.md).
- **Forbidding the hook from reading other objects' state.** →
  [eager-residency-slate](../slates/builds/eager-residency-slate.md)'s
  never-fault rule: a narrower ratchet over the same hook with a different
  predicate. Neither subsumes the other; they must share a counter.
- **Re-tracing hot-reload safety.** → already traced and cleared
  (2026-09-24): reload never touches a live instance, so the hook never
  re-runs on a populated host. Do not re-derive it.

## Placement

**Kernel.** The content applier is the clone pipeline; hydration is the
persistence spine. Both are substrate every pack sits on and no pack may
own.

⭐ **The test — does a second instance need code?** A pack that ships a
mixin with remembered state must be able to declare that mixin's capture
and hydrate halves, name its own source, and have the framework drive
them, **with no kernel edit**. Because declaration is by composition, a
pack mixin already satisfies this by existing — which is itself an
argument for the class-side answer over the row-side one.

Which host carries which declaration is the plan's.

## Collisions

- ⚠⚠ **Everyone's money.** The coin row is edited through the CMS like any
  other, and going live re-applies its data to every live stack.
- **The Studio's template form**, which mints rows that discard their
  data. The repair is by deletion: with no field to name, there is nothing
  for the gate to reject.
- **The code-trust gate shrinks.** Its code-naming field list drops from
  three to two. That is a strict reduction in the surface, and the
  protowizard authoring door widens.
- **Three `lint:instanceable` invariants retire** — the one that resolves
  the field, the one that forbids a redundant one, and the one that
  catches a data block with no applier. All three guard states that can no
  longer exist.
- **1,528 rows lose a line**, including the 68 that use `extends:` and the
  three avatar rows that shipped yesterday. The pack reconcile sees it as
  a content change on each.
- **`write`'s `--hydrator` option and `cat`'s hydrator line** go. The 8
  rows carrying a comment about deliberately having no hydrator lose their
  subject.
- **`pack sync`'s "live instances re-hydrated" count** keeps its meaning
  but not its word.
- **The NPCs who already remember you**, the kept animals whose dials read
  absent until a hook was added, and the three call-security gates that
  admit the applier by module path.
- **The whole location family**, which since 2026-09-24 depends on a
  base-level registration hook. Nothing here changes how that hook is
  composed; the biggest class family in the game is why.

## Surface decisions

### `hydratorClass` is deleted, not split

**A row with a `data:` block gets its data applied. There is no
declaration.**

The field was minted to admit that construction happens in steps, and it
has only ever had one value. An opt-out would be the only thing it still
expressed, and **zero rows use the opt-out** — every row with non-empty
data has an applier today, own or inherited. So the field expresses a
choice nobody has ever made.

Deleting it rather than splitting its authority fixes the Studio's
data-discard outright — there is no field to forget — and it removes the
inherit-a-parent precondition from the protowizard path: a class-less
child's data applies because *all* data applies, not because its parent
happened to name an applier. ⚠ It does **not** make Studio create
available to a non-wizard; that is `class`'s gate, and it is out of scope.
The alternative considered
and rejected was keeping the field for *custom* appliers only — rejected
because A's whole character is that it is generic. A genuinely bespoke
content transform is a cross-field invariant, which is a property of the
class, and the class is already where that belongs.

### The content step is a `TemplateApplier`, with three phases

It applies a template's data to an instance, dispatching on each field's
declared kind: a property field through its setter, an instruction field
through its required applier, and a **seed field** through a required
`seed<Field>`.

Naming it for the act rather than for hydration is the point of this
revision. Alternatives weighed: `DataApplier` (vaguer, and `data` is also
the YAML key) and `Furnisher` (collides with the shipped furnishing
subsystem). *Applier* is already the vocabulary the instruction phase
uses, so the name extends what the code says rather than importing a word.

### Seeding is a phase, because the field already declares the kind

Two mixins today take an authored field and write it once into an
append-only ledger, each carrying nearly the same guard prose about
skipping when a claim already exists. That is not a second source — it
reads the row, like the other phases — and it is not a declaration, for
the same reason the other phases are not. The applier owns ordering and
once-ness; the ledger's own idempotence check stays with the ledger.

### A value-bearing field is not pushed by going live

Going live is the authored step run again over an object that already
exists, and some fields must not survive that. The field's **owner**
declares it, beside the properties it already declares there.

Per-row opt-out was rejected: the hazard is a property of the field
wherever it is authored, and a row-level switch has to be remembered on
every row that authors a stack. Diff-based go-live was rejected too: it
would stop the reset but still push a changed authored quantity onto
stacks at the old value, which mints money with no ledger entry.

⚠ The asymmetry this closes is already half-shipped — instruction fields
carry a run-once-at-birth guard because *"a content edit is not a
faucet"*, and property fields never got one. The coin falls through the
missing half.

### Hydration is class-declared, and the word becomes symmetric

A mixin that has remembered state declares how it is captured and how it
is **hydrated**, and the framework walks the chain. The row is not
consulted.

The author-control argument that decided the content side does not reach
here, because **nobody authors a snapshot** — while the cost of
row-declaration does: a row composing a remembering mixin and omitting
the line would get no memory, silently, which is the shipped failure class
a row's dead `commandContributions:` already demonstrates. Composition
cannot be forgotten.

Renaming the restore half so the pair reads *capture / hydrate* is what
makes "hydration" mean one thing in this codebase: **filling an instance
from what was remembered about it.** The content step is then honestly not
hydration, which is the whole correction this revision makes.

### A layer names its source, and the driver does not need a record

A layer states where its remembered state lives. The framework runs it
whether or not the host has a `holder_snapshots` record — which is the
entire original defect: an NPC composes no self-persistence, so it has no
record, so nothing drove its memory layer and the records piled up unread.

Two properties stay declared rather than left to each layer: **whether an
unreachable source is a no-op or a hard failure** (every test run and all
of early boot are the no-op case, and a layer saying so is what stopped
being invisible), and **eager versus faulted-on-first-read**. The two
live examples point opposite ways and both are right, which is why neither
is a default.

### The species read is not in this framework

It returns to the read path it already has nine callers on. A hook that
warms a reference row is neither authored data nor remembered state; it is
a lazy read somebody made eager. Making it a declared, required layer
would change clone-time failure semantics for every organism in the game
to solve a problem whose answer is one more call beside the reads.

⚠ The bug it was papering over is real and stays fixed: every dial on a
kept animal read as absent in the live game while every refusal-shaped
assertion passed. The fix is the call site, not a framework.

### The registration hook is `onCreate`, and it lives on `Stuff`

`antipatterns.md`'s own test for a terminal no-op is whether the hook is
*"universal to the root class's purpose"*. **Every Stuff is registered** —
more universally than it is destructed, since nothing reaches the world
without it — so the root is the natural terminal, and the marker mixin was
never checked against the rule its sibling already follows.

The name comes from the vocabulary already shipped at the same line: the
pipeline emits `Events.StuffCreated` three lines after the hook, for both
entry points, and its sibling is `Events.StuffDestructed`. So
**`onCreate` / `onDestruct`** is the matching hook pair.

Rejected, so review need not re-litigate: `postRegister` (**`post` has
~80 uses in this tree and every one is the transitive verb** —
`postTransaction`, `postThread`, `postGig` — so it reads as *"post a
register"*) · `onHydrate` (this build reserves *hydrate* for remembered
state, and this hook is where the non-hydration residue lives) · `onClone`
(the hook fires from the no-template `create()` path too) · `onAdmitted`
(*admit* is call-security vocabulary, 120 uses) · `onMinted` /
`onInducted` (synonyms for a word the event vocabulary already had).

⚠ **Accepted cost:** the name does not encode that the data is already
applied. No available candidate does — the honest one is
`postHydrate`-shaped and that word is now reserved — so it is no worse
than today's, which names the earlier of the two things it follows.

### Four kinds of post-registration work

| | what it is | where it goes |
|---|---|---|
| **finishing hydration** | the host filling in its own remembered state | **the hydration framework** |
| **seeding** | an authored field written once into a ledger | **the applier's third phase** |
| **warming a roster** | a singleton reading a collection that is nobody's per-instance state | stays — it needs the registry first |
| **structural completion** | constructing a companion the world requires, loading no state | **stays, and this is what the hook is FOR** |

Naming the fourth positively matters as much as the others. It is the
residue the original instruction protects, and without a name for it every
honest use of the hook reads as an entry on a defect census.

**The count is gated at the measured number and may only fall** — the
census-then-ratchet pattern, measured on the method declaration rather
than on the word.

## Lens pass

**1 Pedagogy.** Thin, and honestly so — substrate with no Discipline. The
one real entry is derivability for *authors*: hydration is invisible
because nothing reports it, and an author who cannot see what fills their
object in cannot work out why it came out empty. The inspection read is
the teaching surface. ⭐ **Gap recorded:** nothing here teaches a player
anything.

**2 Expression.** The deciding lens, and it decides for deletion. An
authoring surface that silently discards the author's work is the worst
available answer on this axis and it is shipped. The ordinary case must
need no code *and no declaration* — a row with data gets its data — and
1,528 copies of one value was transparency spent on nothing.

**3a Immersion.** Money disappearing because somebody edited a content row
is the fiction betraying itself about the thing players trust least.
**3b Participation** — nothing.

**4 Values.** ⭐ The authority question is *who decides what fills an
object in*, and the honest answer turns out to be that for authored data
**nobody needs to decide** — the question was manufactured by a field that
should not exist. Deleting it shrinks the code-trust surface rather than
carving an exception in it, which is the stronger form of the same answer.
Pitched at the **invariant**: data application is not a privilege.

**5 Continuity.** The test is whether a remembered source we have not
thought of needs a kernel edit. Because declaration is by composition, a
pack mixin with a new source is already expressible. ⭐ And the revision
*improves* this lens: a framework that had to absorb authored data,
reference rows and snapshots would have bent for each; one that handles
only remembered state has a single shape to keep.

**6 Economy.** Produces nothing, consumes one round-trip per eager layer
per clone — which is why eager-versus-lazy is declared and not defaulted.

**7 Governance.** The code-trust gate comes out **strictly smaller**: one
fewer code-naming field and nothing new to check. The protowizard door
widens by one hinge — a class-less child's data applies on its own merits
rather than on its parent's applier — while `class` stays gated, which is
correct and untouched. ⚠ Nothing here may become a new reason to ask
whether someone is a wizard.

## The drive

Run against the live game, in order, before the MR opens.

1. **Create a template with a form full of data, then clone it.** *The
   clone carries the data.* Today it is empty, the create reported
   success, and nothing said why. ⚠ Drive it **twice, by both doors**: as
   a wizard through the Studio form (the path that has the defect), and as
   a protowizard via a class-less child with data (`write --extends`) —
   the only create path a non-wizard has, and the one whose data must now
   apply without a parent having named an applier.
2. **`cat` that row.** *It states what will fill its instances* — the data
   keys that will apply, any key nobody will, and the remembered sources
   its class brings — *and says so explicitly when there are none.*
3. **`write` a row with a data key no field declares.** *You are told at
   write time that the key will be discarded.*
4. **Meet an NPC who forms opinions, do something they would remember,
   restart the server, and come back.** *They still hold it.*
5. **Do the same with a kept animal you have handled.** *It still knows
   you across the restart.* ⭐ The step that proves the capability
   generalized rather than moved: an NPC and an animal reach memory by two
   different routes today, and the same observable must hold through one
   framework.
6. **Offer that animal food the moment it is born.** *The right feeding
   rung is offered* — its own species dials read, which were found reading
   absent on every one of them in the live game while every
   refusal-shaped assertion passed.
7. **Clone an NPC with authored history twice, with a restart between.**
   *The history is there once.*
8. ⚠⚠ **Hold coins. Edit the coin row in the CMS and take it live.**
   *Your coins are still there, in the amount you had.* Today they become
   one.
9. **Log out, restart the server, log back in.** *Your gear is on you and
   nothing collided.*

## Acceptance criteria

Observable from outside the code, by someone using the game.

- An author who types data into the Studio and saves finds that data on
  the thing they cloned.
- An author can read, in-world, what will fill a row's instances — and
  reads "nothing" as "nothing".
- An author who writes a data key nobody will apply is told when they
  write it.
- Editing a value-bearing row and taking it live leaves live instances'
  values alone. **Nobody's money changes.**
- An NPC's memory of a player survives a restart, and so does a kept
  animal's — the two reach it by different routes today and must not
  after.
- A newly born kept animal answers correctly about its own feeding,
  handling and biddability.
- Authored history on an NPC appears exactly once, across any number of
  re-clones and restarts.
- A player logs out, the server restarts, the player logs in, and their
  worn and carried things are as they left them.
- A pack author's mixin with remembered state is captured and hydrated
  with no kernel change.
- **No row anywhere names a hydrator**, and every one of the 1,528 that
  used to behaves exactly as before.
- A non-wizard can author a row whose data applies, with no exemption
  anywhere in the gate and **without depending on a parent to have named
  an applier**. (Creating a row that *names a class* stays wizard-only;
  that is `class`'s gate and is not this build's.)

## Cross-references

**Seeding slate:** [hydration-framework-slate](../slates/builds/hydration-framework-slate.md)
— subsumed, with its central framing rejected. Its Q1 dissolved (the
content step already runs after registry insertion, so the phase obstacle
it feared is absent), its Q2 and Q3 survive as declarations on the
hydration side only, and its Q4 is answered by deleting the field rather
than growing it. ⭐ Its own strongest sentence is the one this revision
returns to: *"the gap is the DRIVER, not the framework."*

**Adjacent owners, not to be re-derived:**
[persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
Wave 3 · [legibility-slate](../slates/builds/legibility-slate.md)
(`extends:`, shipped) ·
[row-composition-slate](../slates/builds/row-composition-slate.md) (the
row's shape; must not be in flight with this) ·
[estate-nesting-slate](../slates/builds/estate-nesting-slate.md) ·
[money-integrity-slate](../slates/builds/money-integrity-slate.md) (*a
value-bearing field must not be hydrated by go-live*) ·
[eager-residency-slate](../slates/builds/eager-residency-slate.md) (the
competing ratchet).

**Subsystem docs:** [templates.md](../subsystems/templates.md) ·
[persistence.md](../subsystems/persistence.md) ·
[lifecycle.md](../subsystems/lifecycle.md) ·
[access.md](../subsystems/access.md) ·
[studio.md](../subsystems/studio.md) + [cms.md](../subsystems/cms.md) ·
[content-packs.md](../subsystems/content-packs.md) ·
[lint-family.md](../lint-family.md).
