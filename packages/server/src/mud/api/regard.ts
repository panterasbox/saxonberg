/**
 * RegardApi — the **per-viewer attitude** seam: how a viewer regards a
 * subject (likes / trusts / esteems), stored as a signed scalar per
 * directed `(viewer → subject)` pair. The third belief realm (a sibling
 * of recognition and identification), the per-viewer leg D&D charisma
 * unbundles into, and the reciprocation primitive of the future
 * reputation / cooperative-polity Sybil keystone. See
 * `docs/subsystems/belief.md`.
 *
 * The belief store (`lib/belief/BeliefStore.ts`) stays **dumb CRUD**: it
 * holds the scalar but does no arithmetic. All attitude logic — the
 * read-modify-write delta, the normative `-100..+100` clamp, and the
 * eventual read-time decay — lives in the hot-reloadable
 * {@link RegardLogic} singleton at `/obj/api/regard`, reached
 * synchronously via `StuffApi.singletonSync`. This Api is a thin
 * forwarding shell. `dest /obj/api/regard` reloads it.
 *
 * Regard is **kind-agnostic**: it stores no player/NPC marker and the
 * same path handles player↔player, player↔NPC, NPC↔player, NPC↔NPC. The
 * player/NPC distinction (trust-weighting, susceptibility) is a deferred
 * *consumer* concern, never the edge's.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { RegardLogic } from '../obj/api/RegardLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/regard';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/RegardLogic', import.meta.url)
);

/** Resolve the HMR-able RegardLogic singleton (sync). */
function logic(): RegardLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'RegardLogic'
      ) as typeof RegardLogic | null) ?? RegardLogic)()
  );
}

export class RegardApi {
  /**
   * The viewer's current regard for `subject` — a signed scalar in
   * `-100..+100`. Returns `0` when the viewer holds no opinion (no
   * record, a keyless subject, or a non-belief-holding viewer).
   */
  public static getRegard(viewer: Stuff, subject: Stuff): number {
    return logic().getRegard(viewer, subject);
  }

  /**
   * Move the viewer's regard for `subject` by `delta` (signed),
   * clamped into `-100..+100`. The accumulator — reads the current
   * value, adds, writes back. No-ops for a non-belief-holding viewer or
   * a keyless subject.
   */
  public static adjustRegard(
    viewer: Stuff,
    subject: Stuff,
    delta: number
  ): void {
    logic().adjustRegard(viewer, subject, delta);
  }

  /**
   * Set the viewer's regard for `subject` to an absolute value, clamped
   * into `-100..+100`.
   */
  public static setRegard(viewer: Stuff, subject: Stuff, value: number): void {
    logic().setRegard(viewer, subject, value);
  }

  /**
   * Clear the viewer's regard for `subject` (back to "no opinion"). The
   * belief record itself is kept; only the regard field is dropped.
   */
  public static clearRegard(viewer: Stuff, subject: Stuff): void {
    logic().clearRegard(viewer, subject);
  }

  /**
   * Every regard the viewer holds, as `referent (templatePath) → value`.
   * A read-only snapshot for consumers (renown aggregation, display).
   * Empty for a non-belief-holding viewer.
   */
  public static regardsHeldBy(viewer: Stuff): ReadonlyMap<string, number> {
    return logic().regardsHeldBy(viewer);
  }
}

SecurityApi.decorateApiClass(RegardApi);
