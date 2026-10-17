/**
 * Garment — the concrete row-backing class for **worn things that cover
 * the body**: clothing, and armor as the protective tail of clothing.
 *
 * ⭐ There used to be an `Armor` class beside this one. It is retired:
 * every shipped armor row now names this class, and is
 * byte-identical — and the retired class was asserting something the
 * engine never asked. A breastplate is a garment that happens to stand
 * between a body and a blade, and whether it does is a question about
 * the material and the form — it never asks what class they are.
 *
 * That is `textiles.md`'s headline (*a garment's purpose is
 * which exposure channel it intercepts, not what class it is*) — applied
 * to the one class that was already an exception. Nobody authors *"this
 * is armor"*; they author a material and a form, and the channel follows.
 *
 * Composition:
 * - `WearableMixin` (which composes `SlottableMixin`) — occupies body
 *   slots, carries `slotClaims`, derives its insulation (`getClo`).
 * - `DurableMixin` — wear, mending, and the condition bands; `salvage` and
 *   `repair` works on them. A durable good, NOT a crafting tool.
 * - `CraftedMixin` (which composes `GradedMixin`) — the as-made grade
 *   and the maker's mark, so a garment can be a recipe output and a
 *   store-bought one simply has an empty mark.
 * - `DetailedMixin` — the parts a viewer can examine, and the surface a
 *   maker's authored prose rides on.
 * - `DyedMixin` — the dye application stack and its fastness, so a
 *   garment can be coloured, washed, and faded. Undyed is the sparse
 *   default (an empty stack), so this costs a shipped row nothing.
 *
 * Variety stays content + composition, never subclassing: *type* is
 * `slotClaims` + description; *added behavior* is a mixin layered on
 * (`DisguiseGarment` is the one shipped example, and it inherits all of
 * the above for free).
 *
 * Seeded as content (e.g. `/stuff/thing/clothes/white-coat`) with
 * `data.slotClaims: { /stuff/idea/species/BodyPlan/biped: [torso] }`,
 * `_materialPath`, `constructionForm`, `gradeBand` and `mass`.
 */

import Good from '../../../lib/stuff/Good';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { DyedMixin } from '../../../lib/material/Dyed';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { SoilableMixin } from '../../../lib/cleanliness/Soilable';
import type { WashOutcome, WashSpec } from '../../../lib/cleanliness/Soilable';
import { LabelledMixin } from '../../../lib/description/Labelled';
import type Material from '../../../lib/material/Material';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

// ⭐ Soilable and Labelled OUTERMOST (cleanliness D3, D9): every garment
// may carry dirt by kind and be washed — a shirt, an apron, a pair of
// gloves — and every garment may be marked with its owner's name, which
// is what a laundry mark is.
const GarmentBase = LabelledMixin(SoilableMixin(WearableMixin(
  SlottableMixin(
    CraftedMixin(
      DurableMixin(ConstructedMixin(DyedMixin(Good))),
    ),
  ),
)));

/** The water at which wool FELTS — boiling, near enough. */
const FELT_ABOVE_K = 363;

export default class Garment extends GarmentBase {
  /**
   * ⭐⭐ What washing does to CLOTH (cleanliness D10) — on top of the dirt
   * the mixin lifts:
   *
   * - **boiling felts wool** — a protein fibre in water at a boil becomes
   *   `felted`, and shrinks hard (`textiles.wash.feltShrink`);
   * - **hot water shrinks** — a fibre garment at or above
   *   `textiles.wash.shrinkAboveK` loses a little of its cut;
   * - **the chemistry eats the fibre** — a cleanser whose material is
   *   corrosive to one of this garment's tags (lye on wool, vitriol on
   *   linen) wears it, and so does a full-strength bleach on cellulose;
   *   sand scratches what its row says it scratches;
   * - **unfast dye bleeds** — what the wash strips goes, in part, onto
   *   whatever else is in the water with it;
   * - and it comes out **wet**.
   *
   * ⚠ Water must reach the fibre for any of it: a garment of rubber or a
   * rubberized cloth carries no `fibre` tag and neither shrinks nor felts
   * (the one wet law, when it lands, decides how wet it comes out).
   */
  public override washSite(spec: WashSpec, site: string = ''): WashOutcome {
    const outcome = super.washSite(spec, site);
    const damage = [...outcome.damage];
    const material = this.getMaterial();
    const fibre = material !== null && material.hasTag('fibre');

    // The colour first: the bath strips what is not bound, and some of
    // what it strips goes onto what is washed with it.
    const before = this.dyeStrength();
    if (this.launder()) damage.push('faded');
    const lost = before - this.dyeStrength();
    if (lost > 0.01 && spec.coWashed && spec.coWashed.length > 0) {
      const top = this.getDyeStack().slice(-1)[0];
      const share = dial(AppSettingKeys.textilesWashBleedFraction, 0.3);
      for (const other of spec.coWashed) {
        if (other === (this as unknown as Stuff) || !MixinApi.isDyed(other)) continue;
        if (!top) continue;
        other.applyDye({ ...top, strength: Math.min(1, lost * share) });
      }
      damage.push('bled');
    }

    if (fibre) {
      if (material!.hasTag('protein') && spec.waterK >= FELT_ABOVE_K) {
        if (this.getConstructionForm() !== 'felted') {
          void this.setConstructionForm('felted').catch((err: unknown) =>
            console.warn('Garment.washSite: felting failed:', err),
          );
          this.shrinkCut(dial(AppSettingKeys.textilesWashFeltShrink, 0.85));
          damage.push('felted');
        }
      } else if (spec.waterK >= dial(AppSettingKeys.textilesWashShrinkAboveK, 333)) {
        this.shrinkCut(dial(AppSettingKeys.textilesWashHotShrink, 0.97));
        damage.push('shrunk');
      }
    }

    // The chemistry on the fibre: what a cleanser's material corrodes is
    // derived from the material row, never authored on the cleanser.
    const rot = dial(AppSettingKeys.textilesWashRotDose, 0.05);
    for (const c of spec.cleansers) {
      const agent = c.materialPath
        ? StuffApi.findByTemplatePath<Material>(c.materialPath)
        : null;
      const eats = (agent?.getCorrosiveTo() ?? []).some(
        (tag) => material?.hasTag(tag) ?? false,
      );
      const bleaches =
        c.row.action === 'oxidiser' && (material?.hasTag('cellulose') ?? false);
      if (eats || bleaches) {
        this.wear(rot, 'corrosion');
        damage.push(eats ? 'burnt' : 'rotted');
      }
      for (const d of c.row.damages) {
        if (d.effect === 'scratches' && material?.hasTag(d.fibreTag)) {
          this.wear(rot, 'edge');
          damage.push('scratched');
        }
      }
    }

    this.wet(1);
    return { ...outcome, damage: [...new Set(damage)] };
  }

  private dyeStrength(): number {
    return this.getDyeStack().reduce((n, a) => n + a.strength, 0);
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
