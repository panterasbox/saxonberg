// ProducerLogic — the hot-reloadable logic singleton behind ProducerApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import ProducerEvent from '../../../lib/standing/ProducerEvent';
import type { ProducerEventFields } from '../../../lib/standing/ProducerEvent';
import ProducerStanding, {
  PRODUCER_WIDE,
} from '../../../lib/standing/ProducerStanding';
import { Band, DEFAULT_BAND_THRESHOLDS } from '../../../lib/standing/Band';
import type { BandThreshold } from '../../../lib/standing/Band';
import { InfluenceStanding } from '../../../lib/standing/InfluenceStanding';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { ScheduleApi } from '../../../api/schedule';
import type { ScheduleHandle } from '../../../api/schedule';
import { PersistApi } from '../../../api/persist';
import { EventApi } from '../../../api/event';
import type { Subscription } from '../../../api/event';
import { CommandDispatchedEvent } from '../../../lib/events/CommandDispatchedEvent';
import type { CommandDispatchedPayload } from '../../../lib/events/CommandDispatchedEvent';
import { CreditRouting } from '../../../lib/standing/CreditRouting';
// Referenced only inside installEngagementTap (the restrictSubscribe
// allowlist), so the ConsumerLogic ↔ ProducerLogic import cycle is
// runtime-only / safe.
// eslint-disable-next-line no-restricted-imports -- sibling logic singletons in one subsystem; class identities feed EventApi.restrictSubscribe's subscriber allowlist (cycle-safe, see comment)
import { ConsumerLogic } from './ConsumerLogic';
import { SubscriptionApi } from '../../../api/subscription';
import { Decay } from '../../../lib/Decay';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';

const ProducerApiCallers = SecurityPolicies.FromModule('/api/producer#ProducerApi'
);

/**
 * The install/warm seam is also callable by the self-warming
 * `ProducerStandings` singleton (the boot()-retirement shape): the tap +
 * schedule state stays HERE (hot-reload re-assertion), the manifest
 * home arms it at onCreate.
 */
const ProducerBootCallers = SecurityPolicies.AnyOf(
  ProducerApiCallers,
  SecurityPolicies.FromTemplate('/platform/idea/ProducerStandings'),
);

/**
 * Recompute cadence — a code constant (cadence is *mechanism*, not a
 * legislated value; mirrors the consumer / renown decision). Cache refresh
 * rides real-time `ScheduleApi`; the decay math inside also uses real time
 * (production standing measures *current* draw — the participation
 * divergence, not renown's game-time decay).
 */
const PRODUCER_RECOMPUTE_MS = 60_000;

/**
 * ⭐ The authors whose ledger rows changed since the last pass
 * (db-performance D4) — `null` = everything, what a fresh module holds, so
 * the first pass after a start or a hot reload is full. Marked after each
 * write; taken by a pass before its first await.
 */
let dirty: Set<string> | null = null;
/** What the last pass scored with (D6): a change forces a full pass. */
let lastFingerprint: string | null = null;
/** Rows per `saveMany`. */
const STANDING_WRITE_CHUNK = 500;

/** Mark `author` for the next pass (a no-op while a full pass is owed). */
function markDirty(author: string): void {
  dirty?.add(author);
}

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

/** What scoring reads from settings — the producer figure is one decay of weights. */
function fingerprint(): string {
  return String(decayHalfLifeS());
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
  // AFTER the write, never before. The AUTHOR is the subject whose
  // standing moved; the actor merely generated the engagement.
  markDirty(ev.author);
  SubscriptionApi.poke(SUBSCRIPTION_SOURCES.mql, null, { durableSubject: ev.author });
}

/**
 * Map a captured dispatch into producer credit and append it. Resolves the
 * credit shares for the engaged location (`CreditRouting.resolve` — covering
 * zone author, released-content gated), then for each share credits the
 * author UNLESS it is the engaging player (`author !== actor` — the **A≠P**
 * exclusion: engaging your own released content earns you nothing). The
 * `{author, actor, bucket}` dedup lives in {@link appendImpl}. Skipped when
 * the signal carries no location templatePath or actor identity (an
 * incorporeal giver, or one with no identity).
 */
async function appendFromEngagement(p: CommandDispatchedPayload): Promise<void> {
  if (!active()) return;
  const location = p.locationTemplatePath;
  const actor = p.actorIdentityPath;
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
      Decay.byHalfLife(Math.max(0, (realNowMs - ev.realAt) / 1000), halfLifeS);
  }
  return total;
}

/**
 * ⭐ The pass (db-performance D4): re-score the authors whose rows changed
 * since the last one (all of them on the first pass after a start, on a
 * changed value function, or when `full` is asked), write their standings
 * in ONE chunked `saveMany` keyed on `{subject, scope}`, and put each into
 * the read index. An idle world's pass makes no round trip; decay between
 * passes is the read's (D5). A failed pass puts its authors back.
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
        ? await ProducerEvent.find({})
        : await ProducerEvent.find({ author: { $in: [...taken] } });
    const byAuthor = new Map<string, ProducerEvent[]>();
    for (const ev of events) {
      const list = byAuthor.get(ev.author);
      if (list) list.push(ev);
      else byAuthor.set(ev.author, [ev]);
    }

    const rows: ProducerStanding[] = [];
    for (const [author, list] of byAuthor) {
      const row = new ProducerStanding();
      row.subject = author;
      row.scope = PRODUCER_WIDE;
      row.value = scoreEvents(list, realNow, halfLifeS);
      row.recomputedAt = nowS;
      row.recomputedRealAt = realNow;
      rows.push(row);
    }
    const writes = await Promise.all(rows.map((r) => r.toBatchWrite({ key: ['subject', 'scope'] })));
    for (let i = 0; i < writes.length; i += STANDING_WRITE_CHUNK) {
      await PersistApi.saveMany(ProducerStanding.collectionName, writes.slice(i, i + STANDING_WRITE_CHUNK));
    }
    for (const row of rows) row.remember();
    lastFingerprint = fp;
  } catch (err) {
    if (taken === null) dirty = null;
    else for (const a of taken) markDirty(a);
    throw err;
  }
}

/**
 * Sync read off the warmed standing index, decayed to NOW (D5) — what a
 * pass at this instant would store, to rounding. Neutral 0 for a missing
 * author; a point with no instant reads flat.
 */
function producerOfImpl(authorId: string): number {
  const p = ProducerStanding.cached().get(ProducerStanding.key(authorId, PRODUCER_WIDE));
  if (!p) return 0;
  if (p.at === undefined) return p.value;
  return p.value * Decay.byHalfLife(Math.max(0, (Date.now() - p.at) / 1000), decayHalfLifeS());
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
 * The account roll-up: **sum** the members' scalars, band the sum.
 *
 * ⭐ **Why sum, and not best or mean.** The account is the subject, so
 * how a person distributes their work across bodies must not change
 * their figure — and sum is the only combinator with that property.
 * Max and mean both *penalise* minting a second character, which would
 * make the level claim incoherent: a figure that moves when you create
 * a body is not measuring the account. Sum is also neutral against
 * splitting, so there is nothing to gain and nothing to lose by
 * spreading authorship, which is the anti-gaming property worth having.
 *
 * The scalars are already recency-decayed rates and a sum of rates is a
 * rate, so this stays consistent with *standing is a rate, not a total*.
 * Double-counting is impossible by construction: appends dedupe on
 * `{author, actor, bucket}` and each character is a distinct `author`,
 * so two of one account's characters credit separately because they are
 * separate content.
 *
 * ⚠ Banded with {@link bandThresholds}, the CONFIGURED cutoffs — never
 * `Band.fromScalar(total)` with no argument, which silently uses
 * `DEFAULT_BAND_THRESHOLDS` while every real producer band uses the
 * AppSettings ones. That mismatch is one of the three defects recorded
 * against the previous attempt at this roll-up.
 */
function standingForAccountImpl(
  subject: string,
  members: readonly string[]
): InfluenceStanding {
  let total = 0;
  for (const m of members) total += producerOfImpl(m);
  return new InfluenceStanding(
    subject,
    'producer',
    total,
    Band.fromScalar(total, bandThresholds())
  );
}

/**
 * ProducerLogic — the hot-reloadable logic singleton behind
 * {@link ProducerApi}.
 *
 * Lives at `/platform/idea/api/producer` (a stateless `Stuff` singleton, no backing
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
export class ProducerLogic extends ApiLogic {
  /** The recurring recompute handle — retained so re-install is a no-op. */
  private recomputeHandle: ScheduleHandle | null = null;
  /** The scheduled pass in flight, if any — a fire while it runs is skipped. */
  private recomputing: Promise<void> | null = null;

  /** The engagement-capture subscription — retained so re-install is a no-op. */
  private engagementSub: Subscription<CommandDispatchedPayload> | null = null;

  /**
   * Install the command-dispatch → producer tap (idempotent). Reuses the
   * consumer's `CommandDispatchedEvent` signal — the same recognized,
   * interactive dispatch — and routes producer credit from its
   * location/actor templatePaths. Asserts the FULL consumer+producer
   * allowlist (both taps assert the same pair so an HMR re-assert never
   * evicts the other — see `ConsumerLogic.installDispatchTap`). Called at
   * the manifest warm (`ProducerStandings.warm`).
   */
  @CallSecurity(ProducerBootCallers)
  public installEngagementTap(): void {
    if (this.engagementSub) return;
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
  @CallSecurity(ProducerBootCallers)
  public installRecomputeSchedule(): void {
    if (this.recomputeHandle) return;
    this.recomputeHandle = ScheduleApi.recurring(PRODUCER_RECOMPUTE_MS, () => {
      // ⚠ One pass at a time. The scheduler does not wait on a promise, and
      // a pass is a round-trip per subject: on a slow link one ran past the
      // interval, the next started beside it, and the passes stacked until
      // they held the whole Mongo pool — every login queued behind them for
      // over five minutes (the ceramics drive, run 32). A fire that finds a
      // pass still running is skipped; the next one picks up its work.
      if (this.recomputing) return;
      this.recomputing = recomputeImpl()
        .catch((err) => console.error('ProducerLogic: scheduled recompute failed', err))
        .finally(() => {
          this.recomputing = null;
        });
    });
  }

  /** See {@link ProducerApi.recompute}. */
  @CallSecurity(ProducerApiCallers)
  public async recompute(opts?: { full?: boolean }): Promise<void> {
    return recomputeImpl(opts);
  }

  /** See {@link ProducerApi.producerOf}. */
  @CallSecurity(ProducerApiCallers)
  public producerOf(authorId: string): number {
    return producerOfImpl(authorId);
  }

  /** See {@link ProducerApi.standingForAccount}. */
  @CallSecurity(ProducerApiCallers)
  public standingForAccount(
    subject: string,
    members: readonly string[]
  ): InfluenceStanding {
    return standingForAccountImpl(subject, members);
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
