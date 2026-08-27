/**
 * ArrayApi — small library of generic array utilities. Lives at the
 * public Api layer so any subsystem can reach for the standard shape
 * instead of hand-rolling another length-then-loop comparison.
 *
 * v1 ships two predicates that recurred during the MQL drill-additive
 * work — element-wise equality and prefix membership — both
 * generalized over the element type. Anticipated to grow as more
 * cross-cutting array operations surface; the surface is broad
 * enough that bundling them under one Api is preferable to scattering
 * one-off helpers across consumers.
 *
 * Element equality is `===` (Object.is by way of strict equality).
 * Callers comparing structurally-equal-but-distinct objects need to
 * pre-canonicalize.
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link ArrayLogic} singleton at
 * `/platform/idea/api/array`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /platform/idea/api/array` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ArrayLogic } from '../platform/idea/api/ArrayLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/array';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ArrayLogic', import.meta.url)
);

/** Resolve the HMR-able ArrayLogic singleton (sync). */
function logic(): ArrayLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ArrayLogic'
      ) as typeof ArrayLogic | null) ?? ArrayLogic)()
  );
}

export class ArrayApi {
  /**
   * Element-wise equality. `true` when both arrays have the same
   * length and every paired element matches under `===`.
   *
   * Cheap reference-identity short-circuit at the top — `equal(a, a)`
   * skips the per-element walk.
   */
  static equal<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
    return logic().equal(a, b);
  }

  /**
   * Prefix membership. `true` when `prefix` is element-wise equal to
   * the leading slice of `full` (including the empty-prefix and
   * equal-arrays cases). Element comparison is `===`.
   *
   * `isPrefix([], anything)` is `true` (empty prefix matches
   * everything); `isPrefix(x, x)` is `true` (a sequence is a prefix
   * of itself).
   */
  static isPrefix<T>(
    prefix: ReadonlyArray<T>,
    full: ReadonlyArray<T>
  ): boolean {
    return logic().isPrefix(prefix, full);
  }
}

SecurityApi.decorateApiClass(ArrayApi);
