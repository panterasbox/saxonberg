// ConsumerLogic — the hot-reloadable logic singleton behind ConsumerApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import ParticipationEvent from '../../../lib/standing/ParticipationEvent';
import type { ParticipationEventFields } from '../../../lib/standing/ParticipationEvent';
import ParticipationStanding, {
  PARTICIPATION_WIDE,
} from '../../../lib/standing/ParticipationStanding';
import {
  Band,
  DEFAULT_BAND_THRESHOLDS,
} from '../../../lib/standing/Band';
import type { BandThreshold } from '../../../lib/standing/Band';
import { InfluenceStanding } from '../../../lib/standing/InfluenceStanding';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { RenownApi } from '../../../api/renown';
import { EventApi } from '../../../api/event';
import type { Subscription } from '../../../api/event';
import { ScheduleApi } from '../../../api/schedule';
import type { ScheduleHandle } from '../../../api/schedule';
import { PersistApi } from '../../../api/persist';
import { StuffApi } from '../../../api/stuff';
import { CommandDispatchedEvent } from '../../../lib/events/CommandDispatchedEvent';
import type { CommandDispatchedPayload } from '../../../lib/events/CommandDispatchedEvent';
// Referenced only inside installDispatchTap (the restrictSubscribe allowlist),
// so the ConsumerLogic ↔ ProducerLogic import cycle is runtime-only / safe.
// eslint-disable-next-line no-restricted-imports -- sibling logic singletons in one subsystem; class identities feed EventApi.restrictSubscribe's subscriber allowlist (cycle-safe, see comment)
import { ProducerLogic } from './ProducerLogic';
import { SubscriptionApi } from '../../../api/subscription';
import { Decay } from '../../../lib/Decay';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';

const ConsumerApiCallers = SecurityPolicies.FromModule('/api/consumer#ConsumerApi'
);

/**
 * The install/warm seam is also callable by the self-warming
 * `ParticipationStandings` singleton (the boot()-retirement shape): the tap +
 * schedule state stays HERE (hot-reload re-assertion), the manifest
 * home arms it at onCreate.
 */
const ConsumerBootCallers = SecurityPolicies.AnyOf(
  ConsumerApiCallers,
  SecurityPolicies.FromTemplate('/platform/idea/ParticipationStandings'),
);

/**
 * Recompute cadence — a code constant (cadence is *mechanism*, not a
 * legislated value; mirrors renown decision 3). Cache refresh rides
 * real-time `ScheduleApi`; the decay math inside also uses real time (the
 * participation divergence — it measures a human showing up).
 */
const CONSUMER_RECOMPUTE_MS = 60_000;

/**
 * ⭐ The subjects whose ledger rows changed since the last pass
 * (db-performance D4). `null` means EVERYTHING — what a fresh module holds,
 * so the first pass after a start or a hot reload is a full one and
 * correct by construction: there is no cursor to persist and no margin to
 * get wrong. Every append that writes a row marks its subject AFTER the
 * write; a pass takes the set before its first await.
 */
let dirty: Set<string> | null = null;
/** What the last pass scored with (D6): a change forces a full pass. */
let lastFingerprint: string | null = null;
/** Rows per `saveMany` (the pass chunks its batch). */
const STANDING_WRITE_CHUNK = 500;

/** Mark `subject` for the next pass (a no-op while a full pass is owed). */
function markDirty(subject: string): void {
  dirty?.add(subject);
}

/** What scoring reads from settings — participation's figure is one decay. */
function fingerprint(): string {
  return String(decayHalfLifeS());
}

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/**
 * Resolve a live `stuffId` to the **person** it is — the identity path
 * participation banks on (`/platform/agent/Avatar/<playerId>` for a
 * player, its own row for an NPC). The giver's `stuffId` is re-minted on
 * re-clone (reboot / relog), so keying the bucket log on it silently resets
 * standing; and ⚠⚠ the giver's LINEAGE (`getTemplatePath()`) is the row it
 * was cloned from, which every player body shares
 * (`/platform/agent/PrimaryAvatar`, and `ShadeAvatar` for every shade) — a
 * lineage key was every player at once, and nobody any reader asks about
 * (db-performance W1, D1). The identity is the key renown already used, so
 * the consumer product (`renownOf × participationOf`) multiplies two
 * figures about one person, and a shade continues its person.
 *
 * ⭐ `null` when the giver has no identity — a login screen (D3). Its raw
 * `stuffId` would be a subject no reader can ever ask about, minted once
 * per connection and re-scored forever; a read that finds no person is a
 * skip, not a fallback. (Renown keeps its raw-id fallback: its subjects
 * come from acts between bodies.)
 */
function durableKey(stuffId: string): string | null {
  return StuffApi.findById(stuffId)?.getIdentityPath() ?? null;
}

/** Read a numeric AppSetting with a pre-boot/tests fallback. */
function settingNumber(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw ? Number(raw) : fallback;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/** The active-bucket width in MILLISECONDS (real time). Default 10 min. */
function bucketMs(): number {
  return settingNumber(AppSettingKeys.participationBucketSeconds, 600) * 1000;
}

/** The real-time bucket key a wall-clock instant lands in. */
function bucketOf(realAtMs: number): number {
  return Math.floor(realAtMs / bucketMs());
}

/** The real-time decay half-life in SECONDS. Default 14 days. */
function decayHalfLifeS(): number {
  return settingNumber(AppSettingKeys.participationDecayHalfLife, 1_209_600);
}

/** The band cutoffs from AppSettings, or the built-in fallback. */
function bandThresholds(): readonly BandThreshold[] {
  try {
    const raw = AppApi.setting(AppSettingKeys.influenceBandThresholds);
    if (!raw) return DEFAULT_BAND_THRESHOLDS;
    const parsed = JSON.parse(raw) as BandThreshold[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_BAND_THRESHOLDS;
  } catch {
    return DEFAULT_BAND_THRESHOLDS;
  }
}

/**
 * Append one raw active-bucket row — find-or-skip on `{subject, bucket}`
 * (the dedup that makes a bucket count once however many actions fall in
 * it). The value-function is NOT applied here; scoring happens only at
 * recompute. A module-private free function rather than an intra-singleton
 * self-call (which the gate would deny — caller would be `ConsumerLogic`,
 * not the `ConsumerApi` the gate allows).
 */
async function appendImpl(
  fields: ParticipationEventFields,
  creditedBucket: Map<string, number>,
): Promise<void> {
  if (!active()) return;
  const realAt = fields.realAt ?? Date.now();
  const bucket = bucketOf(realAt);
  // ⭐ The last bucket each subject was credited in (db-performance H1):
  // a burst of commands in one bucket reads the ledger once, not once a
  // command. Set only once the row is known to exist.
  if (creditedBucket.get(fields.subject) === bucket) return;
  const existing = await ParticipationEvent.find({
    subject: fields.subject,
    bucket,
  });
  if (existing.length > 0) {
    creditedBucket.set(fields.subject, bucket);
    return; // already credited this bucket
  }
  const ev = new ParticipationEvent();
  ev.subject = fields.subject;
  ev.bucket = bucket;
  ev.kind = fields.kind ?? 'command';
  ev.at = fields.at ?? WorldClockApi.getNow().rawValue();
  ev.realAt = realAt;
  await ev.save();
  creditedBucket.set(ev.subject, bucket);
  // AFTER the write, never before: a pass must not score a ledger that has
  // not been written yet.
  markDirty(ev.subject);
  SubscriptionApi.poke(SUBSCRIPTION_SOURCES.mql, null, { durableSubject: ev.subject });
}

/** Map a captured dispatch into a participation signal and append it. */
async function appendFromDispatch(
  p: CommandDispatchedPayload,
  creditedBucket: Map<string, number>,
): Promise<void> {
  // The live giver id keys storage on the person (D1); no person, no
  // signal (D3).
  const subject = durableKey(p.subjectId);
  if (subject === null) return;
  await appendImpl({
    subject,
    kind: 'command',
    at: p.at,
    realAt: p.realAt,
  }, creditedBucket);
}


/**
 * Score a subject's bucket rows: the recency-decayed count of active
 * buckets (decision 5 — linear in buckets; the `× renown` product and the
 * bands already dampen grind, so per-faucet saturation is deferred). Decay
 * is REAL-TIME — age is `(realNowMs − ev.realAt) / 1000` seconds.
 */
function scoreEvents(
  events: ParticipationEvent[],
  realNowMs: number,
  halfLifeS: number
): number {
  let total = 0;
  for (const ev of events) {
    total += Decay.byHalfLife(Math.max(0, (realNowMs - ev.realAt) / 1000), halfLifeS);
  }
  return total;
}

/**
 * ⭐ The pass (db-performance D4): re-score the subjects whose rows changed
 * since the last one — all of them on the first pass after a start, when
 * the value function changed, or when `full` is asked — and write their
 * standings in ONE `saveMany` (chunked), keyed on `{subject, scope}`, then
 * put each into the read index. **An idle world's pass makes no round
 * trip at all**: nothing changed, nothing is read, nothing written. Decay
 * between passes is the READ's (`participationOfImpl`), so a subject
 * nobody touches needs no pass for its standing to fall (D5). A pass that
 * fails puts its subjects back for the next.
 */
async function recomputeImpl(opts: { full?: boolean } = {}): Promise<void> {
  if (!active()) return;
  const fp = fingerprint();
  if (opts.full || fp !== lastFingerprint) dirty = null;
  const taken = dirty;
  dirty = new Set();
  if (taken !== null && taken.size === 0) return;
  try {
    const halfLifeS = decayHalfLifeS();
    const nowS = WorldClockApi.getNow().rawValue();
    const realNow = Date.now();

    const events =
      taken === null
        ? await ParticipationEvent.find({})
        : await ParticipationEvent.find({ subject: { $in: [...taken] } });
    const bySubject = new Map<string, ParticipationEvent[]>();
    for (const ev of events) {
      const list = bySubject.get(ev.subject);
      if (list) list.push(ev);
      else bySubject.set(ev.subject, [ev]);
    }

    const rows: ParticipationStanding[] = [];
    for (const [subject, list] of bySubject) {
      const row = new ParticipationStanding();
      row.subject = subject;
      row.scope = PARTICIPATION_WIDE;
      row.value = scoreEvents(list, realNow, halfLifeS);
      row.recomputedAt = nowS;
      row.recomputedRealAt = realNow;
      rows.push(row);
    }
    const writes = await Promise.all(rows.map((r) => r.toBatchWrite({ key: ['subject', 'scope'] })));
    for (let i = 0; i < writes.length; i += STANDING_WRITE_CHUNK) {
      await PersistApi.saveMany(
        ParticipationStanding.collectionName,
        writes.slice(i, i + STANDING_WRITE_CHUNK),
      );
    }
    for (const row of rows) row.remember();
    lastFingerprint = fp;
  } catch (err) {
    // Put the work back: a full pass stays owed; a dirty one re-marks.
    if (taken === null) dirty = null;
    else for (const sub of taken) markDirty(sub);
    throw err;
  }
}

/**
 * Sync read off the warmed standing index, decayed to NOW (D5): the stored
 * figure was computed at its row's instant, and one exponential carries
 * it forward — exactly what a pass at this instant would store, to
 * floating-point rounding. Neutral 0 for a missing subject; a point with
 * no instant reads flat.
 */
function participationOfImpl(subjectId: string): number {
  const p = ParticipationStanding.cached().get(
    ParticipationStanding.key(subjectId, PARTICIPATION_WIDE)
  );
  if (!p) return 0;
  if (p.at === undefined) return p.value;
  return p.value * Decay.byHalfLife(Math.max(0, (Date.now() - p.at) / 1000), decayHalfLifeS());
}

/**
 * The consumer-stock projection: `max(0, renownOf) × participationOf`,
 * banded. The `max(0, …)` clamp is **load-bearing** (register D5 — net
 * notoriety disenfranchises, never anti-enfranchises), not a tuning
 * choice. Both inputs are sync cached reads, so this is a pure
 * derive-on-read with no third stored source of truth.
 */
function standingOfImpl(subjectId: string): InfluenceStanding {
  const quality = Math.max(0, RenownApi.renownOf(subjectId));
  const quantity = participationOfImpl(subjectId);
  const scalar = quality * quantity;
  return new InfluenceStanding(
    subjectId,
    'consumer',
    scalar,
    Band.fromScalar(scalar, bandThresholds())
  );
}

/**
 * ConsumerLogic — the hot-reloadable logic singleton behind
 * {@link ConsumerApi}.
 *
 * Lives at `/platform/idea/api/consumer` (a stateless `Stuff` singleton, no backing
 * `Template`); `ConsumerApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the participation faucet (the
 * append-only bucket log + the rebuildable standing) AND the consumer
 * projection (`max(0, renownOf) × participationOf`); reads `RenownApi` as a
 * shared input, never owning renown.
 *
 * Capture taps `CommandDispatchedEvent` on the EventApi bus — but its
 * **receive side is locked to this consumer** via
 * `EventApi.restrictSubscribe` (the event fires on private commands too, so
 * an open-subscribe broadcast would be a snooping side-channel). The bus
 * still gives producer-ignorant decoupling; only `ConsumerLogic` may listen.
 *
 * Internal sub-logic lives in module-private free functions, so there are
 * no intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class ConsumerLogic extends ApiLogic {
  /**
   * ⭐ Subject → the last bucket it is known to have a row in
   * (db-performance H1): a burst of commands in one bucket reads the
   * ledger once. Instance state, so a hot reload or a fresh singleton
   * starts empty and pays one read a subject.
   */
  private creditedBucket = new Map<string, number>();

  /** The dispatch-capture subscription — retained so re-install is a no-op. */
  private dispatchSub: Subscription<CommandDispatchedPayload> | null = null;

  /** The recurring recompute handle — retained so re-install is a no-op. */
  private recomputeHandle: ScheduleHandle | null = null;
  /** The scheduled pass in flight, if any — a fire while it runs is skipped. */
  private recomputing: Promise<void> | null = null;

  /**
   * Install the command-dispatch → participation tap (idempotent). Locks the
   * event's receive side to the consumer+producer allowlist
   * (`restrictSubscribe`), then subscribes. Called at boot
   * (`ParticipationStandings.warm`, the manifest onCreate); a hot-reload re-asserts with the reloaded classes.
   */
  @CallSecurity(ConsumerBootCallers)
  public installDispatchTap(): void {
    if (this.dispatchSub) return;
    // Assert the FULL consumer+producer allowlist (not just ConsumerLogic):
    // `restrictSubscribe` clobbers the policy with the latest call's list and
    // its owner-guard refuses a subset, so a single-class re-assert (after
    // HMR, in any order) would silently evict the producer tap. Both taps
    // assert the same pair so every re-assert is the full set (HMR-safe).
    EventApi.restrictSubscribe(
      CommandDispatchedEvent.KIND,
      ConsumerLogic,
      ProducerLogic
    );
    // ⭐ A settling ship counts the acts of the people aboard her:
    // she listens only while she settles and counts only givers
    // standing in her own rooms. Re-asserted with her class once it is
    // loaded — a DYNAMIC import, because a static one pulls the ship's
    // module graph (her warren) in mid-evaluation of the warren base. Both
    // taps re-assert the same full set, so whichever lands last keeps it.
    void import('../Ship')
      .then(({ default: Ship }) =>
        EventApi.restrictSubscribe(CommandDispatchedEvent.KIND, ConsumerLogic, ProducerLogic, Ship),
      )
      .catch((err) => console.warn('the settling-ship subscriber was not allowed:', err));
    this.dispatchSub = EventApi.on<CommandDispatchedPayload>(
      CommandDispatchedEvent.KIND,
      (p) => {
        void appendFromDispatch(p, this.creditedBucket).catch((err) =>
          console.error('ConsumerLogic: participation append failed', err)
        );
      }
    );
  }

  /** See {@link ConsumerApi.append}. */
  @CallSecurity(ConsumerApiCallers)
  public async append(fields: ParticipationEventFields): Promise<void> {
    return appendImpl(fields, this.creditedBucket);
  }

  /**
   * Self-register the real-time recompute schedule (idempotent). Each fire
   * re-scores the subjects that changed (all of them on the first fire).
   * Cancellable via the retained `ScheduleHandle`.
   */
  @CallSecurity(ConsumerBootCallers)
  public installRecomputeSchedule(): void {
    if (this.recomputeHandle) return;
    this.recomputeHandle = ScheduleApi.recurring(CONSUMER_RECOMPUTE_MS, () => {
      // ⚠ One pass at a time. The scheduler does not wait on a promise, and
      // a pass is a round-trip per subject: on a slow link one ran past the
      // interval, the next started beside it, and the passes stacked until
      // they held the whole Mongo pool — every login queued behind them for
      // over five minutes (the ceramics drive, run 32). A fire that finds a
      // pass still running is skipped; the next one picks up its work.
      if (this.recomputing) return;
      this.recomputing = recomputeImpl()
        .catch((err) => console.error('ConsumerLogic: scheduled recompute failed', err))
        .finally(() => {
          this.recomputing = null;
        });
    });
  }

  /** See {@link ConsumerApi.recompute}. */
  @CallSecurity(ConsumerApiCallers)
  public async recompute(opts?: { full?: boolean }): Promise<void> {
    return recomputeImpl(opts);
  }

  /** See {@link ConsumerApi.participationOf}. */
  @CallSecurity(ConsumerApiCallers)
  public participationOf(subjectId: string): number {
    return participationOfImpl(subjectId);
  }

  /** See {@link ConsumerApi.standingOf}. */
  @CallSecurity(ConsumerApiCallers)
  public standingOf(subjectId: string): InfluenceStanding {
    return standingOfImpl(subjectId);
  }

  /** See {@link ConsumerApi.eventsFor}. */
  @CallSecurity(ConsumerApiCallers)
  public async eventsFor(subjectId: string): Promise<ParticipationEvent[]> {
    if (!active()) return [];
    return ParticipationEvent.find({ subject: subjectId });
  }
}
