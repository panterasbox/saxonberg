/**
 * Tappable — **taking a renewable yield off a living thing, as an act.**
 *
 * ⭐⭐ A SIBLING of {@link Workable}, not a subtype of it, and the
 * distinction is load-bearing rather than fastidious. `planWork(by,
 * tool, what)` has no vessel slot, and more importantly *claiming a
 * lactating animal is worked ground* is a host-placement lie: ground
 * prices its own pace because ground is the thing being changed, while
 * a cow is not being improved by being milked. What the two genuinely
 * share is the RESULT vocabulary — a plan or a refusal, a duration, a
 * cost, prose for the actor and the room, and ⭐ **the credit the host
 * asks for** — so those types are imported unchanged rather than
 * re-declared.
 *
 * ## Why the default lives on the mixin
 *
 * `ProducingMixin` implements both halves, so a cow, a hive and a
 * sap-bearing tree get the whole act for free and override only what is
 * actually theirs: the hive's one-box-worth take, the tree's spile
 * phase. ⚠ The alternative — each host implementing the protocol — is
 * how three copies of the same twenty lines appear, and `rob` was
 * already the second.
 *
 * ## The credit moves to the HOST
 *
 * `WorkResult.credit` is what retires `TapController.discipline()`: the
 * animal answers `stockmanship` with a difficulty read off its own
 * handling, the hive answers `apiculture`, the tree `silviculture`. ⭐
 * A kernel controller then credits a trade's competence **without
 * knowing the trade exists**, which is the same seam ground uses.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Tooled } from '../craft/Tooled';
import type { Bulkable } from '../bulk/Bulkable';
import type { WorkPrognosis, WorkResult } from '../ground/Workable';

/**
 * The two halves every tap act shares.
 *
 * ⚠ `key` is the tap being drawn (`milk`, `honey`, `sap`), not the verb.
 * One host may carry several, and the verb is only ever one way of
 * naming one of them.
 */
export interface Tappable {
  /** Discriminates a tappable host for a narrowing that wants it. */
  readonly tappable: true;
  /**
   * What this take would be, or why not. ⭐ **No side effects** — the
   * refusal is where the object says what it is for, and planning it
   * must not cost anything.
   */
  planTap(
    by: Stuff,
    key: string,
    tool: (Stuff & Tooled) | null,
    vessel: (Stuff & Bulkable) | null,
    what: string | null,
  ): Promise<WorkPrognosis>;
  /** Land the take. Mints, pours, decrements, and names its credit. */
  completeTap(
    by: Stuff,
    key: string,
    tool: (Stuff & Tooled) | null,
    vessel: (Stuff & Bulkable) | null,
    token: unknown,
  ): Promise<WorkResult>;
}
