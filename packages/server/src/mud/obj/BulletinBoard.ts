/**
 * BulletinBoard — singleton Idea owning the runtime news-ticker window.
 *
 * Lives at `/obj/BulletinBoard` (the singleton-in-`obj/` convention,
 * sibling to `RecipeCatalogue` / `TopicCatalogue`). The source of truth is
 * the `bulletins` collection of {@link Bulletin} Documents; this board warms
 * a transient cache of the working set and answers the **window** question
 * on read — the pins-first, recency-ordered, expiry/retract-filtered slice
 * the live ticker shows. The full archive lives in Mongo (reached via
 * `BulletinApi.archive`); the board caches the working set and computes the
 * window per call. (A low-volume staff feed; a recency-bounded warm is the
 * lever if the set ever grows large.)
 *
 * Server owns all the ticker semantics (ordering / pin-cap / expiry / window
 * length) — read here off `AppApi` settings with a try/catch fallback so a
 * pre-warm / test read is still safe (the `PresenceLogic.idleAfterSeconds`
 * precedent).
 *
 * Not a persisted record — the seed is `{ class: /obj/BulletinBoard,
 * data: {} }`; the cache is rebuilt on demand from the collection.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Bulletin } from '../lib/bulletin/Bulletin';
import { AppApi } from '../api/app';
import { AppSettingKeys } from '../lib/config/AppSettings';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const BulletinBoardBase = PostRegistrationMixin(Idea);

/** Window length when AppSettings isn't warmed. */
const TICKER_WINDOW_FALLBACK = 30;
/** Pin cap when AppSettings isn't warmed. */
const MAX_PINS_FALLBACK = 3;

/** Read a positive-integer AppSetting, falling back on any failure. */
function settingInt(key: string, fallback: number): number {
  try {
    const n = Number(AppApi.setting(key));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  } catch {
    return fallback;
  }
}

export default class BulletinBoard extends BulletinBoardBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** bulletinId → Bulletin. `null` = not yet warmed. */
  private cache: Map<string, Bulletin> | null = null;

  /** Resolve a bulletin by its canonical id, or null. */
  public getBulletin(bulletinId: string): Bulletin | null {
    this.ensureCache();
    return this.cache!.get(bulletinId) ?? null;
  }

  /**
   * The live ticker window: pins first (by recency), then the rest by
   * recency, excluding retracted + expired rows, the pin block capped at
   * `bulletin.maxPins` and the whole window at `bulletin.tickerWindow`.
   */
  public recentWindow(): Bulletin[] {
    this.ensureCache();
    const now = Date.now();
    const live = [...this.cache!.values()].filter(
      (b) => !b.isRetracted() && !b.isExpiredAt(now)
    );
    const byRecency = (a: Bulletin, b: Bulletin): number =>
      b.getPublishedAt() - a.getPublishedAt();
    const pins = live
      .filter((b) => b.isPinned())
      .sort(byRecency)
      .slice(0, settingInt(AppSettingKeys.bulletinMaxPins, MAX_PINS_FALLBACK));
    const rest = live.filter((b) => !b.isPinned()).sort(byRecency);
    const window = settingInt(
      AppSettingKeys.bulletinTickerWindow,
      TICKER_WINDOW_FALLBACK
    );
    return [...pins, ...rest].slice(0, window);
  }

  /** Insert or replace a bulletin in the warm window (by id). */
  public upsert(bulletin: Bulletin): void {
    this.ensureCache();
    const id = bulletin.getBulletinId();
    if (!id) return;
    this.cache!.set(id, bulletin);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * (Re)build the cache from the `bulletins` collection — the live working
   * set, all rows; `recentWindow()` does the retract/expiry filtering and
   * the pin/length capping on read. Soft-retracted rows stay cached (still
   * reachable by id), they just drop out of the window. Low-volume staff
   * feed; a recency-bounded warm is the lever if the set ever grows large.
   */
  public async warm(): Promise<void> {
    const bulletins = await Bulletin.find<Bulletin>({});
    const cache = new Map<string, Bulletin>();
    for (const bulletin of bulletins) {
      const id = bulletin.getBulletinId();
      if (!id) continue;
      cache.set(id, bulletin);
    }
    this.cache = cache;
  }

  private ensureCache(): void {
    // A unit test that doesn't go through boot may read before warm; start
    // empty so the window surface returns [] rather than throwing.
    if (this.cache === null) this.cache = new Map();
  }

  /** Singleton refusal (mirrors RecipeCatalogue / TopicCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'BulletinBoard is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
