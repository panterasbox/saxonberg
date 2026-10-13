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
import { TemplatePaths } from '../paths';
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
/** A candidate for sight: the craft or structure, and whether it never moves. */
export interface Sighted {
  craft: Stuff & Positioned;
  /** A landmark that never moves (a light) — what a bearing fixes by. */
  fixed: boolean;
}

export interface Contact {
  /** The live craft, or `null` for seeded traffic. */
  craft: (Stuff & Positioned) | null;
  /** Words for it: *the Hesper*, *a collier*. */
  name: string;
  bearingDeg: number;
  rangeNm: number;
  channel: SightingChannel;
  /** A landmark that never moves (a light) — a free fix, not a sail. */
  fixed: boolean;
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
  };

  /** The prevailing wind, degrees FROM — where no band leans. */
  protected prevailingDeg = 225;
  /** 0..1 — traffic where no band says otherwise. */
  protected trafficDefault = 0.1;

  /** Runtime only: the craft currently on this expanse. */
  private craftSet = new Set<Stuff & Positioned>();
  private compiled: Promise<{ nodes: ExpanseNode[]; bands: Band[] }> | null = null;
  /** The compiled rows once loaded, for the synchronous reads. */
  private loadedBands: Band[] = [];
  private loadedNodes: ExpanseNode[] = [];
  /** Positioned Structures on this sea with no deck — landmarks. */
  private landmarks: (Stuff & Positioned)[] = [];

  public getPrevailingDeg(): number { return this.prevailingDeg; }
  public setPrevailingDeg(v: number): void { this.prevailingDeg = Number(v) || 0; }

  public getTrafficDefault(): number { return this.trafficDefault; }
  public setTrafficDefault(v: number): void {
    this.trafficDefault = Math.max(0, Math.min(1, Number(v) || 0));
  }

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
   * ⭐ **What CHANGED across a boundary** (maritime R9) — the field just
   * before it against the field just after, in words, and nothing when
   * nothing perceptible changed. Never a position and never authored:
   * *the field alone is evidence*, and a band carries no prose to read.
   *
   * The frame knows the set (a current taking her, letting her go,
   * swinging); a medium tier adds what its medium makes perceptible (the
   * sea getting up, the water shoaling) and chains `super`.
   *
   * @hook Invoked by the voyage for each crossing, in order.
   */
  public async changesAcross(
    before: GeoPosition,
    after: GeoPosition,
    _scope: Stuff | null,
  ): Promise<string[]> {
    const was = (await this.fieldAt(before)).band;
    const now = (await this.fieldAt(after)).band;
    const kn = (b: Band | null): number => b?.getSetKn() ?? 0;
    const felt = numSetting('expanse.setFeltKn', 0.3);
    if (kn(was) < felt && kn(now) >= felt) {
      return [`A current takes her, setting ${compassWord(now!.getDirection())}.`];
    }
    if (kn(was) >= felt && kn(now) < felt) return ['The current lets her go.'];
    if (kn(was) >= felt && kn(now) >= felt) {
      const swing = Math.abs((((now!.getDirection() - was!.getDirection()) % 360) + 540) % 360 - 180);
      if (swing > 45) return [`The set swings ${compassWord(now!.getDirection())}.`];
    }
    return [];
  }

  /**
   * The narrowest band at `pos` among those compiled so far — SYNCHRONOUS,
   * and `null` until the first async read has loaded them. What the
   * weather's positional lean reads (it cannot wait).
   */
  public peekNarrowestAt(pos: GeoPosition): Band | null {
    let best: Band | null = null;
    for (const b of this.loadedBands) {
      if (!b.contains(pos)) continue;
      if (best === null || b.area() < best.area()) best = b;
    }
    return best;
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

  /**
   * ⭐ Everything on this sea that can be SEEN, synchronously: its
   * landmarks (fixed — a light is what a bearing fixes by) and the craft
   * registered on it. The expanse is the scope that holds the answer; a
   * horizon asks it, never the registry (maritime review). Before the
   * first compile it starts one and answers with the craft alone.
   */
  public sightables(): Sighted[] {
    if (this.compiled === null) void this.compile().catch(() => undefined);
    return [
      ...this.landmarks.map((craft) => ({ craft, fixed: true })),
      ...this.craft().map((craft) => ({ craft, fixed: false })),
    ];
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
    await this.compile();
    // ⭐ The weather shortens sight (maritime R10): fog to a tenth, rain
    // to a little over half. A signal is a gun or a lamp — unaffected.
    const seeing = channel === 'visual' ? await visibilityFor(observer) : 1;
    // Landmarks first: a light is a light, whatever else has it listed.
    const candidates = this.sightables();
    return this.sightingsAmong(
      here, from.sightHeightFor(observer), channel, hourIndex, candidates, seeing, from,
    );
  }

  /**
   * ⭐ The sighting core, SYNCHRONOUS: which of `candidates` an eye at
   * `eye` metres over `here` perceives on `channel` — curvature for sight
   * (scaled by `seeing`, the weather's factor), a flat range for a signal —
   * plus this hour's seeded traffic. {@link contactsFrom} feeds it this
   * sea's registry; the horizon (`PerceptionApi.horizonFor`, which cannot
   * wait) feeds it the resident craft, from a deck or from a height ashore.
   * `exclude` is the observer's own craft.
   */
  public sightingsAmong(
    here: GeoPosition,
    eye: number,
    channel: SightingChannel,
    hourIndex: number,
    candidates: readonly Sighted[],
    seeing: number,
    exclude: Stuff | null = null,
  ): Contact[] {
    const signalNm = numSetting('expanse.signalRangeNm', 12);
    const rangeFor = (targetM: number): number =>
      channel === 'signal' ? signalNm : this.sightRangeNm(eye, targetM) * seeing;

    const out: Contact[] = [];
    const seen = new Set<string>();
    for (const { craft: c, fixed } of candidates) {
      if (c.stuffId === exclude?.stuffId || seen.has(c.stuffId) || c.isDestroyed()) continue;
      const at = c.getExpansePosition();
      if (at === null) continue;
      const d = here.distanceNm(at);
      if (d > rangeFor(c.getTargetHeightM())) continue;
      seen.add(c.stuffId);
      out.push({
        craft: c,
        name: MixinApi.isNamed(c) ? c.getName() : 'a sail',
        bearingDeg: here.bearingTo(at),
        rangeNm: Math.round(d * 10) / 10,
        channel,
        fixed,
      });
    }

    const weight = this.peekNarrowestAt(here)?.getTraffic() ?? this.trafficDefault;
    const passer = this.trafficAt(here, hourIndex, weight);
    if (passer !== null && passer.rangeNm <= rangeFor(SEEDED_TARGET_HEIGHT_M)) {
      out.push({
        craft: null,
        name: passer.name,
        bearingDeg: passer.bearingDeg,
        rangeNm: passer.rangeNm,
        channel,
        fixed: false,
      });
    }
    return out.sort((a, b) => a.rangeNm - b.rangeNm);
  }

  /**
   * Where a place ashore looks out over this sea from — SYNCHRONOUS: the
   * position of the node whose landing shares the longest path with
   * `placePath` (the estuary's mouth for a height above the estuary), or
   * `null` when no node lands anywhere near it. Reads the compiled nodes;
   * a sea nothing has compiled yet starts compiling and answers `null`
   * this once.
   */
  public peekShorePositionFor(placePath: string): GeoPosition | null {
    if (this.compiled === null) void this.compile().catch(() => undefined);
    const shared = (a: string, b: string): number => {
      const x = a.split('/');
      const y = b.split('/');
      let n = 0;
      while (n < x.length && n < y.length && x[n] === y[n]) n++;
      return n;
    };
    let best: { n: number; at: GeoPosition } | null = null;
    for (const node of this.loadedNodes) {
      const dest = node.getDestination();
      const at = node.getExpansePosition();
      if (!dest || !at) continue;
      const n = shared(dest, placePath);
      // Sharing only the realm's root is not "near".
      if (n < 4) continue;
      if (best === null || n > best.n) best = { n, at };
    }
    return best?.at ?? null;
  }

  /* ───────────────────────── internals ───────────────────────── */

  /**
   * ⭐ The Structures sited on this sea, stood up from their rows: one
   * with a DECK is a ship and is registered as craft from the start (so a
   * ship that has never sailed is still alongside its landing); one with
   * no deck is a building — a light on a rock — and is a LANDMARK, sighted
   * but never sailing.
   */
  private async loadStructures(): Promise<void> {
    const self = this.getTemplatePath() ?? '';
    const landmarks: (Stuff & Positioned)[] = [];
    // ⭐ The structure catalogue's rows for THIS sea, by key — not a
    // full-table query over every positioned row in the world (maritime
    // review, 2026-10-13). Reading it here also warms the catalogue at
    // boot, which the horizon then reads synchronously.
    const cat = await StuffApi.singleton<Stuff>(TemplatePaths.structureCatalogue).catch(() => null);
    const rows = cat
      ? await (cat as unknown as { structuresOn(p: string): Promise<readonly { path: string; deckHeightM: number | null }[]> })
          .structuresOn(self)
      : [];
    for (const row of rows) {
      try {
        const s = await StuffApi.singleton<Stuff>(row.path);
        if (!MixinApi.isPositioned(s)) continue;
        if (row.deckHeightM !== null) this.register(s);
        else landmarks.push(s);
      } catch {
        /* a broken row contributes nothing */
      }
    }
    this.landmarks = landmarks;
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
    await this.loadStructures();
    return { nodes, bands };
  }
}

const COMPASS_WORDS = [
  'north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west',
] as const;

/** `setting north-east` — a direction the way the water goes. */
function compassWord(deg: number): string {
  return COMPASS_WORDS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

/** How far a weather lets you see, as a fraction of a clear day's range. */
const VISIBILITY: Record<string, number> = {
  clear: 1,
  overcast: 1,
  rain: 0.6,
  snow: 0.4,
  storm: 0.3,
  fog: 0.1,
};

/**
 * The weather's factor on `observer`'s sight: the sky over the room they
 * stand in (`expanse.visibility.<type>` retunes the table). `1` when no
 * sky can be read.
 */
async function visibilityFor(observer: Stuff): Promise<number> {
  const room = MixinApi.isContainable(observer) ? observer.getContainer() : null;
  if (!room || !MixinApi.isContainer(room)) return 1;
  try {
    // ⚠ Deferred: the weather's graph reaches back into this module (the
    // positional lean), and a static import would close the cycle.
    const { WeatherApi } = await import('../../api/weather');
    const type = (await WeatherApi.skyReadFor(room)).currentType;
    return numSetting(`expanse.visibility.${type}`, VISIBILITY[type] ?? 1);
  } catch {
    return 1;
  }
}
