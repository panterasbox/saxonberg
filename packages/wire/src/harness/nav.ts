/**
 * NavClient — what a client holds of your map and where you are, kept by
 * the harness exactly as the client keeps it (navigation-server D12).
 *
 * One per `Session`. It subscribes to the two navigation sources the way
 * the client does, and is fed every frame through `Session.observe` —
 * BEFORE the per-command capture is cleared — so a step can ask what was
 * sent during it. It holds the sections, the copy keyed by change key, the
 * last `rev` of each subscription, and an uncapped log.
 *
 * ⚠ Test tooling: it decides nothing about the game, it only holds and
 * checks what the server sent.
 */

import type {
  MapCopySnapshot,
  NavSectionName,
  NavSections,
  WhereaboutsSnapshot,
  WireClaim,
} from '@saxonberg/types';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';
import type { Session } from './session';

/** One frame of either navigation subscription, as received. */
export interface NavLogEntry {
  sub: 'where' | 'map';
  type: 'subscription-result' | 'subscription-delta' | 'subscription-error';
  rev: number | null;
  bytes: number;
  frame: Record<string, unknown>;
}

/** The namespace roots a path on the wire starts with. */
const PATH_ROOTS = /^\/(platform|stuff|world|trade|corpo|system|home|studio|wiki|compact|blueprints|expression|test)\//;

export class NavClient {
  sections: NavSections = {};
  /** `<locality>|<claim key>` → the claim. */
  readonly copy = new Map<string, { locality: string; claim: WireClaim }>();
  readonly log: NavLogEntry[] = [];
  private ids: { where: string; map: string } | null = null;
  private readonly lastRev = new Map<string, number>();
  private readonly gaps: string[] = [];

  private constructor(private readonly session: Session) {}

  /** Subscribe to both sources as the client does; resolves with both snapshots in. */
  static async attach(session: Session): Promise<NavClient> {
    const nav = new NavClient(session);
    session.observe((frame, bytes) => nav.feed(frame, bytes));
    await nav.resubscribe();
    return nav;
  }

  /**
   * Subscribe afresh — what the client does on every connection: the
   * snapshot replaces what was held.
   */
  async resubscribe(): Promise<void> {
    // ⚠ Each id is taken the moment its result lands: a socket message is
    // a macrotask, so nothing is fed between the result and this line —
    // but a delta may arrive while the SECOND subscribe is in flight.
    this.ids = null;
    const where = await this.session.subscribe(SUBSCRIPTION_SOURCES.whereabouts);
    if (where.type !== 'subscription-result') throw new Error(`nav: where-you-are refused: ${JSON.stringify(where)}`);
    this.whereId = where.subscriptionId;
    this.sections = { ...(where.snapshot as WhereaboutsSnapshot).sections };
    this.lastRev.set(where.subscriptionId, 0);
    this.logResult('where', where);
    const map = await this.session.subscribe(SUBSCRIPTION_SOURCES.mapCopy);
    if (map.type !== 'subscription-result') throw new Error(`nav: your map refused: ${JSON.stringify(map)}`);
    this.copy.clear();
    for (const doc of (map.snapshot as MapCopySnapshot).documents) {
      for (const claim of doc.claims) this.copy.set(`${doc.locality}|${claim.key}`, { locality: doc.locality, claim });
    }
    this.lastRev.set(map.subscriptionId, 0);
    this.logResult('map', map);
    this.ids = { where: where.subscriptionId, map: map.subscriptionId };
  }

  private whereId: string | null = null;

  private logResult(sub: 'where' | 'map', env: object): void {
    this.log.push({
      sub,
      type: 'subscription-result',
      rev: 0,
      bytes: Buffer.byteLength(JSON.stringify(env)),
      frame: env as Record<string, unknown>,
    });
  }

  /**
   * Wait until the navigation subscriptions have been quiet for `quietMs`
   * (capped at `capMs`) — a section flush runs on its own beat, after the
   * command that caused it.
   */
  async settle(quietMs = 600, capMs = 8000): Promise<void> {
    const start = Date.now();
    for (;;) {
      const since = Date.now() - this.lastFrameAt;
      if (since >= quietMs || Date.now() - start >= capMs) return;
      await new Promise((r) => setTimeout(r, Math.min(100, quietMs - since)));
    }
  }

  private lastFrameAt = Date.now();

  /** A section as last received. */
  section<K extends NavSectionName>(name: K): NavSections[K] {
    return this.sections[name];
  }

  /** The copy's claims, optionally filtered. */
  claims(filter?: (c: WireClaim, locality: string) => boolean): WireClaim[] {
    return [...this.copy.values()].filter((x) => (filter ? filter(x.claim, x.locality) : true)).map((x) => x.claim);
  }

  /** A mark in the log, for {@link sentSince} / {@link bytesSince}. */
  mark(): number {
    return this.log.length;
  }

  /** Which sections were sent since `mark` (in order, repeats kept). */
  sentSince(mark: number): NavSectionName[] {
    const out: NavSectionName[] = [];
    for (const e of this.log.slice(mark)) {
      if (e.sub !== 'where' || e.type !== 'subscription-delta') continue;
      for (const c of (e.frame.changes as { key: string }[]) ?? []) out.push(c.key as NavSectionName);
    }
    return out;
  }

  /** Bytes of navigation frames since `mark` (one sub, or both). */
  bytesSince(mark: number, sub?: 'where' | 'map'): number {
    return this.log.slice(mark).filter((e) => !sub || e.sub === sub).reduce((n, e) => n + e.bytes, 0);
  }

  /** Every delta was the previous `rev + 1`. */
  assertContiguous(): void {
    if (this.gaps.length > 0) throw new Error(`nav: rev broke — ${this.gaps.join('; ')}`);
  }

  /**
   * ⭐ No bare path anywhere the navigation sources sent: every string that
   * starts with a namespace root sits in a `{ path, spoiler }`.
   */
  assertAllPathsTagged(): void {
    const bare: string[] = [];
    const walk = (v: unknown, at: string, insideTag: boolean): void => {
      if (typeof v === 'string') {
        if (!insideTag && PATH_ROOTS.test(v)) bare.push(`${at}: ${v}`);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((x, i) => walk(x, `${at}[${i}]`, false));
        return;
      }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        // A path rides the spoiler axis at level 2 since the tooltips build
        // (`TaggedPath`); any spoiler level is a tag — a bare string is not.
        const tagged = typeof o.path === 'string' && typeof o.spoiler === 'number' && o.spoiler >= 1;
        for (const [k, x] of Object.entries(o)) walk(x, `${at}.${k}`, tagged && k === 'path');
      }
    };
    for (const e of this.log) walk(e.frame, `${e.sub}#${e.rev}`, false);
    if (bare.length > 0) throw new Error(`nav: untagged paths on the wire:\n${bare.slice(0, 20).join('\n')}`);
  }

  private feed(frame: Record<string, unknown>, bytes: number): void {
    const id = frame.subscriptionId;
    const sub = id === this.whereId ? 'where' : this.ids && id === this.ids.map ? 'map' : null;
    if (sub === null) return;
    this.lastFrameAt = Date.now();
    const type = frame.type as NavLogEntry['type'];
    if (type !== 'subscription-delta') {
      if (type === 'subscription-error') this.log.push({ sub, type, rev: null, bytes, frame });
      return;
    }
    const rev = typeof frame.rev === 'number' ? frame.rev : -1;
    const prev = this.lastRev.get(id as string) ?? -1;
    if (rev !== prev + 1) this.gaps.push(`${sub}: ${prev} → ${rev}`);
    this.lastRev.set(id as string, rev);
    this.log.push({ sub, type, rev, bytes, frame });
    const changes = (frame.changes as { op: string; key: string; fields?: unknown }[]) ?? [];
    for (const c of changes) {
      if (sub === 'where') {
        if (c.op === 'remove') delete this.sections[c.key as NavSectionName];
        else (this.sections as Record<string, unknown>)[c.key] = c.fields;
      } else if (c.op === 'remove') {
        this.copy.delete(c.key);
      } else {
        this.copy.set(c.key, c.fields as { locality: string; claim: WireClaim });
      }
    }
  }
}
