/**
 * SeatedDrivableMixin — the seated variant of {@link DrivableMixin}: a
 * Drivable whose driver sits in a SEAT among its contents (a car's
 * driver-role seat, a carriage's box) rather than in a slot on the host.
 * It overrides `DrivableMixin`'s protected `resolveControllerSlot` to
 * point at that seat's `sit:1` slot.
 *
 * ⚠ No production composer today — the transport pack's `Coach` declines
 * it (see `Coach.ts`); whether it should exist at all is the conveyance
 * owner's call.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Drivable, SlotRef } from './Drivable';
import { MixinApi } from '../../api/mixin';
import { Property } from '../stuff/Propertied';

/**
 * The `role` property a `SeatedDrivableMixin` host expects on each
 * seat in its contents. The seat whose role is `'driver'` becomes the
 * controller slot's host.
 */
const ROLE_PROP = Property.of<string>('role');

/**
 * Sibling override for cross-Stuff Drivables (cars, sedans, carriages
 * with driver-on-box). Looks up the driver-role seat in the host's
 * contents and points at its `sit:1` slot.
 *
 * Composition constraint: `Stuff & Drivable & Container`.
 */
export function SeatedDrivableMixin<
  TBase extends MixinConstructor<Stuff & Drivable & Container>
>(Base: TBase) {
  return class SeatedDrivableMixin extends Base {
    static _mixinName = 'SeatedDrivableMixin';

    protected resolveControllerSlot(this: Stuff & Drivable & Container): SlotRef {
      const driverSeat = this.getContents().find(s => {
        if (!MixinApi.isPropertied(s)) return false;
        return s.getProp(ROLE_PROP) === 'driver';
      });
      if (!driverSeat) {
        throw new Error(
          `SeatedDrivable ${this.stuffId}: no driver-role seat in contents`
        );
      }
      if (!MixinApi.isSlotted(driverSeat)) {
        throw new Error(
          `SeatedDrivable ${this.stuffId}: driver seat is not Slotted`
        );
      }
      return { host: driverSeat, name: 'sit:1' };
    }
  };
}
