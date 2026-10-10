/**
 * Expanse — a region in space whose points of interest are reached by
 * setting a course: a sea, and in principle a desert, an ice sheet or a
 * void. The FRAME, medium-agnostic and never instanced; its instanceable
 * tier is the medium's (`/system/water/idea/WaterExpanse`), and the
 * realm's own sea is a row under `/stuff/idea/<tier>/<key>`.
 *
 * ## Two layers, and nothing is ever inside the frame
 *
 * An expanse holds **nodes** (`ExpanseNode` rows — places and passages at
 * geographic positions) and **bands** (`Band` rows — regions with a width
 * that confer cost and character, never connectivity). Both are Ideas, so
 * nothing is a room here and nothing enters the location graph. Behind a
 * node may sit ordinary Cartesian content (a cove you can swim, a landing
 * with a lighthouse) authored by the same means as any other place.
 *
 * It is a `SpatialZone` (it has an address, can stock, can name
 * landmarks) and composes NO Location half — `LocationZoneMixin` is what
 * holds rooms, and a frame does not.
 *
 * ## Lazy, not warmed
 *
 * Its node and band rows are its own template descendants, compiled on the
 * first read and stood up as live singletons. There is no warmed-vs-cold
 * state to get wrong.
 *
 * ## What lives here, and why on the frame
 *
 * Composition at a position (`fieldAt` — the narrowest band wins a field
 * value, placed things union), the node lookup, the runtime registry of
 * craft on this expanse, the seeded traffic field and per-channel
 * co-presence. All verbs on the object: the frame is the thing that knows
 * its own water.
 */

import { SpatialZone } from '../zone/SpatialZone';
import { SingletonMixin } from '../stuff/Singleton';
import { Template } from '../stuff/Template';
import type { Stuff } from '../stuff/Stuff';
import type { FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import Band from '../../platform/idea/Band';
import ExpanseNode from '../../platform/idea/ExpanseNode';
import { GeoPosition } from './GeoPosition';
import type { Positioned } from './Positioned';
import type { SightingChannel } from './SightingChannel';

/** What composes at one position. */
export interface ExpanseField {
  /** The narrowest band containing the position — the field values' owner. */
  band: Band | null;
  /** Every band containing it, narrowest first. */
  bands: Band[];
  /** Placed hazards: the union over every containing band. */
  hazards: string[];
  /** Placed stock: the union; on a shared key the narrower band's value. */
  stock: Record<string, number>;
  /** The traffic weight here: the narrowest band's, else the expanse's. */
  traffic: number;
}

/** Something sighted — a real craft or a seeded passer-by. */
export interface Contact {
  /** The live craft, or `null` for seeded traffic. */
  craft: (Stuff & Positioned) | null;
  /** Words for it: *the Hesper*, *a collier*. */
  name: string;
  bearingDeg: number;
  rangeNm: number;
  channel: SightingChannel;
}

/** Seeded traffic's vocabulary — prose, not a class roster. */
const TRAFFIC_KINDS = [
  'a fishing smack',
  'a collier, deep-laden',
  'a revenue cutter',
  'a brig standing on',
  'a coasting ketch',
];

/** A craft seen as a target with no height of its own, metres. */
const SEEDED_TARGET_HEIGHT_M = 12;

function numSetting(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = Number(raw);
    return raw !== undefined && raw !== null && raw !== '' && Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * FNV-1a over a string, to `[0, 1)` — module-private, the house pattern
 * (three private copies exist; there is deliberately no exported helper).
 */
function fnvUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

/** Feet in a metre — the horizon formula is stated in feet. */
const FT_PER_M = 3.28084;

export abstract class Expanse extends SingletonMixin(SpatialZone) {
  static fieldMeta: FieldMeta = {
    prevailingDeg: { persistent: true, authorable: true },
    trafficDefault: { persistent: true, authorable: true },
    outsideDescription: { persistent: true, authorable: true },
  };

  /** The prevailing wind, degrees FROM — where no band leans. */
  protected prevailingDeg = 225;
  /** 0..1 — traffic where no band says otherwise. */
  protected trafficDefault = 0.1;
  /** What it looks like from the shore. */
  protected outsideDescription = '';

  /** Runtime only: the craft currently on this expanse. */
  private craftSet = new Set<Stuff & Positioned>();
  private compiled: Promise<{ nodes: ExpanseNode[]; bands: Band[] }> | null = null;
  /** The compiled rows once loaded, for the synchronous reads. */
  private loadedBands: Band[] = [];
  private loadedNodes: ExpanseNode[] = [];

  public getPrevailingDeg(): number { return this.prevailingDeg; }
  public setPrevailingDeg(v: number): void { this.prevailingDeg = Number(v) || 0; }

  public getTrafficDefault(): number { return this.trafficDefault; }
  public setTrafficDefault(v: number): void {
    this.trafficDefault = Math.max(0, Math.min(1, Number(v) || 0));
  }

  public getOutsideDescription(): string { return this.outsideDescription; }
  public setOutsideDescription(v: string): void { this.outsideDescription = (v ?? '').trim(); }

  /* ───────────────────────── the rows ───────────────────────── */

  /** Every node on this expanse. */
  public async nodes(): Promise<ExpanseNode[]> {
    return (await this.compile()).nodes;
  }

  /** Every band on this expanse. */
  public async bands(): Promise<Band[]> {
    return (await this.compile()).bands;
  }

  /**
   * The bands as compiled so far — synchronous, and EMPTY until the first
   * async read has loaded them. A craft's derived position reads this, so
   * whoever sets a course or re-arms a voyage awaits `bands()` first.
   */
  public peekBands(): Band[] {
    return this.loadedBands;
  }

  /** The nodes as compiled so far — synchronous; empty until loaded. */
  public peekNodes(): ExpanseNode[] {
    return this.loadedNodes;
  }

  /** Drop the compiled rows so the next read recompiles (a go-live). */
  public invalidate(): void {
    this.compiled = null;
  }

  /* ───────────────────────── what the medium says ───────────────────────── */

  /**
   * The water (or the sand, or the ice) at `pos`, in words — what a
   * boundary crossing reports and what the deck reads. Never a position:
   * *the field alone is evidence*. The frame answers the narrowest band's
   * outside description; a medium tier says more (the sea state).
   */
  public async readAt(pos: GeoPosition, _scope: Stuff | null): Promise<string> {
    const f = await this.fieldAt(pos);
    return f.band?.getOutsideDescription() || this.outsideDescription || '';
  }

  /**
   * How hard the medium is on gear at `pos` (0 = flat calm), a
   * multiplier on neglect wear. The frame answers `1`; a medium tier
   * derives it (the sea state).
   */
  public async roughnessAt(_pos: GeoPosition, _scope: Stuff | null): Promise<number> {
    return 1;
  }

  /** The node at `path`, if it is one of this expanse's. */
  public async node(path: string): Promise<ExpanseNode | null> {
    return (await this.nodes()).find((n) => n.getTemplatePath() === path) ?? null;
  }

  /** The band at `path`, if it is one of this expanse's. */
  public async band(path: string): Promise<Band | null> {
    return (await this.bands()).find((b) => b.getTemplatePath() === path) ?? null;
  }

  /** The node answering to `word`, by its own name — never through MQL. */
  public async nodeByKeyword(word: string): Promise<ExpanseNode | null> {
    return (await this.nodes()).find((n) => n.answersTo(word)) ?? null;
  }

  /** The nearest node within `withinNm` of `pos`, or `null`. */
  public async nodeNear(pos: GeoPosition, withinNm: number): Promise<ExpanseNode | null> {
    let best: ExpanseNode | null = null;
    let bestNm = Infinity;
    for (const n of await this.nodes()) {
      const at = n.getExpansePosition();
      if (at === null) continue;
      const d = pos.distanceNm(at);
      if (d <= withinNm && d < bestNm) {
        best = n;
        bestNm = d;
      }
    }
    return best;
  }

  /* ───────────────────────── composition ───────────────────────── */

  /** Every band containing `pos`, narrowest first. */
  public async bandsAt(pos: GeoPosition): Promise<Band[]> {
    return (await this.bands())
      .filter((b) => b.contains(pos))
      .sort((a, b) => a.area() - b.area());
  }

  /**
   * ⭐ What composes at `pos`: a field value from the NARROWEST band (the
   * zone walk's innermost rule — a race laid over a fog has the race's
   * weather), placed things from the UNION of every band containing it.
   */
  public async fieldAt(pos: GeoPosition): Promise<ExpanseField> {
    const bands = await this.bandsAt(pos);
    const hazards = new Set<string>();
    const stock: Record<string, number> = {};
    // Widest first, so a narrower band overwrites a shared key.
    for (const b of [...bands].reverse()) {
      for (const h of b.getHazards()) hazards.add(h);
      Object.assign(stock, b.getStock());
    }
    const band = bands[0] ?? null;
    return {
      band,
      bands,
      hazards: [...hazards],
      stock,
      traffic: band?.getTraffic() ?? this.trafficDefault,
    };
  }

  /* ───────────────────────── craft on this water ───────────────────────── */

  /** A craft is on this expanse (set a course, launched, re-armed at boot). */
  public register(craft: Stuff & Positioned): void {
    this.craftSet.add(craft);
  }

  /** A craft has left it (arrived and berthed, recovered, destroyed). */
  public deregister(craft: Stuff & Positioned): void {
    this.craftSet.delete(craft);
  }

  /** The craft currently on this expanse. */
  public craft(): (Stuff & Positioned)[] {
    return [...this.craftSet].filter((c) => !c.isDestroyed());
  }

  /* ───────────────────────── sight ───────────────────────── */

  /**
   * How far two heights see each other at sea, nautical miles:
   * `1.17 (√h_obs + √h_tgt)` with heights in feet — curvature binds, so a
   * masthead sees further than a deck and a tall light further than a
   * low hull.
   */
  public sightRangeNm(observerHeightM: number, targetHeightM: number): number {
    const a = Math.sqrt(Math.max(0, observerHeightM) * FT_PER_M);
    const b = Math.sqrt(Math.max(0, targetHeightM) * FT_PER_M);
    return 1.17 * (a + b);
  }

  /**
   * ⭐ Seeded traffic: whether there is a passer-by in the 0.1° cell at
   * `pos` in game hour `hourIndex`, and where. The same at the same place
   * and hour for every observer; re-entering gains nothing; nothing is
   * drawn (`docs/uncertainty.md` — the world IS this, it is not what your
   * action did).
   */
  public trafficAt(pos: GeoPosition, hourIndex: number, weight: number): {
    name: string;
    bearingDeg: number;
    rangeNm: number;
  } | null {
    const cellLat = Math.floor(pos.latDeg * 10);
    const cellLon = Math.floor(pos.lonDeg * 10);
    const key = `${this.getTemplatePath() ?? ''}|${cellLat}|${cellLon}|${hourIndex}`;
    if (fnvUnit(`${key}|is`) >= weight) return null;
    const kinds = TRAFFIC_KINDS;
    return {
      name: kinds[Math.floor(fnvUnit(`${key}|kind`) * kinds.length)] ?? kinds[0]!,
      bearingDeg: Math.floor(fnvUnit(`${key}|brg`) * 360),
      rangeNm: Math.round((2 + fnvUnit(`${key}|rng`) * 10) * 10) / 10,
    };
  }

  /**
   * Who `observer`, looking out from `from`, can perceive on `channel`:
   * every other craft on this expanse in range, every fixed positioned
   * Structure in range (a lighthouse), and this hour's seeded traffic.
   * Only craft on the SAME expanse are compared — the graph is the broad
   * phase.
   */
  public async contactsFrom(
    from: Stuff & Positioned,
    observer: Stuff,
    channel: SightingChannel,
    hourIndex: number,
  ): Promise<Contact[]> {
    const here = from.getExpansePosition();
    if (here === null) return [];
    const eye = from.sightHeightFor(observer);
    const signalNm = numSetting('expanse.signalRangeNm', 12);
    const rangeFor = (targetM: number): number =>
      channel === 'signal' ? signalNm : this.sightRangeNm(eye, targetM);

    const out: Contact[] = [];
    const seen = new Set<string>();
    const consider = (c: Stuff & Positioned): void => {
      if (c.stuffId === from.stuffId || seen.has(c.stuffId)) return;
      const at = c.getExpansePosition();
      if (at === null) return;
      const d = here.distanceNm(at);
      if (d > rangeFor(c.getTargetHeightM())) return;
      seen.add(c.stuffId);
      out.push({
        craft: c,
        name: MixinApi.isNamed(c) ? c.getName() : 'a sail',
        bearingDeg: here.bearingTo(at),
        rangeNm: Math.round(d * 10) / 10,
        channel,
      });
    };
    for (const c of this.craft()) consider(c);
    for (const fixed of await this.fixedStructures()) consider(fixed);

    const field = await this.fieldAt(here);
    const passer = this.trafficAt(here, hourIndex, field.traffic);
    if (passer !== null && passer.rangeNm <= rangeFor(SEEDED_TARGET_HEIGHT_M)) {
      out.push({
        craft: null,
        name: passer.name,
        bearingDeg: passer.bearingDeg,
        rangeNm: passer.rangeNm,
        channel,
      });
    }
    return out.sort((a, b) => a.rangeNm - b.rangeNm);
  }

  /* ───────────────────────── internals ───────────────────────── */

  /** Positioned Structures sited on this expanse that never move. */
  private async fixedStructures(): Promise<(Stuff & Positioned)[]> {
    const self = this.getTemplatePath();
    const out: (Stuff & Positioned)[] = [];
    for (const tpl of await Template.findWhereDataHas('expansePosition')) {
      const d = (tpl.data ?? {}) as Record<string, unknown>;
      if (d.expanse !== self || !('extent' in d)) continue;
      try {
        const s = await StuffApi.singleton<Stuff>(tpl.path);
        if (MixinApi.isPositioned(s)) out.push(s);
      } catch {
        /* a broken row contributes nothing */
      }
    }
    return out;
  }

  private compile(): Promise<{ nodes: ExpanseNode[]; bands: Band[] }> {
    if (this.compiled === null) {
      const run = this.load();
      this.compiled = run;
      run.catch(() => {
        if (this.compiled === run) this.compiled = null;
      });
    }
    return this.compiled;
  }

  private async load(): Promise<{ nodes: ExpanseNode[]; bands: Band[] }> {
    const base = this.getTemplatePath();
    const nodes: ExpanseNode[] = [];
    const bands: Band[] = [];
    if (!base) return { nodes, bands };
    for (const tpl of await Template.findDescendants(base)) {
      let s: Stuff;
      try {
        s = await StuffApi.singleton<Stuff>(tpl.path);
      } catch (err) {
        console.warn(`Expanse: '${tpl.path}' failed to stand up:`, err);
        continue;
      }
      if (s instanceof Band) bands.push(s);
      else if (s instanceof ExpanseNode) {
        if (s.isLinear() && s.getAlong() === null) {
          console.warn(
            `Expanse: linear node '${tpl.path}' names no band to ride ` +
              `(along:); it is reached by bearing like an areal one`,
          );
        }
        nodes.push(s);
      }
    }
    this.loadedBands = bands;
    this.loadedNodes = nodes;
    return { nodes, bands };
  }
}
