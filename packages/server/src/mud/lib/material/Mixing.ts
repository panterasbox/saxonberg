/**
 * MixingVesselMixin — ⭐⭐ **mixing is ONE rule** (ceramics R1, D34).
 *
 * Combining materials yields a BLEND whose fractions are COMPUTED from
 * what went in, by mass. There is no recipe and no fixed ratio: one sand
 * too many is a lean batch, one sulfur nodule too many is ebonite. Clay
 * tempered with sand, rubber milled with sulfur, the glass batch and the
 * glaze slip are one mechanism — the vessel decides what the blend is
 * CALLED (`blendMaterial`), exactly as a mould decides a cast's shape, and
 * the inputs decide what is IN it.
 *
 * The verb follows the state of the matter: `knead` a plastic mass (this
 * mixin is the kernel's default `KneadPlanner`), `stir` a slurry, powder or
 * liquid (`StirController`'s mixing arm). Both end at {@link blend}.
 *
 * ```yaml
 * class: /platform/thing/MixingVessel
 * data:
 *   blendMaterial: /stuff/idea/material/organic/compounded-rubber
 *   blendTemplate: /trade/rubber/thing/compounded-stock   # absent = bulk
 * ```
 *
 * ⭐ What each input contributes is what it IS made of: a piece that
 * records its own composition gives that; otherwise its material's
 * kind-composition; otherwise the material itself, whole. So the glass
 * batch's iron is its sand's, and a compounded rubber's sulfur fraction is
 * the sulfur you weighed in.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type Material from './Material';
import type { CompositionEntry } from './Material';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { Quantity } from '../quantity';
import type { KneadPlan, KneadPlanner, KneadRefusal, KneadRequest } from '../craft/Kneadable';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';

/** Milling a compound by hand — a quarter of a game-hour, both hands in it. */
const KNEAD_MS = 15 * 60 * 1000;

/** What a blend came to. */
export type BlendOutcome =
  | { ok: true; product: Stuff | null; massKg: number; inputs: number }
  | { ok: false; reason: 'empty' | 'already-blended' | 'no-blend-material' | 'mint-failed' };

export interface MixingVessel extends KneadPlanner {
  /** The material a blend in this vessel IS. */
  getBlendMaterial(): string;
  /** The row a SOLID blend is minted as; `''` = the blend is this vessel's bulk. */
  getBlendTemplate(): string;
  /**
   * ⭐ Fold everything in the vessel into ONE blend, its composition the
   * inputs' by mass; destruct the inputs; mint the blend; stamp the maker.
   */
  blend(by: Stuff | null): Promise<BlendOutcome>;
  /** Blend, and tell `by` what came of it — the end of a `knead` or a `stir`. */
  mixBy(by: Stuff, verb: string): Promise<BlendOutcome>;
}

/** The smallest fraction worth keeping. */
const EPSILON = 1e-6;

/** What one input is made of, as composition entries summing to 1. */
function constituentsOf(input: Stuff): CompositionEntry[] {
  if (MixinApi.isComposition(input)) {
    const own = input.effectiveMakeup().filter((e) => e.fraction > EPSILON);
    if (own.length > 0) return own;
  }
  const mat = MixinApi.isTangible(input) ? input.getMaterial() : null;
  if (mat === null) return [];
  const kind = mat.getComposition().filter((e) => e.fraction > EPSILON);
  if (kind.length > 0) return kind.map((e) => ({ ...e }));
  const path = mat.getTemplatePath();
  return path ? [{ materialPath: path, fraction: 1 }] : [];
}

export function MixingVesselMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class MixingVesselMixin extends Base implements MixingVessel {
    static _mixinName = 'MixingVesselMixin';

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
      blendMaterial: { persistent: true, authorable: true },
      blendTemplate: { persistent: true, authorable: true },
    };

    public blendMaterial = '';
    public blendTemplate = '';

    public getBlendMaterial(): string {
      return this.blendMaterial;
    }

    public getBlendTemplate(): string {
      return this.blendTemplate;
    }

    /**
     * ⭐ The kernel's default knead: work what is in the vessel into one
     * blend. The narration reads the outcome; the fold is {@link blend}.
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
          void this.mixBy(giver, 'knead');
        },
      };
    }

    public async mixBy(by: Stuff, verb: string): Promise<BlendOutcome> {
      const out = await this.blend(by);
      narrateBlend(by, this as unknown as Stuff, out, verb);
      return out;
    }

    public async blend(by: Stuff | null): Promise<BlendOutcome> {
      const self = this as unknown as Stuff & Container;
      const material = this.blendMaterial
        ? StuffApi.findByTemplatePath<Material>(this.blendMaterial) ?? null
        : null;
      if (material === null) return { ok: false, reason: 'no-blend-material' };

      // The inputs: every piece of matter in it, and the bulk in its belly.
      const pieces = self
        .getContents()
        .filter((c) => !c.isDestroyed() && MixinApi.isTangible(c)) as Stuff[];
      const acc = new Map<string, number>();
      let totalKg = 0;
      for (const piece of pieces) {
        if (!MixinApi.isTangible(piece)) continue;
        const kg = piece.getMass().rawValue();
        if (!(kg > 0)) continue;
        for (const e of constituentsOf(piece)) {
          acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * kg);
        }
        totalKg += kg;
      }
      let bulkL = 0;
      if (MixinApi.isBulkable(self) && self.hasInteriorBulk()) {
        bulkL = self.getBulkAmount('interior').rawValue();
        const held = self.getBulkMaterial('interior');
        if (bulkL > 0 && held !== null) {
          const kg = (bulkL / 1000) * held.getDensity().rawValue();
          const entries = self.getBulkPayload('interior')?.makeup;
          const own: CompositionEntry[] =
            entries && entries.length > 0
              ? entries
              : held.getComposition().length > 0
                ? [...held.getComposition()]
                : held.getTemplatePath()
                  ? [{ materialPath: held.getTemplatePath() as string, fraction: 1 }]
                  : [];
          for (const e of own) {
            acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * kg);
          }
          totalKg += kg;
        }
      }
      if (!(totalKg > 0)) return { ok: false, reason: 'empty' };
      const inputs = pieces.length + (bulkL > 0 ? 1 : 0);
      if (inputs === 1 && pieces.length === 1) {
        const only = pieces[0]!;
        const m = MixinApi.isTangible(only) ? only.getMaterial() : null;
        if (m !== null && m.getTemplatePath() === material.getTemplatePath()) {
          return { ok: false, reason: 'already-blended' };
        }
      }
      const folded: CompositionEntry[] = [...acc]
        .map(([materialPath, kg]) => ({ materialPath, fraction: kg / totalKg }))
        .filter((e) => e.fraction > EPSILON);
      const maker = by !== null && !by.isDestroyed() ? by.getIdentityPath() ?? '' : '';

      if (this.blendTemplate === '') {
        // ⭐ A bulk blend: the vessel's belly becomes the blend.
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
        product = await StuffApi.clone<Stuff>(this.blendTemplate, undefined, { madeFrom: pieces });
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
  return MixingVesselMixin;
}

/**
 * Say what a blend came to — shared by `knead` here and `stir`'s mixing
 * arm (the controller calls {@link MixingVessel.blend} and reads this).
 */
function narrateBlend(giver: Stuff, vessel: Stuff, out: BlendOutcome, verb: string): void {
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
        : out.reason === 'already-blended'
          ? Mml.compose`It is already one even mass. There is nothing to work in.`
          : Mml.compose`It will not come together — and that is a fault in the books, not in your hands.`,
    )
    .send();
}
