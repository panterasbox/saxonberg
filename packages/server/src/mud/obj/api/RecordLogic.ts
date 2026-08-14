// RecordLogic — the hot-reloadable logic singleton behind RecordApi.
// (Doc comment on the class so @internal lands on the reflection.)

import type {
  MessageFrame,
  RecallHit,
  RecallScope,
  StoredFrameRecord,
} from '@saxonberg/types';
import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Collections } from '../../lib/persistence/Collections';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { AppApi } from '../../api/app';
import { PersistApi } from '../../api/persist';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { Mml } from '../../api/mml';

const RecordApiCallers = SecurityPolicies.FromModule('/api/record#RecordApi');

/* ─── configuration, all overridable through AppSettings ─── */

/**
 * How many frames the store keeps per player.
 *
 * ⚠ A **window**, not a quota — the oldest go, silently and by design.
 * The mailbox model clips get (never expires, you delete to make room)
 * is the wrong shape here: a clip is evidence in a dispute that can take
 * weeks; a frame is your scrollback, whose value decays fast and whose
 * volume does not.
 */
const DEFAULT_WINDOW = 2000;

/** How often the buffered writer drains. See {@link RecordLogic.record}. */
const DEFAULT_FLUSH_MS = 1000;

/** Hits per scope in one `recall`. */
const DEFAULT_RECALL_LIMIT = 20;

/**
 * How many inserts one owner may accumulate before the window is
 * re-trimmed.
 *
 * ⭐ Eviction is deliberately **lazy**. Trimming on every flush would
 * cost two indexed operations per active player per second to delete, on
 * average, one row. Letting the store run up to `window + slack` and
 * trimming in one range delete costs the same two operations per 64
 * frames. The store's contract is *bounded*, not *exact*.
 */
const EVICT_SLACK = 64;

function readInt(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback; // AppSettings not warmed (pre-boot / tests)
  }
}

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function connected(): boolean {
  return PersistApi.isConnected();
}

/**
 * The stored row. `StoredFrameRecord` is the wire projection; this adds
 * the owner key that the whole confidentiality story rests on.
 */
interface StoredFrameRow extends StoredFrameRecord {
  owner: string;
}

/** Rows out of Mongo, narrowed to the wire shape. */
function toRecord(raw: Record<string, unknown>): StoredFrameRecord {
  return {
    id: String(raw.id ?? ''),
    topic: String(raw.topic ?? ''),
    body: String(raw.body ?? ''),
    ...(Array.isArray(raw.tags) ? { tags: raw.tags as string[] } : {}),
    at: Number(raw.at ?? 0),
    seq: Number(raw.seq ?? 0),
  };
}

/**
 * A plain-text excerpt around the first matched term.
 *
 * `recall` output is **quoted**, not re-rendered: an excerpt is
 * evidence of a match, and pasting live MML from an arbitrary corpus
 * into a new frame would let a stored body's markup act in a context
 * that never composed it.
 */
function excerpt(body: string, terms: readonly string[]): string {
  const flat = Mml.flatten(body).replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return flat.slice(0, 160);
  const start = Math.max(0, at - 60);
  const end = Math.min(flat.length, at + 100);
  return (
    (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '')
  );
}

/** Split a raw search string into terms; empty input yields no terms. */
function terms(search: string): string[] {
  return search
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * The corpus-agnostic fallback matcher.
 *
 * ⚠ Mongo `$text` is the fast path and the reason the indexes exist,
 * but it is **stemmed and language-aware**, which means it misses the
 * substring searches players actually type (`recall thermo`). Every
 * scope therefore runs `$text` first and falls back to a bounded
 * case-insensitive scan when it returns nothing. That is not a second
 * search engine — it is the same query with the index turned off, and
 * D5's "no relevance tuning" still holds.
 */
function looseMatch(
  row: Record<string, unknown>,
  fields: readonly string[],
  want: readonly string[],
): boolean {
  const hay = fields
    .map((f) => String(row[f] ?? ''))
    .join(' ')
    .toLowerCase();
  return want.every((t) => hay.includes(t.toLowerCase()));
}

/**
 * RecordLogic — the hot-reloadable logic singleton behind
 * {@link RecordApi}.
 *
 * Lives at `/obj/api/record` (a `Stuff` singleton with no backing
 * `Template`); `RecordApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the `player_frames` collection, the
 * `recall` reads over it and its two neighbours, and the nightly reset.
 *
 * ## The buffered writer
 *
 * ⚠⚠ **The frame-store write is the highest-volume write in the system
 * and must never sit on the render hot path.** `record` is therefore
 * synchronous, allocation-cheap, and does no I/O: it stamps a sequence
 * number and pushes onto an in-memory buffer. A recurring drain
 * (`record.frames.flushMs`, default 1s) does the Mongo work, one
 * `save` per row and one range delete per owner that has drifted past
 * the window.
 *
 * The cost of that choice, stated rather than hidden: up to one flush
 * interval of frames is lost if the process dies. That is the correct
 * trade for scrollback — the alternative is an awaited write inside
 * every message fan-out.
 *
 * ## The sequence number
 *
 * `seq` is monotonic **per owner** and derived from the wall clock
 * (`max(now, last + 1)`), so a fresh process starts above anything a
 * previous one wrote without reading the store first. Ordering is never
 * by `at`: a scene fans several frames in the same millisecond, and a
 * timestamp sort would shuffle them.
 *
 * @internal
 */
@Unshadowable
export class RecordLogic extends ApiLogic {
  /** Pending rows, oldest first. Drained by {@link flush}. */
  private buffer: StoredFrameRow[] = [];

  /** Last sequence number handed out, per owner. */
  private lastSeq: Map<string, number> = new Map();

  /** Inserts since this owner's window was last trimmed. */
  private sinceEvict: Map<string, number> = new Map();

  /** The drain timer; installed on first `record`, never before. */
  private writer: ScheduleHandle | null = null;

  /* ─── write ─── */

  /**
   * See {@link RecordApi.record}. Synchronous and I/O-free by contract.
   */
  @CallSecurity(RecordApiCallers)
  public record(owner: string, frame: MessageFrame): void {
    if (!owner) return;
    if (!connected()) return;
    const now = Date.now();
    const prev = this.lastSeq.get(owner) ?? 0;
    const seq = now > prev ? now : prev + 1;
    this.lastSeq.set(owner, seq);
    this.buffer.push({
      owner,
      id: frame.id,
      topic: frame.topic,
      body: frame.body,
      ...(frame.tags && frame.tags.length ? { tags: [...frame.tags] } : {}),
      at: frame.meta?.timestamp ?? now,
      seq,
    });
    this.startWriter();
  }

  /**
   * See {@link RecordApi.flush}. Drains the buffer and trims any owner
   * that has drifted past the window. Safe to call concurrently — the
   * buffer is swapped out before the first await.
   */
  @CallSecurity(RecordApiCallers)
  public async flush(): Promise<void> {
    await this.drain();
  }

  /**
   * The drain itself.
   *
   * ⚠ Private and undecorated **on purpose**: the recurring writer fires
   * it from a `runRoot` frame whose caller is `null`, which no
   * `FromModule` policy admits. Splitting the gated face from the
   * internal body is the same shape `DiagnosticLogic` records — an
   * intra-singleton call must not have to satisfy the external gate.
   */
  private async drain(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    if (!connected()) return;

    const touched = new Set<string>();
    for (const row of batch) {
      touched.add(row.owner);
      try {
        await PersistApi.save(
          Collections.PlayerFrames,
          row as unknown as Record<string, unknown>,
        );
      } catch (err) {
        console.warn('[record] frame write failed', err);
      }
    }

    const window = readInt(AppSettingKeys.recordFrameWindow, DEFAULT_WINDOW);
    for (const owner of touched) {
      const n = (this.sinceEvict.get(owner) ?? 0) + 1;
      if (n < EVICT_SLACK) {
        this.sinceEvict.set(owner, n);
        continue;
      }
      this.sinceEvict.set(owner, 0);
      await this.evict(owner, window);
    }
  }

  /**
   * Trim `owner` back to the window.
   *
   * ⚠ The cut point is read from the store rather than computed, because
   * `seq` is a clock value and not a count — `high - window` would be
   * arithmetic on milliseconds. One indexed lookup of the Nth-newest row
   * and one indexed range delete.
   */
  private async evict(owner: string, window: number): Promise<void> {
    try {
      const edge = await PersistApi.find(
        Collections.PlayerFrames,
        { owner },
        { sort: { seq: -1 }, skip: window, limit: 1 },
      );
      const cut = edge[0];
      if (!cut) return;
      await PersistApi.deleteMany(Collections.PlayerFrames, {
        owner,
        seq: { $lte: Number(cut.seq) },
      });
    } catch (err) {
      console.warn('[record] window trim failed', err);
    }
  }

  /** Install the drain timer once, on first use. */
  private startWriter(): void {
    if (this.writer) return;
    this.writer = ScheduleApi.recurring(
      readInt(AppSettingKeys.recordFrameFlushMs, DEFAULT_FLUSH_MS),
      () => {
        void this.drain().catch((err) =>
          console.warn('[record] flush failed', err),
        );
      },
    );
  }

  /* ─── read ─── */

  /**
   * See {@link RecordApi.recent}. Oldest→newest, so the client can
   * append the result to an empty buffer in arrival order.
   *
   * ⭐ The **pending buffer is included**. Without it a reconnect one
   * second after a frame arrived would silently miss it, and the store
   * would appear to lose exactly the frames closest to the thing the
   * player was doing when they dropped.
   */
  @CallSecurity(RecordApiCallers)
  public async recent(
    owner: string,
    limit: number,
  ): Promise<StoredFrameRecord[]> {
    if (!owner) return [];
    const pending = this.buffer
      .filter((r) => r.owner === owner)
      .map((r) => toRecord(r as unknown as Record<string, unknown>));
    if (!connected()) return pending.slice(-limit);

    let stored: StoredFrameRecord[] = [];
    try {
      const rows = await PersistApi.find(
        Collections.PlayerFrames,
        { owner },
        { sort: { seq: -1 }, limit },
      );
      stored = rows.map(toRecord).reverse();
    } catch (err) {
      console.warn('[record] backfill read failed', err);
    }
    const seen = new Set(stored.map((r) => r.seq));
    const merged = [...stored, ...pending.filter((r) => !seen.has(r.seq))];
    return merged.slice(-limit);
  }

  /* ─── recall ─── */

  /** See {@link RecordApi.recall}. */
  @CallSecurity(RecordApiCallers)
  public async recall(
    owner: string,
    scope: RecallScope,
    search: string,
  ): Promise<RecallHit[]> {
    const want = terms(search);
    if (want.length === 0) return [];
    const limit = readInt(
      AppSettingKeys.recordRecallLimit,
      DEFAULT_RECALL_LIMIT,
    );
    if (!connected()) return [];
    if (scope === 'frames') return this.recallFrames(owner, want, limit);
    if (scope === 'wiki') return this.recallWiki(want, limit);
    return this.recallForums(want, limit);
  }

  /**
   * ⚠⚠ **Owner-only, and the owner is a parameter the caller cannot
   * choose** — `RecordApi` derives it from the acting context and there
   * is no overload that takes one. The gate is on the STORE rather than
   * on each frame because the frames are not all self-addressed: a room
   * frame you received names other people, so the store contains
   * third-party content by construction and per-frame filtering could
   * never be made correct.
   */
  private async recallFrames(
    owner: string,
    want: string[],
    limit: number,
  ): Promise<RecallHit[]> {
    if (!owner) return [];
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await PersistApi.find(
        Collections.PlayerFrames,
        { owner, $text: { $search: want.join(' ') } },
        { sort: { seq: -1 }, limit },
      );
    } catch {
      rows = [];
    }
    if (rows.length === 0) {
      const all = await PersistApi.find(
        Collections.PlayerFrames,
        { owner },
        { sort: { seq: -1 }, limit: 5000 },
      );
      rows = all.filter((r) => looseMatch(r, ['body'], want)).slice(0, limit);
    }
    return rows.map((r) => ({
      scope: 'frames' as const,
      title: String(r.topic ?? ''),
      excerpt: excerpt(String(r.body ?? ''), want),
      at: Number(r.at ?? 0),
    }));
  }

  private async recallWiki(want: string[], limit: number): Promise<RecallHit[]> {
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await PersistApi.find(
        Collections.Wiki,
        { $text: { $search: want.join(' ') } },
        { limit },
      );
    } catch {
      rows = [];
    }
    if (rows.length === 0) {
      const all = await PersistApi.find(Collections.Wiki, {});
      rows = all
        .filter((r) => looseMatch(r, ['title', 'body'], want))
        .slice(0, limit);
    }
    // ⚠ Soft-deleted pages stop resolving for readers, so they must stop
    // resolving here too — a search that surfaces a deleted page is a
    // back door around the delete.
    return rows
      .filter((r) => r.deletedAt == null)
      .map((r) => {
        const handle = `${String(r.namespace ?? '')}:${String(r.slug ?? '')}`;
        return {
          scope: 'wiki' as const,
          title: String(r.title ?? handle),
          excerpt: excerpt(String(r.body ?? ''), want),
          command: `wiki read ${handle}`,
        };
      });
  }

  private async recallForums(
    want: string[],
    limit: number,
  ): Promise<RecallHit[]> {
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await PersistApi.find(
        Collections.ForumEntries,
        { $text: { $search: want.join(' ') } },
        { limit },
      );
    } catch {
      rows = [];
    }
    if (rows.length === 0) {
      const all = await PersistApi.find(Collections.ForumEntries, {});
      rows = all
        .filter((r) => looseMatch(r, ['title', 'body'], want))
        .slice(0, limit);
    }
    return rows.map((r) => {
      // A post has no title of its own; the thread it hangs under is the
      // addressable thing, so a post's hit opens its root.
      const threadId = String((r.parent as string | null) ?? r._id ?? '');
      const title = String(r.title ?? '') || 'a reply';
      return {
        scope: 'forums' as const,
        title,
        excerpt: excerpt(String(r.body ?? ''), want),
        command: `forum thread ${threadId}`,
      };
    });
  }

  /* ─── test seams ─── */

  /** Drop every buffered row and per-owner counter (per-test isolation). */
  @CallSecurity(RecordApiCallers)
  public _clearAll(): void {
    this.buffer = [];
    this.lastSeq.clear();
    this.sinceEvict.clear();
    if (this.writer) {
      ScheduleApi.cancel(this.writer);
      this.writer = null;
    }
  }

  /** How many rows are waiting to be drained. */
  @CallSecurity(RecordApiCallers)
  public _pendingCount(): number {
    return this.buffer.length;
  }

  /**
   * Force the window trim for one owner, skipping the slack counter.
   * The eviction property is about the BOUND, not about when the trim
   * happens to run, and a test that had to push 64 frames to see it
   * would be testing the slack constant.
   */
  @CallSecurity(RecordApiCallers)
  public async _evictNow(owner: string): Promise<void> {
    await this.evict(
      owner,
      readInt(AppSettingKeys.recordFrameWindow, DEFAULT_WINDOW),
    );
  }
}
