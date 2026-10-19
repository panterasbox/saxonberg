/**
 * ShoreMixin — **this place is beside a named water** (maritime
 * revision 3; supersedes the water pack's `Shore` prop).
 *
 * A riverbank, a mere's shore, a ship's deck: the place already names
 * its water as one of its own features (`details: { river: … }`), in its
 * own words. This mixin says WHICH water each such feature is —
 * `waters: { river: kestrel:confluence }` — and nothing else. The
 * citation is a string the kernel stores and never parses; the water
 * pack reads it through {@link WaterSourceMixin}.
 *
 * ⭐ **Composed only by the waterside classes** (`platform/location/
 * Shore`, `platform/location/Quay`) — never on a base. Being beside water
 * is a fact about some places; `Street`'s header is the correction this
 * follows.
 *
 * What it does:
 * - **`look <the water>`** — the feature's own words, then the water's
 *   read (`getDetail`). ⛔ The room's own prose is untouched.
 * - **which water you mean** — `waterFor(name?)` picks by the feature
 *   you named, or the single one; it RETURNS refusals in words, and the
 *   controllers only render them.
 * - **where, now** — `waterRefFor(name?)`, the concrete ref a verb acts
 *   on (a deck's moves with the craft).
 *
 * The read is async and a detail render is not, so each cited feature
 * keeps a memo, kicked by a look and awaited by a verb, refreshed once a
 * weather segment, when the ref moves, or while it is still pending.
 * Nothing warms it at birth — lazy first use is the initializer.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { WaterDraw, WaterRead, WaterSource } from './WaterSource';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { SourceSlot } from '../bulk/SourceSlot';
import type { CommandContributions } from '../../api/command';
import type { MqlMatchVia } from '../../api/mql';

/** The weather field is memoised per six-game-hour segment; reading more often buys nothing. */
const SEGMENT_S = 6 * 3600;

/** ⭐ A tidal water moves in minutes, not segments (underwater D25): read it this often. */
const TIDE_SEGMENT_S = 600;

/** One cited feature's read, and the source that answered it. */
interface WaterMemo {
  source: (Stuff & WaterSource) | null;
  read: WaterRead | null;
  refreshing: Promise<void> | null;
  /** The source was found and said it does not know this water. */
  unknown?: true;
}

/** Which water a name picks, or why none. */
export type WaterPick =
  | { key: string; citation: string }
  | { refusal: string; reason: 'not-water' | 'which-water' | 'no-water' };

/** The concrete ref to act on, or why none. */
export type WaterRefPick =
  | { key: string; ref: string; read: WaterRead }
  | { refusal: string; reason: 'not-water' | 'which-water' | 'no-water' | 'unread' };

/** Public shape added by ShoreMixin. */
export interface Shore {
  getWaters(): Record<string, string>;
  setWaters(value: Record<string, string> | null): void;
  waterFor(name?: string): WaterPick;
  waterRefFor(name?: string): Promise<WaterRefPick>;
  settleWater(key: string): Promise<WaterRead | null>;
  peekWaterRead(key: string): WaterRead | null;
  /** @hook A fresh read of the water under `key` has landed. */
  onWaterRead(key: string, read: WaterRead): Promise<void>;
  /**
   * ⭐ What can be drawn from the water under `key` by someone standing in
   * `room` — THE frozen gate (storage-and-ice D15). Frozen water gives
   * nothing except through a hole: the room's floor offering open water.
   */
  drawAt(key: string, room: Stuff): { draw: WaterDraw } | { refusal: 'frozen' | 'unread'; line: string };
  waterSlot(via?: MqlMatchVia): SourceSlot;
}

/** ⭐ The draw verbs, granted to whoever stands at a shore (a container grants inward). */
const DRAW_VERBS = [
  'platform/cmd/bulk/fill.yaml',
  'platform/cmd/bulk/drink.yaml',
  'platform/cmd/crafting/wash.yaml',
  // ⭐ Swimming is SAYABLE beside any water; whether a way is swimmable
  // is the gate's (the place you are in, or the place an exit leads into,
  // must BE the water — a `Pool`). A riverbank or a deck affords the verb
  // and refuses the way in words; it is never itself swimmable.
  'platform/cmd/movement/swim.yaml',
  // ⭐ Into the water and up and down it (underwater D19) — the place
  // decides what down means: beside a water, into it; in one, its column.
  'platform/cmd/movement/descend.yaml',
  'platform/cmd/movement/ascend.yaml',
];

export function ShoreMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ShoreMixin extends Base implements Shore {
    static _mixinName: string = 'ShoreMixin';

    static fieldMeta: FieldMeta = {
      waters: { persistent: true, authorable: true },
    };

    /**
     * ⭐ `fill` / `drink` / `wash` where you stand beside water — the place
     * is the player's CONTAINER, and a container grants inward on
     * `inventory` (the deck's `launch` precedent); the refusal is in
     * words when the water cannot give (frozen, which water?).
     */
    static commandContributions: CommandContributions = {
      inventory: DRAW_VERBS,
    };

    /**
     * Feature id (or alias) → the cited water, uninterpreted. A plain
     * object, never a `Map` (no BSON shape for one).
     */
    public waters: Record<string, string> = {};

    /** Per cited key — transient, rebuilt on first use after every boot. */
    private _waterMemos: Map<string, WaterMemo> | null = null;
    /** Keys already warned about (naming no feature of this place). */
    private _warnedKeys: Set<string> | null = null;

    /**
     * ⭐ Warm the water's read at birth (maritime revision 3, B-83). A cold
     * first read is slow — the reach catalogue's compile, the fishery's
     * standing, the ice — and the first person to look at the river after
     * a boot should not wait it out. The retired `Shore` prop warmed here
     * too; this is that same `onCreate` moved onto the place, so
     * `lint:on-create`'s count is where it was (82), not a rise.
     */
    public async onCreate(...args: unknown[]): Promise<void> {
      await (Base.prototype as { onCreate?: (...a: unknown[]) => Promise<void> }).onCreate?.apply(this, args);
      for (const key of Object.keys(this.waters)) void this.refreshWater(key, false);
    }

    public getWaters(): Record<string, string> {
      return { ...this.waters };
    }

    public setWaters(value: Record<string, string> | null): void {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(value ?? {})) {
        if (typeof v === 'string' && v.trim() !== '') out[String(k)] = v.trim();
      }
      this.waters = out;
    }

    /* ─────────────────────────── naming ─────────────────────────── */

    /** The top-level feature map (aliases share one entry object). */
    private featureMap(): Map<string, unknown> {
      return (this as unknown as { details?: Map<string, unknown> }).details ?? new Map();
    }

    /**
     * The cited key a feature id resolves to — `look kestrel` on a feature
     * whose canonical key is `river` resolves to `river`. `null` when the
     * id names no cited feature.
     */
    private citedKeyFor(id: string): string | null {
      const features = this.featureMap();
      const lower = id.toLowerCase();
      const entry = features.get(id) ?? features.get(lower);
      for (const key of Object.keys(this.waters)) {
        if (key === id || key.toLowerCase() === lower) return key;
        if (entry !== undefined && features.get(key) === entry) return key;
      }
      return null;
    }

    /** The cited keys that name a feature of this place (warns once for any that do not). */
    private citedKeys(): string[] {
      const features = this.featureMap();
      const out: string[] = [];
      // ⭐ A water place's own water needs no feature: the place IS it.
      const self = this as unknown as Stuff;
      const own = MixinApi.isWaterPlace(self) ? self.getWaterKey() : null;
      for (const key of Object.keys(this.waters)) {
        if (features.has(key) || key === own) {
          out.push(key);
          continue;
        }
        this._warnedKeys ??= new Set();
        if (!this._warnedKeys.has(key)) {
          this._warnedKeys.add(key);
          console.warn(
            `ShoreMixin: ${(this as unknown as Stuff).getTemplatePath() ?? '?'} cites a water under '${key}', which is none of its features`,
          );
        }
      }
      return out;
    }

    /**
     * ⭐ Which water `name` means. Named: the feature it names, if that
     * feature is cited, else *there is no water in it*. Unnamed: the one
     * cited water; with two, ask which by name.
     */
    public waterFor(name?: string): WaterPick {
      if (name !== undefined && name !== '') {
        const key = this.citedKeyFor(name);
        if (key !== null) return { key, citation: this.waters[key]! };
        return { refusal: `There is no water in the ${name}.`, reason: 'not-water' };
      }
      const keys = this.citedKeys();
      if (keys.length === 1) return { key: keys[0]!, citation: this.waters[keys[0]!]! };
      if (keys.length === 0) return { refusal: 'There is no water here.', reason: 'no-water' };
      const names = keys.map((k) => this.memoFor(k).read?.name ?? k);
      const listed = names.length === 2
        ? `${names[0]} or ${names[1]}`
        : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
      return { refusal: `Which water — ${listed}?`, reason: 'which-water' };
    }

    /**
     * The concrete ref to fish, measure or draw from, after the read has
     * settled — what a verb about to act asks.
     */
    public async waterRefFor(name?: string): Promise<WaterRefPick> {
      const pick = this.waterFor(name);
      if ('refusal' in pick) return pick;
      const read = await this.settleWater(pick.key);
      if (read === null || read.pending) {
        return { refusal: 'The water is hard to read yet.', reason: 'unread' };
      }
      return { key: pick.key, ref: read.ref, read };
    }

    /* ─────────────────────────── the read ─────────────────────────── */

    private memoFor(key: string): WaterMemo {
      this._waterMemos ??= new Map();
      let memo = this._waterMemos.get(key);
      if (!memo) {
        memo = { source: null, read: null, refreshing: null };
        this._waterMemos.set(key, memo);
      }
      return memo;
    }

    /** Await a current read of the cited water under `key`. */
    public async settleWater(key: string): Promise<WaterRead | null> {
      await this.refreshWater(key, true);
      return this.memoFor(key).read;
    }

    /** The current read of the water under `key`, kicking a refresh when stale. */
    public peekWaterRead(key: string): WaterRead | null {
      return this.peekWater(key).read;
    }

    public drawAt(
      key: string,
      room: Stuff,
    ): { draw: WaterDraw } | { refusal: 'frozen' | 'unread'; line: string } {
      const read = this.peekWaterRead(key);
      if (read === null || read.pending) {
        return { refusal: 'unread', line: 'The water is hard to read yet.' };
      }
      if (!read.frozen) {
        return read.draw ? { draw: read.draw } : { refusal: 'unread', line: 'Nothing comes up.' };
      }
      // ⭐ Through a hole: the floor of the place you stand in has open water.
      const floor = MixinApi.isAdornable(room) ? room.getFloor() : null;
      if (floor !== null && MixinApi.isFloor(floor) && floor.openWaterAreaM2() > 0 && read.underIce) {
        return { draw: read.underIce };
      }
      return { refusal: 'frozen', line: 'The water is frozen over; you would need a hole.' };
    }

    /**
     * ⭐ The water as a source to draw from (maritime revision 3, T9′):
     * the water the player named it by (`via.detailPath` — the feature
     * they typed), or the place's one water. ALWAYS a slot — one that
     * cannot give is empty and says why in its own words.
     */
    public waterSlot(via?: MqlMatchVia): SourceSlot {
      const self = this as unknown as Stuff & ShoreMixin;
      const pick = this.waterFor(via?.detailPath?.at(-1));
      if ('refusal' in pick) return new SourceSlot(self, null, pick.refusal);
      void this.refreshWater(pick.key, false);
      return new SourceSlot(self, pick.key);
    }

    /** The read as it stands, kicking a refresh when it is stale. */
    private peekWater(key: string): WaterMemo {
      void this.refreshWater(key, false);
      return this.memoFor(key);
    }

    private refreshWater(key: string, force: boolean): Promise<void> {
      const memo = this.memoFor(key);
      if (memo.refreshing !== null) return memo.refreshing;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return Promise.resolve();
      const nowS = WorldClockApi.getNow().rawValue();
      const citation = this.waters[key];
      if (citation === undefined) return Promise.resolve();
      const read = memo.read;
      const moved =
        read !== null && memo.source !== null &&
        memo.source.currentWaterRef(citation, this as unknown as Stuff) !== read.ref;
      const window = read?.tide !== undefined ? TIDE_SEGMENT_S : SEGMENT_S;
      const fresh =
        read !== null && !read.pending && !moved && nowS - read.atS < window;
      if (fresh && !(force && memo.source === null)) return Promise.resolve();
      if (!force && memo.unknown) return Promise.resolve();
      const run = this.readCited(key, memo, citation, nowS).finally(() => {
        memo.refreshing = null;
      });
      memo.refreshing = run;
      return run;
    }

    private async readCited(key: string, memo: WaterMemo, citation: string, nowS: number): Promise<void> {
      const startedMs = Date.now();
      const where = (this as unknown as Stuff).getTemplatePath() ?? '?';
      try {
        memo.source ??= await findWaterSource(citation);
        if (memo.source === null) {
          // ⚠ Never silent: no source means a water nobody here can read.
          memo.unknown = true;
          console.warn(`ShoreMixin: ${where} cites '${citation}', and no water source answers for it`);
          return;
        }
        const read = await memo.source.readWater(citation, this as unknown as Stuff, nowS);
        if (read === null) {
          memo.unknown = true;
          return;
        }
        memo.unknown = undefined;
        memo.read = read;
        await this.onWaterRead(key, read);
      } catch (err) {
        // The read stays as it was (a look says it is hard to read) — but
        // a read that THROWS is a defect somebody must be able to see.
        console.warn(`ShoreMixin: reading '${citation}' at ${where} failed:`, err);
      } finally {
        const tookMs = Date.now() - startedMs;
        if (tookMs > 2_000) console.warn(`ShoreMixin: reading '${citation}' at ${where} took ${tookMs} ms`);
      }
    }

    /**
     * @hook A fresh read of the water under `key` has landed. A place
     * whose own state follows the water (a tidepool, a strand) reconciles
     * here; a plain shore does nothing.
     */
    public async onWaterRead(key: string, read: WaterRead): Promise<void> {
      void key;
      void read;
    }

    /**
     * ⭐ A cited feature's own words, then the water's read for `viewer`.
     * Every other feature, sense and parent path is the base's.
     */
    public getDetail(
      id: string,
      senseOrParent?: unknown,
      parent?: unknown,
      viewer?: unknown,
    ): string | null {
      const base = (
        Base.prototype as {
          getDetail?: (i: string, s?: unknown, p?: unknown, v?: unknown) => string | null;
        }
      ).getDetail?.call(this, id, senseOrParent, parent, viewer) ?? null;
      // ⚠⚠ `'vision'`, not `undefined` — `getDetailFor` passes it, and the
      // PublicLighting guard that forgot this never rendered its live line.
      const visual = senseOrParent === undefined || senseOrParent === 'vision';
      if (!visual || parent !== undefined) return base;
      const key = this.citedKeyFor(id);
      if (key === null) return base;
      const memo = this.peekWater(key);
      let line: string;
      if (memo.unknown) {
        line = 'Nothing here can read this water.';
      } else if (memo.read === null || memo.read.pending || memo.source === null) {
        line = 'The water is hard to read yet.';
      } else {
        const lines = memo.source.waterLinesFor(memo.read, viewer as Stuff);
        const tide = tideWords(memo.read);
        if (tide !== null) lines.push(tide);
        line = lines.length > 0 ? lines.join(' ') : 'The water is hard to read yet.';
      }
      return base ? `${base}\n\n${line}` : line;
    }
  };
}

/* ───────────────────────── module-private ───────────────────────── */

/**
 * ⭐ The tide in a shore's words (underwater D25): which way it is going,
 * how long to the turn, and the stream — never a number of metres.
 */
function tideWords(read: WaterRead): string | null {
  const tide = read.tide;
  if (tide === undefined) return null;
  const slack = Math.abs(tide.streamMps) < 0.15;
  const nextS = tide.rising ? tide.nextHighS : tide.nextLowS;
  const hours = Math.max(0, (nextS - read.atS) / 3600);
  const when = hours < 0.75 ? 'within the hour' : `in about ${hours < 1.5 ? 'an hour' : `${Math.round(hours)} hours`}`;
  if (slack) {
    return tide.rising ? 'The tide is on the turn at low water; it will be making soon.' : 'The tide is on the turn at the top of the flood.';
  }
  const way = tide.rising ? `The tide is making — high water ${when}` : `The tide is ebbing — low water ${when}`;
  const run = Math.abs(tide.streamMps) > 0.8 ? ', and the stream runs hard' : '';
  return `${way}${run}.`;
}

/**
 * The source that reads `citation`: the cited Idea itself when the
 * citation is a path (a sea is its own source), else the realm's default
 * source (`water.sourcePath` — the reach catalogue). The ground ladder's
 * shape (`Floor.groundBeneath`).
 */
async function findWaterSource(citation: string): Promise<(Stuff & WaterSource) | null> {
  const paths: string[] = [];
  if (citation.startsWith('/')) paths.push(citation);
  const fallback = dialStrOrNull(AppSettingKeys.waterSourcePath);
  if (fallback) paths.push(fallback);
  for (const path of paths) {
    let found: Stuff | null = null;
    try {
      found = await StuffApi.singleton<Stuff>(path);
    } catch {
      found = null;
    }
    if (found && MixinApi.isWaterSource(found)) return found;
  }
  return null;
}

/** Read a dial with no honest literal fallback. */
function dialStrOrNull(key: string): string | null {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? null : String(raw);
  } catch {
    return null;
  }
}
