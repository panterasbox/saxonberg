# Containment partition slate — where inside a container a thing sits

> **Status: DESIGNED 2026-09-27, UNBUILT** — the concept is **Placement**,
> the design is below and agreed, no code is written.
> **Left:** the whole build — the `Placement` vocabulary + catalogue ·
> `Surfaced` → `Placing` (a 65-file rename, ⚠ including MQL text inside
> a content row) · `_restingOn` → `(host, name)` · `looseContents` onto
> `Container` · the `in` member and the `Chamber`/`Fitting` twins · the
> shut-container refusal that falls out for free
> **Size:** a wave

> Written 2026-09-27 out of the base-class-narrowing census, which kept
> failing to answer *"what is a `Vessel`"* because the model has no word
> for the thing it kept bumping into.

See also:

- [spatial.md](../../subsystems/spatial.md) — `Container`/`Containable`,
  the model this must not break.
- [fridge-design-pack](./fridge-design-pack.md) — the multi-chambered
  fridge/freezer, the consumer that reopened the question.
- [legibility-slate](./legibility-slate.md) Part C — contents
  presentation, the four disagreeing renders, and `looseContents` as
  their one point of agreement.
- [base-class-narrowing-slate](./base-class-narrowing-slate.md) — ⛔ this
  blocks it. No class gets renamed until this lands.

---

## ⭐⭐ The gap, stated

**A container's contents are partitioned by *where inside the container*
a thing sits, and the model has no word for that.**

One instance ships. A mug on a desk in a room has `container = the
room`, `restingOn = the desk` — `Surfaced` *"doesn't enclose"*
(`lib/spatial/Surfaced.ts:6`) and holds no list of its own; it derives
its contents by a **lazy walk over the environment's single list**,
filtering on the back-reference (`:123-129`, `const candidates =
env.getContents()`).

⭐ **That shape is right and should be the model's, not a helper's.** It
keeps the promise `Container` makes — *a container is a list of
containables* — while letting a region of it be addressed. It is what
lets eight of Dave's Bar's twenty-five props stay out of the room
listing and be found by examining the back-bar.

What is missing is the **concept**. Today the read is:

```ts
// packages/server/src/mud/api/containment.ts:272
public static looseContents(items: readonly Stuff[]): Stuff[]
```

⚠ Three things wrong with it, in increasing order:

1. It is a **presentation rule filed as a containment read** — its own
   docstring says *"this only shapes what's presented at top level"*.
2. It has **no receiver**, so every caller must remember it exists.
   Three do (`LookController`, `SenseController`, the card projection);
   the fourth surface will not, and the failure is silent clutter.
3. It sits **twelve lines below a comment in the same file** saying the
   `getContainer`/`getContents` read-wrappers *"were removed: those
   reads live on the objects themselves"*. The doctrine is written at
   line 258 and broken at line 272.

⚠ It also escaped `lint:object-verbs` — a ratchet at **zero** for an Api
static whose first parameter is a world object — because its first
parameter is an *array* of them.

## Why it blocks the naming work

The census could not answer *"what is a `Vessel`"* without knowing
whether a vessel can have regions. A design pass that guessed produced
`Vessel`/`Chamber`, which cannot express a fridge-freezer and spends the
word "chamber" on the wrong object
([base-class-narrowing-slate § Rejected](./base-class-narrowing-slate.md)).

⭐ **The wrong turn was trying to solve a second-axis problem with a
first-axis class.** Name the axis and the class question dissolves.

## The constraints any answer must satisfy

1. ⛔ **`Container` stays "a list of containables."** That is *"basically
   the entire promise the player asks the game to make when it comes to
   modelling game worlds"*. One list. The partition is a per-item label
   plus a derived view — **never a second list, never three lists that
   flatten.**
2. ⛔ **`Location` is a `Container` and must never be partitioned.** No
   multi-chambered rooms. Whatever carries the concept is composed only
   by things that have it, exactly as `Surfaced` is.
3. **Reads collapse.** `me:i:fridge:i:steak` finds the steak whichever
   region it is in. A partition is not a containment hop and must not
   become one — `here:mug` already finds a mug on a desk without naming
   the desk.
4. **Writes do not collapse.** `put steak in freezer` names the region,
   as `put vase on table` names the desk today (`put.yaml`:
   `prepositions: [in, on]`, `requires: [Visible, Container|Surfaced]`).
5. ⭐ **Single and multi are the same thing.** A one-region container is
   the degenerate case of N, so `put potion in bag` behaves exactly as
   it does today. Two shapes for one concept is the bad-UX outcome.
6. **Address freely, refuse with a reason.** A shut freezer stays
   bindable and validation says the door is shut. Nothing vanishes from
   the binder because it cannot currently be acted on.

## What the answer is NOT

⛔ **Not an MQL change.** MQL is core-of-the-core and the whole thing has
got this far without touching it. The three cases that look like MQL
problems are not:

| looks like | actually lives in | state |
|---|---|---|
| "a steak in both — which one?" | the **disambiguation prompt**, rendered in the `distinguishing` form (`presentation.md:95`) | a logged gap, already biting on two identical cane rods, no chambers required |
| "only what's in the fridge" | the **drill-in `look`** over `looseContents` | ships and works — it is how the back-bar hides eight props |
| "express the region in a query" | nothing — the region is a nameable object and the drill-in is a `look`, not a query | no change wanted |

## ⭐⭐ The design — Placement

**Placement** — *where inside its container a thing sits*: a
**relation**, named by the preposition a player types (`on`, `in`,
`from`), to a **host** that is a **sibling in the same container**.

> **What the name refuses: a placement never moves a thing into a
> different list.** A steak in the freezer compartment is in the fridge;
> a ham on the hook is in the smokehouse; an apple on the desk is in the
> room. Each is in exactly one place and the placement says *where in
> it*, nothing else. It is also not a slot — a slot claims capacity and
> exclusivity (`Slotted`); a placement only locates.

⭐ **The word was not invented.** `lib/persistence/PersistenceSlice.ts:44`
already declares `interface Placement { restingOnIndex?: number }`, and
its docstring already carries the structural insight the design turns
on: *"`restingOn` = a Surfaced **sibling** in the same contents list — so
the relation is captured as the index of that sibling."* The persistence
layer got the concept and the name right; the runtime called it
`restingOn` and presentation called it `looseContents`. Three names, one
thing, and only one of them was right.

### ⭐⭐ Two guarantees, both structural, both free

Everything the constraints demand falls out of one fact: **a placement
host is not a `Container`.**

| guarantee | mechanism | enforced at |
|---|---|---|
| **a room is never partitioned** | `PlacingMixin` requires `ContainableMixin` (`Surfaced.ts:96-106`, `__validateComposition__`, dispatched by `StuffApi.register`); `Location` composes `Container` and **not** `Containable` (`Location.ts:132`) | class registration, before a row loads — shipped today |
| **a region is never walked into** | ⭐ **a second refusal in the same hook: a placement host may not compose `ExitableMixin`** | class registration — NEW, one line |

⚠⚠ **The second one has to be built; it is not already true.** An
earlier pass claimed it fell out of the types and that was wrong.
`PlacingMixin` requires `Containable` and says **nothing** about
`Container`, while `ExitableMixin` requires `Container` — so a placement
host can perfectly well be one. **`Oven` already is**:
`SurfacedMixin(ContainerMixin(Thing))` (`platform/thing/Oven.ts:29`),
and it is *correct* — you put a tray in an oven and a pot on it.

So `Container` is not the discriminator; **`Exitable` is.** Being a
container gives you no exits — composing `ExitableMixin` does, which is
why nobody has ever asked what exits the oven affords. The question
becomes live the moment a placement host is exitable, and today nothing
stops that.

### ⭐ The principle, and why the line falls here

> **You stand *beside* a placement host and *inside* an exitable thing.**
> A class that is both asks an item placed on it to be in two reference
> frames at once — and *"what exits does this region afford?"* is what
> that ambiguity sounds like said out loud.

An oven you always stand beside. A coach you can be inside. That is the
line.

**The cost, accepted deliberately (2026-09-27):** an `ExitableVessel`
can never itself be a placement host — no luggage strapped to the roof
of a coach you can also ride in. A boot is fine (a `Chamber` in the
coach's list); the roof is not, because the roof is *outside* a thing
you can be *inside*.

⭐ This is narrow on purpose. Exitable vessels are essentially vehicles
— the model wants most things to be `Location`s, which is how almost
everything shipped works — so the restriction bites a handful of
objects. Content that genuinely needs a roof rack writes a bespoke class
for it, and the resulting UX being a little personal to that one vehicle
is acceptable precisely because no other vehicle has one.

> **The restriction is not "you cannot", it is "this is not free."** A
> new relation costs one row; an exotic combination costs a class. If
> somebody's `ChamberedExitableVessel` becomes the most-used object in
> the game, it will have earned its own definition — and we will know,
> because someone had to write it.

**The refusal message is maker-facing UX and must say what to do next**,
not merely no:

> `Coach composes PlacingMixin and ExitableMixin — a thing you can go
> inside cannot also be something you put things on. Put a Fitting or a
> Chamber in its contents instead (that is how a boot works), or, if the
> outside of this vehicle really must carry things, write the class.`

### The vocabulary

Singleton `Idea` rows on the `LocomotionMode` pattern — class
`platform/idea/Placement.ts`, rows at
`content/platform/idea/Placement/{on,in,from}.yaml`, warmed by a
self-warming `PlacementCatalogue` exposing sync `of(name)`. ⚠ The
catalogue is required, not optional: the readers are sync hot paths, and
*reference Ideas inert at boot because nothing warms the roster* has
recurred three times in this repo.

| field | `on` | `in` | `from` |
|---|---|---|---|
| `name` | on | in | from |
| `prepositions` | `[on]` | `[in]` | `[from, on]` |
| `encloses` — does the host stand between the item and the container, for air, sight and reach | false | **true** | false |
| `you` / `peers` / `heading` — Liquid prose | "You put {{ item }} on {{ host }}." / "On it" | …in… / "In it" | "You hang {{ item }} from {{ host }}." / "Hanging from it" |

`on` is **shipped behaviour renamed** — zero change. `in` is the one new
semantic (`encloses: true`). `from` is the acceptance test.

⚠ Rows, not a const module, for lens 2: a trade pack ships
`/trade/butchery/idea/Placement/from` with no kernel code, and the prose
is content. ⚠ `airExposure` and `userFacingDetail` stay **on the host
row** — they are the support's claim about itself, which is per-object,
and `Surfaced.ts:64-80` is right about that.

### The pieces

- **`PlacingMixin`** — `SurfacedMixin` renamed. Gains `placements:
  string[]` (class default `['on']`, so every shipped composer is
  unchanged); `canRest(item)` becomes `canPlace(item, placement):
  VetoResult`, whose reason string is how *address freely, refuse with a
  reason* becomes one rule — the default body answers `{ok: false,
  reason: 'shut'}` for an enclosing placement on a closed `Sealable`.
- **`Container.getLooseContents()`** — replaces
  `ContainmentApi.looseContents`, which is deleted. Its docstring leads
  with *this is a presentation read; the model read is `getContents()`*.
  Three callers (`LookController:323`, `SenseController:201`,
  `Container.ts:363`) each become `host.getLooseContents()` + their
  viewer filter. ⚠ Note the **order flip**: today the perception filter
  runs first and `looseContents` then hides items whose host survived
  it; model-read-first means an apple on a desk you cannot perceive is
  hidden *with* the desk. More honest, two lines per caller.
- **`Containable`** — `_restingOn: (Stuff & Surfaced) | null` becomes
  `_placementHost: (Stuff & Placing) | null` plus `_placementName:
  string`. ⚠ **Two fields, not a struct**: the R2.3 self-heal is the
  proxy get trap on a field that *holds a Stuff*, and a struct hides the
  ref from the trap. `getPlacement()` normalizes the pair.
- **Persisted form** — `ContentPlacement { placement?: string;
  hostIndex?: number }`, renamed so the struct does not collide with the
  vocabulary class. ⚠ `Containable`'s docstring claiming this is
  "runtime-only, not persisted" is **stale**: `Container.captureSlice`
  (`:209-215`) already records it. No migration; the DB is dropped.
- **Authored form** — `StagedMixin`'s props entry drops `onto:` for
  **the preposition as the key**: `{ template: …/steak, in: …/freezer }`.
  Ten `onto:` lines in three files.
- **`ContainmentApi.placeOn` → `place(item, placement, host)`**, same
  pipeline, plus one addition: it fires a thermal restamp, because a
  placement inside the same container is a no-op `move` today and that
  stops mattering the moment a compartment holds its own cold.
- **Two concrete twins** — `platform/thing/Fitting` (the bare host: a
  shelf, a hook, a rail; `Surface` renamed) and `platform/thing/Chamber`
  (`Atmospheric(Placing(Detailed(Thing)))`, default `placements:
  ['in']`). ⭐ `Chamber` is spent on the compartment, which is the word's
  honest owner.

### ⭐⭐ The acceptance test: adding "hanging from"

**Kernel and pack code touched: none. Three content files.**

1. `content/platform/idea/Placement/from.yaml` — the vocabulary row above.
2. `content/platform/cmd/inventory/put.yaml:33` — `prepositions: [in, on, from]`. One word.
3. The hook's own row: `class: /platform/thing/Fitting`, `placements: [from]`, `airExposure: 1` — plus one `props:` line in the smokehouse.

The player types `put ham on hook` and reads *"You hang the ham from the
hook."* `look hook` → *"Hanging from it: a ham."* `look` lists the hook,
not the ham. `here:ham` still finds it. Left there, `WaterActivity` reads
the hook's `airExposure` through the placement and the ham dries all
round — the meat hook `Surfaced.ts:70-76` promised in prose and could
not deliver.

A pack that cannot edit `put.yaml` ships its own `hang` verb calling
`ContainmentApi.place(item, 'from', host)` — the same rule as
`cure`/`dry`/`smoke`.

### `ExitableVessel`

Not this concept and it does not need to be. `ExitableVessel` is
*enterability* — the synthesized `in`/`out` exits and the defining door
on a `Container` you go inside. A coach's interior is **region zero**:
the coach's own list, where `go coach` puts you. A luggage boot is a
`Chamber` in the coach's `props:`, never a nested `ExitableVessel`. The
two compose and neither changes; a walk-in freezer is a `Location` with
an authored temperature, not a vessel at all.

### What this unblocks

`Atmospheric` off `Vessel` ([base-class-narrowing-slate](./base-class-narrowing-slate.md)
finding #1) becomes a class choice: a vessel that wants air is
`Chamber`-shaped and a bag is a bag. And finding #2, the frozen ambient,
gets its repair — one function, `ambientScopeOf(item)`: the placement
host if `getPlacement()?.encloses` and the host is atmospheric, else the
container, then `stepOutward` until a scope answers. The loaf in the
backpack steps to the room; the fish on the counter steps to the room
because `on` does not enclose.

## What breaks

- **65 files**: 42 source, 23 test, referencing `Surfaced` / `restingOn`
  / `placeOn` / `looseContents` / `getResting`. About a third are
  docstrings using "surfaced" as an English word and are untouched.
- ⚠⚠ **The invisible one: MQL text inside a content row.**
  `trade-cooking/.../cmd/crafting/butcher.yaml:50` carries
  `default: "reachable:[mixin.SurfacedMixin and …]"` and `requires:
  [SurfacedMixin]`. A mixin rename is a **row** edit there, and
  `lint:mixin-names` cannot see a string in a yaml query. **Do this one
  by hand and deliberately.**
- `canRest` → `canPlace` on eight composers; ~14 single-line caller
  re-points (`WaterActivity:208`, `Thermal:665`, `ElectricityLogic:270`,
  `Condition:260`, `ContractLogic:221,360`, `Furnace:331`,
  `restocks:432`, `PersistableLogic:721`, `Staged:360`,
  `PutController:231`, `DryController:120,197`).
- **Two sites must consult `encloses`** so a shut compartment refuses
  rather than vanishes: `PerceptionLogic.canReach` (`:290-310`) and
  `VisionModality` (`:202-215`). The binder keeps the steak; the verb
  refuses with a reason. `scope-walk` and `mustBeInLocation` need
  nothing.

## Findings this exposed, out of scope

- ⚠ **`put coin in <shut chest>` is refused nowhere today** — no openness
  validator on `put.yaml`, none in `move`. The placement design's one
  `shut` check covers region zero for free; take it in the same wave.
- ⚠ **`PosedMixin.restingOnPath` (`lib/character/Posed.ts:138`) is a
  second "resting on"** — slot occupancy for posture, a different axis
  (a slot claims, a placement locates) with a confusable name. An
  `ExitableVessel` is where a player meets both at once: sitting on a
  bench in a coach with a trunk in the boot. Do not merge them; do
  rename one before the next reader trips.
- Three prose fields per member may be one too many if `GrammarApi`
  already conjugates.

## Why this got missed

Worth recording, because the mechanism will repeat. The concept was
needed by `look`, `look` needed it *now*, and the Api tier accepts a
helper without asking whether the model should have grown a word. The
same file records the same failure once already: deleting
`findReachable` without a signposted replacement cost **eleven
hand-rolled copies** of the two-leg reach walk.

⭐ Both are the same disease the composition census measures from the
other side: **a mixin composed and unused is the model claiming
something false; a helper like this is the model failing to claim
something true.**
