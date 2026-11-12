/**
 * CutPieces — a garment's parts, chalked and cut, waiting to be sewn.
 *
 * ⭐ It is `Wearable` **before it is wearable**, which sounds odd and is
 * exactly right: the `cutTo` stamp is the thing `cut` produces, and it
 * has to survive until `sew` puts it on a garment. Carrying the stamp
 * on the pieces is what makes "cut for a body" a fact about the CLOTH
 * rather than a fact about the finished coat, which is what lets a
 * tailor cut today and sew tomorrow.
 *
 * `seamAllowance` is `cut`'s other output and `alter`'s whole budget.
 * ⚠⚠ **Conservation is what caps it**: letting a coat out needs more
 * cloth, and there is no more cloth — only what the cut left folded
 * inside the seams. That is a physical fact, not a game rule, which is
 * why **magic hits the identical wall**: a spell cannot conjure matter,
 * so a working might alter FASTER but never FURTHER.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { ActDone, ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';

/**
 * What a pattern makes. ⚠ A pattern is a RECIPE; these are its rows. The
 * words are the view's closed `values:` list on `sew --pattern`.
 */
export const PATTERNS: ReadonlyMap<string, string> = new Map([
  ['shirt', '/trade/tailoring/thing/shirt'],
  ['trousers', '/trade/tailoring/thing/trousers'],
  ['coat', '/trade/tailoring/thing/coat'],
  ['apron', '/trade/tailoring/thing/apron'],
]);

/** ⭐ Every reason the pieces refuse `sew`. */
export type SewRefusal =
  | ActRefusal<'unknown-pattern', { pattern: string }>
  /** The garment could not be made — the pieces are still in hand. */
  | ActRefusal<'not-made'>;

/** What the sew's done words need. */
export type SewDone = { kind: 'garment'; garment: Stuff; pattern: string } | { kind: 'gone' };

/** A sewing. */
export type SewPlan = ActPlan<{ pieces: Stuff }, SewDone, SewRefusal>;

const CutPiecesBase = WearableMixin(
  SlottableMixin(
    StackableMixin(CraftedMixin(ConstructedMixin(Good))),
  ),
);

export default class CutPieces extends CutPiecesBase {
  static fieldMeta: FieldMeta = {
  };

  /**
   * Cloth folded inside the seams, in units — `alter`'s entire budget.
   * `0` means the cut was tight and this can never be let out.
   */



  static readonly SEW_BASE_MS_KEY = 'tailoring.sew.baseMs';
  static readonly SEW_BASE_MS = 90 * 60 * 1000;

  /**
   * ⭐ `sew <pieces> --pattern <p>` — the pieces become the garment
   * (controller-liquidity W11). Everything the pieces knew travels: the
   * cloth's material and form, its grade, the measurements it was cut to
   * and ⚠⚠ the seam allowance (`alter`'s whole budget). The maker derives
   * from who is acting, never a parameter — and is a PERSON key
   * (`getIdentityPath`, C22). The garment is minted before the pieces are
   * consumed: a failed mint leaves them in hand.
   */
  public sewPlan(actor: Stuff, pattern: string, instrument: Stuff | null): SewPlan | SewRefusal {
    const row = PATTERNS.get(pattern);
    if (!row) return { ok: false, reason: 'unknown-pattern', facts: { pattern } };
    const self = this as unknown as Stuff;
    const rate =
      instrument && MixinApi.isTool(instrument) && instrument.hasCapability('mending')
        ? instrument.capabilityRate('mending')
        : 1;
    return {
      ok: true,
      durationMs: Math.round(CutPieces.dial(CutPieces.SEW_BASE_MS_KEY, CutPieces.SEW_BASE_MS) / rate),
      effortW: 250,
      facts: { pieces: self },
      onComplete: async (): Promise<ActDone<SewDone, SewRefusal>> => {
        if (this.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        let garment: Stuff;
        try {
          // Made FROM the pieces: the garment is whoever's the cut cloth was.
          garment = await StuffApi.clone<Stuff>(row, undefined, { madeFrom: self });
        } catch (err) {
          console.warn(`CutPieces: could not mint '${row}':`, err);
          return { ok: false, reason: 'not-made' };
        }
        const mat = this.getMaterial();
        if (mat && MixinApi.isTangible(garment)) garment.setMaterial(mat);
        const form = this.getConstructionForm();
        if (form && MixinApi.isConstructed(garment)) await garment.setConstructionForm(form);
        if (MixinApi.isWearable(garment)) {
          const cut = this.getCutTo();
          if (cut.bodyPlanPath) garment.setCutTo(cut.bodyPlanPath, cut.statureM, cut.girthIndex);
          garment.setSeamAllowance(this.getSeamAllowance());
        }
        // ⭐ The maker's mark: who is acting, through the authoring context.
        const maker = (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? actor;
        if (MixinApi.isCrafted(garment)) {
          const band = this.getGradeBand();
          garment.stamp({
            maker: maker.getIdentityPath() ?? '',
            grade: Grade.of(Grade.isBand(band) ? band : 'fair'),
            recipe: row,
            craftedAt: Math.floor(WorldClockApi.getNow().rawValue()),
          });
        }
        if (MixinApi.isContainable(garment) && MixinApi.isContainer(actor) && !actor.isDestroyed()) {
          if (MixinApi.isCarrying(actor)) actor.receive(garment as Stuff & Containable);
          else ContainmentApi.move(garment as Stuff & Containable, actor as Stuff & Container);
        }
        await StuffApi.destruct(self);
        return { ok: true, facts: { kind: 'garment', garment, pattern } };
      },
    };
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

  // ⚠ TS re-surface of the inner `GradedMixin`'s members (the
  // documented `Crafted.ts` cast quirk — `GradedReceptacle` carries the
  // same block). `declare` only: no runtime slots.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
}
