/**
 * GlazeTub — ⭐ a compounding vessel that is also a coat BATH: a glaze tub,
 * a slip tub. What a tub of glaze IS is a bath you dip a pot in (B101): it
 * affords `dip` and plans it, and it mixes its glaze like any compounding
 * vessel (`stir`). ⚠ Its own kind because an affordance is a static on the
 * CLASS: the temper pit, the glass batch pot, the rubber mixing tub and the
 * plaster tub are compounding vessels and are NOT baths, and they no longer
 * claim `dip` only to decline it.
 *
 * `DipBathMixin(CompoundingVessel)`.
 */

import CompoundingVessel from './CompoundingVessel';
import type { Stuff } from '../../lib/stuff/Stuff';
import { DipBathMixin } from '../../lib/craft/DipBath';
import type { DipPlan, DipRefusal, DipRequest } from '../../lib/craft/DipBath';
import type { FaceName } from '../../lib/material/Faced';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Quantity } from '../../lib/quantity';

/** Dipping a pot and drawing it out, letting it drain — a game-minute. */
const DIP_MS = 60_000;

/** One numeric dial read, falling back to the literal when unseeded. */
function tubDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Litres a skin of `thicknessM` over one face of the good takes. */
function skinLitres(target: Stuff, thicknessM: number): number {
  if (!MixinApi.isTangible(target)) return 0;
  const kg = target.getMass().rawValue();
  const density = target.getMaterial()?.getDensity().rawValue() || 2000;
  const volumeM3 = kg / density;
  const areaM2 = 6 * Math.pow(Math.max(0, volumeM3), 2 / 3);
  return areaM2 * thicknessM * 1000;
}

export default class GlazeTub extends DipBathMixin(CompoundingVessel) {
  /**
   * ⭐ A tub of something that lays a coat (`Material.laysCoat` — a glaze, a
   * slip) is a coat BATH: `dip crock in tub` lays a WET coat of it on the
   * named faces, and the tub gives up what the skin holds — thickness ×
   * the good's surface area, taken as a cube's (`6 · V^⅔`). Plain on
   * purpose: a bucket of slip glazes a shelf of crocks, not one. `null` —
   * not this tub's business — when nothing is named or what it holds lays
   * no coat (the dip verb says so). The coat SETS by its own material's
   * rule (`FacedMixin`), the fire for a glaze.
   */
  public async dipPlanFor(req: DipRequest): Promise<DipPlan | DipRefusal | null> {
    const self = this as unknown as Stuff;
    const target = req.target;
    if (target === null || !MixinApi.isBulkable(self) || !self.hasInteriorBulk()) return null;
    const material = self.getBulkMaterial('interior');
    if (material === null || !MixinApi.hasCoating(material) || !material.getLaysCoat() || !(self.getBulkAmount('interior').rawValue() > 0)) {
      return null;
    }
    if (!MixinApi.isFaced(target)) return { ok: false, reason: 'not-faced', facts: { target } };
    const onto: FaceName[] = (req.faces ?? target.faces()).filter((f) => target.faces().includes(f));
    if (onto.length === 0) return { ok: false, reason: 'no-such-face', facts: { target } };
    const thicknessM = tubDial(AppSettingKeys.facesDipThicknessM, 0.0003);
    const litres = skinLitres(target, thicknessM) * onto.length;
    // ⭐ A skin takes what it takes (B101): a bath with less than that left
    // coats nothing — it used to lay the whole coat and empty the tub to zero.
    if (self.getBulkAmount('interior').rawValue() + 1e-9 < litres) {
      return { ok: false, reason: 'bath-too-low', facts: { bath: self, target } };
    }
    // ⭐ A bath of PAINT lays its binder, the makeup kept for its color
    // (paint D8/B14) — a rag dipped in oil paint is oily.
    const makeup = self.getBulk('interior').getPayload()?.paint;
    const path = makeup?.binder || (material.getTemplatePath() ?? '');
    const setsByHeat = (MixinApi.hasKinetic(material) ? material.getKinetics()?.setsByHeat() : false) ?? false;
    return {
      ok: true,
      durationMs: DIP_MS,
      effortW: 80,
      facts: { kind: 'coat', bath: self, target },
      onComplete: () => {
        if (target.isDestroyed() || self.isDestroyed() || !MixinApi.isBulkable(self)) {
          return { ok: true, facts: { kind: 'gone' } };
        }
        const have = self.getBulkAmount('interior').rawValue();
        if (have + 1e-9 < litres) return { ok: false, reason: 'bath-ran-dry' };
        self.setBulkAmount('interior', Quantity.of(have - litres, 'L'));
        for (const face of onto) {
          const soil = MixinApi.isSoilable(target) ? Math.max(target.soilAt(face), target.soilAt('')) : 0;
          target.layCoat(face, path, thicknessM, soil, makeup);
        }
        return {
          ok: true,
          facts: { kind: 'coated', target, faces: onto, materialName: material.getName(), setsByHeat },
        };
      },
    };
  }
}
