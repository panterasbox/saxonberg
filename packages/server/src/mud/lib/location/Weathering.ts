/**
 * WeatheringMixin — ⭐ **a fabric the weather is at**: the shell clock a
 * house's paint and a ship's seams both run on (harbors review 3, split
 * out of `FloorplanWarren`).
 *
 * A shell decays on the passage of days, linearly, reconciled on read
 * with no scheduler: a condition (0..1) and the game-second it was last
 * reconciled at, both persistent, so the decline is honest across a
 * restart and across a warren sleeping for a month. It reads as one of
 * five bands — `sound` · `weathered` · `worn` · `shabby` ·
 * `dilapidated` — and never as a number. `maintain` puts it back to
 * sound; the tenure TERM (`upkeepTerm`) says who owes that work.
 *
 * ⭐ **Named for what it is, and composed only where it is true.** The
 * clock used to be part of every `FloorplanWarren`, which imposed it on
 * any set of rooms authored as one plan — and *a field has no paint
 * either* (the mine's own header). A house (`HoldingWarren`) and a ship
 * (`ShipWarren`) compose it; a floorplan that does not weather — a mine's
 * workings — does not, and `maintain`, `survey` and the ascent gate find
 * nothing to read there. Every reader narrows with
 * `MixinApi.isWeathering`.
 *
 * ⭐ **One clock, two fictions.** Every sentence the clock and the upkeep
 * act speak comes from {@link Weathering.upkeepWords} — a house speaks of
 * paint and sills, a ship of seams and pitch — so one mechanism tells
 * both, and the act credits the Discipline the fabric names.
 *
 * The rate reads `weathering.daysToWorn` (game-days from sound to worn —
 * HALF the condition scale, so full decay takes twice that), seeded by
 * the platform pack; 45 when absent.
 *
 * ⚠ Two clocks, and they never touch: a SHELL weathers on the calendar;
 * a GOOD wears only when used (economy Law 2). Nothing here reaches a
 * good.
 */

import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * The words a fabric is described in — a house's paint and sills, a
 * ship's seams and pitch. Every sentence the shell clock and the upkeep
 * act speak comes from here, so one mechanism tells two fictions.
 */
export interface UpkeepWords {
  /** The cause line for a fabric starting to go (weathered / worn). */
  declining: string;
  /** The cause line for a fabric that has gone (shabby / dilapidated). */
  failed: string;
  /** The kit you would need, with its article ("a householder's kit"). */
  kit: string;
  /** The work, second person, before *"It was <band>; it is sound
   *  again."* — "You work the place over — …". */
  work: string;
  /** The witnessed work, after the actor's name — "works over the
   *  fabric of the place with a householder's kit." */
  witnessed: string;
  /**
   * The Discipline the upkeep act exercises, credited to whoever does it
   * (harbors P24 — caulking a hull is seamanship). Absent: the act
   * credits nothing (keeping a house is nobody's Discipline yet).
   */
  discipline?: string;
}

/**
 * ⭐ The shell clock as a straight line (harbors B4): the condition at
 * its stamp and the slope it falls by. Every reader that must integrate
 * something over the shell's band — a hull's leak — reads the line, never
 * a sample, so a long absence is honest across every band it crossed.
 */
export interface ShellTrajectory {
  /** The condition at `stampS` (0..1). */
  condition: number;
  /** Game-seconds the condition was last reconciled at; `0` = never read. */
  stampS: number;
  /** Condition lost per game-second. */
  perSecond: number;
}

/** The closed-today, open-by-construction upkeep-term vocabulary (D5). */
export const UPKEEP_TERMS = [
  'institution-all',
  'landlord-shell',
  'owner-all',
] as const;

/** The setting the rate is read from — game-days from sound to worn. */
export const WEATHERING_DAYS_TO_WORN = 'weathering.daysToWorn';

/** The five condition bands — banded prose, no gauge (P10). */
const CONDITION_BANDS: Array<[number, string]> = [
  [0.9, 'sound'],
  [0.7, 'weathered'],
  [0.5, 'worn'],
  [0.25, 'shabby'],
  [0, 'dilapidated'],
];

const GAME_DAY_SECONDS = 86_400;

/** The shipped weathering default — game-days from sound to worn. */
const DEFAULT_DAYS_TO_WORN = 45;

export interface Weathering {
  /** Who owes the upkeep (`institution-all` / `landlord-shell` / `owner-all` …). */
  getUpkeepTerm(): string;
  setUpkeepTerm(value: string): void;
  /** The shell's condition (0..1) as last reconciled — no write. */
  getShellCondition(): number;
  /** Reconcile the clock to now and return the condition. */
  reconcileShell(): number;
  /** The shell's line, read WITHOUT reconciling. */
  shellTrajectory(): ShellTrajectory;
  /** The banded read (reconciles first). */
  conditionBand(): string;
  /** The band a condition reads as. */
  bandFor(condition: number): string;
  /** The band floors, highest first. */
  bandFloors(): Array<[number, string]>;
  /** Put the shell at a staged condition (test worlds only). */
  stageShell(condition: number, stampS: number): void;
  /** The cause line in this fabric's words; null while sound. */
  conditionCause(): string | null;
  /** Back to sound, stamped now — the upkeep act's restore. */
  restoreShell(): void;
  /** The words this fabric is described in. */
  upkeepWords(): UpkeepWords;
}

export function WeatheringMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class WeatheringMixin extends Base implements Weathering {
    static _mixinName = 'WeatheringMixin';

    static fieldMeta: FieldMeta = {
      upkeepTerm: { persistent: true, authorable: true },
      shellCondition: { persistent: true },
      shellStamp: { persistent: true },
    };

    /** Who owes the shell (D5): a validated kebab-case term, open to
     *  future values (`hoa-shell`) without mechanism. */
    public upkeepTerm: string = 'owner-all';

    /** Shell condition, 0..1 (D4) — persistent, reconciled on read. */
    public shellCondition: number = 1;

    /** Game-time stamp (seconds) of the last shell reconcile. */
    public shellStamp: number = 0;

    public getUpkeepTerm(): string {
      return this.upkeepTerm;
    }

    public setUpkeepTerm(value: string): void {
      if (typeof value !== 'string' || !/^[a-z][a-z-]*$/.test(value)) {
        throw new Error(
          `${this.constructor.name}: upkeepTerm '${String(value)}' is not a ` +
            `kebab-case term (shipped: ${UPKEEP_TERMS.join(', ')})`,
        );
      }
      this.upkeepTerm = value;
    }

    public getShellCondition(): number {
      return this.shellCondition;
    }

    /**
     * Reconcile the shell's weathering: a linear slope on GAME time.
     * Stamp-forward; no scheduler; honest across restarts because the
     * stamp is persistent state.
     */
    public reconcileShell(): number {
      const now = WorldClockApi.getNow().rawValue();
      if (this.shellStamp <= 0) {
        this.shellStamp = now;
        return this.shellCondition;
      }
      const elapsed = now - this.shellStamp;
      if (elapsed <= 0) return this.shellCondition;
      this.shellCondition = Math.max(
        0,
        this.shellCondition - elapsed * this.shellPerSecond(),
      );
      this.shellStamp = now;
      return this.shellCondition;
    }

    /**
     * ⭐ The shell's line, read WITHOUT reconciling (harbors B4): where it
     * stood at its stamp and how fast it falls. A hull integrates her leak
     * over it, band by band.
     */
    public shellTrajectory(): ShellTrajectory {
      return {
        condition: this.shellCondition,
        stampS: this.shellStamp,
        perSecond: this.shellPerSecond(),
      };
    }

    /** The banded, no-gauge read (P10). Reconciles first. */
    public conditionBand(): string {
      return this.bandFor(this.reconcileShell());
    }

    /** The band a condition reads as — the five words, no digit. */
    public bandFor(condition: number): string {
      for (const [floor, band] of CONDITION_BANDS) {
        if (condition >= floor) return band;
      }
      return 'dilapidated';
    }

    /**
     * The band floors, highest first — `[floor, band]`. What a reader
     * integrating over the line needs to find where each band begins.
     */
    public bandFloors(): Array<[number, string]> {
      return CONDITION_BANDS.map(([f, b]) => [f, b]);
    }

    /**
     * ⭐ Put the shell at `condition`, stamped at `stampS` (harbors P25 —
     * the staged twin of a fabric that weathered there). A test world's
     * staging only; the game moves a shell by the clock and `maintain`.
     */
    @CallSecurity(SecurityPolicies.FromModule('/platform/idea/api/TestHarnessLogic#TestHarnessLogic'))
    public stageShell(condition: number, stampS: number): void {
      this.shellCondition = Math.min(1, Math.max(0, Number(condition) || 0));
      this.shellStamp = Math.max(0, Number(stampS) || 0);
    }

    /** The legible cause line for a declined shell, in this fabric's
     *  words ({@link upkeepWords}); null while sound. */
    public conditionCause(): string | null {
      const c = this.shellCondition;
      if (c >= 0.9) return null;
      const words = this.upkeepWords();
      return c >= 0.5 ? words.declining : words.failed;
    }

    /** The upkeep act's restore (P10): back to sound, stamped now. */
    public restoreShell(): void {
      this.shellCondition = 1;
      this.shellStamp = WorldClockApi.getNow().rawValue();
    }

    /**
     * The words this fabric is described in. The default speaks plainly
     * of "the fabric"; a house speaks of paint and sills, a ship of seams
     * and pitch.
     *
     * @hook
     */
    public upkeepWords(): UpkeepWords {
      return {
        declining: 'The fabric is starting to go; weather is finding the seams.',
        failed: 'The fabric has gone; the weather is in.',
        kit: 'a kit for the work',
        work: 'You work the fabric over, making good what the weather has been at.',
        witnessed: 'works over the fabric of the place.',
      };
    }

    /** Condition lost per game-second — the one rate a house and a hull share. */
    private shellPerSecond(): number {
      let daysToWorn = DEFAULT_DAYS_TO_WORN;
      try {
        const n = Number.parseFloat(AppApi.setting(WEATHERING_DAYS_TO_WORN));
        if (Number.isFinite(n) && n > 0) daysToWorn = n;
      } catch {
        /* cold cache or an unseeded key — the shipped default */
      }
      return 0.5 / (daysToWorn * GAME_DAY_SECONDS);
    }
  }
  return WeatheringMixin;
}
