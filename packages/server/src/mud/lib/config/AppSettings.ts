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
 * defaults.** The `platform` content pack's `settings` kind (merge-missing)
 * populates the row from `app-settings.yaml`; this Document is pure
 * persistence + an in-memory cache. `warm()` loads the seeded row into the
 * cache at boot so the synchronous read surface (`AppApi`) never awaits.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import { SecurityApi } from "../../api/security";
import type { FieldMeta } from "../mixin";

/**
 * The blessed application-setting keys. Consumers reference these constants
 * (typo → compile error) instead of bare strings. The values themselves
 * live in `mud/config/app-settings.yaml`; this is just the typed key
 * vocabulary the engine reads.
 */
/**
 * The ONE code-side fallback: a world where no pack ships
 * `defaultStartLocation` (a platform-only boot) lands a new avatar in the
 * void rather than nowhere. Every other key has no default — the packs'
 * `settings` kind is the source of values.
 */
export const AppSettingFallbacks: Readonly<Record<string, string>> = {
  defaultStartLocation: "/platform/location/void",
};

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
   * selection (player-home/inline = tight, released `/platform/` + `/stuff/` + `/world/`
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
   * Banking — **the currency the Compact transacts and denominates its
   * obligations in.** Policy data, not a property of the money: this is
   * where the zorkmid's "specialness" lives, so no code path compares a
   * currency to a literal (reserve status is functional, never decreed).
   * Read only through `Currency.compact()`. See docs/subsystems/banking.md.
   */
  bankingCompactCurrency: "banking.compactCurrency",
  /**
   * Banking — the **demo** sales-tax rate, a fraction of a purchase remitted
   * to the placeholder treasury via the remittance-split seam. Authored and
   * **inert** (recorded, not governed — the corpo-affiliation-edge
   * precedent); live/legislated taxation is the Compact-governance build. See
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
   * Banking — the **opening capital** (minor units) minted into a business's
   * operating account the first time it is materialized. `openingFloat`'s
   * sibling one tier down: a branch's till is capitalized for its customers,
   * a venue's account for its trade. A business may override per-row with
   * `openingCapital:`. `0` disables. See docs/subsystems/banking.md.
   */
  bankingOpeningCapital: "banking.openingCapital",
  /**
   * Banking — the **default custodian bank** (an institution key, e.g.
   * `goodkin`) — the boot restamp's LAST RESORT for legacy rows with no
   * derivable custodian relationship (a business banks at its authored
   * `banksAt`; a worker at the payer's bank; escrow at the issuer's).
   * Only the state (`treasury`) banks at the CB. See
   * docs/subsystems/banking.md.
   */
  bankingDefaultCustodianBank: "banking.defaultCustodianBank",

  /**
   * Contracts — how long an exclusive claim holds before it lapses back to
   * open (game-hours). Squatting cannot block a board; enforcement is lazy
   * (derive-on-read at every touchpoint — no sweep, no counter).
   */
  contractClaimExpiryGameHours: "contract.claimExpiryGameHours",
  /**
   * Contracts — the default posting lifetime (game-hours) when a post
   * names none. `0` = postings never lapse unless the post specifies.
   */
  contractPostingExpiryDefaultGameHours:
    "contract.postingExpiryDefaultGameHours",
  /**
   * Contracts — the issuer-side regard drop applied to a breaching
   * claimant (abandon / claim expiry): breach must be felt, cheaply — a
   * real per-viewer social consequence via the shipped `RegardApi`, no
   * global reputation write.
   */
  contractBreachRegardPenalty: "contract.breachRegardPenalty",

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
   * Fast-travel — the Teleport Authority **Business** (templatePath): the
   * network operator the per-ride network fee accrues to, resolved as a
   * Business (its operating account, custodied at its authored `banksAt`)
   * — never a bare well-known account id (every account names a real
   * custodian, and the TPA is a business, not the state).
   */
  fasttravelTpaBusinessPath: "fasttravel.tpaBusinessPath",
  /**
   * Fast-travel — the **born-with registration floor**: a comma-separated
   * list of node template paths every fresh travel credential starts
   * registered for, so a realm's interchange and social hub are
   * universally reachable by design.
   *
   * ⭐ Data, not a code constant (TPA reform D12/AC22). It used to be
   * `BORN_WITH_TRAVEL_NODES` in `lib/credential/`, three `/world/**`
   * paths hard-coded into the kernel — which of a realm's stops are
   * universally reachable is a REALM decision, and the paths are
   * authored in `world-seed`. The seeded literal is empty, so a kernel
   * with no teleport pack has an empty floor and is *correct*.
   */
  fasttravelBornWithNodes: "fasttravel.bornWithNodes",
  /**
   * TPA — what a gate on the CITY LINE charges per τ it supplies.
   *
   * ⭐ The rate is not authored per terminal: it DERIVES from where the
   * gate's mana came from, because the operator resells its own supply
   * at its cost basis. A line-fed gate is cheap; a frontier post
   * running on bought cells is dear (`tpa.manaRate.cell`), and the
   * traveller can see which is which by looking at the terminal.
   * *Calibrate at launch.*
   */
  tpaManaRateMains: "tpa.manaRate.mains",
  /**
   * TPA — what a gate running on BOUGHT CELLS charges per τ. Dearer
   * than the line by construction, which is what makes two
   * otherwise-identical gates quote different prices for the same ride.
   * *Calibrate at launch.*
   */
  tpaManaRateCell: "tpa.manaRate.cell",

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
   * Press (news ticker) — the server-owned ticker semantics. The engine
   * ships the pins-first/recency window + soft-retract/expiry; these are the
   * operator-tunable limits, read with a try/catch fallback so a pre-warm /
   * test read is still safe. See docs/subsystems/press.md.
   */
  /** Press — max releases in the live ticker window. */
  pressTickerWindow: "press.tickerWindow",
  /** Press — max pinned releases held at the top of the window. */
  pressMaxPins: "press.maxPins",
  /** Press — max rendered length (chars) of a headline. */
  pressHeadlineMaxLength: "press.headlineMaxLength",
  /** Press — max rendered length (chars) of a body. */
  pressBodyMaxLength: "press.bodyMaxLength",
  /**
   * Press — which publisher organizations the **anonymous** start-screen
   * press room shows, as a comma-separated list of organization paths.
   *
   * ⚠ **Placement, not permission.** Being on this list puts a publisher
   * on the app's front door; it says nothing about who may read a given
   * release, which is the visibility clamp's job. A publisher can be
   * public and off the list; a listed publisher can still have a
   * members-only release. Collapsing the two would make placement imply
   * permission.
   *
   * ⚠ A comma-separated string because `AppApi.setting()` returns a
   * `string` — there is no array type. An entry that does not resolve is
   * **skipped and logged**: a typo would otherwise empty the front page
   * with no signal, and "looking deliberate while empty" is precisely
   * this surface's failure mode.
   */
  pressFrontPage: "press.frontPage",

  /**
   * Residency — scheduled object self-maintenance (see
   * docs/subsystems/residency.md). Keys are namespaced per sweep:
   * `residency.eviction.*` is the real-time cold-tail garbage-culler
   * (ships in observe mode — logs candidates, culls nothing; enforcement
   * is a flip, re-read each sweep, no restart). The deferred game-time
   * reset sweep will namespace under `residency.reset.*`.
   */
  /**
   * Sandbox (holodeck) — the orphan sweeper: scoped-row discard for any
   * circle scope with no live session (docs/subsystems/sandbox.md).
   */
  /** Sandbox sweeper — real-time cadence in ms (the residency pattern). */
  sandboxSweeperIntervalMs: "sandbox.sweeper.intervalMs",
  /** Sandbox — linkdead reconnect grace inside a circle, in ms. */
  sandboxSessionGraceMs: "sandbox.session.graceMs",
  /** Eviction — `observe` (log only) | `enforce` (actually cull). */
  residencyEvictionMode: "residency.eviction.mode",
  /**
   * How often the world is reset, in words — e.g. `"nightly"`.
   *
   * ⚠⚠ **Unset by default, and unset means the front door says
   * NOTHING about resets.** Do not set this as ambience: it is a
   * promise about whether a player's work survives the night, and the
   * server that sets it should be the server that actually does the
   * resetting. Surfaced on `/auth/status` as `resetPolicy`.
   */
  worldResetPolicy: "world.resetPolicy",

  /**
   * The record layer (docs/subsystems/record-layer.md).
   *
   * `record.frames.window` — how many frames the server retains per
   * player. A **rolling window**, not an archive: the oldest are evicted
   * first, because a frame's value decays fast and its volume does not.
   *
   * `record.frames.flushMs` — how often the buffered writer drains to
   * Mongo. ⚠ The write must never sit on the render hot path; this is
   * the cadence that keeps it off.
   *
   * `record.recall.limit` — how many hits one `recall` returns per
   * scope.
   */
  recordFrameWindow: "record.frames.window",
  recordFrameFlushMs: "record.frames.flushMs",
  recordRecallLimit: "record.recall.limit",

  /**
   * The nightly reset job (docs/subsystems/record-layer.md § The wipe).
   *
   * ⚠⚠ **Destructive by design, and off unless explicitly armed.**
   * `world.reset.mode` follows the residency-sweep precedent — `dry-run`
   * (default: log what it WOULD remove, remove nothing) vs `enforce`.
   * There is no reflog; a wipe that quietly takes one category too many
   * is indistinguishable from a data-loss bug.
   *
   * ⚠ `world.resetPolicy` (above) is the PROSE the front door prints.
   * Setting it without arming the job is a claim the server does not
   * keep; arming the job without setting it is a reset nobody was told
   * about. The job's installer sets both together.
   */
  worldResetMode: "world.reset.mode",
  /** Real-time cadence in ms between reset runs. */
  worldResetIntervalMs: "world.reset.intervalMs",
  /** Eviction — sweep cadence in ms. */
  residencyEvictionIntervalMs: "residency.eviction.intervalMs",
  /** Eviction — idle grace window (ms) before an object is a candidate. */
  residencyEvictionIdleThresholdMs: "residency.eviction.idleThresholdMs",
  /** Reset — `observe` (log only) | `enforce` (actually repop). */
  residencyResetMode: "residency.reset.mode",
  /** Reset — game-time sweep cadence in game-seconds. */
  residencyResetIntervalS: "residency.reset.intervalS",
  /** Residency — the SPAWN sweep's mode: `observe` (default) | `enforce`.
   * The third self-maintenance sweep, alongside eviction and reset, and
   * observe-first for the same reason: watch the algorithm in production
   * before it places anything. */
  residencySpawnMode: "residency.spawn.mode",
  /** Residency — spawn-sweep cadence, game-seconds. *Calibrate at launch.* */
  residencySpawnIntervalS: "residency.spawn.intervalS",
  /** Residency — how much a region's declared `favours` material tag
   * multiplies a candidate's draw weight. Shifts WHICH item fills a
   * region's stock, never how much of it there is (that is the item's
   * `regionTarget`, overridden by the zone's `stocks`).
   * *Calibrate at launch.* */
  residencySpawnAffinityBoost: "residency.spawn.affinityBoost",
  /** Residency — how many placements one sweep may make in ONE region
   * before it stops drawing there (the draw-until-decline loop's cap, so a
   * mis-authored target can never turn a sweep into a flood). Default 64.
   * *Calibrate at launch.* */
  residencySpawnPerRegionCap: "residency.spawn.perRegionCap",

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
   * Kick relay (read-only, webhook transport) dials. `replayWindowSec` is
   * the accept window around a webhook delivery's signed timestamp;
   * `dedupTtlSec`/`dedupMaxSize` bound the message-id idempotency ring
   * (Kick delivers at-least-once); `resolveCacheTtlMs` is the slug →
   * broadcaster-id resolution cache. See docs/subsystems/streaming.md.
   */
  kickReplayWindowSec: "kick.replayWindowSec",
  kickDedupTtlSec: "kick.dedupTtlSec",
  kickDedupMaxSize: "kick.dedupMaxSize",
  kickResolveCacheTtlMs: "kick.resolveCacheTtlMs",

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
  /** Electricity — the discrete-pulse tetany window (game-seconds): how
   * long a broken-circuit contact (a stun-baton tap) holds a body rigid
   * after the current stops. A live circuit ignores this (it re-probes as
   * closed and self-sustains); the window only governs the after-grip of a
   * one-shot contact. The taser's control payoff. */
  electricityTetanyPulseSeconds: "electricity.tetanyPulseSeconds",
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

  /* ── the engagement band ladder (close|reach|near|far). ── */
  /** Room linear extent (m) at/above which the `near` band is affordable. */
  combatRangeNearMetres: "combat.range.nearMetres",
  /** Room linear extent (m) at/above which the `far` band is affordable. */
  combatRangeFarMetres: "combat.range.farMetres",
  /** Poise spent opening one band of distance (withdrawal costs more than
   * an advance — leaving under pressure is the harder act). */
  combatRangeWithdrawCost: "combat.range.withdrawCost",
  /** The band a working reaches by default. `far` keeps every shipped
   * spell inert against the band gate; a carrier declares its own. */
  magicSpellEnvelope: "magic.spellEnvelope",
  /** The band a thrown carrier reaches. */
  combatRangeThrownEnvelope: "combat.range.thrownEnvelope",
  /** Launch speed (m/s) of a thrown object — the ½mv² input. */
  combatRangeThrowSpeed: "combat.range.throwSpeedMs",
  /** Fraction of a broken vessel that lands on the primary target, by
   * placement class. The remainder splashes and spills. */
  combatRangeSplashPrecise: "combat.range.splash.preciseFraction",
  combatRangeSplashPrimary: "combat.range.splash.primaryFraction",
  combatRangeSplashGraze: "combat.range.splash.grazeFraction",
  /** Fraction each clinched bystander catches. */
  combatRangeSplashBystander: "combat.range.splash.bystanderFraction",

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
  /** Formations — an interceptor already pressed by this many incoming
   * edges is ineligible to take a redirect (the pressure ceiling). */
  combatFormationInterceptMaxIncoming: "combat.formation.intercept.maxIncoming",
  /** Formations — Master-Apprentice's `high-threat` trigger: intercept
   * when the protected role's incoming edge count reaches this. */
  combatFormationHighThreatEdges: "combat.formation.ma.highThreatEdges",
  /** Formations — real seconds a captain-call coup is held awaiting
   * `fight finish` before the fallen is spared (mercy by default). */
  combatFormationCoupDirectiveWindowSeconds:
    "combat.formation.coup.directiveWindowSeconds",
  /** Combat hooks — `CombatApi.influence` `stagger`: poise eroded by a
   * `light` instruction (focus-fire-scaled like exchange erosion). */
  combatInfluenceStaggerLightErode: "combat.influence.staggerLightErode",
  /** Combat hooks — `CombatApi.influence` `stagger`: poise eroded by a
   * `heavy` instruction (a crossing arms the normal ownerless opening). */
  combatInfluenceStaggerHeavyErode: "combat.influence.staggerHeavyErode",
  /** Combat hooks — `CombatApi.influence` `steady`: poise restored
   * (endurance-capped; suppressed under the focus-fire recovery pin). */
  combatInfluenceSteadyRestore: "combat.influence.steadyRestore",
  /** The species combat vocabulary — body mass (kg) at/above which a
   * HINT-LESS natural attack derives large-body reach (one rank) +
   * heavy balance ("an ogre punches at ogre reach"). Below it the
   * derivation is exactly the neutral `(1, 1, 1, 0)` — the byte-parity
   * band every currently-seeded body sits in; a body seed crossing this
   * changes its combat feel by design. */
  combatNaturalLargeBodyMassKg: "combat.natural.largeBodyMassKg",
  /** The species combat vocabulary — the reference body mass (kg) at
   * which a `massScaled` natural attack's inflict energy is neutral (×1);
   * a heavier striker's fist hits harder, a lighter one softer, clamped
   * to [energyScaleMin, energyScaleMax]. Only attacks that opt in
   * (`massScaled: true`, the humanoid fist) read it — no shipped beast
   * does, so every existing innate is byte-identical. */
  combatNaturalEnergyRefMassKg: "combat.natural.energyRefMassKg",
  /** The lower clamp on a `massScaled` attack's mass-energy factor. */
  combatNaturalEnergyScaleMin: "combat.natural.energyScaleMin",
  /** The upper clamp on a `massScaled` attack's mass-energy factor. */
  combatNaturalEnergyScaleMax: "combat.natural.energyScaleMax",

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
  /** Concealment — the requirement for the band BELOW obvious. ⭐
   * Negative on purpose: a conspicuous thing resolves for a viewer who
   * would miss an ordinary one. */
  concealmentLevelConspicuous: "concealment.level.conspicuous",
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
  /** Stealth — how many concealment band-ranks a fully conspicuous (or
   * fully quiet) worn covering is worth. ⭐ A person in a hi-vis vest
   * who hides gets a worse FLOOR than a person in grey. */
  stealthHideCoveringWeight: "stealth.hide.coveringWeight",
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
  /** Stealth — the hide score BELOW which a failed hide bottoms out one
   * band worse than obvious. ⭐ The floor is no longer flat: a person in
   * a hi-vis vest who hides is easier to see than one in grey. */
  stealthHideBandConspicuous: "stealth.hide.band.conspicuous",
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

  /* ────────────────────────── husbandry (living world phase 1) ────────────────────────── */
  /**
   * Husbandry — the growth model's dials (GrowingMixin). Growth is
   * reconcile-on-read over game-time with NO far-past guard (an owned
   * thing lives the full absence — the family clock); long gaps are
   * bounded by the step cap, never a time cap. All literals are
   * placeholders for a running game. See docs/subsystems/husbandry.md.
   */
  /** Husbandry — game-seconds per reconcile integration step. */
  husbandryStepSec: "husbandry.stepSec",
  /** Husbandry — the step cap a long absence is integrated within (dt
   * grows to compensate — a step cap, never a time cap). */
  husbandryMaxSteps: "husbandry.maxSteps",
  /** Husbandry — vigor relaxation time constant (game-seconds): the e-fold
   * toward the limiting satisfaction. Sets the neglect fuse's slope. */
  husbandryVigorTauSec: "husbandry.vigorTauSec",
  /** Husbandry — limiting satisfaction at/above which maturity accrues
   * ("good time"). The root floor sits below it, so a pot-bound plant
   * stalls. */
  husbandryGoodAt: "husbandry.goodAt",
  /** Husbandry — vigor below which the plant dies (terminal latch). */
  husbandryDeathAt: "husbandry.deathAt",
  /** Husbandry — the root-satisfaction floor: a pot-bound plant holds at a
   * visible band and never dies of root binding alone. */
  husbandryRootFloor: "husbandry.rootFloor",
  /** Husbandry — vigor at/above which the band reads `thriving` (also the
   * flowering latch threshold). */
  husbandryBandThrivingAt: "husbandry.band.thrivingAt",
  /** Husbandry — vigor at/above which the band reads `healthy`. */
  husbandryBandHealthyAt: "husbandry.band.healthyAt",
  /** Husbandry — vigor at/above which the band reads `stressed` (below it,
   * `failing`). */
  husbandryBandStressedAt: "husbandry.band.stressedAt",
  /** Husbandry — extra fractional transpiration per K above the warmth
   * reference. */
  husbandryWarmthFactor: "husbandry.warmthFactor",
  /** Husbandry — the reference temperature (K) above which warmth
   * accelerates transpiration. */
  husbandryWarmthReferenceK: "husbandry.warmthReferenceK",

  /* ─────────────── husbandry — soil state (living world phase 2) ─────────────── */
  /** Husbandry — nutrient fraction at/above which nutrient satisfaction is
   * 1 (well-fed soil). */
  husbandryNutrientHappyAt: "husbandry.nutrientHappyAt",
  /** Husbandry — nutrient fraction at/below which nutrient satisfaction is
   * 0 (spent soil). */
  husbandryNutrientSpentAt: "husbandry.nutrientSpentAt",
  /**
   * Husbandry — the harvest grade ladder. A crop's band is read off the
   * plant's WORST limiting satisfaction, not its average or its final
   * condition, so farming rewards your worst moment. Each dial is the
   * floor for that band; below the lowest, the crop is `poor`.
   */
  husbandryGradeFairAt: "husbandry.grade.fairAt",
  husbandryGradeFineAt: "husbandry.grade.fineAt",
  husbandryGradeExceptionalAt: "husbandry.grade.exceptionalAt",
  husbandryGradeMasterfulAt: "husbandry.grade.masterfulAt",

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

  /* ────────────────────────── magic (casting core) ────────────────────────── */
  /** Magic — default cast time (game-seconds) when a spell seed omits one. */
  magicCastSecondsDefault: "magic.castSecondsDefault",
  /** Magic — default mana cost (pt) when a spell seed omits one. */
  magicCostDefault: "magic.costDefault",
  /** Magic — fraction of a spell's cost spent on an aborted cast (0 =
   * abort is free; the tuning seam if cast-cancel spam needs teeth). */
  magicAbortCostFraction: "magic.abortCostFraction",
  /** Magic — mana pool capacity (pt) a `low`-depth faculty derives. */
  magicDepthCapacityLow: "magic.depthCapacity.low",
  /** Magic — mana pool capacity (pt) a `mid`-depth faculty derives. */
  magicDepthCapacityMid: "magic.depthCapacity.mid",
  /** Magic — mana pool capacity (pt) a `high`-depth faculty derives. */
  magicDepthCapacityHigh: "magic.depthCapacity.high",
  /** Magic — base mana recovery (pt per game-minute) at rest, before the
   * serenity factor and the metabolism-shaped rest-quality scaling. */
  magicRecoveryPerMinBase: "magic.recoveryPerMinBase",
  /** Magic — τ delivered into an item's tank per point of the
   * recharging caster's own reserve spent. The exchange rate of the
   * recharging SERVICE: what is scarce is caster-hours, not shells.
   * *Calibrate at launch.* */
  magicRechargeKJPerManaPt: "magic.recharge.kJPerManaPt",
  /** Magic — pattern integrity (0..1) restored per point spent
   * re-impressing a focus. Deliberately DEARER per point of usefulness
   * than filling a tank: a focus is cheap to own and expensive to
   * maintain, which is the counterweight to having no tank to run dry.
   * *Calibrate at launch.* */
  magicRefreshPatternPerManaPt: "magic.recharge.patternPerManaPt",
  /** Magic — τ of stored charge a charged item spends per point of a
   * spell's authored cost. ⓘ **Vestigial since the TPA reform (P1):**
   * the caster-facing pool and the item-facing tank are now the SAME
   * denominator (both `'pt'`, both spoken as τ), so the honest value is
   * the identity `1` and the conversion is a no-op. The KEY is kept —
   * an operator may have set it, and `1 τ ≡ 1 kJ` makes the old value
   * mean the same thing — but nothing in the code names kJ any more.
   * *Calibrate at launch.* */
  magicChargeKJPerCostPt: "magic.charge.kJPerCostPt",
  /** Magic — fraction of an item's committed energy that becomes WASTE
   * HEAT in the item rather than effect. No process is perfectly
   * efficient, and on a charged item the endpoint is the shell — which
   * is what lets a cooling wand crack and makes a spark wand safer than
   * the equivalent cast. *Calibrate at launch.* */
  magicWasteHeatFraction: "magic.wasteHeatFraction",
  /** Magic — a charged item's idle self-discharge, per GAME second. The
   * `d` in `S* = inflow/d`: with no decay, stock grows without bound at
   * any inflow throttle and no dial can save it. HALF the answer — the
   * ratio to inflow is what settles the world's charged stock.
   * *Calibrate at launch.* */
  magicChargeDecayPerGameSec: "magic.charge.decayPerGameSec",
  /** Magic — what an always-on charged item draws just staying on
   * (watts). Two orders of magnitude above the leak, which is what makes
   * always-on the EXPENSIVE mode rather than a rounding difference — a
   * worn ring flattens in days where a stowed wand lasts months.
   * *Calibrate at launch.* */
  magicChargeStandbyWatts: "magic.charge.standbyWatts",
  /** Magic — the lowest `attentionFactor` any garment can produce.
   * ⚠ Bounded well above zero on purpose: a hood makes a binding
   * CHEAPER to hold, never free. Faculty is capacity, never access. */
  magicAttentionFloor: "magic.attention.floor",
  /** Magic — a focus's pattern rot, per GAME second. Much slower than
   * charge decay: a binding is a state held away from equilibrium and a
   * pattern that does work cannot BE at equilibrium, so it relaxes — but
   * it has no energy to leak, only order to lose. The canon line is
   * "magic perishes, matter doesn't". *Calibrate at launch.* */
  magicPatternRotPerGameSec: "magic.pattern.rotPerGameSec",
  /** Magic — satiation (%) spent per mana point recovered. Mana is the
   * SECOND consumer of metabolism's coupled-recovery keystone: a caster
   * refilling from nothing was a live first-law violation, and
   * `arcane-science.md` prices recovery at ~300 W of metabolic work.
   * *Calibrate at launch.* */
  magicRecoverySatiationCost: "magic.recovery.satiationCost",
  /** Magic — hydration (%) spent per mana point recovered. The tighter
   * leash of the two, as it is for endurance. *Calibrate at launch.* */
  magicRecoveryHydrationCost: "magic.recovery.hydrationCost",
  /** Magic — recovery multiplier for a `low`-serenity faculty. */
  magicSerenityFactorLow: "magic.serenityFactor.low",
  /** Magic — recovery multiplier for a `mid`-serenity faculty. */
  magicSerenityFactorMid: "magic.serenityFactor.mid",
  /** Magic — recovery multiplier for a `high`-serenity faculty. */
  magicSerenityFactorHigh: "magic.serenityFactor.high",
  /** Magic — the mental-resist substrate base for a `low` composure band. */
  magicComposureBaseLow: "magic.composureBase.low",
  /** Magic — the mental-resist substrate base for a `mid` composure band. */
  magicComposureBaseMid: "magic.composureBase.mid",
  /** Magic — the mental-resist substrate base for a `high` composure band. */
  magicComposureBaseHigh: "magic.composureBase.high",
  /** Magic — the floor of the live composure read: factor = base ×
   * (floor + (1−floor) × manaFraction), so a fully drained mage keeps
   * this fraction of their composure base. */
  magicComposureFloorFactor: "magic.composure.floorFactor",
  /** Magic — per-competence-band potency multiplier step (how much a
   * higher casting band scales an effect's authored intensity). */
  magicPotencyCompetenceFactor: "magic.potency.competenceFactor",
  /** Magic — overchannel-strain stages per pt of mana deficit when a
   * cast completes past empty. */
  magicOverchannelSeverityPerDeficit: "magic.overchannel.severityPerDeficit",
  /** Magic — mana fraction (0..1) recovery must clear to relieve
   * overchannel strain (the metabolism hysteresis-clear precedent). */
  magicOverchannelClearThreshold: "magic.overchannel.clearThreshold",
  /** Magic — dread's timed decay: stages lost per game-second. */
  magicDreadDecayPerSec: "magic.dread.decayPerSec",
  /** Magic — emitted flux (lumens) of the glowlight bound orb. */
  magicGlowlightLumens: "magic.glowlight.lumens",
  /** Magic — litres of water the conjure-water effect transfers when the
   * spell seed omits an amount. */
  magicConjureWaterLitres: "magic.conjure.waterLitres",

  /* ────────────────────────── crafting ────────────────────────── */
  /** Crafting — condition at/below which a durable good is broken (a
   * broken tool offers no capabilities; a broken weapon's delivery is
   * floored). */
  craftingBrokenThreshold: "crafting.brokenThreshold",
  /** Crafting — the delivery-scale floor a broken weapon is clamped to. */
  craftingBrokenDeliveryFloor: "crafting.brokenDeliveryFloor",
  /** Crafting — condition worn off a weapon per landed strike (Law 2:
   * wear on use, never the clock). */
  craftingWearWeaponPerStrike: "crafting.wear.weaponPerStrike",
  /** Crafting — condition worn off each covering layer that attenuates a
   * mechanical blow. */
  craftingWearArmorPerBlow: "crafting.wear.armorPerBlow",
  /** Crafting — keenness lost by an edge/point weapon per landed strike
   * (the fast-cycling working-surface axis; sharpen restores). */
  craftingKeennessWearPerUse: "crafting.keenness.wearPerUse",
  /** Crafting — the delivery-factor floor a fully blunted edge lerps to
   * (factor = lerp(floor, 1, keenness) on edge/point delivery). */
  craftingKeennessDeliveryFloor: "crafting.keenness.deliveryFloor",
  /** Crafting — duration (ms) of the engaged sharpen activity. */
  craftingKeennessSharpenDurationMs: "crafting.keenness.sharpenDurationMs",
  /** Crafting — the lossy salvage fraction: each constituent material
   * returns `mass × fraction × salvageRate`; the rest is dross. */
  craftingSalvageRate: "crafting.salvageRate",
  /** Crafting — repair material cost factor: cost mass = item mass ×
   * (1 − condition) × costFactor. */
  craftingRepairCostFactor: "crafting.repair.costFactor",
  /** Crafting — the material-cost multiplier when repairing a broken good. */
  craftingRepairBrokenFactor: "crafting.repair.brokenFactor",
  /** Crafting — reachable heat (K) metal repair requires (forge-grade). */
  craftingRepairMetalHeatK: "crafting.repair.metalHeatK",
  /** Crafting — kilograms of ice an iced drink takes from the reachable
   * ice bin at the fill (the bar's scoop). */
  craftingIceKg: "crafting.iceKg",

  /*
   * Wiki — the render budget (docs/subsystems/wiki.md).
   *
   * A page is community-authored input that runs a resolver: snippets
   * expand to fixpoint and components reach live sources, and both are
   * written by players. Every bound below fails with an inline error
   * rather than a hang, because the failure mode this guards against is
   * not a wrong answer but a request that never returns.
   */
  /** Wiki — how deep snippet expansion may nest (catches self-inclusion). */
  wikiRenderSnippetDepth: "wiki.render.snippetDepth",
  /** Wiki — total snippet expansions per render (catches the mutually
   *  -including PAIR, which alternates and so never gets deep). */
  wikiRenderMaxSnippets: "wiki.render.maxSnippets",
  /** Wiki — how many components one render may resolve. */
  wikiRenderMaxComponents: "wiki.render.maxComponents",
  /** Wiki — per-component timeout; one slow source stalls a widget, never
   *  the page. */
  wikiRenderComponentTimeoutMs: "wiki.render.componentTimeoutMs",
  /** Wiki — the emitted-body ceiling, in characters (expansion bombs). */
  wikiRenderMaxOutputChars: "wiki.render.maxOutputChars",

  /*
   * Water — the watershed (docs/subsystems/watershed.md).
   *
   * One authored file, `water.yaml`, rather than dials scattered across
   * weather / husbandry / conduit files, because the numbers only make
   * sense read against each other: how hard it rains decides how much a
   * bed gets, which decides how much a reach carries, which decides
   * whether a right binds.
   *
   * ⚠ Every key here has a seeded literal at its call site, so the
   * kernel behaves correctly with the `water` pack absent. A dial that
   * only works when a pack is installed is a dial that fails silently.
   */
  /** Water — mm/h of liquid water a `rain` segment delivers. */
  waterRainRateMmPerHour: "water.rate.rain",
  /** Water — mm/h a `storm` segment delivers. */
  waterStormRateMmPerHour: "water.rate.storm",
  /** Water — mm/h water-equivalent a `snow` segment banks as pack. */
  waterSnowRateMmPerHour: "water.rate.snow",

  /** Water — fraction of precipitation that reaches a channel rather
   * than evaporating or soaking away. The rest is not modelled: this
   * build's non-goal is mass conservation at watershed scale — the sky
   * supplies and the sea absorbs. */
  waterRunoffCoefficient: "water.runoffCoefficient",
  /** Water — the catchment's response window, in game-days. Flow is the
   * MEAN precipitation over it, which is what gives a river a lagged,
   * damped hydrograph instead of a channel that empties in a dry week. */
  waterBaseflowWindowDays: "water.baseflowWindowDays",

  /** Water — how far back the snowpack integral looks, in game-days. It
   * has to see a whole winter to know what is sitting on the mountain,
   * so this is deliberately far longer than the flow window. */
  waterSnowWindowDays: "water.snow.windowDays",
  /** Water — atmospheric lapse rate (K per kilometre of altitude). What
   * makes ALTITUDE the thing that banks snow. */
  waterSnowLapseRateKPerKm: "water.snow.lapseRateKPerKm",
  /** Water — degree-day melt factor: mm of water-equivalent released
   * per Kelvin above freezing per game-day. */
  waterSnowMeltMmPerKPerDay: "water.snow.meltMmPerKPerDay",
  /** Water — mean sea-level air temperature (K) in spring. */
  waterSeasonMeanKSpring: "water.season.meanK.spring",
  /** Water — mean sea-level air temperature (K) in summer. */
  waterSeasonMeanKSummer: "water.season.meanK.summer",
  /** Water — mean sea-level air temperature (K) in fall. */
  waterSeasonMeanKFall: "water.season.meanK.fall",
  /** Water — mean sea-level air temperature (K) in winter. */
  waterSeasonMeanKWinter: "water.season.meanK.winter",

  /** Water — flow (m³/s) at or above which a reach carries a boat. */
  waterNavigableMinFlowM3S: "water.navigable.minFlowM3S",
  /** Water — channel width (m) at or above which a reach carries a
   * boat. BOTH conditions hold: a torrent through a gorge is not
   * navigable, and neither is a wide trickle. */
  waterNavigableMinWidthM: "water.navigable.minWidthM",

  /** Water — pump efficiency (0..1): the fraction of the electrical
   * draw that becomes lift. `ρ·g·Δh·Q / η` is the pump's bill, and it
   * is hydro generation's own equation read the other way. */
  waterPumpEfficiency: "water.pumpEfficiency",
  /** Water — turbine efficiency (0..1) for `ρ·g·Δh·Q` at a control. */
  waterTurbineEfficiency: "water.turbineEfficiency",
  /** Water — the temperature (K) at or below which a line reads
   * `frozen`. Its own key rather than a shared freezing point, because
   * a buried main survives an air temperature a puddle does not. */
  waterFreezeK: "water.freezeK",
  /** Water — the arriving contaminant concentration at or above which a
   * supply reads `fouled`. Measured AFTER the conduit's own treatment,
   * so investing in treatment moves the threshold rather than the
   * river. */
  waterFouledAt: "water.fouledAt",

  /* ─────────────────────────── textiles ─────────────────────────── */
  /**
   * Textiles — the `clo` derivation's three reference constants. ⚠ The
   * PHYSICS is not dialable and is not here: `R_CLO = 0.155 m²·K/W` is
   * the unit's definition, and the conductivities of air and water are
   * facts. What operators may move is the reference BODY these numbers
   * are stated against.
   */
  /** Textiles — reference whole-body surface area (m²) a garment's
   * covered area is a share of. */
  textilesCloReferenceSurfaceM2: "textiles.clo.referenceSurfaceM2",
  /** Textiles — surface share assumed for a garment whose `slotClaims`
   * resolve to no body plan (a fixture, a stock row). */
  textilesCloDefaultCoveredFraction: "textiles.clo.defaultCoveredFraction",
  /** Textiles — the `waterAbsorptionCapacity` (%) at which a soaked
   * material's loft counts as fully flooded. Wool sits at 33 and linen
   * at 20, so this is what decides how far apart wet wool and wet linen
   * end up. */
  textilesCloAbsorptionReference: "textiles.clo.absorptionReference",
  /** Textiles — how much of a covered part's insulation an air gap
   * costs at maximum looseness (`0..1`). The fit consequence. */
  textilesFitLoosenessCloPenalty: "textiles.fit.loosenessCloPenalty",
  /** Textiles — the outermost layer's weave density scales a wind
   * term; this is its weight against the still-air baseline. */
  textilesWindproofWeight: "textiles.windproofWeight",
  /** Textiles — extra placement coupling per unit of a worn garment's
   * tightness. Clothes that bind are a real load. */
  textilesFitTightnessBurden: "textiles.fit.tightnessBurden",
  /** Textiles — extra seam wear per unit of tightness, as a multiplier
   * on the EXISTING per-blow decrement. ⚠ Not a clock: wear stays
   * act-driven. */
  textilesFitTightnessWear: "textiles.fit.tightnessWear",
  /** Textiles — the fit distance above which a garment simply will not
   * go on. A halfling's coat on a dragonborn fails on a NUMBER. */
  textilesFitRefuseAbove: "textiles.fit.refuseAbove",
  /** Textiles — fraction of remaining colour a FULLY UNBOUND dye loses
   * per wash. Scaled by `1 − fastness`, so a well-mordanted piece keeps
   * nearly all of it and an un-mordanted one washes straight out. */
  textilesDyeWashLoss: "textiles.dye.washLoss",
  /** Textiles — how much the BOND itself weakens per wash. Why even
   * good work eventually needs redoing. */
  textilesDyeBondLoss: "textiles.dye.bondLoss",
  /** Textiles — application strength below which a colour no longer
   * reads at all, and the thing is undyed again. */
  textilesDyeLegibleAt: "textiles.dye.legibleAt",
} as const;

export type AppSettingKey =
  (typeof AppSettingKeys)[keyof typeof AppSettingKeys];

export class AppSettings extends Document {
  static collectionName = Collections.AppSettings;
  static fieldMeta: FieldMeta = {
    values: { persistent: true },
  };

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
   * the platform pack's job (`PackApi.install`), which runs earlier in the boot sequence.
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
