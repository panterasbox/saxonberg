// ProducerLogic — the hot-reloadable logic singleton behind ProducerApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import ProducerEvent from '../../lib/standing/ProducerEvent';
import type { ProducerEventFields } from '../../lib/standing/ProducerEvent';
import ProducerStanding, {
  PRODUCER_WIDE,
} from '../../lib/standing/ProducerStanding';
import { Band, DEFAULT_BAND_THRESHOLDS } from '../../lib/standing/Band';
import type { BandThreshold } from '../../lib/standing/Band';
import { InfluenceStanding } from '../../lib/standing/InfluenceStanding';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { WorldClockApi } from '../../api/worldclock';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { PersistApi } from '../../api/persist';
import { EventApi } from '../../api/event';
import type { Subscription } from '../../api/event';
import { CommandDispatchedEvent } from '../../lib/events/CommandDispatchedEvent';
import type { CommandDispatchedPayload } from '../../lib/events/CommandDispatchedEvent';
import { CreditRouting } from '../../lib/standing/CreditRouting';
// Referenced only inside installEngagementTap (the restrictSubscribe
// allowlist), so the ConsumerLogic ↔ ProducerLogic import cycle is
// runtime-only / safe.
// eslint-disable-next-line no-restricted-imports -- sibling logic singletons in one subsystem; class identities feed EventApi.restrictSubscribe's subscriber allowlist (cycle-safe, see comment)
import { ConsumerLogic } from './ConsumerLogic';

const ProducerApiCallers = SecurityPolicies.FromModule(
  'mud/api/producer#ProducerApi'
);

/**
 * Recompute cadence — a code constant (cadence is *mechanism*, not a
 * legislated value; mirrors the consumer / renown decision). Cache refresh
 * rides real-time `ScheduleApi`; the decay math inside also uses real time
 * (production standing measures *current* draw — the participation
 * divergence, not renown's game-time decay).
 */
const PRODUCER_RECOMPUTE_MS = 60_000;

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
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

/** The attributed-engagement bucket width in MILLISECONDS. Default 10 min. */
function bucketMs(): number {
  return settingNumber(AppSettingKeys.producerBucketSeconds, 600) * 1000;
}

/** The real-time bucket key a wall-clock instant lands in. */
function bucketOf(realAtMs: number): number {
  return Math.floor(realAtMs / bucketMs());
}

/** The real-time decay half-life in SECONDS. Default 14 days. */
function decayHalfLifeS(): number {
  return settingNumber(AppSettingKeys.producerDecayHalfLife, 1_209_600);
}

/** The band cutoffs from AppSettings (stock-agnostic), or the fallback. */
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
 * Append one raw attributed-engagement row — find-or-skip on `{author,
 * actor, bucket}` (the dedup: one player engaging one author's content
 * credits the author once per coarse bucket — anti-inflation). The
 * value-function is NOT applied here; scoring happens only at recompute. A
 * module-private free function (no intra-singleton self-call to trip the
 * gate).
 */
async function appendImpl(fields: ProducerEventFields): Promise<void> {
  if (!active()) return;
  const realAt = fields.realAt ?? Date.now();
  const bucket = bucketOf(realAt);
  const existing = await ProducerEvent.find({
    author: fields.author,
    actor: fields.actor,
    bucket,
  });
  if (existing.length > 0) return; // already credited this author for this actor-bucket
  const ev = new ProducerEvent();
  ev.author = fields.author;
  ev.actor = fields.actor;
  ev.zonePath = fields.zonePath ?? '';
  ev.weight = fields.weight ?? 1;
  ev.bucket = bucket;
  ev.kind = fields.kind ?? 'engagement';
  ev.at = fields.at ?? WorldClockApi.getNow().rawValue();
  ev.realAt = realAt;
  await ev.save();
}

/**
 * Map a captured dispatch into producer credit and append it. Resolves the
 * credit shares for the engaged location (`CreditRouting.resolve` — covering
 * zone author, released-content gated), then for each share credits the
 * author UNLESS it is the engaging player (`author !== actor` — the **A≠P**
 * exclusion: engaging your own released content earns you nothing). The
 * `{author, actor, bucket}` dedup lives in {@link appendImpl}. Skipped when
 * the signal carries no location / actor templatePath (an incorporeal or
 * un-templated giver).
 */
async function appendFromEngagement(p: CommandDispatchedPayload): Promise<void> {
  if (!active()) return;
  const location = p.locationTemplatePath;
  const actor = p.actorTemplatePath;
  if (!location || !actor) return;
  const shares = await CreditRouting.resolve(location);
  for (const share of shares) {
    if (share.author === actor) continue; // A≠P self-credit exclusion
    await appendImpl({
      author: share.author,
      actor,
      zonePath: location,
      weight: share.weight,
      at: p.at,
      realAt: p.realAt,
    });
  }
}

/** Half-life decay 0.5^(age/halfLife); 1 for a non-positive / ∞ half-life. */
function decayWeight(ageS: number, halfLife: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0 || ageS <= 0) return 1;
  return Math.pow(0.5, ageS / halfLife);
}

/**
 * Score an author's attributed-engagement rows: the recency-decayed,
 * weight-scaled count of attributed buckets. **Engagement-only** — no
 * `× regard`, no `RenownApi` read (the deliberate divergence from the
 * consumer projection; an author earns from *draw*, not from being liked).
 * Decay is REAL-TIME — age is `(realNowMs − ev.realAt) / 1000` seconds.
 */
function scoreEvents(
  events: ProducerEvent[],
  realNowMs: number,
  halfLifeS: number
): number {
  let total = 0;
  for (const ev of events) {
    total +=
      ev.weight *
      decayWeight(Math.max(0, (realNowMs - ev.realAt) / 1000), halfLifeS);
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
  const [existing] = await ProducerStanding.find({
    subject,
    scope: PRODUCER_WIDE,
  });
  const row = existing ?? new ProducerStanding();
  row.subject = subject;
  row.scope = PRODUCER_WIDE;
  row.value = value;
  row.recomputedAt = nowS;
  row.recomputedRealAt = realNow;
  await row.save();
}

/**
 * The batch recompute: re-score every author's production from the raw
 * attributed-engagement log into the materialized aggregate. Reads ONLY the
 * producer log + AppSettings. Cooperative-wide only — no scope partition.
 * Groups by `author` (the routing key).
 */
async function recomputeImpl(): Promise<void> {
  if (!active()) return;
  const halfLifeS = decayHalfLifeS();
  const nowS = WorldClockApi.getNow().rawValue();
  const realNow = Date.now();

  const all = await ProducerEvent.find({});
  const byAuthor = new Map<string, ProducerEvent[]>();
  for (const ev of all) {
    const list = byAuthor.get(ev.author);
    if (list) list.push(ev);
    else byAuthor.set(ev.author, [ev]);
  }

  for (const [author, events] of byAuthor) {
    await upsertStanding(
      author,
      scoreEvents(events, realNow, halfLifeS),
      nowS,
      realNow
    );
  }

  // Refresh the read cache from the rebuilt rows.
  await ProducerStanding.warm();
}

/** Sync read off the warmed standing cache; neutral 0 for a missing author. */
function producerOfImpl(authorId: string): number {
  return (
    ProducerStanding.cached().get(
      ProducerStanding.key(authorId, PRODUCER_WIDE)
    ) ?? 0
  );
}

/**
 * The producer-stock projection: the decayed attributed-engagement scalar,
 * banded, tagged `'producer'`. No second input — engagement-only (decision:
 * production is measured by draw, not multiplied by quality). Pure
 * derive-on-read off the warmed cache.
 */
function standingOfImpl(authorId: string): InfluenceStanding {
  const scalar = producerOfImpl(authorId);
  return new InfluenceStanding(
    authorId,
    'producer',
    scalar,
    Band.fromScalar(scalar, bandThresholds())
  );
}

/**
 * ProducerLogic — the hot-reloadable logic singleton behind
 * {@link ProducerApi}.
 *
 * Lives at `/obj/api/producer` (a stateless `Stuff` singleton, no backing
 * `Template`); `ProducerApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the producer faucet (the append-only
 * attributed-engagement log + the rebuildable standing) AND the producer
 * projection (engagement-only — no renown read).
 *
 * The live-engagement tap (`appendFromEngagement` on `CommandDispatchedEvent`)
 * reuses the consumer's recognized-dispatch signal, routing producer credit
 * from its location/actor templatePaths via `CreditRouting`. Its receive side
 * is locked to the shared consumer+producer `restrictSubscribe` allowlist
 * (both taps assert the same pair so an HMR re-assert never evicts the other).
 *
 * Internal sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class ProducerLogic extends Idea {
  /** The recurring recompute handle — retained so re-install is a no-op. */
  private recomputeHandle: ScheduleHandle | null = null;

  /** The engagement-capture subscription — retained so re-install is a no-op. */
  private engagementSub: Subscription<CommandDispatchedPayload> | null = null;

  /**
   * Install the command-dispatch → producer tap (idempotent). Reuses the
   * consumer's `CommandDispatchedEvent` signal — the same recognized,
   * interactive dispatch — and routes producer credit from its
   * location/actor templatePaths. Asserts the FULL consumer+producer
   * allowlist (both taps assert the same pair so an HMR re-assert never
   * evicts the other — see `ConsumerLogic.installDispatchTap`). Called at
   * boot (`ProducerApi.boot`).
   */
  @CallSecurity(ProducerApiCallers)
  public installEngagementTap(): void {
    if (this.engagementSub) return;
    EventApi.restrictSubscribe(
      CommandDispatchedEvent.KIND,
      ConsumerLogic,
      ProducerLogic
    );
    this.engagementSub = EventApi.on<CommandDispatchedPayload>(
      CommandDispatchedEvent.KIND,
      (p) => {
        void appendFromEngagement(p).catch((err) =>
          console.error('ProducerLogic: engagement append failed', err)
        );
      }
    );
  }

  /** See {@link ProducerApi.append}. */
  @CallSecurity(ProducerApiCallers)
  public async append(fields: ProducerEventFields): Promise<void> {
    return appendImpl(fields);
  }

  /**
   * Self-register the real-time recompute schedule (idempotent). Each fire
   * re-scores all standings off the log. Cancellable via the retained
   * `ScheduleHandle`.
   */
  @CallSecurity(ProducerApiCallers)
  public installRecomputeSchedule(): void {
    if (this.recomputeHandle) return;
    this.recomputeHandle = ScheduleApi.recurring(PRODUCER_RECOMPUTE_MS, () => {
      void recomputeImpl().catch((err) =>
        console.error('ProducerLogic: scheduled recompute failed', err)
      );
    });
  }

  /** See {@link ProducerApi.recompute}. */
  @CallSecurity(ProducerApiCallers)
  public async recompute(): Promise<void> {
    return recomputeImpl();
  }

  /** See {@link ProducerApi.producerOf}. */
  @CallSecurity(ProducerApiCallers)
  public producerOf(authorId: string): number {
    return producerOfImpl(authorId);
  }

  /** See {@link ProducerApi.standingOf}. */
  @CallSecurity(ProducerApiCallers)
  public standingOf(authorId: string): InfluenceStanding {
    return standingOfImpl(authorId);
  }

  /** See {@link ProducerApi.eventsFor}. */
  @CallSecurity(ProducerApiCallers)
  public async eventsFor(authorId: string): Promise<ProducerEvent[]> {
    if (!active()) return [];
    return ProducerEvent.find({ author: authorId });
  }
}
