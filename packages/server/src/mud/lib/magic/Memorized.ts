/**
 * MemorizedMixin — the specifications a mind is currently holding.
 *
 * ## Claim lives in the chronicle; sharpness lives here
 *
 * The design call of the wave. The chronicle is append-only and
 * idempotent — exactly right for *you have read of this*, and useless
 * for a decaying quantity. **Sharpness is specification state**, which
 * D15 explicitly permits to be stored and to decay: *competence never
 * fades; specifications do.*
 *
 * Derive-don't-track stays intact. Competence still derives from
 * Transcript deeds only, and reading a book writes **no** Transcript
 * entry (AC 26). What is stored here is a *binding in the holder's own
 * mind* — and a binding is precisely the kind of thing that relaxes.
 *
 * ## Vancian preparation EMERGES rather than being imposed
 *
 * There is no slot count anywhere in this mixin, and nothing forbids
 * reading every book in the library. But interference (see `Fade`) means
 * the more you hold, the hazier they all get — so you settle at the
 * repertoire you can afford. A broad generalist is permanently mediocre
 * across their whole list; a specialist's few are razor-sharp.
 *
 * ## The defective copy (D14)
 *
 * Reading above your comprehension floor does **not fail** — it produces
 * a specification the reader *believes is correct*. A bad copy costs far
 * more mana than it should and behaves oddly. That is honest (half-
 * understanding is worse than none, precisely because you don't know
 * you're wrong), **legible** (the efficiency is visibly off, the same
 * signal fade uses), and **recoverable** (re-study once competent
 * replaces it cleanly).
 *
 * It is also what gives the library teeth: gorging on books above your
 * level is not free-but-useless, it fills your head with copies that
 * cost you on every cast until you fix them — which is what makes a
 * **trustworthy teacher** valuable, since what they sell is *not getting
 * a bad copy*.
 *
 * ⚠ **Reconcile-on-read, and amnesia lives here.** An amnesia effect
 * strips held specifications and cannot touch competence — the
 * asymmetry D15 asks for, implemented where the decaying state actually
 * is rather than against an append-only ledger.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { Fade } from './Fade';
import type { FadeInputs } from './Fade';

/** One held specification. Plain scalars → persists free. */
export interface MemorizedSpec {
  /** Which working. */
  spellId: string;
  /** `[0,1]`; 1 = freshly studied. */
  sharpness: number;
  /** How many times refreshed — drives the spacing effect. */
  maturity: number;
  /** Game-seconds of the last reconcile. */
  tickedAt: number;
  /**
   * Taken on board above the reader's comprehension floor. Casts, but
   * costs far more than it should — and the holder does not know.
   */
  defective: boolean;
  /** The spell's grid verb — read by the interference count. */
  verb: string;
  /** The spell's grid noun — read by the interference count. */
  noun: string;
  /** The spell's derived complexity (see `Fade.complexityOf`). */
  complexity: number;
}

export interface Memorized {
  /** Reconcile-on-read fade across every held specification. */
  reconcileMemory(): void;
  /** Every held specification, freshly faded. */
  getMemorized(): readonly MemorizedSpec[];
  /** One held specification, freshly faded, or `null`. */
  getMemorizedSpell(spellId: string): MemorizedSpec | null;
  /** Is this working currently held at all? */
  holdsSpell(spellId: string): boolean;
  /**
   * Take a specification on board, or refresh one already held.
   * Refreshing raises sharpness to 1 and **increments maturity**, which
   * is what lengthens the next interval.
   */
  memorize(
    spec: Omit<MemorizedSpec, 'sharpness' | 'maturity' | 'tickedAt'>,
  ): void;
  /**
   * **Amnesia.** Drop a held specification, or all of them. Cannot touch
   * competence — that derives from Transcript deeds and lives nowhere
   * near here, which is the asymmetry D15 asks for.
   */
  forgetSpell(spellId: string): boolean;
  /** The mana cost multiplier this holder's copy of `spellId` implies. */
  costMultiplierFor(spellId: string): number;
  /**
   * How many OTHER held specifications sit in a neighbouring grid cell.
   * The repertoire limiter's input.
   */
  neighbourCount(spellId: string): number;

  // ---------- storage (public for the Hydrator) ----------
  memorized: MemorizedSpec[];
}

export function MemorizedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MemorizedMixin extends Base implements Memorized {
    static _mixinName = 'MemorizedMixin';

    static fieldMeta: FieldMeta = {
      memorized: { persistent: true, runtimeState: true },
    };

    /** The held repertoire. No slot cap — interference is the limiter. */
    public memorized: MemorizedSpec[] = [];

    private _reconcilingMemory = false;

    /**
     * The holder's limiting competence rank for a cell. Overridden by a
     * host that can reach the advancement layer; the inert default means
     * a fixture fades at the untrained rate rather than crashing.
     *
     * @hook Composed hosts supply the real read.
     */
    public competenceRankFor(_verb: string, _noun: string): number {
      return 0;
    }

    public reconcileMemory(): void {
      if (this._reconcilingMemory) return;
      if (this.memorized.length === 0) return;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();
      this._reconcilingMemory = true;
      try {
        for (const spec of this.memorized) {
          if (spec.tickedAt === 0) {
            spec.tickedAt = nowS;
            continue;
          }
          const elapsed = nowS - spec.tickedAt;
          spec.tickedAt = nowS;
          if (elapsed <= 0) continue;
          spec.sharpness = Fade.sharpnessAfter(
            spec.sharpness,
            elapsed,
            this.fadeInputsFor(spec),
          );
        }
      } finally {
        this._reconcilingMemory = false;
      }
    }

    /** Gather the four axes for one held specification. */
    private fadeInputsFor(spec: MemorizedSpec): FadeInputs {
      return {
        maturity: spec.maturity,
        competenceRank: this.competenceRankFor(spec.verb, spec.noun),
        complexity: spec.complexity,
        neighbours: this.neighbourCount(spec.spellId),
      };
    }

    public getMemorized(): readonly MemorizedSpec[] {
      this.reconcileMemory();
      return this.memorized;
    }

    public getMemorizedSpell(spellId: string): MemorizedSpec | null {
      this.reconcileMemory();
      return this.memorized.find((s) => s.spellId === spellId) ?? null;
    }

    public holdsSpell(spellId: string): boolean {
      return this.memorized.some((s) => s.spellId === spellId);
    }

    public memorize(
      spec: Omit<MemorizedSpec, 'sharpness' | 'maturity' | 'tickedAt'>,
    ): void {
      this.reconcileMemory();
      const nowS = StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)
        ? WorldClockApi.getNow().rawValue()
        : 0;
      const existing = this.memorized.find((s) => s.spellId === spec.spellId);
      if (existing) {
        existing.sharpness = 1;
        // Each refresh lengthens the next interval — the spacing effect,
        // and the anti-treadmill mechanism: upkeep falls on NEW
        // additions rather than on the whole repertoire, so a large
        // mature library is nearly free.
        existing.maturity += 1;
        existing.tickedAt = nowS;
        // Re-studying at sufficient competence REPLACES a bad copy
        // cleanly (D14) — the recoverable half of the defective-copy
        // bargain.
        existing.defective = spec.defective;
        existing.complexity = spec.complexity;
        return;
      }
      this.memorized.push({
        ...spec,
        sharpness: 1,
        maturity: 0,
        tickedAt: nowS,
      });
    }

    public forgetSpell(spellId: string): boolean {
      const i = this.memorized.findIndex((s) => s.spellId === spellId);
      if (i === -1) return false;
      this.memorized.splice(i, 1);
      return true;
    }

    public costMultiplierFor(spellId: string): number {
      const spec = this.getMemorizedSpell(spellId);
      // Not holding it at all is NOT an error and NOT a failure — you
      // simply pay the ordinary price, exactly as before spellbooks
      // existed. Holding a hazy copy is what costs extra.
      if (!spec) return 1;
      return Fade.costMultiplier(spec.sharpness, spec.defective);
    }

    public neighbourCount(spellId: string): number {
      const self = this.memorized.find((s) => s.spellId === spellId);
      if (!self) return 0;
      // Neighbouring = sharing a verb or a noun. Spells in adjacent grid
      // cells are the most alike things a holder could carry, which is
      // exactly why interference bites hardest on a generalist.
      return this.memorized.filter(
        (s) =>
          s.spellId !== spellId && (s.verb === self.verb || s.noun === self.noun),
      ).length;
    }
  };
}
