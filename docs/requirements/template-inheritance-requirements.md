# Template inheritance — requirements

**Kind:** feature (with a create→clone sweep riding it)
**Leads from:** kernel — first consumer is **Dave's Bar**, the lounge's
bar row, which exercises every new mechanism in one file and ships in
this build.

A template row cannot say **"like that one, but different."** That one
missing sentence is why 1,527 rows repeat the same hydrator line, why
thirteen crate rows each list twelve identical limes, why the glass rack
lists sixty-four glasses one at a time, why two bars carry
twenty-one-entry prop lists that differ by one, and why the engine mints
lightning, a shade, a ticket and every exit in the realm out of code
instead of content.

It is also why **a non-wizard cannot create a template row at all.**
The refusal says so in its own words:

> *"only a wizard may set executable code-naming field(s) […] on a
> content template; **protowizards author by cloning/customizing
> wizard-made templates**"*

That sentence describes a mechanism that does not exist. ⭐ The refusal
is already the progression UI; this build is what lifts it.

Seeded by [legibility-slate](../slates/builds/legibility-slate.md)
Parts A and B — *"a design conversation that started as 'we need
template inheritance' and turned out to be one problem wearing four
hats."* Parts C and D stay on the slate.

---

## What already exists

Almost all of the machinery. That is the survey's finding, and it is the
same finding three times over — **the mechanisms are built and have no
way to be asked for.**

| part | state |
|---|---|
| **the clone pipeline** | ships — `class` → instance, two-phase hydration, instruction appliers, the folder/leaf invariant |
| **inheritance itself** | ⛔ absent, and documented as absent: *"Template inheritance does not exist… if real template-data inheritance is ever wanted, it's a deliberate platform feature, not a per-subsystem hack"* (`ref-shapes.md`) |
| **a parent the tree already wants** | ⭐ **authored, in prose** — `can.yaml` and `crate.yaml` both say *"this is the STANDARD a product is built against… template inheritance does not exist, so a product row repeats these fields rather than referencing this one — the row is the exemplar and the README is the contract"* |
| **biome ancestry** | ships, as biome's own private mechanism — a per-read, per-field fall-through chain with a cycle guard, a depth cap, and provenance |
| **exit kinds** | ⭐⭐ ships and is **all but unused** — an exits entry may name a `kind:` and be cloned from a row. **194 authored exits; 3 name a kind.** The other 191 fall through to a constructor, and three kind rows exist in the whole tree |
| **the props once-guard** | ships — per-instance, survives capture/restore, so merging a parent's props cannot double-apply |
| **the access transitive set** | ships — `props[]`, `container`, `exits[].destination` need no per-field gate because each names a template that passed the class gate |
| **the protowizard delta rule** | ships — a cosmetic edit passes, introducing a code-naming field is refused. It has no path to accept a *new* row, because every new row names a class |
| **`cp` / `mv`** | ship, **wizard-only** — so a protowizard cannot copy a row either |
| **the CMS, the Studio and the shell tree** | ship — four doors onto a row (Studio's schema-driven form is the real non-dev one, on the property *authoring is free while only publish is gated*), all funnelling through one authoring chokepoint |
| **what an author can do through them** | ⛔ **tweak, only.** A protowizard may edit cosmetics on a row a wizard already made and may compose in the Studio. They **cannot copy an existing thing into a new one** — the single most natural authoring gesture there is |

And the repetition the absence causes, measured on today's tree
(the slate's counts were taken at `c8c4d5056` and have grown):

| | then | now |
|---|---|---|
| template rows | 1,559 | **1,893** |
| rows repeating the one hydrator line | 1,214 | **1,527** — every row that has data, and there is only one hydrator |
| `props:` entries | 433 | **540**, of which **201 (37%) are pure repeats** |
| cohorts of ≥3 sibling rows sharing ≥3 identical fields | — | **42**, covering 210 rows |
| objects minted in code that no row describes | — | **38 call sites**, 23 of them exits |

⭐⭐ **And the envelope build, merged 2026-09-25, handed this one a better
exemplar than it had.** `costume:` arrived as the third designation —
what a cast member wears — because until then *every authored person in
the realm was naked*. Forty-five rows were dressed by hand:

| bundle | rows |
|---|---|
| shirt · trousers · canvas shoes | **20** |
| …the same three **plus a field jacket** | 11 |
| …plus a **blazer** | 8 |
| …plus a **tweed jacket** | 3 |
| …plus a **white coat** | 1 |
| shirt · trousers · **hide jerkin · leather boots** | 2 |

**Six distinct bundles across 160 entries, and four of the six are the
same three garments plus exactly one.** There is no way to write
*dressed like a student* — so it was written forty-five times, four days
ago, by someone who had just finished arguing that a row should not have
to repeat itself.

It is also the best test case in the tree, because it exercises all
three merge behaviours in one cohort: **inherit verbatim** (20 rows),
**append one** (four bundles), and **substitute** (the sentry and the
duelist, whose boots and jerkin replace the shoes).

**Therefore what is genuinely new here is four sentences a row cannot
say today:** *this row is like that one* · *there are twelve of these* ·
*this entry is the one called `tablet`* · and *I am a person who may
write a row.* Everything else in the build is pointing existing
machinery at those sentences.

---

## Goals

- **An author writes only the difference.** A row can name a parent row
  and inherit its data; what the child states, the child wins.
- **A row can say how many, and which one.** A props entry can carry a
  count, and can name itself so a descendant substitutes exactly that
  entry and inherits the rest.
- **Everything in the world is born from a row a person can edit.**
  Code may patch an object after it is cloned; code no longer *defines*
  objects that have no row. What can be said in the template is said in
  the template. ⚠ This governs **objects that exist** — it is not a
  claim that more things should be objects. The envelope build's street
  lighting is the counter-example and it is correct: the service is a
  property of the street and *no lamp object exists anywhere*.
- **An exit is content.** Its prose, its passability and its media come
  from a row, not from a constructor.
- **A protowizard can create a template row** — by declaring a parent
  instead of a class, which introduces no executable field and so passes
  the delta rule unchanged. `access.md`'s deferred v2 relaxation, in a
  better shape than the vetted catalogue it imagined.
- **Biome stops owning a private inheritance mechanism**, while behaving
  exactly as it does today.
- **The repetition can only fall.** Two censuses ship as ratchets so the
  counts above cannot grow back while the migration is incremental.

## Non-goals

- **Multiple parents.** Nowhere, deliberately — the slate measured for
  crossing axes and found none that were not already refs.
- **Flattening at install.** Nowhere, deliberately — it would make
  inheritance a git-checkout-only feature and break `pack --export`'s
  round-trip.
- **A vetted class catalogue for protowizards.** Stays deferred in
  [access-slate](../slates/tails/access-slate.md); this build makes it
  less necessary, not more.
- **A hydrator default.** Nowhere, deliberately — hydrators are about to
  multiply ([hydration-framework-slate](../slates/builds/hydration-framework-slate.md)),
  so the field stays explicit and becomes the best thing a parent row
  carries.
- **Narrowing base classes so a row composes only what it uses.** The
  next build — and it gets an order of magnitude cheaper once a cohort's
  class lives in one parent row instead of sixteen children.
- **Migrating the 42 measured cohorts.** The next build, with the base
  classes, because *what the parent of a cohort is called* is the same
  question as *what class that cohort should be*.
- **`exits:` inheriting.** Nowhere, deliberately — two rooms sharing a
  parent would inherit each other's neighbours.
- **Contents grouping and the `sense` verb** (legibility Parts C and D).
  Stay on [legibility-slate](../slates/builds/legibility-slate.md).
- **What biomes are and how they are organized.** A dedicated build.
  This one moves the field and leaves the rows and the resolver alone.
- **Making the go-live no-op visible.** Editing a row does not reach
  live instances today; it still will not. The reverse dependent index
  stays on the legibility slate as an open item — and the money-integrity
  slate has already traced the same seam (contents are guarded by the
  run-once appliers, *fields are not*), so the two want to land together
  later, not here.
- **Unifying zone field lookup with row parenting.** Nowhere this build;
  they are documented as one family with a stated precedence and left as
  two mechanisms.
- **Retiring the vessel-category string.** A note in
  [bulk.md](../subsystems/bulk.md); it has three live consumers.
- **Editor and tooling support for parents** — completion, dangling-ref
  diagnostics, cycle warnings, an effective-value/source inspector.
  [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md)
  owns reference validation, and [cms-slate](../slates/builds/cms-slate.md)
  owns the field-surface widget. This build ships the *mechanism* and
  boot-time refusals, not the authoring ergonomics.
- **A vetted-catalogue membership validator.** Overlapping claim with
  [scoped-authoring-slate](../slates/tails/scoped-authoring-slate.md);
  that slate keeps it. What this build delivers is the narrower and
  better thing — authoring that needs no catalogue because it names no
  class.
- **Pushing Document population toward plain construction.**
  [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
  Wave 3 proposes the opposite direction for the objects that are *not*
  world Stuff. ⭐ The two do not collide because they are about different
  populations: **this build governs what exists in the world; that one
  governs the Document track.** Neither should be cited at the other's
  call sites.

---

## Placement

**The kernel, and the platform pack.** `extends:` is a property of a
template row, so it belongs to whatever reads rows — which is every
pack. It cannot be a pack's feature.

Exit kinds split on one question — *can the engine refuse to boot
without it?*

- **Kernel-required kinds → the platform pack**, under a lowercase
  `exits/` namespace beside the platform's other rows. The engine's own
  exit-minting fallback cannot depend on an optional pack being
  installed.
- **Flavour kinds → the commons**, where `stair` and `archway` already
  live. Nothing moves.
- **A pack's own kinds → that pack**, beside its own rows — the
  residence system's gates and stairs, the university's dorm doors.

⭐ **The test — does a second instance need code?** A second bar that
wants Dave's fixtures with its own tablet is **five lines of YAML and no
code**, where today it is a twenty-five-line copy. That is the first
time the test passes for a *row* rather than for a venue archetype.

---

## Collisions

| what is already there | who lives there | what this build touches |
|---|---|---|
| **Dave's Bar** (the lounge) | ⭐ **Mara** — and her restocking brain names the back-bar, the glass rack and the ice bin **by template path**, then counts what is on them | the bar's 25-entry prop list becomes ~5; the rack's 64 entries become 10. ⚠ Her count must still see twelve coupes — this is the build's sharpest silent-failure risk |
| **the hospitality bar** | the trade's own venue row | becomes the parent Dave's Bar extends |
| **the glass rack** | stands in both bars | 64 entries → 10 |
| **the general store counter** | stocks `crate-of-limes` at par 3, priced, with a supplier | the 13 crate rows each collapse 11 duplicate entries; the par sheet and pricing must be untouched |
| **Duncan Hall's dorm warren** | students; floors appear when someone rents | 5 code-minted exits become clones of dorm-door and floor-stair rows |
| **the residence system's warrens** | plat gates, holding doors, building stairs | 9 code-minted exits become rows |
| **every vessel with an `out` exit** | carts, boats | the synthesized egress becomes a row |
| **the sandbox circle** | anyone in the holodeck | the circle floor and the crossing exit get rows |
| **the infirmary ward** | patients, the medic loop | a 20-entry prop list with 4 repeats |
| **the bottling line** | `can` and its four products | the documented exemplar; `can-of-cola` extends `can` |
| **12 biome rows** | the whole realm's atmosphere | one field renamed; the resolver untouched |
| **the shade, the lightning strike, the retail ticket** | the dying, storms, the general store | each gains a row and takes its prose out of code |

Two collisions are with **documents**, not places, and both are the kind
that goes stale silently:

- ⚠⚠ **Two unbuilt CMS editors are specified against inheritance not
  existing.** The room editor's field surface is designed as *"flat
  templates, no inheritance"* and the zone editor's bulk edit is
  described as *"the no-template-inheritance 'change the default
  everywhere'"*. Both premises die the day this ships. Neither is built,
  so nothing breaks — but the slate must be corrected in the same pass or
  someone builds against a false premise later. The happier reading: the
  effective-value / source / local-override widget that slate wanted
  becomes the natural way to *view* a parent chain.
- ⚠ **A lint gate inverts meaning.** One shipped check flags a row for
  carrying a redundant hydrator line. Under inheritance, "redundant"
  changes definition — a line that restates the parent's is the redundant
  one, and a line on a parentless row is not. The gate has to be re-aimed
  rather than kept or deleted.

The one nobody would have asked about is Mara. A brain that resolves a
fixture by path and counts its contents is exactly the reader a change
to *how* those contents are minted can break without any test noticing.

⭐⭐ **And that reader now has a name.** The envelope build coined
[*"a consumer written when the input was SMALL"*](../antipatterns.md) —
code that was correct for years because a value was always small, always
authored, or always from one source, and that goes quietly wrong when a
build makes it large, derived or many. It does not throw; it returns a
plausible number. Envelope hit it three times in one cycle.

**This build is a factory for that shape**, and naming it is the sieve:
a props list stops coming from one row, a hydrator line stops being on
the row that uses it, and `count` makes N instances where a reader may
have assumed one per path. Every collision above is an instance. The
requirement it generates is stated in the acceptance criteria as
*observably unchanged*, and in the drive as counting things by hand.

---

## Surface decisions

### A parent is an ordinary row, named explicitly, resolved at runtime

Carried from the slate, which argued all three: path-ancestry is
structurally impossible under the folder/leaf invariant; flattening at
install is silently lossy through `pack --export` and makes authoring a
git-checkout privilege; and an abstract-row concept would be built on
speculation when both documented exemplars are objects a player can
hold.

**Single parent.** The slate tested for crossing axes rather than
assuming, and found that the one axis that would force composition —
material × form — is already a ref. *The axes that genuinely cross are
already refs.* If a future case wants two parents, that is the signal
the second should have been a ref.

### The hydrator line stays explicit

It is the most repeated line in the tree and the temptation is to
default it. **No.** Hydrators are about to multiply — a belief hydrator,
a hydrator that reads a different collection entirely — so a row's
hydrator is a real varying fact that must be stated. What changes is
*where* it is stated: once, on the parent, instead of on 1,527 children.

The line stops being noise and starts being the answer to *which cohort
am I in*.

### Instruction fields inherit, merged by entry identity

The slate flagged this as the hazard: *"append and replace are each
right about half the time and both fail with no error — 24 limes in a
crate, or a bar with no stools."*

⭐ **That is true only while entries have no identity.** Give an entry a
name and the merge rule is the one already settled for map-shaped
fields: **by key, child wins.** An entry with no name keys on its
template path, which is what the engine already does internally. So the
rule is uniform and the dangerous case disappears.

This is why the entry shape is not optional garnish on inheritance — it
is the precondition that makes inheritance definable. Taking one without
the other means shipping the slate's fallback (*instruction fields do
not inherit, full stop*), which kills the bar exemplar.

**`exits:` remains excluded**, for the reason above.

### Counts belong to props alone; naming belongs to all four lists

The tree carries four list-shaped designation fields, and only one of
them repeats itself:

| field | rows | entries | pure repeats |
|---|---|---|---|
| `props:` — the set dressing | 104 | 541 | **201 (37%)** |
| `cast:` — the troupe | 47 | 57 | 0 |
| `costume:` — what a cast member wears | 45 | 160 | 0 |
| `adornments:` | 8 | 9 | 0 |

**A count is a props feature.** A troupe is people and people are not
interchangeable; nobody wears two identical shirts. A count on the other
three would be a feature with no users and a bad idea about NPCs.

**Entry naming applies to all four**, because substituting one cast
member, or one garment, is the same authoring act as substituting one
prop — and ⭐ the costume list turns out to be where it is wanted most
(below).

### Everything inherits; a child unsets by stating nothing

The slate asked whether descriptive fields should inherit at all,
noting that a crate child which forgets its keywords inherits *empty* as
a search term on a full crate.

**They inherit.** "Descriptive" is not a category the engine has, and
inventing one would mean a rule nobody can predict the boundary of. The
crate's *empty* keyword is a bug in the crate row, and the honest fix is
to fix the row — which the exemplar migration does.

⚠ **A divergence to state plainly, because conflating the two would be
a real defect:** in the generic mechanism a stated `null` means *the
value is null*. In biome's resolver a stated null means *fall through*.
Biome keeps its own semantics because biome keeps its own resolver.

### Biome hands over the field and keeps the walk

The whole mechanism has **one** production consumer — the ancestry walk
— and its setter has none outside tests. So biome gives up its private
field, reads the unified parent link instead, and its resolver is
untouched: per-read fall-through, the cycle guard, the depth cap, and
the ancestor-provenance that `trace atmosphere` renders all survive
exactly as they are.

⭐ This is also what dissolves the go-live question. Biome keeps
resolving per read because it keeps its own resolver; everything else
resolves when it is cloned. Nothing regresses and no general decision is
forced.

An instance-level override is retained — **set wins, otherwise the row
wins** — because a biome constructed at runtime has no row, and because
it is the seam the existing tests use.

### `create()` survives only where there is no object to author

The pattern being kept is real: a factory that builds something out of
runtime state, because the dependencies fall out that way. What is being
refused is *starting from nothing*. **Clone the row, then patch what the
row could not know.**

So `create()` remains legitimate in exactly two shapes:

- **the framework seam itself** — the calls that take a factory as a
  parameter, which are the mechanism and not a use of it;
- **connection-layer attachments** — a per-socket object with no world
  identity, and framework attachments that ride another object and are
  never template-backed.

Everything else clones. The count is 38 today and 6 after.

### The three substrate classes that get cloned are split, not moved

Three classes live in `lib/` and are instanced, under a documented
carve-out: *the test is whether an instance carries a template-path
stamp, not whether it is ever constructed*. Under this build they all
carry a stamp, so the carve-out stops distinguishing anything.

**They split** — the substrate stays in `lib/`, a concrete twin absorbs
the clones, exactly as seven other classes already do. Nothing clones
`/lib/`, and the headline invariant is untouched rather than
renegotiated.

### A parent in a pack that is not installed is a boot failure

Pack ordering already derives dependencies and throws on a cycle, but
the pack **filter** applies after ordering and silently ignores an
omitted pack — so filtering out a parent's pack would install a child
with a dangling parent. **Throw at reconcile.** A silent dangling parent
is the failure class this project keeps paying for.

### A class-less row is what opens authoring

A child row that names a parent and no class introduces no executable
field, so the delta rule passes it with no new argument. That is the
whole relaxation: **not a new permission, an absence of the thing the
old permission was guarding.**

`cp` and `mv` relax to match for rows that name no class. A row that
names a class stays wizard-only, unchanged.

### `extends:` names a row, not code — so it joins the transitive set, not the gate

The code-naming gate guards three fields that resolve to **executable
code**: the class, the hydrator, and a brain. A parent link resolves to
**another row**, which passed that same gate itself. That is exactly the
argument the access doctrine already makes for the fields that name
templates, one hop further out, so `extends:` needs no new reasoning and
no new gate.

Stating it explicitly because the opposite reading is available and
wrong: inheriting a class is not naming one. A protowizard who extends a
row gets that row's class without ever being able to choose it, change
it, or point it somewhere else. **The blast radius of the old permission
is unchanged; only the ceremony around it is gone.**

### Archetypes expand; rows parent — and they stay different things

The cast substrate applies an archetype by **expansion** — it stamps a
row with a bundle of values at authoring time — and its design says in
so many words that this is *"not template inheritance… an archetype is
applied by expansion, not by parenting."*

That stays true and the two do not merge. An archetype is a **stamp
saying what kind of person this is**, resolved once and readable on the
row afterwards; a parent is a **live relation** that keeps answering.
The tell is what happens when the source changes: edit an archetype and
the rows it already stamped do not move, which is correct, because a
person does not change species when the species row is edited.

Both surfaces will exist on cast rows. Requirements consequence:
**nothing in this build teaches archetypes to parent**, and the cast
doc gains a sentence saying which gesture is which.

### Deleting a parent is refused, not cascaded

Pack reconcile removes a row when it vanishes from its pack's files, and
that path does not know about cross-row dependencies. With parents, a
vanished row can orphan descendants in other packs.

**A row that something extends cannot be deleted while a descendant
exists**, and the refusal names the descendants. Not a cascade — a
cascade deletes content an author never asked about — and not a silent
orphan, which is the failure class this project keeps paying for. This
is the same ruling as the dangling cross-pack parent, applied to the
other direction.

### Two inheritance mechanisms will coexist, and must be named as a family

Zone field lookup already walks ancestry nearest-first and falls through
on null — the same contract as a parent chain, over a different spine
(the path tree rather than an explicit link). **Neither absorbs the
other in this build.** They answer different questions: a zone says
*what is true of everywhere inside here*, a parent says *what this thing
is like*.

⚠ The requirement is documentation, not code: an author who does not
know which one wins will guess, and both mechanisms are silent when they
lose. The subsystem docs must present them as one family with a stated
precedence, and the exemplar rows must not demonstrate both at once.

### The vessel-category workaround stays

One shipped field exists, by its own doc's admission, *because template
inheritance does not exist* — a shared string standing in for the
relation between an empty vessel and the product it becomes. That
rationale dies here.

**The field does not.** Three live consumers read the string, and
removing a working field to make a point is not what this build is for.
Its doc gains an honest note; retiring it is a separate, later question.

---

## Lens pass

**1 · Pedagogy — a recorded gap.** No Discipline is exercised and none
should be; this is substrate, and pretending otherwise would be a fact
sheet dressed as a curriculum. The one honest half-entry: the *"like
that one, but different"* relation currently lives in README prose on
two rows, so the world's own structure is not derivable by reading it.
Making the relation a field makes the content tree legible to the person
reading it. That is small, and it is real.

**2 · Creative expression — decisive, and this lens alone justifies the
build.** Both tiers, and the build is aimed at the first. *The ordinary
case with no code*: a second bar is five lines. *The bespoke case
without breaking*: patching after the clone is explicitly preserved, so
the escape hatch is not removed, it is demoted from default to
exception. The lens's own failure description — *"content that is
enumerated instead of composed"* and *"a feature whose second instance
requires a kernel edit"* — is a description of the tree today: 64
enumerated glasses, twelve enumerated limes, an exit that requires a
constructor.

**3 · Immersion — positive, modestly.** Exits gain authored prose, which
is the difference between *"you go north"* and *"you take the stairs."*
The shade, the lightning strike and the ticket stop being described in
code where no author can reach them.

**4 · Values — one real entry: who may author.** Today a protowizard can
edit cosmetics on things that already exist and can create nothing. The
platform's standing rule is that **everyone is an author** and that an
author tier is a category error. This build confers the capability by
removing what blocked it rather than by granting a tier — the child row
simply has nothing dangerous in it. Standing is conferred by the
mechanism, not by an administrator.

**5 · Epochs — holds trivially.** A template row and its parent are
epoch-free; nothing here models a technology.

**6 · Economy — a recorded gap.** Nothing is produced or consumed in
fiction. The nearest economic surface is incidental: the crate rows and
the glass rack are stocked goods, and the general store's par sheet and
Mara's restocking brain read them. The requirement is therefore
conservative — **the economic flows must be observably unchanged**,
which is an acceptance criterion rather than a design goal.

---

## The drive

Run live, in a browser, against the running game. ⚠ The wire drive is
not this drive — a browser is what reads the prose.

**A — the author's half (the relaxation)**

1. Log in as a **protowizard**, not a wizard. Confirm the character has
   a workspace and can `cd` the content tree.
2. Create a new row that declares the bottling `can` as its parent, no
   class, with only a short description and its own interior material —
   a can of ginger beer. **It is accepted.** Today the same act is
   refused, and the refusal names the mechanism this build adds.
3. Create a second row that names a class. **It is refused**, with the
   existing wording. The old gate is intact.
4. Clone the ginger beer into your hands and look at it. It is a can —
   the parent's capacity, closure, construction and material-from-the-
   parent are all present — and the fill and the description are yours.

**B — counts and substitution (Dave's Bar)**

5. Go to Dave's Bar. `look`. Every fixture the hospitality bar has is
   present: the back-bar, the well, the tools resting on the well, the
   stations, the seats, the glass rack.
6. Look at the glass rack. **Twelve coupes and twelve highballs** are on
   it, plus the rest — sixty-four glasses from ten authored lines.
7. Look at the back-bar. The tablet resting on it is the **lounge's**
   house tablet, not the hospitality trade's. Exactly one entry was
   substituted.
8. The lounge's own four additions — the works board, the receiving
   bench, the counter, the menu — are present. Nothing is doubled:
   count the stools and the glasses and there is one set, not two.
9. Wait for Mara's restock beat, or trigger it. **She still counts the
   rack correctly** and posts a shortfall only for what is actually
   short.

**C — a crate**

10. At the general store, buy a crate of limes. It is priced as before
    and the par sheet is unchanged.
11. Open it. **Twelve limes**, from one authored line.

**C2 — a costume (the cohort envelope just wrote)**

12. Look at Mara, Dave, Augie and Remy behind the bar. All four are
    **dressed the same** — shirt, trousers, canvas shoes — from a row
    that names a parent and nothing else.
13. Look at Sloane. Same three garments **plus the blazer**, from a row
    that appends one line.
14. Find the sentry or the duelist. Shirt and trousers inherited, but
    **boots and a jerkin in place of the canvas shoes** — one entry
    substituted, not appended. Nobody is wearing two pairs of footwear.

**D — exits are content**

15. In Duncan Hall, cause the warren to grow a floor (rent a room).
    Take the stairs between floors. The departure and arrival lines are
    the **authored** stair prose, not a bare direction.
16. Edit the stair kind row's departure line and publish it. Cause a
    *new* stair to be built and take it. **The new prose appears** —
    proving the exit's words are content, not code.
17. Walk out of a vessel by its `out` exit. It still works and reads
    correctly.

**E — biome is unchanged**

18. `trace atmosphere` indoors. The chain still reports **which ancestor
    biome supplied each value**, down to the root.
19. Stand outdoors in weather. Temperature, wind and precipitation read
    as they did before the build.

**F — the objects that had no row**

20. Cause a storm strike in the open. The thunderclap reads from the
    row, and the strike still conducts.
21. Reach a shade (die, or be shown one). Its description is the row's,
    and reembodiment still works.

**G — the refusals that keep it honest**

22. Try to delete the bottling `can` row while its products still extend
    it. **It is refused, and the refusal names the descendants.**
23. Point a row's parent at a path that does not exist and publish it.
    **The boot stops and names the missing parent** — it does not install
    a row with a dangling link.

**H — nothing is doubled, anywhere**

24. Reboot. Walk Dave's Bar, the ward, the cookhouse and the campus farm
    yard. **No fixture appears twice.** This is the check the once-guard
    is supposed to make impossible and which merging makes worth
    re-proving.

---

## Acceptance criteria

Observable from outside the code.

1. **A protowizard creates a template row that did not exist before**,
   by naming a parent, and clones it in-game. The same character is
   still refused a row that names a class.
2. **Dave's Bar is authored in about five lines** and renders every
   fixture the hospitality bar renders, with its own tablet on the
   back-bar and its own four additions, and nothing duplicated.
3. **The glass rack holds sixty-four glasses from ten authored lines**,
   and Mara's restocking beat counts them correctly.
4. **A crate of limes holds twelve limes from one authored line**, and
   is bought, priced and stocked exactly as before.
5. **Forty-five dressed NPCs are authored from six bundles**, and every
   one is wearing exactly what they wore before the build — one pair of
   shoes, one jacket, nobody doubled and nobody undressed.
6. **An exit's departure and arrival prose comes from a row**, and
   editing that row changes what newly built exits say.
7. **`trace atmosphere` reports the same values and the same ancestor
   provenance as before the build**, indoors and out.
8. **A storm strike, a shade and a retail ticket each read from an
   editable row**, and each still does what it did.
9. **Nothing in the realm is duplicated after a reboot** — no room
   gains a second set of fixtures, no crate a second dozen.
10. **A row whose parent lives in a pack that is not installed stops the
   boot with a message that names the parent** — it does not install
   silently.
11. **Every object that exists in the world is born from a row**, except
    the framework seam and the connection layer, and that exception is
    enumerated rather than described.
12. **Deleting a row that something extends is refused, and the refusal
    names what still depends on it.** Nothing is orphaned and nothing is
    cascaded away.
13. **A protowizard who extends a row still cannot choose, change or
    redirect its class** — the old refusal fires unchanged on every
    attempt to name code.

---

## Cross-references

**Seeding slates**
- [legibility-slate](../slates/builds/legibility-slate.md) — Parts A and
  B are this build. Parts C (contents grouping) and D (the `sense` verb)
  stay.
- [hydration-framework-slate](../slates/builds/hydration-framework-slate.md)
  — why the hydrator line stays explicit.
- [access-slate](../slates/tails/access-slate.md) — the v2 relaxation
  this build delivers sideways, and the catalogue it does not.

**Slates this build invalidates or constrains — correct them at the sweep**
- [cms-slate](../slates/builds/cms-slate.md) — ⚠⚠ two unbuilt editors
  are designed against "no inheritance"; both premises die here.
- [cast-archetype-slate](../slates/builds/cast-archetype-slate.md) —
  says archetypes are *"not template inheritance"*; still true, and now
  needs to say which gesture is which.
- [scoped-authoring-slate](../slates/tails/scoped-authoring-slate.md) —
  overlapping claim on the authoring relaxation.
- [content-pack-units](../slates/tails/content-pack-units.md) — the
  reconcile unit gains a cross-row dependency; its unbuilt manifest
  validation is the long-term home of the dangling-parent check.
- [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
  — Wave 3 runs the opposite direction on the Document track; the
  boundary is stated above.
- [spawn-distribution-slate](../slates/builds/spawn-distribution-slate.md)
  — owns the props/cast vocabulary; a count needs a line there.
- [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md)
  — inherits the tooling this build deliberately does not write.
- [call-security-performance-slate](../slates/tails/call-security-performance-slate.md)
  — the standing measurement behind the "a parent walk is a memory hop"
  claim; if template lookup is not resident, that claim needs re-taking.

**Subsystem docs whose claims change**
- [templates.md](../subsystems/templates.md) — the clone pipeline, the
  Hydrator contract, and the already-flagged *"don't lock the props entry
  shape"* note this cashes in (⭐ it anticipates a reset cadence on the
  entry; take that into account while the shape is open). Also *"when
  `hydratorClass` is absent no hydrator runs and `data` is inert"* —
  false as written once absent-on-the-row stops meaning absent.
- [ref-shapes.md](../ref-shapes.md) — *"template
  inheritance does not exist"* becomes false; the identity/lineage
  doctrine gains a third relation.
- [content-packs.md](../subsystems/content-packs.md) — cross-pack
  parents, the reconcile hash, `--export`'s round-trip.
- [access.md](../subsystems/access.md) — the transitive set gains one
  hop; the class-less row and the `cp`/`mv` relaxation.
- [boundary.md](../subsystems/boundary.md) — exit kinds stop being
  optional; ⭐ the sentence *"a bare passage has nothing authored, so it
  earns no row"* is the one this build reverses.
- [bulk.md](../subsystems/bulk.md) and
  [furnishing.md](../subsystems/furnishing.md) — both carry a *"template
  inheritance does not exist, so…"* rationale for a shipped workaround.
- [zone.md](../subsystems/zone.md) and
  [location.md](../subsystems/location.md) — zone field lookup becomes
  one of two inheritance mechanisms and needs the family pointer.
- [biome.md](../subsystems/biome.md) — the field moves; the resolver
  does not.
- [architecture.md](../architecture.md) — the `lib/` "instanced but
  never stamped" carve-out dissolves into three splits.
- [antipatterns.md](../antipatterns.md) — `StuffApi.create()` instead of
  a template gains the positive rule: clone the row, then patch.
- [lint-family.md](../lint-family.md) — two new censuses.

**Related**
- The base-class narrowing build, which follows this one and is made
  much cheaper by it.
- The biome organization build, which this one deliberately does not
  anticipate.
