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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { LocomotionMode } from '../../platform/idea/LocomotionMode';
import { LocomotionApi } from '../../api/locomotion';
import { MixinApi } from '../../api/mixin';
import { Property } from '../stuff/Propertied';

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
  /**
   * Vehicular `LocomotionMode` this conveyance engages when driven
   * (e.g., `wheeled` for a cart, `sailed` for a rowboat). Authoring is
   * required: `LocomotionApi.resolveHostMode` throws on a Drivable
   * with `null` vehicularMode — surfacing the content-author bug
   * rather than silently walk-traversing a wheeled vehicle. Stored as
   * templatePath (a ref-shapes identity ref).
   */
  getVehicularMode(): LocomotionMode | null;
  setVehicularMode(value: LocomotionMode | null): void;
}

export function DrivableMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class DrivableMixin extends Base {
    static _mixinName = 'DrivableMixin';
    static fieldMeta: FieldMeta = {
      controllerSlot: { persistent: true, authorable: true },
      _vehicularModePath: { persistent: true, authorable: true, authorPicker: 'Template' },
    };

    /**
     * Default `'driver:1'` (not `'mount:1'`) — distinct from
     * `Mountable.mountSlot`'s default so a Stuff composing both
     * Mountable and Drivable doesn't collide rider and driver on the
     * same slot name. Authors can override to any `<role>:N` form.
     */
    public controllerSlot: string = 'driver:1';

    /**
     * Persistent path to the vehicular `LocomotionMode` singleton.
     * Defaults to `null` (unauthored); `setVehicularMode` writes the
     * mode's templatePath. `LocomotionApi.resolveHostMode` requires a
     * non-null value when the host has no `engagedMode` — driving
     * traversal flows always go through that resolver, so authoring
     * vehicularMode at template-time is mandatory for any Drivable
     * that's expected to actually be driven.
     */
    protected _vehicularModePath: string | null = null;

    public getVehicularMode(): LocomotionMode | null {
      if (this._vehicularModePath === null) return null;
      return LocomotionApi.modeOf(this._vehicularModePath);
    }

    public setVehicularMode(value: LocomotionMode | null): void {
      this._vehicularModePath =
        value === null ? null : (value.getTemplatePath() ?? null);
    }

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
     *
     * Cast: the mixin's `TBase extends MixinConstructor<Stuff & Slotted>`
     * constraint guarantees `this` IS `Stuff & Slotted`, but TypeScript
     * doesn't propagate that into the instance method's `this` type.
     * The cast bridges that gap. Removing it via `this:` annotations
     * cascades to every caller method and to a module-internal helper
     * type — net more ceremony than the single cast.
     */
    protected resolveControllerSlot(): SlotRef {
      return {
        host: this as unknown as Stuff & Slotted,
        name: this.controllerSlot,
      };
    }

    public isDriven(): boolean {
      const ref = this.resolveControllerSlot();
      return ref.host.isSlotOccupied(ref.name);
    }

    public getDriver(): (Stuff & Slottable) | null {
      const ref = this.resolveControllerSlot();
      return ref.host.getOccupant(ref.name);
    }
  };
}

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
