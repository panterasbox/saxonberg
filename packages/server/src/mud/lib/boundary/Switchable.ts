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
 */

import type { MixinConstructor } from '../mixin';

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
  return class SwitchableMixin extends Base {
    static _mixinName = 'SwitchableMixin';

    static persistentFields = ['on'];

    /**
     * Backing storage; access via `isOn()` / `setOn()`.
     *
     * @authorable
     */
    private _on: boolean = false;

    /** Predicate getter. */
    isOn(): boolean {
      return this._on;
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`on: 1`) crashes loudly at hydrate time
     * rather than being silently coerced.
     */
    setOn(value: boolean): void {
      if (typeof value !== 'boolean') {
        throw new TypeError(
          `Switchable.on must be a boolean, got ${typeof value}`
        );
      }
      this._on = value;
    }

    /** Switch on. Idempotent — switching an already-on one is a no-op. */
    switchOn(): void {
      this._on = true;
    }

    /** Switch off. Idempotent — switching an already-off one is a no-op. */
    switchOff(): void {
      this._on = false;
    }
  };
}
