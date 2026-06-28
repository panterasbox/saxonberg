/**
 * Value — the uniform script value model.
 *
 * One notion of "a value" flows through every value-producing seam:
 * `set` / `$` / `( )` / block-yield. This is forward-compat commitment
 * #2 for piping — the deferred command value-channel (a dispatched
 * command's outlet) is designed as *just another source* of this same
 * `ScriptValue`, distinct from the effect envelope. v1's value
 * producers are literals, `$vars`, `( )` (MQL sets + infix), and
 * block-yield; the command outlet lands later, additively.
 *
 * The operations on a value live as statics on {@link ScriptValues}
 * (the value model is this module's one concept — a value-object class,
 * not a free-floating helper). `ScriptValues.isTruthy` is the single
 * home of the **MQL-set-emptiness-as-falsiness** rule (an empty result
 * set reads as false for `if` / `while`); every control-flow truthiness
 * test routes here so the rule is defined once.
 */

import { Block } from "./Block";
import type { Stuff } from "../stuff/Stuff";

/** A resolved set of objects — the plural `( )` / MQL result shape. */
export type StuffList = Stuff[];

/**
 * The value union. `undefined` is **void** — the value of a statement
 * with no value (a plain command in v1, an empty block). A single
 * `Stuff` and a `StuffList` are distinct: `( gus )` may yield one,
 * `( glasses on bar )` a list.
 */
export type ScriptValue =
  | string
  | number
  | boolean
  | Stuff
  | StuffList
  | Block
  | undefined;

/**
 * Operations over a {@link ScriptValue}. A static-only value-object —
 * the model's one concept, the home that keeps the truthiness rule (and
 * later the value→arg render + narrowing helpers) out of a free
 * function.
 */
export class ScriptValues {
  /**
   * Truthiness for control flow. The rules:
   *
   *  - `undefined` (void) → false.
   *  - boolean → itself.
   *  - number → `false` for `0` / `NaN`, else true.
   *  - string → non-empty.
   *  - `StuffList` → **non-empty** (the MQL-emptiness-is-falsiness rule).
   *  - `Block` → true (a block is a value).
   *  - any other object → a single `Stuff`, which is always truthy.
   *
   * Order matters: arrays and `Block` are tested before the catch-all
   * Stuff branch so an object isn't misclassified.
   */
  static isTruthy(value: ScriptValue): boolean {
    if (value === undefined) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
    if (typeof value === "string") return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Block) return true;
    // Remaining case: a single Stuff.
    return true;
  }

  /** True iff `value` is a {@link Block}. */
  static isBlock(value: ScriptValue): value is Block {
    return value instanceof Block;
  }

  /** True iff `value` is a `StuffList` (a resolved set). */
  static isList(value: ScriptValue): value is StuffList {
    return Array.isArray(value);
  }
}
