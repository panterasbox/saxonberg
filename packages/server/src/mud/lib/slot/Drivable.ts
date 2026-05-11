/**
 * DrivableMixin — host-side conveyance: "this Stuff has a controller
 * slot a driver can occupy."
 *
 * Composes on `Stuff & Slotted` (default DrivableMixin). The seated
 * variant `SeatedDrivableMixin` composes on `Stuff & Drivable &
 * Container` and overrides the protected slot-resolution method to
 * point at a Containable seat (e.g., a car's driver-role seat).
 *
 * Public contract is two methods: `isDriven()` / `getDriver()`. The
 * slot-resolution method is `protected` (extension point for sibling
 * overrides), not part of the public Drivable interface — TypeScript
 * interfaces can't declare protected members.
 *
 * Naming note (resolved-decision #4): the protected extension method
 * is `resolveControllerSlot(): SlotRef`; the field accessor pair is
 * `getControllerSlot(): string` / `setControllerSlot(value)` — names
 * deliberately distinct to avoid collision.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import { MixinApi } from '../../api/mixin';

/**
 * Internal SlotRef — naming the (host, slot-name) pair the controller
 * sits at. Exported so sibling override mixins in the same family can
 * name the type, NOT as inter-Stuff contract.
 */
export interface SlotRef {
  host: Stuff & Slotted;
  name: string;
}

export interface Drivable {
  isDriven(): boolean;
  getDriver(): (Stuff & Slottable) | null;
  getControllerSlot(): string;
  setControllerSlot(value: string): void;
}

export function DrivableMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class DrivableMixin extends Base {
    static _mixinName = 'DrivableMixin';
    static persistentFields = ['controllerSlot'];

    public controllerSlot: string = 'mount:1';

    public getControllerSlot(): string {
      return this.controllerSlot;
    }

    public setControllerSlot(value: string): void {
      this.controllerSlot = value;
    }

    /**
     * Protected extension point. Default impl returns
     * `{ host: this, name: this.controllerSlot }`. SeatedDrivableMixin
     * overrides this to point at a driver-role seat in the host's
     * contents.
     */
    protected resolveControllerSlot(this: Stuff & Slotted): SlotRef {
      return {
        host: this,
        name: (this as unknown as { controllerSlot: string }).controllerSlot,
      };
    }

    public isDriven(this: Stuff & Slotted & Drivable): boolean {
      const ref = (this as unknown as {
        resolveControllerSlot(): SlotRef;
      }).resolveControllerSlot();
      return ref.host.isSlotOccupied(ref.name);
    }

    public getDriver(
      this: Stuff & Slotted & Drivable
    ): (Stuff & Slottable) | null {
      const ref = (this as unknown as {
        resolveControllerSlot(): SlotRef;
      }).resolveControllerSlot();
      return ref.host.getOccupant(ref.name);
    }
  };
}

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

    protected resolveControllerSlot(
      this: Stuff & Drivable & Container
    ): SlotRef {
      const driverSeat = this.getContents().find(s => {
        if (!MixinApi.isPropertied(s)) return false;
        // Use the Property convention by string key — avoids importing
        // the Property class here.
        const role = (s as unknown as {
          getProp?(p: { name: string }): unknown;
        }).getProp?.({ name: 'role' });
        return role === 'driver';
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
      return { host: driverSeat as Stuff & Slotted, name: 'sit:1' };
    }
  };
}
