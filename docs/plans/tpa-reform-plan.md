# TPA reform — implementation plan

**Input:** [`docs/requirements/tpa-reform-requirements.md`](../requirements/tpa-reform-requirements.md)
— D1–D12 + D8a locked with the user, 29 acceptance criteria. This plan is
the **how**, and does not re-open a D-number. Read alongside
[arcane-science.md](../arcane-science.md) (the physics),
[magic.md](../subsystems/magic.md) · [magic-items.md](../subsystems/magic-items.md)
(the cast pipeline, `ChargedMixin`, `S* = inflow/d`),
[fasttravel.md](../subsystems/fasttravel.md) (**rewritten by this build**),
[content-packs.md](../subsystems/content-packs.md) (the capability rung — the
pack cut is the single largest mechanical step),
[watershed.md](../subsystems/watershed.md) (`SupplyState`, the `Conduit` ladder),
[slot.md](../subsystems/slot.md) · [access.md](../subsystems/access.md) ·
[mql.md](../subsystems/mql.md) · [employment.md](../subsystems/employment.md) ·
[civics.md](../subsystems/civics.md).

**Build discipline.** `pnpm test:near` + every touched pack's own vitest + the
full lint family each wave; **one** full `pnpm test` before each MR (§ *One
build or two* says there are two). No migrations — content edits and drop the
DB. Stage by name; push every turn.

---

## Grounding — facts verified against the tree this cycle

File refs are current at plan time. **Every one of these was checked in the
source, not taken from a doc.**

**The lints that will bite**

- `packages/server/scripts/check-object-verbs.ts` is CI-gating at zero
  (`--advisory` restores counting). It scans **`src/mud/api/**` only**, flags
  public statics on `*Api` classes whose **first parameter** mentions `Stuff`,
  `Interactive`, or a name imported from `lib/**`/`platform/**`. Two escape
  hatches exist and both are honest: `EXEMPT_APIS` (a visible-diff list —
  **`MagicApi` is already on it**, line 130) and
  `NON_SUBJECT_SUFFIX = /(?:Fields|Spec|Opts|Options|Config|Payload|Snapshot|Result|Params|Init|Request|Profile|Descriptor|Report)$/`,
  which is why the blessed `CraftingApi` request-object shape passes. **A pack
  ships no Api at all**, so nothing in `/system/tpa` or arcana can fail this
  lint; the only exposure is the one new kernel Api method (P4).
- `pnpm lint:instanceable` invariant 8: a pack's `src/` has **no `lib/`** —
  every module sits under `thing/` · `idea/` · `agent/` · `location/` ·
  `behavior/` · `__tests__/`.
- `pnpm lint:world-scan` gates `StuffApi.getAllObjects()` with a four-entry
  allowlist and **walks pack `src/` too**. AC17 is a *test* obligation (no
  `world:` seed), not this lint's.
- `pnpm lint:untitled` derives its title roots from every pack's
  `requires.title` claims — `/system/tpa` becomes a root the moment the
  manifest claims it.
- `pnpm lint:schema` = 48 collections. Nothing here adds one (P10).
- `packages/server/scripts/pack-roots.ts` is the lint family's shared pack
  reader; a new pack is picked up automatically once it has `pack.yaml` +
  `src/`.

**Fast travel today**

- `packages/server/src/mud/lib/fasttravel/FastTravel.ts` (417 ln) —
  `FastTravelMixin`: `directionality`, `routes` (an **instruction** field,
  `applyRoutes`), `selectedDestinationRef`, `status` (a persisted string,
  inert), `surcharge`, the timetable, `getArrivalRoom()` (= `getContainer()`),
  `getDestinationLabel()` (covering Locality), `renderDepartures(viewer)`. Its
  `commandContributions` is **a class static** (correct); the `register` view
  is pushed on the `peers` bucket.
- Kernel consumers of the mixin are **five and only five**: `Mixins.FastTravel`
  (`lib/mixin.ts:323`), `MixinApi.isFastTravel` (`api/mixin.ts:825`),
  `lib/command/validators/mustBeAtFastTravelNode.ts`,
  `lib/command/validators/requiresTravelCredential.ts`, and
  `BankingLogic.ts:1144` (a *string* read of `fasttravel.tpaBusinessPath`,
  already try/caught to `""`). Nothing else in `lib/` or `platform/` names fast
  travel.
- `world/common/tpa/` = `TpaTerminal.ts` (170 ln) · `TravelCard.ts` (25) ·
  `paths.ts` (10). `TpaTerminal` composes
  `DisplayMixin(SingletonMixin(PostRegistration(Fixture(Detailed(FastTravel(Thing))))))`,
  renders the status light through `getPresentationMml`, and serves the board
  through `readScreen`.
- ⚠ **`world/lounge/thing/LoungeTerminal.ts` extends `TpaTerminal`** — this is
  the one hard blocker on moving the class out (kernel may not import a pack).
  Its two overrides are `getArrivalRoom()` (returns the Lounge Warren host) and
  `getDestinationLabel()` (returns `"The Lounge"`). The row already carries
  `seatIn: /world/lounge/idea/warren`, so `FixtureMixin.seatSelf` places it
  **inside** the Warren host — meaning the generic `getArrivalRoom()`'s
  `getContainer()` should already return the same object (P6 verifies and
  deletes the subclass).
- `TeleportController` lives at `platform/idea/cmd/author/` with its view at
  `platform/cmd/author/teleport.yaml` — **the author category, for a verb every
  player types.**
- The two live defects `fasttravel.md` records are both real in the code:
  `execute()` calls `canSelfTeleport` *before* the fork, so a holder
  self-powers past the TPA path; and `selectedDestinationRef` falls back to the
  first route, so `ref` is never `null` and `renderDepartures` is unreachable
  from a bare `teleport`.
- `BORN_WITH_TRAVEL_NODES` (`lib/credential/Credential.ts:48`) hardcodes three
  `/world/...` paths, consumed twice (the `TravelCredential` ctor and
  `fromData`) and by three kernel tests.
- Terminal rows: `terminus` ×4 · `hinkley-hills` ×1 · `newbie-wilds` ×1 ·
  `saxonberg-lounge` ×1, all naming `/world/common/tpa/TpaTerminal` (or
  `LoungeTerminal`). The travel-card row is `world-seed`'s.

**Magic**

- `MagicLogic.resolveCastImpl` computes cost **inline**, once:
  `const cost = (spell.cost || dial(magic.costDefault, 15)) * fadeMultiplier`.
  `prepareCastImpl` computes **no** cost. `Spell` is a pure-data `Idea`;
  `SpellDescriptor.cost: number` (absolute pt). The item door reads
  `spell.cost` directly at `MagicLogic.ts:648` and `:708` via
  `magic.charge.kJPerCostPt`.
- `prepareCast(spellId, target?)` / `resolveCast(spellId, target?)` are
  **object-face methods on `CasterMixin`** forwarding into `MagicLogic` (the F3
  face) — `MagicApi` is exempt from `lint:object-verbs` but nothing new needs to
  go on it as a subject-first static.
- `Effect` is a **closed union** of 11 kinds, validated by
  `MagicEffects.validate`; `MoveEffect` is `shove|pin` only. There is **no
  relocation effect** (P3 adds one).
- `ChargedMixin` (`lib/magic/Charged.ts`): `capacityKJ` (persistent +
  authorable), `getStoredKJ` / `getCapacityKJ` / `setCapacityKJ` /
  `getChargeFraction` / `isDepleted` / `spendCharge(kJ)` / `receiveCharge(kJ)` /
  `chargeFrom(actor, pt)`; the reserve is `Charge.RESERVE_KEY = 'charge'`,
  `Charge.UNIT = 'kJ'`. `capacityKJ` is authored in exactly **four** content
  rows (ring-of-veil, wand-of-firebolt ×2, amulet-of-glowlight); 68 total
  occurrences of the kJ surface tree-wide.
- ⚠ `lib/quantity.ts` documents `'pt'` as *"the neutral unit for authored
  reserve instances (mana / charge / essence)… 'mana' is a content word,
  **never an engine surface**"*, and `lib/magic/Conduit.ts` already writes
  *"1 τ ≡ 1 kJ"* in prose. So τ is **already the fiction's word** and the
  conversion is already 1. (P1.)
- `MagicLogic.transferChargeImpl` (`:1852`): refuses `!isCaster(actor)` —
  *"You have no gift to pour into it"* — and refuses when `bestConduitFor(actor)`
  finds no `ConduitMixin` **carried or in the actor's environment**. Delivered =
  `committed × coupling × competence`, both < 1. The `transfer`-spell-knowledge
  gate lives in **`RechargeController`**, not in `chargeFrom`.
- `CasterMixin.installArcaneReserve()` returns early on `!isCastingCapable()` —
  a non-caster holds **no** mana reserve, as D8 says.

**Slots, supply, access, employment**

- `Slotted.validateSlotSpecs` rejects any `SlotSpec.accepts` not in
  `Object.values(Mixins)` — **the kernel registry**. A pack-defined mixin name
  is not a legal `accepts`. `canOccupy` = anatomy/trauma gate → folded gate →
  `MixinApi.hasMixin(candidate, spec.accepts)` → `candidate.fitsSlot(host, slot)`.
- ⚠ **There is no shipped generic slot-insertion verb.** Every `occupy()` call
  site is bespoke: `wear` / `wield` (body slots), `mount`, `plant` / `repot`
  (`CultivableMixin`'s `PLANT_SLOT`, category `inventory`), plus framework
  restores. The `device` category ships
  `arm · disarm · douse · fold · ignite · pump · switch · unfold` — **none of
  them drive a slot.** The requirements' D6 claim that "the shipped
  `device`-category verbs already drive slots" is **not true of the tree** (see
  § *Where the requirements are wrong*). `plant`/`repot` is the precedent to
  copy.
- `lib/supply/SupplyState.ts`: six words, `SUPPLY_STATE_PRECEDENCE`,
  `SUPPLY_STATE_GLOSS`, and the **structural**
  `SupplyReporting { supplyReport?(nowS): Promise<SupplyReport> }`.
  `AnalyzeWaterController:139` reads it **by shape** — ⚠ which is precisely
  why `ManaPoweredMixin` must **not** implement that shape (P8): it would
  make `analyze water <terminal>` accidentally work, and no consumer wants
  it. The **vocabulary** is reused; the reporting interface is not.
- `AccessRegistry.heldExtents` walks `ParcelApi.allRecords()` and admits on
  `record.getOwner()` — **title only**. Use-grants (`grants[]`) are structurally
  excluded, so AC20 is nearly free. `/home/<key>` is unioned in for Avatars.
  `TreeAction` already contains `'teleport'`.
- ⚠ `PositionData` (`lib/employment/Position.ts:26`) carries **no** appointing
  authority; `OrganizationMixin` has exactly one org-level
  `appointingAuthority`, and `EmploymentLogic.isProprietorOfImpl` reads that
  one. `holdsAuthorityImpl` already dispatches
  `{kind:'seat'} → GovernmentApi.holdsSeat` (`EmploymentLogic.ts:124`).
  **D1's "board positions appointed by seat refs", plural, needs a per-position
  field.**
- The TPA Business row already exists at
  `packages/content/terminus/content/world/terminus/terminal/idea/tpa.yaml` —
  `class: /platform/idea/Business`,
  `appointingAuthority: {kind: committee, parcel: /world/terminus/terminal}`,
  `positions: []`.
- `MqlApi.resolveOne(raw, {commandGiver, scope})` takes **one seed string at a
  time**; a view's `scope: [...]` is a `tries` loop in `CommandLogic`. A
  controller can therefore build a *dynamic* scope list.
  `OnExcessPolicy = 'top' | 'take-all' | 'prompt' | 'truncate' | 'error'`; the
  default `'top'` silently picks a winner.
- `ZoneApi.elevationFor(scope: Stuff & Container): Promise<number|null>` —
  walks out to the outermost container first; `coords.z` deliberately does not
  contribute. `Tangible.getMass(): Quantity<'kg'>` and
  `LoadBearing.getBorneBurden(): Quantity<'kg'>` are the two halves of `m`.
- `ReservedMixin.reserves` is `{persistent: true, runtimeState: true}` — a
  reservoir persists only if its host persists.
- Packs: **35 today**, 16 with `src/`. `/system/tpa` is number **36**, not
  "thirty-two" as the requirements say.

---

## ⚠ Where the requirements are wrong or underdetermined

Flagged rather than planned around. None is a D-number to reopen; all four are
places the requirements assert a fact about the tree that the tree does not
support, or leave a fork the plan has to pick.

1. **D6 / AC7 — "the shipped `device`-category verbs already drive slots" is
   false.** No shipped verb inserts a `Slottable` into a non-body slot. AC7 as
   written cannot pass. **Plan (revised, user 2026-09-02): extend `put`, do not
   invent a verb.** `put`'s target `requires: [VisibleMixin,
   ContainerMixin|SurfacedMixin]` — adding `SlottedMixin` and an occupy branch
   to `PutController` makes `put cell in terminal` work.
   ⭐⭐ **This is a hole in the slot substrate, not a TPA requirement.** Nothing
   in the game can put anything into any non-body slot by any verb (`wear` /
   `wield` are body, `plant` / `repot` are the plant slot, `mount` is
   conveyance), so `put` is where it belongs and fixing it once fixes it for
   every slot-bearing fixture anyone authors. `PutController` already reaches
   for `MixinApi.isSlotted` — but only to *release* the item from the giver's
   own slots on the way out, never to insert into a target's.
   ⓘ The reverse looks free: `get`'s target is `[VisibleMixin,
   ContainableMixin]` with no source restriction, so `get cell` should already
   work — subject to R8's fixture reach. AC7 reads as "swapped with `put` /
   `get`".
   ⚠ This makes it a **kernel** edit (the platform pack owns `put`), so it moves
   out of arcana and into build one's W2, where the kernel is already open.
2. **D6 — `SlotSpec.accepts` must name a kernel `Mixins` value.** A pack cannot
   invent one. The bay therefore accepts **`Mixins.Charged`** and
   `ManaCell.fitsSlot` narrows further. Anything else fails
   `validateSlotSpecs` at hydrate.
3. **D7 / D8 — the τ renomination collides with a standing rule.**
   `lib/quantity.ts` says in as many words that mana is a content word and never
   an engine surface, which is why `'pt'` exists; and `CasterMixin`'s pool is
   `'pt'` while `ChargedMixin`'s is `'kJ'`. Adding a literal `'τ'` `Unit` member
   would contradict that rule *and* leave three names for one quantity. **Plan
   (P1):** rename the **method/field surface** to τ and switch the reserve's
   unit from `'kJ'` to the existing `'pt'`. τ becomes the word in prose, help
   and docs — which is what "semantic, not numeric" actually asks for — and cell
   charge and caster mana become the **same denominator**, which the whole fare
   story needs.
4. **D8 vs `RechargeController` — one gate too many.** D8's ⚠ says feeding a
   terminal needs "no faculty, band or spell knowledge", while the shipped
   `recharge` verb additionally requires knowing the `transfer` working. The gate
   lives in the controller, not in `chargeFrom`, so both readings are reachable.
   **Plan (P9):** the ride's own BYO path calls `chargeFrom` directly (caster +
   conduit, **no** spell gate); `recharge <terminal>` stays available as the
   pre-loading route with its extra gate.

Two smaller corrections: `/system/tpa` is pack **36**, not 32; and D3's line
that the terminal is "`ManaPowered + FastTravel + Slotted(bay)`" omits `Charged`
and `Conduit`, both of which the composition needs (P7).

---

## Plan-level decisions

### P0 — Two builds, and the seam is the pack cut

Answered in full in § *One build or two*. Waves **W0–W4** are build one
(`build/tpa-pack`); **W5–W9** are build two (`build/mana-powered`). Everything
below is written as one continuous wave sequence because the second build's
plan is only trustworthy against the first build's *landed code*, exactly as
the farming build's B0 learned.

### P1 — τ is a rename of the surface, not a new `Unit`

In `lib/magic/Charged.ts` + `lib/magic/Charge.ts`:

| was | is |
|---|---|
| `Charge.UNIT = 'kJ'` | `Charge.UNIT = 'pt'` (the shipped neutral reserve unit) |
| `capacityKJ` (persistent, authorable) | `capacityTau` |
| `getStoredKJ()` / `getCapacityKJ()` / `setCapacityKJ()` | `getStoredTau()` / `getCapacityTau()` / `setCapacityTau()` |
| `spendCharge(kJ)` / `receiveCharge(kJ)` | `spendCharge(tau)` / `receiveCharge(tau)` |
| `CHARGE_DEFAULTS.CAPACITY_KJ` | `CHARGE_DEFAULTS.CAPACITY_TAU` |
| `Charge.standbyDraw(watts, …)` | unchanged — watts is real power, and 1 τ ≡ 1 kJ makes the arithmetic identical |

`magic.charge.kJPerCostPt` keeps its key (an operator may have set it) but its
comment says it is now the identity and vestigial; the *code* stops naming kJ.
Four content rows change key name. `transferChargeImpl`'s report string says
"τ". **No number changes anywhere** — that is the assertion W1 proves, by
running the four charge suites unmodified except for the renamed calls.

### P2 — `/system/tpa` is a *relocation* pack, and W2 changes no behaviour

The pack cut is mechanical and must be provably behaviour-neutral, because
everything after it stands on it. W2 ships **only** moves, plus the three
deletions the moves force. New design does not enter until the terminal is
already outside the kernel — and it *cannot*, because **a kernel class may not
compose a pack's mixin**, the structural fact that puts the migration first.

Pack shape (the `water` pack is the exemplar, being the other `/system/<x>`
capability pack):

```
packages/content/tpa/
  pack.yaml          id: tpa   root: /system/tpa
                     requires.groups: [{name: tpa, owner: {office: prime-minister}}]
                     requires.title: [{extent: /system/tpa, holder: {group: tpa}}]
  package.json       @saxonberg/content-tpa; deps: server, types, content-platform
  tsconfig.json / vitest.config.ts     (copied from water verbatim)
  src/lib/FastTravel.ts                FastTravelMixin + FAST_TRAVEL_MIXIN (P2a)
  src/thing/TpaTerminal.ts             the concrete terminal
  src/thing/TravelCard.ts
  src/idea/cmd/movement/TeleportController.ts
  src/idea/cmd/movement/RegisterController.ts
  src/idea/cmd/tpa/ProcureCardController.ts
  src/__tests__/                       the moved fasttravel + tpa suites
  content/system/tpa/cmd/movement/{teleport,register}.yaml
  content/system/tpa/cmd/tpa/procure-card.yaml
  content/system/tpa/idea/cmd/movement/{Teleport,Register}Controller.yaml
  content/system/tpa/thing/travel-card.yaml
  content/settings/fasttravel.yaml     the three fasttravel.* keys, moved
```

The seven terminal rows keep their `/world/**` paths (terminals belong to their
localities) and change `class:` to `/system/tpa/thing/TpaTerminal`. The four
owning packs — `terminus`, `hinkley-hills`, `newbie-wilds`, `saxonberg-lounge` —
each gain `@saxonberg/content-tpa` in `dependencies`, or the installer's
`requires-kernel` rung check fails rule 2 naming both packs.

**Verb category:** `teleport` and `register` land in **`movement`**, not
`author`. `teleport` is a verb every player types; its current home under
`cmd/author/` is a leftover from when it was `goto`'s privileged sibling.

### P2a — A pack's substrate lives in `src/lib/`, and invariant 8 is amended

⚠⚠ **The current taxonomy makes a pack-specific mixin unrepresentable**, and
this build needs two of them. `lint:instanceable` invariant 8 bans `src/lib/`
outright — *"substrate a pack needs is the kernel's, or a class under a
branch"* — so a pack mixin must either go to the kernel (wrong for
`FastTravelMixin`, which this build is *removing* from the kernel) or sit in a
branch folder (wrong by construction: `thing/` means an instanceable Thing, and
a mixin is not instanceable).

The tree already carries the bug. **`packages/content/trade-mining/src/location/Working.ts`**
is a real `export function WorkingMixin` with a `_mixinName`, parked in the
**Location branch folder** because invariant 8 left it nowhere else. An earlier
revision of this plan repeated that mistake twice.

**Decided (user, 2026-09-02): invariant 8 is amended from "no `lib/`" to
"`lib/` holds only inherited substrate."** The kernel's own rule, applied to
packs — mixins and value objects, nothing else. **Still forbidden in a pack:**
an Api, a logic singleton, free helper functions. Those still mean a kernel MR.

⭐ **The headline invariant is untouched.** "Nothing instances `/lib/`" is
enforced as `path.startsWith('/lib/')` against *template paths*, and a pack
mixin has no template row at all. `/system/arcana/lib/ManaPowered` does not
start with `/lib/`; `classFileOf` resolves it by longest prefix like any other
pack path. Invariants 1 and 2 never fire.

**Where a given mixin belongs then has a testable answer:**

> ⭐⭐ **Substrate goes to the kernel when its composers have no common pack
> ancestor.**

| mixin | composed by | home |
|---|---|---|
| the fast-travel node | tpa only | `/system/tpa/lib/` |
| `ManaPoweredMixin` | arcana's lamp **and** tpa's terminal | `/system/arcana/lib/` — **tpa depends on arcana anyway** (it is magic), so that is an ordinary dependency edge, not a kernel case |

A third pack wanting mana-powered devices *without* depending on arcana is the
signal to promote it — a review question, not a lint.

⚠ **`src/mixin/` was considered and rejected**: the kernel already ruled that
*"mixin is an implementation technique, not a subsystem"* and banned
`lib/mixins/`. A second name for the same concept repeats a decided mistake.

Placement inside a pack's `lib/` follows the kernel's shape — **flat by
default**, a `lib/<subsystem>/` subdirectory only where 3+ cohesive files land
together.

### P3 — The computed cost is a closed `costModel` on the spell row

`SpellDescriptor` gains one optional field:

```ts
/** How the cost is arrived at. Absent ⇒ the flat authored `cost`. */
export type SpellCostModel = { readonly kind: 'potential' };   // mgh, and nothing else
costModel?: SpellCostModel;
```

Closed, validated on catalogue warm exactly as `MagicEffects.validate` validates
`effects` — a second model is a design conversation, not a list edit (the
`SupplyState` rule, one level over). `Spell.ts` gains
`public costModel: Record<string, unknown> = {}` with `fieldMeta`.

`MagicLogic` grows **one** module-private function, and `resolveCastImpl`'s
inline expression becomes a call to it:

```ts
async function costOf(
  caster: Stuff, spell: SpellDescriptor, target?: Stuff,
): Promise<number> {
  const flat = spell.cost || dial(AppSettingKeys.magicCostDefault, 15);
  if (spell.costModel?.kind !== 'potential') return flat;
  return flat + (await relocationCostImpl({ traveller: caster, to: target ?? caster }));
}
```

⭐ **The flat case gets simpler, not more complex.** The flat arm is
byte-for-byte the expression that was inline; a spell with no `costModel` cannot
reach the second line. The fade multiplier still applies on the outside, so a
hazy teleport costs more for the same reason a hazy firebolt does.

The authored `cost:` on the teleport row stops being "the price" and becomes
**the floor — the survey component**, which is exactly what the fiction says is
expensive. `costModel` adds the `mgh` on top. That also makes the **item door**
honest with no extra work: `MagicLogic:648`/`:708` route through `costOf` too,
and a wand of teleport with no resolvable destination gets the floor rather than
zero or infinity.

`PrepareOutcome` gains `costTau?: number` so the cast front door can preview it
and the departures board can quote it without casting.

### P4 — `MagicApi.relocationCost(spec)` — a request object, so the census stays clean

The `mgh` arithmetic is the kernel's (D3's table) and three separate packs need
to ask for it. It is a **subjectless physics service** folding two zones and one
body, belonging to no single object — mandate (a). Signature deliberately takes
a request object:

```ts
// api/magic.ts
export interface RelocationSpec {
  /** Whose mass moves — self only; the caster is always one endpoint. */
  readonly traveller: Stuff;
  /** Where from; defaults to the traveller's current scene. */
  readonly from?: Stuff | null;
  /** Where to. */
  readonly to: Stuff;
}
public static async relocationCost(spec: RelocationSpec): Promise<number>;  // τ
```

⭐ **Why the request object and not `(traveller, to)`.** `MagicApi` *is* on
`EXEMPT_APIS`, so a subject-first static would pass the gate — and leaning on an
exemption to add new surface is precisely the drift the gate exists to stop.
`RelocationSpec` ends in `Spec`, so `NON_SUBJECT_SUFFIX` clears it **honestly**,
and it matches the blessed `CraftingApi` request shape. No exemption list is
touched.

`MagicLogic.relocationCostImpl`:

```
h₁ = await ZoneApi.elevationFor(sceneOf(from ?? traveller))
h₂ = await ZoneApi.elevationFor(sceneOf(to))
Δh = (h₁ === null || h₂ === null) ? 0 : h₂ − h₁          // unzoned ⇒ level, documented
m  = traveller.getMass() + (isLoadBearing ? getBorneBurden() : 0)   // kg
τ  = max(0, m · g · Δh) / 1000                            // J → kJ ≡ τ; g from the shipped dial
```

Downhill is **free, never a refund** — the `max(0, …)`. Distance appears nowhere
in the expression, which is what makes AC3 assertable *by reading the function*,
not just by a test.

### P5 — The ride is not a cast; the two paths share the cost function, not the pipeline

This is the crux, and it is what D8's ⚠ decides: *"Powering a terminal is not
casting. The terminal is the caster; the traveller supplies fuel."*

| path | pipeline | who is gated | who pays τ |
|---|---|---|---|
| **`cast teleport <target>`** (arcana's `CastController`, `reachable` scope) | full cast: band gate both axes · `CastActivity` · `resolveCast` | the caster | the caster's pool |
| **`teleport <mql>`** off-network (tpa's `TeleportController`, anchored scope) | the same full cast, driven from the tpa controller | the caster | the caster's pool |
| **`teleport <keyword>`** on-network | **no cast pipeline at all** | nobody — no faculty, no band, no spell knowledge | the terminal's reservoir |

⭐⭐ The TPA ride issues **no** `prepareCast`/`resolveCast`. It quotes
`MagicApi.relocationCost`, draws that many τ off the terminal, settles the
money, and moves the traveller with `Mobile.teleport`. That is the whole of
D10's *"the TPA is a utility selling a capability its customers do not have"*
expressed structurally: if the ride went through the cast pipeline it would
inherit the band gate, and the network's entire customer base would be locked
out of it.

The two front doors are deliberate and complementary: **`cast teleport` is
see-it-and-go** (the ordinary `reachable` scope — a short hop across a room you
are looking at); **`teleport` is the anchored front door** (P11's three anchors
— the long hop to somewhere you are not). One spell row, one cost function, two
grammars.

### P5a — The name stays `FastTravel`

**Decided (user, 2026-09-02).** `SurveyedMixin` / `TeleportNodeMixin` were
considered and declined. *"Everyone knows what fast travel is"* — and the
stronger reason is that **the house convention for mixin names is mechanical,
not diegetic**: `ContainerMixin`, `SlottedMixin`, `PostureMixin` are none of
them words in the fiction. Renaming for diegetic honesty would have pushed
*against* the convention while appearing to tidy it. `TravelNetwork` was noted
as the more honest alternative if it is ever revisited.

### P6 — `LoungeTerminal` is collapsed, not moved

`FastTravelMixin` gains one authored field, `boardLabel: string | null`
(persistent + authorable), and `getDestinationLabel()` returns it when set
before falling back to the covering-Locality walk. The lounge row authors
`boardLabel: The Lounge`, and `world/lounge/thing/LoungeTerminal.ts` is
**deleted**.

Its `getArrivalRoom()` override is expected to be redundant already — the row's
`seatIn: /world/lounge/idea/warren` makes `FixtureMixin.seatSelf` place the
terminal *inside* the live Warren host, so the generic `getContainer()` returns
the same object, and the fixture re-seats on host migration. ⚠ **W2 proves this
with a test before deleting the override**, not after: if `getContainer()` ever
returns the warren *idea* rather than its host, the fallback is a two-line
`arrivalWarren` field on the mixin resolving through
`ContainmentApi.resolveLanding`, the same machinery `seatIn` already uses.

This is the only thing standing between `TpaTerminal` and the pack, and it is a
genuine simplification: the subclass existed to carry one string.

### P7 — The terminal's composition, in order, and why each layer is there

```ts
const TpaTerminalBase =
  DisplayMixin(                    // the departures board is a screen
    PersistableMixin(              // P10: the reservoir + the bay occupant survive restart
      SingletonMixin(
        PostRegistrationMixin(
          FixtureMixin(
            DetailedMixin(
              FastTravelMixin(     // the node: routes, board, timetable
                ManaPoweredMixin(  // canDraw / draw / supplyState / drawMode
                  SlottedMixin(    // the battery bay
                    ChargedMixin(  // the impulse device's stored charge
                      ReservedMixin(
                        ConduitMixin(Thing))))))))))));  // the brass pillar IS the coupling
```

Read bottom-up, every layer is forced:

- **`ConduitMixin` at the bottom** is the single most load-bearing find in this
  exploration. `MagicLogic.bestConduitFor(actor)` scans the actor's
  **environment contents** for a `ConduitMixin`, and refuses the transfer
  without one — *"bare hands are a poor road for that much energy."* A terminal
  that composes it **is its own coupling**, so a traveller standing at it can
  pour their pool in with no rod, no bench, and **zero kernel change**. It is
  also true in the fiction and already written down: the terminal is a brass
  pillar, and brass conducts.
- **`ChargedMixin`** because Kell says an impulse device *"draws per use and
  runs off a stored charge"* — the reservoir **is** the impulse shape, not an
  implementation convenience. It is also what makes `dry` mean something, what
  `chargeFrom` needs a shell for, and what makes the three supply sources three
  ways of filling **one** thing rather than three parallel draw paths.
- **`SlottedMixin`** for the bay; **`ManaPoweredMixin`** for the draw surface
  and `drawMode`; the rest is the shipped terminal.

⚠ **One wrinkle to handle, not discover.** `ChargedMixin.commandContributions`
affords `zap` **and** `recharge` on the `peers`/`environment` buckets.
`recharge` on a terminal is exactly right (P9). `zap` is not. Fix: `TpaTerminal`
overrides the static to drop `zap` — W6 must confirm the contribution collector
reads the **most-derived** static, and if it unions the chain instead,
`zap.yaml`'s target grows `requires: [ArcaneMixin]` (a spell-bound shell), the
honest gate anyway.

### P8 — `ManaPoweredMixin` / cell / main: placement and source resolution

A pack mixin lives in the pack's **`src/lib/`** (P2a) with an exported name
constant instead of a `Mixins` registry entry — the registry is kernel-only and
a pack cannot add to it. The naming/narrowing precedent is
`packages/content/trade-mining/src/location/Working.ts` (`WORKING_MIXIN` +
`MixinApi.isActive(x, WORKING_MIXIN)`); ⚠ its *placement* is the pre-existing
violation P2a fixes, and W0 moves it to `trade-mining/src/lib/Working.ts` in
passing.

**`packages/content/arcana/src/lib/ManaPowered.ts`** → `/system/arcana/lib/ManaPowered` (P2a — it is a mixin, so it is substrate, not a `thing/`)

```ts
export const MANA_POWERED_MIXIN = 'ManaPoweredMixin';
export type DrawMode = 'impulse' | 'binding';

/** The structural shape a supply answers — never a class, never an import. */
export interface ManaSupply {
  label(): string;
  availableTau(): number;
  /** Move up to `tau` into `into`; returns what actually arrived. */
  feed(into: Stuff, tau: number): Promise<number>;
  supplyState(): SupplyState | null;     // SYNC — see below
}

export interface ManaPowered {
  getDrawMode(): DrawMode;
  setDrawMode(v: DrawMode): void;
  /** Can this device spend `tau` right now, topping up first if it must? */
  canDraw(tau: number): Promise<boolean>;
  /** All-or-nothing, the shipped `spendCharge` contract. */
  draw(tau: number): Promise<boolean>;
  /** SYNC, precedence-ordered, `null` when working — what `getStatus()` reads. */
  supplyState(): SupplyState | null;
  /** Which of the three answered — for the FARE, never for the draw. */
  getSupplyMode(): 'cell' | 'main' | 'contact' | 'none';
}
```

`ManaPoweredMixin<TBase extends MixinConstructor<Stuff & Slotted & Charged>>` —
the base constraint is the `ChargedMixin requires ReservedMixin` precedent,
stated in the docstring and enforced by the type.

**Source resolution happens exactly once, in `resolveSupply()`**, and every
other method calls it — that is how AC8's *"the device holds no branch on which
answered"* is satisfied honestly. Ordered:

1. the `battery` slot's occupant, if it composes `ChargedMixin`;
2. the linked `ManaMain`, if `mainsRef` resolves and the main is neither `cut`
   nor `off`;
3. a person in contact — resolved only when a draw is short and only when an
   actor is present.

`draw(tau)`: reconcile → if the reservoir already covers `tau`,
`spendCharge(tau)` and return; else `resolveSupply()?.feed(this, deficit)` →
re-check → `spendCharge` or refuse. The condition surfaces as **one of the six
words**, ordered by `SUPPLY_STATE_PRECEDENCE` and glossed with
`SUPPLY_STATE_GLOSS` — **the vocabulary is imported and never extended.**

⭐ **`supplyState()` is sync, and that is load-bearing.**
`FastTravelMixin.getStatus()` is synchronous and is read from
`getPresentationMml` on **every room listing**; an async condition read would
ripple into the render path. Every mana read *is* synchronous (`getStoredTau`,
`reconcileCharge`), so nothing forces a promise here — water's `supplyReport`
is async only because it walks a river graph.

⚠ **And the mixin deliberately does not implement `SupplyReporting`.** Doing so
would make `analyze water <terminal>` work by accident, and no consumer wants
it: the light carries the condition, the long description carries it in words,
and the board carries the price. A method whose only consumer is a verb this
build is not adding is dead surface.

**`packages/content/arcana/src/thing/ManaCell.ts`** —
`SlottableMixin(ChargedMixin(ReservedMixin(DetailedMixin(Thing))))`,
implementing `ManaSupply` directly (`feed` = `this.spendCharge(n)` then
`into.receiveCharge(n)`), `fitsSlot(host, slot)` narrowing to
`slot === 'battery'`. **No new mixin** (D6). It is a `Circulating` good so
distribution and the general store can carry it, and it gets a recipe — where a
charged cell *comes from* is deliberately a recipe and a price, not an economy
(non-goal).

**`packages/content/arcana/src/thing/ManaMain.ts`** —
`FixtureMixin(ChargedMixin(ReservedMixin(DetailedMixin(Thing))))` with two
authored booleans, `severed` → `cut` and `closed` → `off`, and a reconcile that
**refills to capacity** unless either is set. ⭐ That is the honest minimum:
*the mains is abundant by construction*, and where the city's line mana comes
from is explicitly off-stage (non-goal). `ManaMain` names the relationship, not
the object, and no electrical noun appears anywhere near it.

**AC6's "two unrelated things."** The domestic device is a **wall lamp** in
arcana (`src/thing/ManaLamp.ts` — `ManaPowered + Slotted + Charged`,
`drawMode: 'impulse'`, one cell, `switch` from the shipped device category)
placed in a residence room. It is the *whole* point of D5's third row — *"a
resident is a sufficient battery"* — and it proves the abstraction is not a
terminal in disguise **one wave before the terminal composes it at all**.

### P9 — Three supplies, three acts, one draw

| supply | the act | mechanism | who can |
|---|---|---|---|
| **cell** | `insert cell into terminal` | P8's bay + the new device verb | anyone |
| **mains** | authored `mainsRef` | continuous top-up | n/a — the city's |
| **your pool** | `teleport <dest> --power self`, or `recharge <terminal>` first | `terminal.chargeFrom(traveller, τ)` | **casters only, structurally** |

⭐ **The BYO-mana path needs no new verb and no new mechanism.** `chargeFrom` is
shipped, already refuses `!isCaster` (AC12's negative half falls out with
nothing written), already runs through a coupling with real losses, and already
finds its conduit in the terminal itself (P7). `--power self` on the ride is the
explicit act with **no** spell-knowledge gate (D8: fuel is not casting);
`recharge <terminal>` remains the pre-loading route and keeps its `transfer`
gate. Both land in the same reservoir, so AC12 asserts the same outcome either
way.

### P9a — The arming floor, and the two draws (D8b)

`ManaPoweredMixin` gains one authored field and one derived read:

```ts
/** Below this, the working lapses — the device is not itself any more. */
armingFloorTau: number;            // persistent + authorable, default 0
isArmed(): boolean;                // storedTau >= armingFloorTau
```

and the standing draw is a **reconcile-on-read decay**, not a scheduled
tick — the shipped pattern everywhere else in this codebase (`GrowingMixin`,
`ThermalMixin`, `CultivableMixin`'s soil, `Charge.standbyDraw` which already
exists and takes watts). `Charge.standbyDraw` is therefore reused verbatim:
the terminal authors a small `standbyWatts`, and the existing arithmetic
turns absence into depletion with no new clock.

⭐ **`drawMode` keeps meaning what Kell says it means** — which supply shape
the device needs — and stays `impulse` on a terminal. The floor is a
*separate* fact about a device that also holds something. A wall lamp
authors `armingFloorTau: 0` and is purely impulse; a terminal authors a
real one and is both. Nothing about the field's meaning changes.

`supplyState()` resolves in precedence order, which is where the three
states come from:

```
!isArmed()                         → 'dry'      (dark; nobody rides)
storedTau < costOfThisRide         → 'overdrawn' (amber; BYO only)   ← ride-scoped
severed / closed on the main       → 'cut' / 'off'
otherwise                          → null
```

⚠ **The ride-scoped arm cannot be reached from `getStatus()`**, which knows
no destination. So the split is structural: `supplyState()` (no argument)
answers the **stock** question for the light, and a second read
`stateForDraw(tau)` answers the **transaction** question for the ride.
Trying to fold them is how the light ends up lying.

The light gains **amber** as a fourth colour in `statusColor()` — the
existing method already maps `getStatus()` to grey/blue/red/purple, so this
is one branch, and the long description keeps carrying the same fact in
words (the non-colour-alone channel the terminal already honours).

### P9b — Power selection is the shipped three-tier chain (D8c)

Do **not** hand-roll `resolveSetting(actor, 'tpa.power') ?? 'terminal'` —
that is the exact antipattern CLAUDE.md's table names against
`LocomotionApi.defaultModeFor`. The pack's `TeleportController` gets a
private resolver of the same shape:

```
flag (--channel | --meter)  →  actor setting `tpa.power`  →  'terminal'
```

`tpa.power` is an `EnvironmentMixin` settings key (`shell-environment.md`),
authored in the pack's settings row with the seeded literal `terminal`.

⚠ **The board must show which way this viewer's ride goes** (D8c's trap).
`renderDepartures` is already **viewer-aware** — it reads the viewer's
credential to annotate "not yet registered" — so the power line rides the
same per-viewer payload with no new plumbing. A sticky preference that is
invisible at the moment it applies is the footgun; visible, it is a
convenience.

### P10 — The reservoir persists on the shipped spine; no collection is added

`TpaTerminal` composes `PersistableMixin` (singleton, keyed on `templatePath`).
`PersistableLogic` already captures a `SlottedSlice` and per-mixin field slices,
so **the reservoir level and the cell sitting in the bay both round-trip through
`holder_snapshots`** — an existing collection. `lint:schema` stays at 48. The
`ManaMain`'s level needs nothing (it refills). The `ManaCell` in a player's
pocket persists as ordinary carried inventory.

### P11 — The anchored resolver is a private method on `TeleportController`

D10's three anchors, resolved in order, first hit wins, **never `world:`**:

```ts
private async resolveAnchored(
  giver: Stuff & CommandGiver, raw: string,
): Promise<{ stuff: Stuff | null; ambiguous: boolean; anchor: Anchor | null }>
```

1. **held extents** — `await AccessApi.heldExtents(giver)` → one `<extent>/**`
   path-glob seed per extent, each fed to
   `MqlApi.resolveOne(raw, {commandGiver, scope})`. This is exactly what
   `CommandLogic`'s `tries` loop does with a view's static `scope:` list; the
   only difference is that the list is computed per actor, which a static YAML
   `scope:` cannot express — hence controller-side.
2. **registered nodes** — the credential's `getRegistered()` set is a **small
   enumerated list of template paths**; match the keyword against each live
   node's keywords with `StuffApi.findByTemplatePath`. No MQL, no scan.
3. **current scope** — `here`, then `peers`, then `reachable`.

Ambiguity is resolved with `resolveMany` and `> 1` refuses as a **failed
specification** — *"you cannot hold the place clearly enough to arrive in it"* —
never as a disambiguation prompt (D10). The view sets `onExcess: 'error'` so no
other path can silently pick a winner.

**AC17 is asserted against the resolver, not inferred:** a test spies on
`MqlApi.resolveOne`/`resolveMany` and asserts no call's `scope` is `'world'` and
no `raw` begins `world:`, across all three anchors and the miss case.
`lint:world-scan` covers the `getAllObjects` half separately.

### P12 — Free movement re-grounds on what `heldExtents` already means

D11 needs **almost no code**: `heldExtents` admits on `ParcelRecord.getOwner()`
and is structurally blind to `grants[]`, so a use-grant holder is already
excluded (AC20). What changes is (a) the **fork order** — today `execute()` asks
`canSelfTeleport` *before* deciding, which is what lets a holder self-power past
the TPA path and hide the board (the AC15 defect); (b) the **framing** — the
docstring and the refusal prose now say *authorial authority*, and access.md
gains the reasoning (guards constrain good faith only). New order:

```
--target present            → authorial relocation (unchanged, access-gated)  [moves to `goto`, P13]
both endpoints in one held extent → free, no mana, no registration            [D11]
at a node, keyword given    → the TPA ride                                    [D8]
at a node, nothing given    → the departures board — for EVERYONE             [D9/AC15]
otherwise, destination given→ the anchored spell                              [D10]
```

The board move is one line — render whenever no keyword was typed, before any
clearance read — and it closes the "nobody sees the board" defect for both
audiences at once.

### P13 — `--target` goes to `goto`; `teleport` becomes purely diegetic

The authorial object-relocation path "stays exactly as authorial tooling"
(non-goal), and authorial tooling must not evaporate when a content pack is
absent. So the `--target` / `--force` options and
`TeleportController.selfPoweredTeleport`'s relocation body move onto the
kernel's **`goto`** (`platform/idea/cmd/author/GotoController.ts` +
`platform/cmd/author/goto.yaml`), which already lives in the author category and
already does the focus-resolution walk. `TeleportController._resolveDestinationContainer`
and `callTeleportHook` move with it.

⭐ This is a strictly better shape independent of the pack cut: `teleport` stops
being a verb that means two unrelated things depending on who typed it, and the
author verb stops being spelled like the player verb.

### P14 — The fare split, and the rate derived from the supply mode

`TeleportController.settleFare` keeps its entire shipped body — the three-way
split, the un-spoofable fixture-keyed operator resolution, the network fee,
tender-agnostic settlement — **untouched** (D8a: "the existing money model is
untouched"). One term is added *before* it:

```
manaCharge = drawnFromTerminal ? ceil(costTau × terminal.manaRatePerTau()) : 0
total      = fee + surcharge + manaCharge
```

and `manaCharge` becomes a fourth split leg, category `mana`, payable to the
**departure** operator (the terminal's operator bought the mana; it resells at
its cost basis). `manaRatePerTau()` is on the terminal and **derives from
`getSupplyMode()`**:

| mode | AppSetting | seeded literal |
|---|---|---|
| `main` | `tpa.manaRate.mains` | `1` |
| `cell` | `tpa.manaRate.cell` | `6` |
| `contact` / `none` | — | `0` (you brought it) |

Two keys, seeded at the call site so the kernel is right with the pack absent —
though in truth this call site is *in* the pack, the stronger version of the
same rule. AC13 is then a two-terminal test with identical routes and different
supplies, asserting **different quotes for the same ride**, which is D8a's whole
claim.

`register` costs nothing and gains no settlement path — AC14 is asserted by
there being no `settle` call reachable from `RegisterController`.

### P15 — The Authority: one row, two faces, zero kernel change

**Rewritten 2026-09-02** — see the requirements' D1 correction. The Authority
is a **self-regulating institution**, so `PositionData.appointedBy`,
`mayAppointTo`, `GovernmentSeat.appointsTo` and the derived-board design are
all **deleted from this plan**. None of them is needed.

The row **ships in `packages/content/tpa/content/system/tpa/idea/teleport-authority.yaml`**
— inside the pack, with everything else — and the only edit it needs is its
appointing authority:

```yaml
class: /platform/idea/Business
data:
  # It governs itself: the committee over its OWN extent, which the pack's
  # manifest already claims for the `tpa` group. Names no realm.
  appointingAuthority: { kind: committee, parcel: /system/tpa }
  positions: []
  operatingLocations: []      # the per-terminal fare operators claim the fixtures
  banksAt: goodkin            # the TPA is not the state; it banks commercially
```

⚠ The shipped row's `{kind: committee, parcel: /world/terminus/terminal}` is
the **one realm reference**, and removing it is the whole of this decision:
Terminus stops governing the network.

⭐ **Seats fill exactly as every other pack's do — nothing to build.** The
chain is the standard capability-pack one: `{kind: committee, parcel:
/system/tpa}` → the committee over that parcel → the `tpa` group the
manifest's title claim gives it → `owner: {office: prime-minister}` (the same
declaration `water` and `arcana` make) → **the founder by Art. XI's
pool-of-one**, with the PM operator override on top. `Authority.ts` says the
quiet part outright: only `office` and `committee` carry that default, so
*"an authority the founder cannot satisfy is one nobody can satisfy on a cold
box"* — which is why `committee` was already the right kind here and a group
would have been wrong.

**And there is nothing to fill yet.** The Authority ships `positions: []` — a
self-regulating institution with no staff, the network fee funding maintenance
that is deferred. ⭐⭐ The **first** position is the one D8b's arming floor
creates: a terminal drains with zero traffic, so somebody swaps frontier cells
on a schedule, and that somebody is a **TPA employee appointed by the TPA's own
committee**. It gives `docs/vocations.md`'s *water / sewer worker*-shaped gap
an employer that is neither a locality nor a corpo — the first seat arriving
with a reason rather than as scaffolding. Out of scope here; recorded so the
build does not invent a staffing model it does not need.

⚠ **Reseed hazard, unchanged:** `fasttravel.tpaBusinessPath` is a
`settings`-kind row and that kind is **merge-missing**, so an existing world
keeps pointing at the old path until the key is edited by hand. W2 records it
in the pack README and the doc; a fresh DB is correct automatically.

### P15a — ⛔ SUPERSEDED: "the Authority is realm content"

This decision argued the Authority had to be realm content because its board
positions named this realm's governments. **That premise was the plan's own
invention** (D1's member-government board), and with it removed the argument
collapses: a self-regulating institution names nobody, so it ships in the pack.
Recorded rather than deleted because the *reasoning* still holds for anything
that genuinely does name a realm — a row whose content references specific
localities cannot live in a mechanism pack.

✅ **The naming question is CLOSED (user, 2026-09-02): "tpa is and always will
be the name."** The root stays `/system/tpa` and the pack id stays `tpa`;
where the full form reads better, it is spelled `teleport-authority`. In
practice the two never collide, because the mechanism and the institution are
spelled differently anyway — `/system/tpa/thing/TpaTerminal` is the mechanism,
`/system/tpa/idea/teleport-authority` is the institution.

### P16 — What each new surface gets: a test or a lint

| surface | proof |
|---|---|
| τ rename | the four shipped charge suites, unmodified except for renamed calls — **the numbers are the assertion** |
| the pack cut | the moved suites green in the pack's own vitest; `grep -rn 'fasttravel\|FastTravel' packages/server/src/mud/lib` empty (AC22/23 as a grep, not a vibe) |
| `costOf` flat arm | a pinned test that `dispel` costs exactly 20 before and after |
| `relocationCost` | unit tests: distance-free (AC3), altitude (AC4), mass (AC4), null-elevation ⇒ level, downhill ⇒ floor |
| self-only | AC5 — `cast teleport at <someone else>` refuses; `goto --target` unaffected |
| the anchored resolver | AC17 — a spy on `MqlApi`, asserting no `world` scope across all four branches |
| `SlotSpec.accepts` | already a **hydrate-time throw** — `validateSlotSpecs` is the lint |
| the six words | already a **type** — `SupplyState` is a closed union; a seventh does not compile |
| `commandContributions` as a static | W5's verb test asserts the affordance appears |
| `/system/tpa` holds nothing general | AC24 — **a review item stated in the pack README**, not a script: a one-paragraph inventory, each class and the one sentence saying why a front door would not want it |

---

## Waves

### Build one — `build/tpa-pack`

#### W0 — The pack skeleton (provable: *the rung accepts a new `/system/` pack*)

`packages/content/tpa/` with `pack.yaml`, `package.json`, `tsconfig.json`,
`vitest.config.ts` copied from `water`; the group + title claim; `pnpm install`;
add to the deployment manifest and any `SAXONBERG_PACKS` docs. **No source, no
rows.**

**Plus P2a's doctrine change, which must land here so the lint and the docs
never disagree with W2's move:** amend invariant 8 in
`packages/server/scripts/check-instanceable-placement.ts` (`lib/` permitted,
holding only inherited substrate; Api / logic singleton / free helper still
refused), update CLAUDE.md's pack module-category line and the *Instanceable
lives in `platform/<branch>/`* section, and **move
`trade-mining/src/location/Working.ts` → `trade-mining/src/lib/Working.ts`** —
the pre-existing violation, fixed while the rule is being written rather than
left as a counter-example.

Prove: `lint:instanceable` green with a `src/lib/` present and still red on a
planted `src/api/`; `pnpm lint:untitled` sees `/system/tpa` as a title root;
`pack status tpa` prints `data`; a fresh-DB boot installs it empty;
`pack-roots.ts` does not yet list it (no `src/`).

*Still broken if you stopped here:* everything. This wave exists so W2's move
lands in a home the toolchain already accepts.

#### W1 — τ (D7, AC25) (provable: *the surface is mana and no number moved*)

P1's rename across `lib/magic/Charge.ts`, `lib/magic/Charged.ts`, `MagicLogic`
(the two item-door sites + the transfer report), the four `arcane-library` rows,
and `magic-items.md`. Prove: `Charge.test.ts`, `Charged.wear.test.ts`,
`Conduit.test.ts`, `items.test.ts` green with **no expected value edited**;
`lint:field-meta` green on the renamed authorable field.

*Still broken:* nothing new works; this is pure hygiene done while the file is
quiet.

#### W2 — The migration (D3, D12, D2, AC22/23/28) (provable: *the kernel knows nothing about teleportation*)

The single biggest mechanical wave. In order:

1. `boardLabel` on `FastTravelMixin`; the lounge row authors it; **prove
   `getArrivalRoom()` equivalence with a test** (P6); delete
   `world/lounge/thing/LoungeTerminal.ts` and repoint the row.
2. Move `lib/fasttravel/FastTravel.ts` →
   `packages/content/tpa/src/thing/FastTravel.ts`, exporting
   `FAST_TRAVEL_MIXIN = 'FastTravelMixin'`; every `MixinApi.isFastTravel(x)`
   becomes `MixinApi.isActive(x, FAST_TRAVEL_MIXIN)` (the `WORKING_MIXIN`
   precedent).
3. Move `world/common/tpa/{TpaTerminal,TravelCard,paths}.ts` into the pack.
   Repoint the seven terminal rows' `class:` and the travel-card row; add
   `@saxonberg/content-tpa` to the four owning packs' `dependencies`.
4. Move `TeleportController` / `RegisterController` / `ProcureCardController`
   and their views; `teleport` and `register` land in the **`movement`**
   category (P2); apply **P13** (`--target`/`--force` to `goto`) and **P12**'s
   fork reorder + the board fix.
5. **Delete** `Mixins.FastTravel`, `MixinApi.isFastTravel`,
   `lib/command/validators/mustBeAtFastTravelNode.ts`,
   `lib/command/validators/requiresTravelCredential.ts` — the controllers
   already re-check both, redundantly, today.
6. **D12:** `BORN_WITH_TRAVEL_NODES` → an AppSetting `tpa.bornWithNodes`
   (comma-separated paths), read at `TravelCredential` mint/hydrate with the
   seeded literal `''` (so a kernel with no pack has an empty floor and is
   *correct*). The three paths are authored in **`world-seed`** — which of the
   realm's stops are universally reachable is a realm decision, not a mechanism
   decision. `lib/credential/Credential.ts` and its three tests lose the
   constant.
7. ⭐ **Extend `put` to slots** (flag 1) — `SlottedMixin` on the target's
   `requires`, an occupy branch in `PutController` that runs `canOccupy` and
   refuses with the slot's own reason. Kernel + platform pack, and it closes a
   substrate hole rather than serving this build: **no verb could insert into a
   non-body slot before.** `get` needs nothing.
8. Move the `fasttravel.*` settings **rows** to the pack. ⓘ The three
   `AppSettingKeys` **constants** stay in the kernel — that is the house
   pattern, not residue: the water pack's own dials (`waterFreezeK`,
   `waterPumpEfficiency`, `waterFouledAt`) live there too and the pack
   imports them. A key *name* is a shared vocabulary so a typo fails; the
   *values* stay authored in the pack.
9. ⭐ **The Authority moves into the pack and stops being Terminus's** (P15,
   AC21). `terminus/content/world/terminus/terminal/idea/tpa.yaml` →
   `tpa/content/system/tpa/idea/teleport-authority.yaml`, with
   `appointingAuthority` repointed from `{kind: committee, parcel:
   /world/terminus/terminal}` to `{kind: committee, parcel: /system/tpa}`.
   Prove it negatively as well as positively: **no Terminus office or
   committee can appoint to it.** ⚠ Record the `fasttravel.tpaBusinessPath`
   merge-missing reseed hazard in the pack README and the doc.
10. ⭐ **Delete the kernel's one piece of TPA knowledge instead of moving
   it.** `BankingLogic.restampCustodiansImpl` reads
   `fasttravel.tpaBusinessPath` solely to *"re-own the **legacy** raw `tpa`
   accumulator"* — the function's own comments call it legacy migration
   three times. **No migrations ever** (no users, no data): delete the
   `tpa` re-own branch and the `AppSettingKeys.fasttravelTpaBusinessPath`
   read with it, and the kernel stops knowing the Teleport Authority
   exists. The constant then has **no kernel consumer** and moves to the
   pack as a plain string.
   ⚠ Scope this precisely: the *`tpa` re-own* and the `bankPath`→`bank`
   fill are self-described migration; the treasury→CB assignment and the
   default-custodian fallback in the same function may be live behaviour.
   Read before cutting, and leave anything that is not migration to
   banking's own sweep.
11. Move the two fasttravel suites and the tpa controller suites into
   `packages/content/tpa/src/__tests__/`.
12. **D2:** every "Eternal City" in prose and docs.

Prove: `grep -rn 'FastTravel\|fasttravel\|TpaTerminal\|TravelCard'
packages/server/src/mud/lib packages/server/src/mud/world` returns nothing;
`grep -rn '/world/.*terminal' packages/server/src/mud/lib` returns nothing
(AC22); every ride, register, fare split and board still behaves exactly as
before (the moved suites are the regression net); `SAXONBERG_PACKS=platform`
boots a world with no teleport verb and no errors.

*Still broken:* the board fix and the fork reorder land here, so AC15 passes —
but there is no spell, no mana, no cost, and the fare is unchanged.

#### W3 — The computed cost + the spell (AC1–AC5) (provable: *teleportation is a spell whose price is physics*)

P3's `costModel` + `costOf` + the catalogue validation; P4's
`MagicApi.relocationCost` + `RelocationSpec`; the new
`RelocateEffect { kind: 'relocate' }` member of the closed `Effect` union, whose
executor **always lands on `ctx.actor`, never `landsOn`** — which is where AC5
is enforced structurally rather than by a check; `PrepareOutcome.costTau`; the
`teleport` spell row in **arcane-library**
(`content/stuff/idea/magic/Spell/teleport.yaml` — `verb: control`,
`noun: body`, `costModel: {kind: potential}`, a real `requiredBand`,
`targeting: any`).

Prove: dispel still costs 20; two rides of different length at equal altitude
and mass cost the same, asserted on the function; higher costs more; loaded
costs more; a third party is refused while `goto --target` is untouched.

*Still broken:* nobody can reach the spell from a terminal, and off-network
targeting is still the shipped `reachable` scope.

#### W4 — Ad-hoc teleport, anchoring, free movement (D10, D11, AC16–20) (provable: *you can go somewhere nobody surveyed, if you can specify it*)

P11's `resolveAnchored` on the pack's `TeleportController`; `onExcess: 'error'`
on the view's destination arg; the failed-specification refusal prose; P12's
framing and refusals; access.md's re-grounding note.

Prove: AC16 (ambiguity refused as failed specification, transcript-asserted);
AC17 (the resolver spy); AC18 (own mana charged, short pool refuses); AC19 (free
inside a held extent, no registration); AC20 (a lease-holder is denied — which
`heldExtents` already gives us, so the test is a *pin* on existing behaviour,
and that is worth saying in the test's comment).

**→ Build one ships here.** MR, review, merge.

---

### Build two — `build/mana-powered`

#### W5 — arcana: the device category (D4–D6, AC6/7/8/10) (provable: *a lamp and a cell are a category, not a terminal*)

P8's three files + `ManaLamp`; the `ManaCell` recipe +
store line + `Circulating` census key; the lamp placed in a residence room; the
`SupplyState` report.

⚠ **Fixture reach is a first-class test here, not a discovery.** Two cases: a
lamp seated in an ordinary room, and — because W6 will need it — a fixture
seated into a **Warren host** (the lounge shape). If `reachable` does not find
the second, that is found now, in a wave with room to fix it, not in W6 under
the terminal.

Prove: AC6 (two unrelated composers — lamp + a synthetic device — **before** any
terminal); AC7 (cell fits the declared bay, swaps through the verb,
`accepts: Mixins.Charged` validated at hydrate); AC8 (three supplies, one
`supplyReport`, `resolveSupply` the single branch); AC10 (a severed main reports
`cut`, distinctly from `dry`); a lamp on a dead cell goes dark and says why in
the six words.

*Still broken:* the TPA is untouched — every ride is still free of mana and the
terminal's `status` is still inert.

#### W6 — The terminal becomes a consumer (D5, AC9) (provable: *the grey light has a cause*)

P7's composition on `TpaTerminal`; `getStatus()` derives from `supplyState()`;
the ride refuses on any non-null state with the state's own gloss; the `zap`
affordance wrinkle resolved; P10's `PersistableMixin`; the terminal rows split
by supply — Terminus's gates get `mainsRef` to a city `ManaMain`, the Hinkley
Hills post and the newbie-wilds crossroads get a bay and an authored cell.

Prove: AC9 — an exhausted terminal reports `dry`, renders grey through the
existing `getPresentationMml`, and refuses the ride, **with no TPA-specific
breakdown code anywhere in the path** (asserted by the refusal originating in
`ManaPoweredMixin`, not in `TeleportController`); AC6 becomes literally true (a
terminal and a lamp); a restart preserves the reservoir and the bay occupant.

*Still broken:* the ride draws mana but nobody is billed for it; supplying your
own changes nothing.

#### W6a — The arming floor and the amber band (D8b, AC13a–13c)

Folded into W6, listed separately because it is the wave's second provable.
P9a's `armingFloorTau` + `isArmed()` + `standbyWatts` reconcile;
`supplyState()`'s precedence; `stateForDraw(tau)`; amber in `statusColor()`.
The frontier rows author a real floor and a small standby; the mains-fed
city gates author a floor they never approach.

Prove: AC13a (below the floor, dark, refuses **even a BYO ride**); AC13b
(above the floor but short for *this* ride → amber, refuses unfunded,
accepts powered — **and accepts a cheaper ride unfunded**, which is what
proves `overdrawn` is a relationship); AC13c (an untouched terminal drains
to `dry` over game-time, giving the swap a schedule).

#### W7 — The fare (D8, D8a, D8c, AC11–14) (provable: *the receipt shows the physics*)

P14's `manaCharge` term and split leg; `manaRatePerTau()`; the two AppSettings;
P9b's flag→setting→default chain (`--channel` / `--meter` / `tpa.power`)
and the board's per-viewer power line (AC13d); the board's per-route quote showing
`service + surcharge + mana` broken out with a one-line why.

Prove: AC11 (cell-fed traveller pays the service fee and no mana charge; the
same ride without one pays both); AC12 (a caster may pay from their pool with
the same result; a non-caster **cannot**, and the reason is
`installArcaneReserve`'s early return, not a check we wrote); AC13 (mains-fed
and cell-fed terminals quote different mana charges for the same ride); AC14
(`register` costs nothing, at every node); the shipped fare suite green — the
existing money model is untouched.

#### W8 — ⛔ FOLDED INTO W2

The Authority was a whole wave when it carried a kernel change and a
member-government board. As a self-regulating institution it is **one row move
and one field edit**, so it belongs with W2's other moves — which also means
**build one now delivers the complete separation**: the TPA leaves the kernel
*and* stops being Terminus's, as one story. Build two is purely the mana work.

#### W9 — Docs, drives, finalize runway (AC24, AC27–29)

`docs/subsystems/fasttravel.md` **rewritten** for the reform (the mana half, the
fare split, the derived rate, the pack, the Authority-as-special-district, the
board-for-everyone fix recorded as closed, the reservoir-persistence caveat).
`magic.md` gains the computed-cost seam; `magic-items.md` gains τ +
`ManaPowered` as `ChargedMixin`'s second consumer; `watershed.md` notes
`SupplyState`'s second speaker; `access.md` gains D11's reasoning;
`content-packs.md` gains pack 36 and re-derives the pack count;
`arcane-science.md` gets the "implemented" note against its teleportation
section. The `/system/tpa` README carries AC24's inventory paragraph.
`pnpm lint:topics` for every new topic key; the whole lint family; **one** full
`pnpm test`.

**Drives:** a fresh character rides the free lounge↔Terminus leg; reads the
board **unregistered**; walks to Hinkley Hills and registers; buys a cell, feeds
the frontier post, rides for the service fee alone; drains the post and watches
it go grey; a caster pours their own pool in and rides; a caster casts
`teleport` to a registered node off-network; an author moves an object with
`goto --target`.

---

## One build or two — and where the seam is

**Two.** And the seam is **not** where it first looks.

The obvious cut — "abstraction first, migration last" — **does not compile.** A
kernel class may not import a capability pack, so `TpaTerminal` cannot compose
arcana's `ManaPoweredMixin` while it still lives at
`packages/server/src/mud/world/common/tpa/`. AC6's *"composed by at least two
unrelated things — a terminal and one domestic device"* is therefore **gated on
the pack cut**, and the migration has to come first.

So:

**Build one (W0–W4) — "the TPA leaves the kernel, and teleportation becomes a
spell."** A relocation build plus a cast-pipeline seam. It delivers standing
alone:

- the kernel contains no fast-travel code, no terminal class, and no content
  path for a teleport node (AC22, AC23);
- a `teleport` spell exists, runs the shipped pipeline, and its cost is `mgh` —
  distance-free, altitude-real, mass-real, self-only (AC1–AC5);
- off-network teleportation works, anchored, with no `world:` scan (AC16–AC18);
- free movement inside your own extents is re-grounded and a lease-holder is
  denied (AC19, AC20);
- **the departures board renders for everyone**, closing a defect the doc has
  carried since 2026-08-01 (AC15);
- `ChargedMixin` speaks τ (AC25);
- `register` is free, as it always was (AC14);
- "Eternal City" is gone (AC28).

**Every ride behaves exactly as it does today.** No fare changes, no supply, no
new failure mode. The riskiest single thing in the whole reform — a seven-row
`class:` repoint, three kernel deletions, four packs gaining a dependency, and a
class hierarchy collapse — happens in a build where **nothing else is moving**,
which is the only condition under which a migration is honestly reviewable.

**Build two (W5–W9) — "magic gets a wall socket."** All the *new* design: the
device category, the cell as a good, the three supplies, `dry` with a cause, the
fare split, the derived rate, the Authority. It is planned above against build
one's *plan*; ⚠ **W5 opens with a mandatory re-grounding pass** against build
one's *landed code* — the farming build's B0 lesson, with more force here
because build one deletes kernel symbols that build two's waves reference by
name.

If you want one branch and one MR, W0–W4 and W5–W9 still stack in that order and
the wave boundaries are unchanged; what you lose is the clean review boundary
around the migration and the ability to merge a green, useful half while the
second half is still in flight.

---

## Critical files

**Created**

| path | what |
|---|---|
| `packages/content/tpa/pack.yaml` · `package.json` · `tsconfig.json` · `vitest.config.ts` | pack 36, root `/system/tpa` |
| `packages/content/tpa/README.md` | AC24's inventory paragraph |
| `packages/content/tpa/content/settings/fasttravel.yaml` | the three `fasttravel.*` keys + the two `tpa.manaRate.*` keys |
| `packages/content/arcana/src/thing/ManaPowered.ts` | `MANA_POWERED_MIXIN`, `DrawMode`, `ManaSupply`, `ManaPoweredMixin` |
| `packages/content/arcana/src/thing/ManaCell.ts` | `Slottable + Charged`, the good |
| `packages/content/arcana/src/thing/ManaMain.ts` | the mains |
| `packages/content/arcana/src/thing/ManaLamp.ts` | AC6's domestic device |
| `packages/content/arcane-library/content/stuff/idea/magic/Spell/teleport.yaml` | the spell row |
| `packages/content/tpa/content/system/tpa/idea/teleport-authority.yaml` | the Authority — **in the pack**, self-governing |

**Moved**

| from | to |
|---|---|
| `packages/server/src/mud/lib/fasttravel/FastTravel.ts` | `packages/content/tpa/src/thing/FastTravel.ts` |
| `packages/server/src/mud/world/common/tpa/{TpaTerminal,TravelCard,paths}.ts` | `packages/content/tpa/src/thing/` |
| `packages/server/src/mud/platform/idea/cmd/author/TeleportController.ts` | `packages/content/tpa/src/idea/cmd/movement/TeleportController.ts` |
| `packages/server/src/mud/platform/idea/cmd/movement/RegisterController.ts` | `packages/content/tpa/src/idea/cmd/movement/RegisterController.ts` |
| `packages/server/src/mud/platform/idea/cmd/tpa/ProcureCardController.ts` | `packages/content/tpa/src/idea/cmd/tpa/` |
| `packages/content/platform/content/platform/cmd/author/teleport.yaml` | `packages/content/tpa/content/system/tpa/cmd/movement/teleport.yaml` |
| `packages/content/platform/content/platform/cmd/movement/register.yaml` | `packages/content/tpa/content/system/tpa/cmd/movement/register.yaml` |
| `packages/content/platform/content/settings/fasttravel.yaml` | the tpa pack |
| `packages/content/world-seed/content/world/common/tpa/travel-card.yaml` | the tpa pack |
| `packages/content/terminus/content/world/terminus/terminal/idea/tpa.yaml` | the **tpa pack**, as the self-governing Authority |
| the two `lib/fasttravel/__tests__/` suites + `cmd/{author,tpa}/__tests__/tpa-*` | `packages/content/tpa/src/__tests__/` |

**Deleted**

`packages/server/src/mud/world/lounge/thing/LoungeTerminal.ts` ·
`lib/command/validators/mustBeAtFastTravelNode.ts` ·
`lib/command/validators/requiresTravelCredential.ts` · `Mixins.FastTravel` ·
`MixinApi.isFastTravel` · `BORN_WITH_TRAVEL_NODES`.

**Edited (kernel)**

| path | why |
|---|---|
| `lib/magic/Charged.ts` · `lib/magic/Charge.ts` | P1 — τ |
| `platform/idea/api/MagicLogic.ts` | P3 `costOf` + the two item-door sites · P4 `relocationCostImpl` · the `relocate` effect executor |
| `api/magic.ts` | P4 — `RelocationSpec` + `relocationCost` (the one new Api method; request-object shaped so the census stays clean) |
| `lib/magic/Effect.ts` | the closed union's twelfth member |
| `platform/idea/magic/Spell.ts` | `costModel` field + fieldMeta |
| `platform/idea/SpellCatalogue.ts` | validate `costModel` |
| `lib/credential/Credential.ts` | D12 — the floor becomes a settings read |
| `platform/idea/cmd/author/GotoController.ts` + `platform/cmd/author/goto.yaml` | P13 — `--target` / `--force` |
| `lib/mixin.ts` · `api/mixin.ts` | remove the FastTravel entries |
| `packages/content/{terminus,hinkley-hills,newbie-wilds,saxonberg-lounge}/package.json` + their terminal rows | the pack dependency + the `class:` repoint |
| `packages/content/arcane-library/content/stuff/thing/magic/*.yaml` ×4 | `capacityKJ:` → `capacityTau:` |

---

## Risks, and the wave that mitigates each

Sequenced so no risk is mitigated later than the wave it first appears in.

| # | risk | first appears | mitigated |
|---|---|---|---|
| R1 | **`LoungeTerminal`'s `getArrivalRoom()` is not actually redundant** — the Warren host may not be `getContainer()` | W2 | **W2, before the delete.** The equivalence test is written first; the fallback (an `arrivalWarren` field through `ContainmentApi.resolveLanding`) is two lines and reuses `seatIn`'s own machinery. |
| R2 | **The pack cut silently changes behaviour** — a moved gate string, a lost affordance, a `FromModule` that no longer resolves | W2 | **W2.** `lint:gates` is CI-gating and pack code writes absolute gate strings; the moved suites are the net; the wave ships **no** design change other than the fork reorder and the board fix, which are separately tested. |
| R3 | **Four packs' rows point at a class in a pack they do not depend on** — the `requires-kernel` rung check fails rule 2 | W2 | **W2.** The dependency lines land in the same commit as the `class:` repoint; `pack status` prints the derived `dependsOn`. |
| R4 | **`--target` relocation disappears from a pack-less kernel** | W2 | **W2 (P13).** It moves to `goto`, which is kernel and author-category. |
| R5 | **Adding a `relocate` effect widens a deliberately closed union** | W3 | **W3.** One member, one backing (`Mobile.teleport`), always lands on `ctx.actor` — which is what makes AC5 structural. Recorded in magic.md as a union edit with its reason. |
| R6 | **`costOf` doubles an `elevationFor` ancestor walk** (prepare *and* resolve) | W3 | **W3.** Both are already async and off the hot path by construction (`elevationFor`'s own docstring says so); resolve re-validates by design. If it ever bites, the prepare result carries `costTau` forward — the field exists for the preview anyway. |
| R7 | ⚠ **The anchored resolver quietly grows a `world:` seed** under a future edit | W4 | **W4.** The resolver spy test asserts on the *scope argument*, so a new anchor cannot slip past without failing. |
| R8 | ⚠ **Fixture reach** — the new slot verb cannot target a terminal seated into a Warren host | W5 (the verb) / W6 (the terminal) | **W5**, one wave *before* the terminal needs it: W5's verb tests include a Warren-hosted fixture explicitly, so the failure surfaces where there is room to fix it. |
| R9 | **`SlotSpec.accepts` cannot name a pack mixin** | W5 | **W5, by construction.** The bay accepts `Mixins.Charged`; `ManaCell.fitsSlot` narrows. Anything else throws at hydrate, which is the lint. |
| R10 | **`ChargedMixin` affords `zap` on a terminal** | W6 | **W6.** The terminal overrides the static; if the collector unions the chain instead, `zap.yaml` gains `requires: [ArcaneMixin]`, the correct gate regardless. |
| R11 | **A terminal's reservoir resets on restart** (a singleton re-cloned from template) | W6 | **W6 (P10).** `PersistableMixin` + the shipped `SlottedSlice`; no new collection. |
| R12 | **`fasttravel.tpaBusinessPath` is merge-missing**, so a live world keeps pointing at the retired Authority row | W2 | **W2.** Recorded in the pack README, the doc, and the MR — the same shape as fasttravel.md's existing R1 reseed note. Fresh DBs are correct automatically. |
| R13 | **Build two is planned against build one's plan, not its code** | W5 | **W5 opens with a re-grounding pass** and a short delta note appended to this plan, surfaced before W6 if anything material moved. |
| R14 | **The τ rename touches an authored persistent field** across content | W1 | **W1.** Four rows; `lint:field-meta` + `lint:census` gate the rest; the wave is deliberately alone in the file. |

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 · 2 · 3 · 4 · 5 | W3 |
| 6 | W5 (abstraction) → W6 (the terminal makes it literal) |
| 7 | W5 |
| 8 | W5 |
| 9 | W6 |
| 10 | W5 |
| 11 · 12 · 13 · 13d | W7 |
| 13a · 13b · 13c | W6 |
| 14 | W2 (already free) → W7 (asserted) |
| 15 | W2 |
| 16 · 17 · 18 | W4 |
| 19 · 20 | W4 |
| 21 | W2 |
| 22 · 23 | W2 |
| 24 | W9 (the README paragraph) |
| 25 | W1 |
| 26 | W6 (P10 — the spine, not a collection) |
| 27 · 28 · 29 | W9 (28 also in W2) |

---

## Opens for the user

1. **The τ unit (P1, flag 3).** Rename the surface and move the reserve to the
   shipped `'pt'`, as planned — or add a literal `'τ'` `Unit` member and accept
   the contradiction with `quantity.ts`'s standing rule? The plan takes the
   first; the second is one line if preferred.
2. **The cell-swap verb's spelling (P8, flag 1).** `insert` / `remove` is the
   plain reading; `swap` is a single verb that does both and reads better at a
   terminal. The requirements say "swap cell". Naming it now saves a rename.
3. **The Authority's path (P15).** `/stuff/idea/Business/teleport-authority` in
   `world-seed` follows the `/stuff/idea/Government/*` precedent. Confirm — it
   is the one place where "realm content" admits more than one honest answer.
4. **BYO-mana as an option or a preference (P9).** `--power self` on each ride
   is explicit and legible; a persistent `settings tpa.power self` would suit a
   caster who always brings their own. The plan ships the option only.
5. **`analyze` for mana.** `AnalyzeWaterController` already reads `supplyReport`
   **by shape**, so `analyze water <terminal>` would literally work today —
   both a free win and an embarrassing verb. Rename the subcommand to
   `analyze supply` with `water` as an alias (a small platform-pack edit), or
   leave it? Not in any wave above; say the word and it joins W6.
