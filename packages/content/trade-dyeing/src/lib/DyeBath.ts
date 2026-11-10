/**
 * DyeBath — ⭐⭐ **what is in the vessel decides the act** (controller-
 * liquidity W11, Appendix B): a dye bath and a mordant bath are two
 * chemistries in one kind of thing, a vessel of liquor.
 *
 * A bath is ANY bulk vessel — the dyer's copper, a household tub, a
 * bucket — so there is no host class to compose a protocol on; the
 * chemistry is the CONTENTS'. This value object wraps one vessel and
 * answers both verbs over it:
 *
 *  - {@link DyeBath.dyePlanFor} — the dyestuff in the bath (`Dyestuff.
 *    forMaterial`) decides the chemistry: a **mordant** dye exhausts dip by
 *    dip and binds to the metal waiting on the cloth; a **vat** dye
 *    accumulates and refuses a mordanted cloth outright. Cellulose without
 *    tannin, and silk still in its gum, pay a bond penalty in depth and in
 *    fastness.
 *  - {@link DyeBath.mordantPlanFor} — ⭐ the mordant is the bath's
 *    MATERIAL (C9): a material tagged `mordant` (alum `brightening`, iron
 *    `saddening`, `tannin`), and a dose of it is spent from the bath. It
 *    was a free word the player typed, and nothing was consumed.
 *
 * Both answer an `ActPlan`; the controllers word them.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Dyed } from '@saxonberg/server/mud/lib/material/Dyed';
import type { BulkSlot } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import Dyestuff from '../idea/Dyestuff';

/** The three mordants the trade knows, by the tag their material carries. */
export type MordantKey = 'alum' | 'iron' | 'tannin';

/** ⭐ Every reason a bath refuses — the two controllers word each. */
export type DyeBathRefusal =
  | ActRefusal<'empty-bath'>
  /** Dye: the bath holds nothing that colours. */
  | ActRefusal<'not-a-dyestuff'>
  /** Dye: a mordanted cloth in a vat — the vat wants it bare. */
  | ActRefusal<'mordant-on-vat'>
  /** Dye: that mordant and that dye do not answer to each other. */
  | ActRefusal<'no-shade'>
  /** Mordant: the bath holds no mordant. */
  | ActRefusal<'not-a-mordant'>
  /** Mordant: already mordanted, not yet dyed — a second bath will not take. */
  | ActRefusal<'already-mordanted'>
  /** Mordant: not enough in the bath for a dose. */
  | ActRefusal<'too-little'>;

/** What came of a dip. */
export type DyeDone =
  | { kind: 'dyed'; chemistry: 'mordant' | 'vat'; colour: string; gummed: boolean; thin: boolean }
  | { kind: 'gone' };
/** What came of a mordant bath. */
export type MordantDone = { kind: 'mordanted'; mordant: MordantKey } | { kind: 'gone' };

export type DyePlan = ActPlan<{ bath: Stuff }, DyeDone, never>;
export type MordantPlan = ActPlan<{ mordant: MordantKey }, MordantDone, never>;

type DyedStuff = Stuff & Dyed;

export default class DyeBath {
  /** ⭐ Dials, not constants. */
  static readonly DYE_BASE_MS_KEY = 'dyeing.dye.baseMs';
  static readonly DYE_BASE_MS = 45 * 60 * 1000;
  static readonly MORDANT_BASE_MS_KEY = 'dyeing.mordant.baseMs';
  static readonly MORDANT_BASE_MS = 30 * 60 * 1000;
  /** How much a band of competence adds to the bond, `0..1`. */
  static readonly FASTNESS_PER_BAND_KEY = 'dyeing.fastnessPerBand';
  static readonly FASTNESS_PER_BAND = 0.06;
  /** How much of the bath a first dip takes. The exhaust. */
  static readonly EXHAUST_KEY = 'dyeing.exhaustFraction';
  static readonly EXHAUST = 0.5;
  /** Litres of mordant liquor one piece takes up. */
  static readonly MORDANT_DOSE_L_KEY = 'dyeing.mordant.doseLitres';
  static readonly MORDANT_DOSE_L = 1;
  static readonly EFFORT_W = 250;

  private readonly slot: BulkSlot | null;
  private readonly material: Material | null;

  /** The bath in `vessel` — what is in it is read now. */
  constructor(private readonly vessel: Stuff) {
    this.slot = MixinApi.isBulkable(vessel) ? BulkableApi.slotFor(vessel, undefined) : null;
    this.material = this.slot && !this.slot.isEmpty() ? this.slot.getMaterial() : null;
  }

  /** The dyestuff this bath holds, or `null`. */
  public dyestuff(): Dyestuff | null {
    return this.material ? Dyestuff.forMaterial(this.material.getTemplatePath() ?? '') : null;
  }

  /** The mordant this bath holds, or `null` — read off its material's tags. */
  public mordant(): MordantKey | null {
    const m = this.material;
    if (!m || !m.hasTag('mordant')) return null;
    if (m.hasTag('tannin')) return 'tannin';
    if (m.hasTag('saddening')) return 'iron';
    if (m.hasTag('brightening')) return 'alum';
    return null;
  }

  /**
   * `dye <cloth> [in <bath>]` — the dip. See the header for the two
   * chemistries; the mordant waiting on the cloth is CONSUMED into the
   * application it decided.
   */
  public async dyePlanFor(actor: Stuff, target: DyedStuff): Promise<DyePlan | DyeBathRefusal> {
    const slot = this.slot;
    if (!slot || !this.material) return { ok: false, reason: 'empty-bath' };
    // ⚠⚠ `dye` takes a dyestuff MATERIAL, never a crop — the seam a
    // synthetic walks through.
    const dyestuff = this.dyestuff();
    if (!dyestuff) return { ok: false, reason: 'not-a-dyestuff' };
    const pending = DyeBath.pendingMordant(target);
    const chemistry = dyestuff.getChemistry();
    // ⚠⚠ A mordant on a VAT dye is REFUSED, not silently ignored.
    if (chemistry === 'vat' && pending) return { ok: false, reason: 'mordant-on-vat' };
    const shade = dyestuff.shadeFor(chemistry === 'vat' ? '' : (pending ?? ''));
    if (!shade) return { ok: false, reason: 'no-shade' };

    const fibre = MixinApi.isTangible(target) ? target.getMaterial() : null;
    // ⭐⭐⭐ Cellulose does not hold metal ions without a tannin first; and
    // GUM holds nothing either (raw silk dyes thin until boiled off).
    const cellulose = fibre?.hasTag('cellulose') ?? false;
    const tanninFirst = target.getDyeStack().some((a) => a.mordant === 'tannin');
    const gummed = fibre?.hasTag('gummed') ?? false;
    const bondPenalty =
      gummed || (chemistry === 'mordant' && cellulose && !tanninFirst && pending !== 'tannin') ? 0.5 : 1;

    const band = await DyeBath.competenceOf(actor);
    const fastness = DyeBath.clamp01(
      shade.fastness * bondPenalty +
        CompetenceBand.rank(band) * DyeBath.dial(DyeBath.FASTNESS_PER_BAND_KEY, DyeBath.FASTNESS_PER_BAND),
    );
    // ⭐ The bath EXHAUSTS for a mordant dye and ACCUMULATES for a vat
    // dye; ⭐⭐ the bond penalty pays in DEPTH as well as fastness.
    const exhaust = DyeBath.dial(DyeBath.EXHAUST_KEY, DyeBath.EXHAUST);
    const available = slot.available();
    const capacity = slot.getCapacity()?.rawValue() ?? available;
    const fullness = capacity > 0 ? Math.min(1, available / capacity) : 1;
    const strength =
      chemistry === 'vat'
        ? DyeBath.clamp01((0.35 + DyeBath.priorDepth(target)) * bondPenalty)
        : DyeBath.clamp01(fullness * exhaust * 1.6 * bondPenalty);
    return {
      ok: true,
      durationMs: DyeBath.dial(DyeBath.DYE_BASE_MS_KEY, DyeBath.DYE_BASE_MS),
      effortW: DyeBath.EFFORT_W,
      facts: { bath: this.vessel },
      onComplete: () => {
        if (target.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        if (pending) DyeBath.dropPendingMordant(target);
        // ⭐⭐ The shade's POSITION travels onto the cloth: the kernel folds
        // the stack subtractively from these, and may not reach into a
        // pack for a row.
        target.applyDye({
          dyestuff: dyestuff.getMaterialPath(),
          mordant: chemistry === 'vat' ? '' : (pending ?? ''),
          strength,
          transmitR: shade.transmitR,
          transmitG: shade.transmitG,
          transmitB: shade.transmitB,
        });
        target.setFastness(fastness);
        // The mordant bath exhausts; a vat is fed, not spent.
        if (chemistry === 'mordant') {
          try {
            slot.debit(available * exhaust);
          } catch {
            /* the bath went away mid-step */
          }
        }
        return {
          ok: true,
          facts: { kind: 'dyed', chemistry, colour: shade.colour, gummed, thin: bondPenalty < 1 },
        };
      },
    };
  }

  /**
   * `mordant <cloth> [in <bath>]` — the cloth takes the bath's mordant as
   * a zero-strength application: on the cloth, below legibility, deciding
   * the colour before it can be seen. A dose is spent from the bath.
   */
  public mordantPlanFor(_actor: Stuff, target: DyedStuff): MordantPlan | DyeBathRefusal {
    const slot = this.slot;
    if (!slot || !this.material) return { ok: false, reason: 'empty-bath' };
    const key = this.mordant();
    if (!key) return { ok: false, reason: 'not-a-mordant' };
    // ⚠ Already mordanted and not yet dyed — the bath would do nothing.
    if (DyeBath.pendingMordant(target) !== null) return { ok: false, reason: 'already-mordanted' };
    const dose = DyeBath.dial(DyeBath.MORDANT_DOSE_L_KEY, DyeBath.MORDANT_DOSE_L);
    if (slot.available() < dose) return { ok: false, reason: 'too-little' };
    const materialPath = this.material.getTemplatePath() ?? '';
    return {
      ok: true,
      durationMs: DyeBath.dial(DyeBath.MORDANT_BASE_MS_KEY, DyeBath.MORDANT_BASE_MS),
      effortW: DyeBath.EFFORT_W,
      facts: { mordant: key },
      onComplete: () => {
        if (target.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        try {
          slot.debit(dose);
        } catch {
          return { ok: true, facts: { kind: 'gone' } };
        }
        target.applyDye({ dyestuff: materialPath, mordant: key, strength: 0 });
        return { ok: true, facts: { kind: 'mordanted', mordant: key } };
      },
    };
  }

  /** The mordant key waiting on the cloth (a zero-strength entry), or null. */
  private static pendingMordant(target: DyedStuff): string | null {
    const stack = target.getDyeStack();
    const last = stack[stack.length - 1];
    return last && last.strength === 0 ? last.mordant : null;
  }

  /** Drop the trailing zero-strength mordant entry — it is spent. */
  private static dropPendingMordant(target: DyedStuff): void {
    const stack = [...target.getDyeStack()];
    stack.pop();
    target.setDyeStack(stack.map((a) => ({ ...a })));
  }

  /** ⭐ A vat dye ACCUMULATES: each dip builds on the last. */
  private static priorDepth(target: DyedStuff): number {
    let depth = 0;
    for (const a of target.getDyeStack()) depth = Math.max(depth, a.strength);
    return depth * 0.5;
  }

  private static async competenceOf(actor: Stuff): Promise<CompetenceBandName> {
    if (!MixinApi.isAdvancing(actor)) return 'untrained';
    try {
      return await actor.competenceBandFor('dyeing');
    } catch {
      return 'untrained';
    }
  }

  private static clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

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
}
