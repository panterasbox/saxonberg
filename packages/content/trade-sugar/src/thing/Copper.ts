/**
 * The sugar copper — ⭐ the pan a refinery boils its liquor in, where the
 * boiler's tempering and skimming decide whether the liquor will grain.
 *
 * A `Vat` (lidless, 120 L) that also holds a block of raw sugar long enough
 * to dissolve it. Everything the boil does — the climbing boiling point,
 * the water boiled off, the stages — is the kernel's plateau reading the
 * liquor's own material (sugar D1). What this class adds is the three
 * acts a boiler does to the liquor before it boils, and the PURITY those
 * acts write (matter-model-overlaps D12 — *temper and skim grade the
 * liquor*):
 *
 * - **dissolve** — a raw-sugar block put into the copper's water goes
 *   into solution. Physics, not a recipe: a block in a dry copper is
 *   refused, and the liquor's strength is whatever block-to-water you
 *   gave it. The block brings its sugar at the liquor row's own purity.
 * - **temper** — lime into the liquor: the first lump throws down the
 *   non-sugars (`TEMPER_LIFT`), and every lump after it darkens what it
 *   meant to clean (`OVERLIME_DROP`). Untempered, the liquor is under the
 *   strike arrow's `minPurity` and boils to blackstrap.
 * - **skim** — the scum lifted into a pail (`SKIM_LIFT`, once).
 *
 * ⭐ Everything rides the LIQUOR's payload (`purity`, and the grade read
 * off it by the row's `gradeByPurity`), so a pour carries it; the copper
 * keeps its own making and is never graded by what it boiled.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MaterialApi } from '@saxonberg/server/mud/api/material';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** The liquor a block of raw sugar dissolves into. */
/** Sucrose's own density: what a kilogram of it adds to the volume. */
const SUGAR_KG_PER_L = 1.6;
/** The share of the liquor a skim lifts off with the scum. */
const SKIM_SHARE = 0.05;
/** Purity the first lump of lime adds — the non-sugars it throws down. */
const TEMPER_LIFT = 0.08;
/** Purity every lump past the first takes — over-limed, it grains dark. */
const OVERLIME_DROP = 0.03;
/** Purity a skim adds — the scum is the rest of the non-sugars. */
const SKIM_LIFT = 0.05;

declare module '@saxonberg/server/mud/lib/bulk/Bulkable' {
  interface BulkPayload {
    /** How many lumps of lime have gone into this liquor (sugar D1). */
    limed?: number;
    /** Whether its scum has been lifted off. */
    skimmed?: boolean;
  }
}

/**
 * What a temper or a skim did, or why it did not — a reason and the
 * facts, never a sentence (controller-liquidity W10): the `temper` and
 * `skim` controllers write the words.
 */
export type SugarRefusalReason =
  | 'no-liquor'
  | 'not-lime'
  | 'no-pail'
  | 'already-skimmed'
  | 'pail-full'
  | 'no-skimmings';
export type SugarActResult =
  | { ok: true; facts: { limed?: number } }
  | { ok: false; reason: SugarRefusalReason };

const VERBS = ['trade/sugar/cmd/sugar/temper.yaml', 'trade/sugar/cmd/sugar/skim.yaml'];

export default class Copper extends ContainerMixin(Vat) {
  static fieldMeta: FieldMeta = {
    // The liquor a fresh charge of sugar boils into. Authored on the row, loaded with it (load-on-use W8:
    // a class's material is content, not a constant).
    boilsTo: { persistent: true, authorable: true, ref: 'identity:constituent' },
    // What the scum skims off as. Authored on the row, loaded with it (load-on-use W8:
    // a class's material is content, not a constant).
    skimsTo: { persistent: true, authorable: true, ref: 'identity:constituent' },
  };
  /** The liquor a fresh charge of sugar boils into. */
  protected boilsTo = '';
  public setBoilsTo(value: string): void {
    this.boilsTo = typeof value === 'string' ? value : '';
  }

  /** What the scum skims off as. */
  protected skimsTo = '';
  public setSkimsTo(value: string): void {
    this.skimsTo = typeof value === 'string' ? value : '';
  }



  static commandContributions: CommandContributions = {
    self: [],
    environment: VERBS,
    peers: VERBS,
  };

  constructor() {
    super();
    this.category = 'copper';
    this.setInteriorCapacity(Quantity.of(120, 'L'));
    this.setClosure('liquidTight');
  }

  /** A block of raw sugar goes in only where there is liquid to take it. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (!isRawSugar(thing)) {
      return { ok: false, reason: 'A copper is for boiling sugar in, not for keeping things.' };
    }
    if (this.isBulkEmpty('interior')) {
      return { ok: false, reason: 'There is no water in the copper to dissolve it in.' };
    }
    return { ok: true };
  }

  /** ⭐ The block dissolves: its sugar joins the liquor, and it is gone. */
  public onContainableAdded(thing: Stuff & Containable): void {
    if (!isRawSugar(thing) || !MixinApi.isTangible(thing)) return;
    const kg = thing.getMass().rawValue();
    const litres = this.getBulkAmount('interior').rawValue();
    const held = this.getBulkMaterial('interior');
    const payload = this.getBulkPayload('interior') ?? {};
    const solidsBefore =
      payload.dissolvedSolidsKgPerL ??
      (held !== null && MixinApi.hasSolution(held) ? held.getSolidsKgPerL() : 0);
    const after = litres + kg / SUGAR_KG_PER_L;
    const solids = (solidsBefore * litres + kg) / after;
    const fresh = held === null || !MixinApi.hasSolution(held) || held.getSolidsKgPerL() <= 0;
    if (fresh) {
      const liquor = MaterialApi.materials().need(this.boilsTo);
      if (liquor) this.setBulkMaterial('interior', liquor);
    }
    // ⭐ The block's sugar comes in at the liquor row's own purity, folded
    // by mass into what the liquor already held (D12).
    const liquorMat = this.getBulkMaterial('interior');
    const rowPurity = liquorMat !== null && MixinApi.hasSolution(liquorMat) ? liquorMat.getPurity() : 1;
    const heldKg = fresh ? 0 : solidsBefore * litres;
    const purityBefore = payload.purity ?? rowPurity;
    const purity = heldKg + kg > 0 ? (heldKg * purityBefore + kg * rowPurity) / (heldKg + kg) : rowPurity;
    this.setBulkAmount('interior', Quantity.of(after, 'L'));
    this.setBulkPayload('interior', {
      ...(fresh ? {} : payload),
      dissolvedSolidsKgPerL: solids,
      purity,
      ...(fresh ? { limed: 0, skimmed: false } : {}),
    });
    this.gradeLiquor();
    // ⚠ Consumed AFTER the move, never inside it (the hive's lesson).
    void Promise.resolve()
      .then(() => StuffApi.destruct(thing))
      .catch(() => undefined);
  }

  /** Lime into the liquor — one lump. */
  public temper(lime: Stuff): SugarActResult {
    if (!this.holdsLiquor()) {
      return { ok: false, reason: 'no-liquor' };
    }
    if (!isLime(lime)) {
      return { ok: false, reason: 'not-lime' };
    }
    const payload = this.getBulkPayload('interior') ?? {};
    const limed = (payload.limed ?? 0) + 1;
    const purity = this.purityOf(payload.purity) + (limed === 1 ? TEMPER_LIFT : -OVERLIME_DROP);
    this.setBulkPayload('interior', { ...payload, limed, purity: clampPurity(purity) });
    if (MixinApi.isStackable(lime) && lime.getQuantity() > 1) {
      lime.setQuantity(lime.getQuantity() - 1);
    } else {
      void StuffApi.destruct(lime);
    }
    this.gradeLiquor();
    return { ok: true, facts: { limed } };
  }

  /** The scum lifted into `pail`. */
  public skim(pail: Stuff): SugarActResult {
    if (!this.holdsLiquor()) {
      return { ok: false, reason: 'no-liquor' };
    }
    if (!MixinApi.isBulkable(pail) || pail === (this as unknown as Stuff)) {
      return { ok: false, reason: 'no-pail' };
    }
    const payload = this.getBulkPayload('interior') ?? {};
    if (payload.skimmed) {
      return { ok: false, reason: 'already-skimmed' };
    }
    const into = pail.getBulkMaterial('interior');
    if (into !== null && into.getTemplatePath() !== this.skimsTo) {
      return { ok: false, reason: 'pail-full' };
    }
    const lift = this.getBulkAmount('interior').rawValue() * SKIM_SHARE;
    const skimmings = MaterialApi.materials().need(this.skimsTo);
    if (!skimmings) {
      return { ok: false, reason: 'no-skimmings' };
    }
    this.debitBulk('interior', lift);
    const had = pail.getBulkAmount('interior').rawValue();
    pail.setBulkMaterial('interior', skimmings);
    pail.setBulkAmount('interior', Quantity.of(had + lift, 'L'));
    const after = this.getBulkPayload('interior') ?? {};
    this.setBulkPayload('interior', {
      ...after,
      skimmed: true,
      purity: clampPurity(this.purityOf(after.purity) + SKIM_LIFT),
    });
    this.gradeLiquor();
    return { ok: true, facts: {} };
  }

  /** The liquor's purity — its payload's, else its row's. */
  private purityOf(held: number | undefined): number {
    if (held !== undefined) return held;
    const mat = this.getBulkMaterial('interior');
    return mat !== null && MixinApi.hasSolution(mat) ? mat.getPurity() : 1;
  }

  /**
   * ⭐ The liquor's grade, read off its purity by its row's thresholds
   * (`gradeByPurity`, D12) and written onto the LIQUOR's payload; the copper
   * keeps its own making.
   */
  private gradeLiquor(): void {
    if (!this.holdsLiquor()) return;
    const mat = this.getBulkMaterial('interior');
    if (mat === null || !MixinApi.hasSolution(mat)) return;
    const payload = this.getBulkPayload('interior') ?? {};
    const band = mat.gradeAtPurity(this.purityOf(payload.purity));
    if (band === null) return;
    this.setBulkPayload('interior', { ...payload, grade: band });
  }

  private holdsLiquor(): boolean {
    if (this.isBulkEmpty('interior')) return false;
    const mat = this.getBulkMaterial('interior');
    return mat !== null && MixinApi.hasSolution(mat) && mat.getSolidsKgPerL() > 0;
  }
}

/** A purity kept to a share. */
function clampPurity(p: number): number {
  return Math.min(1, Math.max(0.01, p));
}

function isRawSugar(thing: Stuff): boolean {
  return MixinApi.isTangible(thing) && (thing.getMaterial()?.hasTag('raw-sugar') ?? false);
}

function isLime(thing: Stuff): boolean {
  if (!MixinApi.isTangible(thing)) return false;
  const path = thing.getMaterial()?.getTemplatePath() ?? '';
  return path.endsWith('/quicklime') || path.endsWith('/slaked-lime');
}
