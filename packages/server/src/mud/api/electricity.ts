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
 * `/obj/api/electricity`; this Api is the thin forwarding shell. `dest
 * /obj/api/electricity` reloads it.
 *
 * See `docs/subsystems/electricity.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Energized } from '../lib/electricity/Energized';
import type { Quantity } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ElectricityLogic } from '../obj/api/ElectricityLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

/** One body reached by a conduction event: who, and the current through it. */
export interface ConductionOutcome {
  /** The bridged body the current passed through. */
  victim: Stuff;
  /** The current that actually passed through this body (A). */
  currentThrough: Quantity<'A'>;
}

const LOGIC_PATH = '/obj/api/electricity';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ElectricityLogic', import.meta.url),
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
   * The conduction **event**. Walks the conductive-contact graph of
   * `source`'s location, computes the current through every body bridged
   * between the source's potential and ground, and inflicts each via
   * `ConditionApi.inflict({mechanism:'shock', current})`. Faction-blind — a
   * pool hazard hits everyone bridged to it, allies included. Returns one
   * `ConductionOutcome` per body that took current (empty when nothing was
   * bridged, or the source is dead / switched off).
   */
  public static conduct(source: Stuff & Energized): ConductionOutcome[] {
    return logic().conduct(source);
  }

  /**
   * The probe — the current that would pass through `victim` from `source`
   * right now, WITHOUT inflicting anything (the multimeter / analyze / test
   * seam). `0 A` when `victim` isn't bridged (no live contact, no ground
   * path, an insulator breaking either leg).
   */
  public static currentThrough(
    source: Stuff & Energized,
    victim: Stuff,
  ): Quantity<'A'> {
    return logic().currentThrough(source, victim);
  }

  /**
   * A **direct two-terminal contact shock** — a stun baton / taser. A contact
   * device completes its own circuit through its electrodes on the victim, so
   * it needs no ground path and no conductive medium: `I = V / R_body`
   * straight through the contact, inflicted via the same
   * `ConditionApi.inflict({mechanism:'shock'})` door as the ambient walk.
   * The combat toe-hold — a landed baton hit routes here, never the
   * mechanical fold. Returns the (single) outcome, or empty for a dead source
   * / non-body victim.
   */
  public static shockContact(
    source: Stuff & Energized,
    victim: Stuff,
  ): ConductionOutcome[] {
    return logic().shockContact(source, victim);
  }

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
