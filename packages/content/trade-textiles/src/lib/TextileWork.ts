/**
 * TextileWork — ⭐ **the textile chain's three acts, at a worker's hands**
 * (controller-liquidity W11): `scutch`, `spin` and `weave`, each answered
 * as an `ActPlan` with its charge, its yield, its band, its pace by the
 * instrument at hand, its dials and its mint.
 *
 * A value object (one worker, one instrument — possibly none) rather than a
 * method on what is worked, because what is worked is not one class: a
 * fleece is a `Provision`, the scutched source is any vessel of retted
 * fibre, and only what the chain MAKES is always a `TextileStock`.
 *
 * ⭐⭐ The product is minted BEFORE the input is consumed (C29): a mint that
 * fails refuses `not-made` with everything still in hand, never "You get ."
 * over an empty bale.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { ActDone, ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { Grade, GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import TextileStock from '../thing/TextileStock';

const LINE_ROW = '/trade/textiles/thing/line';
const TOW_ROW = '/trade/textiles/thing/tow';
const SHIVE_ROW = '/trade/textiles/thing/shive';
const YARN_ROW = '/trade/textiles/thing/yarn';
const BOLT_ROW = '/trade/textiles/thing/bolt';

/** The three points on the weave continuum, as fabric FORM words. */
export type WeaveForm = 'sackcloth' | 'woven' | 'fine-woven';

/** A stack the textile acts draw from — line, tow, a fleece, yarn. */
type Stock = Stuff & { getQuantity(): number; setQuantity(n: number): void };

/** ⭐ Every reason a textile act refuses — the controllers word each. */
export type TextileRefusal =
  /** Spin: not a fibre, or spun already. */
  | ActRefusal<'not-spinnable'>
  /** Weave: not yarn. */
  | ActRefusal<'not-yarn'>
  /** Scutch: the vessel holds nothing. */
  | ActRefusal<'nothing-to-work'>
  /** Scutch: still straw — it wants retting first. */
  | ActRefusal<'not-retted'>
  /** Scutch: not a fibre at all. */
  | ActRefusal<'not-fibre'>
  /** Scutch: retted too long; nothing to save. */
  | ActRefusal<'over-retted'>
  /** Not enough in hand (or in the vessel) for one act. */
  | ActRefusal<'too-little'>
  /** ⭐ The product could not be made — nothing was consumed (C29). */
  | ActRefusal<'not-made'>;

/** What the spin's begin words need. */
export interface SpinBegin {
  stock: Stuff;
  overreach: boolean;
}
/** What came off the spindle. */
export type SpinDone =
  | { kind: 'parted' }
  | { kind: 'yarn'; units: number; count: number; overreach: boolean }
  | { kind: 'gone' };
/** What the weave's begin words need. */
export interface WeaveBegin {
  yarn: Stuff;
}
/** What came off the loom. */
export type WeaveDone = { kind: 'bolt'; units: number; form: WeaveForm } | { kind: 'gone' };
/** What the scutch's begin words need. */
export interface ScutchBegin {
  source: Stuff;
  hard: boolean;
}
/** What came off the board, by name and units. */
export type ScutchDone =
  | { kind: 'fibre'; made: ReadonlyArray<{ label: 'line' | 'tow' | 'shive'; units: number }>; hard: boolean }
  | { kind: 'gone' };

export type SpinPlan = ActPlan<SpinBegin, SpinDone, TextileRefusal>;
export type WeavePlan = ActPlan<WeaveBegin, WeaveDone, TextileRefusal>;
export type ScutchPlan = ActPlan<ScutchBegin, ScutchDone, TextileRefusal>;

export default class TextileWork {
  constructor(
    private readonly actor: Stuff,
    private readonly instrument: Stuff | null,
  ) {}

  /** ⭐ Dials, not constants — the benches assert against them. */
  static readonly SCUTCH_BASE_MS_KEY = 'textiles.scutch.baseMs';
  static readonly SCUTCH_BASE_MS = 20 * 60 * 1000;
  /** Litres of retted fibre one scutch works (⚠ LITRES — bulk is volumetric). */
  static readonly SCUTCH_CHARGE_L_KEY = 'textiles.scutch.chargeLitres';
  static readonly SCUTCH_CHARGE_L = 4;
  static readonly SCUTCH_EFFORT_W = 400;
  /**
   * ⚠⚠ Spinning is roughly six times weaving's labour per unit of cloth —
   * a LESSON, not a tuning accident: one weaver kept several spinners
   * busy. Do not "balance" this down.
   */
  static readonly SPIN_BASE_MS_KEY = 'textiles.spin.baseMs';
  static readonly SPIN_BASE_MS = 90 * 60 * 1000;
  static readonly SPIN_CHARGE_KEY = 'textiles.spin.chargeUnits';
  static readonly SPIN_CHARGE = 2;
  /** The count an untrained hand can reach, and how much further a band. */
  static readonly SPIN_BASE_COUNT_KEY = 'textiles.spin.baseCount';
  static readonly SPIN_BASE_COUNT = 10;
  static readonly SPIN_COUNT_PER_BAND_KEY = 'textiles.spin.countPerBand';
  static readonly SPIN_COUNT_PER_BAND = 8;
  static readonly SPIN_EFFORT_W = 250;
  /** ⚠ Roughly a sixth of `spin`'s — the bench asserts the ratio. */
  static readonly WEAVE_BASE_MS_KEY = 'textiles.weave.baseMs';
  static readonly WEAVE_BASE_MS = 15 * 60 * 1000;
  static readonly WEAVE_CHARGE_KEY = 'textiles.weave.chargeUnits';
  static readonly WEAVE_CHARGE = 4;
  static readonly WEAVE_EFFORT_W = 250;

  /**
   * ⭐⭐ **Can you spin it? Ask the MATERIAL** — line, tow and a fleece all
   * carry `fibre` — and it must not be spun ALREADY: yarn's material
   * carries `fibre` too, and `yarnCount` (non-zero iff somebody drew it
   * out) is the construction fact no material tag could carry.
   */
  private static isSpinnable(stock: Stuff): boolean {
    if (!MixinApi.isTangible(stock)) return false;
    if (stock.getMaterial()?.hasTag('fibre') !== true) return false;
    return !(stock instanceof TextileStock) || stock.getYarnCount() <= 0;
  }

  /**
   * ⭐ **Is it yarn? It has a count** (C23). This was a template-PATH test
   * (`endsWith('/yarn')`), which refused the cordage pack's hemp yarn by
   * the accident of its row's name.
   */
  private static isYarn(stock: Stuff): boolean {
    return stock instanceof TextileStock && stock.getYarnCount() > 0;
  }

  /**
   * `spin <stock> [<count>]`: draw a thread at `count`. ⭐⭐ Overreaching
   * the spinner's ceiling does NOT refuse and does NOT make bad yarn — it
   * makes LESS: the thread parts and what parted is gone. The band comes
   * from the STOCK; no skill lengthens a staple.
   */
  public async spinPlan(
    stock: Stuff,
    opts: { count?: number },
  ): Promise<SpinPlan | TextileRefusal> {
    if (!MixinApi.isStackable(stock) || !TextileWork.isSpinnable(stock)) {
      return { ok: false, reason: 'not-spinnable' };
    }
    const charge = TextileWork.dial(TextileWork.SPIN_CHARGE_KEY, TextileWork.SPIN_CHARGE);
    // ⭐ Like stacks in hand count together: a player's titled skeins never merge.
    const inHand = stock instanceof TextileStock ? stock.quantityInHand() : stock.getQuantity();
    if (inHand < charge) return { ok: false, reason: 'too-little' };
    const baseCount = TextileWork.dial(TextileWork.SPIN_BASE_COUNT_KEY, TextileWork.SPIN_BASE_COUNT);
    const band = await TextileWork.competenceOf(this.actor);
    const ceiling =
      baseCount +
      CompetenceBand.rank(band) *
        TextileWork.dial(TextileWork.SPIN_COUNT_PER_BAND_KEY, TextileWork.SPIN_COUNT_PER_BAND);
    const count = Math.max(1, Math.round(opts.count ?? baseCount));
    const overreach = Math.max(0, count - ceiling);
    const yieldUnits = Math.max(0, Math.round(charge * Math.max(0, 1 - overreach / Math.max(1, ceiling))));
    const source = stock as Stock;
    return {
      ok: true,
      durationMs: TextileWork.paced(
        TextileWork.dial(TextileWork.SPIN_BASE_MS_KEY, TextileWork.SPIN_BASE_MS),
        this.instrument,
        'spinning',
      ),
      effortW: TextileWork.SPIN_EFFORT_W,
      facts: { stock, overreach: overreach > 0 },
      onComplete: async (): Promise<ActDone<SpinDone, TextileRefusal>> => {
        if (source.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        // ⚠ Read the fibre BEFORE the input is consumed.
        const fibre = MixinApi.isTangible(source) ? source.getMaterial() : null;
        if (yieldUnits <= 0) {
          // The stock is consumed whether or not the thread held: that is
          // the waste, and it is the whole of the failure mode.
          TextileWork.consume(source, charge);
          return { ok: true, facts: { kind: 'parted' } };
        }
        let yarn: Stuff;
        try {
          yarn = await StuffApi.clone<Stuff>(YARN_ROW);
        } catch (err) {
          console.warn('TextileStock: could not mint yarn:', err);
          return { ok: false, reason: 'not-made' };
        }
        TextileWork.consume(source, charge);
        if (MixinApi.isStackable(yarn)) yarn.setQuantity(yieldUnits);
        if (MixinApi.isGraded(yarn)) yarn.setGrade(Grade.of(TextileWork.bandOf(source)));
        if (yarn instanceof TextileStock) {
          yarn.setYarnCount(count);
          // ⭐⭐ The yarn is the FIBRE it was drawn from.
          yarn.adoptFibre(fibre);
        }
        if (MixinApi.isCrafted(yarn)) yarn.setMaker(this.actor.getIdentityPath() ?? '');
        TextileWork.handTo(yarn, this.actor);
        return { ok: true, facts: { kind: 'yarn', units: yieldUnits, count, overreach: overreach > 0 } };
      },
    };
  }

  /**
   * `weave <yarn> [--close|--open]`. ⭐ Yield against the cloth: an open
   * weave gets more cloth out of the same thread and is worth less, a
   * close one less and worth more. The band is the YARN's, dropped one
   * for a flawed run when an untrained hand sets a fine web.
   */
  public async weavePlan(
    yarn: Stuff,
    opts: { form: WeaveForm },
  ): Promise<WeavePlan | TextileRefusal> {
    if (!MixinApi.isStackable(yarn) || !TextileWork.isYarn(yarn)) return { ok: false, reason: 'not-yarn' };
    const thread = yarn as unknown as TextileStock;
    const charge = TextileWork.dial(TextileWork.WEAVE_CHARGE_KEY, TextileWork.WEAVE_CHARGE);
    if (thread.quantityInHand() < charge) return { ok: false, reason: 'too-little' };
    const form = opts.form;
    const units = form === 'fine-woven' ? 1 : form === 'sackcloth' ? 3 : 2;
    let band = TextileWork.bandOf(thread);
    if (form === 'fine-woven' && CompetenceBand.rank(await TextileWork.competenceOf(this.actor)) < 2) {
      band = TextileWork.stepDown(band);
    }
    return {
      ok: true,
      durationMs: TextileWork.paced(
        TextileWork.dial(TextileWork.WEAVE_BASE_MS_KEY, TextileWork.WEAVE_BASE_MS),
        this.instrument,
        'weaving',
      ),
      effortW: TextileWork.WEAVE_EFFORT_W,
      facts: { yarn },
      onComplete: async (): Promise<ActDone<WeaveDone, TextileRefusal>> => {
        if (thread.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        const fibre = thread.getMaterial();
        let bolt: Stuff;
        try {
          bolt = await StuffApi.clone<Stuff>(BOLT_ROW);
        } catch (err) {
          console.warn('TextileStock: could not mint a bolt:', err);
          return { ok: false, reason: 'not-made' };
        }
        thread.drawInHand(charge);
        if (MixinApi.isStackable(bolt)) bolt.setQuantity(units);
        if (MixinApi.isConstructed(bolt)) await bolt.setConstructionForm(form);
        if (MixinApi.isGraded(bolt)) bolt.setGrade(Grade.of(band));
        // ⭐⭐ The cloth is the yarn's fibre, and answers to its name.
        if (fibre && MixinApi.isTangible(bolt)) {
          bolt.setMaterial(fibre);
          if (MixinApi.isPerceptible(bolt)) {
            const words = fibre.getName().toLowerCase().split(/\s+/).filter(Boolean);
            bolt.setKeywords([...new Set([...bolt.getKeywords(), ...words])]);
          }
        }
        if (MixinApi.isCrafted(bolt)) bolt.setMaker(this.actor.getIdentityPath() ?? '');
        TextileWork.handTo(bolt, this.actor);
        return { ok: true, facts: { kind: 'bolt', units, form } };
      },
    };
  }

  /**
   * `scutch <source> [--hard]`: beat the boon off retted fibre. ⚠⚠ The
   * chain's entry point is the FIBRE tag, whatever produced it — naming
   * the flax row would stop wool ever plugging in. Worked harder: more
   * line, shorter (one band down). ⭐ Most of a stem is boon.
   */
  public async scutchPlan(
    source: Stuff,
    opts: { hard: boolean; room: Stuff | null },
  ): Promise<ScutchPlan | TextileRefusal> {
    if (!MixinApi.isBulkable(source)) return { ok: false, reason: 'nothing-to-work' };
    const slot = BulkableApi.slotFor(source, undefined);
    const material = slot?.getMaterial() ?? null;
    if (!slot || slot.isEmpty() || !material) return { ok: false, reason: 'nothing-to-work' };
    if (!material.hasTag('fibre')) {
      return { ok: false, reason: material.hasTag('fibre-stock') ? 'not-retted' : 'not-fibre' };
    }
    // ⚠ The over-ret: there is no path from here back into the chain.
    if (material.hasTag('spoiled')) return { ok: false, reason: 'over-retted' };
    const charge = Math.min(
      slot.available(),
      TextileWork.dial(TextileWork.SCUTCH_CHARGE_L_KEY, TextileWork.SCUTCH_CHARGE_L),
    );
    if (charge <= 0) return { ok: false, reason: 'too-little' };
    const hard = opts.hard === true;
    const band = TextileWork.bandOf(source);
    const outBand = hard ? TextileWork.stepDown(band) : band;
    const yields = [
      { row: LINE_ROW, label: 'line' as const, units: Math.max(1, Math.round(charge * (hard ? 0.75 : 0.5))) },
      { row: TOW_ROW, label: 'tow' as const, units: Math.max(0, Math.round(charge * (hard ? 0.15 : 0.4))) },
      { row: SHIVE_ROW, label: 'shive' as const, units: Math.max(1, Math.round(charge * 0.75)) },
    ].filter((y) => y.units > 0);
    return {
      ok: true,
      durationMs: TextileWork.paced(
        TextileWork.dial(TextileWork.SCUTCH_BASE_MS_KEY, TextileWork.SCUTCH_BASE_MS),
        this.instrument,
        'scutching',
      ),
      effortW: TextileWork.SCUTCH_EFFORT_W,
      facts: { source, hard },
      onComplete: async (): Promise<ActDone<ScutchDone, TextileRefusal>> => {
        if (source.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        const minted: Array<{ stock: Stuff; label: 'line' | 'tow' | 'shive'; units: number }> = [];
        for (const y of yields) {
          try {
            minted.push({ stock: await StuffApi.clone<Stuff>(y.row), label: y.label, units: y.units });
          } catch (err) {
            console.warn(`TextileStock: could not mint '${y.row}':`, err);
          }
        }
        // ⭐ Nothing made, nothing taken (C29).
        if (minted.length === 0) return { ok: false, reason: 'not-made' };
        try {
          slot.debit(charge);
        } catch {
          /* the source went away mid-step; the mint is still honest */
        }
        // ⭐ (cleanliness D22) Scutching fills a shut room with flax dust,
        // which flashes on a spark if it is let build.
        if (opts.room && MixinApi.isAtmospheric(opts.room)) {
          opts.room.addAtmosphereContent('/stuff/idea/material/gas/flax-dust', charge * 10);
        }
        if (!this.actor.isDestroyed() && MixinApi.isHygienic(this.actor)) {
          this.actor.soilFrom([{ kind: 'dust', amount: 0.15, where: 'hands' }]);
        }
        for (const m of minted) {
          if (MixinApi.isStackable(m.stock)) m.stock.setQuantity(m.units);
          // ⭐ The grade rides the shipped weakest-link rule.
          if (MixinApi.isGraded(m.stock)) m.stock.setGrade(Grade.of(outBand));
          // ⭐ Line and tow are the fiber that was retted (cordage D14).
          if (m.stock instanceof TextileStock && m.label !== 'shive') m.stock.adoptFibre(material);
          TextileWork.handTo(m.stock, this.actor);
        }
        return {
          ok: true,
          facts: { kind: 'fibre', made: minted.map((m) => ({ label: m.label, units: m.units })), hard },
        };
      },
    };
  }

  /** Numeric AppSetting read with the seeded-literal fallback. */
  private static dial(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      if (raw === '' || raw == null) return fallback;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }

  /** The instrument paces the step: `baseMs` over its rate at `cap`. */
  private static paced(baseMs: number, instrument: Stuff | null, cap: string): number {
    if (!instrument || !MixinApi.isTool(instrument) || !instrument.hasCapability(cap)) return baseMs;
    return Math.round(baseMs / instrument.capabilityRate(cap));
  }

  private static async competenceOf(actor: Stuff): Promise<CompetenceBandName> {
    if (!MixinApi.isAdvancing(actor)) return 'untrained';
    try {
      return await actor.competenceBandFor('textiles');
    } catch {
      return 'untrained';
    }
  }

  /**
   * The band a source carries, or the neutral middle. ⚠⚠ Validated,
   * because `Grade.of` THROWS on anything else — a drive once watched a
   * spinner's line vanish eight times with no word.
   */
  private static bandOf(source: Stuff): string {
    const raw = MixinApi.isGraded(source) ? source.getGradeBand() : '';
    return Grade.isBand(raw) ? raw : 'fair';
  }

  /** One band down, floored at the bottom of the scale. */
  private static stepDown(band: string): string {
    const i = (GRADE_BANDS as readonly string[]).indexOf(band);
    return GRADE_BANDS[Math.max(0, (i < 0 ? 1 : i) - 1)]!;
  }

  /** Take `units` off a stack — like stacks in hand together for our own. */
  private static consume(stock: Stock, units: number): void {
    if (stock instanceof TextileStock) {
      stock.drawInHand(units);
      return;
    }
    const left = Math.max(0, stock.getQuantity() - units);
    if (left === 0) void StuffApi.destruct(stock);
    else stock.setQuantity(left);
  }

  /** Put what was made into the maker's hands. */
  private static handTo(made: Stuff, actor: Stuff): void {
    if (MixinApi.isContainable(made) && MixinApi.isContainer(actor) && !actor.isDestroyed()) {
      ContainmentApi.move(made as Stuff & Containable, actor as Stuff & Container);
    }
  }
}
