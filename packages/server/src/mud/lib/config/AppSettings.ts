/**
 * AppSettings — the singleton application-config record.
 *
 * A `Document` (plain MongoDB row, NOT Stuff) holding a single open
 * key/value bag of application-wide, operator-managed settings. The fourth
 * config category beyond per-player `settings` (`EnvironmentMixin`),
 * per-Stuff `Propertied`, and client-UI-state; distinct from infra/secrets
 * (`.env` / Parameter Store).
 *
 * The persisted state is a SINGLE generic `values` bag, never a field per
 * setting — `persistentFields = ['values']` never grows; adding a setting
 * is a YAML entry (`mud/config/app-settings.yaml`) plus a consumer.
 *
 * **The values live in the DB, seeded from YAML — there are no code-side
 * defaults.** `AppSettingsSeeder` (a backend seeder, like EmoteSeeder)
 * populates the row from `app-settings.yaml`; this Document is pure
 * persistence + an in-memory cache. `warm()` loads the seeded row into the
 * cache at boot so the synchronous read surface (`AppApi`) never awaits.
 */

import { Document } from "../persistence/Document";
import { SecurityApi } from "../../api/security";

/**
 * The blessed application-setting keys. Consumers reference these constants
 * (typo → compile error) instead of bare strings. The values themselves
 * live in `mud/config/app-settings.yaml`; this is just the typed key
 * vocabulary the engine reads.
 */
export const AppSettingKeys = {
  /**
   * Where a brand-new avatar's `startLocation` is initialized at mint time
   * — the post-char-gen / guest / signup spawn default, and nothing else.
   */
  defaultStartLocation: "defaultStartLocation",

  /**
   * Where an orphaned `HasInteractive` evacuates when its container
   * destructs with no outer (`Container.cleanupOnDestruct`).
   */
  evacuationFallback: "evacuationFallback",

  /**
   * Reactions — at/above this many reactions on one act, the per-emote
   * fan-out line is suppressed in favour of the batched counter. See
   * docs/subsystems/reactions.md.
   */
  reactionsThreshold: "reactions.threshold",

  /** Reactions — the fixed-cadence flush window in ms (clamped 150–250). */
  reactionsCadenceMs: "reactions.cadenceMs",

  /** Reactions — cap on the per-recipient familiar-biased sample. */
  reactionsSampleCap: "reactions.sampleCap",

  /**
   * Forums anti-snowball (display-only) — the displayed vote score is
   * suppressed until an entry has at least this many votes OR has aged
   * `forums.antiSnowball.minMinutes`. Server ranking always uses true
   * scores; this gates only the rendered number. See
   * docs/subsystems/forums.md.
   */
  forumsAntiSnowballMinVotes: "forums.antiSnowball.minVotes",

  /** Forums anti-snowball — minutes-since-creation that reveals the score. */
  forumsAntiSnowballMinMinutes: "forums.antiSnowball.minMinutes",

  /**
   * Renown — the value-function parameters (GOVERNANCE-OWNED ordinary law,
   * not deployment config). The engine ships the scoring algorithm; these
   * numbers are the polity's *declared values*, applied at recompute time
   * so re-legislating them re-scores history without rewriting the log.
   * The entrenched invariants (notoriety→zero governance weight, the
   * `engagement × renown` form, `renown × no-participation = nothing`) are
   * CODE, never keys. See docs/requirements/renown-requirements.md.
   */
  /** Renown — JSON `{esteem, notoriety}` decay half-lives in game-seconds. */
  renownDecayHalfLives: "renown.decayHalfLives",
  /** Renown — JSON `{tag: multiplier}` context/act weighting (default 1). */
  renownContextMultipliers: "renown.contextMultipliers",
  /** Renown — scalar quality weight applied to the standing. */
  renownQualityWeight: "renown.qualityWeight",
  /**
   * Renown — the per-listener worth of *being heard* (a passive
   * reception). Small and positive; far below a reaction. The reception
   * contribution to a scope is `receptionValence × log(1 + Σ decayed
   * receptions)` — log-saturating, so the first public messages matter far
   * more than the thousandth.
   */
  renownReceptionValence: "renown.receptionValence",
  /**
   * Renown — the per-`(speaker, listener)` dedup window in GAME-seconds:
   * hearing the same speaker again within the window mints no new
   * reception signal (reward reaching *new* people, not repetition / spam).
   */
  renownReceptionWindowS: "renown.receptionWindowS",

  /**
   * Participation — the consumer-influence QUANTITY axis (the sibling of
   * renown's quality axis). The engine ships the active-bucket mechanism;
   * these are the tunable dials. The entrenched invariants (the
   * `engagement × renown` form, the `max(0, renown)` clamp, derive-don't-
   * track) are CODE, never keys. See docs/subsystems/participation.md.
   */
  /**
   * Participation — the active-bucket width in REAL seconds. A member is
   * credited once per bucket in which they take a recognized action
   * (anti-AFK: idle buckets score nothing; anti-spam: a burst credits one).
   */
  participationBucketSeconds: "participation.bucketSeconds",
  /**
   * Participation — the recency-decay half-life in REAL seconds (the
   * divergence from renown's game-time decay: participation measures a
   * human showing up). "Present and contributing *now*."
   */
  participationDecayHalfLife: "participation.decayHalfLife",
  /**
   * Producer — the third influence stock, the MAKE faucet (the sibling of
   * the consumer PLAY faucet). The engine ships the attributed-engagement
   * mechanism; these are the tunable dials. The entrenched invariants
   * (engagement-only formula — no `× regard`, derive-don't-track, the
   * released-content gate) are CODE, never keys. See
   * docs/subsystems/participation.md.
   */
  /**
   * Producer — the attributed-engagement bucket width in REAL seconds. An
   * author is credited once per `{author, actor, bucket}` (anti-inflation:
   * one player engaging one author's content can't pad a bucket).
   */
  producerBucketSeconds: "producer.bucketSeconds",
  /**
   * Producer — the recency-decay half-life in REAL seconds (real-time, the
   * participation divergence: production standing measures *current* draw).
   */
  producerDecayHalfLife: "producer.decayHalfLife",
  /**
   * Influence — JSON `[{name, min}]` band cutoffs mapping the influence
   * scalar to its qualitative tier (display-only; register D6). Stock-
   * agnostic — the same bands serve every stock.
   */
  influenceBandThresholds: "influence.bandThresholds",
  /**
   * Conviction — the linear build-up period in REAL seconds. A held
   * position's weight ramps `clamp01((now − heldSince) / buildPeriod)`;
   * full conviction is reached after one period of unbroken hold. A flip
   * resets the clock (the spend half of influence; no verb yet).
   */
  convictionBuildPeriodSeconds: "conviction.buildPeriodSeconds",
} as const;

export type AppSettingKey =
  (typeof AppSettingKeys)[keyof typeof AppSettingKeys];

export class AppSettings extends Document {
  static collectionName = "app_settings";
  static persistentFields = ["values"];

  /**
   * The open key/value bag — the ONLY persistent field, forever. An
   * unmarshalled plain object: `Record<string,string>` round-trips through
   * Mongo natively (no `fieldMarshallers` entry).
   */
  values: Record<string, string> = {};

  /**
   * The in-memory singleton, warmed once at boot by {@link warm}. Held here
   * (not on `AppApi`) so the Api stays a stateless façade and the cache
   * lives with the record.
   */
  private static _cached: AppSettings | null = null;

  /**
   * Load the seeded singleton row into the cache (or an empty instance if
   * nothing has been seeded/set yet). Does NOT seed values — that is
   * `AppSettingsSeeder`'s job, which runs earlier in the boot sequence.
   * Called once from `AppBootstrap`.
   */
  static async warm(): Promise<AppSettings> {
    const rows = await AppSettings.find({});
    AppSettings._cached = rows[0] ?? new AppSettings();
    return AppSettings._cached;
  }

  /**
   * The warmed singleton. Throws loudly if read before boot warmed it — a
   * boot-ordering bug, never a silent `undefined` into a sync consumer.
   */
  static getCached(): AppSettings {
    if (!AppSettings._cached) {
      throw new Error(
        "AppSettings.getCached: cache not warmed — AppSettings.warm() must " +
          "run at boot (AppBootstrap) before any consumer reads a setting.",
      );
    }
    return AppSettings._cached;
  }

  /** Host-internal bag accessors. External callers go through `AppApi`. */
  getValue(key: string): string | undefined {
    return this.values[key];
  }

  setValue(key: string, value: string): void {
    this.values[key] = value;
  }

  /** A snapshot copy of the whole bag (for the `config` listing). */
  getValues(): Record<string, string> {
    return { ...this.values };
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("AppSettings._resetForTesting");
    AppSettings._cached = null;
  }
}
