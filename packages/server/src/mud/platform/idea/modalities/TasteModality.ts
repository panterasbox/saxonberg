/**
 * TasteModality — the gustatory (contact) singleton: what is in a mouthful.
 *
 * The contact-sense twin of `SmellModality.emissionOf`. A blend works out from
 * what actually went in: each taste's amount is its parts' amounts by mass
 * fraction, so a pinch of salt in a pot reads barely, brine overpoweringly, and
 * a little quinine reads clearly through a lot of sugar with no rule written
 * for it.
 */

import { Modality } from '../../../lib/perception/Modality';
import { Smell, type SmellSourceRef } from '../../../lib/perception/Smell';
import type { Flavor, TasteNote } from '../../../lib/perception/Flavor';
import { TASTE_THRESHOLDS } from '../../../lib/material/Material';
import type Material from '../../../lib/material/Material';
import { DissolvedAromatics } from '../../../lib/metabolism/DissolvedAromatics';
import { Freshness } from '../../../lib/material/Freshness';
import type { BulkPayload } from '../../../lib/bulk/Bulkable';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Aroma } from '../../../lib/perception/Aroma';
import type { Stuff } from '../../../lib/stuff/Stuff';

export class TasteModality extends Modality {
  /** What a mouthful of `thing` holds; empty for what is not in reach of a tongue. */
  public flavorOf(thing: Stuff): Flavor {
    const parts: { material: Material; fraction: number }[] = [];
    let payload: BulkPayload | null = null;
    const aromas: SmellSourceRef[] = [];
    const add = (aroma: string, ou: number): void => {
      if (ou > 0) aromas.push({ stuffId: thing.stuffId, aroma, ou, hops: 0 });
    };

    if (
      MixinApi.isBulkable(thing) &&
      thing.hasInteriorBulk() &&
      !thing.isBulkEmpty('interior')
    ) {
      payload = thing.getBulkPayload('interior');
      const material = thing.getBulkMaterial('interior');
      for (const part of payload?.makeup ?? []) {
        const m = StuffApi.findByTemplatePath<Material>(part.materialPath);
        if (m) parts.push({ material: m, fraction: part.fraction });
        else Aroma.loadRow(part.materialPath);
      }
      if (parts.length === 0 && material) parts.push({ material, fraction: 1 });
      const rot = new Freshness(thing.getBulk('interior')).rotNote();
      if (rot) add(rot.aroma, rot.ou);
    } else if (MixinApi.isTangible(thing)) {
      const material = thing.getMaterial();
      if (material) parts.push({ material, fraction: 1 });
      if (MixinApi.isFresh(thing)) {
        const rot = thing.rotNote();
        if (rot) add(rot.aroma, rot.ou);
      }
    }

    const amounts = new Map<string, number>();
    for (const { material, fraction } of parts) {
      if (MixinApi.hasEdibility(material)) {
        for (const tag of material.getTastes()) {
          amounts.set(tag.type, (amounts.get(tag.type) ?? 0) + tag.amount * fraction);
        }
      }
      if (MixinApi.hasOdor(material)) {
        for (const tag of material.getSmells()) add(tag.aroma, tag.strength * fraction);
      }
    }
    // ⭐ What a payload states about itself outranks the row: a well gone
    // salty is read off the water it holds. 1 ppt is 1 g/kg.
    if (typeof payload?.salinityPpt === 'number') {
      amounts.set('salty', payload.salinityPpt);
    }
    for (const tag of payload?.dissolvedAromatics ?? []) {
      const threshold = DissolvedAromatics.thresholdFor(tag.type);
      if (threshold !== null && threshold > 0) add(tag.type, tag.amount / threshold);
    }

    const tastes: TasteNote[] = [...amounts.entries()]
      .map(([type, amount]) => ({ type, ou: amount / (TASTE_THRESHOLDS[type] ?? 1) }))
      .sort((a, b) => b.ou - a.ou);
    return { tastes, aromas: Smell.of(aromas) };
  }
}
