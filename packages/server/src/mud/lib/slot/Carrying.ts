/**
 * CarryingMixin — **the one way a thing comes onto a body.**
 *
 * ⭐ `receive(item, opts)` is the receiving act (size-and-carrying D11): a
 * body is handed something — it picks it up, is given it, makes it, is
 * granted it — and the body decides where it goes. The census
 * (`lint:body-moves`) counts every caller that still does
 * `ContainmentApi.move(item, <a body>)` directly; the ports move them here,
 * and the flip (W7) installs the destination veto that makes this the only
 * way on.
 *
 * ⚠ **W0: it behaves exactly as today.** `receive` without a slot is
 * `ContainmentApi.move(item, this)` — the thing lands loose in the body's
 * contents, as every caller's direct move does now; with `slot:` it is
 * `seatInSlot` (equip's claim). No hand is chosen, nothing is refused, the
 * `carry.order` setting is declared and not yet read, and the
 * `'loose-on-body'` veto is NOT installed. Later waves give it hands
 * (D9–D10), homes (D14), worn containers in tier order (D15) and
 * `canReceive` (D-W7a); its signature already carries the refusal so no
 * caller changes shape when they land.
 *
 * ## Why `lib/slot/` and not `lib/embodiment/`
 *
 * The plan named `lib/embodiment/`, which does not exist: the folder that
 * owns the body-side affordances (`Wearable`, `Wieldable`, `Attired`,
 * `Slotted`) is `lib/slot/` (embodiment.md's own table). A carrier's hands
 * are slots and `receive` seats into them, so it lives beside them.
 *
 * ## Composition
 *
 * On `Creature`, outer of `Attired` and inner of `LoadBearing` — it reads
 * the slot substrate (inner) and the burden gauge will read what it placed
 * (outer). Needs `Slotted` (the hands) beneath it and `Container` (the
 * body's contents) on the finished host, both of which `Creature` composes.
 *
 * Operational reference: `docs/plans/size-and-carrying-plan.md` (D11) until
 * the flip graduates `docs/subsystems/carrying.md`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { ActRefusal } from '../craft/ActPlan';
import { ContainmentApi } from '../../api/containment';
import { SettingTypes, type SettingsSchemaEntry } from '../shell/Environment';

/** The order a carrier tries its places in (`carry.order`, D11). */
export const CARRY_ORDERS = ['hands-first', 'pockets-first'] as const;
export type CarryOrder = (typeof CARRY_ORDERS)[number];

/** What `receive` is asked to do. Every field is optional. */
export interface ReceiveOptions {
  /** Overrides `carry.order` for this one act. */
  prefer?: 'hands' | 'pockets';
  /** Pins the destination to a slot (equip's claim) — `seatInSlot`. */
  slot?: string;
  /** Held in the hands, or put on (`wear` → the garment's whole claim). */
  for?: 'hold' | 'wear';
}

/** Why a body cannot take a thing (D11). W0 never refuses. */
export type ReceiveRefusal = ActRefusal<'nowhere-to-carry' | 'cannot-grip' | 'too-heavy'>;

export interface Carrying {
  /**
   * **Take `item` onto this body.** `null` when it came on; a refusal (in
   * reasons the controller words) when it could not — and then nothing
   * moved.
   *
   * ⚠ W0 resolves to today's behavior: without `slot`, the thing lands in
   * this body's contents (`ContainmentApi.move(item, this)`); with `slot`,
   * it is seated there (`seatInSlot`). It never refuses yet.
   */
  receive(item: Stuff & Containable, opts?: ReceiveOptions): ReceiveRefusal | null;
}

// ⚠ The base constraint is `Slotted` only: `Container` composes OUTER of
// this on `Creature` (it wraps the whole body stack), so the host is a
// container at runtime but not yet at this rung's type — the same cast
// `Slotted.seatInSlot` makes.
export function CarryingMixin<TBase extends MixinConstructor<Stuff & Slotted>>(Base: TBase) {
  return class CarryingMixin extends Base {
    static _mixinName = 'CarryingMixin';

    /**
     * `carry.order` — where a carrier tries first when it is handed a
     * thing: its free hands, or its worn containers. Read by `receive`
     * once hands and the tiers land (W4/W5); declared at W0 so the key,
     * its values and its help line exist from the first wave.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'carry.order',
        type: SettingTypes.Enum,
        default: 'hands-first',
        enumValues: [...CARRY_ORDERS],
        description:
          'Where a thing you are handed goes first: `hands-first` (a free ' +
          'hand, then your pockets and packs) or `pockets-first` (your ' +
          'pockets and packs, then a free hand). Either way, when nothing ' +
          'fits you are told so and nothing moves.',
      },
    ];

    public receive(item: Stuff & Containable, opts: ReceiveOptions = {}): ReceiveRefusal | null {
      const self = this as unknown as Stuff & Container & Slotted;
      if (opts.slot !== undefined) {
        self.seatInSlot(item as Stuff & Containable & Slottable, opts.slot);
        return null;
      }
      ContainmentApi.move(item, self);
      return null;
    }
  };
}
