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
 * ⭐ The WORK follows the state of the matter (owner, 2026-11-10;
 * controller-liquidity W19): a stiff mass — plastic clay, raw rubber, a
 * putty — is `knead`ed, a quarter-hour's heavy work; anything runny — a
 * slurry, a paint, a glaze, a wash, a powder — is `stir`red, a few light
 * minutes. {@link Compounding.workVerb} reads it off the contents (the
 * materials' `plastic`/`elastomer` tags against the free water in the
 * belly), and it is the ROUTING: `knead` asks {@link kneadPlanFor}, `stir`
 * asks {@link stirPlanFor}, and each refuses `wrong-work` pointing at the
 * other. Both end at {@link compound}. This mixin is the kernel's default
 * knead vessel (`KneadVesselMixin`) and affords `stir` itself.
 *
 * ```yaml
 * class: /platform/thing/CompoundingVessel
 * data:
 *   productMaterial: /stuff/idea/material/organic/compounded-rubber
 *   productTemplate: /trade/rubber/thing/compounded-stock   # absent = bulk
 * ```
 *
 * ⭐ The vessel makes nothing itself: {@link Compounding.compound} hands its
 * contents to the ONE mint, `CraftingApi.mintFromBuild({ charge })`
 * (re-plan R1-D7), which reads them as {@link chargeContributions} — the
 * record a shaker banks — and runs the path every made-of-several thing
 * runs (grade, the inputs' spoilage, the maker), with this vessel's
 * product as the namer. What each input contributes is what it IS made of
 * — the one fold, `MaterialApi.foldMakeup`:
 * a piece that records its own makeup gives that; otherwise its material's
 * kind composition; otherwise the material itself, whole. So the glass
 * batch's iron is its sand's, and a compounded rubber's sulfur fraction is
 * the sulfur you weighed in.
 */

import type { NestingConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { BuildContribution } from '../craft/ManualBuild';
import type { BulkPayload } from '../bulk/Bulkable';
import { MixinApi } from '../../api/mixin';
import { CraftingApi } from '../../api/crafting';
import { Freshness } from './Freshness';
import { Contamination } from './Contaminable';
import type { ActDone, ActPlan } from '../craft/ActPlan';
import { KneadVesselMixin } from '../craft/KneadVessel';
import type { KneadBegin, KneadFacts, KneadPlan, KneadRefusal, KneadRequest, KneadVessel, KneadWork } from '../craft/KneadVessel';

/** Milling a compound by hand — a quarter of a game-hour, both hands in it. */
const KNEAD_MS = 15 * 60 * 1000;
/**
 * Stirring a slurry, a powder or a liquid even, game-ms — a few minutes and
 * light work, where kneading a plastic mass is a long, heavy job. The state
 * of the matter decides which (`workVerb`), never the word typed.
 */
const STIR_MS = 2 * 60 * 1000;
/**
 * Free water per kg of plastic mass past which the mass is a slurry. A
 * worked clay already holds a fifth of its weight; another two-fifths
 * carries it past the liquid limit (~50 % on the dry clay) into a slip.
 */
const SLAKE_RATIO = 0.4;

/** ⭐ Every reason working a compound (by `knead` or `stir`) is refused. */
export type CompoundRefusal = Extract<
  KneadRefusal,
  { reason: 'empty' | 'wrong-work' | 'came-empty' | 'already-compounded' | 'mint-failed' }
>;

/**
 * Working a compound — the same plan for both verbs, the work named in the
 * begin facts. A {@link KneadPlan} by shape, so `knead` engages it as its
 * own.
 */
export type CompoundPlan = ActPlan<
  Extract<KneadBegin, { kind: 'compound' }>,
  Extract<KneadFacts, { kind: 'compounded' }>,
  CompoundRefusal
>;

/** What compounding came to. */
export type CompoundOutcome =
  | { ok: true; product: Stuff | null; massKg: number; inputs: number }
  | {
      ok: false;
      reason: 'empty' | 'already-compounded' | 'mint-failed';
    };

export interface Compounding extends KneadVessel {
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
   * ⭐ What the WORK is, read off what is in the vessel (B101, W19): a
   * deformable solid mass — plastic clay, raw rubber — is `knead`ed (long
   * and heavy); powders, granules and liquids — a slurry, a paint — are
   * `stir`red (a few light minutes). The ONE predicate both verbs route by.
   */
  workVerb(): KneadWork;
  /**
   * ⭐ `knead`'s plan of this vessel's compound — refused `wrong-work`
   * (`work: 'stir'`) when what is in it is runny. (Typed as the knead
   * protocol's: a composer — the temper pit — plans a tread here.)
   */
  kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal>;
  /**
   * ⭐ `stir`'s plan of this vessel's compound (W19) — refused `wrong-work`
   * (`work: 'knead'`) when what is in it is stiff.
   */
  stirPlanFor(req: KneadRequest): Promise<CompoundPlan | CompoundRefusal>;
  /**
   * ⭐ Compound what is in the vessel into ONE product through the one
   * mint (`CraftingApi.mintFromBuild({ charge })`) — the end of a
   * `knead`. What came of it is the outcome; the words are the
   * controller's ({@link Compounding.landed}).
   */
  compound(by: Stuff): Promise<CompoundOutcome>;
  /** What a compounding outcome lands as, for the work that worked it. */
  landed(out: CompoundOutcome, verb: KneadWork): ActDone<Extract<KneadFacts, { kind: 'compounded' }>, CompoundRefusal>;
  /**
   * @hook What the product IS made of, beyond its material — read off the
   * charge BEFORE the mint consumes it, written onto a bulk product's
   * payload after (paint D8: a pot of paint records its binder and its
   * pigments). Default: nothing.
   */
  payloadFor(charge: readonly BuildContribution[]): BulkPayload | null;
}

export function CompoundingMixin<TBase extends NestingConstructor<Stuff>>(Base: TBase) {
  // ⭐ A compounding vessel is a knead VESSEL (`KneadVesselMixin`): it binds
  // as `knead`'s vessel and affords it. ⚠ NOT a dip bath: only a tub of
  // something that lays a coat is one — that is `GlazeTub`, its own kind
  // (B101: the temper pit and the batch pot afforded `dip` and declined it).
  // ⭐ And it is `stir`red when what is in it is runny (W19): the matter's
  // `workVerb` routes the two verbs.
  class CompoundingMixin extends KneadVesselMixin(Base) implements Compounding {
    static _mixinName = 'CompoundingMixin';

    /**
     * ⭐ The vessel affords `stir` as well as `knead` (by what it is,
     * `KneadVesselMixin`) — which of the two its contents want is
     * `workVerb`'s. A tub you stand at, a pot on the bench. A static on the
     * CLASS — a row's `commandContributions:` is dead silently.
     */
    static commandContributions: CommandContributions = {
      environment: ['platform/cmd/crafting/stir.yaml'],
      peers: ['platform/cmd/crafting/stir.yaml'],
    };

    static fieldMeta: FieldMeta = {
      productMaterial: { persistent: true, authorable: true, ref: 'identity:constituent' },
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
          templatePath: piece.getTemplatePath() ?? undefined,
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

    /** ⭐ The kernel's default knead: a stiff compound, worked by hand. */
    public async kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal> {
      return this.workPlan(req, 'knead');
    }

    /** ⭐ A runny compound, stirred (W19). */
    public async stirPlanFor(req: KneadRequest): Promise<CompoundPlan | CompoundRefusal> {
      return this.workPlan(req, 'stir');
    }

    /**
     * Work what is in the vessel into one product by `work` — refused
     * `wrong-work` when the matter wants the other (B101: stirring clay was
     * a two-minute shortcut past a quarter-hour of kneading, and kneading a
     * paint pot is nonsense). The narration reads the outcome; the mint is
     * {@link compound}'s.
     */
    private workPlan(req: KneadRequest, work: KneadWork): CompoundPlan | CompoundRefusal {
      const self = this as unknown as Stuff & Container;
      const any = self.getContents().some((c) => MixinApi.isTangible(c)) ||
        (MixinApi.isBulkable(self) && self.hasInteriorBulk() &&
          self.getBulkAmount('interior').rawValue() > 0);
      if (!any) return { ok: false, reason: 'empty', facts: { wants: 'anything' } };
      const wants = this.workVerb();
      if (wants !== work) return { ok: false, reason: 'wrong-work', facts: { work: wants } };
      const giver = req.actor;
      return {
        ok: true,
        durationMs: work === 'knead' ? KNEAD_MS : STIR_MS,
        effortW: work === 'knead' ? 380 : 150,
        facts: { kind: 'compound', verb: work },
        onComplete: async () => this.landed(await this.compound(giver), work),
      };
    }

    public landed(
      out: CompoundOutcome,
      verb: KneadWork,
    ): ActDone<Extract<KneadFacts, { kind: 'compounded' }>, CompoundRefusal> {
      if (out.ok) return { ok: true, facts: { kind: 'compounded', product: out.product } };
      if (out.reason === 'empty') return { ok: false, reason: 'came-empty', facts: { verb } };
      return { ok: false, reason: out.reason };
    }

    public workVerb(): KneadWork {
      const self = this as unknown as Stuff & Container;
      let plasticKg = 0;
      for (const c of self.getContents()) {
        if (!MixinApi.isTangible(c)) continue;
        const mat = c.getMaterial();
        if (mat === null) continue;
        // Rubber never slakes: however wet, it is milled.
        if (mat.hasTag('elastomer')) return 'knead';
        if (mat.hasTag('plastic')) {
          const n = MixinApi.isStackable(c) ? c.getQuantity() : 1;
          plasticKg += c.getMass().rawValue() * n;
        }
      }
      if (plasticKg === 0) return 'stir';
      // ⭐ Clay drowned in water is a SLIP: past its liquid limit it is
      // stirred, not kneaded (the glaze tubs, the slip tub).
      return this.freeWaterKg() >= plasticKg * SLAKE_RATIO ? 'stir' : 'knead';
    }

    /**
     * The water in the belly, kg — what slakes a plastic mass: all of a
     * pail of water, and the water IN a liquid (clay added to a slip is
     * stirred into it, finalize run 4).
     */
    private freeWaterKg(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self) || !self.hasInteriorBulk()) return 0;
      const slot = self.getBulk('interior');
      const held = slot.getMaterial();
      if (held === null || !held.hasTag('liquid')) return 0;
      // Water itself is all water; a mixture is what its composition says.
      if (held.hasTag('water')) return slot.getMassKg();
      return MixinApi.hasMixture(held) ? slot.getMassKg() * held.waterShare() : 0;
    }

    /**
     * ⭐ Stirring a VOLATILE liquid in the open stirs its vapor into the room
     * (paint D16) — the same quarter-hour of evaporation a pour into an
     * open vessel exposes (`BulkableLogic`'s emission). A shut room keeps
     * it; its air changes clear it.
     */
    private ventVolatiles(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self) || !self.hasInteriorBulk()) return;
      const held = self.getBulkMaterial('interior');
      if (held === null || !MixinApi.hasVolatility(held) || !(held.getVapourLPerLPerHour() > 0) || held.getVapourMaterial() === '') return;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (room === null || !MixinApi.isAtmospheric(room)) return;
      const litres = self.getBulkAmount('interior').rawValue();
      room.addAtmosphereContent(held.getVapourMaterial(), litres * held.getVapourLPerLPerHour() * 0.25);
    }

    public payloadFor(_charge: readonly BuildContribution[]): BulkPayload | null {
      return null;
    }

    public async compound(by: Stuff): Promise<CompoundOutcome> {
      const self = this as unknown as Stuff;
      const charge = this.chargeContributions();
      const inputs = charge.length;
      const payload = this.payloadFor(charge);
      this.ventVolatiles();
      // ⭐ The ONE mint (re-plan R1-D7): the charge runs the path a
      // shaker's buffer runs, and this vessel's product names what it makes.
      const minted = await CraftingApi.mintFromBuild({
        charge: self,
        makerPath: by.isDestroyed() ? '' : by.getIdentityPath() ?? '',
      });
      let out: CompoundOutcome;
      if (minted.ok) {
        // A solid product is its own piece; a bulk one is this vessel's belly.
        const product = minted.output === self ? null : minted.output;
        if (product === null && payload !== null && MixinApi.isBulkable(self) && self.hasInteriorBulk()) {
          const slot = self.getBulk('interior');
          slot.setPayload({ ...(slot.getPayload() ?? {}), ...payload });
        }
        const massKg =
          product !== null
            ? MixinApi.isTangible(product) ? product.getMass().rawValue() : 0
            : MixinApi.isBulkable(self) && self.hasInteriorBulk()
              ? self.getBulk('interior').getMassKg()
              : 0;
        out = { ok: true, product, massKg, inputs };
      } else {
        out = {
          ok: false,
          reason:
            minted.detail === 'empty-build'
              ? 'empty'
              : minted.detail === 'already-compounded'
                ? 'already-compounded'
                : 'mint-failed',
        };
      }
      return out;
    }
  }
  return CompoundingMixin;
}
