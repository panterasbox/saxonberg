# Spawn Shape — Working Slate

How objects enter the world. Working doc; retire when the design
ships in full.

The MR-15 review thread M asked the narrow "where does the clone
verb put things?" question. Working through it surfaced a deeper
design conversation about declarative spawning that we're locking
now and shipping incrementally.

## Three layers, ordered by escalation

Each layer escalates only when the previous one isn't expressive
enough. YAML-first; mixins encapsulate common patterns; class
scripting for the rest.

| Layer | Mechanism | Use case |
|---|---|---|
| YAML field | `environment: /path` on Template | "I belong here" — singleton location reference. |
| Mixin | `PopulatesMixin` + `populates: [...]` | "I spawn with these inside me." |
| Class scripting | `PostRegistrationMixin.postRegister` | Multi-clone targeting, computed location, conditional placement, the rest. |

## YAML field: `environment` on Template

A new top-level field on the Template doc (alongside `path`,
`class`, `hydratorClass`, `data`):

```yaml
# /obj/library/seed.yaml
path:  /obj/library
class: /lib/spatial/CartesianLocation
environment: /world/cosmos/library-zone
data:
  ...
```

**Semantics**: "instances of me belong at this location when no
caller specifies otherwise." It's a default, a hint — never an
override. Read by callers who'd otherwise be guessing where to put
the result; ignored by callers who've already decided.

**Singleton constraint**: the value must point to a template whose
class composes `SingletonMixin` (or is treated as a singleton by
convention). Resolution goes through `StuffApi.singleton(path)`,
which lazily creates the unique instance if it doesn't exist yet
and throws on multi-instance state. Multi-instance templates
(Vessels, mostly) can't be `environment:` targets — there's no
canonical "the wagon" to refer to. Multi-clone targeting needs a
stuffId (transient) which is a job for `postRegister`.

**Lives on the Template doc itself, not in `data`**: the field has
to be readable BEFORE the instance exists (the caller wants to
know "where do I put what I'm about to clone?"). Putting it in
`data` would mean only post-hydrate code could read it — too late
for placement decisions.

## Mixin: `PopulatesMixin`

A class-side mixin in `lib/stuff/PopulatesMixin.ts`. Composes on
`Container` (you can only populate things you can hold things in).
Reads `data.populates: string[]` (template paths), clones each in
`postRegister`, and moves the result into self via
`ContainmentApi.move`.

```yaml
# /obj/library/seed.yaml
class: /lib/spatial/CartesianLocation  # composes PopulatesMixin
data:
  populates:
    - /obj/decor/bookcase
    - /obj/decor/bookcase
    - /obj/decor/table
```

Same shape works for NPC inventory loadouts:

```yaml
# /obj/npc/Wizard/seed.yaml
class: /obj/npc/Wizard  # composes PopulatesMixin
data:
  populates: [/obj/staff, /obj/robe]
```

Cycle protection inherited from `StuffApi.clone`'s
`#inFlightClonePaths` set — a populates loop (X populates Y, Y
populates X) trips the same guard hydrator cycles do.

**v1 entries are paths only** — keeps the YAML simple. Richer
shapes (`{ template, name, count }`) can layer on later if a real
use case wants them.

## Class scripting: `PostRegistrationMixin`

Already exists. A class overrides `postRegister(context)` and can
do anything — talk to APIs, schedule callbacks, place itself
somewhere computed. `PopulatesMixin` is itself built on
`PostRegistrationMixin`; it's the most-common pattern given a
declarative front.

This is the escape hatch for everything the YAML can't express:

- "When this is the third Wizard cloned, put it in the third
  Wagon." Multi-clone targeting via stuffId.
- "Spawn at sunset." Time-conditional placement.
- "If the player's reputation is below 0, spawn the bouncer NPC
  too." State-conditional spawning.
- "Pick a random spawn point from these three." Computed
  placement.

## Precedence

Explicit caller intent always wins over template defaults:

```
1. --into <dest>            (verb caller, explicit)
2. --here                   (verb caller, sugar for "my env")
3. populates parent         (programmatic caller, explicit — the
                             parent IS providing the destination)
4. template.environment     (template default — fallback)
5. inventory                (clone verb's hardcoded last-resort)
```

The conflict case — "library populates with bookcase, bookcase has
`environment: /treasury`" — resolves cleanly: PopulatesMixin
doesn't read `environment` at all. It just calls
`ContainmentApi.move(child, this)`. The child's environment field
is irrelevant when somebody else is doing the moving.

When `populates` and `environment` happen to **agree** (both point
the same way), no conflict — populates does the placement, the
environment's intent is incidentally satisfied. Conflicts only
arise when an author expresses contradictory intent.

## Boot manifest — separate future

Scenarios like "the Sword of Eternity always exists in the
Dragon's Hoard" point at a boot-time singleton manifest:
"instantiate-once-and-place these templates at startup." Different
lifecycle complexity than per-call clone (idempotency across
restarts, ensure-exactly-one, ordering when populates chains
matter).

The hope is **most things domino out of a few root manifest
entries**: the manifest names a few zones; those zones populate
their immediate contents (libraries, courtyards); those contents
populate THEIR contents; etc. A handful of explicit roots,
everything else cascades through `populates`.

Out of scope for the M thread; design separately when the time
comes.

## What ships now (M thread proper)

The clone verb's destination resolution. **Steps 1, 2, and 5 of
the precedence stack** — explicit `--into`, sugar `--here`, and
the inventory fallback. Step 3 (populates) is parent-driven, no
verb work. Step 4 (template.environment) waits for the field +
PopulatesMixin to ship together.

Verb shape:

```yaml
verbs: [clone]
controller: CloneController
description: "Clone a fresh instance from a template"
args:
  - name: template
    type: string
    required: false
options:
  mql:
    type: object
    scope: [reachable]
    description: "MQL expression alternate to <template>"
  into:
    type: object
    scope: [reachable]
    description: "Container to land the clone in (sugar: --here)"
  here:
    type: boolean
    description: "Land the clone in the avatar's current environment"
```

(No `-f` / `forceClone`. Clone is "willing something new into
existence" — there's no per-target witness to bypass; permissions
are the only gate. See `call-security.md § AdminOnly and the
force-bypass shape` for the broader pattern.)

Precedence in the controller:
1. `--into <dest>` resolves to a Stuff that must be Container.
2. `--here` uses `giver.getContainer()` (the avatar's environment).
3. Fallback: the giver itself (avatar's inventory — they ARE a
   Container).

When `template.environment` lands later, it slots between (2) and
(3) without changing the existing branches.

## Decisions log

| Item | Decision |
|---|---|
| Field name for "where I land" | `environment` (top-level on Template doc) |
| Constraint on field value | Must be a singleton-shaped template path |
| Mixin name | `PopulatesMixin` |
| Mixin home | `lib/stuff/` |
| Mixin entries | Paths only (v1) |
| Clone verb fallback | Inventory (the giver) |
| `--here` shorthand | In |
| `--into` shape | `type: object`, scope `[reachable]` |
| Precedence on conflict | Caller intent > template default; populates is a caller |
| Boot manifest | Separate future concern |

## Cross-references

- MR !15 thread M: clone destination question
- [docs/shell-review-slate.md](./shell-review-slate.md) — parent slate
- `PostRegistrationMixin` (`lib/stuff/PostRegistration.ts`) —
  existing escape hatch
- `ContainmentApi.move` — the chokepoint everything routes through
- `StuffApi.singleton` — the resolver `environment:` rides on
