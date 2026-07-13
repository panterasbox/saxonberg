/**
 * LockableMixin — binary locked/unlocked state, composed onto Door
 * beneath Sealable.
 *
 * A locked door refuses traversal *before* the closed-door gate fires
 * (see `Exit.canTraverse`), so a locked door reports "locked" rather
 * than "closed". Mirrors `SealableMixin` on the locked axis; the two
 * fields (`locked`, `open`) are distinct and coexist on a Door.
 *
 * Scope is intentionally narrow: `isLocked()` / `setLocked()` (the
 * predicate/setter pair), plus `lock()` / `unlock()` (the action verbs).
 * v1 carries no key/credential model — the crossing gate is seeded
 * permanently locked and soft-walled in dialogue. Keys are a future
 * phase.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`locked`); the predicate getter uses
 * the `is` prefix (`isLocked()`). Reads naturally at every site:
 * `door.setLocked(true)`, `door.isLocked()`, `data: { locked: true }`.
 */

import type { MixinConstructor } from '../mixin';

/**
 * Public shape added by LockableMixin. `isLocked()` (predicate getter) /
 * `setLocked()` (noun setter) is the inter-Stuff contract surface;
 * `lock()` / `unlock()` are the action-shaped mutators.
 */
export interface Lockable {
  isLocked(): boolean;
  setLocked(value: boolean): void;
  lock(): void;
  unlock(): void;
}

export function LockableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LockableMixin extends Base {
    static _mixinName = 'LockableMixin';

    static persistentFields = ['locked'];

    /**
     * Backing storage; access via `isLocked()` / `setLocked()`.
     *
     * @authorable
     */
    private _locked: boolean = false;

    /** Predicate getter. */
    isLocked(): boolean {
      return this._locked;
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`locked: 1`) crashes loudly at hydrate
     * time rather than being silently coerced.
     */
    setLocked(value: boolean): void {
      if (typeof value !== 'boolean') {
        throw new TypeError(
          `Lockable.locked must be a boolean, got ${typeof value}`
        );
      }
      this._locked = value;
    }

    /** Lock it. Idempotent — locking an already-locked one is a no-op. */
    lock(): void {
      this._locked = true;
    }

    /** Unlock it. Idempotent — unlocking an already-unlocked one is a no-op. */
    unlock(): void {
      this._locked = false;
    }
  };
}
