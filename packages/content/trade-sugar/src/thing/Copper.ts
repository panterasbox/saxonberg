/**
 * The sugar copper — ⭐ the pan a refinery boils its liquor in, and the
 * thing whose GRADE decides whether the liquor will grain.
 *
 * A `Vat` (open, 120 L) that also holds a block of raw sugar long enough
 * to dissolve it. Everything the boil does — the climbing boiling point,
 * the water boiled off, the stages — is the kernel's plateau reading the
 * liquor's own material (sugar D1). What this class adds is the three
 * acts a boiler does to the liquor before it boils, and the grade those
 * acts write:
 *
 * - **dissolve** — a raw-sugar block put into the copper's water goes
 *   into solution. Physics, not a recipe: a block in a dry copper is
 *   refused, and the liquor's strength is whatever block-to-water you
 *   gave it.
 * - **temper** — lime into the liquor. It is what lets a liquor grain at
 *   all: an untempered pan grades `poor`, below the strike arrow's
 *   `minBand`, so it boils to blackstrap. Over-limed, it grains dark.
 * - **skim** — the scum lifted into a pail. An unskimmed pan grains dark.
 *
 * ⚠ The band is on the COPPER, because that is what the kernel's arrow
 * reads (`concentrateIfReached` asks the vessel's grade); the flags that
 * decide it ride the liquor's payload, so a pour carries them.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

/** The liquor a block of raw sugar dissolves into. */
const RAW_LIQUOR = '/trade/sugar/idea/material/raw-liquor';
const SKIMMINGS = '/trade/sugar/idea/material/skimmings';
/** Sucrose's own density: what a kilogram of it adds to the volume. */
const SUGAR_KG_PER_L = 1.6;
/** The share of the liquor a skim lifts off with the scum. */
const SKIM_SHARE = 0.05;

declare module '@saxonberg/server/mud/lib/bulk/Bulkable' {
  interface BulkPayload {
    /** How many lumps of lime have gone into this liquor (sugar D1). */
    limed?: number;
    /** Whether its scum has been lifted off. */
    skimmed?: boolean;
  }
}

/** What a temper or a skim did, or why it did not. */
export type SugarActResult =
  | { ok: true; line: string }
  | { ok: false; reason: string; line: string };

const VERBS = ['trade/sugar/cmd/sugar/temper.yaml', 'trade/sugar/cmd/sugar/skim.yaml'];

export default class Copper extends ContainerMixin(Vat) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: VERBS,
    peers: VERBS,
  };

  constructor() {
    super();
    this.category = 'copper';
    this.setInteriorCapacity(Quantity.of(120, 'L'));
    this.setClosure('open');
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
      payload.dissolvedSolidsKgPerL ?? held?.getSolidsKgPerL() ?? 0;
    const after = litres + kg / SUGAR_KG_PER_L;
    const solids = (solidsBefore * litres + kg) / after;
    const fresh = held === null || held.getSolidsKgPerL() <= 0;
    if (fresh) {
      const liquor = StuffApi.findByTemplatePath<Material>(RAW_LIQUOR);
      if (liquor) this.setBulkMaterial('interior', liquor);
    }
    this.setBulkAmount('interior', Quantity.of(after, 'L'));
    this.setBulkPayload('interior', {
      ...(fresh ? {} : payload),
      dissolvedSolidsKgPerL: solids,
      ...(fresh ? { limed: 0, skimmed: false } : {}),
    });
    this.regrade();
    // ⚠ Consumed AFTER the move, never inside it (the hive's lesson).
    void Promise.resolve()
      .then(() => StuffApi.destruct(thing))
      .catch(() => undefined);
  }

  /** Lime into the liquor — one lump. */
  public temper(lime: Stuff): SugarActResult {
    if (!this.holdsLiquor()) {
      return { ok: false, reason: 'no-liquor', line: 'There is no liquor in the copper to temper.' };
    }
    if (!isLime(lime)) {
      return { ok: false, reason: 'not-lime', line: 'That is not lime.' };
    }
    const payload = this.getBulkPayload('interior') ?? {};
    const limed = (payload.limed ?? 0) + 1;
    this.setBulkPayload('interior', { ...payload, limed });
    if (MixinApi.isStackable(lime) && lime.getQuantity() > 1) {
      lime.setQuantity(lime.getQuantity() - 1);
    } else {
      void StuffApi.destruct(lime);
    }
    this.regrade();
    return {
      ok: true,
      line:
        limed === 1
          ? 'The lime goes in; the liquor clouds, and a grey scum starts to rise.'
          : 'More lime goes in. The liquor darkens — that is too much.',
    };
  }

  /** The scum lifted into `pail`. */
  public skim(pail: Stuff): SugarActResult {
    if (!this.holdsLiquor()) {
      return { ok: false, reason: 'no-liquor', line: 'There is nothing in the copper to skim.' };
    }
    if (!MixinApi.isBulkable(pail) || pail === (this as unknown as Stuff)) {
      return { ok: false, reason: 'no-pail', line: 'You need something to skim it into.' };
    }
    const payload = this.getBulkPayload('interior') ?? {};
    if (payload.skimmed) {
      return { ok: false, reason: 'already-skimmed', line: 'It is skimmed clean already.' };
    }
    const into = pail.getBulkMaterial('interior');
    if (into !== null && into.getTemplatePath() !== SKIMMINGS) {
      return { ok: false, reason: 'pail-full', line: 'That already has something else in it.' };
    }
    const lift = this.getBulkAmount('interior').rawValue() * SKIM_SHARE;
    const skimmings = StuffApi.findByTemplatePath<Material>(SKIMMINGS);
    if (!skimmings) {
      return { ok: false, reason: 'no-skimmings', line: 'The scum will not come away.' };
    }
    this.debitBulk('interior', lift);
    const had = pail.getBulkAmount('interior').rawValue();
    pail.setBulkMaterial('interior', skimmings);
    pail.setBulkAmount('interior', Quantity.of(had + lift, 'L'));
    this.setBulkPayload('interior', { ...(this.getBulkPayload('interior') ?? {}), skimmed: true });
    this.regrade();
    return { ok: true, line: 'You lift the scum off into the pail, and the liquor runs clear beneath it.' };
  }

  /**
   * ⭐ The band the liquor will grain at — written onto the copper, which
   * the strike arrow reads. Untempered will not grain at all; over-limed
   * or unskimmed grains dark; tempered once and skimmed grains clean.
   */
  public liquorBand(): string {
    const payload = this.getBulkPayload('interior') ?? {};
    const limed = payload.limed ?? 0;
    if (limed === 0) return 'poor';
    if (limed >= 2 || !payload.skimmed) return 'fair';
    return 'fine';
  }

  private regrade(): void {
    if (!this.holdsLiquor()) return;
    this.setGrade(Grade.of(this.liquorBand()));
  }

  private holdsLiquor(): boolean {
    if (this.isBulkEmpty('interior')) return false;
    const mat = this.getBulkMaterial('interior');
    return mat !== null && mat.getSolidsKgPerL() > 0;
  }
}

function isRawSugar(thing: Stuff): boolean {
  return MixinApi.isTangible(thing) && (thing.getMaterial()?.hasTag('raw-sugar') ?? false);
}

function isLime(thing: Stuff): boolean {
  if (!MixinApi.isTangible(thing)) return false;
  const path = thing.getMaterial()?.getTemplatePath() ?? '';
  return path.endsWith('/quicklime') || path.endsWith('/slaked-lime');
}
