# The Avatar family — requirements

**Kind:** refactor/sweep
**Leads from:** kernel — first consumers are the three shipped bodies a
player already passes through (`Avatar`, `Shade`, `WireBody`) and the
one non-Avatar that shares their connection surface (`Login`). No new
content; no new capability. Every line of this build is about what the
existing classes CLAIM.

**`Avatar` is not designed; it accreted.** 1,649 lines over six
concerns, two descendants that are the same eight overrides twice, and
a 1,168-line connection mixin carrying six concerns of its own — one of
which is ~620 lines of *this particular client's* UI vocabulary.

The build has one thesis, and it is the owner's own framing:

> **Three of our notions are real and each deserves a name: *a human is
> driving this* · *this one has a full command line* · *this is what our
> client needs*. What is left after naming them is the pile of little
> overrides on the three bodies — and those should be expressed some way
> more modular than an override, because everything else in this game
> composes.**

⭐ And the naming half is not cosmetic: `Avatar`, `Shade` and `WireBody`
read as three unrelated nouns. **They are one thing in different phases
of play**, and the code agrees — `WireBody`'s own docstring opens *"An
Avatar SUBCLASS, deliberately."*

Seeded by [avatar-family-slate](../slates/builds/avatar-family-slate.md),
whose § *The four vessels* and § *Measured 2026-09-30* carry the full
survey this doc rests on. ⚠ Read those before planning; the numbers are
not repeated here.

---

## What already exists

Measured at `89c75417c`; detail on the slate.

- **`HasInteractive`** — 1,168 lines, **six** concerns (connection set
  ~53 lines · client state · cockpit · presence · residency ·
  identity/portrait · spatial · the sandbox slices · a verb surface).
  Dependency runs **COCKPIT → CS → CONN with zero edges back**, and the
  cockpit is **~620 lines** once the `clientStateSchema` entries are
  counted. Composed by `Avatar` and by **`Login`**, which is not an
  Avatar at all.
- **`ShelledCharacter`** — 46 lines, empty body, abstract, **one**
  consumer, five mixins that are **all n=1**: `Author`, `Workspace`,
  `Alias`, `Environment`, `Focused`. The most movable unit in the tree,
  and it already means exactly one thing.
- **`Avatar`** — 13 mixins, and eight of them have no composer but
  `Avatar`. `enter()` is 210 lines. ⚠ `EstateMixin` declares **zero
  fields** while `Avatar` carries `escheatedAt` and `beneficiary`.
- **`Shade` / `WireBody`** — eight duplicated overrides, of which
  ⭐ **six answer one question**: *is this the body of record?*
  (`shouldPersist`, `startAutoSave`, `getPlayerId`, `getIdentityPath`,
  the reaping, `announceSessionPresence`.) Two of the eight
  (`shouldPersist`/`startAutoSave`) are gated elsewhere; see Non-goals.
- ⛔ **`playerId` exists under three names** — `Avatar.playerId`,
  `Shade.shadePlayerId`, `WireBody.wirePlayerId`, the latter two
  **persistent fields in their own right**, each with two overrides to
  normalize them back.
- **The precedent for a rung that does not branch** — the narrowing
  build minted `Holder` and `Actor` as deliberately twin-less rungs
  whose only job is to name a responsibility.
- ⭐ **The precedent for a difference expressed as data** —
  `Shade.getConferredMixinNames() → ['AetherMixin']`. The only place in
  the family where a capability difference is *conferred* rather than
  *composed*, and the existing proof that these differences can be data.

**Therefore what is genuinely new here is** three names for three real
notions, and one honest home for a policy currently answered twice.

## Goals

- **Each of the three notions has a name and holds only itself** — a
  human is driving · a full command line · our client's own surface.
- **A second client is a rendering problem, not a kernel problem.**
  After this build, what a third-party client must implement is exactly
  the connection set and the client-state mechanism, and the code says
  so rather than the protocol doc saying so.
- **The three bodies read as one family in different phases**, by name.
- ⭐ **No policy is answered twice.** Where `Shade` and `WireBody` give
  the same answer to the same question, there is one place that answers
  it — and it is a rung or a capability, not a copied override.
- **One value has one name.** No field carried under three names, no
  getter overridden to undo a copy.
- **A part of the stack you can point at knows what it is responsible
  for** — intermediary rungs where a level of responsibility exists,
  even where nothing branches.
- **Behaviour is unchanged**, except the defects named in Surface
  decisions.

## Non-goals

- **The Cast / Extra taxonomy, the demotion audit and the singleton
  staging defect** → [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  § *The Extra taxonomy*, where the full audit now lives. ⭐ Considered
  for this build and **dropped**: it is not about Avatar, and it roughly
  doubles the cycle.
- **`Persona`'s 14 affordances and its fields** → the same slate. They
  matter to `Character`, which this build does not re-sort.
- **The sandbox overlay** → `docs/plans/sandbox-overlay-plan.md`,
  written and unbuilt. ⚠ It retires `WireBody.shouldPersist()`
  structurally in its W3; this build must not collide with that — see D6.
- **The per-mixin capture allowlist** (which is what would retire
  `shouldPersist` for `Shade` too) → avatar-family slate § Sequencing 5.
- **The death spec joined to `reembody`** → same slate, § Sequencing 7.
  ⚠ The slate now records *why the shortcut is barred*: `reembody` may
  never read the corpse, so the captured-and-inert fork slices are the
  only honest route back.
- **`Corpse`** → related to this family and **not a member of it**: no
  identity, no driver, its own clock. Its branch question stays the
  narrowing slate's.
- **Renaming `Login`, or moving it off the Agent branch** → nowhere,
  deliberately. *`Avatar` is your handle in the game world and `Login`
  is not in the world yet.* Making it `CommandGiverMixin(Idea)` is
  arguable and low-stakes; this build does not.
- **`su`, and any driver/identity distinction** → the slate. ⛔ `su`
  does not exist, so the line is unobservable; this build does not sort
  on it.

## Placement

**Kernel**, with one question the build must answer rather than assume.

⭐ **Is `SaxonbergClient` a pack?** The owner's instinct is that it might
be — it is *"all the stuff needed for our specific client"*, which is
the definition of something the platform should not require. The test is
already written down: **a pack may ship `lib/` substrate but never an
Api or a logic singleton.** So the question is entirely *does any of the
~620 lines need Api surface* — and the build answers it by trying.

⚠ Whichever way it lands, the **boundary** is the deliverable: a
third-party client implements the connection set and the client-state
mechanism and nothing else. A pack is the stronger proof and the
better outcome; kernel-with-a-clean-seam is acceptable.

## Collisions

- ⚠ **`Login`** composes `HasInteractiveMixin` and is **not an Avatar**.
  It is the test case that stops the connection half becoming avatar
  plumbing. It also currently receives the whole `cockpit` verb tree
  from that mixin, which its own comment calls *"harmless"* — so the
  split changes `Login`'s verb set unless something is done about it.
  **Its pre-world verb sandbox is a stated invariant and must survive.**
- **`Display`** — a screen in a room writes `cockpit.watch` on a viewer
  and pushes it. A world object drives client state; the split keeps it
  working.
- **`CommandGiver`** reads `cockpit.inputModes` during dispatch — the
  cockpit keyspace is load-bearing in the command spine, not only the
  renderer.
- **~30 test fixtures** compose `HasInteractiveMixin` purely as *"is
  this connected?"* and must not have to change; **eight** compose it to
  get cockpit behaviour and will need both halves.
- **The client** (`packages/client/src`) makes **zero** direct calls to
  any of this — it speaks wire types only. ⭐ The boundary this build
  draws is already true of the protocol; the build makes it true of the
  code.

## Surface decisions

### D1 — `Avatar` becomes abstract, with three named concrete classes

Not one class with a phase field. ⭐ The reason is the slate's own and
it is about the verb surface: *"re-deriving it as a parallel stack would
be drift by construction"* — the composition must be identical across
phases, which inheritance guarantees and a field does not.

So: an abstract `Avatar` nothing instances, and **three concrete
classes whose names say how the avatar is USED in the game.**

### D2 — ⭐ The names are deliberately NOT decided here

`Avatar` · `Shade` · `WireBody` read as three unrelated nouns and will
change. **What they change to is decided after the decomposition is
visible, not before** — the candidate axes are *permanence* (the one
that lasts vs the ones that do not; the axis the code branches on
today), *agency* (what you can do from it), and *phase of play* (living
/ dead / rehearsing, with permanence falling out).

⚠ This is an open question surviving into the plan **on purpose**, which
this project normally forbids. The justification: every previous naming
call here was made from a hunch and two were wrong within one build
(`Movable`, `Animate`). The plan's job is to make the responsibilities
legible; the names follow from that and are the owner's.

⛔ **The build may not pick them silently.** It proposes, with the
decomposition in hand, and stops.

### D3 — `HasInteractive` splits along its own dependency direction

Three homes, in the order the coupling already runs:

- **the connection set** — *a human is on the other side driving this
  agent*. What `Login` needs and all it needs.
- **the client-state mechanism** — the generic keyed store, the schema
  plumbing, the push channel.
- **`SaxonbergClient`** — modes, arrangements, cards, shelf, tabs,
  overlay style: the ~620 lines that are *our* client's vocabulary.

⚠ **The name `HasInteractiveMixin` stays on the connection half.** It is
load-bearing as a *string* (`PresenceLogic` gates
`FromMixin('HasInteractiveMixin', …)`) and `MixinApi.isHasInteractive`
narrows at ~70 sites. Whichever half loses it costs 70 re-typings.

⚠ **Four concerns are in that file and belong to none of the three** —
presence, residency (`canEvict`), identity (`getPortraitUrl`) and
spatial (`refreshDisplays`). The build rehomes them or states why each
stays; it does not leave them unexamined in whichever half is convenient.

### D4 — ⚠⚠ The fork slice moves with the client-state mechanism, and a test pins it

`forkSlice_ClientState` / `mergeSlice_ClientState` are discovered by
**prefix reflection over the prototype chain**, not registration. Move
them to a mixin some host does not compose and they **stop firing with
no compile error**, silently losing the preferences-across-the-boundary
behaviour the method was written to fix.

**This is the highest-risk edit in the build** and it gets the test that
pins the half of the move nobody would otherwise check.

### D5 — `ShelledCharacter` keeps its meaning and gets a name that says it

*You have a full command line an NPC would not normally have* — aliases,
scripting, a workspace, settings, a focus. That is a real notion and it
already has exactly the right five mixins.

⛔ It is **not** dissolved (an earlier draft of this doc proposed that;
it was wrong). ⚠ But the name does not say the notion. Renamed, on the
same axis and at the same time as D2.

### D6 — One question, one answer: the "body of record" policy

Six of the eight duplicated overrides answer *is this the body of
record?* — it persists, it holds the `PlayerApi` slot, it owns the
identity rather than borrowing it, it is saved rather than reaped.

**That policy gets one home.** ⭐ **Whether that home is an intermediary
CLASS or a capability on the abstract `Avatar` is the plan's to decide**,
and the test is this project's own: *if a guard is needed to re-narrow
the host set, the host is wrong.* Both have precedent in the tree — the
twin-less rung (`Holder`, `Actor`) and conferral-over-composition
(`Shade.getConferredMixinNames`).

⚠ Two of the eight are **not** in scope: `shouldPersist` and
`startAutoSave` are gated on the capture allowlist, and `WireBody`'s
half is already claimed by the sandbox overlay build. The honest end
state is stated so nobody expects empty subclasses: **each body keeps
only what actually differs about it.**

### D7 — One `playerId`, not three

`shadePlayerId` and `wirePlayerId` are `Avatar.playerId` under two more
names, each a persistent field, each with two overrides to normalize it
back. One field; the copies and the four overrides go.

⚠ **A wrong answer here is invisible and expensive.** Keying a person
wrongly once cost a shared bank account and a dead labour market,
silently. This one is proved through the store with a round trip, not
with a unit assertion. (`shadeSpecies` / `wireSpecies` are the same
mistake in a second slot and collapse the same way.)

### D8 — The estate's state joins its behaviour

`EstateMixin` declares `static fieldMeta = {}` while `Avatar` carries
`escheatedAt` and `beneficiary`. The mixin holds the behaviour and the
class holds the state, which is why neither reads as owning the concept.

⚠ Bounded against [estate-nesting-slate](../slates/builds/estate-nesting-slate.md),
an unbuilt build about what an estate record *contains*: **this changes
where two fields live, never what a record holds.** If the build cannot
honour that line it stops and files.

### D9 — `enter()` is decomposed

210 lines (`Avatar.ts:901-1111`) spanning the welcome payload, the
loadout, presence, routing and the autosave arm — the method every new
player goes through and the hardest thing in the file to review.
Decomposed along seams it already has internally. No behaviour change.

### D10 — What the composition panel shows is an acceptance surface

The wiki `<composition>` panel renders a template's mixin list **to any
player, ungated**. It is where a false claim becomes visible, and it is
how the drive checks that the names and the rungs now say something
true. A refactor nobody can see is still visible there.

## Lens pass

1. **Pedagogy** — thin, and left thin. The only honest claim: the
   composition panel is a teaching surface, so a body that advertises
   capabilities it does not have teaches the world wrong.
2. **Expression** — ⭐ the decisive limb, and it is what makes
   `SaxonbergClient` worth doing: *a second instance should need zero
   code*, and a second **client** currently needs a kernel that already
   knows about cockpit modes. Drawing that boundary is lens 2 applied to
   the client rather than to content.
3a. **Immersion** — untouched; this is under the fiction. ⚠ The one
   exposure is D2: three bodies with unrelated names are a small
   continuous lie to anyone reading the composition panel.
3b. **Participation** — nothing opens. Recorded as a gap.
4. **Values** — the undecidable one is D6: **is "the body of record" a
   kind of thing or a property of a thing?** Neither answer is derivable;
   the tree has precedent for both, and the choice is about which kind of
   mistake we would rather make later.
5. **Continuity** — unaffected.
6. **Economy** — produces nothing, consumes nothing. ⚠ One real
   second-order effect: D7. Three names for one player key is how a
   ledger ends up attributed to the wrong body.
7. **Governance** — judges nobody.

## The drive

⚠ **Almost every step checks that something did NOT change.** That is
the shape of an honest refactor drive, and the two exceptions are named.

**Ada**, a player, and **Fen**, the founder.

1. **Ada:** log in, reach character select, and — before embodying —
   confirm the prompt affords **exactly what it affords today**. No
   world verb leaked in; `cockpit` did not leak out. ⭐ This is the
   `Login` invariant and it is step one because the split is most
   likely to break it.
2. **Ada:** `embody` a new character → she arrives with her default
   loadout. `enter()` still does all of it.
3. **Ada:** `cockpit`, set a layout, save an arrangement, log out, log
   back in → **the arrangement is still there.**
4. **Ada:** set a cockpit preference, THEN go into her circle through
   the wardrobe → ⚠ **the preference came with her.** This is D4's
   silent-failure check, and it drives the **fork** direction only.
   ⛔ **Corrected at plan time — an earlier draft of this step asserted
   that a preference changed INSIDE the circle survives coming out. It
   does not, today or after this build:** `ClientState` is fork-only in
   practice (`HasInteractive.ts:735-737`), because
   `EPISTEMIC_MERGE_ALLOWLIST = ['Contacts']` is the whole allowlist and
   nothing else merges back from anywhere. Adding merge-back is
   avatar-family slate § Sequencing 6, not this build. ⭐ The check that
   matters here is unchanged in force: the fork is what fails **silently**
   if the slice moves to a mixin a host does not compose.
5. **Ada:** in the circle, `score` → **the same player** as outside.
   Then die, become a shade, `score` again → **still the same player.**
   One `playerId` read from three bodies.
6. ⚠ **Ada:** bank money, die, `reembody`, check her balance → **it is
   hers.** D7 asserted through the store, because this is the failure
   that is invisible until it is a shared account.
7. **Ada:** as a shade, confirm she has lost the verbs a ghost should
   lose and kept the ones she should keep — unchanged from today.
8. **Fen:** confirm Ada's estate still escheats on the same clock — two
   fields changed host, nothing about the schedule did.
9. **Ada:** open the wiki composition panel for each of the three bodies
   → ⭐ **the three read as one family**, and each shows what it is
   responsible for. This is the one step that checks the build achieved
   something rather than broke nothing.
10. **A second client, on paper:** list what a third-party renderer must
    implement. ⭐ It is the connection set and the client-state
    mechanism, and nothing about modes, arrangements or shelves.

## Acceptance criteria

- **The character-select prompt affords exactly what it did before.**
- **A new player still arrives with their loadout.**
- **A cockpit arrangement survives a logout**, and **travels into a
  circle with the body**. ⚠ Not out of one — nothing merges back from a
  circle except contacts, by design.
- **A player reads as the same person from all three bodies**, and their
  money follows them through death and back.
- **A shade has lost and kept exactly the verbs it did before.**
- ⭐ **A player reading the composition panel sees three bodies that
  obviously belong to one family**, each naming what it is responsible
  for.
- ⭐ **What a third-party client must implement can be stated in one
  sentence**, and no part of it is this client's UI vocabulary.
- **No name in the family is carried by more than one field.**

## Cross-references

- [avatar-family-slate](../slates/builds/avatar-family-slate.md) — the
  seeding slate: § *The four vessels*, § *Measured 2026-09-30*, and the
  sequencing this build is item 9 of.
- [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  — the Cast/Extra work this build dropped, with its audit.
- [connection.md](../subsystems/connection.md) ·
  [cockpit.md](../subsystems/cockpit.md) ·
  [display.md](../subsystems/display.md)
- [mortality.md](../subsystems/mortality.md) — the shade, the corpse,
  and *activations differ; composition does not*.
- [sandbox.md](../subsystems/sandbox.md) — the crossing and the wire body.
- [positioning.md](../positioning.md) — *a different client is a
  different renderer, nothing more*, which D3 makes true of the code.
- `docs/plans/sandbox-overlay-plan.md` — the parked sibling build that
  claims `WireBody.shouldPersist()`.
