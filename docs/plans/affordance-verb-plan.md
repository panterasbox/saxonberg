# Affordance verbs — implementation plan

This plan drives a build agent who has read
[`docs/slates/affordance-verb-slate.md`](../slates/affordance-verb-slate.md)
plus the linked subsystem docs (slot, embodiment, command-spec,
collections, spatial). The slate is the design authority; this
plan is the build sequence and file-by-file shape.

## 1. Overview

Two verbs (`put`, `give`), one new mixin (`Surfaced`), one
extension to `Containable` (the `restingOn` auxiliary pointer),
and one new method on the existing `ContainmentApi` (`placeOn`).
The design weight lives in the architectural call (§ 2) and
the mixin/pointer pair; the verb controllers are short.

What ships:

- **`Surfaced` mixin** — sibling marker mixin for Stuffs that
  support items resting on them. `getResting()` is a lazy
  walk; no parallel collection.
- **`Containable.restingOn`** — auxiliary pointer (alongside
  the existing `container`) that records what surface an item
  is currently resting on. Persistent. Null when the item is
  not on a surface.
- **`ContainmentApi.placeOn`** — new sibling to `move`.
  `move(item, container)` contract unchanged externally;
  `placeOn(item, surface)` is the on-surface primitive.
- **`put`** — preposition-aware verb. `put X in Y` →
  Container target via `move`. `put X on Y` → Surfaced
  target via `placeOn`.
- **`give`** — inter-Agent item transfer. Lands the item in
  the receiver's general inventory (Container), not a hand
  slot — per the "hand slots are for activities, not storage"
  rule in [embodiment.md](../subsystems/embodiment.md).
- **Three new validators** — `mustBeSurfaced` (for `put on`
  destinations), `mustBeAgent` (for `give` recipients),
  `mustBePutTarget` (composite gate for put's target arg).
- **DescribeApi extension** — group room contents visually by
  `restingOn`, so items on surfaces appear nested under their
  supporter's description (the apple appears under "a wooden
  desk, with..." in the room listing).
- **Content seeds** for proof — a table (Surfaced demo), an
  apple (gettable / put-on-able), an NPC for give-receiver.

What does NOT ship (per slate § What this slate does NOT
cover):

- `read` / `Readable` — language-system consumer, deferred to
  the language slate.
- Sensory verbs (`smell`, `taste`, `touch`, `listen`).
- `Edible` / `Drinkable` and eat/drink verbs.
- A `Receiving` mixin for NPC consent.
- Prepositional expansion beyond `in` and `on`.

No new Api **classes**. One new method on the existing
`ContainmentApi`. Verbs call `ContainmentApi.move` /
`placeOn`; no other Api seams.

## 2. The Container-vs-Surfaced architectural call

The slate listed three options for how `Surfaced` relates to
`Container`. Working through the design surfaced a fourth that
matches the perceptual model best:

> **Option D — support as an adjunct to containment.**
> Containment stays hierarchical and exclusive (one container,
> matching the existing semantics). "Resting on" is an
> orthogonal optional relationship that doesn't replace
> containment.

**Build decision: Option D.**

The motivating intuition: a chest *encloses* its contents (an
apple in a chest is sealed off; modeling its container as the
chest matches reality). A desk *supports* what's on it (an
apple on a desk is physically right there in the room, just
held up by furniture). The on/in distinction isn't about who
holds the item — it's about whether the relationship encloses
or supports.

Under Option D:

- An apple on a desk in a room has `container = room` (the
  enclosing space) AND `restingOn = desk` (the support). The
  room sees the apple in its contents naturally — no
  perceptual lie.
- An apple in a chest in a room has `container = chest` (the
  chest encloses) and `restingOn = null`.
- An apple on the floor in a room has `container = room` and
  `restingOn = floor` if the floor composes Surfaced, else
  `restingOn = null`.
- A desk-with-drawer composes BOTH Container (the drawer is a
  structural part, with `container = desk`) AND Surfaced
  (apples rest on top, with `container = room` and
  `restingOn = desk`). The two collections are independent and
  non-overlapping — no ontological confusion.

The substrate touchpoints are bounded and live in the right
places:

1. **`Containable` gains one new optional pointer** —
   `restingOn: Surfaced | null` — alongside the existing
   `container` pointer. `getContainer()` keeps its type and
   semantics; nothing it points at changes.
2. **`Surfaced` is a sibling marker mixin**, not a Container
   subtype. Single method `getResting()` lazily walks the
   environment's contents and filters by `restingOn === this`.
   No forward collection to maintain.
3. **`ContainmentApi.move(item, container)` contract stays
   unchanged.** A new sibling method
   `ContainmentApi.placeOn(item, surface)` handles the
   on-surface case end-to-end (move to surface's container +
   set restingOn). Each primitive does one thing.
4. **DescribeApi** groups room contents visually by `restingOn`
   so the apple appears nested under the desk's description
   instead of as a separate room-level item.

What does NOT change:
- MQL — under Option D, the apple is structurally in the room's
  `getContents()`. Existing `:i` and bare-keyword resolution find
  it without a new chain operator. (A future `:on` operator for
  filtering "specifically things resting on this surface" is a
  forward feature; see § 10.)
- Persistence — `restingOn` is one new Pattern A path field on
  Containable, round-trips through the existing Hydrator.
- Containment hooks — `onContainableAdded` / `Removed` fire on
  the Container side; surface placement doesn't add new hook
  surfaces.
- `Mobile.traverse`, conveyance ripple, locomotion — all touch
  Container chains and are unaffected by the auxiliary
  `restingOn` pointer.
- Light / sound — care about open/closed (Concealing), not
  in/on.

The slate's open question Q1 resolves to D in this plan.

## 3. New folder structure

`Surfaced` lives at `lib/spatial/Surfaced.ts`. It's a spatial
concern (containment + preposition flavor); placing it
alongside `Container.ts` / `Containable.ts` keeps the
containment family colocated.

No new subsystem folder.

## 4. File-by-file

### 4.1 `lib/spatial/Surfaced.ts` — new

**What.** Sibling marker mixin (NOT extending Container) for
Stuffs that support items resting on them. The mixin owns no
storage — `getResting()` lazily walks the environment and
filters by the back-pointer on Containable.

**Surface.**

```ts
import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from './Containable';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';

/**
 * Surfaced — a Stuff that supports items resting on its surface.
 *
 * Resting is auxiliary to containment, not a replacement for it.
 * An apple on a desk has container = the desk's container (e.g.,
 * the room) and restingOn = the desk. Surfaced doesn't enclose;
 * it supports. See plan § 2 for the architectural rationale.
 *
 * No storage on the mixin itself. `getResting()` lazily walks
 * the environment's contents and filters by `restingOn === this`.
 */
export interface Surfaced {
  /**
   * Items currently resting on this surface. Computed lazily by
   * walking the surface's environment and filtering by Containable's
   * `restingOn` back-pointer. Returned readonly; mutate via
   * `ContainmentApi.placeOn` / `ContainmentApi.move`.
   */
  getResting(): readonly (Stuff & Containable)[];

  /**
   * MQL keyword bridge. If set, `put X on <keyword>` resolves the
   * keyword against the host's Detailed map and lands on this
   * surface. Mirrors `SlotSpec.userFacingDetail`
   * (see slot.md § Detail-targeted resolution).
   */
  getUserFacingDetail(): string | undefined;

  /**
   * Per-host gate. Defaults to true; authors override to reject
   * specific items (a fragile shelf rejects heavy items; a sloped
   * surface rejects round items; a wax tabletop rejects hot items).
   */
  canRest(item: Stuff & Containable): boolean;
}

export function SurfacedMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class SurfacedMixin extends Base {
    static _mixinName = 'SurfacedMixin';

    static persistentFields = ['userFacingDetail'];

    protected userFacingDetail: string | undefined = undefined;

    getResting(): readonly (Stuff & Containable)[] {
      // Lazy walk: items in our environment whose restingOn is us.
      // For a desk in a room, the environment is the room; apples
      // resting on the desk have container = room, restingOn = desk.
      const env = (this as unknown as Containable).getContainer();
      if (!env) return [];
      const candidates = ContainmentApi.getContents(env);
      const self = this as unknown as Surfaced;
      return candidates.filter(
        (c) => MixinApi.isContainable(c) && c.getRestingOn() === self,
      ) as readonly (Stuff & Containable)[];
    }

    getUserFacingDetail(): string | undefined {
      return this.userFacingDetail;
    }
    setUserFacingDetail(v: string | undefined): void {
      this.userFacingDetail = v;
    }

    canRest(_item: Stuff & Containable): boolean {
      // Default: accept any Containable. Subclasses / shadows
      // override for shape-specific gates (capacity, weight,
      // temperature, etc.).
      return true;
    }
  };
}
```

**Composition constraint.** `SurfacedMixin` requires
`ContainableMixin` on the host (the surface itself has to live
somewhere — a free-floating Surfaced has no environment to walk).
Enforce via the standard "always composed with X" runtime check
(per the
[mixin composition constraint feedback](../../../../home/bobalu/.claude/projects/-home-bobalu-play-saxonberg/memory/feedback_enforce_mixin_constraints.md)).

`SurfacedMixin` does NOT require `Container` on the host. A
simple table doesn't have an interior — just a surface. A desk
with a drawer happens to compose both Container (for the
drawer-as-part) and Surfaced (for the apples on top); each
mixin works independently.

**Tests** — `lib/spatial/__tests__/Surfaced.test.ts`:
- A host composing `SurfacedMixin` reports `MixinApi.isSurfaced`
  as true.
- `getUserFacingDetail()` round-trips through the persistent
  field.
- `canRest()` defaults to true.
- `getResting()` returns items in the environment with
  `restingOn` pointing at this surface; ignores items in the
  environment without that pointer.
- `getResting()` returns empty array when the surface has no
  environment (orphaned during construction).
- Composition without Containable throws at construction.

### 4.2 `lib/mixin.ts` — modify

Add the constant:

```ts
// in the Mixins const map:
  Surfaced: 'SurfacedMixin',
```

Standard one-line addition, alphabetical order if the file uses
it.

### 4.3 `api/mixin.ts` — modify

Add the predicate after `isContainer`:

```ts
public static isSurfaced(obj: Stuff): obj is Stuff & Surfaced {
  return this.hasMixin(obj, Mixins.Surfaced);
}
```

Mirror the comment style of `isContainer`. No security-decoration
change (the Api is already decorated).

### 4.4 `lib/spatial/Containable.ts` — modify

Add the auxiliary `restingOn` pointer alongside the existing
`container` field. Type-honest: separate accessor with its own
type.

```ts
// Additions to ContainableMixin's interface and class body:

export interface Containable {
  // ...existing methods...

  /**
   * Auxiliary support pointer. Set when this Containable is
   * resting on a Surfaced host (e.g., apple on a desk).
   * Orthogonal to `getContainer()` — the apple is in the room
   * AND resting on the desk; both relationships are real.
   *
   * Null when the item is not on a surface (in a container,
   * in inventory, in an actor's grip, freely in a room).
   */
  getRestingOn(): Surfaced | null;

  /**
   * Privileged setter — only ContainmentApi.placeOn /
   * ContainmentApi.move may call. Runtime-rejected by the
   * call-security gate otherwise. Authors don't touch this
   * directly; the Api maintains the invariant that restingOn
   * is only non-null when the item's container matches the
   * surface's container.
   */
  _setRestingOn(surface: Surfaced | null): void;
}

// Class body additions:
//   - new persistent field 'restingOnPath' (Pattern A — string
//     templatePath of the supporting surface, null when no
//     support)
//   - getter resolves the path to a runtime Surfaced reference
//   - privileged setter gated by @CallSecurity(ApiOnly) + @Final
//     + @Unshadowable, same stack as Stuff.destroy()
```

The `restingOnPath` field follows the codebase's Pattern A
reference shape (path-string for cross-restart persistence,
runtime resolution on read). Mirrors how `Mobile._engagedModePath`
is shaped — string field, runtime-resolved accessor.

**Decision: persistent or runtime-only?** Persistent. An apple
on a desk should still be on that desk after a server restart;
the relationship is a meaningful part of world state, not a
transient runtime engagement.

**Tests** — extend `lib/spatial/__tests__/Containable.test.ts`:
- New Containable has `getRestingOn() === null`.
- `_setRestingOn` rejected outside the call-security gate.
- After `_setRestingOn(surface)`, `getRestingOn()` returns
  the surface.
- After `_setRestingOn(null)`, returns null.
- Persistent round-trip: `restingOnPath` serializes to template
  path; rehydrates to the same Stuff reference.

### 4.5 `api/containment.ts` — modify

Add the `placeOn` sibling to `move`. Existing `move` is
unchanged in signature; internally it gains one invariant
(clear restingOn when changing container).

```ts
// Existing — UNCHANGED externally:
ContainmentApi.move(item: Stuff & Containable,
                    container: Stuff & Container): void;

// Internal change: at the end of move, if item had a non-null
// restingOn AND the new container differs from the previous
// container, clear restingOn. The "I'm in chest now, can't be
// resting on the desk I was on" invariant. Hidden from callers.

// New:
ContainmentApi.placeOn(item: Stuff & Containable,
                       surface: Stuff & Surfaced): void;
```

`placeOn` implementation sketch:

```ts
public static placeOn(
  item: Stuff & Containable,
  surface: Stuff & Surfaced,
): void {
  // Resolve target environment: the surface's container.
  const targetEnv = (surface as unknown as Containable).getContainer();
  if (!targetEnv) {
    throw new Error(
      `placeOn: surface ${surface.stuffId} has no environment ` +
      `to place items into`,
    );
  }
  if (!surface.canRest(item)) {
    throw new Error(
      `placeOn: surface ${surface.stuffId} rejects ${item.stuffId}`,
    );
  }
  // Move item into the surface's environment first (fires existing
  // containment hooks); then set the auxiliary restingOn pointer.
  // Order matters: container change first, then support pointer.
  ContainmentApi.move(item, targetEnv);
  (item as Containable)._setRestingOn(surface);
}
```

**Why move first, then set restingOn?** The move() call clears
restingOn as part of its container-change invariant. Setting
restingOn after move ensures the new support pointer survives.

**Programmatic vs user-input errors.** `placeOn` throws on
contract violations (surface has no environment, surface
rejects item). Validators upstream (`mustBeSurfaced` +
`canRest` check in PutController) handle user-input failures
with prose; the throws are programmer-error guards same as
existing `ContainmentApi.move`.

**Tests** — extend `api/__tests__/containment.test.ts`:
- `placeOn(apple, desk)` where desk is in a room: apple's
  container becomes room, restingOn becomes desk.
- `placeOn` followed by `move(apple, chest)`: restingOn is
  cleared by the move (container change invariant).
- `placeOn` followed by `placeOn(apple, otherDesk)` (different
  desk in same room): restingOn updates; container unchanged
  (already room).
- `placeOn` followed by `placeOn(apple, otherDesk)` (different
  room): both container and restingOn update.
- `placeOn` against a surface with no environment throws.
- `placeOn` against a surface whose `canRest` returns false
  throws.

### 4.6 `lib/command/validators/mustBeSurfaced.ts` — new

Mirror of `mustBeContainable`:

```ts
import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { DescribeApi } from '../../../api/describe';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isSurfaced(stuff as Stuff)) {
      return `${DescribeApi.getDisplayName(stuff, 'that')} isn't a surface you can put things on`;
    }
  }
  return undefined;
};

export default validator;
```

**Tests** — `lib/command/validators/__tests__/mustBeSurfaced.test.ts`
mirroring the existing validator tests.

### 4.7 `lib/command/validators/mustBeAgent.ts` — new

Gate for `give`'s recipient. `Agent` is a class (not a mixin),
so the check is `instanceof Agent`.

```ts
import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { Agent } from '../../stuff/Agent';
import { DescribeApi } from '../../../api/describe';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!(stuff instanceof Agent)) {
      return `${DescribeApi.getDisplayName(stuff, 'that')} can't accept things`;
    }
  }
  return undefined;
};

export default validator;
```

**Why a separate validator instead of reusing `requiresAnimate`**
— `requiresAnimate` is a verb-level validator that runs against
`context.commandGiver` (the actor). `mustBeAgent` is a
field-level validator that runs against the target of the verb.
Different surface, different concern. Reuse isn't viable.

Also, `requiresAnimate` rejects dead organisms (per its existing
shape); for `give`, you can hand things to anything that IS an
Agent regardless of lifecycle state. The Agent class check is
the right gate.

**Tests** — `lib/command/validators/__tests__/mustBeAgent.test.ts`.

### 4.8 `mud/cmd/put.yaml` — new

```yaml
verbs: [put, place]
controller: PutController
description: "Place an item from your inventory in or on a target"
validators:
  - /lib/command/validators/requiresAnimate
args:
  - name: item
    type: object
    required: true
    scope: "inventory"
    validators:
      - /lib/command/validators/mustBeInInventory
      - /lib/command/validators/mustBeContainable
  - name: target
    type: object
    required: true
    scope: "peers"
    prepositions: [in, on]
    validators:
      - /lib/command/validators/mustBeVisible
      - /lib/command/validators/mustBePutTarget
```

**New validator `mustBePutTarget`** — composite gate that
accepts `Container OR Surfaced`. Cheaper than running both
validators with OR-logic at the verb layer. Sketch:

```ts
const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    const s = stuff as Stuff;
    if (!MixinApi.isContainer(s) && !MixinApi.isSurfaced(s)) {
      return `${DescribeApi.getDisplayName(stuff, 'that')} can't hold things`;
    }
  }
  return undefined;
};
```

(Two new validator files, then — `mustBeSurfaced` for any
future verb that's surface-only, plus `mustBePutTarget` for
put's either-or gate. mustBeSurfaced still earns its file for
the future verb case.)

**Preposition routing**: the matched preposition lives in
`ctx.prep['target']`. PutController reads it to decide on/in
dispatch. With no preposition, behavior is per § 6.

### 4.9 `obj/command/PutController.ts` — new

```ts
import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { ContainmentApi } from '../../api/containment';
import { DescribeApi } from '../../api/describe';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface PutModel extends CommandModel {
  item: MqlOneResult;
  target: MqlOneResult;
}

export class PutController extends CommandController<PutModel> {
  execute(model: PutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const target = model.target.stuff;

    if (!item) {
      // No matching item in inventory.
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't have any '${model.item.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result', field: 'item', query: model.item.raw,
      });
      return;
    }
    if (!target) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result', field: 'target', query: model.target.raw,
      });
      return;
    }

    // Preposition: 'in' | 'on' | undefined.
    const prep = context.prep?.target;
    const mode = prep ?? this.inferMode(target);
    if (!mode) {
      // No preposition AND target composes both Container and
      // Surfaced — ambiguous. Reject; ask the player to specify.
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`Put it in or on ${Mml.item(target)}?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'preposition-ambiguous',
        detail: 'target accepts both in and on',
      });
      return;
    }

    if (mode === 'in') {
      if (!MixinApi.isContainer(target)) {
        // Preposition didn't match target capability.
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`You can't put things in ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'wrong-preposition',
          detail: `target not a Container; cannot 'in'`,
        });
        return;
      }
    } else { // 'on'
      if (!MixinApi.isSurfaced(target)) {
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`You can't put things on ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'wrong-preposition',
          detail: `target not a Surfaced; cannot 'on'`,
        });
        return;
      }
      if (!target.canRest(item as any)) {
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`${Mml.item(item)} won't rest on ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cannot-rest',
          detail: 'host rejected item',
        });
        return;
      }
    }

    // Branch to the correct primitive based on resolved mode.
    // Two distinct calls — each does one thing — preserving
    // ContainmentApi.move's existing contract.
    if (mode === 'in') {
      ContainmentApi.move(item as any, target as any);
    } else {
      ContainmentApi.placeOn(item as any, target as any);
    }

    const preposition = mode === 'in' ? 'in' : 'on';
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You put ${Mml.item(item)} ${preposition} ${Mml.item(target)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} puts ${Mml.item(item)} ${preposition} ${Mml.item(target)}.`)
      .send();
  }

  private inferMode(target: Stuff): 'in' | 'on' | null {
    const isContainer = MixinApi.isContainer(target);
    const isSurfaced = MixinApi.isSurfaced(target);
    // Pure Container → 'in'. Pure Surfaced → 'on'. Both → ambiguous.
    if (isContainer && !isSurfaced) return 'in';
    if (isSurfaced && !isContainer) return 'on';
    if (isContainer && isSurfaced) return null;  // desk-with-drawer
    return null;
  }
}
```

**The `as any` casts** are the standard call-security workaround
for cross-mixin narrowing in controllers (per
[CLAUDE.md § Member Privacy](../../CLAUDE.md)). Each is at a
genuine type-narrow boundary; the validator ensured the mixin
is present.

**Tests** — `obj/command/__tests__/PutController.test.ts`:
- `put apple in chest` → `apple.getContainer() === chest`,
  `apple.getRestingOn() === null`.
- `put apple on table` (table is Surfaced, in a room) →
  `apple.getContainer() === room`, `apple.getRestingOn() === table`.
- `put apple on chest` where chest is Container but not Surfaced
  → wrong-preposition rejection.
- `put apple in table` where table is Surfaced but not Container
  → wrong-preposition rejection.
- `put apple table` with no preposition where table composes
  both Container and Surfaced (desk-with-drawer case) →
  ambiguous rejection.
- `put apple on tabletop` where "tabletop" is the table's
  `userFacingDetail` → succeeds (MQL bridges to the table).
- `put apple on table` where `canRest()` returns false →
  cannot-rest rejection.
- Move an apple from one table to another in the same room —
  container unchanged, restingOn updates.
- Move an apple from a table to a chest — container changes,
  restingOn clears.

### 4.10 `mud/cmd/give.yaml` — new

```yaml
verbs: [give, hand]
controller: GiveController
description: "Give an item from your inventory to another actor"
validators:
  - /lib/command/validators/requiresAnimate
args:
  - name: item
    type: object
    required: true
    scope: "inventory"
    validators:
      - /lib/command/validators/mustBeInInventory
      - /lib/command/validators/mustBeContainable
  - name: recipient
    type: object
    required: true
    scope: "peers"
    prepositions: [to]
    validators:
      - /lib/command/validators/mustBeVisible
      - /lib/command/validators/mustBeAgent
```

The `prepositions: [to]` consumes "to" if present, so both
`give sword to alice` and `give sword alice` parse equivalently.

### 4.11 `obj/command/GiveController.ts` — new

```ts
import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

interface GiveModel extends CommandModel {
  item: MqlOneResult;
  recipient: MqlOneResult;
}

export class GiveController extends CommandController<GiveModel> {
  execute(model: GiveModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const recipient = model.recipient.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't have any '${model.item.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result', field: 'item', query: model.item.raw,
      });
      return;
    }
    if (!recipient) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't see any '${model.recipient.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'recipient', query: model.recipient.raw,
      });
      return;
    }

    // Validator ensured recipient is an Agent (which composes
    // Container per Character / Avatar's mixin chain). Move
    // directly into recipient's inventory.
    ContainmentApi.move(item as any, recipient as any);

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You give ${Mml.item(item)} to ${Mml.name(recipient)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} gives ${Mml.item(item)} to ${Mml.name(recipient)}.`)
      .send();
    // Recipient's own scene-message for receipt.
    MessageApi.scene(recipient)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`${Mml.name(giver)} gives you ${Mml.item(item)}.`)
      .send();
  }
}
```

**Tests** — `obj/command/__tests__/GiveController.test.ts`:
- `give apple to alice` → apple in alice's inventory.
- `give apple alice` (no `to`) → same; preposition optional.
- `give apple to rock` (rock is not Agent) → validator
  rejection.
- Recipient's scene fires alongside the giver's.

### 4.12 Content seeds

Three new seed files under `seeds/obj/demo/`:

**`seeds/obj/demo/table.yaml`** — exercise Surfaced.

```yaml
class: /obj/demo/DemoSurface
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: wooden table
  long: A sturdy oak table, scarred but flat.
  _materialPath: /lib/material/wood/oak
  mass: "25000 g"
  userFacingDetail: tabletop
  details:
    tabletop: "The tabletop is broad and level."
```

**`seeds/obj/demo/apple.yaml`** — gettable, put-on-able.

```yaml
class: /obj/demo/DemoItem
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: red apple
  long: A crisp red apple.
  _materialPath: /lib/material/food/apple   # if such a material exists; else /lib/material/wood/oak as placeholder
  mass: "150 g"
```

**`seeds/obj/demo/quartermaster.yaml`** — give-receiver NPC.

```yaml
class: /obj/demo/DemoQuartermaster   # or a generic NPC class if one exists
hydratorClass: /lib/persistence/PersistentHydrator
data:
  name: the quartermaster
  long: A weathered figure in a leather apron, hands on hips.
```

Build agent: if a generic `DemoNPC` / `DemoCharacter` class
doesn't exist, author the smallest one that composes the
Character chain. The quartermaster is an Agent (Character
extends Agent), so the `mustBeAgent` validator passes.

**`DemoSurface`** is a new content class at
`packages/server/src/mud/obj/demo/DemoSurface.ts` — composes
`Visible + Containable + Surfaced + Tangible + Detailed +
Named`. Mirror `DemoItem`'s shape; add `SurfacedMixin` to the
chain. `Containable` is required (the surface lives in a
room); `Container` is NOT — under Option D a simple table
holds nothing inside, just supports items in its environment
via Surfaced. A future desk-with-drawer variant would add
Container for the drawer-as-part; the basic surface doesn't
need it.

### 4.13 `api/describe.ts` — modify

DescribeApi gains a grouping pass for `restingOn` when rendering
a Container's contents listing. Items at the top of a room's
contents list group naturally; items whose `restingOn` points
at a Surfaced in the same listing render nested under the
surface's description.

**Surface.**

The exact insertion point depends on how DescribeApi composes
content listings today (build agent reads `api/describe.ts` to
find the contents-rendering site). The shape of the change:

```ts
// Inside the routine that renders a container's contents list
// (e.g., something like DescribeApi.renderContents or wherever
// look's "you see X, Y, Z" line is composed):
//
// 1. Partition contents by restingOn:
//    - topLevel: items whose restingOn is null OR points at a
//      Stuff not in this listing
//    - byHost: Map<Surfaced, Containable[]> keyed by the
//      supporting surface (when the surface itself is in this
//      listing)
//
// 2. Render topLevel items one per slot. For each item that is
//    Surfaced AND has resting items, append a count-aware suffix:
//      - 1-3 resting items → "a wooden desk, with a red apple
//        and a brass candlestick on it"
//      - 4+ resting items → "a wooden desk, with several items
//        on it"
//    The exact thresholds and prose are tunable; recommended
//    constant: SURFACE_ENUMERATE_THRESHOLD = 3.
//
// 3. Items that were rendered under a surface are NOT also
//    rendered at the top level (avoid double-mention).
```

**Why partition and re-render rather than walk surfaces
separately.** The contents-walk itself doesn't change — the
room's `look` still walks its `getContents()` as today. The
grouping is purely a presentation pass over the already-walked
list. Keeps the structural model (Surfaced is sibling, not
extending Container) reflected in the rendering pipeline
without adding a parallel walk.

**Cross-surface case (an item resting on a surface in a
different container)** — out of scope. In v1, items resting on
a desk are by invariant in the same container as the desk
(`placeOn`'s post-condition). The grouping pass only needs to
consider surfaces in the same listing.

**`look at <Surfaced>` specifically.** When the player targets
the surface directly, the surface's description includes its
full resting list ("The desk supports: a red apple, a brass
candlestick, a quill, a stack of papers."). Enumeration, not
summary — the player asked specifically. This is a separate
render path on the Stuff-level description; the partitioning
above is for the contents-listing path.

**Tests** — extend `api/__tests__/describe.test.ts` (or
wherever look's content rendering is tested):
- Room with a table that has one item on it → "a wooden table,
  with a red apple on it" in the room's listing; apple does
  NOT appear separately at the room level.
- Room with a table holding 4+ items → summarized as
  "scattered with various items" (or chosen prose); items not
  listed inline.
- `look at table` directly → full enumeration of resting items.
- Room with multiple surfaces, each holding items → each
  surface's resting items group under it; no leakage.
- Room with an item NOT on any surface (e.g., a chair on the
  floor) → appears at top level.
- Closed Concealing container in a room → its contents do NOT
  appear (unchanged behavior; reaffirms in/on doesn't change
  open/closed semantics).

## 5. Interception decisions

This plan touches several layers (verb controllers, the
`ContainmentApi`, the `Surfaced`/`Containable` mixins) and each
layer is a candidate site for veto predicates, witness hooks, or
generic around-hooks. The decisions below close those questions
explicitly — what's wired, what's deferred, and why. Build agent
should respect them; future maintainers thinking about adding a
hook in this area can read this section first.

### 5.1 What's wired

- **`Container.canContain(item)`** — host-side veto. Exists
  today. Consumed by `ContainmentApi.move`. Capacity gates and
  type constraints live here.
- **`Surfaced.canRest(item)`** — host-side veto. New in this
  plan (§ 4.1). Consumed by `ContainmentApi.placeOn` and by
  `PutController`'s pre-flight check. Per-surface item gating
  (fragile shelf rejects heavy items, wax tabletop rejects
  hot items) lives here.
- **`Container.onContainableAdded(item)` / `onContainableRemoved(item)`**
  — host-side witnesses. Exist today. Fire from inside `move`,
  which means they also fire from `placeOn` (since placeOn
  calls move internally). Subscribers on the room see container
  changes regardless of whether the change came from a `move`
  to a Container or a `placeOn` to a Surfaced living in the
  room.

That's the entire interception surface this plan adds. One
new method (`canRest`); zero new witnesses.

### 5.2 What's deferred and why

The following hooks were considered and explicitly NOT added:

- **`Surfaced.onItemRested?(item)` / `onItemLifted?(item)`** —
  surface-scoped witnesses. Would notify pressure plates, hot
  plates, sticky surfaces, magic glyphs. **Deferred**: no v1
  consumer. When a content case earns it (the first pressure
  plate ships), it's a one-method-pair addition to the existing
  mixin — purely additive, no structural rework. Adding it
  speculatively would design without a real shape constraint.
- **`Agent.canReceive(item, giver)` / `Receiving` mixin** —
  NPC consent for receiving items via `give`. Slate explicitly
  defers (§ Verb 2 — give, "No new `Receiving` mixin in v1"). A
  guard refusing a bribe, a child rejecting a sharp knife —
  content cases, not v1 substrate.
- **`Agent.onReceived?(item, giver)` / `onGave?(item, recipient)`**
  — actor-scoped give witnesses. Would let NPCs react to gifts
  (quest triggers, dialogue branches). Deferred for the same
  reason as `onItemRested` — no v1 consumer; additive when
  needed.
- **`Containable.canBeContained(container)` / `canBeRestedOn(surface)`**
  — item-side veto. Cursed items refusing entry to profane
  vessels; sacred relics rejecting unworthy surfaces. **Deferred**:
  no v1 case, and the authoring intuition is host-side anyway
  ("this chest only holds gems" reads better than "this gem
  only goes in jeweled chests"). Runtime cost too — item-side
  gates poll each item, host-side ask one Stuff.
- **`Containable.onContainerChanged?(newContainer, oldContainer)`
  / `onRestingOnChanged?(newSurface, oldSurface)`** — item-side
  witnesses, symmetric to container-side. Deferred for the
  same speculative-without-consumer reason.
- **`beforeMove` / `afterMove` Api-level hooks** — generic
  lifecycle wrappers on `ContainmentApi.move` / `placeOn`.
  Deferred because the call-security framework already enables
  this via method shadows. Any consumer that needs to intercept
  move can shadow `ContainmentApi.move` directly; no explicit
  hook design required.
- **`beforePut` / `afterGive` controller-level hooks** —
  verb-execution lifecycle. Same as above: shadow
  `PutController.execute` or `GiveController.execute` via the
  existing security framework. Doesn't need substrate-level
  hooks designed in.

### 5.3 The principle

For each candidate hook, we asked one question: *who is the v1
consumer?* If the answer was "none — but maybe a future content
case," the hook didn't ship. The codebase has accumulated
discipline around this (memory: `substrate has no content
hooks`, `no premature registries`); applying it here keeps the
mixin surfaces small and the interception story consistent —
shipped hooks have shipped consumers.

This isn't a rejection of interception in principle. It's a
discipline about when to design it in. The shape of every
deferred hook above is one-method-pair additive; when a real
content case earns it, the addition is mechanical.

### 5.4 Notification gap worth knowing

One specific behavior the build agent should understand:
`ContainmentApi.placeOn` fires only the container-side
`onContainableAdded` hook (via the internal `move` call). It
does NOT distinguish "item entered the room because it was
dropped on the floor" from "item entered the room because it
was placed on a desk that lives there." Subscribers on the
room see container change; they don't see the surface
relationship.

For v1 this is fine — no consumer needs the distinction.
Documenting it so the first consumer who needs surface-scoped
notification (when they show up) knows the existing hook
doesn't carry the data, and reaches for the deferred
`Surfaced.onItemRested?` pair at that point.

## 6. Open questions for the build

### Q1. `put X Y` with no preposition + target composing both

Slate sketched three options:
- Infer from target capability (only works when target is
  Container OR Surfaced, not both).
- Prompt the player.
- Author-preference setting on the target.

Plan: **reject with "Put it in or on X?" rejection.** Simplest
shape; no prompt infrastructure needed (the interactive prompt
stack is on the v1 punch list, not yet built); no per-target
authoring overhead. When target composes only one of the two,
infer cleanly.

If the build finds the rejection-only path too annoying in
testing, fall back to "default to 'on'" with a content-author
override path. Note in the test suite.

**Sub-question: detail-keyword as preposition implication.** If
the player types `put apple tabletop` and "tabletop" resolves
to the desk via `Surfaced.userFacingDetail`, the player clearly
meant "on" (they named a surface keyword, not a container
keyword). The scope-walker already tracks `detailPath` per
[mql.md](../subsystems/mql.md), so threading "this match came
via the Surfaced detail bridge" into the dispatch context would
let PutController default to "on" mode without an explicit
preposition. Out of scope for v1 — punt to the ambiguous
rejection. If playtest shows this is annoying, the build agent
can revisit (the threading work is bounded).

### Q2. `Surfaced` mixin composition constraint

Surfaced requires `Containable` on the host (the surface
itself has to have an environment for the lazy-walk in
`getResting`). The plan recommends a runtime check at mixin
composition time (per the
`feedback_enforce_mixin_constraints` memory). Build agent
applies the standard compose-time invariant. If the existing
"always composed with X" enforcement mechanism doesn't exist
yet as a reusable utility, build it as part of this work; if
it does, use it.

### Q3. Scene rendering of items on a Surfaced

Under Option D, items on surfaces are structurally part of
their enclosing space's contents — the apple on the desk IS
in the room. So the apple naturally appears in the room's
contents listing without any special walk.

The presentation question: should DescribeApi **group**
contents by `restingOn` so the apple appears nested under the
desk ("a wooden desk, with a red apple on it"), or list them
flatly ("a wooden desk, a red apple")?

**Recommendation: group by `restingOn`.** When rendering a
room's contents:

- Items with `restingOn === null` appear at the top level.
- Items with `restingOn === someSurface` appear nested under
  the surface's description.

For the cluttered-surface case (twelve items on a desk),
DescribeApi summarizes ("a wooden desk, scattered with various
items") rather than enumerating; player can `look at desk` for
the full list. Count-aware rendering — same shape as future
container-with-many-items would want.

This IS a real extension to DescribeApi, but bounded: one
grouping pass over the contents list, count-aware summary
threshold, and per-surface formatting. The contents-walk
itself doesn't change — the room's `look` still walks
`getContents()` of the room as today; the grouping happens at
the rendering layer.

Container nesting (chest's contents NOT shown in room look)
is unchanged — that's the open/closed (Concealing) distinction,
not the in/on distinction. A chest's contents are hidden by
the chest being enclosed; a desk's "contents" (its supported
items) ARE in the room and so DO show.

### Q4. `Mml.item` vs `Mml.name` for prose

Resolved by the existing controller pattern (see `GetController`):
`Mml.item(x)` for objects, `Mml.name(x)` for actors. The prose
sketches in this plan apply that convention consistently;
build agent matches it.

## 7. Tests

All in Vitest, colocated:

- `lib/spatial/__tests__/Containable.test.ts` — extend with
  `restingOn` persistence + privileged setter (see § 4.4).
- `lib/spatial/__tests__/Surfaced.test.ts` — mixin shape,
  composition constraint, `canRest` default,
  `getUserFacingDetail` accessor, `getResting` lazy walk.
- `api/__tests__/containment.test.ts` — extend with
  `placeOn` cases + move's restingOn-clearing invariant
  (see § 4.5).
- `lib/command/validators/__tests__/mustBeSurfaced.test.ts`
- `lib/command/validators/__tests__/mustBeAgent.test.ts`
- `lib/command/validators/__tests__/mustBePutTarget.test.ts`
- `obj/command/__tests__/PutController.test.ts` — see § 4.9
  acceptance list.
- `obj/command/__tests__/GiveController.test.ts` — see § 4.11
  acceptance list.
- Integration: a full session-level test that authors a table,
  apple, and quartermaster; runs the verb suite end-to-end;
  asserts final containment + restingOn state. Mirror existing
  controller-suite integration test patterns if they exist.

## 8. Build order

1. `Containable.ts` extension (restingOn field + accessors) +
   tests.
2. `Surfaced.ts` mixin + Mixins constant + MixinApi predicate +
   mixin tests.
3. `ContainmentApi.placeOn` method + move's invariant update +
   Api tests.
4. Validators (`mustBeSurfaced`, `mustBeAgent`,
   `mustBePutTarget`) + validator tests.
5. `DemoSurface` content class.
6. `put.yaml` + `PutController.ts` + controller tests.
7. `give.yaml` + `GiveController.ts` + controller tests.
8. Content seeds (table, apple, quartermaster).
9. DescribeApi extension for `restingOn`-grouped rendering (Q3).
10. Integration test.

## 9. Documentation sweep (post-merge)

- **New subsystem doc**: `docs/subsystems/affordance-verbs.md`
  — or fold into existing? Verbs are spread across the
  codebase today; there's no umbrella "verbs" subsystem doc.
  The right home is probably an extension to
  [docs/subsystems/spatial.md](../subsystems/spatial.md) (one
  section for Surfaced and the put/give verbs, since they're
  spatial-substrate consumers). Build agent decides; raise if
  this should be a new doc instead.
- **`docs/architecture.md`**: add `Surfaced` to the Available
  Mixins table.
- **`docs/antipatterns.md`**: no new rows expected; the verbs
  follow existing patterns.
- **`CLAUDE.md`**: subsystem reference list — add
  affordance-verbs.md if it becomes its own file.
- **Retire**: `docs/plans/affordance-verb-plan.md` (this
  file). The affordance-verb slate stays — it has remaining
  deferred items (`Pourable`, `Switchable`, etc.) listed in
  mixin-slate that compose with the same pattern but aren't
  in this build.

## 10. Out of scope (recap)

Per slate § What this slate does NOT cover:

- `read` / `Readable` / `Character.languages` — language slate.
- Sensory verbs — separate slate.
- `Edible` / `Drinkable` — race-followon territory.
- `Receiving` mixin for NPC consent — deferred.
- Preposition expansion (`under`, `behind`, `inside`) — deferred.
- `Pourable` and liquid-specific `put` semantics — different
  mechanic.
- Two-target word-order alternates (`give bob apple`) — keep
  the canonical `give apple to bob` shape.
- MQL `:on` chain operator — under Option D, the apple is in the
  room's contents and is findable via existing `:i` /
  bare-keyword resolution. A `:on` operator for filtering
  "specifically things resting on this surface" earns its slot
  when multi-surface disambiguation becomes a real player need.
