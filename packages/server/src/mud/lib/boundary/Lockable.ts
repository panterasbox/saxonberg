/**
 * LockableMixin — a thing that can be locked: **a keyway and a bolt.**
 *
 * ## ⭐⭐⭐ Why this is one mixin and not two systems
 *
 * For most of this project there were two lock models and neither was a
 * lock. This mixin was a **bolt with no key** — a boolean anybody could
 * throw on anything, so `lock front doors` would have locked a
 * university's doors for every player alive, with no key, no credential
 * and no title consulted. And `lib/lock/Lock.ts` was a **keyway with no
 * bolt** — `{keyway, technology}` carried by three Exit subclasses
 * (`KeyedDoorExit`, `FrontDoorExit`, `DormDoor`) that check
 * `opensFor(mover)` at traversal and are therefore *permanently* locked:
 * you could never leave your own door open for a friend.
 *
 * They were strictly disjoint — the bolt-bearing `Door` Things had no
 * keyway, and the keyway-bearing exits carry no `Door` at all — which is
 * why `lock.yaml` and `unlock.yaml` shipped and stayed afforded by
 * nothing. Conferring either one over either half would have afforded a
 * verb that lies.
 *
 * ⭐ A real door has both facts, and they are independent: **which key it
 * accepts** (the keyway, its identity — re-keying mints a fresh one and
 * old keys stop matching) and **whether the bolt is currently thrown**
 * (which is what a person changes when they leave the house). So:
 *
 * ```
 * canPass(mover)  =  !isLocked()  ||  opensFor(mover)
 * ```
 *
 * A key-holder never has to `unlock` to get through — that is the
 * keyed-exit behaviour this preserves exactly. **Unlocking is for
 * letting everyone ELSE through**, which is the capability the old model
 * had no way to express.
 *
 * ⚠ An empty keyway opens for nobody ({@link Lock.opensFor} returns
 * false), so a row that authors `locked: true` and no keyway is a door
 * no key in the world fits. That is deliberate and it is how the
 * university gate keeps working with its content row untouched: *shut,
 * chained, and locked — the gown's, not the town's.*
 *
 * ## The two surfaces, and which is which
 *
 * - `isLocked()` / `setLocked()` — **the bolt.** State, no authority:
 *   the authoring setter (the TemplateApplier's `set<Field>` dispatch),
 *   the Exit family and the provisioning acts move it directly.
 * - `lock(by)` / `unlock(by)` — **the act.** ⭐ The keyway is asked HERE
 *   (controller-liquidity D9), so every caller of the act meets it, not
 *   only the `lock` verb; the controller words the refusal.
 * - `opensFor(mover)` — **the authority.** Does this mover present a key
 *   that fits? `lock`/`unlock` ask it, and `Exit.canTraverse` asks it
 *   before refusing passage.
 *
 * ⭐ `getLock()` is a **policy seam**: it builds the value object from
 * this host's own fields, and a subclass whose keyway lives somewhere
 * else overrides it. `KeyedDoorExit` does exactly that — its keyway is a
 * sync read off the owning `HoldingWarren`, so the warren stays the one
 * record of a holding's identity and re-keying it re-keys every door.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter
 * and YAML key use the noun form (`locked`); the predicate getter uses
 * the `is` prefix (`isLocked()`).
 */

import { Lock, type LockType } from '../lock/Lock';
import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';

/**
 * Why a `lock`/`unlock` act was refused. ⭐ The ORDER is the method's
 * (controller-liquidity D9): the visible state first — a character can SEE
 * a thrown bolt — and the secret (does your key fit?) only once the act
 * would otherwise go through.
 */
export type LockRefusalReason = 'already-locked' | 'already-unlocked' | 'no-key';

/** The answer to `lock(by)` / `unlock(by)`. */
export type LockAnswer = ActOutcome | ActRefusal<LockRefusalReason>;

/**
 * Public shape added by LockableMixin. `isLocked()` / `setLocked()` is
 * the bolt's inter-Stuff contract surface; `lock(by)` / `unlock(by)` are
 * its acts, which ask the keyway; `opensFor()` and `getLock()` are the keyway's.
 */
export interface Lockable {
  isLocked(): boolean;
  setLocked(value: boolean): void;
  /** Throw the bolt as `by` — refuses `already-locked`, then `no-key`. */
  lock(by: Stuff): LockAnswer;
  /** Withdraw the bolt as `by` — refuses `already-unlocked`, then `no-key`. */
  unlock(by: Stuff): LockAnswer;
  /** The lock this thing carries — keyway + technology. */
  getLock(): Lock;
  /** Whether `mover` presents a key that fits this lock. */
  opensFor(mover: Stuff): boolean;
  getKeyway(): string;
  setKeyway(value: string): void;
  getLockTechnology(): LockType;
  setLockTechnology(value: LockType): void;
}

export function LockableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LockableMixin extends Base {
    static _mixinName: string = 'LockableMixin';

    static fieldMeta: FieldMeta = {
      locked: { persistent: true, authorable: true },
      /**
       * ⭐⭐ `spoiler: 1` with `spoilerName: 0` — the `Material.density`
       * shape, and for the same reason: **the existence is schema and
       * only the value is content.** *A door has a keyway* is what
       * `help` and the generated docs publish; WHICH keyway is the
       * secret, because two doors sharing one is exactly what a reader
       * must hold a key to learn. ⚠ Surfacing the token on a wiki
       * composition panel would hand that over for free.
       */
      keyway: {
        persistent: true,
        authorable: true,
        spoiler: 1,
        spoilerName: 0,
      },
      /**
       * ⭐ NOT a spoiler: a brass pin-tumbler and a card reader look
       * different, so the technology is something you read off the door
       * by standing in front of it.
       */
      lockTechnology: { persistent: true, authorable: true },
    };

    /**
     * The bolt. Backing storage; access via `isLocked()`/`setLocked()`.
     *
     * ⭐ Unbolted unless the row says `locked: true` — a keyed door's row
     * does (`/system/residence/thing/boundaries/keyed-door`, the dorm
     * door). The `boltedByDefault` hook this used to read lost its last
     * overrider when the keyed-exit classes became rows (boundary build),
     * and was removed (`lint:unconsumed-seams`). A persisted `locked`
     * hydrates over this default, so the player's last act survives.
     */
    private _locked: boolean = false;

    /**
     * The lock's identity. ⚠ Empty by default, and an empty keyway opens
     * for NOBODY — so a `locked: true` row with no keyway is sealed
     * rather than accidentally open.
     */
    private _keyway: string = '';

    /** The lock technology a key must match. */
    private _lockTechnology: LockType = 'pin-tumbler';

    /** Predicate getter — is the bolt thrown? */
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
          `Lockable.locked must be a boolean, got ${typeof value}`,
        );
      }
      this._locked = value;
    }

    /**
     * Throw the bolt, as `by`. ⭐⭐ **The authority lives here, not in the
     * verb** (controller-liquidity D9): a replaced `lock` controller, a
     * brain or a script meets the same keyway. Visible state first
     * (`already-locked` — anybody can see a thrown bolt), the secret second
     * (`no-key` — asked only once the act would otherwise go through).
     */
    lock(by: Stuff): LockAnswer {
      if (this.isLocked()) return { ok: false, reason: 'already-locked' };
      if (!this.opensFor(by)) return { ok: false, reason: 'no-key' };
      this.setLocked(true);
      return { ok: true, facts: undefined };
    }

    /** Withdraw the bolt, as `by`. The same order as {@link lock}. */
    unlock(by: Stuff): LockAnswer {
      if (!this.isLocked()) return { ok: false, reason: 'already-unlocked' };
      if (!this.opensFor(by)) return { ok: false, reason: 'no-key' };
      this.setLocked(false);
      return { ok: true, facts: undefined };
    }

    getKeyway(): string {
      return this._keyway;
    }

    setKeyway(value: string): void {
      this._keyway = value;
    }

    getLockTechnology(): LockType {
      return this._lockTechnology;
    }

    setLockTechnology(value: LockType): void {
      this._lockTechnology = value;
    }

    /**
     * The lock this thing carries.
     *
     * ⭐ The policy seam. The default builds it from this host's own two
     * fields; a host whose keyway is owned by something else overrides
     * this and nothing downstream changes.
     */
    getLock(): Lock {
      return new Lock(this._keyway, this._lockTechnology);
    }

    /**
     * Whether `mover` presents a key that fits — a synchronous wallet
     * scan, safe to call from a traversal gate. ⚠ Says nothing about the
     * bolt: ask `isLocked()` for that.
     */
    opensFor(mover: Stuff): boolean {
      return this.getLock().opensFor(mover);
    }
  };
}
