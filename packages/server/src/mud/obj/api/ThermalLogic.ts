// ThermalLogic — the hot-reloadable logic singleton behind ThermalApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Bulkable, BulkAffordance } from '../../lib/bulk/Bulkable';
import type { Thermal } from '../../lib/thermal/Thermal';
import type { Meltable } from '../../lib/thermal/Meltable';
import type Material from '../../lib/material/Material';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { THERMAL_DEFAULTS } from '../../lib/thermal/Thermal';
import { Quantity } from '../../lib/quantity';

const ThermalApiCallers = SecurityPolicies.FromModule(
  '/api/thermal#ThermalApi',
);

/**
 * ThermalLogic — the hot-reloadable logic singleton behind
 * {@link ThermalApi}.
 *
 * Lives at `/obj/api/thermal` (a stateless `Stuff` singleton, no backing
 * `Template`); `ThermalApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Homes the **heat-delivery** primitives the
 * mixin-only `ThermalMixin` deliberately kept off its own class surface:
 * `depositHeat` (raise an object's temperature by `ΔT = Q/C`) drives ignition,
 * spread, and phase change; the phase-change reconcile and the inert
 * crafting-reachability read join it in later phases. Holds NO state and NO
 * tick handles — every method is a pure per-call computation over the host's
 * shipped `ThermalMixin` reconcile. Internal sub-logic (when it lands) lives
 * in module-private free functions, so there are no intra-singleton
 * `this.x()` calls to trip the gate; each public method carries the
 * `FromModule` gate. `dest /obj/api/thermal` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ThermalLogic extends ApiLogic {
  /** See {@link ThermalApi.depositHeat}. */
  @CallSecurity(ThermalApiCallers)
  public depositHeat(stuff: Stuff, joules: number): void {
    if (!MixinApi.isThermal(stuff)) return;
    stuff.depositHeat(joules);
  }

  /** See {@link ThermalApi.reconcilePhase}. */
  @CallSecurity(ThermalApiCallers)
  public reconcilePhase(stuff: Stuff): void {
    reconcilePhaseImpl(stuff);
  }

  /** See {@link ThermalApi.reachableHeatFor}. */
  @CallSecurity(ThermalApiCallers)
  public reachableHeatFor(position: Stuff): number {
    return reachableHeatForImpl(position);
  }
}

/**
 * The maximum sustained temperature (K) reachable from `position` — the hottest
 * lit `Furnace` in its scope (the crafting emergent-reachability principle
 * applied to heat: a smith's control gate is "what's the hottest thing I can
 * reach?"). Returns 0 when nothing hot is in reach. **Inert this build** — the
 * future smithing branch reads it as its temperature-control gate; no recipe
 * calls it today.
 */
function reachableHeatForImpl(position: Stuff): number {
  const scope = (position as unknown as { getContainer(): Stuff | null })
    .getContainer();
  if (scope === null || !MixinApi.isContainer(scope)) return 0;
  let hottest = 0;
  for (const occ of (scope as Stuff & Container).getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed() || !MixinApi.isFurnace(s)) continue;
    if (!s.isLit() || s.fuelRemaining() <= 0) continue;
    const t = s.getHeldTemperatureK();
    if (t > hottest) hottest = t;
  }
  return hottest;
}

// ---------- phase-change internals (module-private free functions) ----------
//
// Heat drives phase change; this is the bidirectional transition engine. The
// SHAPE (the latent-heat plateau, the mass↔volume flow) is code; the
// magnitudes are all real `Material` properties (meltingPoint / boilingPoint /
// latentHeatOfFusion). Off-class so there are no intra-singleton self-calls.

/** Heat capacity `C = mass × specificHeat` (J/K) — mirrors ThermalMixin. */
function thermalCapacityOf(stuff: Stuff, mat: Material | null): number {
  const massKg = (stuff as unknown as { getMass(): Quantity<'kg'> })
    .getMass()
    .rawValue();
  let c = mat ? mat.getSpecificHeat().rawValue() : 0;
  if (c <= 0) c = THERMAL_DEFAULTS.DEFAULT_SPECIFIC_HEAT;
  return massKg * c;
}

/** Litres of liquid `massKg` of `mat` becomes (`volume = mass / density`). */
function massToLitres(massKg: number, mat: Material): number {
  const density = mat.getDensity().rawValue();
  if (density <= 0) return 0;
  return (massKg / density) * 1000; // m³ → L
}

function reconcilePhaseImpl(stuff: Stuff): void {
  // A solid object melting: the latent-heat plateau, then the flow to bulk.
  if (MixinApi.isMeltable(stuff) && MixinApi.isThermal(stuff)) {
    reconcileMelt(stuff as Stuff & Meltable & Thermal);
    return;
  }
  // A liquid-holding vessel: freeze below its material's melting point (a
  // casting) or boil above its boiling point (steam).
  if (MixinApi.isBulkable(stuff) && MixinApi.isThermal(stuff)) {
    reconcileBulkPhase(stuff as Stuff & Bulkable & Thermal);
  }
}

/**
 * The solid → liquid transition with a latent-heat plateau. While the object
 * sits at/above its melting point, the overshoot heat is absorbed into the
 * latent accumulator and the temperature is clamped back to the melting point
 * (the plateau); once `mass × latentHeatOfFusion` has been absorbed the solid
 * melts — it destructs and its mass flows to a `Bulkable` liquid pool in the
 * scope's `Floor`.
 */
function reconcileMelt(m: Stuff & Meltable & Thermal): void {
  const mp = m.getMeltingPointK();
  if (mp <= 0) return; // does not melt in the modelled range
  const temp = m.getTemperature().rawValue();
  if (temp < mp) return; // below the melting point — no transition yet

  const mat = MaterialApi.materialOf(m as unknown as Stuff);
  const overshootJ = (temp - mp) * thermalCapacityOf(m as unknown as Stuff, mat);
  if (overshootJ > 0) {
    m._absorbLatent(overshootJ);
    m.setContentsTemperature(mp); // clamp — the plateau
  }
  const need = m.getLatentHeatToMeltJ();
  if (need > 0 && m.getLatentAbsorbedJ() >= need) {
    doMelt(m, mat);
  }
}

/** The melt completion: destruct the solid and flow its mass into the scope's
 * Floor as a molten liquid pool. */
function doMelt(m: Stuff & Meltable, mat: Material | null): void {
  if (!mat) return;
  const massKg = (m as unknown as { getMass(): Quantity<'kg'> })
    .getMass()
    .rawValue();
  const litres = massToLitres(massKg, mat);
  const scope = (m as unknown as { getContainer(): Stuff | null }).getContainer();
  StuffApi.destruct(m as unknown as Stuff);
  if (scope === null || !MixinApi.isContainer(scope)) return;
  const floor = findScopeFloor(scope as Stuff & Container);
  if (floor === null || litres <= 0) return;
  // Merge into the pool (same material) or seed a fresh molten pool.
  const cur = floor.getBulkAmount('surface').rawValue();
  if (cur <= 0 || floor.getBulkMaterial('surface') === null) {
    floor.setBulkMaterial('surface', mat);
  }
  floor.setBulkAmount('surface', Quantity.of(cur + litres, 'L'));
}

/**
 * A liquid-holding vessel's onward transitions, keyed on its held bulk's
 * material + the vessel's own temperature: boil to gas above the boiling point
 * (steam — the bulk shrinks away), or solidify below the melting point (a cast
 * solid `Thing` drops into the vessel's scope). The reverse of the melt above,
 * driven by the same heat read — so ice → water → steam falls out for free.
 */
function reconcileBulkPhase(v: Stuff & Bulkable & Thermal): void {
  const aff: BulkAffordance = v.hasInteriorBulk() ? 'interior' : 'surface';
  const amount = v.getBulkAmount(aff).rawValue();
  if (amount <= 0) return;
  const mat = v.getBulkMaterial(aff);
  if (!mat) return;
  const temp = v.getTemperature().rawValue();

  const bp = mat.getBoilingPoint().rawValue();
  if (bp > 0 && temp >= bp) {
    // Boil — the liquid flashes to gas (steam); the pool shrinks away.
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    return;
  }

  const mp = mat.getMeltingPoint().rawValue();
  if (mp > 0 && temp <= mp) {
    // Freeze — the liquid solidifies into a cast solid of the same material,
    // mass derived back from the pooled volume. The casting is a **clone of the
    // `/obj/Casting` template** (a re-meltable content object), not a raw
    // construction — its material / mass / prose are stamped per freeze.
    const massKg = (amount / 1000) * mat.getDensity().rawValue();
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    const scope = (v as unknown as { getContainer(): Stuff | null })
      .getContainer();
    void StuffApi.clone(CASTING_TEMPLATE_PATH).then((cast) => {
      const c = cast as unknown as Stuff & {
        setShortDescription(s: string): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
      };
      c.setShortDescription(`a cast lump of ${mat.getName()}`);
      c.setMaterial(mat);
      c.setMass(Quantity.of(massKg, 'kg'));
      if (scope && MixinApi.isContainer(scope)) {
        void ContainmentApi.move(
          cast as unknown as Stuff & Containable,
          scope as Stuff & Container,
        );
      }
    });
  }
}

/** The template a frozen molten pool clones into (a re-meltable cast lump). */
const CASTING_TEMPLATE_PATH = '/obj/Casting';

/** The scope's puddle-bearing `Floor` — a surface-bulk fixture / content (the
 * WeatherLogic.findRoomFloor precedent). */
function findScopeFloor(scope: Stuff & Container): (Stuff & Bulkable) | null {
  const s = scope as unknown as Stuff;
  if (MixinApi.isAdornable(s)) {
    for (const fx of s.getFixtures()) {
      const f = fx as unknown as Stuff;
      if (MixinApi.isBulkable(f) && f.hasSurfaceBulk()) {
        return f as Stuff & Bulkable;
      }
    }
  }
  for (const c of scope.getContents()) {
    const co = c as unknown as Stuff;
    if (MixinApi.isBulkable(co) && co.hasSurfaceBulk()) {
      return co as Stuff & Bulkable;
    }
  }
  return null;
}
