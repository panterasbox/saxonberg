/**
 * ThermalApi — the gated facade over the **heat-delivery** primitives that
 * the mixin-only {@link ThermalMixin} deliberately keeps off its own class
 * surface. `ThermalMixin` owns the passive read side (`getTemperature` /
 * `getSurfaceTemperature` / the Newton-cooling reconcile); this Api owns the
 * *active* side — delivering heat into an object so its temperature RISES
 * (the reconcile alone only cools toward ambient).
 *
 * `depositHeat` is the keystone: `ΔT = Q / C` on the shipped sync model, with
 * thermal inertia (`C = mass × specificHeat`) gating the rise — the same
 * joules barely warm a heavy log but shove a small flame hot. Ignition,
 * fire spread, and (later) the phase-change reconcile + the inert
 * crafting-reachability read all drive through this door, never a bespoke
 * temperature poke.
 *
 * The logic lives in the gated, hot-reloadable {@link ThermalLogic} singleton
 * at `/obj/api/thermal`; this Api is the thin forwarding shell. `dest
 * /obj/api/thermal` reloads it.
 *
 * See `docs/subsystems/thermal.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ThermalLogic } from '../obj/api/ThermalLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/thermal';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ThermalLogic', import.meta.url),
);

/** Resolve the HMR-able ThermalLogic singleton (sync). */
function logic(): ThermalLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ThermalLogic',
      ) as typeof ThermalLogic | null) ?? ThermalLogic)(),
  );
}

export class ThermalApi {
  /**
   * Deposit `joules` of heat into `stuff`, raising its temperature by
   * `ΔT = Q / C` (heat capacity `C = mass × specificHeat`) and re-anchoring
   * its drift clock. The single heat-DELIVERY primitive — ignition, spread,
   * and phase change all drive through it. Thermal inertia gates the rise, so
   * a match's joules barely warm a beam but shove a shaving hot; that gate is
   * exactly what makes ignition ("did the delivered heat cross autoignition?")
   * a real, derivable energy balance. A negative `joules` removes heat (a
   * douse). No-op on a non-Thermal `stuff` or a host with no heat capacity
   * (massless — it re-equilibrates to ambient instantly). The read stays SYNC.
   */
  public static depositHeat(stuff: Stuff, joules: number): void {
    logic().depositHeat(stuff, joules);
  }

  /**
   * Reconcile `stuff`'s phase against its temperature — the bidirectional
   * phase-change pass, driven by any heat source (a hearth, the sun, a fire).
   * A **Meltable** solid at/above its melting point holds the temperature at a
   * latent-heat plateau and, once the latent heat is absorbed, melts — flowing
   * its mass to a molten pool in the scope's `Floor`. A **Bulkable** vessel
   * holding a liquid boils it to gas above the boiling point, or solidifies it
   * to a cast solid below the melting point. Unlocks ice → water → steam from
   * the shipped water material. No-op on anything with no phase behavior.
   */
  public static reconcilePhase(stuff: Stuff): void {
    logic().reconcilePhase(stuff);
  }

  /**
   * The maximum sustained temperature (K) reachable from `position` — the
   * hottest lit furnace in its scope (the crafting emergent-reachability
   * principle applied to heat). Returns 0 when nothing hot is in reach.
   *
   * **The inert heat-as-crafting-control seam.** Built + tested, consumed by
   * NO recipe this build: the future smithing branch will gate on it as its
   * temperature `control` (a recipe needs `reachableHeatFor(maker) >=
   * material.meltingPoint`) with zero retrofit. Homed in thermal (heat, not
   * fire).
   */
  public static reachableHeatFor(position: Stuff): number {
    return logic().reachableHeatFor(position);
  }
}

SecurityApi.decorateApiClass(ThermalApi);
