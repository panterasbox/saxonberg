// ConsumerLogic — the hot-reloadable logic singleton behind ConsumerApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import ParticipationEvent from '../../lib/standing/ParticipationEvent';
import type { ParticipationEventFields } from '../../lib/standing/ParticipationEvent';
import ParticipationStanding, {
  PARTICIPATION_WIDE,
} from '../../lib/standing/ParticipationStanding';
import {
  Band,
  DEFAULT_BAND_THRESHOLDS,
} from '../../lib/standing/Band';
import type { BandThreshold } from '../../lib/standing/Band';
import { InfluenceStanding } from '../../lib/standing/InfluenceStanding';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { WorldClockApi } from '../../api/worldclock';
import { RenownApi } from '../../api/renown';
import { EventApi } from '../../api/event';
import type { Subscription } from '../../api/event';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { PersistApi } from '../../api/persist';
import { StuffApi } from '../../api/stuff';
import { CommandDispatchedEvent } from '../../lib/events/CommandDispatchedEvent';
import type { CommandDispatchedPayload } from '../../lib/events/CommandDispatchedEvent';
// Referenced only inside installDispatchTap (the restrictSubscribe allowlist),
// so the ConsumerLogic ↔ ProducerLogic import cycle is runtime-only / safe.
// eslint-disable-next-line no-restricted-imports -- sibling logic singletons in one subsystem; class identities feed EventApi.restrictSubscribe's subscriber allowlist (cycle-safe, see comment)
import { ProducerLogic } from './ProducerLogic';
import { ParticipationAppendedEvent } from '../../lib/events/StandingAppendedEvents';

const ConsumerApiCallers = SecurityPolicies.FromModule('/api/consumer#ConsumerApi'
);

/**
 * Recompute cadence — a code constant (cadence is *mechanism*, not a
 * legislated value; mirrors renown decision 3). Cache refresh rides
 * real-time `ScheduleApi`; the decay math inside also uses real time (the
 * participation divergence — it measures a human showing up).
 */
const CONSUMER_RECOMPUTE_MS = 60_000;

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/**
 * Resolve a live `stuffId` to its **durable** identity key — the
 * `templatePath` participation banks on (`/obj/Avatar/<playerId>` for an
 * avatar). The giver's `stuffId` is re-minted on re-clone (reboot / relog),
 * so keying the bucket log on it silently resets standing; the durable
 * templatePath is the same key renown re-keys to, so the consumer product
 * (`renownOf × participationOf`) stays aligned. Falls back to the raw id
 * when no template stamp resolves — never drops a signal. (Mirrors
 * `RenownLogic.durableKey`; the substrate shares no code.)
 */
function durableKey(stuffId: string): string {
  return StuffApi.findById(stuffId)?.getTemplatePath() ?? stuffId;
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
async function appendImpl(fields: ParticipationEventFields): Promise<void> {
  if (!active()) return;
  const realAt = fields.realAt ?? Date.now();
  const bucket = bucketOf(realAt);
  const existing = await ParticipationEvent.find({
    subject: fields.subject,
    bucket,
  });
  if (existing.length > 0) return; // already credited this bucket
  const ev = new ParticipationEvent();
  ev.subject = fields.subject;
  ev.bucket = bucket;
  ev.kind = fields.kind ?? 'command';
  ev.at = fields.at ?? WorldClockApi.getNow().rawValue();
  ev.realAt = realAt;
  await ev.save();
  // AFTER the write — see StandingAppendedEvents.
  EventApi.fire(
    new ParticipationAppendedEvent({
      subject: ev.subject,
      kind: ev.kind,
      bucket: ev.bucket,
    })
  );
}

/** Map a captured dispatch into a participation signal and append it. */
async function appendFromDispatch(p: CommandDispatchedPayload): Promise<void> {
  await appendImpl({
    // The live giver id keys storage on the durable templatePath (Phase 0).
    subject: durableKey(p.subjectId),
    kind: 'command',
    at: p.at,
    realAt: p.realAt,
  });
}

/** Half-life decay 0.5^(age/halfLife); 1 for a non-positive / ∞ half-life. */
function decayWeight(ageS: number, halfLife: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0 || ageS <= 0) return 1;
  return Math.pow(0.5, ageS / halfLife);
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
    total += decayWeight(Math.max(0, (realNowMs - ev.realAt) / 1000), halfLifeS);
  }
  return total;
}

/** Upsert the materialized standing row (find-or-insert by {subject, '*'}). */
async function upsertStanding(
  subject: string,
  value: number,
  nowS: number,
  realNow: number
): Promise<void> {
  const [existing] = await ParticipationStanding.find({
    subject,
    scope: PARTICIPATION_WIDE,
  });
  const row = existing ?? new ParticipationStanding();
  row.subject = subject;
  row.scope = PARTICIPATION_WIDE;
  row.value = value;
  row.recomputedAt = nowS;
  row.recomputedRealAt = realNow;
  await row.save();
}

/**
 * The batch recompute: re-score every subject's participation from the raw
 * bucket log into the materialized aggregate. Reads ONLY the participation
 * log + AppSettings. Compact-wide only — no scope partition.
 */
async function recomputeImpl(): Promise<void> {
  if (!active()) return;
  const halfLifeS = decayHalfLifeS();
  const nowS = WorldClockApi.getNow().rawValue();
  const realNow = Date.now();

  const all = await ParticipationEvent.find({});
  const bySubject = new Map<string, ParticipationEvent[]>();
  for (const ev of all) {
    const list = bySubject.get(ev.subject);
    if (list) list.push(ev);
    else bySubject.set(ev.subject, [ev]);
  }

  for (const [subject, events] of bySubject) {
    await upsertStanding(
      subject,
      scoreEvents(events, realNow, halfLifeS),
      nowS,
      realNow
    );
  }

  // Refresh the read cache from the rebuilt rows.
  await ParticipationStanding.warm();
}

/** Sync read off the warmed standing cache; neutral 0 for a missing subject. */
function participationOfImpl(subjectId: string): number {
  return (
    ParticipationStanding.cached().get(
      ParticipationStanding.key(subjectId, PARTICIPATION_WIDE)
    ) ?? 0
  );
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
 * Lives at `/obj/api/consumer` (a stateless `Stuff` singleton, no backing
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
  /** The dispatch-capture subscription — retained so re-install is a no-op. */
  private dispatchSub: Subscription<CommandDispatchedPayload> | null = null;

  /** The recurring recompute handle — retained so re-install is a no-op. */
  private recomputeHandle: ScheduleHandle | null = null;

  /**
   * Install the command-dispatch → participation tap (idempotent). Locks the
   * event's receive side to the consumer+producer allowlist
   * (`restrictSubscribe`), then subscribes. Called at boot
   * (`ConsumerApi.boot`); a hot-reload re-asserts with the reloaded classes.
   */
  @CallSecurity(ConsumerApiCallers)
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
    this.dispatchSub = EventApi.on<CommandDispatchedPayload>(
      CommandDispatchedEvent.KIND,
      (p) => {
        void appendFromDispatch(p).catch((err) =>
          console.error('ConsumerLogic: participation append failed', err)
        );
      }
    );
  }

  /** See {@link ConsumerApi.append}. */
  @CallSecurity(ConsumerApiCallers)
  public async append(fields: ParticipationEventFields): Promise<void> {
    return appendImpl(fields);
  }

  /**
   * Self-register the real-time recompute schedule (idempotent). Each fire
   * re-scores all standings off the log. Cancellable via the retained
   * `ScheduleHandle`.
   */
  @CallSecurity(ConsumerApiCallers)
  public installRecomputeSchedule(): void {
    if (this.recomputeHandle) return;
    this.recomputeHandle = ScheduleApi.recurring(CONSUMER_RECOMPUTE_MS, () => {
      void recomputeImpl().catch((err) =>
        console.error('ConsumerLogic: scheduled recompute failed', err)
      );
    });
  }

  /** See {@link ConsumerApi.recompute}. */
  @CallSecurity(ConsumerApiCallers)
  public async recompute(): Promise<void> {
    return recomputeImpl();
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
