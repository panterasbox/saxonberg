/**
 * CompoundingMixin — ⭐⭐ **combining is ONE rule** (ceramics R1, D34; the
 * names are re-plan R1-D5's).
 *
 * Compounding materials yields ONE product whose makeup is COMPUTED from
 * what went in, by mass. There is no recipe and no fixed ratio: one sand
 * too many is a lean batch, one sulfur nodule too many is ebonite. Clay
 * tempered with sand, rubber milled with sulfur, the glass batch and the
 * glaze slip are one mechanism — the vessel names its PRODUCT
 * (`productMaterial`), exactly as a mould names a cast's shape, and the
 * inputs decide what is IN it.
 *
 * The verb follows the state of the matter: `knead` a plastic mass (this
 * mixin is the kernel's default `KneadPlanner`), `stir` a slurry, powder or
 * liquid (`StirController`'s compounding arm). Both end at {@link compound}.
 *
 * ```yaml
 * class: /platform/thing/CompoundingVessel
 * data:
 *   productMaterial: /stuff/idea/material/organic/compounded-rubber
 *   productTemplate: /trade/rubber/thing/compounded-stock   # absent = bulk
 * ```
 *
 * ⭐ What each input contributes is what it IS made of — the one fold,
 * `MaterialApi.foldMakeup`, over the vessel's {@link chargeContributions}:
 * a piece that records its own makeup gives that; otherwise its material's
 * kind composition; otherwise the material itself, whole. So the glass
 * batch's iron is its sand's, and a compounded rubber's sulfur fraction is
 * the sulfur you weighed in.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type Material from './Material';
import type { BuildContribution } from '../craft/ManualBuild';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MaterialApi, type MakeupPart } from '../../api/material';
import { Quantity } from '../quantity';
import { Freshness } from './Freshness';
import { Contamination } from './Contaminable';
import type { KneadPlan, KneadPlanner, KneadRefusal, KneadRequest } from '../craft/Kneadable';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';

/** Milling a compound by hand — a quarter of a game-hour, both hands in it. */
const KNEAD_MS = 15 * 60 * 1000;

/** What compounding came to. */
export type CompoundOutcome =
  | { ok: true; product: Stuff | null; massKg: number; inputs: number }
  | {
      ok: false;
      reason: 'empty' | 'already-compounded' | 'no-product-material' | 'mint-failed';
    };

export interface Compounding extends KneadPlanner {
  /** The material this vessel's product IS. */
  getProductMaterial(): string;
  /** The row a SOLID product is minted as; `''` = the product is this vessel's bulk. */
  getProductTemplate(): string;
  /**
   * ⭐ What is in the vessel, as build contributions — the record a shaker
   * banks, read off the vessel's physical contents: each piece of matter
   * one `item` (its count, the mass of every unit, its tags, material, own
   * makeup, microbial load and pathogens), the belly one `bulk`
   * contribution (its mass derived, `measureL × ρ`).
   */
  chargeContributions(): BuildContribution[];
  /**
   * ⭐ Fold everything in the vessel into ONE product, its makeup the
   * inputs' by mass; destruct the inputs; mint the product; stamp the maker.
   */
  blend(by: Stuff | null): Promise<CompoundOutcome>;
  /** Compound, and tell `by` what came of it — the end of a `knead` or a `stir`. */
  compound(by: Stuff, verb: string): Promise<CompoundOutcome>;
}

export function CompoundingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class CompoundingMixin extends Base implements Compounding {
    static _mixinName = 'CompoundingMixin';

    /**
     * ⭐ The vessel affords `stir` and `knead`, and `dip` — a glaze is mixed
     * in a tub and pots are dipped in the tub (the BATH affords the dip, as
     * chandlery's dip pot does; a good being dippable is not a fact about
     * the good). Environment and peers: a tub you stand at, a bucket on the
     * bench. A static on the CLASS — a row's `commandContributions:` is dead
     * silently.
     */
    static commandContributions: CommandContributions = {
      environment: [
        'platform/cmd/crafting/stir.yaml',
        'platform/cmd/crafting/knead.yaml',
        'platform/cmd/crafting/dip.yaml',
      ],
      peers: [
        'platform/cmd/crafting/stir.yaml',
        'platform/cmd/crafting/knead.yaml',
        'platform/cmd/crafting/dip.yaml',
      ],
    };

    static fieldMeta: FieldMeta = {
      productMaterial: { persistent: true, authorable: true },
      productTemplate: { persistent: true, authorable: true },
    };

    public productMaterial = '';
    public productTemplate = '';

    public getProductMaterial(): string {
      return this.productMaterial;
    }

    public getProductTemplate(): string {
      return this.productTemplate;
    }

    public chargeContributions(): BuildContribution[] {
      const self = this as unknown as Stuff & Container;
      const out: BuildContribution[] = [];
      for (const piece of self.getContents()) {
        if (piece.isDestroyed() || !MixinApi.isTangible(piece)) continue;
        const material = piece.getMaterial();
        if (material === null) continue;
        const count = MixinApi.isStackable(piece) ? piece.getQuantity() : 1;
        out.push({
          measureL: 0,
          gradeBand: MixinApi.isGraded(piece) ? piece.getGradeBand() : 'fair',
          kind: 'item',
          count,
          // ⭐ Every unit of a stack: `getMass()` is one unit's.
          massKg: piece.getMass().rawValue() * count,
          tags: [...material.getTags()],
          materialPath: material.getTemplatePath() ?? undefined,
          makeup: MixinApi.isComposition(piece) ? piece.effectiveMakeup() : undefined,
          freshnessLoad: MixinApi.isFresh(piece) ? piece.getMicrobialLoad() : 0,
          pathogenLoads: MixinApi.isContaminable(piece) ? piece.getPathogenLoads() : {},
        });
      }
      if (MixinApi.isBulkable(self) && self.hasInteriorBulk()) {
        const slot = self.getBulk('interior');
        const litres = slot.getAmount().rawValue();
        const held = slot.getMaterial();
        if (litres > 0 && held !== null) {
          out.push({
            tags: [...held.getTags()],
            measureL: litres,
            // A pour's grade is its holder's; so is the belly's.
            gradeBand: MixinApi.isGraded(self) ? self.getGradeBand() : 'fair',
            materialPath: held.getTemplatePath() ?? undefined,
            makeup: slot.getPayload()?.makeup,
            freshnessLoad: new Freshness(slot).load(),
            pathogenLoads: new Contamination(slot).loads(),
          });
        }
      }
      return out;
    }

    /**
     * ⭐ The kernel's default knead: work what is in the vessel into one
     * product. The narration reads the outcome; the fold is {@link blend}.
     */
    public async kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal> {
      const self = this as unknown as Stuff & Container;
      const any = self.getContents().some((c) => MixinApi.isTangible(c)) ||
        (MixinApi.isBulkable(self) && self.hasInteriorBulk() &&
          self.getBulkAmount('interior').rawValue() > 0);
      if (!any) {
        return {
          ok: false,
          reason: 'empty',
          line: Mml.compose`${Mml.thing(self)} is empty. Put what you mean to mix into it first.`,
        };
      }
      const giver = req.actor;
      return {
        ok: true,
        durationMs: KNEAD_MS,
        effortW: 380,
        beginSelf: Mml.compose`You set your hands to what is in ${Mml.thing(self)}, folding it over and over on itself.`,
        beginPeers: Mml.compose`${Mml.actor(giver)} works at ${Mml.thing(self)} with both hands.`,
        onComplete: () => {
          void this.compound(giver, 'knead');
        },
      };
    }

    public async compound(by: Stuff, verb: string): Promise<CompoundOutcome> {
      const out = await this.blend(by);
      narrate(by, this as unknown as Stuff, out, verb);
      return out;
    }

    public async blend(by: Stuff | null): Promise<CompoundOutcome> {
      const self = this as unknown as Stuff & Container;
      const material = this.productMaterial
        ? StuffApi.findByTemplatePath<Material>(this.productMaterial) ?? null
        : null;
      if (material === null) return { ok: false, reason: 'no-product-material' };

      // The inputs: every piece of matter in it and the bulk in its belly,
      // read as the charge and folded by mass in the ONE place that folds.
      const pieces = self
        .getContents()
        .filter((c) => !c.isDestroyed() && MixinApi.isTangible(c)) as Stuff[];
      const parts: MakeupPart[] = [];
      let totalKg = 0;
      let bulkL = 0;
      for (const c of this.chargeContributions()) {
        const m = c.materialPath
          ? StuffApi.findByTemplatePath<Material>(c.materialPath) ?? null
          : null;
        if (m === null) continue;
        const kg =
          c.kind === 'item'
            ? c.massKg ?? 0
            : (c.measureL * m.getDensity().rawValue()) / 1000;
        if (!(kg > 0)) continue;
        if (c.kind !== 'item') bulkL = c.measureL;
        parts.push({ material: m, kg, makeup: c.makeup });
        totalKg += kg;
      }
      if (!(totalKg > 0)) return { ok: false, reason: 'empty' };
      const inputs = pieces.length + (bulkL > 0 ? 1 : 0);
      if (inputs === 1 && pieces.length === 1) {
        const only = pieces[0]!;
        const m = MixinApi.isTangible(only) ? only.getMaterial() : null;
        if (m !== null && m.getTemplatePath() === material.getTemplatePath()) {
          return { ok: false, reason: 'already-compounded' };
        }
      }
      const folded = MaterialApi.foldMakeup(parts);
      const maker = by !== null && !by.isDestroyed() ? by.getIdentityPath() ?? '' : '';

      if (this.productTemplate === '') {
        // ⭐ A bulk product: the vessel's belly becomes it.
        if (!MixinApi.isBulkable(self) || !self.hasInteriorBulk()) {
          return { ok: false, reason: 'mint-failed' };
        }
        const density = material.getDensity().rawValue() || 1000;
        for (const piece of pieces) await StuffApi.destruct(piece);
        self.setBulkMaterial('interior', material);
        self.setBulkAmount('interior', Quantity.of((totalKg / density) * 1000, 'L'));
        const payload = { ...(self.getBulkPayload('interior') ?? {}), makeup: folded };
        self.setBulkPayload('interior', payload);
        return { ok: true, product: null, massKg: totalKg, inputs };
      }

      let product: Stuff;
      try {
        product = await StuffApi.clone<Stuff>(this.productTemplate, undefined, { madeFrom: pieces });
      } catch {
        return { ok: false, reason: 'mint-failed' };
      }
      if (MixinApi.isTangible(product)) {
        product.setMaterial(material);
        product.setMass(Quantity.of(totalKg, 'kg'));
      }
      if (MixinApi.isComposition(product)) product.setMakeup(folded);
      if (maker !== '' && MixinApi.isCrafted(product) && product.getMaker() === '') {
        product.setMaker(maker);
      }
      for (const piece of pieces) await StuffApi.destruct(piece);
      if (bulkL > 0 && MixinApi.isBulkable(self)) {
        self.setBulkAmount('interior', Quantity.of(0, 'L'));
        self.setBulkMaterial('interior', null);
        self.setBulkPayload('interior', null);
      }
      if (MixinApi.isContainable(product)) {
        ContainmentApi.move(product as Stuff & Containable, self);
      }
      return { ok: true, product, massKg: totalKg, inputs };
    }
  }
  return CompoundingMixin;
}

/**
 * Say what compounding came to — shared by `knead` here and `stir`'s
 * compounding arm (both end at {@link Compounding.compound}).
 */
function narrate(giver: Stuff, vessel: Stuff, out: CompoundOutcome, verb: string): void {
  if (giver.isDestroyed()) return;
  const scene = MessageApi.scene(giver).topic('act.deed');
  if (out.ok) {
    scene
      .toSelf(
        out.product !== null
          ? Mml.compose`It comes together into one even mass: ${Mml.thing(out.product)}.`
          : Mml.compose`What is in ${Mml.thing(vessel)} comes together, even all through.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} finishes working ${Mml.thing(vessel)}.`)
      .send();
    return;
  }
  scene
    .toSelf(
      out.reason === 'empty'
        ? Mml.compose`You ${verb} ${Mml.thing(vessel)}, but there is nothing in it.`
        : out.reason === 'already-compounded'
          ? Mml.compose`It is already one even mass. There is nothing to work in.`
          : Mml.compose`It will not come together — and that is a fault in the books, not in your hands.`,
    )
    .send();
}
