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

  /**
   * Traits — the disposition estimator dials (the personality layer). The
   * engine ships the derive-on-read accumulator + the form→define→entrench
   * lifecycle; these are the tunable numbers. The entrenched invariants
   * (derive-don't-track, game-time decay, the clamped-sum position) are
   * CODE, never keys. See docs/subsystems/trait.md.
   */
  /** Traits — evidence-weight decay half-life in GAME days. */
  traitsDecayHalfLifeDays: "traits.decayHalfLifeDays",
  /** Traits — evidence mass at or above which an axis is `defined`. */
  traitsDefinedThreshold: "traits.definedThreshold",
  /** Traits — evidence mass at or above which an axis is `entrenched`. */
  traitsEntrenchedThreshold: "traits.entrenchedThreshold",
  /** Traits — |position| at or above which an axis counts as "defining". */
  traitsPronouncedThreshold: "traits.pronouncedThreshold",
  /** Traits — scalar mapping raw compatibility into the regard range. */
  traitsCompatibilityScale: "traits.compatibilityScale",

  /**
   * Operator policy knobs lifted out of scattered module constants (the
   * pre-app-settings sweep). Each is a single-source limit an operator may
   * want to tune live; consumers read with a try/catch fallback to the
   * historical literal so a pre-warm/test read is still safe.
   */
  /** Chat — per-channel in-memory history ring cap (`ChannelCatalogue`). */
  chatHistoryCap: "chat.historyCap",
  /** Char-gen — minimum length (chars) of a chosen character name token. */
  chargenNameMinLength: "chargen.nameMinLength",
  /** Char-gen — maximum length (chars) of a chosen character name token. */
  chargenNameMaxLength: "chargen.nameMaxLength",
  /** Status — max rendered length (chars) of a Character's status one-liner. */
  statusMaxLength: "status.maxLength",

  /**
   * Scripting — resource governance. The interpreter is non-blocking by
   * construction (every engaged/`wait` step suspends and yields); these
   * bound the one pathological shape — a no-suspension tight loop — plus
   * runaway fan-out. The *values* are operator knobs; the **tier**
   * selection (player-home/inline = tight, released `/obj/` + `/domain/`
   * = large) is mechanical (authorship), not a key. See
   * docs/subsystems/scripting.md § Resource governance.
   */
  /** Scripting — preemption slice: yield the event loop every K steps. */
  scriptSliceSteps: "script.sliceSteps",
  /** Scripting — lifetime step ceiling, player/inline-authored (tight). */
  scriptMaxStepsPlayer: "script.maxSteps.player",
  /** Scripting — lifetime step ceiling, platform-authored (large). */
  scriptMaxStepsPlatform: "script.maxSteps.platform",
  /** Scripting — lifetime dispatch-count ceiling, player/inline (tight). */
  scriptMaxDispatchPlayer: "script.maxDispatch.player",
  /** Scripting — lifetime dispatch-count ceiling, platform (large). */
  scriptMaxDispatchPlatform: "script.maxDispatch.platform",
  /** Scripting — recursion-depth ceiling, player/inline (tight). */
  scriptMaxDepthPlayer: "script.maxDepth.player",
  /** Scripting — recursion-depth ceiling, platform (large). */
  scriptMaxDepthPlatform: "script.maxDepth.platform",
  /**
   * Banking — the **demo** sales-tax rate, a fraction of a purchase remitted
   * to the placeholder treasury via the remittance-split seam. Authored and
   * **inert** (recorded, not governed — the corpo-affiliation-edge
   * precedent); live/legislated taxation is the cooperative build. See
   * docs/subsystems/banking.md.
   */
  bankingSalesTaxRate: "banking.salesTaxRate",
  /** Banking — the placeholder treasury account that demo tax accumulates in. */
  bankingTreasuryAccount: "banking.treasuryAccount",

  /**
   * Livestream — the operator-configured broadcast sources surfaced to the
   * livestream-viewer cockpit embed. A JSON array of `StreamSource`
   * (`{platform:'twitch',channel} | {platform:'youtube',videoId}`); the
   * `renown.decayHalfLives` JSON-in-a-string precedent. Empty/absent → no
   * broadcast configured (the embed shows nothing). See
   * docs/subsystems/livestream.md / cockpit-layouts.
   */
  livestreamBroadcastSources: "livestream.broadcastSources",
  /**
   * Social-graph (attention management) — the reserved-baseline notify
   * rules' default fields (deployment defaults, NOT code constants). JSON
   * map keyed by reserved id (`foes`/`friends`/`everyone-else`/`strangers`)
   * → the rule's display + notification + color fields. The engine ships
   * the strict-ordered-first-match resolution; these are the seeded
   * defaults the virtual baseline resolves to. See
   * docs/subsystems/social-graph.md.
   */
  socialBaselineRules: "social.baselineRules",
  /** Social-graph — the neutral palette token a fresh custom rule inherits. */
  socialDefaultColor: "social.defaultColor",
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
