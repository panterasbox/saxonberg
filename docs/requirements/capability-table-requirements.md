# The capability-keyed affordance table — requirements

The end state agreed in the crafting-branches review (MR !153): **verb
families are conferred from instance `capabilities` data**, so a tool
variant is pure seed data — no class, no code. The interim shipped
per-class statics on thin classes (`Whetstone`, `Anvil`, `SewingKit`)
whose only job is carrying `commandContributions`; this build retires
them by teaching the tool substrate to derive its affordances from a
**capability → verb-family table**, and grows capability entries into
**parameterized specs** (kind + work-rate + control band) so the
kit→machine relationship (a sewing machine from a sewing kit) is the
same data-only move the furnace family already models for heat
(campfire/oven/forge/kiln = one mixin + authored intensity). Seeded by
[tails/crafting-slate](../slates/tails/crafting-slate.md) (the
capability-as-role model) and the tools-confer decision recorded in
[crafting.md § The offer](../subsystems/crafting.md) /
[command-spec.md § who affords a verb](../subsystems/command-spec.md);
the walk seam is
[command-routing.md](../subsystems/command-routing.md)'s
`InstanceContributor` (the `Behaved` dialogue-tree precedent).

## Goals

- A tool's verb surface derives from its **instance data**: a seed row
  with `class: /lib/craft/ToolItem` and a `capabilities` list affords
  the listed kinds' verb families with **zero new code**.
- The capability **vocabulary stays closed** (the fixed-vocabulary
  doctrine, as with Materials): each kind's definition — verbs
  conferred, placement — lives with the vocabulary in
  `lib/craft/ToolCapability.ts`. Adding a *kind* is a vocabulary
  (code) decision; selecting kinds and tuning parameters is an
  instance (data) decision.
- Capability entries grow **parameters**: an authored entry is either
  a bare kind string (shorthand for defaults) or a spec
  `{ kind, rate?, control? }` — `rate` a work-rate multiplier
  (default 1), `control` a Grade band embedded in the capital
  (default none).
- The two parameters are **consumed**: an engaged crafting step's
  duration divides by the resolved instrument's rate; a mint/repair
  performed with a control-bearing instrument **floors** the resulting
  Grade at the instrument's band (skill-in-capital raises the floor;
  the ceiling stays the skill seam's business).
- The **inventory bucket** of the affordance walk consults instances
  (today only `environment`/`peers` do), so carried tools confer from
  data exactly as present ones do.
- The three affordance-only thin classes (`Whetstone`, `Anvil`,
  `SewingKit`) are **deleted**; their seeds reclass to
  `/lib/craft/ToolItem`. `CookPot` and `CocktailShaker` keep their
  classes (they carry real `ManualBuildMixin` behavior) but drop their
  contribution statics in favor of the table.
- The **sewing machine ships as acceptance content**: a seed-only
  general-store good (`ToolItem`,
  `capabilities: [{ kind: mending, rate: 3, control: fine }]`, heavy,
  big-ticket) that repairs soft goods ~3× faster with a `fine` quality
  floor — proving the variant story end to end.

## Non-goals

- **Furnace-family migration.** `FurnaceMixin`'s verbs
  (`heat`/`ignite`/`douse`/`pump`) stay class statics — a furnace is an
  appliance mixin with real behavior, not a `Tooled` host; it already
  models variants as data (burn temperature, bellows).
- **Powered variants / supply gates.** The electric machine's
  required-vs-reachable power gate waits for the electricity
  subsystem's consumer build (the forge's `requiresHeatK` shape is the
  ready-made socket).
- **Batching** (one engagement, N items), per-capability wear
  differentiation, and machine-vs-hand advancement-evidence
  asymmetry — crafting.md § Deferred seams / the advancement side.
- **Skill-side control.** `deriveAtFixedControl`'s `_control` argument
  stays reserved for the skill build; this build's floor rides the
  existing `grade.max(...)` composition, not that seam.
- **Runtime affordance recompute.** `setCapabilities` edits and
  break/repair transitions do not re-push stacks mid-containment (the
  same documented limitation `Behaved`'s dialogue-tree contribution
  has); surfaces refresh on the next containment delta.
- **Capability table as DB data.** The table is code (the closed
  vocabulary's definition), never a collection — packs and seeds add
  zero vocabulary.
- **Non-Tool hosts.** The table rides `ToolMixin` only; menus stay
  commerce-only, `make` stays innate on Avatar.

## Surface decisions

### The table lives with the vocabulary

`lib/craft/ToolCapability.ts` grows each kind's definition:
`{ verbs: string[], placement: 'reachable' | 'carried' }` (verbs as
`cmd/` YAML keys). Initial mapping = exactly what the thin classes
carry today: `shaker`/`mixing-glass` →
pour/stir/strain/garnish/serve/mix; `pot` →
pour/stir/heat/plate/cook; `anvil` →
hammer/quench/forge/repair/salvage; `mending` → repair/salvage
(reachable); `whetstone` → sharpen (**carried** — the
personal-capital rule survives as a placement value); `striking`/
`strainer`/`muddler` → no verbs (recipe-side kinds). `reachable` maps
to the environment + inventory buckets, `carried` to inventory only.

### ToolMixin implements InstanceContributor

`getInstanceContributions()` derives buckets from the table over the
instance's **authored** capabilities. Deliberately not gated on
`isBroken` — a broken anvil keeps *affording* `hammer` and the
controller's capability check declines diegetically (a vanishing verb
would also go stale, since breakage doesn't move the tool). This
matches today's statics, which never vanished on break either.

### Parameterized entries, one field

The persisted field stays `capabilities`, now
`(string | CapabilitySpec)[]`, normalized on set (strings = defaults),
validated against the vocabulary (unknown kind throws, as today).
Method surface: `hasCapability(kind)` (unchanged, still
broken-gated), `capabilityRate(kind)`, `capabilityControl(kind)`.
Recipes' `toolCapabilities` matching is untouched — kinds are still
kinds.

### Rate divides the step you already resolve

Each engaged crafting step divides its base duration by the rate of
the instrument it already resolves (the striker for `hammer`, the
whetstone for `sharpen`, the mending tool/anvil path for `repair`,
the build vessel for the vessel steps). Clamped to a sane band
(0.25–10) so data can't zero a duration.

### Control floors the Grade, floor only

Where a craft/repair resolves a control-bearing instrument, the
outcome grade gains `.max(Grade.of(control))` — the same composition
the recipe base-grade floor already uses. No ceiling effects; `analyze`
surfaces the band on the tool.

### The sewing machine is the acceptance content

Seed-only at the general store (big-ticket, ~18 kg — shop capital by
encumbrance, the anvil's trick in a milder register). The kit stays
cheap/carried. The pair demonstrates: same kind, different parameters,
zero classes. (The grinding wheel as a whetstone variant becomes a
free follow-on any author can seed.)

## Constraints

- The walk change is exactly one site: the inventory push in
  `CommandLogic.applyContainmentDeltaImpl` moves from
  `collectBucketDefs(item.constructor, …)` to
  `collectBucketDefsForInstance(item, …)`. Shadow/self sites keep the
  class-only read (no instance in hand). The hook must stay cheap and
  total (containment hot path; throws are swallowed).
- Closed-vocabulary validation extends to spec entries; the
  Hydrator round-trips the mixed array as plain records (no new
  marshaller).
- Inter-Stuff reads go through the method surface
  (`capabilityRate(...)`, never `.capabilities`); the antipattern
  table's typeof-probe rule applies to consumers.
- No new module categories: the table extends the existing vocabulary
  module; deleted classes shrink
  `general-store-content.test.ts`'s `DISCRETE_ITEM_CLASSES` allowlist.
- Data migration: reclassed seed rows (hearthworks whetstone + anvil,
  store sewing-kit) need the documented insert-only purge-and-reseed
  in dev DBs and on the live box
  ([live-login-stale-class-ref] applies).
- Live-drive verification per the crafting precedent: both existing
  drive scenes must stay green, plus a machine beat.

## Acceptance criteria

- A test (and the live drive) shows a **seed-only tool** conferring
  its verb family: the sewing machine repairs with no class beyond
  `ToolItem`.
- `Whetstone.ts`, `Anvil.ts`, `SewingKit.ts` are deleted; the smithy
  and cookhouse drive scenes pass unchanged; `sharpen` still appears
  only when the stone is carried (placement honored).
- CommandGiver tests cover the inventory bucket's instance consult
  (a data-capability tool carried → verbs; dropped → gone on the
  delta).
- Machine repair engagement ≈ base/3; the repaired item's grade is
  floored at `fine`; the kit's behavior is byte-identical to today.
- Recipe `toolCapabilities` matching, broken-gating
  (`hasCapability` false when broken), and the wear model are
  unchanged — existing crafting suites pass unmodified.
- Spec normalization/validation covered in `Tooled` tests (string
  shorthand ≡ defaulted spec; unknown kind throws; mixed arrays
  round-trip the Hydrator).
- Docs: crafting.md + command-spec.md replace the "interim per-class
  statics" language with the table; command-routing.md's
  `InstanceContributor` section notes the inventory bucket;
  antipatterns.md's venue-affordance entry points at the table as the
  fix's final form.

## Cross-references

- Seeding: [tails/crafting-slate](../slates/tails/crafting-slate.md)
  (capability-as-role, § Standard-model situation)
- [crafting.md](../subsystems/crafting.md) — tools/capabilities, the
  offer, § Deferred seams
- [command-spec.md](../subsystems/command-spec.md) § who affords a
  verb; [command-routing.md](../subsystems/command-routing.md)
  (`InstanceContributor`, the contribution stacks)
- [retail.md](../subsystems/retail.md) (the store shelf the machine
  lands on); [encumbrance.md](../subsystems/encumbrance.md)
  (fixture-by-mass)
- The electricity consumer build (future) for the powered variant's
  supply gate
