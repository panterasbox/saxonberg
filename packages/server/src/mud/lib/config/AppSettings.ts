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
   * Behavior — the global **ambient-chatter pacing** dial. Multiplies
   * every *ambient* cadence brain's authored interval before jitter (a
   * stoic NPC stays relatively quieter, a chatty one relatively louder;
   * this dials the whole world's talkativeness at once during playtest).
   * `1.0` = author cadences as written; `2.0` = everything half as often.
   * Only `ambient` cadence brains are scaled — functional pollers
   * (`shifts`, `covers`) are exempt. See docs/subsystems/behavior.md
   * § Ambient pacing budget.
   */
  behaviorAmbientCadenceScale: "behavior.ambientCadenceScale",
  /**
   * Behavior — hard floor (ms) under which an *ambient* cadence brain's
   * effective interval may not fall, no matter what an author sets. The
   * anti-spam backstop ("nothing unprompted more often than this"). `0`
   * disables the floor (the code default when app-settings is unwarmed,
   * so unit tests keep their fast cadences).
   */
  behaviorAmbientCadenceFloorMs: "behavior.ambientCadenceFloorMs",

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
   * Banking — the per-account **cash-withdrawal cap per game-day** (minor
   * units), the common-pool till guard: over the cap → refuse + push onto the
   * ledger (card/transfer). Derive-on-read over the ledger (no counter, no
   * scheduler — Law-2 clean). Per-account, never collective (a bank run is a
   * feature). `0` disables the cap. See docs/subsystems/banking.md.
   */
  bankingWithdrawalDailyCap: "banking.withdrawalDailyCap",
  /**
   * Banking — the raised withdrawal cap (minor units) for a **Circle** member
   * (recognized standing → higher cash quota; the status perk that ties
   * Relationship to the common-pool guard).
   */
  bankingWithdrawalDailyCapCircle: "banking.withdrawalDailyCapCircle",
  /**
   * Banking — the **corpo royalty** rate: the fraction of every collected fee
   * split off the top to the affiliated corpo's treasury (the rest to the
   * branch operating account). Event-driven, conserved — corpo income begins
   * from the first fee. `0` disables. See docs/subsystems/banking.md.
   */
  bankingCorpoRoyaltyRate: "banking.corpoRoyaltyRate",
  /**
   * Banking — the opening vault float (minor units) seeded into a fresh
   * branch's till at boot, backed 1:1 by the branch's own operating balance
   * (founding capital). Lets early ledger-credit withdrawals work before
   * customer cash deposits accumulate. `0` disables. See docs/subsystems/banking.md.
   */
  bankingOpeningFloat: "banking.openingFloat",
  /**
   * Banking — the **default custodian bank** (`bankPath`) for accounts whose
   * owner names no branch of their own: venue operating accounts, worker
   * wage-fallback accounts, per-contract escrow. The
   * every-account-names-a-real-custodian rule: only the state (`treasury`)
   * banks at the CB; everything else banks at a commercial bank — v1 the
   * Goodkin branch. See docs/subsystems/banking.md.
   */
  bankingDefaultCustodianBankPath: "banking.defaultCustodianBankPath",

  /**
   * Attendant — the lease anti-grief sweep cadence (real-time ms). Griefing
   * is a real-time act, so the watchdog is real-time (the residency sweep
   * pattern), not game-time. See docs/subsystems/attendant.md.
   */
  attendantLeaseSweepIntervalMs: "attendant.lease.sweepIntervalMs",
  /**
   * Attendant — the idle threshold (real-time ms): a service lease with no
   * service act for this long is revoked (`service-idle`) and the next
   * customer pulled up. The venue's generosity dial (a legit-slow customer is
   * distinguished from a griefer by each act resetting the counter).
   */
  attendantLeaseIdleThresholdMs: "attendant.lease.idleThresholdMs",
  /**
   * Attendant — a take-a-number ticket / queue place idle-expiry (real-time
   * ms): a waiting place held idle blocks others as much as the front, so the
   * idle-drop applies to the whole queue.
   */
  attendantQueueIdleThresholdMs: "attendant.queue.idleThresholdMs",

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
  /** Reset — `observe` (log only) | `enforce` (actually repop). */
  residencyResetMode: "residency.reset.mode",
  /** Reset — game-time sweep cadence in game-seconds. */
  residencyResetIntervalS: "residency.reset.intervalS",

  /**
   * Retail — the general store. `listingCap` is the per-consignor active-
   * listing cap (the withdrawal-quota sibling anti-grief guard on the shared
   * consignment shelf; `0` disables). `commissionRate` is the store's cut of
   * a consignment sale (0..1) — the remainder settles to the consignor's
   * primary account. See docs/subsystems/retail.md.
   */
  retailConsignmentListingCap: "retail.consignment.listingCap",
  retailConsignmentCommissionRate: "retail.consignment.commissionRate",

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
  /** Response (heat channel) — the fraction a single fully-insulating layer
   * blocks; scaled by material insulation height + layer depth. A conductive
   * layer (metal) blocks near-zero, an insulator (leather/padding) near this. */
  responseHeatBaseAttenuation: "response.heat.baseAttenuation",
  /** Response (heat channel) — the reference thermal conductivity (W/(m·K))
   * where a material is half-insulating; below it insulates hard, above it
   * conducts. Insulation height = ref / (ref + conductivity). */
  responseHeatInsulationRefConductivity:
    "response.heat.insulationRefConductivity",
  /** Response (heat channel) — extra insulation per outside-in layer depth
   * (padded 0 … plate 3); the covering stack's depth amplifies the block. */
  responseHeatDepthFactor: "response.heat.depthFactor",

  /* ────────────────────────── electricity ────────────────────────── */
  /**
   * Electricity — the Ohm's-law shock model's magnitudes (the "magnitude"
   * half of the shape-vs-magnitude split; the physics SHAPE — `I = V/R`,
   * conductance-to-ground current division, the covering stack as series
   * resistance — is in code). Seeded literals are **real-world-grounded**
   * (dry-skin ≈ 100 kΩ, wet ≈ 100× lower, let-go ≈ 10 mA, fibrillation ≈
   * 100 mA) so a student's multimeter reads coursework values, and every
   * magnitude reads with a fallback to the literal so a pre-warm / test
   * read is safe. See docs/subsystems/electricity.md.
   */
  /** Electricity — a body's dry contact-to-contact resistance (Ω), the
   * fallback when a body carries no flesh-conductivity material. */
  electricityBodyDryResistanceOhms: "electricity.body.dryResistanceOhms",
  /** Electricity — the factor a wet body's resistance drops by (~100×). */
  electricityBodyWetFactor: "electricity.body.wetFactor",
  /** Electricity — nominal body path geometry L/A (per metre); with flesh
   * conductivity (~0.2 S/m) → the ~100 kΩ dry-skin anchor. */
  electricityBodyGeometryFactor: "electricity.body.geometryFactor",
  /** Electricity — nominal contact/edge path geometry L/A (per metre), the
   * series resistance a material's conductivity resolves to at a node. */
  electricityContactGeometryFactor: "electricity.contact.geometryFactor",
  /** Electricity — ceiling clamp on a contact/series resistance (Ω), so an
   * insulator reads a large-but-finite resistance (an open break). */
  electricityContactMaxOhms: "electricity.contact.maxOhms",
  /** Electricity — floor clamp on any resistance (Ω), the R→0 guard for
   * `I = V/R`. */
  electricityResistanceFloorOhms: "electricity.resistanceFloorOhms",
  /** Electricity — let-go current (A): at/above this a shock's muscle
   * tetany prevents voluntary release (~0.01 A = 10 mA). */
  electricityLetGoAmps: "electricity.letGoAmps",
  /** Electricity — tetanic current (A): sustained whole-muscle contraction
   * (~0.02 A). */
  electricityTetanicAmps: "electricity.tetanicAmps",
  /** Electricity — fibrillation current (A): disrupts heart rhythm → arrest
   * (~0.1 A = 100 mA), the electrocution death threshold. */
  electricityFibrillationAmps: "electricity.fibrillationAmps",
  /** Electricity — current (A) below which a shock leaves no contact burn
   * (perception/tingle only). */
  electricityBurnThresholdAmps: "electricity.burnThresholdAmps",
  /** Electricity — contact-burn severity per amp above the burn threshold. */
  electricityBurnSeverityPerAmp: "electricity.burnSeverityPerAmp",
  /** Electricity — the conductivity (S/m) at/above which a surface pool
   * bridges the conduction graph (salt water yes, dry-ish floors no). The
   * topology gate — separate from the resistance magnitudes. */
  electricityPoolMinConductivity: "electricity.pool.minConductivity",
  /** Electricity — the conductivity (S/m) at/below which a material
   * insulates a contact (footwear / a step / a floor breaks the path to
   * ground). Rubber / leather / wool / dry wood insulate; flesh / water
   * / metal do not. */
  electricityInsulatorMaxConductivity: "electricity.insulator.maxConductivity",
  /** Electricity — the factor a **conductive** worn covering multiplies the
   * body's skin-contact resistance by (<1): metal armor spreads the current
   * over the whole body and bypasses the high-resistance skin contact, so a
   * plate-armored body takes MORE current than a bare one. The armor
   * inversion's magnitude (insulating coverings instead ADD series R). */
  electricityArmorConductiveSkinFactor: "electricity.armor.conductiveSkinFactor",
  /** Electricity — contact-burn severity accrued per amp-second while a
   * being-shocked circuit stays closed (the reconcile-on-read sustain). */
  electricitySustainBurnPerAmpSec: "electricity.sustain.burnSeverityPerAmpSec",
  /** Electricity — bpm the heart rate is driven toward arrest per game-second
   * while a fibrillating current flows (the electrocution death drive). */
  electricityArrestDrivePerSec: "electricity.heartRate.arrestDrivePerSec",

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
  /**
   * Combat — the poise an **ambush** strips from an unaware defender at the
   * opening (a struck-from-concealment surprise). Large enough to cross
   * `combat.poise.brokenAt` from full poise, arming the aggressor's free
   * first exchange — surprise DENIES the opening poise contest (not a damage
   * multiplier). Read with a seeded-literal fallback. See
   * docs/subsystems/stealth.md.
   */
  combatAmbushPoisePenalty: "combat.ambush.poisePenalty",
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
  /** Combat (cycle 2) — extra target poise erosion per additional attacker
   * pressing them (focus-fire: ganging up erodes faster). */
  combatFocusFireErosionPerEdge: "combat.focusFire.erosionPerEdge",
  /** Combat (cycle 2) — incoming-attacker count at/above which a defender's
   * recover/defend beat is suppressed (a pinned turtle can't catch breath). */
  combatFocusFireSuppressRecoveryAt: "combat.focusFire.suppressRecoveryAt",
  /** Combat (cycle 2) — inflict energy of a foe's parting shot when a
   * combatant disengages (flees) past them. */
  combatFleePartingShotEnergy: "combat.flee.partingShotEnergy",

  /** Combat (experience) — poise the feinter spends to present the bait
   * (cheap; aggression is rewarded against a turtle). */
  combatPoiseFeintCost: "combat.poise.feintCost",
  /** Combat (experience) — poise a baited (committed, un-reading) defender
   * loses when they bite a feint — large enough to crack a steady guard,
   * arming their opening for the feinter's next strike. */
  combatPoiseFeintBitPenalty: "combat.poise.feintBitPenalty",
  /** Combat (experience) — sharpness at/above which a defender *reads* a
   * feint (won't bite; sees the tell). The fog and the bite decision share
   * this gate so they never contradict. */
  combatFogReadSharpness: "combat.fog.readSharpness",
  /** Combat (experience) — sharpness at/above which ordinary band fog
   * clears (you perceive the opponent's true poise band). */
  combatFogClearSharpness: "combat.fog.clearSharpness",
  /** Combat (experience) — sharpness at the `untrained` band (the
   * competence→sharpness curve floor). */
  combatSharpnessMin: "combat.sharpness.min",
  /** Combat (experience) — sharpness at the top (`expert`) band (the
   * competence→sharpness curve ceiling). */
  combatSharpnessMax: "combat.sharpness.max",

  /* ── weapon playstyle — the derived WeaponProfile curves (all shape ×
   * magnitude split; a bare weapon still works off these seeded fallbacks).
   * See docs/subsystems/combat.md (WeaponProfile). ── */
  /** Weapon mass (kg) that maps to a neutral 1.0 balance. */
  combatWeaponBalanceRefMass: "combat.weapon.balanceRefMass",
  /** Tempo curve exponent (light↔heavy spread) + clamp. */
  combatWeaponTempoExponent: "combat.weapon.tempoExponent",
  combatWeaponTempoMin: "combat.weapon.tempoMin",
  combatWeaponTempoMax: "combat.weapon.tempoMax",
  /** Poise-damage curve exponent (heavier → more per blow) + clamp. */
  combatWeaponPoiseDamageExponent: "combat.weapon.poiseDamageExponent",
  combatWeaponPoiseDamageMin: "combat.weapon.poiseDamageMin",
  combatWeaponPoiseDamageMax: "combat.weapon.poiseDamageMax",
  /** Overextend curve exponent (heavier → costlier to commit) + clamp. */
  combatWeaponOverextendExponent: "combat.weapon.overextendExponent",
  combatWeaponOverextendMin: "combat.weapon.overextendMin",
  combatWeaponOverextendMax: "combat.weapon.overextendMax",
  /** Balance-class band edges on the tempo factor. */
  combatWeaponBalanceHeavyBelow: "combat.weapon.balanceHeavyBelow",
  combatWeaponBalanceLightAbove: "combat.weapon.balanceLightAbove",
  /** Reach-class length thresholds (m). */
  combatWeaponReachShortBelow: "combat.weapon.reachShortBelow",
  combatWeaponReachLongAbove: "combat.weapon.reachLongAbove",
  /** Material hardness (MPa) reference for the guard nudge. */
  combatWeaponGuardHardnessRef: "combat.weapon.guardHardnessRef",

  /* ── reach range tier (the per-edge reach|close state). ── */
  /** Poise the closer spends attempting to close the gap. */
  combatReachCloseCost: "combat.reach.closeCost",
  /** Poise/energy edge the longer weapon strikes with while the foe is at
   * `reach` (and the shorter weapon is penalised). */
  combatReachAdvantageEnergy: "combat.reach.advantageEnergy",
  /** The reach-holder's contest strength when a foe tries to close. */
  combatReachContestStrength: "combat.reach.contestStrength",

  /* ── hand-slot economy. ── */
  /** Weapon-switch vulnerable-beat window (game-time seconds). */
  combatSwitchSeconds: "combat.switch.seconds",
  /** Fast sidearm-draw window (game-time seconds) — the disarm answer. */
  combatDrawSeconds: "combat.draw.seconds",
  /** Guard/parry bonus a wielded shield or a dual-wield off-hand adds. */
  combatOffhandGuardBonus: "combat.offhand.guardBonus",
  /** Competence band rank at/below which dual-wield is a net penalty
   * (novice fumbles the off-hand; you grow into it). */
  combatDualWieldMasteryRank: "combat.dualWield.masteryRank",
  /** Off-hand guard bonus a *below-mastery* dual-wielder actually gets
   * (a novice's off-hand hurts more than it helps). */
  combatDualWieldNoviceGuardBonus: "combat.dualWield.noviceGuardBonus",

  /* ───────────────────────── concealment ───────────────────────── */
  /**
   * Concealment — the effective-perception a viewer must muster to notice
   * a thing at each concealed band (the "magnitude" half of the
   * shape-vs-magnitude split; the band *names* + monotone ordering are code
   * — `lib/concealment/ConcealmentLevel.ts`). `obvious` is a hardcoded 0
   * (no key); these four are monotone increasing. Read with a fallback to
   * the seeded literal so a pre-warm / test read is safe. See
   * docs/subsystems/concealment.md.
   */
  concealmentLevelSubtle: "concealment.level.subtle",
  concealmentLevelHidden: "concealment.level.hidden",
  concealmentLevelDeep: "concealment.level.deep",
  concealmentLevelBuried: "concealment.level.buried",
  /**
   * Concealment — the band a legacy `Exit.hidden: true` migrates to (D1 —
   * `Exit.hidden` is subsumed by the concealment vocabulary). A level word
   * (`subtle`|`hidden`|`deep`|`buried`), never `obvious`; defaults to
   * `hidden`.
   */
  concealmentHiddenDefaultLevel: "concealment.hiddenDefaultLevel",
  /**
   * Detection — the passive attention a viewer brings to bear on a
   * concealed thing without actively searching (the `attention` baseline
   * folded into effective perception). Active search / care↔speed
   * modifiers layer on top in later phases. Read with a seeded-literal
   * fallback. See docs/subsystems/concealment.md.
   */
  concealmentPassiveBaseline: "concealment.passiveBaseline",
  /**
   * Detection — perception "points" conferred per `awareness` competence
   * band rank (untrained = rank 0 … expert = rank 4). `capacity = rank ×
   * this`, the competence half of effective perception. Degrades to a
   * floor capacity when the `awareness` Discipline is unseeded (a viewer
   * with no evidence reads as rank 0). Read with a seeded-literal
   * fallback. See docs/subsystems/concealment.md.
   */
  detectionCapacityPerBand: "detection.capacityPerBand",
  /**
   * Detection — the active-attention bonus a broad `search` folds into
   * effective perception (on top of the passive baseline). A rank-0 seeker
   * reaches the `hidden` band by searching. Read with a seeded-literal
   * fallback. See docs/subsystems/concealment.md.
   */
  concealmentSearchBonus: "concealment.searchBonus",
  /**
   * Detection — the extra bonus a **narrow** `search <container>` adds on
   * top of {@link concealmentSearchBonus} (narrow-deep beats broad-shallow).
   * Read with a seeded-literal fallback.
   */
  concealmentSearchDepthBonus: "concealment.searchDepthBonus",
  /**
   * Detection — the game-time window (seconds) a `search` occupies the
   * seeker's `hands` slot before it resolves. Interruptible: an abort
   * mid-search finds nothing. Read with a seeded-literal fallback.
   */
  concealmentSearchSeconds: "concealment.searchSeconds",
  /**
   * Detection — the passive-hint cutoff: a concealed-and-undiscovered thing
   * whose `requirement − effectivePerception ≤ this` surfaces a *hint* (the
   * "something sits oddly" nudge) without revealing. Read with a
   * seeded-literal fallback.
   */
  concealmentHintCutoff: "concealment.hintCutoff",
  /**
   * Detection — the smaller active-attention bonus the instantaneous
   * `examine <target>` folds in (a cheap close look, weaker than a full
   * `search`). Read with a seeded-literal fallback.
   */
  concealmentExamineBonus: "concealment.examineBonus",
  /* ─────────────── stealth — the hider's derived level ─────────────── */
  /**
   * Stealth (hide) — perception "cover" conferred per `stealth` competence
   * band rank (untrained 0 … expert 4) when an actor enters `hide`. The
   * competence half of `PerceptionApi.hideLevelFor`'s derived score (the
   * opposed sibling of {@link detectionCapacityPerBand}). Read with a
   * seeded-literal fallback. See docs/subsystems/stealth.md.
   */
  stealthHideCompetencePerBand: "stealth.hide.competencePerBand",
  /** Stealth (hide) — score per unit of available room cover (each
   * non-creature object in the room the hider can duck behind, capped).
   * Read with a seeded-literal fallback. */
  stealthHideCoverWeight: "stealth.hide.coverWeight",
  /** Stealth (hide) — score per band of darkness below neutral light (a
   * dark corner hides better). Read with a seeded-literal fallback. */
  stealthHideLightWeight: "stealth.hide.lightWeight",
  /** Stealth (hide) — flat bonus for hiding from a low, still posture
   * (crouched/sitting/lying, not standing). Read with a seeded-literal
   * fallback. */
  stealthHideStillnessBonus: "stealth.hide.stillnessBonus",
  /**
   * Stealth (hide) — the derived-score thresholds mapping to each
   * {@link ConcealmentLevel} band the hider reaches. Monotone increasing; a
   * score below `band.subtle` fails to conceal at all (`obvious`). Read with
   * seeded-literal fallbacks.
   */
  stealthHideBandSubtle: "stealth.hide.band.subtle",
  stealthHideBandHidden: "stealth.hide.band.hidden",
  stealthHideBandDeep: "stealth.hide.band.deep",
  stealthHideBandBuried: "stealth.hide.band.buried",
  /* ───────────────────────── hazards / traps ───────────────────────── */
  /**
   * Hazard — the game-time window (seconds) a `pin` traverse-consequence
   * (a snare) holds the sprung mover's `body` slot before releasing. The
   * global consequence constant; a trap's *wound energy* stays authored
   * content data (a trap's bite is authored like a weapon's, not a dial).
   * Read with a seeded-literal fallback. See docs/subsystems/concealment.md.
   */
  hazardPinSeconds: "hazard.pinSeconds",
  /**
   * Hazard — the blunt fall energy a `drop` traverse-consequence (a pit)
   * inflicts on landing, on top of the trap's own delivery (the spikes).
   * Read with a seeded-literal fallback.
   */
  hazardDropFallEnergy: "hazard.dropFallEnergy",
  /**
   * Hazard — the game-time window (seconds) the `disarm` act occupies the
   * disarmer's `hands` before the trap is defused. Interruptible: an abort
   * mid-disarm defuses nothing. Read with a seeded-literal fallback.
   */
  hazardDisarmSeconds: "hazard.disarmSeconds",
  /* ─────────────────── care↔speed movement axis ─────────────────── */
  /**
   * Movement — the detection attention modifier a `sneak` crossing folds
   * in on top of the passive baseline. Positive: moving carefully notices
   * more, so a sneaker raises their traverse-time perception over a
   * concealed trap (sneak avoids where walk springs). `walk` (and every
   * other mode) is an implicit 0 — no key. Read with a seeded-literal
   * fallback. See docs/subsystems/concealment.md.
   */
  movementAttentionSneak: "movement.attention.sneak",
  /**
   * Movement — the detection attention modifier a `run` crossing folds in.
   * Negative: barreling along notices less, so a runner drops their
   * traverse-time perception below a concealed trap (run springs where
   * walk avoids). Read with a seeded-literal fallback.
   */
  movementAttentionRun: "movement.attention.run",
  /**
   * Movement — the **observer-side** of the care↔speed axis (the mirror of
   * {@link movementAttentionSneak}/{@link movementAttentionRun}): the number
   * of concealment bands a move at each mode strips from a *hiding* mover.
   * `sneak` holds (0), `walk` degrades one band, `run` clears hiding (a
   * large count). Read by `PerceptionApi.motionExposure`, applied at
   * `Mobile.traverse`. Read with seeded-literal fallbacks. See
   * docs/subsystems/stealth.md.
   */
  movementConcealmentSneak: "movement.concealment.sneak",
  movementConcealmentWalk: "movement.concealment.walk",
  movementConcealmentRun: "movement.concealment.run",
  /* ────────────────────────── wetness (weather Wave 2) ────────────────────────── */
  /**
   * Wetness — the per-object saturation gauge's magnitudes (weather
   * Wave 2). Saturation is 0..1; drainage is reconcile-on-read
   * (presence-frozen), accrual is pushed by rain-exposure / immersion.
   * "Shelter dries faster" emerges (no accrual push when sheltered);
   * warmth accelerates the drain. See docs/subsystems/weather.md.
   */
  /** Wetness — water evaporated per game-hour, in % of the object's dry
   * mass (the fixed-mass evaporation rate). The dry rate in *saturation* is
   * `evaporationRatePct / Material.waterAbsorptionCapacity`, so a thirsty
   * material loses saturation slower. */
  wetnessEvaporationRatePct: "wetness.evaporationRatePct",
  /** Wetness — the water-absorption-capacity (%) a materialless object (or
   * a gauge whose host carries no material) reads as its neutral fallback. */
  wetnessAbsorptionCapacityDefaultPct: "wetness.absorptionCapacityDefaultPct",
  /** Wetness — extra fractional drying per K the body/object is above the
   * warmth reference (a warm body / a fire dries you faster). */
  wetnessWarmthFactor: "wetness.warmthFactor",
  /** Wetness — the reference temperature (K) above which warmth accelerates
   * drying. */
  wetnessWarmthReferenceK: "wetness.warmthReferenceK",
  /** Wetness — saturation gained per game-hour of standing in rain. */
  wetnessRainAccrualPerHour: "wetness.rainAccrualPerHour",
  /** Wetness — saturation an immersion event drives toward (full soak). */
  wetnessImmersionSaturation: "wetness.immersionSaturation",
  /** Wetness — saturation at/above which the band reads `damp`. */
  wetnessBandDampAt: "wetness.band.dampAt",
  /** Wetness — saturation at/above which the band reads `wet`. */
  wetnessBandWetAt: "wetness.band.wetAt",
  /** Wetness — saturation at/above which the band reads `soaked`. */
  wetnessBandSoakedAt: "wetness.band.soakedAt",

  /* ────────────────────────── storm (weather Wave 2) ────────────────────────── */
  /** Storm — Floor surface-bulk puddle litres accrued per rain segment. */
  stormPuddleAccrualLitersPerSegment: "storm.puddle.accrualLitersPerSegment",
  /** Storm — fraction of a puddle that evaporates per non-rain segment
   * (scaled by resolved warmth / dryness). */
  stormPuddleEvaporationFactor: "storm.puddle.evaporationFactor",
  /** Storm — the fresh-water material path a new rain puddle fills with. */
  stormPuddleFreshWaterMaterialPath: "storm.puddle.freshWaterMaterialPath",
  /** Storm — per-storm-scope probability of a lightning strike per strike
   * tick (0..1). */
  stormStrikeRate: "storm.strikeRate",
  /** Storm — the strike-tick interval, in game-seconds. */
  stormStrikeIntervalS: "storm.strikeIntervalS",
  /** Storm — the potential (V) a lightning strike source imposes. */
  stormStrikeVoltage: "storm.strikeVoltage",
  /** Storm — the relative weight bias a tall / conductive attractor adds to
   * being the struck node. */
  stormAttractorBias: "storm.attractorBias",

  /* ────────────────────────── weather (Wave 2 light / sky) ────────────────────────── */
  /** Weather — the maximum ambient-light dimming at full cloud (cloud=1);
   * the resolved cloud coverage scales the SkyExposed ambient by
   * `1 - cloudDimFactor * cloud`. */
  weatherCloudDimFactor: "weather.cloudDimFactor",
  /** Weather — how many upcoming segments the `look up` sky-read scans to
   * pick a presaging cloud form (the deterministic forecast tell). */
  weatherSkyForecastSegments: "weather.skyForecastSegments",

  /* ────────────────────────── thermal (Wave 2 wet coupling) ────────────────────────── */
  /** Thermal — how strongly a wet body loses heat faster: at full
   * saturation the cold-side wind-chill / immersion term is scaled by
   * `1 + wetHeatLossFactor`. */
  thermalWetHeatLossFactor: "thermal.wetHeatLossFactor",

  /* ────────────────────────── fire (combustion) ────────────────────────── */
  /** Fire — fuel consumed per game-minute while burning (`%`-points of the
   * fuel `Reserve`; the Campfire precedent). */
  fireBurnRatePerMin: "fire.burnRatePerMin",
  /** Fire — the temperature (K) a burning object holds while aflame
   * (complete combustion). Incomplete/starved fires run cooler — Phase 5. */
  fireFlameTemperatureK: "fire.flameTemperatureK",
  /** Fire — the latent heat of vaporization of water (J/kg) the ignition
   * energy balance must out-supply to boil a fuel's held water off before it
   * can catch (the wet-firewood term). */
  fireIgnitionWaterLatentHeatJPerKg: "fire.ignition.waterLatentHeatJPerKg",
  /** Fire — the maximum wetness-elevated ignition headroom (K) a deliberate
   * hand-flame (`ignite` verb) can dry through. A fuel whose water penalty
   * exceeds this is "too wet to catch" until it dries. */
  fireIgnitionMaxManualDryingK: "fire.ignition.maxManualDryingK",
  /** Fire — the presence-gated fire-tick interval, in game-seconds (the
   * spread + advance cadence over occupied scopes). */
  fireTickIntervalSeconds: "fire.tickIntervalSeconds",
  /** Fire — the heat (joules) a burning object radiates into each co-located
   * combustible per tick; thermal inertia + wetness gate whether it ignites. */
  fireRadiantJoulesPerTick: "fire.radiantJoulesPerTick",
  /** Fire — the fraction of radiant heat that crosses an OPEN boundary into
   * the adjacent scope (a closed / locked door is a firebreak → 0). */
  fireCrossBoundaryFraction: "fire.crossBoundaryFraction",
  /** Fire — the temperature (K) an air-starved (incomplete) fire holds;
   * cooler than complete combustion (the ventilation lesson). */
  fireFlameTemperatureIncompleteK: "fire.flameTemperatureIncompleteK",
  /** Fire — scope-air (`%` of the room's `'air'` Reserve) each burning object
   * consumes per tick in an enclosed scope. */
  fireAirConsumePerTick: "fire.air.consumePerTick",
  /** Fire — scope-air (`%`) a VENTILATED scope (sky-exposed or an open
   * boundary) regains per tick — the bellows / cracked-door replenishment. */
  fireAirReplenishPerTick: "fire.air.replenishPerTick",
  /** Fire — scope-air level (`%`) at/above which combustion is complete
   * (hot, clean); below it starves to incomplete (cooler, soot + CO). */
  fireAirCompleteThresholdPct: "fire.air.completeThresholdPct",
  /** Respiration — carbon-monoxide (contaminant) toxin burden a breather
   * takes on per reassess while in a contaminated (smoke) medium. */
  respirationContaminantBurdenPerBreath: "respiration.contaminantBurdenPerBreath",
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
