/**
 * TextileStock — the intermediate goods of the chain: line, tow, shive
 * and yarn.
 *
 * One class, four rows, because they differ in **prose and numbers**
 * rather than in behaviour: each is a graded, stackable quantity of
 * something that is on its way to being cloth (or, in shive's case, on
 * its way to the fire).
 *
 * ⭐ `Crafted` is what carries the **grade** from the field to the bolt.
 * The band the harvest stamped off the plant's worst stretch rides the
 * shipped weakest-link rule through every step here, and **that band IS
 * the staple length** — there is no separate staple field, because a
 * second number saying the same thing would drift from the first.
 *
 * `yarnCount` is the one number only yarn uses: the count is `spin`'s
 * whole decision, and it is left `0` on line, tow and shive because
 * they have no such thing.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { Grade, GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { ActDone, ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

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

const TextileStockBase = StackableMixin(CraftedMixin(Good));

export default class TextileStock extends TextileStockBase {
  // ⚠ TS re-surface of the inner `GradedMixin`'s members: they are
  // present at runtime, but an anonymous mixin base's members do not
  // surface through `CraftedMixin` (the documented `Crafted.ts` cast
  // quirk — `GradedReceptacle` carries the same block for the same
  // reason). `declare` only: no runtime slots, no behaviour change.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
  static fieldMeta: FieldMeta = {
    yarnCount: { persistent: true, authorable: true },
    fibreWord: { persistent: true, runtimeState: true },
  };

  /**
   * ⭐ The fiber this stock was worked from when it is not the row's own
   * (cordage D14): hemp line scutched off a hemp sheaf. `''` = the row's.
   */
  public fibreWord = '';

  /**
   * The yarn count — how many hanks to the pound, so **higher is
   * finer**. `0` on anything that is not yarn.
   *
   * ⚠ It is the real unit rather than a "fineness" abstraction on
   * purpose: without it, *how fine* is a vibe, and `spin`'s decision
   * stops being a decision.
   */
  public yarnCount = 0;

  public getYarnCount(): number {
    return this.yarnCount;
  }

  public setYarnCount(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `TextileStock.setYarnCount: must be a finite, non-negative number, got ${value}`,
      );
    }
    this.yarnCount = value;
  }

  /**
   * ⭐ *skein of wool yarn* · *skein of raw silk yarn* — yarn is named for
   * the FIBRE it was drawn from, which `spin` now carries onto it. Line,
   * tow, shive and a reeled skein (`yarnCount` 0) keep their authored
   * words: they are not yarn yet.
   *
   * ⚠ Until the silk build, `spin` set nothing but the count, so spun wool
   * was a *skein of linen yarn* with linen's material — every fibre
   * became linen at the wheel.
   */
  override getShortDescription(): string {
    const stem = super.getShortDescription();
    // ⭐ Line and tow worked from another fiber name it where the row's
    // words name flax (cordage D14): *hank of hemp line*.
    if (this.yarnCount <= 0) return this.fibreWord !== '' ? stem.replace(/\bflax\b/, this.fibreWord) : stem;
    const fibre = MixinApi.isTangible(this) ? this.getMaterial()?.getName() : '';
    return fibre ? `skein of ${fibre} yarn` : stem;
  }

  /**
   * ⭐ Take the fiber it was worked from (cordage D14; spin's `carryFibre`
   * folded into the class): its material, its name among the keywords, and
   * — when it is not the row's own fiber — its name in the words.
   */
  public adoptFibre(material: Material | null): void {
    if (material === null) return;
    const own = this.getMaterial();
    this.setMaterial(material);
    const words = material.getName().toLowerCase().split(/\s+/).filter(Boolean);
    this.setKeywords([...new Set([...this.getKeywords(), ...words])]);
    if (own !== material) this.fibreWord = material.getName().toLowerCase();
  }

  /**
   * ⭐⭐ The stock one act may draw on: this stack and every stack beside it
   * in the same hands that is the same STUFF — the same row, the same
   * fibre, the same count (0 for line and reeled skeins, the yarn's count
   * for yarn). This stack first.
   *
   * ⚠ A good somebody MADE is titled to them and a titled stack never
   * merges (the chattel rule), so a player's two reeled skeins are two
   * stacks of one and two spins are two stacks of yarn; a `spin` (charge
   * 2) or a warp (charge 4) that counted only the stack named refused every
   * one a player could make (silk's drive). The object answers it — a
   * controller reads it (`controllers-are-io`); the reel's `Cocoons` pool
   * is the same shape.
   */
  public likeStacksInHand(): TextileStock[] {
    const pool: TextileStock[] = [this];
    const holder = MixinApi.isContainable(this) ? this.getContainer() : null;
    if (!holder || !MixinApi.isContainer(holder)) return pool;
    const row = this.getTemplatePath();
    const fibre = MixinApi.isTangible(this) ? this.getMaterial() : null;
    for (const s of holder.getContents() as Stuff[]) {
      if ((s as unknown) === (this as unknown) || !(s instanceof TextileStock)) continue;
      if (s.getTemplatePath() !== row || s.getYarnCount() !== this.yarnCount) continue;
      if (s.getMaterial() !== fibre) continue;
      pool.push(s);
    }
    return pool;
  }

  /** How much {@link likeStacksInHand} holds between them. */
  public quantityInHand(): number {
    return this.likeStacksInHand().reduce((n, s) => n + s.getQuantity(), 0);
  }

  /**
   * Use `units` of this stock — this stack first, then the like stacks
   * beside it — destructing any stack it empties. Returns what was drawn.
   */
  public drawInHand(units: number): number {
    let need = Math.max(0, units);
    for (const s of this.likeStacksInHand()) {
      if (need <= 0) break;
      if (s.isDestroyed()) continue;
      const take = Math.min(need, s.getQuantity());
      need -= take;
      if (take >= s.getQuantity()) StuffApi.destruct(s as unknown as Stuff);
      else s.setQuantity(s.getQuantity() - take);
    }
    return Math.max(0, units) - need;
  }

  // ─────────── the three acts of the chain (controller-liquidity W11) ───────────
  //
  // ⭐ The rule of each act — its charge, its yield, its band, its pace
  // and its mint — is the stock's, not the verb's. Each is STATIC because
  // its input is not always a TextileStock (a fleece is a `Provision`; the
  // scutched source is a vessel of retted fibre), and what it makes always
  // is. ⭐⭐ The product is minted BEFORE the input is consumed (C29): a
  // mint that fails refuses `not-made` with everything still in hand,
  // never "You get ." over an empty bale.

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
  public static isSpinnable(stock: Stuff): boolean {
    if (!MixinApi.isTangible(stock)) return false;
    if (stock.getMaterial()?.hasTag('fibre') !== true) return false;
    return !(stock instanceof TextileStock) || stock.getYarnCount() <= 0;
  }

  /**
   * ⭐ **Is it yarn? It has a count** (C23). This was a template-PATH test
   * (`endsWith('/yarn')`), which refused the cordage pack's hemp yarn by
   * the accident of its row's name.
   */
  public static isYarn(stock: Stuff): boolean {
    return stock instanceof TextileStock && stock.getYarnCount() > 0;
  }

  /**
   * `spin <stock> [<count>]`: draw a thread at `count`. ⭐⭐ Overreaching
   * the spinner's ceiling does NOT refuse and does NOT make bad yarn — it
   * makes LESS: the thread parts and what parted is gone. The band comes
   * from the STOCK; no skill lengthens a staple.
   */
  public static async spinPlan(
    actor: Stuff,
    stock: Stuff,
    opts: { count?: number; instrument: Stuff | null },
  ): Promise<SpinPlan | TextileRefusal> {
    if (!MixinApi.isStackable(stock) || !TextileStock.isSpinnable(stock)) {
      return { ok: false, reason: 'not-spinnable' };
    }
    const charge = TextileStock.dial(TextileStock.SPIN_CHARGE_KEY, TextileStock.SPIN_CHARGE);
    // ⭐ Like stacks in hand count together: a player's titled skeins never merge.
    const inHand = stock instanceof TextileStock ? stock.quantityInHand() : stock.getQuantity();
    if (inHand < charge) return { ok: false, reason: 'too-little' };
    const baseCount = TextileStock.dial(TextileStock.SPIN_BASE_COUNT_KEY, TextileStock.SPIN_BASE_COUNT);
    const band = await TextileStock.competenceOf(actor);
    const ceiling =
      baseCount +
      CompetenceBand.rank(band) *
        TextileStock.dial(TextileStock.SPIN_COUNT_PER_BAND_KEY, TextileStock.SPIN_COUNT_PER_BAND);
    const count = Math.max(1, Math.round(opts.count ?? baseCount));
    const overreach = Math.max(0, count - ceiling);
    const yieldUnits = Math.max(0, Math.round(charge * Math.max(0, 1 - overreach / Math.max(1, ceiling))));
    const source = stock as Stock;
    return {
      ok: true,
      durationMs: TextileStock.paced(
        TextileStock.dial(TextileStock.SPIN_BASE_MS_KEY, TextileStock.SPIN_BASE_MS),
        opts.instrument,
        'spinning',
      ),
      effortW: TextileStock.SPIN_EFFORT_W,
      facts: { stock, overreach: overreach > 0 },
      onComplete: async (): Promise<ActDone<SpinDone, TextileRefusal>> => {
        if (source.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        // ⚠ Read the fibre BEFORE the input is consumed.
        const fibre = MixinApi.isTangible(source) ? source.getMaterial() : null;
        if (yieldUnits <= 0) {
          // The stock is consumed whether or not the thread held: that is
          // the waste, and it is the whole of the failure mode.
          TextileStock.consume(source, charge);
          return { ok: true, facts: { kind: 'parted' } };
        }
        let yarn: Stuff;
        try {
          yarn = await StuffApi.clone<Stuff>(YARN_ROW);
        } catch (err) {
          console.warn('TextileStock: could not mint yarn:', err);
          return { ok: false, reason: 'not-made' };
        }
        TextileStock.consume(source, charge);
        if (MixinApi.isStackable(yarn)) yarn.setQuantity(yieldUnits);
        if (MixinApi.isGraded(yarn)) yarn.setGrade(Grade.of(TextileStock.bandOf(source)));
        if (yarn instanceof TextileStock) {
          yarn.setYarnCount(count);
          // ⭐⭐ The yarn is the FIBRE it was drawn from.
          yarn.adoptFibre(fibre);
        }
        if (MixinApi.isCrafted(yarn)) yarn.setMaker(actor.getIdentityPath() ?? '');
        TextileStock.handTo(yarn, actor);
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
  public static async weavePlan(
    actor: Stuff,
    yarn: Stuff,
    opts: { form: WeaveForm; instrument: Stuff | null },
  ): Promise<WeavePlan | TextileRefusal> {
    if (!MixinApi.isStackable(yarn) || !TextileStock.isYarn(yarn)) return { ok: false, reason: 'not-yarn' };
    const thread = yarn as unknown as TextileStock;
    const charge = TextileStock.dial(TextileStock.WEAVE_CHARGE_KEY, TextileStock.WEAVE_CHARGE);
    if (thread.quantityInHand() < charge) return { ok: false, reason: 'too-little' };
    const form = opts.form;
    const units = form === 'fine-woven' ? 1 : form === 'sackcloth' ? 3 : 2;
    let band = TextileStock.bandOf(thread);
    if (form === 'fine-woven' && CompetenceBand.rank(await TextileStock.competenceOf(actor)) < 2) {
      band = TextileStock.stepDown(band);
    }
    return {
      ok: true,
      durationMs: TextileStock.paced(
        TextileStock.dial(TextileStock.WEAVE_BASE_MS_KEY, TextileStock.WEAVE_BASE_MS),
        opts.instrument,
        'weaving',
      ),
      effortW: TextileStock.WEAVE_EFFORT_W,
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
        if (MixinApi.isCrafted(bolt)) bolt.setMaker(actor.getIdentityPath() ?? '');
        TextileStock.handTo(bolt, actor);
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
  public static async scutchPlan(
    actor: Stuff,
    source: Stuff,
    opts: { hard: boolean; instrument: Stuff | null; room: Stuff | null },
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
      TextileStock.dial(TextileStock.SCUTCH_CHARGE_L_KEY, TextileStock.SCUTCH_CHARGE_L),
    );
    if (charge <= 0) return { ok: false, reason: 'too-little' };
    const hard = opts.hard === true;
    const band = TextileStock.bandOf(source);
    const outBand = hard ? TextileStock.stepDown(band) : band;
    const yields = [
      { row: LINE_ROW, label: 'line' as const, units: Math.max(1, Math.round(charge * (hard ? 0.75 : 0.5))) },
      { row: TOW_ROW, label: 'tow' as const, units: Math.max(0, Math.round(charge * (hard ? 0.15 : 0.4))) },
      { row: SHIVE_ROW, label: 'shive' as const, units: Math.max(1, Math.round(charge * 0.75)) },
    ].filter((y) => y.units > 0);
    return {
      ok: true,
      durationMs: TextileStock.paced(
        TextileStock.dial(TextileStock.SCUTCH_BASE_MS_KEY, TextileStock.SCUTCH_BASE_MS),
        opts.instrument,
        'scutching',
      ),
      effortW: TextileStock.SCUTCH_EFFORT_W,
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
        if (!actor.isDestroyed() && MixinApi.isHygienic(actor)) {
          actor.soilFrom([{ kind: 'dust', amount: 0.15, where: 'hands' }]);
        }
        for (const m of minted) {
          if (MixinApi.isStackable(m.stock)) m.stock.setQuantity(m.units);
          // ⭐ The grade rides the shipped weakest-link rule.
          if (MixinApi.isGraded(m.stock)) m.stock.setGrade(Grade.of(outBand));
          // ⭐ Line and tow are the fiber that was retted (cordage D14).
          if (m.stock instanceof TextileStock && m.label !== 'shive') m.stock.adoptFibre(material);
          TextileStock.handTo(m.stock, actor);
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
