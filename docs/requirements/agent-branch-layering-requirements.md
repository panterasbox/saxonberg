# The Agent branch's class layering — requirements

**Kind:** refactor/sweep (with a content tail in Stage C)
**Leads from:** kernel — first consumers are **the 13 Cast rows that are
roles wearing a person's clothes** and **the eight goods-yards hands**,
all shipped, all authored, all demoted onto the new rung by this build.
No new content is invented; existing rows move.

One class is carrying three different mistakes at once.

> **`Character` holds things that belong ABOVE it, BELOW it, and BESIDE
> it** — and each of the three has been filed as a separate problem in a
> separate slate, which is why none of them has been fixed.

- **Above.** `Avatar` is 13 mixins over `ShelledCharacter`'s 5 over
  `Character`'s 15 — ~38 mixins to be a player. `HasInteractive` alone
  is 1,168 lines holding six concerns, of which ~620 lines are one
  client's UI vocabulary.
- **Below.** An `Extra` — *a role, the definite article, "the teller"* —
  inherits all 15 of `Character`'s mixins, and **8 of them are dead on
  it. Six are dead by declared rule**: `lint:identity` makes a role's
  `prologue`/`competence`/`renown` a **build error** (*"A role has no
  history — that is what being a role means"*), and
  `Extra.keepsPersonalRegard()` returns `false`. The engine does not
  merely leave those mixins unused on a role; it refuses them.
- **Beside.** `PersonaMixin` sits on `Character`, is authored by **0 of
  57 rows**, and has accreted **14 command affordances** that have
  nothing to do with a biography — `appoint`, `quit`, `apply`, `clock`,
  `office`, `government`, `title`, `who`, `score`…

Seeded by [avatar-family-slate](../slates/builds/avatar-family-slate.md)
§ Sequencing 9 (the above end) and
[base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
§ Deferred — *The Extra taxonomy*, *`Persona` off `Character`* (the
below and beside ends). ⭐ They are one build because **the beside end
is the join**: the answer to *where do the 14 verbs live* is needed by
the player end and the NPC end alike, and it is the same answer.

---

## What already exists

Measured this cycle, not recalled. Every number below was re-taken
against the tree and several correct the slates.

### The stack, top down

| rung | file | adds | note |
|---|---|---|---|
| `Shade` / `WireBody` | `platform/agent/` | `Incorporeal` / none | both `extends Avatar` |
| `Avatar` | 1,649 lines | **13** mixins | + 17 `self` verbs as a **class static** — the precedent this build reuses |
| `ShelledCharacter` | **46 lines, empty body, abstract, one consumer** | **5** mixins, ⭐ **all n=1** | moves as a unit without touching another class |
| `Character` | 278 lines | **15** mixins | ⚠ composed by `NPC` too, so all 15 reach every NPC |
| `Actor` → `Creature` → `Agent` → `Stuff` | | the body layer | `Actor` shipped last build |

⭐ **24 of the 33 mixins have exactly one composer.** Only
`PostRegistration` (n=75) and `Persistable` (n=17) are genuinely shared
substrate; seven more have exactly one non-player second composer. The
rest is player furniture with a single consumer apiece.

### `HasInteractive` — six concerns, not three

The slate names three. There are six: the **connection set** (~53
lines), **client state**, **cockpit**, plus **presence**
(`presenceStatus`), **residency** (`canEvict`), **identity**
(`getPortraitUrl`), **spatial** (`refreshDisplays`), the **sandbox
slices**, and a **verb surface** shipping the whole `cockpit` tree.

⚠ **And the cockpit is ~620 lines, not ~200.** The slate's 200 counts
only the methods; there are another ~415 lines of `clientStateSchema` —
fifteen entries of pure cockpit vocabulary — in the same file.

The dependency direction is good: **COCKPIT → CS → CONN, with zero
edges back** from either lower layer, and the cockpit's 24 production
call sites sit in three controller files plus `Avatar.enter`.

### The `Extra` cost, measured

Of `Character`'s 15 mixins, on an `Extra` row: **5 read, 2 marginal,
8 dead.**

| dead | why |
|---|---|
| `Persona` | ⛔⛔ `lint:identity` rule 5 makes `prologue`/`competence`/`circumstance`/`renown` on an Extra a **build error** |
| `BeliefStore` | ⛔⛔ `keepsPersonalRegard() → false`; `viewerKey` returns `null` — memory-only, discarded at reboot |
| `Caster` · `Memorized` | no role casts; the narrowing cited exactly this as the tell that the wolf was misfiled |
| `Gendered` · `Status` · `Dispositioned` · `Hiding` | no Extra authors any of them; a role's personality *"never changes"* |

And the four `Extra` rows author **exactly one field between them**
(`institution` on the sentry). ⚠ One of the four is not a character at
all — `costume/student.yaml` is an abstract parent row whose own header
calls itself *"a known rough edge"*.

### The Cast census, re-taken

**49 Cast** (43 direct + 6 TS subclasses) and **4 Extra**, confirmed —
plus one `Mercenary` on neither rung. But:

- ⚠ The slate's *"18 seated with no work brain"* is **23** (17 if
  `shifts` counts as work). The 18 was the sum of four other buckets.
- 🔴 **13 are pure roles** — a roster seat, no work brain, and **no
  reference anywhere**: the dyehouse dyer, the market baker and
  fishmonger, the undertaker, two Hearts-Delight farmers, five
  Rejection hands, two haulage hands.
- ⭐ **The eight goods-yards hands are one role instanced eight times
  under eight invented names** — same archetype, one `consigns` brain,
  no external reference. The teller pathology at 8× volume.
- ⭐⭐ **The demotion signal is already in the data.** **24 of the 49
  are `register: indefinite` with a name** — their prose reads *"a brisk
  Goodkin teller"* while their class asserts a singleton individual with
  a private ledger. Every one of the 13 pure roles is indefinite-with-a-
  name or nameless.
- ⚠ **One Cast is invisible to `lint:identity` entirely** — the dyer
  row has no `behaviors:` key and the census loop `continue`s past it.

### ⚠⚠ The singleton does not throw where content actually goes

`StuffApi.clone` throws for a `SingletonMixin` class. **But NPCs are not
cloned** — they are staged by a location's `cast:`, and `StagedMixin`
branches: singleton → `StuffApi.singleton`, and if the instance is
already placed and the entry carries no placement, it **`continue`s**.

So a second counting house naming the teller in its `cast:` produces
**a hall with no teller, silently** — or, with a placement, *moves the
one Wenna out of the first hall*. Neither throws. The slate's conclusion
("cannot staff a second counting house") is right; the mechanism is a
silent no-op, and only a build-time lint catches it.

What actually breaks with two live instances is **shared identity**:
a Cast row clones with no `asIdentityPath`, so both instances return the
row path, and everything keyed on identity collides — belief, chronicle,
transcript, renown, grants, chattel, **bank accounts**, employments.
That is the same defect class that once gave every player one bank
account.

### The `Persona` blocker, resolved

- **0 authored** confirmed — `bio` and `aspiration` appear in zero rows.
- ⚠ The reach is **57 rows / 12 classes**, not 60/14: the beasts already
  came off the person rung in the last build.
- ⚠ `prologue` on `CastMixin` is **not a duplicate field** — it is the
  authoring surface that *feeds* `Persona.seedChronicleClaims` and
  guards on `MixinApi.isPersona`. And only **18 of 49** Cast author it,
  so 31 are the same unmitigated gap.
- ⚠ The blocker is **14 affordances, not 15**, all in the `self` slot.
- ⭐⭐ **And the fork the slate poses has a measured answer.**
  `CommandGiverMixin` **affords nothing today** and has **two**
  composers — `Character` and `Login`. Every `Character` composes both.
  Moving the 14 there buys no host that wants them; it adds only
  `Login`, breaking the invariant its own docstring states: *"the
  recency stack IS the sandbox — no world verbs leak because `Login`
  composes none of the mixins that contribute them."* Eleven of the 14
  would refuse with *"Login can't do that"* at a character-select
  prompt, three would not refuse at all, and `quit` would answer *"you
  hold no position"* to somebody trying to disconnect.

**Therefore what is genuinely new here is:** a **role rung below
`Character`** that stops claiming eight things the engine already
refuses; a **client boundary** that makes *"a different client is a
different renderer"* true of the code and not only the protocol; and
**one honest home for the verbs every person can type** — which turns
out to be `Character` itself.

---

## Goals

- ⭐ **A locality can staff a second counting house** — a role can be
  instanced more than once, and the attempt either works or refuses
  out loud. No silent empty hall, no teller teleported out of the first.
- **A role stops claiming to be a person.** The eight mixins the engine
  already refuses on an `Extra` are not composed on it, so the
  `<composition>` panel a player reads tells the truth.
- **Every verb a person can type is afforded from one honest place**,
  and none of them is afforded by a biography.
- **The cockpit is separable from the connection.** A third-party client
  needs the connection set and the client-state mechanism; it does not
  need this client's modes, arrangements, shelf or cards — and after
  this build the code says so.
- **`Character` is the person rung and says what it is.** Everything on
  it is true of every person; everything not true of a role is below it,
  and everything not true of a body is above it.
- **A refactor with no behaviour change, except the two defects it
  fixes** — the silent staging no-op and the affordances that move
  without disappearing.

## Non-goals

- **`su`, and the three-way driver/identity/body split** → the
  [avatar-family slate](../slates/builds/avatar-family-slate.md).
  ⛔ **Decided this cycle: the driver/identity line is not observable.**
  `su` does not exist — no view, no controller, and every `transferTo`
  call site moves *your own* sockets between *your own* bodies. Death
  discriminates identity from body and is shipped; nothing discriminates
  driver from identity, because one human is one person today. This
  build sorts on **the line that can fail** and leaves the finer one
  written down.
- **The sandbox overlay** (`copy` mode, the nine collections, the
  in-fiction refusal) → `docs/plans/sandbox-overlay-plan.md`, written
  and unbuilt. Independent; no file overlap.
- **The per-mixin capture allowlist, the phase axis, the death spec** →
  avatar-family Sequencing 5–7.
- **Splitting a person into two OBJECTS.** ⛔ Explicitly refused —
  `mortality.md` chose one composition on purpose: *"the whole verb
  surface has to survive losing a body, and re-deriving it as a parallel
  stack would start missing verbs immediately. Activations differ;
  composition does not."* This build re-sorts **one chain**.
- **Writing the 31 missing biographies** → a content wave, filed with
  the narrowing slate's other two content burn-downs.
- **`Corpse`'s branch** (Agent vs Thing) → the narrowing slate.
- **A runtime Extra→Cast promotion.** There is none and this build does
  not build one: `Cast.ts` and `identity.md` both state *"promotion is
  an authoring act"*, and a rung is fixed at construction. Nowhere,
  deliberately.
- **Retiring `lint:identity`'s brain-gated census loop** — ⚠ the dyer
  row proves it has a blind spot. Filed as a gate fix inside this build
  (see D9), not as a separate cycle.

## Placement

**Kernel, with a content tail.** The rungs, the mixins and the
affordance statics are all engine (`packages/server/src/mud/`). Stage C
re-authors rows that live in six content packs, but authors nothing new.

⭐ The second-instance test is the build's own headline goal: **a second
counting house must need zero code.** Today it needs a second invented
person. After this build it needs a second row naming the same role, or
the same row staged twice — and if neither can work, it must say so.

## Collisions

- **Every locality with a staffed business** — Terminus (29 Cast),
  Rejection (6), trade-haulage (3), the lounge (5), Hearthworks (2),
  Hearts Delight (2), the university (1), Newbie Wilds (1). Stage C
  touches rows in all of them.
- ⚠ **Odile is untouchable** and the audit agrees — a `prologue`, a
  renown claim, two roster seats, and the canonical example in three
  subsystem docs.
- ⚠ **Dave, Gus, Ricky, Katie, Walter, the three lounge bartenders,
  Ambrose Tull** — people, with trees, bespoke classes or work brains.
  Not candidates.
- **`Login`** — its pre-world verb sandbox is a stated invariant and
  this build must not widen it. It is also the reason the 14 verbs do
  not go to `CommandGiver`.
- **The wiki `<composition>` panel** — it renders a template's mixin
  list to any player, ungated. It is what makes a false claim *visible*,
  and it is the acceptance surface for "a role stops claiming to be a
  person."
- **`Display`** — a screen in a room writes `cockpit.watch` on a viewer
  and pushes it. ⚠ So *"the cockpit is not a driver"* is complicated:
  a world object drives cockpit state. The split must keep that working.
- **The eight `cmd/shell/*.test.ts` fixtures** compose
  `HasInteractiveMixin` to get cockpit behaviour and will need to
  compose two mixins after the split; ~30 other test composers use it
  purely as *"is this thing connected?"* and must not have to change.

## Surface decisions

### D1 — Two buckets, on the line that can fail: BODY vs PERSON

The slate sorts driver / identity / body. **Driver is unobservable** (no
`su`), so this build sorts on death — *what comes back?* — and calls the
two halves **body** and **person**.

This is a **labelling that decides where a mixin sits in the one
chain**, not a split into two objects (see Non-goals). Driver-shaped
state (the cockpit, aliases, the workspace, the focus) lands in
**person** for now, annotated as the driver sub-bucket for the day `su`
ships. ⭐ Nothing in this build depends on that annotation being right,
which is the point of deferring it.

### D2 — A role rung below `Character`

`Extra` stops extending the person stack. The eight mixins the engine
already refuses on a role — `Persona`, `BeliefStore`, `Caster`,
`Memorized`, `Gendered`, `Status`, `Dispositioned`, `Hiding` — are not
composed on it.

The five it genuinely reads (`Employed`, `CommandGiver`, `Vocal`,
`Soul`, `Perceiver`) stay, and so do the two marginal ones (`Hauler`,
`Advancement`) — ⚠ **erring on composing when it is a tossup** is the
owner's standing rule, and `Hauler`'s own docstring says it sits high so
that `hitch` can *refuse* a wolf rather than be missing on one.

⭐ The evidence standard is the narrowing build's D1 and it is met
unusually well here: this is not *"no row authors it"* (which is
ambiguous), it is *"the engine throws a build error if a row does"*.

### D3 — The 14 verbs go onto `Character` as a class static

Not `CommandGiver` (measured cost above: one class gains, and it is the
one that must not). Not a new mixin — ⭐ **there is nothing to
parameterize**; every `Character` gets all 14, which is exactly what a
class static expresses and what `Avatar`'s own 17-verb static already
does one rung up.

**`Persona` keeps only what it is about**: `bio`, `aspiration`, and the
chronicle mint. It then moves to `CastMixin` + `Avatar` — the two rungs
that are somebody — which is the `Named` precedent, and `CastMixin`'s
`isPersona` guard becomes unconditional on the Cast side.

⚠ Note what this does *not* do: it deduplicates nothing. `prologue` is a
feeder, not a copy.

### D4 — `HasInteractive` splits three ways, cockpit first

**`SaxonbergClient`** takes the cockpit — the ~620 lines, methods *and*
schema entries. The connection set and the client-state substrate stay.
The split test is the product's: *anything a third-party client would
not need is not `HasInteractive`.*

⚠ **The name stays on the connection half.** `_mixinName` is
load-bearing as a *string* — `PresenceLogic` gates on
`FromMixin('HasInteractiveMixin', …)` — and `MixinApi.isHasInteractive`
narrows at ~70 sites. Whichever half loses the name costs 70 re-typings;
the connection half is the one everything else means.

⚠ **`Login` must not lose or gain a verb.** The `cockpit` verb tree is
afforded from the connection mixin today and rides onto `Login`
harmlessly. Moving it to `SaxonbergClient` changes `Login`'s verb set —
a behaviour change wearing a refactor's clothes. `Login` composes both,
or the contribution moves to `Avatar`'s static. **The build decides by
measurement, and the drive checks it.**

### D5 — ⚠⚠ The fork-slice move is the dangerous one

`forkSlice_ClientState` / `mergeSlice_ClientState` are discovered by
**prefix reflection over the prototype chain**, not by registration.
Move the pair to a mixin some host does not compose and it **stops
firing with no compile error** — silently losing the
preferences-across-the-boundary behaviour that method was written to
fix.

So: the slice pair moves with the client-state substrate, never with the
cockpit, and **a test pins that a body crossing into a circle still
carries its client state.** ⭐ This is the half of the move nobody would
have made a test for, which is exactly when to write one.

### D6 — A role may be instanced more than once, and the refusal is loud

The silent `continue` in the staging path goes. Two outcomes, both
audible:

- **A role** (`Extra`, and a demoted Cast) stages as many times as a
  `cast:` asks for. A second counting house gets a teller.
- **A person** (`Cast` proper, a singleton) staged twice **refuses in
  fiction and at build time**, naming the row — never a silent empty
  hall, never a person teleported out of the hall they were in.

⚠ This is the one behaviour change in the build that is not a pure
move, and it is a defect fix: today the failure is invisible.

### D7 — A role gets an identity that is not a shared one

The reason a Cast must be a singleton is that a Cast row clones with no
`asIdentityPath`, so two instances share one identity — and everything
identity-keyed collides, up to and including bank accounts.

A role instanced N times needs N identities or none. ⭐ **None is the
honest answer**: a role *has no history* is already the declared rule
(`lint:identity` enforces it), so a role needs no durable identity key
at all, and `keepsPersonalRegard() → false` already says so. The rung's
own semantics supply the answer the singleton was standing in for.

### D8 — The demotion list, and who decides it

**Demote (13 + 8):** the 13 pure roles — seat, no work brain, no
reference anywhere — and the eight goods-yards hands, who are one role
under eight invented names.

**Keep as people:** anything with a dialogue tree, a bespoke class, a
work brain, a renown claim, or an external reference. Odile explicitly.

⚠ **The eight hands are the judgment call in this build**, because they
*do* have work brains (`consigns`, `cellars`) — they fail the audit on
*"eight invented names for one role"*, not on doing nothing. A role with
a work brain is legitimate; eight of them pretending to be individuals
is the pathology. **Demoting them is the recommendation and it is the
one item a reviewer should look at first.**

⭐ Cross-check available for free: a **named Cast with `register:
indefinite`** is a role somebody gave a name to, and all 13 plus the
hands fall on that side.

### D9 — The census gate gains a second pass

`lint:identity` skips any row with no `behaviors:` key, which is why one
named Cast with a roster seat is invisible to every rule in the file.
A rung rule that inherits that blind spot would certify the tree while
missing rows. The second pass iterates all organism rows, on the
existing precedent of the file's own name-shaped-key rule.

### D10 — `ShelledCharacter` is dissolved

46 lines, an empty class body, one consumer, five mixins that are all
n=1. It is *"not a layer; it is a name for a composition"* — and with
the cockpit split and the person/body sort, naming that composition
stops being useful. Its five mixins compose directly where they belong.

⚠ If the build finds the name is load-bearing somewhere (a gate, a doc,
a narrowing), it stays and the finding is recorded — dissolving it is
worth nothing on its own.

## Lens pass

1. **Pedagogy** — thin, honestly. The one real claim: the
   `<composition>` panel is a **teaching surface** rendered to every
   player ungated, so a role that advertises a spell repertoire and a
   private memory teaches the world wrong. This build makes ~21 rows
   stop lying to a reader.
2. **Expression** — ⭐ the decisive limb, and it chose D6. *A second
   venue should need zero pack code* is the project's own placement
   test, and the realm currently fails it for staff: a second counting
   house needs a second invented person. Authoring a teller twice is the
   ordinary case, and it does not work.
3a. **Immersion** — the silent empty hall is the acute failure. A
   locality author stages a teller, reloads, and the hall is empty with
   nothing said. Fiction that omits a person without comment is worse
   than one that refuses.
3b. **Participation** — a polity that can staff its own institutions
   without inventing biographies can build institutions faster than we
   can write people for them. ⭐ That is *can the polity do something we
   did not want* pointed in the useful direction.
4. **Values** — the undecidable one is D8: **when is a character a
   person?** We answer it by revealed evidence — a tree, a brain, a
   claim, a reference — and not by authorial intent, because intent is
   unmeasurable and the data already disagrees with it in 24 places.
   ⚠ Recorded as the grain, not an invariant: an author may name and
   keep anyone; the build only moves the ones nothing is using.
5. **Continuity** — unaffected. A role answers the same commands in any
   epoch; this is under the fiction.
6. **Economy** — produces nothing, consumes nothing. ⭐ Second-order and
   real: eight hands sharing one identity today means eight roster seats
   whose wages, transcripts and renown all key to the same person. The
   demotion is also a ledger correction.
7. **Governance** — it judges nobody. ⚠ One adjacency: `office`,
   `appoint` and `title` move in D3, and those verbs *do* judge people.
   Moving an affordance must not move a gate — every validator and
   controller refusal stays exactly where it is, and the drive checks
   that the founder-only mutations are still founder-only.

## The drive

Two sessions — **Ada** (a player) and **Fen** (the founder, who stages
content). Written before the code exists.

**The role end**

1. **Fen:** stand up a second counting house whose `cast:` names the
   same teller row as the first → **a teller is standing in it.** Today
   this produces an empty hall, silently, or moves Wenna out of the
   first hall.
2. **Fen:** go to the first counting house → **its teller is still
   there.** The two are separate bodies.
3. **Ada:** `look teller` in each → both read as *the teller*. `chronicle
   the teller` → refused **in fiction**: a role has no history.
4. **Ada:** `examine` the teller's composition through the wiki panel →
   **no `Caster`, no `Memorized`, no `BeliefStore`, no `Persona`.** It
   claims what it is.
5. **Fen:** stage **Odile** (a person) twice → **refused out loud**,
   naming the row. Not silence, not a teleport.

**The person end**

6. **Ada:** `cockpit`, set a layout, save an arrangement, `quit` and log
   back in → **the arrangement is still there.** The client-state split
   did not drop the persistence.
7. **Ada:** walk through the wardrobe into her circle, set a cockpit
   preference, come back out → ⚠ **the preference survived the
   crossing.** This is D5's silent-failure check and it is the reason
   the fork slice's home matters.
8. **Ada:** `me`, `profile`, `who`, `office`, `title` → **all still
   work.** The 14 verbs moved home; none vanished.
9. **Ada:** `appoint` somebody to an organization she has no authority
   over → **refused with the same sentence as today.** The affordance
   moved; the gate did not.
10. **Fen:** `office assign` → **works, founder-only, as today.**

**The boundary**

11. **At the character-select prompt, before embodying:** type `quit` →
    ⚠ **it is still not a world verb.** `Login`'s pre-world sandbox is
    intact, and it neither gained the 14 nor lost `cockpit`.
12. **Ada:** die, become a shade, `reembody` → **her name, contacts and
    aliases come back; her wounds do not.** The body/person sort holds
    across the one boundary that can test it.

## Acceptance criteria

*Observable from outside the code.*

- **A second counting house has a teller in it**, staged from the same
  row as the first, with both halls staffed simultaneously.
- **Staging a person twice is refused out loud**, naming the row — at
  build time and at run time. No silent empty room; nobody teleported.
- **A role's composition panel shows no spell repertoire, no private
  memory, no biography** — a player reading the wiki sees what the role
  is.
- **No verb a player could type before this build is missing after it**,
  and no verb refuses differently than it did.
- **The character-select prompt affords exactly what it afforded
  before** — no world verbs leaked in, `cockpit` did not leak out.
- **A cockpit arrangement survives a logout, and survives a round trip
  through a circle.**
- **A player who dies and re-embodies keeps their name, contacts and
  aliases**, and does not keep their injuries.
- **Every demoted row is still doing its job**: the market still has a
  baker, the yards still consign, the haulage dispatcher still
  dispatches.
- **`lint:identity` sees every character row**, including one with no
  `behaviors:` key.

## Cross-references

- [avatar-family-slate](../slates/builds/avatar-family-slate.md) —
  Sequencing 9; the spine table; `HasInteractive` is three concerns.
- [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  — the Extra taxonomy; `Persona` off `Character`; the D1 evidence
  standard this build inherits.
- [identity.md](../subsystems/identity.md) — the `Cast`/`Extra` rungs.
- [behavior.md](../subsystems/behavior.md) — brains, and what a work
  brain is.
- [cockpit.md](../subsystems/cockpit.md),
  [display.md](../subsystems/display.md) — the cockpit surface and the
  screen that writes to it.
- [connection.md](../subsystems/connection.md) — the connection set.
- [mortality.md](../subsystems/mortality.md) — *activations differ;
  composition does not*, and the death test D1 sorts on.
- [positioning.md](../positioning.md) — *a different client is a
  different renderer*, which D4 makes true of the code.
- `docs/plans/sandbox-overlay-plan.md` — the parked sibling build.
