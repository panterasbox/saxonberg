/**
 * ConcealmentLevel — the monotone concealment vocabulary.
 *
 * A **concealment level** answers a single question about a perceivable
 * thing: *how hard is it to notice that this is here at all?* The five
 * bands are ordered and monotone — `obvious` (index 0) is "not concealed,
 * fully present in every viewer's world"; each higher band demands more
 * of a viewer's *effective perception* before the thing resolves. This is
 * the presence axis the exploration layer gates on (distinct from
 * identity — who a perceived thing IS — which belief/recognition owns).
 *
 * The vocabulary subsumes the old `Exit.hidden` boolean: a hidden exit is
 * simply an exit at a mid concealment band (`concealment.hiddenDefaultLevel`).
 *
 * **Shape-vs-magnitude.** The band *names* live in code (this closed
 * tuple, the ordering); the *magnitude* each band demands is an
 * AppSettings dial (`concealment.level.<band>`), so a designer tunes the
 * detection curve without a code edit. `obvious` is a hardcoded 0 (a
 * non-concealed thing needs zero perception). Reads fall back to a seeded
 * literal so a pre-warm / unit-test read is safe (the harm/electricity
 * dial idiom).
 *
 * The `Channel` / `Grade` / `WeatherType` value-object precedent: a closed
 * vocabulary tuple + type + a thin static holder (`ConcealmentLevels`).
 * No behavior beyond the vocabulary and its dial-backed projection.
 */

import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/**
 * The concealment bands, ordered weakest → strongest. `obvious` (index 0)
 * is the not-concealed default; `buried` is the deepest. Monotone: a
 * higher index always demands at least as much effective perception.
 */
export const CONCEALMENT_LEVELS = [
  'obvious',
  'subtle',
  'hidden',
  'deep',
  'buried',
] as const;

/** A concealment band — one of {@link CONCEALMENT_LEVELS}. */
export type ConcealmentLevel = (typeof CONCEALMENT_LEVELS)[number];

const CONCEALMENT_LEVEL_SET: ReadonlySet<string> = new Set(CONCEALMENT_LEVELS);

/**
 * Seeded-literal fallbacks for each band's effective-perception
 * requirement — used when AppSettings isn't warmed (unit tests, pre-boot).
 * Monotone increasing; `obvious` is a hardcoded 0. Kept in sync with
 * `config/app-settings.yaml`'s `concealment.level.*` values.
 */
const REQUIREMENT_FALLBACK: Record<ConcealmentLevel, number> = {
  obvious: 0,
  subtle: 2,
  hidden: 4,
  deep: 7,
  buried: 11,
};

/**
 * The AppSettings dial key each concealed band's requirement reads from.
 * `obvious` has no key — it is always 0.
 */
const REQUIREMENT_KEY: Record<Exclude<ConcealmentLevel, 'obvious'>, string> = {
  subtle: AppSettingKeys.concealmentLevelSubtle,
  hidden: AppSettingKeys.concealmentLevelHidden,
  deep: AppSettingKeys.concealmentLevelDeep,
  buried: AppSettingKeys.concealmentLevelBuried,
};

/**
 * Numeric AppSetting read, falling back to the seeded literal (the harm /
 * electricity dial idiom). A missing / non-numeric / pre-warm value is
 * safely the literal.
 */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The concealment-vocabulary holder — a thin static surface (the concept
 * this module owns) rather than free-floating predicate/projection
 * functions (the `Channels` shape).
 */
export class ConcealmentLevels {
  /** The full ordered vocabulary. */
  public static readonly ALL: readonly ConcealmentLevel[] = CONCEALMENT_LEVELS;

  /** Narrowing predicate for a string against the vocabulary. */
  public static isLevel(s: unknown): s is ConcealmentLevel {
    return typeof s === 'string' && CONCEALMENT_LEVEL_SET.has(s);
  }

  /** True iff the band is anything other than `obvious` (i.e. concealed). */
  public static isConcealed(level: ConcealmentLevel): boolean {
    return level !== 'obvious';
  }

  /** The ordinal position (0 = `obvious` … 4 = `buried`) — the monotone rank. */
  public static rankOf(level: ConcealmentLevel): number {
    return CONCEALMENT_LEVELS.indexOf(level);
  }

  /**
   * The effective-perception a viewer must muster to notice a thing at
   * this band — the dial-backed projection. `obvious` is 0; the concealed
   * bands read `concealment.level.<band>` (falling back to the seeded
   * literal). Monotone in the band ordering by construction (the dials are
   * authored monotone; the fallbacks are monotone).
   */
  public static requirementFor(level: ConcealmentLevel): number {
    if (level === 'obvious') return 0;
    return dial(REQUIREMENT_KEY[level], REQUIREMENT_FALLBACK[level]);
  }

  /**
   * The band a legacy `Exit.hidden: true` migrates to — the
   * `concealment.hiddenDefaultLevel` dial, defaulting to `hidden`. Never
   * `obvious` (a hidden exit must be concealed).
   */
  public static hiddenDefault(): ConcealmentLevel {
    try {
      const raw = AppApi.setting(AppSettingKeys.concealmentHiddenDefaultLevel);
      if (ConcealmentLevels.isLevel(raw) && raw !== 'obvious') return raw;
    } catch {
      // Fall through to the literal.
    }
    return 'hidden';
  }
}
