/**
 * ElectricityApi — the gated facade over the **conduction walk**: the
 * event that takes a live source, resolves the conductive-contact graph of
 * its location (containment / resting-on-surface / co-immersion in a shared
 * conductive pool) with the room's `Floor` as ground, divides current
 * toward ground by Ohm's law, and inflicts each bridged body accordingly.
 *
 * This is the layer above the per-element circuit primitives on
 * {@link MaterialApi} (`ohmsCurrent` / `bodyResistance` / …): those answer
 * "what current flows through this one resistance?"; this answers "given a
 * source in a room, who is bridged to ground through it, and how much
 * current passes through each?". Bird-on-a-wire, the one-hand rule,
 * grounding, and insulation are **emergent** from the graph, never scripted.
 *
 * The physics is the `Audible.emit` / `AudienceGather.gather` precedent — a
 * source pushes an effect out over a graph and collects one arrival per
 * affected body — but the graph is conductive contact, not room exits, and
 * it divides toward a ground sink. Final harm routes through the shipped
 * `ConditionApi.inflict` door (`{mechanism:'shock', current}`), never a
 * bespoke wound path.
 *
 * `conduct` is a **powerful primitive** (it wounds bodies). The logic lives
 * in the gated, hot-reloadable {@link ElectricityLogic} singleton at
 * `/platform/idea/api/electricity`; this Api is the thin forwarding shell. `dest
 * /platform/idea/api/electricity` reloads it.
 *
 * See `docs/subsystems/electricity.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ElectricityLogic } from '../platform/idea/api/ElectricityLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export type { ConductionOutcome } from '../lib/electricity/Energized';

const LOGIC_PATH = '/platform/idea/api/electricity';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ElectricityLogic', import.meta.url),
);

/** Resolve the HMR-able ElectricityLogic singleton (sync). */
function logic(): ElectricityLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ElectricityLogic',
      ) as typeof ElectricityLogic | null) ?? ElectricityLogic)(),
  );
}

export class ElectricityApi {
  /**
   * Does `node` have a conductive path to ground (the room's `Floor`)? The
   * grounding-legibility read: false for a body on a dry insulated step, in
   * rubber boots, or perched touching only a live node (bird-on-a-wire).
   */
  public static pathToGround(node: Stuff): boolean {
    return logic().pathToGround(node);
  }

  /** The ground node for `node`'s location (the room's conductive `Floor`),
   * or `null` when the room models none. */
  public static groundNodeFor(node: Stuff): Stuff | null {
    return logic().groundNodeFor(node);
  }
}

SecurityApi.decorateApiClass(ElectricityApi);
