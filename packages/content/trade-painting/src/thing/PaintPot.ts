/**
 * PaintPot — ⭐⭐ the one pot every paint is mixed in (paint build D8).
 *
 * A compounding vessel whose product is the ONE paint material; what makes
 * this pot of paint ochre or white, oil or tempera, is its MAKEUP — written
 * onto the paint's payload by {@link payloadFor} from what was in the pot
 * when it was stirred:
 *
 * - **the binder** — the liquid, when it lays a coat and sets by the air
 *   (linseed oil, milk of lime); an EGG broken into the pot is tempera's
 *   binder (water and an egg are how tempera is made);
 * - **the pigments** — every solid in the pot that is one (`Material.
 *   pigment`), by mass;
 * - **the solids** — what of a litre stays on the wall: the binder's own
 *   solids, raised by the pigment's share of the mass;
 * - **a thinner** — a solvent liquid stirred in (turpentine).
 *
 * ⭐ It is also a DIP BATH (a `GlazeTub`): `dip rag in pot` soaks a rag in
 * the oil — which is how a painter's rag gets oily, and what sets a heap
 * of them alight (paint D15).
 *
 * A ready-mixed pot authors its makeup (`makeup:`, a seed field), laid on
 * its paint once at its mint.
 */

import GlazeTub from '@saxonberg/server/mud/platform/thing/GlazeTub';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { BuildContribution } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { BulkPayload } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { PaintMakeup, PaintPigment } from '@saxonberg/server/mud/lib/material/Paint';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** An egg broken into a paint pot binds as tempera. */
const EGG_TEMPERA = '/trade/painting/idea/material/egg-tempera';

export default class PaintPot extends GlazeTub {
  static fieldMeta: FieldMeta = {
    // ⭐ A ready-mixed pot's authored makeup — a SEED (phase 3, mint-only):
    // laid on the paint the row filled it with, once.
    makeup: { persistent: true, authorable: true, seed: true },
  };

  /** A ready-mixed pot's authored makeup. */
  public makeup: PaintMakeup | null = null;

  /** Lay the authored makeup on the paint the row filled this pot with. */
  public async seedMakeup(value: PaintMakeup | null): Promise<void> {
    if (value === null || !this.hasInteriorBulk()) return;
    const slot = this.getBulk('interior');
    if (slot.getPayload()?.paint) return;
    slot.setPayload({ ...(slot.getPayload() ?? {}), paint: value });
  }

  public override payloadFor(charge: readonly BuildContribution[]): BulkPayload | null {
    let binder: string | null = null;
    let binderKg = 0;
    let binderSolids = 0;
    let thinner: string | undefined;
    const pigmentKg = new Map<string, number>();
    for (const c of charge) {
      const mat = c.materialPath ? this.materialAt(c.materialPath) : null;
      if (mat === null) continue;
      const kg = c.massKg ?? c.measureL * ((mat.getDensity().rawValue() || 1000) / 1000);
      if (mat.getPigment() !== null && c.kind === 'item') {
        pigmentKg.set(c.materialPath!, (pigmentKg.get(c.materialPath!) ?? 0) + kg);
        continue;
      }
      if (mat.hasTag('egg') && binder === null) {
        binder = EGG_TEMPERA;
        binderKg += kg;
        binderSolids = 0.35;
        continue;
      }
      if (mat.hasTag('solvent')) {
        thinner = c.materialPath;
        binderKg += kg;
        continue;
      }
      if (mat.getLaysCoat() && binder === null) {
        binder = c.materialPath ?? null;
        binderKg += kg;
        const density = (mat.getDensity().rawValue() || 1000) / 1000;
        binderSolids = Math.min(0.95, (mat.getSolidsKgPerL() || 0.4) / density);
      }
    }
    if (binder === null) return null;
    const totalPigment = [...pigmentKg.values()].reduce((a, b) => a + b, 0);
    const pigments: PaintPigment[] = [...pigmentKg.entries()].map(([material, kg]) => ({
      material,
      share: totalPigment > 0 ? kg / totalPigment : 0,
    }));
    const all = binderKg + totalPigment;
    // A thinner evaporates: it is binder mass that leaves nothing behind.
    const thinnerShare = thinner ? 0.15 : 0;
    const solids = all > 0 ? (binderKg * binderSolids * (1 - thinnerShare) + totalPigment) / all : binderSolids;
    const makeup: PaintMakeup = { binder, pigments, solidsFraction: Math.min(0.95, Math.max(0.1, solids)) };
    if (thinner) makeup.thinner = thinner;
    return { paint: makeup };
  }

  private materialAt(path: string): Material | null {
    try {
      return StuffApi.findByTemplatePath<Material>(path) ?? null;
    } catch {
      return null;
    }
  }
}
