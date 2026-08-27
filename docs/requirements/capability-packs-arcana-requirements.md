# Capability packs, arcana first — requirements

A content pack can ship **TypeScript classes** alongside its YAML — the
*capability pack* rung of the ladder the content-packs slate declared
(data pack · capability pack · mod) and then decided in full in its
addendum 27 (*"code IS part of the pack"*). Twenty packs ship today and
every one is a data pack; the code that logically belongs to a pack is
parked in the kernel tree (`mud/world/hearthworks/SealedCellar.ts`,
`mud/world/lounge/LoungeMixin.ts`, the Duncan Hall controllers). This
build makes the rung real and proves it on **magic**: an `arcana`
capability pack that ships the magic item classes, the casting
disciplines, the descriptor banks, the settings and the casting verbs;
and an `arcane-library` pack that ships the spells, every clonable
item, and the two classes only its spells name. **Most packs will be
capability packs** — a pack ships whatever classes its content needs,
and "data pack" is just the name for one that happens to need none.
The rung is a fact about a `src/` directory, not a pack's identity. Two new item classes (`Ring`, `Amulet`) land with it,
because a catalog of magic items of every kind is the thing the split
exists to make authorable — and a ring that cannot be authored today
is the clearest demonstration that a pack needs to bring its own
classes.

Seeding slate: [content-packs-slate.md](../slates/builds/content-packs-slate.md)
(the ladder at "The code problem, large form"; A33 *capability packs*).
Load-bearing docs: [content-packs.md](../subsystems/content-packs.md),
[magic-items.md](../subsystems/magic-items.md),
[magic.md](../subsystems/magic.md),
[templates.md](../subsystems/templates.md),
[hot-reload.md](../subsystems/hot-reload.md).

## Goals

- **A pack can ship classes.** A pack package carries `content/`
  (YAML, the installer's jurisdiction) and `src/` (TS). A template's
  `class:` / `hydratorClass:` path that lies in a pack's namespace
  resolves to that pack's module; the kernel tree is consulted only for
  kernel namespaces. Adding the pack's one `package.json` dependency
  line brings code and content together as a single versioned artifact.
- **Dev hot-reload covers pack code.** A pack's `src/` modules
  hot-swap through the same `HotReloadApi` machinery kernel classes do
  (`reload`, `pack sync`). In prod, code rides deploy + restart like
  every kernel change; `pack status` says when a restart is owed.
- **The rung is checked, not claimed.** A pack whose `class:` values
  resolve into its own namespace is a capability pack; the installer
  verifies the claim, and the existing lint family (`instanceable`,
  `imports`, `untitled`, `gates`) extends over pack trees so a pack's
  code is held to the kernel's rules.
- **`arcana` is the first capability pack** — magic's substrate pack:
  the item classes, the casting disciplines, the descriptor banks, the
  casting settings, the casting verbs and their controllers.
- **`arcane-library` is magic's catalog** — a pack that names
  `arcana`'s classes and ships its own where a spell needs one: the twelve spells and every clonable magic item
  currently scattered across `arcane-library`, `generic-objects` and
  `base-library`.
- **Rings and amulets are authorable and work.** `Ring` and `Amulet`
  are worn charged hosts; wearing one sustains its bound working on the
  wearer (host-held, D12) and taking it off — or running it flat —
  releases it. The dormant `alwaysOn` / `drawActive` machinery on
  `Charged` becomes live.
- **A discipline has an owner.** The rule for which pack ships a
  discipline row is stated and applied to magic.

## Non-goals

- **Migrating the parked world code.** `SealedCellar`, `LoungeMixin`,
  the Duncan Hall and University Avenue controllers, the practicum
  tree — all stay in `mud/world/` this cycle. Arcana proves the
  mechanism; moving the venues onto it is a follow-on sweep, one pack
  at a time (the alphabetical reorg continues from *b*).
- **The third-party trust story.** Signing, sandboxing, running code
  you did not review — A33.4 defers it and so does this. Every
  capability pack is first-party and MR-reviewed.
- **Hot-swapping pack code in prod.** Prod runs compiled JS; a code
  change is a restart, for packs exactly as for the kernel.
- **A *Consumable* `Potion`.** Requirements D4 of the magic-items
  build decided a potion is a `PotionMaterial` riding `Bulkable` inside
  a vessel — that is what buys dose, dilution, splitting and spilling —
  and this build keeps it. The `Potion` class that ships (D5) is a
  preset **Receptacle**, never a one-shot like `Scroll`.
- **A Shadow class for magic.** No `ArcaneShadow`. The fact/realization
  split (magic-items-slate: *fact → Condition; realize by pull;
  shadow only for owner-less behavior*) already answers what a ring
  associates with: a `sustained` Condition on the wearer. A working
  that needs push realization (invisibility, polymorph) will ship its
  own Shadow subclass from *its* pack, named by the spell row — which
  is exactly what capability packs make possible. None ships here.
- **Moving the two magic Conditions.** `dread` and
  `overchannel-strain` stay in the platform pack (see D3).
- **Moving the Practicum.** It stays in `world-seed` until the reorg
  reaches it.
- **Moving the other trades' disciplines.** `smithing`, `cooking`,
  `bartending` etc. stay in the platform pack until their trade pack
  reaches the capability rung (see D6).
- **The mana-economy design pack.** Untouched; it changes the science,
  not the packaging.
- **New spells or new item kinds beyond Ring and Amulet.** The catalog
  grows in content MRs after this lands; this build makes it growable.

## Surface decisions

### D1 — The earlier slate decisions on magic are overridden, with reasons

Addendum ~20 of the content-packs slate decided two things this build
reverses: *"the casting Disciplines stay in pack zero's closed
vocabulary (amendment-tier)"* and *"no magic monopoly pack — the tag,
not the bucket; arcane-library should SHRINK as carriers claim their
own magic."*

Both predate A33. Once code ships in the pack, the 18 `magic-*`
discipline keys are **derived by arcana's own code** (`Grid.verbDisciplineKey`
/ `nounDisciplineKey`); a vocabulary the pack's code names belongs
with that code, and "amendment-tier" now describes the pack's review
tier (a systemic pack, reviewed as one), not its location. And the
*tag, not the bucket* survives untouched: a healing spell still ships
with medicine, an enchanted anvil with smithing. What changes is that a
**catalog of magic items whose carrier is magic itself** is a
legitimate pack, not a smell — `arcane-library` is allowed to grow.
The shrink rule is retired; the carrier rule stays.

### D2 — Namespace: `/arcana` is the tenth title root

`arcana` claims `/arcana` (`requires.title`, holder: a PM-owned group
`arcana`, the trade-pack precedent). Its rows follow the
`<root>/<branch>/` pattern: classes at `/arcana/thing/Wand`,
`/arcana/thing/Ring`, `/arcana/idea/material/PotionMaterial`;
controllers at `/arcana/idea/cmd/magic/CastController`; views at
`/arcana/cmd/magic/cast`; disciplines at
`/arcana/idea/Discipline/magic-fire`. Source mirrors path:
`packages/content/arcana/src/thing/Wand.ts`. `TITLE_ROOTS` in
`lib/paths.ts` grows the root; `lint:untitled` covers it.

`arcane-library`'s rows stay in the **commons** namespace, as
`generic-objects` and `base-library` do: `/stuff/idea/magic/Spell/<id>`
(unchanged) and `/stuff/thing/magic/<item>` (the eight items leave
`/stuff/thing/items/`). The two potion materials stay at
`/stuff/idea/material/potion/<id>`; the carried potions move beside the
other items and are **named for what they are** — `potion-of-blistering`,
`potion-of-veiling`, never `flask-of-…`. The catalog reads by path:
`wand-of-firebolt`, `scroll-of-identify`, `ring-of-veil`,
`potion-of-mana`.

Every `class: /platform/thing/magic/…` and
`/platform/idea/material/PotionMaterial` reference repoints. **No
migration and no compatibility shim** — a rename drops the database.

### D3 — The kernel/pack boundary for magic

`lib/magic/**` — Caster, Faculty, Effect, EffectContext, Grid, Charged,
Consumable, Potable, Dose, Blessable, Suppression, PriceList, the
activities — **stays kernel.** It is the "always present" substrate the
slate named: casting, mana, the effect grid, suppression, the item-class
*machinery*. What moves is what *instances* that machinery.

Consequence: the two magic **Conditions stay in the platform pack**,
because kernel code inflicts them (`Caster.ts` names
`overchannel-strain`; `Effect.ts` names `dread`). The rule, stated once:
**a kernel module never names a pack's row.** One ratified exception
(planning, 2026-08-27): a kernel mixin that *declares a capability* may
name that capability's **command view** wherever the view lives —
`Caster` contributes `arcana/cmd/magic/{cast,spells}.yaml`, `Charged`
contributes `zap`/`recharge`. A `commandContributions` key is the
view's document path, `Caster` rides kernel agents, and the affordance
belongs where the capability is declared (D23); a root-agnostic verb
key was considered and declined as a new resolution rule.
`settings/magic.yaml`
moves — the kernel reads settings by key through `AppApi`, never by
pack, and merge-missing semantics mean a deployment without arcana
still boots on the code defaults.

The rule has one shipped violation, which this build fixes rather than
moves: `MagicLogic` imports `SparkSource` directly and hardcodes
`/stuff/thing/magic/GlowlightOrb` as the `emit-field` executor's
emitter. Both classes are one-line generic shapes with spell names
(`LightSourceMixin(Thing)`, `EnergizedMixin(Thing)`) — a **locus** an
effect conjures, not a spell. **The effect row names the locus it
conjures**: `emit-field` and the shock `inject-channel` gain a required
`locus:` template path, and the executor clones what it is told. No
default, no fallback. Nothing but the glowlight and spark rows names
these two classes, so they are **arcane-library's**, not arcana's —
`arcane-library/src/thing/GlowlightMote.ts` and `SparkLocus.ts` (the
names are honest again beside the spells), with their rows beside them.
The membership test this applies: **arcana holds what other packs'
content names; a class only one pack's own rows name is that pack's.**
A pack can then ship a new emitter kind without a kernel edit.

The `Discipline`, `DisciplineCatalogue` and `SpellCatalogue` *classes*
stay kernel; only the magic discipline *rows* move. Both catalogues must
warm by class (or across every title root), not by the
`/platform/idea/Discipline/` prefix they scan today.

### D4 — The loader: what "a pack ships classes" means mechanically

The requirements, not the design:

- **Discovery builds a namespace → package table.** Each pack's
  manifest root (and title claims) maps to its package's `src/` via
  Node resolution (`require.resolve('<pkg>/package.json')`, the same
  seam the installer already uses to find `content/`).
- **`StuffApi.loadClassByPath` consults the table before the kernel
  tree.** A class path under a pack namespace imports from that pack;
  a kernel namespace behaves exactly as today. `resolveModuleId` and
  the `FromModule` policy shape are unchanged — a pack module's id is
  its `/`-absolute path, the same string as its template path, so
  call-security gates on pack controllers read identically to kernel
  ones.
- **`HotReloadApi` covers pack `src/`** — `reload <path>` and
  `pack sync` hot-swap a pack's changed modules by the existing
  registry mechanism. The brain-module resolution (`resolveExport`)
  rides the same table.
- **`dependsOn` derives from `package.json` dependencies.** One graph;
  a pack that names another pack's classes declares it by the
  dependency line, and the installer's order follows. The manifest key
  is retired, not kept as an override.
- **The rung check.** `requires-kernel` resolves each `class:` and
  records *where* it resolved. The check keys on **resolution origin**,
  not path prefix (ratified at planning): a class path in a namespace
  only a pack's own `src/` could serve, from a pack that has none,
  fails install ("claims data, ships code") — while a pack whose rows
  name parked *kernel* classes under its own `/world/<x>` claim
  (`saxonberg-lounge`, `hearthworks` today) is a data pack and passes; a pack whose `src/` exports classes no row and no other pack
  names is reported (dead code in a pack is a review finding, not a
  failure).
- **Lint over pack trees.** `lint:instanceable` walks pack `src/` with
  the kernel rules (nothing instances `/lib/`; every `class:` resolves;
  a pack has no `lib/` — substrate it needs is either the kernel's or
  a class it ships under a branch). `lint:imports` grows a **pack
  profile**: a pack module may import its own tree, its declared pack
  dependencies, `@saxonberg/types`, and the kernel's *author surface*
  (the projected consumer + extension tiers — `Thing`, the mixin
  factories, the Apis) — never `backend/`, never Node built-ins.
  `lint:gates` resolves `FromModule` strings into packs.
  `lint:module-scope` applies unchanged.
- **Tests travel with the code.** A pack's `src/**/__tests__/` runs
  under `pnpm test` and `pnpm test:near`, imports `test-bootstrap`
  like every runtime test, and is subject to `lint:test-bootstrap`.
  Kernel tests that today read pack YAML by relative path
  (`MagicLogic.test.ts`, `Consumables.test.ts`, the practicum
  integration test, the `Appearance`/`UnidentifiedLong` bank tests —
  eleven files) keep working against the new locations.

### D5 — Ring and Amulet, and the wear wiring

`Ring` and `Amulet` are `Wearable` charged hosts — `Wand`'s composition
with `Wieldable` replaced by `Wearable` (slot claims per body plan:
finger / neck). Two classes rather than one "Worn" class because the
descriptor banks, the census keys and the slot claims are per kind, and
a player learns *ring* and *amulet* as distinct classes of thing (the
identification model keys on class).

**Wearing sustains; releasing releases.** The `Slottable` witnesses
that already fire from the one `Slotted.occupy` / `vacate` chokepoint
(every path — `SlotApi.occupyAll`, persistence restore, the release
gate) are the seam:

- `onSlotOccupied` on an `alwaysOn` charged host discharges its bound
  working as a **`sustained` Condition on the wearer**, `sustainedBy`
  the host, and sets `drawActive`.
- `onSlotReleased` releases the sustained effect and clears
  `drawActive`. So does the host reaching zero charge — the standby
  draw that is already metered against the shell's reserve now has a
  consequence.
- A cursed ring is a ring the release gate refuses to let go
  (`Blessable.tryRelease` — shipped, unchanged): it stays on and keeps
  drawing.

`alwaysOn: false` on a ring is legal (a triggered ring is a wand you
wear). Nothing about this is ring-specific: the wiring lives on the
charged-host side (`Charged`, kernel — see D3) keyed on `alwaysOn`, so
a future always-on orb or circlet gets it by composition.

A flat ring is not dead: `recharge`, `Conduit` and the charging bench
already refill it. Pattern fade (D9) remains the only true end.

**`Potion` — a preset Receptacle.** The carried potion already exists
as a `Receptacle` row whose `interiorMaterial` names a draught; what it
costs today is ~14 lines of glassware boilerplate per row (`material:
glass`, `interiorBulk`, `interiorCapacity: 0.25`, the keywords, the
`potion` descriptor class). `Potion extends Receptacle` in arcana
carries those as defaults, so a catalog potion is three lines:
description, `interiorMaterial`, `interiorAmount`. The liquid stays a
`PotionMaterial` (pourable, splittable, dilutable — D4 intact); the
*class* is what makes `/stuff/thing/magic/potion-of-mana` a thing a
player clones and recognizes. Every field a row may still override.

**The mana potion's model is metabolic, and it carries no spell.**
`arcane-science.md` forbids a mana generator (*no amount of fuel
becomes mana*), and the magic build already closed the matching first-law
hole — a caster's reserve refills through metabolism's coupled
recovery, spending satiation and hydration, *body before gift*.
magic-items.md states the consequence: *"a mana potion is a
concentrated carbohydrate and needs no new mechanism at all."* So
`mana-draught` is a `PotionMaterial` with a meal chemistry that feeds
coupled recovery — a caster who drinks it recovers mana **fast over the
following minutes**, never instantly, and a half dose feeds half as
much. No `adjust-reserve: mana` — and while the door is in view, a
positive `adjust-reserve` on `mana` must route through the same
coupling guard `charge` already has (`transferCharge` closed that door
for charge; mana gets the same treatment), so that no effect anywhere
can add mana without paying for it.

### D6 — The discipline ownership rule; the Practicum

> A discipline row ships with the pack whose **code derives or
> teaches** its key. Until that pack exists at the capability rung, the
> row stays in the platform pack.

Applied: the 18 `magic-*` rows move to arcana. `smithing`, `cooking`,
`bartending`, `medicine` and the rest stay put — `trade-smithing` is a
data pack today and the smithing key is derived by kernel crafting
code. When a trade pack graduates, its disciplines go with it; that is
the rule, not a per-pack argument.

The Practicum stays in `world-seed` (transitional by declaration).

### D7 — `arcane-descriptors` folds into `arcana`

The six banks are the data the item classes cannot function without
(`Identifiable` has no appearance without a bank). A pack that ships
the class ships the bank. `arcane-descriptors` is deleted as a pack;
its `descriptor-banks/` kind directory lands in `arcana/content/`.
The `ring` and `amulet` banks stop being orphans.

### D8 — The five casting verbs move

`cast`, `spells`, `study`, `zap`, `recharge` — views and controllers —
move to arcana (`/arcana/cmd/magic/…`, `/arcana/idea/cmd/magic/…Controller`).
The controllers are the first **pack-shipped controllers** resolved
through the general rule (a spec's `controller:` is a path; no
domain special-case), which is the second thing this build proves
after item classes. The `magic` command category is unchanged.
`SpellCatalogue` and `DisciplineCatalogue` (registry singletons) stay
in the platform pack's boot list.

### D9 — What each pack contains, exhaustively

**arcana** (capability; root `/arcana`; requires title `/arcana` →
group `arcana`). The test for membership: **nothing in arcana is
specific to one effect** — it is the building blocks effects are made
from. A class or row that exists for one spell is the library's.

| kind | rows |
|---|---|
| `src/` classes | `thing/Wand`, `thing/Scroll`, `thing/Spellbook`, `thing/Conduit`, **`thing/Ring`**, **`thing/Amulet`**, **`thing/Potion`** (a preset `Receptacle`, D5), `idea/material/PotionMaterial`, `idea/cmd/magic/{Cast,Spells,Study,Zap,Recharge}Controller` |
| domain rows | 18 `idea/Discipline/magic-*`, 5 controller templates |
| command-view | 5 |
| settings | `magic.yaml` |
| descriptor-banks | 6 |

**arcane-library** (capability; commons namespace; depends on
`arcana`):

| kind | rows |
|---|---|
| `src/` classes | `thing/GlowlightMote`, `thing/SparkLocus` (today's `GlowlightOrb` / `SparkSource`, D3) |
| spells | the 12 at `/stuff/idea/magic/Spell/` |
| items | `glowlight-mote` and `spark-locus` (the two effect loci, `class:` the pack's own, named by their spells' rows — D3), `primer-of-glowlight`, `manual-of-transfer`, `scroll-of-identify`, `scroll-of-remove-curse`, `wand-of-firebolt`, `wand-of-firebolt-cursed`, `brass-conduit`, `charging-bench`, `potion-of-blistering`, `potion-of-veiling` (today's two flasks, on `Potion`) — at `/stuff/thing/magic/` |
| materials | `blistering-draught`, `veiling-draught` (unchanged path) |
| **new exemplars** | one ring and one amulet row, each carrying a shipped sustained working (veil and glowlight are the two the engine realizes today); and **`potion-of-mana`** on `Potion` with its `mana-draught` material — so every new class ships exercised. `veil` and `glowlight` gain band authoring (ratified at planning — `lint:blessed-bands` binds the exemplars' class, and a cursed veil / a cursed light are those workings' own low ends) |

`generic-objects` and `base-library` lose those rows. `platform` loses
the disciplines, the banks' consumer note, the settings file, the
verbs. `arcane-descriptors` is gone. **Nineteen packs.**

## Constraints

- **No migration, no compat, no guard.** Paths change; the DB drops.
  Anything that reads "legacy", "adopt", "fallback for the old path" is
  junk on sight.
- **Module categories hold inside a pack.** A pack's `src/` has the
  kernel's taxonomy: `thing/`, `idea/`, `agent/`, `location/` branches
  of instanceable classes; controllers at `idea/cmd/<category>/`; no
  `lib/`, no free-floating helpers, no new Api (a pack that needs an
  Api needs a kernel MR — that is the *mod* rung). Export discipline
  is unchanged.
- **A pack module never imports outside its profile** (D4). The import
  boundary is what makes pack code reviewable as content-shaped code
  rather than as a kernel change.
- **A kernel module never names a pack's row or class** (D3). The
  direction is one way: packs import the kernel's author surface; the
  kernel asks through `MixinApi.isX` and gated Apis. `Slotted`,
  `Circulating`, the spawn sweep already do this for the magic tree
  and are the exemplars.
- **Backing-class path mirrors template path**, inside packs as in the
  kernel — the same-string module-id / template-path property is what
  keeps `FromModule` gates on pack controllers readable.
- **The `XApi`↔`XLogic` split is untouched.** `MagicApi`/`MagicLogic`
  stay kernel; arcana's controllers call the Api like any controller.
- **`Blessable` obliges band authoring** — the new ring and amulet
  exemplar rows must author band variation (`lint:blessed-bands`).
- **Materials are a closed set filtered by class location.**
  `MaterialLogic.boot` keeps a row only when its class starts with
  `/platform/idea/material/`; that filter must admit
  `/arcana/idea/material/PotionMaterial` without becoming an allowlist
  of packs (test: a `Material` subclass, wherever it lives).
- **Catalogue warming is by class, not by root prefix** (D3), for both
  `DisciplineCatalogue` and `SpellCatalogue` — the second pack to ship
  a discipline must not need a kernel edit.
- **`pnpm test` runs once**; a green run stays valid until a source
  file changes. `test:near` is the loop.
- **Push every turn.**

## Acceptance criteria

- `packages/content/arcana/` exists with `src/` + `content/` per D9;
  `packages/content/arcane-descriptors/` does not; `pnpm install`
  links `@saxonberg/content-arcana` and the server's `package.json`
  depends on it.
- A fresh database boots with all nineteen packs; `pack status` lists
  both as capability packs with `arcane-library` depending on `arcana`;
  the boot's `requires-kernel` step resolves every arcana class into
  `packages/content/arcana/src/` and the two loci into
  `packages/content/arcane-library/src/`.
- `clone /stuff/thing/magic/wand-of-firebolt` in a live server yields
  a working wand; `zap`, `cast`, `study`, `spells`, `recharge` all
  dispatch through the pack-shipped controllers (driven live, not
  inferred from tests).
- Wearing the exemplar ring puts a `sustained` Condition on the wearer
  with `sustainedBy` the ring and the working realized (the veil
  disguise visible to a second viewer); removing it releases the
  effect; a ring run flat by the standby draw releases it; a cursed
  ring refuses removal and keeps drawing. Each is a test, and the
  wear/remove pair is driven live.
- Drinking `potion-of-mana` raises a depleted caster's mana across the
  recovery window and not on the tick it is drunk; a half dose recovers
  half; a non-caster who drinks it is merely fed. A spell authoring a
  positive `adjust-reserve` on `mana` is refused the way one on `charge`
  is. Each is a test.
- `MagicLogic` imports nothing from and hardcodes no path into any
  pack; `cast glowlight` conjures the emitter its row names and `cast
  spark` conducts through the locus its row names; a spell row whose
  `emit-field` lacks `locus:` fails catalogue validation.
- Editing `packages/content/arcana/src/thing/Wand.ts` in dev and
  running `reload /arcana/thing/Wand` hot-swaps the class for existing
  instances (the existing hot-reload contract, observed on a pack
  path).
- A deliberately mis-rung pack (a `src/`-less pack whose `class:`
  resolves into its own namespace) fails install with the rung
  message; a test proves it.
- `pnpm lint`, `lint:instanceable`, `lint:imports`, `lint:gates`,
  `lint:untitled`, `lint:topics`, `lint:module-scope`,
  `lint:test-bootstrap`, `lint:test-content`, `lint:blessed-bands` all
  pass with pack trees in scope; each has at least one test or fixture
  demonstrating it *would* fail on a pack violation.
- The eleven kernel tests that read pack YAML by relative path pass
  against the new locations; the full suite is green once.
- `content-packs.md` documents the capability rung as built (the
  table row for `arcana`, the loader, the rung check, the pack import
  profile, the discipline rule); `magic-items.md` gains Ring/Amulet and
  the wear wiring; `magic.md` records where the disciplines live;
  `CLAUDE.md`'s pack count and the Module Categories note that the
  taxonomy applies inside a pack; `roadmap.md`'s "pure-data, no-code"
  line is corrected.
- `arcane-library/README.md` is rewritten (it still cites `seeds/` and
  `content/obj/`).

## Cross-references

- Seeding slate: [content-packs-slate.md](../slates/builds/content-packs-slate.md)
  — the ladder ("The code problem, large form"), A33 (capability
  packs), the magic-homing addendum this overrides (D1);
  [content-pack-units.md](../slates/builds/content-pack-units.md)
- [magic-items-slate.md](../slates/tails/magic-items-slate.md) — the
  Condition-vs-Shadow split (D5, the shadow non-goal)
- Subsystem docs: [content-packs.md](../subsystems/content-packs.md),
  [magic.md](../subsystems/magic.md),
  [magic-items.md](../subsystems/magic-items.md),
  [hot-reload.md](../subsystems/hot-reload.md),
  [templates.md](../subsystems/templates.md),
  [call-security.md](../subsystems/call-security.md),
  [slot.md](../subsystems/slot.md),
  [embodiment.md](../subsystems/embodiment.md),
  [advancement.md](../subsystems/advancement.md) (the Discipline
  catalogue), [access.md](../subsystems/access.md) (the wizard
  code-trust axis the rung's review sits on)
- Follow-ons this unblocks: the world-code migration sweep (per venue
  pack), trade packs graduating to the capability rung, the
  wizard-curated class allowlist (v2 of the wizard-authority build)
