/**
 * WieldableMixin — body-side affordance: "this Stuff can be held in a
 * body-plan held position."
 *
 * Same shape as `WearableMixin`. A longbow declares
 * `[hand:left, hand:right]` on biped (two slots → two-handed). The
 * framework doesn't model "handedness" explicitly; it's just multi-
 * slot claims through `slotClaims`.
 *
 * Composes on `Stuff & Slottable + Containable` (the wieldable lives
 * in inventory before being wielded).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { CommandContributions } from '../../api/command';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import { SpeciesApi } from '../../api/species';
import { StuffApi } from '../../api/stuff';
import type { WeaponProfile } from '../combat/WeaponProfile';
// eslint-disable-next-line no-restricted-imports -- the G1 weapon face: a wieldable's isWeapon()/weaponProfile() forward into the combat logic singleton exactly as the api/combat facade does (the Combustible/Energized precedent)
import { CombatLogic } from '../../platform/idea/api/CombatLogic';

export interface Wieldable extends Slottable {
  /** Is this a WEAPON construction? (G1 — the weapons-check predicate) */
  isWeapon(): boolean;
  /** The delivery profile combat reads off this weapon, or null. */
  weaponProfile(): WeaponProfile | null;

  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  getSlotClaims(): Readonly<Record<string, readonly string[]>>;
  setSlotClaims(value: Record<string, string[]>): void;
}

export function WieldableMixin<
  TBase extends MixinConstructor<Stuff & Slottable & Containable>
>(Base: TBase) {
  return class WieldableMixin extends Base {
    static _mixinName = 'WieldableMixin';
    static fieldMeta: FieldMeta = {
      slotClaims: { persistent: true, authorable: true },
    };

    /**
     * A wieldable in inventory affords `wield`; once in hand it affords
     * `unwield` (the `get`/`drop` precedent on `ContainerMixin`). The
     * verbs shipped with the "Weapon is holdable" build; combat is the
     * consumer that wires the affordance so you can actually arm
     * yourself (a prerequisite for the melee gambits).
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [],
      // ⭐ `equip`/`unequip` are the orchestrators over BOTH kinds, so
      // either an item you can hold or one you can put on affords them.
      // Contributions from different mixins UNION (base classes shadow;
      // mixins do not), so naming them here and on `WearableMixin` is
      // additive rather than a conflict.
      // ⚠⚠ `inventory`, and this line is the bug that hid for a release:
      // the docstring above says "a wieldable IN INVENTORY affords
      // `wield`" and the code declared `environment` only — so the verb
      // vanished the moment you picked the thing up, which is precisely
      // when you want it. `wield <weapon>` answered "I don't understand
      // 'wield'" to a player holding the weapon.
      inventory: [
        'platform/cmd/inventory/wield.yaml',
        'platform/cmd/inventory/unwield.yaml',
        'platform/cmd/inventory/equip.yaml',
        'platform/cmd/inventory/unequip.yaml',
      ],
      environment: [
        'platform/cmd/inventory/wield.yaml',
        'platform/cmd/inventory/unwield.yaml',
        'platform/cmd/inventory/equip.yaml',
        'platform/cmd/inventory/unequip.yaml',
      ],
    };

    public slotClaims: Record<string, string[]> = {};

    public getSlotClaims(): Readonly<Record<string, readonly string[]>> {
      return this.slotClaims;
    }

    public setSlotClaims(value: Record<string, string[]>): void {
      this.slotClaims = value;
    }

    public getSlotClaim(bodyPlanPath: string): readonly string[] {
      return this.slotClaims[bodyPlanPath] ?? [];
    }

    public setSlotClaim(bodyPlanPath: string, slots: string[]): void {
      this.slotClaims[bodyPlanPath] = slots;
    }

    public getEligibleBodyPlans(): readonly string[] {
      return Object.keys(this.slotClaims);
    }

    public fitsSlot(host: Stuff & Slotted, slot: string): boolean {
      const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
      if (!bodyPlanPath) return false;
      return this.getSlotClaim(bodyPlanPath).includes(slot);
    }
    /**
     * Is this a WEAPON construction (bladed/pointed/hafted/flail/whip)?
     * The weapons-check predicate (G1 — a non-Wieldable item is not a
     * weapon by construction, so callers narrow `isWieldable` first).
     */
    public isWeapon(): boolean {
      return wieldableCombatLogic().isWeapon(this as unknown as Stuff);
    }

    /** The delivery profile combat reads off this weapon, or null. */
    public weaponProfile(): WeaponProfile | null {
      return wieldableCombatLogic().weaponProfileOf(this as unknown as Stuff);
    }
  };
}

/** Resolve the HMR-able CombatLogic singleton (the vocabulary reads). */
function wieldableCombatLogic(): CombatLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/combat',
    () => new CombatLogic(),
  );
}
