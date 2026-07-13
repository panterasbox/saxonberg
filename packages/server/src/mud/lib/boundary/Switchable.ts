/**
 * SwitchableMixin — binary on/off state for things that can be switched.
 *
 * The Sealable of the electrical world: a lamppost, a beacon, a wall
 * switch, a machine. Global `switch`/`toggle` controllers target any
 * Switchable in scope rather than a specific class — the surface is the
 * same shape as open/close over Sealable.
 *
 * Scope is intentionally narrow: `isOn()` / `setOn()` (the
 * predicate/setter pair), plus `switchOn()` / `switchOff()` (the action
 * verbs). Mirrors `SealableMixin` on the on/off axis.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`on`); the predicate getter uses the
 * `is` prefix (`isOn()`). Reads naturally at every site:
 * `lamp.setOn(true)`, `lamp.isOn()`, `data: { on: true }`.
 *
 * No `get on() / set on()` accessor pair is declared — it would collide
 * with nothing but the noun-form runtime-shape validation lives in
 * `setOn` directly (the Hydrator's Phase 1 tries `setOn` first).
 *
 * The guarded-boolean storage is delegated to `BistateMixin` (the
 * shared substrate under Sealable/Switchable/Foldable); this mixin is
 * the on/off naming layer over `getState()` / `setState()`.
 */

import type { MixinConstructor } from '../mixin';
import { BistateMixin, type BistateInternal } from '../Bistate';

/**
 * Public shape added by SwitchableMixin. `isOn()` (predicate getter) /
 * `setOn()` (noun setter) is the inter-Stuff contract surface;
 * `switchOn()` / `switchOff()` are the action-shaped mutators.
 */
export interface Switchable {
  isOn(): boolean;
  setOn(value: boolean): void;
  switchOn(): void;
  switchOff(): void;
}

export function SwitchableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SwitchableMixin extends BistateMixin(Base) {
    static _mixinName = 'SwitchableMixin';

    static persistentFields = ['on'];

    /** Predicate getter. */
    isOn(): boolean {
      return (this as unknown as BistateInternal).getState();
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`on: 1`) crashes loudly at hydrate time
     * rather than being silently coerced.
     */
    setOn(value: boolean): void {
      (this as unknown as BistateInternal).setState(value, 'Switchable.on');
    }

    /** Switch on. Idempotent — switching an already-on one is a no-op. */
    switchOn(): void {
      (this as unknown as BistateInternal).setState(true, 'Switchable.on');
    }

    /** Switch off. Idempotent — switching an already-off one is a no-op. */
    switchOff(): void {
      (this as unknown as BistateInternal).setState(false, 'Switchable.on');
    }
  };
}
