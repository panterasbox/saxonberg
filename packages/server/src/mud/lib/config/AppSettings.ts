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
   * Banking — the **demo** onboarding coin (minor units) a committed
   * non-guest char-gen player is granted via `issueCash` (the CB cash
   * faucet) at commit. Drink-sized + anti-farm; guests get nothing;
   * `0` disables the grant. See docs/subsystems/banking.md.
   */
  bankingOnboardingStipend: "banking.onboardingStipend",

  /**
   * Fast-travel — the tunable TPA **network-fee percentage** levied on every
   * paid ride into the TPA operating budget (the payment-processor share).
   * Read try/catch → 0-fallback like `banking.salesTaxRate`. See
   * docs/subsystems/fasttravel.md.
   */
  fasttravelNetworkFeeRate: "fasttravel.networkFeeRate",
  /**
   * Fast-travel — the **flat base** component (minor units) of the TPA
   * network fee, guaranteeing non-zero TPA income on any paid ride (a pure
   * percentage floors to zero on micro-fares). `min(fee, base + floor(fee ×
   * rate))`.
   */
  fasttravelNetworkFeeBase: "fasttravel.networkFeeBase",
  /**
   * Fast-travel — the TPA operating-budget account id (the well-known
   * account the network fee accrues to), named like `banking.treasuryAccount`.
   */
  fasttravelTpaAccount: "fasttravel.tpaAccount",

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
  /**
   * Social inspection — seconds of input inactivity after which a connected
   * session is *derived* as idle (vs active) in `who`/`profile`. An operator
   * knob, not a code constant; idle is computed on read, never stored. See
   * docs/subsystems/social-graph.md (the inspection surface).
   */
  socialIdleAfter: "social.idleAfter",

  /**
   * Bulletin (news ticker) — the server-owned ticker semantics. The engine
   * ships the pins-first/recency window + soft-retract/expiry; these are the
   * operator-tunable limits, read with a try/catch fallback so a pre-warm /
   * test read is still safe. See docs/subsystems/bulletin.md.
   */
  /** Bulletin — max bulletins in the live ticker window. */
  bulletinTickerWindow: "bulletin.tickerWindow",
  /** Bulletin — max pinned bulletins held at the top of the window. */
  bulletinMaxPins: "bulletin.maxPins",
  /** Bulletin — max rendered length (chars) of a headline. */
  bulletinHeadlineMaxLength: "bulletin.headlineMaxLength",
  /** Bulletin — max rendered length (chars) of a body. */
  bulletinBodyMaxLength: "bulletin.bodyMaxLength",

  /**
   * Residency — scheduled object self-maintenance (see
   * docs/subsystems/residency.md). Keys are namespaced per sweep:
   * `residency.eviction.*` is the real-time cold-tail garbage-culler
   * (ships in observe mode — logs candidates, culls nothing; enforcement
   * is a flip, re-read each sweep, no restart). The deferred game-time
   * reset sweep will namespace under `residency.reset.*`.
   */
  /** Eviction — `observe` (log only) | `enforce` (actually cull). */
  residencyEvictionMode: "residency.eviction.mode",
  /** Eviction — sweep cadence in ms. */
  residencyEvictionIntervalMs: "residency.eviction.intervalMs",
  /** Eviction — idle grace window (ms) before an object is a candidate. */
  residencyEvictionIdleThresholdMs: "residency.eviction.idleThresholdMs",

  /**
   * YouTube relay (read-only) dials. The Twitch relay's hardcoded constants
   * are grandfathered; new YouTube code reads these operator knobs instead:
   * per-channel history-ring cap, per-stream reconnect backoff, and the
   * `liveChatMessages.list` poll interval (the `streamList` fallback + the
   * overlay-owner light live-status poll). See docs/subsystems/streaming.md.
   */
  youtubePollIntervalMs: "youtube.pollIntervalMs",
  /**
   * YouTube overlay-owner live-status poll interval — how often the overlay
   * forwarding re-resolves the owner's `OVERLAY_YOUTUBE_CHANNEL` to catch a
   * stream restart. A `search.list` costs ~100 quota units, so this is a
   * conservative default (a slow restart-catch is fine — it's a single
   * channel and a nicety, distinct from the deferred N-channel viewer
   * auto-rebind). See docs/subsystems/streaming.md.
   */
  youtubeOverlayPollIntervalMs: "youtube.overlayPollIntervalMs",

  /**
   * Materials-response — the response function's tuning coefficients (the
   * "magnitude" half of the shape-vs-magnitude split). The engine ships the
   * qualitative per-channel grid on `Construction` (the *shape* of the
   * curve, in code) and the algorithm; these keys are the numeric heights
   * each qualitative token resolves to (the *magnitudes*), plus the
   * reference material magnitudes and the tissue-tail thresholds. No magic
   * balance number is a code invariant — consumers read with a fallback to
   * the seeded literal so a pre-warm / test read is safe. See
   * docs/subsystems/materials-response.md.
   */
  /** Response — per-token base attenuation fraction (0..1). */
  responseAttenuationDeflect: "response.attenuation.deflect",
  responseAttenuationResist: "response.attenuation.resist",
  responseAttenuationAbsorb: "response.attenuation.absorb",
  responseAttenuationModerate: "response.attenuation.moderate",
  responseAttenuationPoor: "response.attenuation.poor",
  responseAttenuationTransmit: "response.attenuation.transmit",
  responseAttenuationFail: "response.attenuation.fail",
  /** Response — reference material magnitudes the height ratio scales against. */
  responseMaterialHardnessRef: "response.material.hardnessRef",
  responseMaterialToughnessRef: "response.material.toughnessRef",
  /** Response — clamp ceiling on the normalized material height. */
  responseMaterialScaleMax: "response.material.scaleMax",
  /** Response — the structural floor of a material's height on any channel.
   * A construction's response is largely structural (a hide jerkin's give, a
   * plate's rigidity), so the token sets the protection ceiling and the
   * material modulates within `[floor, 1]` rather than gating from zero — a
   * soft absorber still absorbs, a boot still turns a shallow cut. */
  responseMaterialHeightFloor: "response.material.heightFloor",
  /** Response — grade height-scale bounds (poor..masterful → min..max). */
  responseGradeMin: "response.grade.min",
  responseGradeMax: "response.grade.max",
  /** Response — condition height-scale floor (a wrecked item at 0 condition). */
  responseConditionMin: "response.condition.min",
  /** Response — residual energy at/above which a blunt blow to a boned part
   * fractures (vs contuses). */
  responseBluntFractureThreshold: "response.blunt.fractureThreshold",
  /** Response — residual energy below which no meaningful wound lands
   * (deflected). */
  responseNoWoundThreshold: "response.noWoundThreshold",
  /** Response — residual-energy → trauma-severity scalar (the tissue tail). */
  responseSeverityPerResidual: "response.severityPerResidual",
  /** Response — the canonical incident energy the legibility preview uses. */
  responsePreviewReferenceEnergy: "response.preview.referenceEnergy",
  /** Response — energy factor for a weapon's secondary delivery channel. */
  responseDeliverySecondaryFactor: "response.delivery.secondaryFactor",
  /** Response — outcome-band cutoffs (severity < grazeMax → grazes; <
   * biteMax → bites; ≥ → bites-deep). */
  responseBandGrazeMax: "response.band.grazeMax",
  responseBandBiteMax: "response.band.biteMax",

  /* ─────────────────────────── combat ─────────────────────────── */
  /**
   * Combat — the narration-beat / tempo tick, in game-seconds. The
   * session resolves finely and narrates coarsely once per beat. See
   * docs/subsystems/combat.md.
   */
  combatTickSeconds: "combat.tickSeconds",
  /** Combat — poise band thresholds (fractions of the 0..1 gauge). */
  combatPoisePressedBelow: "combat.poise.pressedBelow",
  combatPoiseReelingBelow: "combat.poise.reelingBelow",
  combatPoiseBrokenAt: "combat.poise.brokenAt",
  /** Combat — ticks an unexploited opening window stays live. */
  combatPoiseOpeningTicks: "combat.poise.openingTicks",
  /** Combat — base poise eroded on both sides per exchange. */
  combatPoiseErodePerExchange: "combat.poise.erodePerExchange",
  /** Combat — poise the actor spends committing a gambit (overextend). */
  combatPoiseOverextendCost: "combat.poise.overextendCost",
  /** Combat — poise restored by a defensive/reactive beat. */
  combatPoiseRestorePerDefense: "combat.poise.restorePerDefense",
  /** Combat — extra poise a whiff/parry self-opens the actor. */
  combatPoiseWhiffPenalty: "combat.poise.whiffPenalty",
  /** Combat — tempo rate shape. */
  combatTempoBase: "combat.tempo.base",
  combatTempoEncumbrancePenalty: "combat.tempo.encumbrancePenalty",
  combatTempoEnduranceFloor: "combat.tempo.enduranceFloor",
  combatTempoMinRate: "combat.tempo.minRate",
  combatTempoMaxRate: "combat.tempo.maxRate",
  /** Combat — inflict energy by the target's poise band at the moment of
   * the blow (an open window earns the hardest hit). */
  combatEnergySteady: "combat.energy.steady",
  combatEnergyPressed: "combat.energy.pressed",
  combatEnergyReeling: "combat.energy.reeling",
  combatEnergyBroken: "combat.energy.broken",
  combatEnergyOpen: "combat.energy.open",
  /** Combat — max narration beats per session (bounded-beats backstop). */
  combatMaxBeats: "combat.maxBeats",
  /** Combat (Build 2) — coup de grâce window, game-time seconds. */
  combatCoupSeconds: "combat.coupSeconds",
  /** Combat (Build 2) — regard witnesses grant a clean duel winner. */
  combatRegardDuelWin: "combat.regard.duelWin",
  /** Combat (Build 2) — regard witnesses withdraw from an unlawful killer. */
  combatRegardUnlawfulKill: "combat.regard.unlawfulKill",
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
