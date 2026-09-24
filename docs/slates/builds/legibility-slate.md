# Legibility slate — what a row repeats, and what a room says

> **Status: UNBUILT** — nothing here exists. Template inheritance is
> explicitly absent (`ref-shapes.md` § the identity/lineage doctrine);
> `props:` entries carry neither count nor key; the four contents
> renders disagree; the `sense` verb is `look` minus four features.
> **Left:** `extends:` on template rows (runtime-resolved, single
> parent, an ordinary row, folded into access.md's transitive set — and
> the `cp`/`mv` D5 relaxation it delivers) · the `props:` entry shape
> (`count` + `as`) ·
> the instruction-field merge rule · contents **grouping** beside
> `looseContents`, consumed by the same three call sites · the card's
> dead `+N more` · cut `sense`, point arrival at `look` · untagged prose
> becomes vision-channel prose
> **Size:** a build — ⭐ **Part A (`extends:`) is carvable on its own**
> **Wanted by:** [structure-slate](structure-slate.md) (membership-primary
> means every interior Location names its structure; `extends:` makes that one
> line per room instead of a field per room) · `cast-archetype-slate` had to
> disclaim it by name. ⭐⭐ **Raised 2026-09-24 for promotion** — it is
> prerequisite-shaped, Part A is unusually small for a platform feature (no
> new gate, `Biome._extendsBiomePath` to copy wholesale, *"the cost is near
> zero"*), and **there are no migrations**: a build that ships before it
> authors the expensive way and lives with it. ⚠ Re-take the counts first —
> see the measurement note below; they are the argument for single-parent and
> they have sat eight days through several builds.

> Written 2026-09-16 out of a
> design conversation that started as "we need template inheritance" and
> turned out to be one problem wearing four hats.
>
> ⚠ Every measurement below was taken against the tree at
> `c8c4d5056`. The counts are the argument; re-take them if this sits.

See also:

- [templates.md](../../subsystems/templates.md) — the clone pipeline,
  the Hydrator's two-phase dispatch, the `props`/`cast` once-guard, and
  the **already-flagged** "don't lock the props entry shape" note that
  Part B cashes in.
- [ref-shapes.md](../../ref-shapes.md) — *"Template inheritance does not
  exist… if real template-data inheritance is ever wanted, it's a
  deliberate platform feature, not a per-subsystem hack."* This slate is
  that deliberation.
- [content-packs.md](../../subsystems/content-packs.md) — the reconcile
  hash preimage, `--export`'s round-trip, the derived `dependsOn`
  topological sort, `SAXONBERG_PACKS`.
- [access.md](../../subsystems/access.md) — the code-trust lockdown, the
  delta rule, the transitive set, and the **deferred v2 relaxation**
  that Part A delivers as a side effect.
- [card-surface.md](../../subsystems/card-surface.md) — the one `subject`
  card, `StuffKind` layout, live-scoped-to-attention.
- [stacks.md](../../subsystems/stacks.md) — fungible stacks, and why they
  are *not* the answer to the bar's six stools.
- [senses.md](../../subsystems/senses.md) — the multi-sense substrate
  that Part D discovers has never been used by a single content row.
- [senses-slate.md](senses-slate.md) — the *physics*
  deferrals (smell trails, echolocation, ESP walk). Disjoint from Part D,
  which is about the verbs.

---

## Principle

> **Multiplicity has no representation anywhere in this stack.**

A crate row repeats `/trade/farming/thing/lime` twelve times because the
author has no way to write *twelve*. A bar prints "a bar stool, a bar
stool, a bar stool, a bar stool, a bar stool, a bar stool" because the
renderer has no way to say *six*. The hospitality bar and Dave's Bar
carry twenty-one-entry `props:` lists that differ by **one line**
because a row has no way to say *that one, but different*.

Those are the same gap at three altitudes — authoring, merging,
reading — and that is why this is one build rather than three. Fixing
any one of them alone leaves the other two paying for it.

⭐ **The corollary that keeps the parts honest:** the authored count and
the rendered group are *not* the same fact. An author writing
`{ path: stool, count: 6 }` is saying how many to mint. Whether those
six are still interchangeable is a question only the runtime can answer,
and the moment somebody sits on one the answer is no. So Part B buys
authoring brevity and buys presentation **nothing** — which is what lets
the parts ship in either order.

---

## Part A — `extends:` on template rows

### The pain, measured

1,559 template rows. `hydratorClass: /platform/idea/persistence/PersistentHydrator`
appears on **1,214** of them — the single most repeated line in the
content tree by a factor of three. Behind it, `composition: []` ×116,
`biologicalSource: null` ×106.

Sibling cohorts share real field data: ten `ConsumableMaterial` rows in
`trade-farming/idea/material/` share six identical keys; sixteen
`Species` rows under `…/homo/` share eight; four hospitality materials
share ten.

And the tree has already invented parents it cannot name.
`trade-bottling/thing/can.yaml`:

> *"The can — the EMPTY vessel bottling fills. **This is the STANDARD a
> canned product is built against**: same class, same capacity, same
> construction, plus the fill (see `can-of-cola.yaml`). Template
> inheritance does not exist, so a product row repeats these fields
> rather than referencing this one — **the row is the exemplar and the
> README is the contract.**"*

`can` → `can-of-cola` shares 7 of 17 keys verbatim. `trade-farming/thing/crate.yaml`
says the same thing in the same words. `VesselKindMixin`'s `category`
field exists, per [bulk.md](../../subsystems/bulk.md), *because* the
relationship had nowhere else to live.

### Decided: resolve at runtime, do not flatten at install

Four arguments, in descending force:

1. **`pack --export` already round-trips DB rows back to source files.**
   Under flattening, a row that went out with `extends:` comes back
   flattened. Silently lossy the first time anyone uses it.
2. **Flattening makes inheritance a git-checkout-only feature.** The
   `domain` collection is the protowizard-editable authoring space and
   the CMS is the author surface for everyone who is not a dev. A parent
   that exists only in pack YAML is an author tier, which is a category
   error here.
3. **Cross-pack extension has no honest flattening point.** Flatten
   against live DB state and pack B's canonical hash stops being a
   function of pack B's files — which breaks the `file == DB`
   convergence model the reconcile runs on. Don't, and upgrading pack A
   leaves B's rows stale with no signal, because B's own hash never moved.
4. **The cost is near zero.** `findByPath` does not go to the database —
   the `content` collection is resident and a by-path read is answered
   from memory, hit or miss. A parent walk is a memory hop in a pipeline
   that already walks every ancestor path for zone resolution.

### Decided: an explicit `extends:` ref, not path-ancestry

Structurally forced: the folder/leaf invariant says a leaf must not have
descendant templates, so `/trade/farming/thing/crate` cannot be the
parent of `/…/crate/of-limes` and stay a leaf.

Precedent: `Biome._extendsBiomePath` resolves a chain per read with
`null` meaning *fall through*, and it **deliberately moved off**
path-walking so the inheritance graph stays independent of what the path
tree means (domain ownership). Steal its shape, including its depth
guard.

### Decided: a single parent

Tested rather than assumed. Taking every `key=value` on ≥5 rows as a
candidate axis and looking for row sets that *properly overlap* (the
signature of two independent axes):

- Multi-key bundles sharing an identical row set across ≥4 rows: **eight
  in the whole tree, zero crossing pairs.**
- Loosening to single pairs produced 126 crossings, but strip the
  default-shaped values (`composition: []` × `biologicalSource: null`
  alone accounts for 101 rows in common) and what remains is
  overwhelmingly fields of *one* cohort crossing each other — Species,
  Topic, spirit-bottle.

The reason is the useful part: the axis that would force composition is
**material × form**, and material is not copied field data in this tree,
it is a ref (`_materialPath` on 12 distinct classes for iron, 17 for
oak). ⭐ **The axes that genuinely cross are already refs**, so the axis
left over for inheritance is single. If a future case wants two, that is
a signal the second should have been a ref — a better outcome than a
diamond.

### Decided: the parent is an ordinary row

No abstract-row concept, no new namespace, no `kind: fragment`. Both
documented exemplars are cloneable objects a player can hold — an empty
can, an empty crate. The `/lib/` precedent (only-ever-inherited
substrate gets a namespace *and* a lint saying nothing instances it)
exists if a real abstract case ever shows up; don't build it on
speculation.

### Decided: no new gate — and it pays for an old one

`extends:` belongs in access.md's **transitive set**. That section's
argument for why `props[]`, `container`, `exits[].destination` need no
per-field gate is that each names another template, which must itself
have passed the `class` gate. `extends:` is that shape one hop further,
so `TemplateLogic.transitiveClosure.test.ts` covers it without a new
argument.

⭐⭐ **And it dissolves the `cp`/`mv` D5 tightening.** D5 made copy
wizard-only because copying a `class` into a new path is the delta
rule's blind spot — with the consequence that a protowizard can only
edit cosmetic data on things that already exist. With inheritance the
child row **contains no `class` field at all**:

```yaml
extends: /trade/bottling/thing/can
data:
  shortDescription: a can of ginger beer
  interiorMaterial: /trade/bottling/idea/material/ginger-beer
```

The delta rule passes trivially — there is no code-naming field present
to introduce. That is access.md's deferred **v2 relaxation** arriving as
a side effect, and in a better shape than the curated catalogue it
imagined: every class in the tree is wizard-written by construction, so
the vetted catalogue *is* the class list. The gate that stays
load-bearing is the right one — `AccessApi.canAtPath`, parcel title over
the path you are writing to.

### Open

- **Merge semantics for property fields** — lists (`keywords` wants
  append, `slotClaims` wants replace) and how a child *unsets* an
  inherited key.
- **Do descriptive fields inherit at all?** `crate.yaml` carries
  `keywords: [crate, box, empty]`; a child that forgets to override
  inherits "empty" as a search keyword on a full crate. `can.yaml`
  carries `open: true`, which is state, not construction. The honest
  rule may be *a child that does not name itself is a bug*.
- **Cross-pack parents.** The model exists — `dependsOn` derived from
  `package.json`, stable topological sort, throws on a cycle. The gap is
  `SAXONBERG_PACKS`, which filters *after* ordering and silently ignores
  an omitted pack: filter out a parent's pack and the child installs
  with a dangling `extends`. Probably "throw at reconcile."
- **Go-live fan-out.** Today, editing a row's `props:` and publishing
  does nothing to live instances — documented and deliberate. With
  inheritance, one parent edit silently fails to reach N descendants and
  nothing shows you which. `restoreFromTemplate` needs a reverse
  dependent index, or the no-op needs to become visible.

---

## Part B — the `props:` entry shape

### The pain, measured

83 rows carry `props:`, totalling 433 entries, of which **168 (39%) are
pure repeats of a line already in the same list.** Six identical stools
in the bar. Twelve identical coupes in the glass rack. Twelve identical
limes in every one of thirteen crate rows.

And the substitution case, which no merge *operator* can express:
`trade-hospitality/…/location/bar.yaml` and
`saxonberg-lounge/…/location/bar.yaml` carry **21-entry `props:` lists
that differ by exactly one line** — the lounge swaps
`/trade/hospitality/thing/house-tablet` for its own. Append gives 22
entries and two tablets; replace means restating all 21, which is
today. It needs *substitute one entry*, which is entry **identity**, not
a merge rule.

### Proposed shape

```yaml
props:
  - { path: …/stool, count: 6 }
  - { path: …/house-tablet, onto: …/back-bar, as: tablet }
```

`count` kills the 39%. `as` makes a child's
`props: [{ as: tablet, path: /world/lounge/thing/house-tablet }]`
override one entry and inherit the other twenty.

This is not a new axis on a settled field. templates.md already flags
the entry shape as unfinished for the deferred reset/respawn work
(`{ path, resetCadence }`) and says so explicitly: *"Flagged so the
props entry shape doesn't get locked into something that fights reset
later."* Keys and counts are the same growth; take the reset case into
account while the shape is open.

⚠ **Positional ordering is load-bearing** and must survive: a surface
fixture has to be listed before its `onto` items (the back-bar before
its bottles).

### Instruction fields split three ways

There are eight (`props`, `cast`, `adornments`, `container`,
`startLocation`, `details`, `exits`, `routes`), and only one group is a
problem:

| shape | fields | rule |
|---|---|---|
| single-valued, idempotent, mints nothing | `container`, `startLocation` | inherit; child wins. `container` is already compare-and-move idempotent, and every bottling product row repeats `container: /world/terminus/goods-yards/bottling/thing/stock` |
| map-shaped data | `details` (both `persistent` **and** `instruction`) | merge by key, child wins per key |
| list-shaped, mints Stuff | `props`, `cast`, `adornments`, `exits`, `routes` | the hazard — see below |

⛔ **`exits:` must never inherit.** Two rooms sharing a parent would
inherit each other's neighbours.

### ⚠ The faucet is already plugged — the risk is something else

`applyProps` guards on `this._propsPopulated`, a **per-instance**
boolean (`persistent: true, runtimeState: true`, surviving
capture/restore). It does not care where the list came from, so merging
a parent's props with a child's still applies exactly once per instance.
There is no tap.

The real risks are quieter:

1. **Silent doubling at merge.** Append and replace are each right about
   half the time and both fail with no error — 24 limes in a crate, or a
   bar with no stools.
2. **The go-live no-op gets a blast radius** (see Part A's open items).
   Made worse by two lifetimes: a non-persistable singleton like the
   hospitality `bar` re-applies its props each boot, while a
   `FurnishableRoom`'s props are *captured* into its snapshot and never
   re-read.

### The fallback, if the entry shape is too big for this build

**Instruction fields do not inherit, full stop.** The rationale is
already in the codebase's vocabulary: a property field's data *is* its
value, so "child wins" is well-defined; an instruction field's data is a
recipe consumed to produce state that lives elsewhere, and half an act
does not merge. The cost is knowable — both documented exemplars
(`can.yaml`, `crate.yaml`) carry no instruction fields at all, so they
pay nothing; `container:` repetition stays; the bar bundle stays copied.

---

## Part C — contents presentation

### There are four renders of "what is in this room," and they disagree

| surface | items | occupants | cap |
|---|---|---|---|
| `look` (typed) | flat `Mml.list` | **lensed + density-collapsed** (`composeOccupants`) | none |
| `sense` (**fires on every move**) | flat `Mml.list` | **flat, in the same list as the items** | none |
| card `HereList` | flat rows | same rows | **5, then `+N more`** |
| `look <surface>` / `<container>` | drill-in list | — | none |

They agree on exactly one thing: `ContainmentApi.looseContents`, called
from `LookController`, `SenseController` **and** the card projection in
`Container.ts:363`. ⭐ **That shared helper is the pattern this part
copies**, and it already works — 8 of Dave's Bar's 25 props (the shaker,
mixing glass, muddler, bar spoon, strainer, juicer, tablet, tip jar)
never print anywhere, because they rest on the well and the back-bar and
are found by examining those.

Everything else about the four is inconsistent:

- **Dave's Bar on arrival:** 17 loose props + 5 cast = 22 entries, one
  flat comma-joined sentence, people mixed in with furniture, six of
  them the identical string "a bar stool."
- **The same room on the card:** `HERE_SHOWN = 5`, then `+17 more` —
  and `Overflow` is a plain `styled.div`, **not a button**. There is no
  expand. Six identical stools can consume the entire five-row budget.

So the terminal shows everything unreadably, the card shows a quarter of
it with no way to see the rest, and the arrival path — the one a player
hits most — has the least treatment of the four.

### ⛔ `Stackable` is the wrong tool

The composition constraints do not even fire: a stool is
`PosturedMixin(SlottedMixin(DetailedMixin(Thing)))` and a coupe is
`PalatableMixin(CraftVessel)` over `BulkableMixin` — Slotted and
Bulkable, neither a `Container`, so `Stackable ⊥ Container` never bites.

The blocker is **divergence rate against exact-equality identity.** Stack
identity is equality over *persistent* fields
(`stackIdentityFields ⊂ persistentFields`, enforced at registration), and
every repeat in the bar carries continuously-varying per-instance state:
the stool's `sit:1` occupancy, the coupe's bulk contents and
temperature, the lime's `FreshnessMixin` microbial load. For coins
divergence is rare, so a stack is a real economy. Here divergence is the
normal case — you would split on nearly every interaction and re-merge
on every put-back, and a stack of six stools could not have one of them
broken, dyed or sat on without forking.

⭐ **That is modelling a presentation problem as a state problem: the sim
gets less honest so the text gets shorter.** Leave `Stackable` alone.

### Decided: the server groups, the client expands

Room contents are already filtered by `PerceptionApi.perceives` (honest
fog), renamed per viewer by belief/`describeFor` (a stranger vs a
learned name), and annotated by concealment hints. So a client grouping
by rendered string is wrong **in both directions**: it would merge two
things the server deliberately named identically for that viewer, and
fail to merge two it named differently. Grouping is a judgement about
object identity and the client does not hold the inputs.

The shape:

- A grouping helper **beside `looseContents`**, over the same
  per-viewer filtered set, consumed by the same three call sites. The
  precedent is literally this problem solved once before, and it is why
  look/sense/card agree on nesting today.
- The projection emits **groups**, not rows. The terminal renders a
  group as "six bar stools"; the card renders one row with a count and a
  disclosure. One rendering of one answer — the `prose:` payload on the
  card is deliberately the same MML the terminal got, and that invariant
  must survive.
- The client owns the **chrome**: making `Overflow` a real button,
  remembering expansion, the cap value.

### Cast and props: same emitted shape, different inputs

Occupant collapse reads the **social graph** — `composeOccupants` is
async because it resolves group membership, it boosts friends and
collapses strangers, and it is tuned by the shipped `social.verbosity`
dial (`minimal`/`standard`/`verbose`). Prop collapse reads **object
state** — "are these two the same thing," a fungibility judgement.
Different implementations, one emitted structure so the client renders
and expands both identically.

The missing pieces are symmetric: props have no lensing anywhere, and
cast has no lensing **on the arrival path**.

### Open — needs eyes on a real browser session

- The cap value. 5 is clearly wrong for a bar and may be right for a
  bedroom.
- Whether a group reads "six bar stools" (derived) or "a row of bar
  stools" (authored — which drags it back into Part B's entry shape).
- Whether "You also see:" survives as a sentence once the card has a
  structured list, or whether the card goes structured and the prose
  stays prose.
- Whether players actually discover `look well`, or whether
  surface-nesting is quietly hiding eight objects from them forever.
- Inventory and `look <container>` want the same treatment; confirm they
  are the same helper and not a third rule.

---

## Part D — the perception verbs ✅ DECIDED

### The difference between `look` and `sense` is documented three times and implemented nowhere

`senseStripAugmenter` ends `const filter = opts?.filter ?? sensorium`,
where `sensorium` is the viewer's full physical sensorium.
`LookController` calls `getMarkupLong(actor)` with **no opts** at both
call sites, so `look` falls through to the full sensorium.
`SenseController` passes `{ filter: physicalSensorium(actor) }`, where
its local helper is a line-for-line duplicate of the loop *inside* the
augmenter, computing the same array.

Identical filters. Meanwhile `Visible.ts`'s docstring says *"`look`
passes `['vision']`"* and senses.md says *"`look` stays vision-only"* —
neither is true.

### ⚠⚠ No content has ever used the substrate that was meant to differentiate them

**Zero** `<sense channel="X">` regions across all 1,559 rows. **Zero**
per-channel detail slots (`smell:`, `touch:`, `hearing:`, `taste:`).
`Mml.stripBySense` never touches untagged text. Therefore **all six
perception verbs render byte-identical prose for every object in the
game**: `smell the bar` prints the bar's visual description, and so do
`listen`, `feel`, `taste`, `sense` and `look`.

Same class as the libations finding that `feel`/`taste` had never run.

### What actually differs — all of it `sense` missing things

| | `look` | `sense` |
|---|---|---|
| occupant lensing | ✓ | ✗ — people land in the item list |
| stranger records (`learnIdentityOf`) | ✓ | ✗ |
| concealment hints (`hintsFor`) | ✓ | ✗ |
| container / display / owner drill-in | ✓ | ✗ |
| surface drill-in | ✓ | ✓ |

Two are not cosmetic. **Walking into a room does not track who you
saw** — recognition only advances on a typed `look`. And **the
honest-fog tell never fires on arrival**, so the most natural moment for
a hint is silent.

### ✅ Decided: cut `sense`; arrival fires `look`

`VisibleMixin` is universal — short and long are the minimum every row
sets. Not everything is smellable. So `look` is the verb that always
works, and that is exactly why it should be the room verb, the arrival
verb *and* the take-it-all-in verb. It already renders every channel.

The four single-sense verbs then **narrow**: `smell the bar` means "just
the smell," they carry the `requires*` validators for a viewer who has
lost a sense, and they are where "you smell nothing in particular" is an
honest answer.

The cut:

- `Mobile.ts:706` — `forceCommand('sense')` → `forceCommand('look')`.
  **One call site.** `look.yaml` already declares `opens_card: subject`,
  so arrival still mints the room card and feed-as-history is untouched;
  `autoSenseOnArrival` already clears focus, and bare `look` defaults to
  `$focus` exactly as bare `sense` did.
- Delete `SenseController.ts`, `sense.yaml`, its test, and the
  `physicalSensorium()` duplicate.
- ⚠ The scene topic `sense.survey` is used in **105 places** across
  inventory, perception and hide controllers. It is the perception
  topic, not the verb — it stays.
- `autoSenseOnArrival` wants renaming, but it is a public `MobileMixin`
  method with call sites in `Avatar`, `Mobile` and `GotoController` —
  that is a separate rename decision, not part of the cut.

Arrival gains occupant lensing, stranger records, hints and drill-in the
moment the string changes.

### ✅ Decided: multi-sense authoring is wanted — so untagged prose becomes vision-channel prose

The polite refusal in the four narrowing verbs is **unreachable**, and
the code comment says why while getting it backwards:

> *"Untagged prose always survives — vision-only authoring on a
> non-vision verb falls through to the indistinct refusal when the
> filtered text is empty (every `<sense>` region got stripped AND
> there's no untagged prose left)."*

`filtered` is empty only if the long description is *entirely* inside
`<sense>` tags. Nothing in the tree is. ⭐⭐ **That is very likely why
nobody ever authored a `<sense>` region: the verbs already appeared to
work, so their absence was invisible.** Committing to multi-sense
authoring without this fix means asking authors to write content whose
absence nothing reports.

The change: **untagged prose is vision-channel prose**, not
channel-neutral. Then

- `look` (full sensorium, vision included) → untagged + every authored
  region. Still shows everything.
- `smell X` → untagged stripped, only smell regions survive, the honest
  refusal fires, and authors get the signal.
- **A blind viewer's `look`** → sound/smell/touch only. Today a blind
  player reads the full visual description — the same family as unlit
  interiors leaking "something."

⚠ **It disturbs a documented AC.** `Visible.ts` keeps untagged prose for
an empty sensorium deliberately, *"the right behavior for test fixtures
and the dark-room AC."* The argument for changing it is that the dark
room is the light subsystem's job — unlit interiors are already pitch
black — and prose leaking through the *sense* filter is the wrong
mechanism for it. That is a call to make explicitly at requirements, not
quietly.

### Open

- What makes multi-sense authoring actually happen. A lint cannot check
  "this room should have a smell." The refusal above is the feedback
  loop; whether anything else is needed (authoring guidance, a census of
  rows with zero non-vision channels as a burn-down meter per the
  census-then-ratchet pattern) is a requirements question.

---

## Why one build

Parts A and B share the `props:` entry shape — the merge rule *is* the
entry shape, and settling one without the other locks the wrong thing
in. Parts C and D share `LookController`'s contents block: D deletes the
worse of the two call sites, and C changes the one that survives. Doing
C before D means writing the grouping into a controller that is about to
be deleted; doing D before C means touching the same forty lines twice.

The natural ordering inside the cycle is **D → C → B → A**: cheapest
first, each one leaving a cleaner surface for the next, and A is the
only part that needs a new field on the row shape.

⭐ The DRIVE for this build is not subtle and should be written into the
requirements as such: **walk into Dave's Bar and read what it says.**
Every measurement in this slate was taken against that room, and three
of the four parts are visible in that one screen.
