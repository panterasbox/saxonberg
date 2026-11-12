/**
 * ComminutingMixin — **reduce matter, then separate it.** The grinding
 * primitive: a `Tooled` Thing that takes a quantity of something in and
 * yields a finer PRODUCT plus a coarser RESIDUE.
 *
 * ⭐ The vocabulary is deliberately `product` / `residue` and never
 * `flour` / `bran`, because a grist mill is not the only thing that does
 * this. A stamp mill takes ore and yields concentrate plus tailings on
 * the same three fields; that second consumer lives in a different pack
 * with no ancestor in common, which is the test for kernel substrate.
 *
 * ## The two decisions it models
 *
 * **1. Extraction (`e`)** — how much of the input you keep as product.
 * Grind fine and take everything and you keep the coarse outer matter
 * with it; take less and what you keep is the pure inner stock. This is
 * the miller's decision, made per grind, and the ONE thing the whole
 * mixin exists to make a real choice:
 *
 * ```
 *   productKg = kg * e            residueKg = kg * (1 - e)
 *   branShare = max(0, e - (1 - b)) / e     b = residueFraction
 * ```
 *
 * ⭐⭐ `branShare` is what makes this honest. Below `1 - b` the product is
 * pure inner stock and the bolting throws all the outer away; above it
 * you are keeping outer matter, continuously, in proportion. There is no
 * band and no ladder — **0.61 and 0.62 produce different matter**, which
 * is the whole point: a band ladder would make two settings identical and
 * turn a decision into a menu.
 *
 * The product's payload carries that as a `makeup` (inner part +
 * outer part, by mass fraction) and a `water.moisture`, so the nutrition label, the tags and
 * the keeping all move continuously with `e` through machinery that
 * already existed. **No material row per band.**
 *
 * **2. The toll** — a fraction of the product stays with the mill. The
 * multure: payment in kind rather than coin, which is how a mill pays for
 * its premises with no banking code and no new service vocabulary.
 *
 * ## What this mixin is NOT
 *
 * ⚠ It does not know about water, wheels or power. `availablePowerW()`
 * answers 0 here; a pack that has a river overrides it. The kernel does
 * not import the water pack, and this is the seam that keeps it honest.
 *
 * See [docs/subsystems/crafting.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { PoweredMixin } from '../supply/Powered';
import type { Stuff } from '../stuff/Stuff';
import type { CompositionEntry } from '../material/Material';
import type { WaterState } from '../material/Moisture';
import { Grade } from './Grade';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type Material from '../material/Material';
import type { ActAnswer, ActDone, ActRefusal } from './ActPlan';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BulkPayload } from '../bulk/Bulkable';
import { BulkableApi } from '../../api/bulk';
import { ContainmentApi } from '../../api/containment';
import { CraftingApi } from '../../api/crafting';
import type { CraftFailure } from '../../api/crafting';
import { WorldClockApi, type ClockHandle } from '../../api/worldclock';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';

/**
 * Metabolic watts of turning a quern — above a fresh body's overload
 * threshold (0.7 × 840 W), below a body a few points of lean later, so the
 * sack trains a new miller and stops training one who outgrew it.
 */
const GRIND_EFFORT_W = 620;
/** Litres of suspended dust per kilogram milled — ten grinds in an unswept
 * mill house reach the flash; two do not. */
const DUST_L_PER_KG = 15;

/** A feed charge: what goes in, and how the hopper takes it. */
interface MillCharge {
  kg: number;
  materialPath: string;
  gradeBand: string;
  /** Drain this much from the source, or destruct it when null. */
  drainL: number | null;
}

/**
 * ⭐ A powered grind under way — the charge the hopper took and when the
 * meal comes out. Persisted on the stones, so a restart mid-grind still
 * lands the sacks (requirements step 14): the grain was taken at the
 * start, and a closure timer alone lost it with the process.
 */
export interface PendingGrind {
  /** Game-seconds when the stones run empty. */
  dueAtS: number;
  kg: number;
  materialPath: string;
  gradeBand: string;
  /** The extraction the grind was set at (already clamped). */
  extraction: number;
  makerPath: string;
  payload: BulkPayload | null;
}

/** Comminution defaults — playtest numbers, not decisions. */
const COMMINUTION_DEFAULTS = {
  /** Density (kg/m3) assumed for matter whose Material tabulates none. */
  DEFAULT_DENSITY: 600,
  /** The product's moisture at pure-inner extraction (the driest case). */
  MOISTURE_FLOOR: 0.91,
  /** How much moisture full-outer product adds over the floor. */
  MOISTURE_SPAN: 0.09,
} as const;

/** What one grind will produce — pure arithmetic, nothing mutated. */
export interface ComminutionPlan {
  /** Extraction actually used, after clamping to the instrument's range. */
  extraction: number;
  /** Kilograms of product. */
  productKg: number;
  /** Litres of product, by the product material's density. */
  productL: number;
  /** Kilograms of residue. */
  residueKg: number;
  /** Litres of residue. */
  residueL: number;
  /** Kilograms of product withheld as the mill's toll (in kind). */
  tollKg: number;
  /** Litres of that toll. */
  tollL: number;
  /**
   * The share of the product that is outer matter `[0, 1]` — continuous
   * in `extraction`, and the number every derived reading comes from.
   */
  outerShare: number;
  /**
   * The product payload's makeup — inner part `1 − outerShare`, outer
   * part `outerShare`, by mass fraction. A part's servings derive at the
   * read from its row's `servingKg` (flour's and bran's are the 100 g this
   * mill used to carry as its own constant).
   */
  makeup: CompositionEntry[];
  /** The product payload's water state — wetter as the outer share rises. */
  water: WaterState;
  /** Grade of the product: weakest link of the input and the instrument. */
  grade: Grade;
  /** Template path of the product material. */
  productMaterial: string;
  /** Template path of the residue material. */
  residueMaterial: string;
  /** Template path of the vessel the product lands in. */
  productVessel: string;
  /** Template path of the vessel the residue lands in. */
  residueVessel: string;
}

/** What a grind is asked to work on. */
/**
 * ⭐⭐ **What this instrument makes FROM a given feed** — one row per kind
 * of thing you can put in it.
 *
 * ⛔ The defect this fixes, and it had shipped: `productMaterial` was ONE
 * path per instrument row, and both mill rows pinned it to wheat flour,
 * while `MillController.chargeFrom` accepted anything tagged `grain` or
 * `malt`. **So a sack of malt ground on a quern came out as wheat
 * flour** — tagged `wheat-flour`, which no mash slot asks for. Every
 * grain of grist in the world came from a shop counter, the whiskey
 * vertical's "malt → grist" link had never once run, and the test that
 * claimed to prove it compared the grist ROW's tags to the mash slot
 * without grinding anything.
 *
 * A mill is not a machine that makes flour. It is a machine that makes
 * *what it is fed, smaller* — and the cloth decides what to bolt out.
 * That is one table, not one path.
 */
export interface ComminutionProduct {
  /**
   * The Material tag on the FEED that selects this row (`wheat`,
   * `barley`, `malt`). The first row whose tag the charge carries wins,
   * so author the specific before the general.
   */
  inputTag: string;
  /** Template path of the product matter. */
  product: string;
  /** Template path of the residue matter; empty = this feed bolts nothing. */
  residue?: string;
  /**
   * The bolting's `b` for THIS feed, overriding the instrument's own.
   * ⭐ Malt authors 0: you grind malt to grist whole, because the husk is
   * the filter bed the mash needs — throwing it away is how you get a
   * stuck mash, not a cleaner wort.
   */
  residueFraction?: number;
  /** Template path of the vessel the product lands in. */
  vessel?: string;
  /** Template path of the vessel the residue lands in. */
  residueVessel?: string;
}

export interface ComminutionInput {
  /** Kilograms going in. */
  kg: number;
  /** The input matter's Material path (for the product's inner part). */
  materialPath: string;
  /** The input's grade band word; empty = ungraded, derives at `fair`. */
  gradeBand: string;
}

/**
 * ⭐ Why a grind is refused (controller-liquidity W10) — closed; the `mill`
 * controller words each in an exhaustive switch.
 *
 *  - `already-milling` — the stones are turning for somebody else;
 *  - `no-power` — a driven mill with nothing driving it (a building);
 *  - `not-grindable` — not a feed, and no recipe on these stones takes it;
 *  - `grain-gone` — the charge left the sack while the quern turned;
 *  - `craft-declined` — the recipe arm's resolve refused (`facts.craft`).
 */
export type MillRefusalReason =
  | 'already-milling'
  | 'no-power'
  | 'not-grindable'
  | 'grain-gone'
  | 'craft-declined';

/** The facts a grind refusal's words need. */
export interface MillRefusalFacts {
  mill: Stuff;
  source: Stuff;
  /** The resolve's own decline, on `craft-declined`. */
  craft?: CraftFailure;
}

export type MillRefusal = ActRefusal<MillRefusalReason, MillRefusalFacts>;

/** What the begin words need — the quern's engaged grind. */
export interface MillBegin {
  mill: Stuff;
  source: Stuff;
  /** `true` = driven stones; the driver's hands are not held. */
  powered: boolean;
}

/**
 * What the done words need. `set-going` — driven stones took the charge
 * and turn on the game clock (the sacks land in the mill's room later);
 * `ground` — the quern's grind landed; `recipe` — a non-feed went through
 * the stones as a recipe (bone → bone meal).
 */
export type MillDone =
  | { kind: 'set-going'; mill: Stuff; sourceName: string }
  | { kind: 'ground'; mill: Stuff; sourceName: string }
  | { kind: 'recipe'; mill: Stuff; sourceName: string; output: Stuff; caught: boolean };

export type MillAnswer = ActAnswer<MillBegin, MillDone, MillRefusal>;

/** The comminution capability surface. */
export interface Comminuting {
  /**
   * ⭐ ONE engine for every grind (controller-liquidity W10, C17): a feed
   * (`feedTags`) takes the extraction path — held hands at a quern, the
   * game clock at driven stones — and anything else is matched to a
   * recipe on this instrument's `millstone` capability. **The hopper
   * takes the charge** when driven stones start: the grain cannot be
   * spent twice while they turn.
   */
  millPlanFor(actor: Stuff, source: Stuff, extraction?: number): Promise<MillAnswer>;
  /** Plan a grind — pure; nothing is mutated and nothing is minted. */
  planComminution(input: ComminutionInput, extraction?: number): ComminutionPlan;
  /** Game-milliseconds a grind of `kg` takes at the current power. */
  grindMs(kg: number): number;
  /** Throughput (kg per game-minute) at the current power; 0 = cannot. */
  throughputNow(): number;
  /**
   * Mechanical power (W) available to this instrument. **0 on the kernel
   * mixin** — the power read belongs to whatever pack has a river.
   */
  availablePowerW(): number;
  /**
   * Bring the power read UP TO DATE before a sync read of it. A pack's
   * read may be a cached figure refreshed asynchronously (a water mill
   * reads a river that is memoised per six game-hours), and the FIRST
   * read of a cold cache answers 0 — which the verb would then report
   * as "nothing is driving it", a lie. No-op on the kernel mixin.
   */
  settlePower(): Promise<void>;
  /** Is a grind running right now? (Runtime only; a reload wakes idle.) */
  isGrinding(): boolean;
  setGrinding(value: boolean): void;

  // Public so the applier can reflect into them.
  throughputKgPerMin: number;
  kgPerMinPerKw: number;
  maxThroughputKgPerMin: number;
  extractionMin: number;
  extractionMax: number;
  extractionDefault: number;
  residueFraction: number;
  productMaterial: string;
  residueMaterial: string;
  productVessel: string;
  residueVessel: string;
  tollFraction: number;
  tollBinPath: string;
  products: ComminutionProduct[];
  feedTags: string[];
  dustMaterial: string;

  /** The table row matching a feed, or `null` for the scalar fallback. */
  productFor(materialPath: string): ComminutionProduct | null;
}

export function ComminutingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ComminutingMixin extends PoweredMixin(Base) implements Comminuting {
    static _mixinName: string = 'ComminutingMixin';

    static fieldMeta: FieldMeta = {
      throughputKgPerMin: { persistent: true, authorable: true },
      kgPerMinPerKw: { persistent: true, authorable: true },
      maxThroughputKgPerMin: { persistent: true, authorable: true },
      extractionMin: { persistent: true, authorable: true },
      extractionMax: { persistent: true, authorable: true },
      extractionDefault: { persistent: true, authorable: true },
      residueFraction: { persistent: true, authorable: true },
      productMaterial: { persistent: true, authorable: true },
      residueMaterial: { persistent: true, authorable: true },
      productVessel: { persistent: true, authorable: true },
      residueVessel: { persistent: true, authorable: true },
      tollFraction: { persistent: true, authorable: true },
      tollBinPath: { persistent: true, authorable: true },
      products: { persistent: true, authorable: true },
      feedTags: { persistent: true, authorable: true },
      dustMaterial: { persistent: true, authorable: true },
      pendingGrind: { persistent: true, runtimeState: true },
    };

    /** Kilograms per game-minute with no power at all — the hand rung. */
    public throughputKgPerMin = 0;
    /** Kilograms per game-minute per kilowatt; 0 = this cannot be driven. */
    public kgPerMinPerKw = 0;
    /** Ceiling on throughput however much power arrives; 0 = none. */
    public maxThroughputKgPerMin = 0;

    /** The narrowest extraction this instrument can bolt to. */
    public extractionMin = 0.55;
    /** The widest — 1 is "keep everything, bolt nothing". */
    public extractionMax = 1;
    /** What a grind that names no extraction uses. */
    public extractionDefault = 0.75;

    /**
     * ⭐ **The bolting's `b`** — the fraction of the input that is outer
     * matter this instrument's cloth can separate. It is a property of
     * the SCREEN, not of the grain: the cloth decides what counts as
     * bran, which is why it lives here and not on the Material.
     */
    public residueFraction = 0.25;

    /** Template paths of the two outputs' matter and their vessels. */
    public productMaterial = '';
    public residueMaterial = '';
    public productVessel = '';
    public residueVessel = '';

    /**
     * ⭐ The feed → product table. Empty ⇒ the scalar fields above are
     * used for every feed, so **every shipped row behaves exactly as it
     * did** until it authors a table.
     */
    public products: ComminutionProduct[] = [];

    /**
     * The row matching a feed, or `null` for the scalar fallback. First
     * match wins; a feed the table does not name falls back rather than
     * being refused, because refusing here would fail closed and silent
     * at the charge.
     */
    public productFor(materialPath: string): ComminutionProduct | null {
      if (this.products.length === 0) return null;
      const material = materialPath
        ? StuffApi.findByTemplatePath<Material>(materialPath)
        : null;
      const tags = material?.getTags() ?? [];
      for (const row of this.products) {
        if (row.inputTag && tags.includes(row.inputTag)) return row;
      }
      return null;
    }

    /** The multure: product withheld in kind. 0 = no toll (a hand quern). */
    public tollFraction = 0;
    /** Where the toll goes; empty = nowhere, and the toll is not taken. */
    public tollBinPath = '';

    /**
     * Material tags that make a charge a FEED — the extraction path. Any
     * other input is matched to a recipe on the `millstone` capability.
     */
    public feedTags: string[] = ['grain', 'malt'];

    /**
     * ⭐ The gas a feed grind throws into an ENCLOSED room (cleanliness
     * D22) — flour dust at a grist mill, which hangs grind on grind until
     * it is swept down. `''` = none.
     */
    public dustMaterial = '';

    /**
     * ⚠ Runtime only, never persisted. A reload wakes the mill idle — the
     * `ManualBuild` rule: an engagement does not survive a restart, so a
     * flag claiming one did would strand the instrument forever.
     */
    private _grinding = false;

    /**
     * ⭐ The powered grind in the hopper, or `null` — persisted (unlike
     * `_grinding`, which is the quern's held hands): restored through
     * {@link setPendingGrind}, which re-arms the landing, so a restart
     * mid-grind still turns the taken grain into its sacks.
     */
    public pendingGrind: PendingGrind | null = null;
    /** The live landing timer — transient, re-armed by the setter. */
    private _grindHandle: ClockHandle | null = null;

    public getPendingGrind(): PendingGrind | null {
      return this.pendingGrind;
    }

    /** Set (or clear) the grind in the hopper and arm its landing. */
    public setPendingGrind(value: PendingGrind | null): void {
      this._grindHandle?.cancel();
      this._grindHandle = null;
      this.pendingGrind = value ?? null;
      if (this.pendingGrind === null) return;
      this._grinding = true;
      this._grindHandle = WorldClockApi.at(
        Quantity.of(this.pendingGrind.dueAtS, 's'),
        () => {
          void this.landPendingGrind();
        },
        { host: this as unknown as Stuff, tag: 'mill-grind' },
      );
    }

    /** The timer fired (live or re-armed): the meal comes out. */
    private async landPendingGrind(): Promise<void> {
      const p = this.pendingGrind;
      if (p === null) return;
      this.pendingGrind = null;
      this._grindHandle = null;
      const plan = this.planComminution(
        { kg: p.kg, materialPath: p.materialPath, gradeBand: p.gradeBand },
        p.extraction,
      );
      await this.landGrind(plan, p.makerPath, p.payload);
    }

    public isGrinding(): boolean {
      return this._grinding;
    }
    public setGrinding(value: boolean): void {
      this._grinding = value === true;
    }

    public availablePowerW(): number {
      return 0;
    }

    public async settlePower(): Promise<void> {
      /* the kernel mixin has no power to settle */
    }

    public throughputNow(): number {
      const hand = this.throughputKgPerMin;
      if (this.kgPerMinPerKw <= 0) return hand;
      const kw = this.availablePowerW() / 1000;
      const driven = hand + kw * this.kgPerMinPerKw;
      return this.maxThroughputKgPerMin > 0
        ? Math.min(driven, this.maxThroughputKgPerMin)
        : driven;
    }

    public grindMs(kg: number): number {
      const rate = this.throughputNow();
      if (!(rate > 0) || !(kg > 0)) return 0;
      // Game-minutes to game-milliseconds; the caller converts to real
      // time at the clock's scale.
      return (kg / rate) * 60 * 1000;
    }

    public async millPlanFor(
      actor: Stuff,
      source: Stuff,
      extraction?: number,
    ): Promise<MillAnswer> {
      const self = this as unknown as Stuff & Comminuting;
      const refuse = (reason: MillRefusalReason, craft?: CraftFailure): MillRefusal => ({
        ok: false,
        reason,
        facts: { mill: self, source, ...(craft ? { craft } : {}) },
      });
      if (this._grinding) return refuse('already-milling');
      const charge = this.chargeFrom(source);
      if (charge === null) return this.recipePlanFor(actor, source, refuse);

      // ⭐ A mill with no water has no rate of its own — saying so is the
      // honest failure. ⚠ Settle first: a cold water-mill answers 0 until
      // its river has been read once.
      await this.settlePower();
      if (!(this.throughputNow() > 0)) return refuse('no-power');

      const plan = this.planComminution(
        { kg: charge.kg, materialPath: charge.materialPath, gradeBand: charge.gradeBand },
        extraction,
      );
      const grindMs = this.grindMs(charge.kg);
      const makerPath = actor.getIdentityPath() ?? '';
      const sourceName = source.getPresentation();

      if (this.kgPerMinPerKw > 0) {
        // ⭐⭐ THE MILL HOLDS NOTHING OF YOURS — the game clock carries the
        // grind, and the hopper takes the charge NOW (C17: the water path
        // left the grain in your hands, free to spend while the flour was
        // still coming).
        return {
          ok: true,
          durationMs: 0,
          effortW: 0,
          facts: { mill: self, source, powered: true },
          onComplete: async (): Promise<ActDone<MillDone, MillRefusal>> => {
            if (this._grinding) return refuse('already-milling');
            this._grinding = true;
            const payload = await this.takeCharge(source, charge);
            this.setPendingGrind({
              dueAtS: WorldClockApi.getNow().rawValue() + grindMs / 1000,
              kg: charge.kg,
              materialPath: charge.materialPath,
              gradeBand: charge.gradeBand,
              extraction: plan.extraction,
              makerPath,
              payload,
            });
            return { ok: true, facts: { kind: 'set-going', mill: self, sourceName } };
          },
        };
      }

      // ⭐⭐ THE QUERN HOLDS YOUR HANDS — the shipped slot rule. The charge
      // stays in the sack until the grind lands; aborted, nothing moved.
      return {
        ok: true,
        durationMs: grindMs,
        effortW: GRIND_EFFORT_W,
        facts: { mill: self, source, powered: false },
        onBegin: () => {
          this._grinding = true;
        },
        onAbort: () => {
          this._grinding = false;
        },
        onComplete: async (): Promise<ActDone<MillDone, MillRefusal>> => {
          const now = source.isDestroyed() ? null : this.chargeFrom(source);
          if (now === null || now.kg + 1e-9 < charge.kg) {
            this._grinding = false;
            return refuse('grain-gone');
          }
          const payload = await this.takeCharge(source, charge);
          await this.landGrind(plan, makerPath, payload);
          return { ok: true, facts: { kind: 'ground', mill: self, sourceName } };
        },
      };
    }

    /** The non-feed arm: a recipe on these stones that takes the input. */
    private async recipePlanFor(
      actor: Stuff,
      source: Stuff,
      refuse: (reason: MillRefusalReason, craft?: CraftFailure) => MillRefusal,
    ): Promise<MillAnswer> {
      const self = this as unknown as Stuff;
      const material = MixinApi.isTangible(source) ? source.getMaterial() : null;
      const recipe = material
        ? await CraftingApi.recipeTaking('millstone', material.getTags())
        : null;
      if (!recipe) return refuse('not-grindable');
      // ⚠ Named BEFORE the stones take it: a destroyed source presents as
      // nothing.
      const sourceName = source.getPresentation();
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: { mill: self, source, powered: false },
        onComplete: async (): Promise<ActDone<MillDone, MillRefusal>> => {
          const outcome = await CraftingApi.craft({ recipeRef: recipe.recipeId, makerMode: 'self' });
          if (!outcome.ok) return refuse('craft-declined', outcome);
          const output = outcome.output;
          if (output === null) return refuse('not-grindable');
          // ⭐ Grinding a lead stock raises a dust the grinder breathes and
          // swallows (paint D14) — the painter's colic is made here.
          if (material?.hasTag('lead') && MixinApi.isMetabolic(actor)) {
            actor.addToxinBurden('lead', leadDustDose());
          }
          const caught = MixinApi.isBulkable(output) && output.hasInteriorBulk();
          return { ok: true, facts: { kind: 'recipe', mill: self, sourceName, output, caught } };
        },
      };
    }

    /** What is going in, when it is a feed: a tangible sack or a bulk holder's matter. */
    private chargeFrom(source: Stuff): MillCharge | null {
      // Bulk first — a Sack of malt is also Tangible, and its interior is
      // what we want rather than its tare.
      if (MixinApi.isBulkable(source) && source.hasInteriorBulk()) {
        const slot = BulkableApi.slotFor(source, undefined);
        const material = slot?.getMaterial() ?? null;
        if (!slot || !material || !this.isFeed(material)) return null;
        const litres = slot.getAmount().rawValue();
        if (litres <= 0) return null;
        const density =
          material.getDensity().rawValue() || COMMINUTION_DEFAULTS.DEFAULT_DENSITY;
        return {
          kg: litres * (density / 1000),
          materialPath: material.getTemplatePath() ?? '',
          gradeBand: MixinApi.isGraded(source) ? source.getGradeBand() : '',
          drainL: litres,
        };
      }
      if (!MixinApi.isTangible(source)) return null;
      const material = source.getMaterial();
      if (!material || !this.isFeed(material)) return null;
      const kg = source.getMass().rawValue();
      if (!(kg > 0)) return null;
      return {
        kg,
        materialPath: material.getTemplatePath() ?? '',
        gradeBand: MixinApi.isGraded(source) ? source.getGradeBand() : '',
        drainL: null,
      };
    }

    private isFeed(material: Material): boolean {
      return this.feedTags.some((t) => material.hasTag(t));
    }

    /**
     * ⭐ The hopper takes the charge: drain or destruct it, returning what
     * the sack CARRIED per litre — read before the debit, because a full
     * drain clears the payload with the material (smoke in a peated malt
     * must survive the stones).
     */
    private async takeCharge(source: Stuff, charge: MillCharge): Promise<BulkPayload | null> {
      const payload =
        MixinApi.isBulkable(source) && source.hasInteriorBulk()
          ? (BulkableApi.slotFor(source, undefined)?.getPayload() ?? null)
          : null;
      if (!source.isDestroyed()) {
        if (charge.drainL !== null && MixinApi.isBulkable(source)) {
          BulkableApi.slotFor(source, undefined)?.setAmount(Quantity.of(0, 'L'));
        } else {
          await StuffApi.destruct(source);
        }
      }
      return payload;
    }

    /**
     * The grind lands: the product less the toll, the residue, the toll
     * into its bin, the dust into a shut room. ⭐ The sacks land in the
     * MILL's room — at a water mill the driver may be a valley away.
     */
    private async landGrind(
      plan: ComminutionPlan,
      makerPath: string,
      payload: BulkPayload | null,
    ): Promise<void> {
      const self = this as unknown as Stuff;
      try {
        const room = MixinApi.isContainable(self) ? self.getContainer() : null;
        const landing = room !== null && MixinApi.isContainer(room) ? room : null;
        // ⭐ (cleanliness D22) In an ENCLOSED room the dust hangs, grind on
        // grind; a floor damped down halves it; under the sky it blows away.
        if (this.dustMaterial && landing && MixinApi.isAtmospheric(landing) && plan.productKg > 0) {
          const floor = MixinApi.isAdornable(landing)
            ? (landing.getFloor() as unknown as Stuff | null)
            : null;
          const damped = floor !== null && MixinApi.isWet(floor) && floor.getWetness() > 0.2;
          landing.addAtmosphereContent(
            this.dustMaterial,
            plan.productKg * DUST_L_PER_KG * (damped ? 0.5 : 1),
          );
        }
        const keptL = plan.productL - plan.tollL;
        if (keptL > 0 && plan.productVessel) {
          await fillSack(plan.productVessel, plan.productMaterial, keptL, plan, makerPath, landing, plan.productKg - plan.tollKg, payload);
        }
        // The residue — bran is a real good, not waste.
        if (plan.residueL > 0 && plan.residueVessel) {
          await fillSack(plan.residueVessel, plan.residueMaterial, plan.residueL, null, makerPath, landing, plan.residueKg, payload);
        }
        // ⭐ The multure. A tenth stays here and the miller sells it.
        if (plan.tollL > 0 && this.tollBinPath && landing) {
          const bin = landing.getContents().find((c) => c.getTemplatePath() === this.tollBinPath);
          const slot = bin && MixinApi.isBulkable(bin) ? BulkableApi.slotFor(bin, undefined) : null;
          if (slot) slot.setAmount(Quantity.of(slot.getAmount().rawValue() + plan.tollL, 'L'));
        }
        // ⚠ The stones fall quiet in the room — the world's line, said by
        // the mill (a `Location` is not Containable, so the room cannot
        // speak it): the command that started a water-mill grind is long
        // gone when it lands.
        if (landing && !self.isDestroyed()) {
          MessageApi.scene(self)
            .topic('act.deed')
            .toPeers(Mml.compose`The stones run empty and the last of the meal works out from under them.`)
            .send();
        }
      } finally {
        this._grinding = false;
      }
    }

    public planComminution(
      input: ComminutionInput,
      extraction?: number,
    ): ComminutionPlan {
      const e = clamp(
        extraction ?? this.extractionDefault,
        this.extractionMin,
        this.extractionMax,
      );
      // ⭐ Which product this feed makes, before any arithmetic — the
      // bolting fraction is the feed's when the table names one.
      const row = this.productFor(input.materialPath);
      const productMaterial = row?.product ?? this.productMaterial;
      const residueMaterial = row
        ? (row.residue ?? '')
        : this.residueMaterial;
      const boltFraction =
        row?.residueFraction ?? this.residueFraction;
      const kg = input.kg > 0 ? input.kg : 0;
      const productKg = kg * e;
      const residueKg = kg - productKg;
      const tollKg = this.tollBinPath ? productKg * clamp(this.tollFraction, 0, 1) : 0;

      // ⭐⭐ The continuous part. `b` of the input is outer matter. Below
      // an extraction of `1 - b` the bolting throws all of it away and
      // what you keep is pure inner stock; above it you are necessarily
      // keeping outer matter, in exactly the proportion by which you
      // overshot. No bands, no ladder — every extraction is its own
      // answer, which is what makes it a decision instead of a menu.
      const b = clamp(boltFraction, 0, 1);
      const outerShare = e > 0 ? Math.max(0, e - (1 - b)) / e : 0;

      const makeup: CompositionEntry[] = [];
      if (productKg > 0) {
        if (productMaterial) {
          makeup.push({ materialPath: productMaterial, fraction: 1 - outerShare });
        }
        if (residueMaterial && outerShare > 0) {
          makeup.push({ materialPath: residueMaterial, fraction: outerShare });
        }
      }

      // ⭐ Keeping, through the shipped per-instance water state rather
      // than a keeping flag: the outer matter carries the oil and the
      // water, so a wholemeal product sits at its material's full water
      // activity and a pure-inner one sits below the growth floor.
      // `Freshness.waterActivityOf = base * moisture * (1 - solute)`.
      const D = COMMINUTION_DEFAULTS;
      const water: WaterState = {
        moisture:
          D.MOISTURE_FLOOR +
          D.MOISTURE_SPAN * (b > 0 ? Math.min(1, outerShare / b) : 0),
        solute: 0,
      };

      // Weakest link, then floored by this instrument's own control — the
      // shipped `applyControlFloor` convention: capital raises the floor
      // and never the ceiling. A fine mill cannot make poor grain good.
      let grade = Grade.of(
        input.gradeBand && Grade.isBand(input.gradeBand)
          ? input.gradeBand
          : 'fair',
      );
      const self = this as unknown as Stuff;
      if (MixinApi.isTool(self)) {
        const band = self.capabilityControl('millstone');
        if (band && Grade.isBand(band)) grade = grade.max(Grade.of(band));
      }

      return {
        extraction: e,
        productKg,
        productL: litresOf(productKg, productMaterial),
        residueKg,
        residueL: litresOf(residueKg, residueMaterial),
        tollKg,
        tollL: litresOf(tollKg, productMaterial),
        outerShare,
        makeup,
        water,
        grade,
        productMaterial,
        residueMaterial,
        productVessel: row?.vessel ?? this.productVessel,
        residueVessel: row?.residueVessel ?? this.residueVessel,
      };
    }
  };
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

/** Litres that `kg` of a material occupies, by its tabulated density. */
function litresOf(kg: number, materialPath: string): number {
  if (!(kg > 0)) return 0;
  const mat = materialPath
    ? StuffApi.findByTemplatePath<Material>(materialPath)
    : null;
  const density =
    (mat as unknown as Material | null)?.getDensity().rawValue() ??
    COMMINUTION_DEFAULTS.DEFAULT_DENSITY;
  return kg / ((density > 0 ? density : COMMINUTION_DEFAULTS.DEFAULT_DENSITY) / 1000);
}

/** The lead one grind of a lead stock puts into the grinder (`metabolism.leadDustDose`). */
function leadDustDose(): number {
  try {
    const n = Number.parseFloat(AppApi.setting(AppSettingKeys.metabolismLeadDustDose) ?? '');
    return Number.isFinite(n) && n > 0 ? n : 0.3;
  } catch {
    return 0.3;
  }
}

/** Clone a sack, fill it, stamp the grade, the mark and the carried payload. */
async function fillSack(
  vesselPath: string,
  materialPath: string,
  litres: number,
  plan: ComminutionPlan | null,
  makerPath: string,
  landing: (Stuff & Container) | null,
  kg: number,
  sourcePayload: BulkPayload | null,
): Promise<void> {
  const sack = await StuffApi.clone<Stuff>(vesselPath);
  const slot = BulkableApi.slotFor(sack, undefined);
  if (slot) {
    if (materialPath) slot.setMaterial(await StuffApi.singleton<Material>(materialPath));
    slot.setAmount(Quantity.of(litres, 'L'));
    // ⭐ The per-litre domains ride the matter through the stones — a
    // fold against an empty destination carries them at strength.
    if (sourcePayload) {
      const carried = BulkableApi.blendPayloads(sourcePayload, litres > 0 ? litres : 1, null, 0);
      const next: BulkPayload = { ...(slot.getPayload() ?? {}) };
      if (carried.dissolvedToxins) next.dissolvedToxins = carried.dissolvedToxins;
      if (carried.dissolvedAromatics) next.dissolvedAromatics = carried.dissolvedAromatics;
      if (Object.keys(next).length > 0) slot.setPayload(next);
    }
    // ⭐ The extraction, stamped continuously — two settings a hundredth
    // apart are different matter.
    if (plan !== null) {
      slot.setPayload({ ...(slot.getPayload() ?? {}), makeup: plan.makeup, water: plan.water });
    }
  }
  if (MixinApi.isTangible(sack)) {
    sack.setMass(Quantity.of(sack.getMass().rawValue() + Math.max(0, kg), 'kg'));
  }
  if (plan !== null && MixinApi.isGraded(sack)) sack.setGradeBand(plan.grade.getBand());
  if (makerPath && MixinApi.isCrafted(sack)) sack.setMaker(makerPath);
  if (landing) await ContainmentApi.move(sack as Stuff & Containable, landing);
}
