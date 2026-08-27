/**
 * PressBoard — singleton Idea owning the runtime news-ticker window.
 *
 * Lives at `/platform/idea/PressBoard` (the singleton-in-`obj/` convention,
 * sibling to `RecipeCatalogue` / `TopicCatalogue`).
 *
 * **The source of truth is now the document tree** — every
 * `kind: 'release'` {@link StoredDocument} — rather than a collection of
 * its own. This board is a warm cache *over the tree* and answers the
 * **window** question on read: the pins-first, recency-ordered,
 * expiry/retract-filtered slice the live ticker shows. Those semantics are
 * unchanged by the move; only the store beneath them changed.
 *
 * Server owns all the ticker semantics (ordering / pin-cap / expiry / window
 * length) — read here off `AppApi` settings with a try/catch fallback so a
 * pre-warm / test read is still safe (the `PresenceLogic.idleAfterSeconds`
 * precedent).
 *
 * Not a persisted record — the seed is `{ class: /platform/idea/PressBoard,
 * data: {} }`; the cache is rebuilt on demand from the tree.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { Release, RELEASE_DOCUMENT_KIND } from '../../lib/press/Release';
import { DocumentApi } from '../../api/document';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const PressBoardBase = PostRegistrationMixin(Idea);

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

export default class PressBoard extends PressBoardBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** releaseId → Release. `null` = not yet warmed. */
  private cache: Map<string, Release> | null = null;

  /** Resolve a release by its canonical id, or null. */
  public getRelease(releaseId: string): Release | null {
    this.ensureCache();
    return this.cache!.get(releaseId) ?? null;
  }

  /**
   * The live ticker window: pins first (by recency), then the rest by
   * recency, excluding retracted + expired rows, the pin block capped at
   * `press.maxPins` and the whole window at `press.tickerWindow`.
   */
  public recentWindow(): Release[] {
    this.ensureCache();
    const now = Date.now();
    const live = [...this.cache!.values()].filter(
      (b) => !b.isRetracted() && !b.isExpiredAt(now)
    );
    const byRecency = (a: Release, b: Release): number =>
      b.getPublishedAt() - a.getPublishedAt();
    const pins = live
      .filter((b) => b.isPinned())
      .sort(byRecency)
      .slice(0, settingInt(AppSettingKeys.pressMaxPins, MAX_PINS_FALLBACK));
    const rest = live.filter((b) => !b.isPinned()).sort(byRecency);
    const window = settingInt(
      AppSettingKeys.pressTickerWindow,
      TICKER_WINDOW_FALLBACK
    );
    return [...pins, ...rest].slice(0, window);
  }

  /** Insert or replace a release in the warm window (by id). */
  public upsert(release: Release): void {
    this.ensureCache();
    const id = release.getReleaseId();
    if (!id) return;
    this.cache!.set(id, release);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * (Re)build the cache from the document tree — every `kind: 'release'`
   * document, the live working set; `recentWindow()` does the
   * retract/expiry filtering and the pin/length capping on read.
   * Soft-retracted releases stay cached (still reachable by id), they just
   * drop out of the window. Low-volume staff feed; a recency-bounded warm
   * is the lever if the set ever grows large.
   *
   * ⚠ **A release document only counts if a publisher actually owns it,
   * at a path inside that publisher's own feed branch.** The tree is a
   * shared store: without this, a document written through the ordinary
   * `DocumentApi.save` path — by whoever owns the covering branch — would
   * ride the ticker as a release. The publishing check has to be the only
   * way in, so the read verifies what the write transport guarantees
   * rather than trusting the `kind` tag.
   */
  public async warm(): Promise<void> {
    const docs = await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND);
    const cache = new Map<string, Release>();
    for (const doc of docs) {
      const release = Release.fromDocument(doc);
      const id = release.getReleaseId();
      if (!id) continue;
      if (!Release.publishedByOwner(release)) continue;
      cache.set(id, release);
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
        'PressBoard is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
