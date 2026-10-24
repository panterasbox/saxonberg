/**
 * RiverLine — ⭐ **a river as a LINE**: one course's length, compiled from
 * its profile once and read by position (river D1).
 *
 * A position on a river is **km from the mouth** (the river mile — the end
 * that does not move, so lengthening the headwaters shifts nothing below)
 * and **how far across** (m from river left). Everything along the line is
 * DERIVED from the authored profile — the nodes' km and elevations, the
 * falls' drops, the course's bed — and every derived fact can be overridden
 * by the author (`stretches:`). Nothing on the line is a room.
 *
 * ## What the compile derives, once
 *
 * - **The step–pool distribution.** The drop of a river is concentrated in
 *   its steps; the pools between are nearly flat. A reach of gradient `S`
 *   puts the fraction `f = (S − S_pool) / (S_step − S_pool)` of its length
 *   in steps (`S_pool` and `S_step` are dials). Steps go to the crossings
 *   between bends first (the riffles); what the crossings cannot absorb is
 *   rapids. Where `f ≥ 1` the whole reach is one cascade.
 * - ⭐ **The meander is a SEEDED field over km**, never a roll: a bend every
 *   half wavelength (`λ ≈ 11 × width`, straightened by gradient — a flat
 *   river wanders, a steep one runs straight), its outside side alternating
 *   from a seeded phase. Pools sit on the outside of bends and riffles at
 *   the crossings, so the pool–riffle sequence and the meander are one
 *   function.
 * - **The channel** swings to the outside of each bend; **the banks** per
 *   side follow — the cut bank (steep or undercut) outside, the point bar
 *   inside, shelving gravel at a crossing, walls in a gorge.
 * - **Hazards**: authored ones, plus a hydraulic below every weir the
 *   course's works name, strainers seeded on the outside of wooded bends,
 *   and an undercut on every undercut bank. **Eddies** on the inside of
 *   each bend and below each obstruction; **collection points** at every
 *   point bar and strainer — where what floats fetches up.
 *
 * Nothing here depends on flow: the current and the depth are the
 * catalogue's per-segment read (`riverStateAt`), from this geometry and the
 * flow of the day. A pack `lib/` value object — the catalogue holds one per
 * course; nothing instances it into the world.
 */

/** River left and river right — as you face DOWNSTREAM. */
export type RiverSide = 'left' | 'right';

/** What a stretch of river is like, in the words a boatman uses. */
export type StretchKind = 'pool' | 'run' | 'riffle' | 'rapid' | 'falls' | 'gorge';

/** How the water moves in a stretch — the physics under the word. */
export type FlowKind = 'pool' | 'run' | 'riffle' | 'rapid' | 'falls';

/** What a river bed is made of. */
export type BedKind = 'ground' | 'gravel' | 'rock' | 'sand' | 'mud';

/** The kinds of bank a river has. */
export type BankKind = 'bar' | 'shelving' | 'steep' | 'undercut' | 'wall' | 'place';

/** The river's own killers that sit at a place on it. */
export type RiverHazardKind = 'strainer' | 'hydraulic' | 'undercut';

/** A position on a course: km from the mouth, m from river left. */
export interface LinePosition {
  course: string;
  km: number;
  across: number;
}

/** One bank of one stretch. */
export interface RiverBank {
  kind: BankKind;
  /** An authored place standing on this bank here (a quay), by name. */
  place?: string;
  /** Can a person walk along it? */
  walkable: boolean;
  /** Can a person climb out onto it from the water? */
  climbable: boolean;
  /** The current at the margin, as a fraction of the channel's. */
  currentFraction: number;
  /** The depth at the margin, as a fraction of the thalweg's. */
  depthFraction: number;
  wooded: boolean;
}

/** One derived stretch of the line. */
export interface RiverStretch {
  /** `<course>:<n>`, source-first — the key the fishery and the ice use. */
  id: string;
  course: string;
  ordinal: number;
  /** The upstream end, km from the mouth (the larger number). */
  upKm: number;
  /** The downstream end, km from the mouth. */
  downKm: number;
  kind: StretchKind;
  flow: FlowKind;
  bed: BedKind;
  /** m per m along the line. */
  gradient: number;
  /** The bend's outside, or `null` at a crossing. */
  outside: RiverSide | null;
  /** Where the channel runs, as a fraction of the width from river left. */
  channelAcross: number;
  banks: Record<RiverSide, RiverBank>;
  /** Snags: 0 (clean) to 1 (choked). */
  obstruction: number;
  /** The bend this stretch is part of, if it is named. */
  bendName?: string;
}

/** A hazard at a place on the line. */
export interface LineHazard {
  /** `<course>:<kind>:<km×1000>:<side>` — stable while the rows are. */
  id: string;
  course: string;
  km: number;
  side: RiverSide;
  kind: RiverHazardKind;
  /** The hazard's row (`/system/water/thing/river-hazard/<kind>` by default). */
  row: string;
  /** True when an author placed it; false when the profile derived it. */
  authored: boolean;
}

/** A holdable spot: slack water, or a bar that catches what floats. */
export interface LineSpot {
  course: string;
  km: number;
  side: RiverSide;
  kind: 'eddy' | 'bar' | 'strainer';
}

/** A bend of the meander. */
export interface LineBend {
  index: number;
  upKm: number;
  downKm: number;
  outside: RiverSide;
  name?: string;
}

/** One node as the compile needs it. */
export interface LineNodeInput {
  name: string;
  km: number;
  elevation: number;
  /** Authored channel width, m, or null. */
  widthM: number | null;
  /** A falls' step at this node, m (0 for none). */
  drop: number;
}

/** A stretch override, already resolved to km. */
export interface LineStretchOverride {
  upKm: number;
  downKm: number;
  kind?: StretchKind;
  bed?: BedKind;
  banks?: 'walls' | Partial<Record<RiverSide, BankKind>>;
}

/** A bank override at a point (`{ at, side, bank: quay }`), resolved to km. */
export interface LineBankOverride {
  km: number;
  side: RiverSide;
  bank: string;
}

/** An authored hazard, resolved to km. */
export interface LineHazardInput {
  km: number;
  side: RiverSide;
  kind: RiverHazardKind;
  row?: string;
}

/** A weir on the course — a hydraulic forms below it. */
export interface LineWeirInput {
  km: number;
  row: string;
}

/** Everything one course's compile reads. */
export interface LineCourseInput {
  key: string;
  bed: BedKind;
  wooded: boolean;
  seed: number;
  nodes: LineNodeInput[];
  stretches: LineStretchOverride[];
  bankOverrides: LineBankOverride[];
  hazards: LineHazardInput[];
  bends: Array<{ km: number; name: string }>;
  weirs: LineWeirInput[];
}

/** The tunable numbers of the compile (`water.river.*`). */
export interface LineDials {
  poolGradient: number;
  stepGradient: number;
  rapidGradient: number;
  /** The fraction of a bend's length the crossing occupies. */
  crossingFraction: number;
  strainerPerKm: number;
}

/** The compile's defaults — the seeded literals behind `water.river.*`. */
export const LINE_DIALS: LineDials = {
  poolGradient: 0.0003,
  stepGradient: 0.02,
  rapidGradient: 0.012,
  crossingFraction: 0.3,
  strainerPerKm: 0.4,
};

/** The row a hazard of each kind is, unless an author names another. */
export const RIVER_HAZARD_ROW_PREFIX = '/system/water/thing/river-hazard';

/** How long a falls' stretch is, km. */
const FALLS_KM = 0.05;
/** How far below a weir its hydraulic sits, km. */
const HYDRAULIC_BELOW_KM = 0.03;
/** The shortest stretch the compile makes, km. */
const MIN_STRETCH_KM = 0.02;

/** A parsed citation: `course:node[±km][,side]`. */
export interface ParsedCitation {
  course: string;
  node: string;
  offsetKm: number;
  side: RiverSide | 'mid' | null;
}

/**
 * One course compiled to a line — see the module header.
 *
 * @internal The water pack's own compile, read through the catalogue
 *   (`lineOf`, `riverStateAt`); never called by an author.
 */
export class RiverLine {
  readonly course: string;
  readonly nodes: readonly LineNodeInput[];
  readonly stretches: readonly RiverStretch[];
  readonly bends: readonly LineBend[];
  readonly hazards: readonly LineHazard[];
  readonly eddies: readonly LineSpot[];
  readonly collections: readonly LineSpot[];
  readonly sourceKm: number;
  readonly mouthKm: number;

  constructor(input: LineCourseInput, dials: LineDials = LINE_DIALS) {
    this.course = input.key;
    this.nodes = input.nodes.map((n) => ({ ...n }));
    this.sourceKm = input.nodes[0]?.km ?? 0;
    this.mouthKm = input.nodes[input.nodes.length - 1]?.km ?? 0;
    const bends: LineBend[] = [];
    const raw = deriveStretches(input, dials, bends);
    const cut = applyOverrides(raw, input, dials);
    this.stretches = cut.map((s, i) => ({ ...s, ordinal: i, id: `${input.key}:${i}` }));
    for (const b of input.bends) {
      const bend = bends.find((x) => x.upKm >= b.km && x.downKm <= b.km);
      if (bend) bend.name = b.name;
    }
    for (const s of this.stretches) {
      const bend = bends.find((x) => x.upKm >= mid(s) && x.downKm <= mid(s));
      if (bend?.name) s.bendName = bend.name;
    }
    this.bends = bends;
    this.hazards = deriveHazards(input, this.stretches, bends, dials);
    const { eddies, collections } = deriveSpots(this.stretches, bends, this.hazards);
    this.eddies = eddies;
    this.collections = collections;
  }

  /* ───────────────────────── citations ───────────────────────── */

  /**
   * Parse `course:node[±km][,side]` — the shipped reach ref (`kestrel:
   * confluence`) is the zero-offset, mid-channel case, so every shipped
   * citation keeps its meaning. A positive offset is DOWNSTREAM.
   */
  static parseCitation(text: string): ParsedCitation | null {
    const m = /^\s*([^:\s]+):([A-Za-z][\w-]*?)(?:([+-])(\d+(?:\.\d+)?))?(?:\s*,\s*(left|right|in|mid))?\s*$/.exec(text);
    if (!m) return null;
    const sign = m[3] === '-' ? -1 : 1;
    const offsetKm = m[4] !== undefined ? sign * Number.parseFloat(m[4]) : 0;
    const sideWord = m[5];
    const side: ParsedCitation['side'] =
      sideWord === 'left' || sideWord === 'right' ? sideWord : sideWord ? 'mid' : null;
    return { course: m[1]!, node: m[2]!, offsetKm, side };
  }

  /** A stretch id (`kestrel:12`) — the read key on a line. */
  static isStretchId(text: string): boolean {
    return /^[^:\s]+:\d+$/.test(text);
  }

  /** The km of a node plus a downstream offset, or `null` for an unknown node. */
  kmOf(node: string, offsetKm = 0): number | null {
    const n = this.nodes.find((x) => x.name === node);
    if (!n) return null;
    return clamp(n.km - offsetKm, this.mouthKm, this.sourceKm);
  }

  /** The position a parsed citation names on this line. */
  positionOf(cite: ParsedCitation, widthM: number): LinePosition | null {
    const km = this.kmOf(cite.node, cite.offsetKm);
    if (km === null) return null;
    return { course: this.course, km, across: this.acrossFor(km, cite.side, widthM) };
  }

  /** River left is 0; a margin is a tenth of the width in; mid is the channel. */
  acrossFor(km: number, side: RiverSide | 'mid' | null, widthM: number): number {
    if (side === 'left') return widthM * 0.1;
    if (side === 'right') return widthM * 0.9;
    return widthM * (this.stretchAt(km)?.channelAcross ?? 0.5);
  }

  /* ───────────────────────── geometry ───────────────────────── */

  lengthKm(): number {
    return this.sourceKm - this.mouthKm;
  }

  /** The stretch at a km (the upstream one at a boundary). */
  stretchAt(km: number): RiverStretch | null {
    const k = clamp(km, this.mouthKm, this.sourceKm);
    let lo = 0;
    let hi = this.stretches.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      const s = this.stretches[m]!;
      if (k > s.upKm) hi = m - 1;
      else if (k < s.downKm) lo = m + 1;
      else return s;
    }
    return this.stretches[this.stretches.length - 1] ?? null;
  }

  stretchById(id: string): RiverStretch | null {
    const n = Number.parseInt(id.slice(id.lastIndexOf(':') + 1), 10);
    return Number.isFinite(n) ? (this.stretches[n] ?? null) : null;
  }

  /** The stretches between two km, in the order you would meet them going from `a` to `b`. */
  stretchesBetween(a: number, b: number): RiverStretch[] {
    const hiKm = Math.max(a, b);
    const loKm = Math.min(a, b);
    const out = this.stretches.filter((s) => s.downKm < hiKm && s.upKm > loKm);
    return a >= b ? out : out.reverse();
  }

  /** The two nodes a km lies between — upstream first — and how far along. */
  nodePairAt(km: number): { up: LineNodeInput; down: LineNodeInput; t: number } {
    const nodes = this.nodes;
    for (let i = 0; i + 1 < nodes.length; i++) {
      const up = nodes[i]!;
      const down = nodes[i + 1]!;
      if (km <= up.km && km >= down.km) {
        const span = up.km - down.km;
        return { up, down, t: span > 0 ? (up.km - km) / span : 0 };
      }
    }
    const last = nodes[nodes.length - 1]!;
    return { up: last, down: last, t: 0 };
  }

  /** The node nearest a km. */
  nearestNode(km: number): LineNodeInput {
    let best = this.nodes[0]!;
    for (const n of this.nodes) if (Math.abs(n.km - km) < Math.abs(best.km - km)) best = n;
    return best;
  }

  /** The bed's elevation at a km, m — falls included. */
  elevationAtKm(km: number): number {
    const { up, down, t } = this.nodePairAt(km);
    if (up === down) return up.elevation;
    if (up.drop <= 0) return up.elevation + (down.elevation - up.elevation) * t;
    // Below a falls the reach starts at the foot of the step.
    const foot = up.km - FALLS_KM;
    if (km >= foot) return up.elevation - up.drop * ((up.km - km) / FALLS_KM);
    const top = up.elevation - up.drop;
    const below = (foot - km) / Math.max(1e-9, foot - down.km);
    return top + (down.elevation - top) * below;
  }

  /** Authored width at a km, interpolated; `null` when the course authors none. */
  authoredWidthAt(km: number): number | null {
    return widthAt(this.nodes, km);
  }

  bendAt(km: number): LineBend | null {
    return this.bends.find((b) => b.upKm >= km && b.downKm <= km) ?? null;
  }

  /** Every hazard between two km, optionally only on one side. */
  hazardsBetween(a: number, b: number, side?: RiverSide): LineHazard[] {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    const out = this.hazards.filter(
      (h) => h.km <= hi && h.km >= lo && (side === undefined || h.side === side),
    );
    return a >= b ? out.sort((x, y) => y.km - x.km) : out.sort((x, y) => x.km - y.km);
  }

  /** Every eddy between two km, in the order met going from `a` to `b`. */
  eddiesBetween(a: number, b: number): LineSpot[] {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    const out = this.eddies.filter((e) => e.km <= hi && e.km >= lo);
    return a >= b ? out.sort((x, y) => y.km - x.km) : out.sort((x, y) => x.km - y.km);
  }

  /** The next spot downstream of `km` where what floats fetches up, or `null`. */
  collectsAt(km: number): LineSpot | null {
    let best: LineSpot | null = null;
    for (const c of this.collections) {
      if (c.km < km && (best === null || c.km > best.km)) best = c;
    }
    return best;
  }

  /**
   * ⭐ How far along the line can be seen from here, km, each way — to the
   * end of the bend you are in and half way round the next (a bank of trees
   * on the outside of a bend closes the view), or to the horizon by height
   * on a straight reach (`3.57·√h` km).
   */
  sightKm(km: number, eyeHeightM: number): { upKm: number; downKm: number } {
    const horizon = 3.57 * Math.sqrt(Math.max(0.5, eyeHeightM));
    const bend = this.bendAt(km);
    if (!bend) return { upKm: horizon, downKm: horizon };
    const idx = bend.index;
    const nextDown = this.bends[idx + 1];
    const nextUp = this.bends[idx - 1];
    const down = km - bend.downKm + (nextDown ? (nextDown.upKm - nextDown.downKm) / 2 : 0);
    const up = bend.upKm - km + (nextUp ? (nextUp.upKm - nextUp.downKm) / 2 : 0);
    return { upKm: Math.min(horizon, up), downKm: Math.min(horizon, down) };
  }
}

/* ───────────────────────── the compile ───────────────────────── */

function mid(s: { upKm: number; downKm: number }): number {
  return (s.upKm + s.downKm) / 2;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function widthAt(nodes: readonly LineNodeInput[], km: number): number | null {
  const known = nodes.filter((n) => n.widthM !== null);
  if (known.length === 0) return null;
  let above: LineNodeInput | null = null;
  let below: LineNodeInput | null = null;
  for (const n of known) {
    if (n.km >= km && (above === null || n.km < above.km)) above = n;
    if (n.km <= km && (below === null || n.km > below.km)) below = n;
  }
  if (above && below && above !== below) {
    const t = (above.km - km) / (above.km - below.km);
    return above.widthM! + (below.widthM! - above.widthM!) * t;
  }
  return (above ?? below)!.widthM!;
}

/**
 * ⭐ A seeded hash in [0, 1) — FNV-1a over the seed and the parts. The
 * river is the same river for everyone, every time it compiles.
 */
function seeded(seed: number, ...parts: Array<string | number>): number {
  let h = (2166136261 ^ seed) >>> 0;
  const text = parts.join('|');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 8) / 0x1000000;
}

type Draft = Omit<RiverStretch, 'id' | 'ordinal'>;

function banksFor(
  flow: FlowKind,
  outside: RiverSide | null,
  wooded: boolean,
  undercut: boolean,
): Record<RiverSide, RiverBank> {
  const shelving = (): RiverBank => ({
    kind: 'shelving', walkable: true, climbable: true,
    currentFraction: 0.5, depthFraction: 0.4, wooded,
  });
  if (outside === null) return { left: shelving(), right: shelving() };
  const inside: RiverSide = outside === 'left' ? 'right' : 'left';
  const cut: RiverBank = {
    kind: undercut ? 'undercut' : 'steep',
    walkable: true,
    climbable: false,
    currentFraction: 0.9,
    depthFraction: 0.85,
    wooded,
  };
  const bar: RiverBank = flow === 'pool' || flow === 'run'
    ? { kind: 'bar', walkable: true, climbable: true, currentFraction: 0.25, depthFraction: 0.2, wooded: false }
    : shelving();
  return { [outside]: cut, [inside]: bar } as Record<RiverSide, RiverBank>;
}

function wall(): RiverBank {
  return {
    kind: 'wall', walkable: false, climbable: false,
    currentFraction: 0.8, depthFraction: 0.8, wooded: false,
  };
}

/** Lay the meander and the step–pool sequence down each node pair. */
function deriveStretches(input: LineCourseInput, dials: LineDials, bends: LineBend[]): Draft[] {
  const out: Draft[] = [];
  const nodes = input.nodes;
  const phase = seeded(input.seed, input.key, 'phase') < 0.5 ? 0 : 1;
  let bendIndex = 0;
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    let top = a.km;
    if (a.drop > 0) {
      out.push({
        course: input.key, upKm: a.km, downKm: a.km - FALLS_KM, kind: 'falls', flow: 'falls',
        bed: 'rock', gradient: a.drop / (FALLS_KM * 1000), outside: null, channelAcross: 0.5,
        banks: { left: wall(), right: wall() }, obstruction: 0,
      });
      top = a.km - FALLS_KM;
    }
    const lengthKm = top - b.km;
    if (lengthKm <= 0) continue;
    const dropM = Math.max(0, a.elevation - a.drop - b.elevation);
    const S = dropM / (lengthKm * 1000);
    const f = clamp((S - dials.poolGradient) / (dials.stepGradient - dials.poolGradient), 0, 1);
    const cascade = f >= 1;
    // ⭐ A flat river wanders and a steep one runs straight: the bend
    // stretches out with gradient.
    let km = top;
    while (km - b.km > MIN_STRETCH_KM) {
      const width = widthAt(nodes, km) ?? 10;
      const bendKm = Math.max(0.08, ((11 * width) / 2 / 1000) * (1 + 100 * S));
      const bendDown = Math.max(b.km, km - bendKm);
      // A remainder too short to be a bend of its own folds into this one.
      const end = bendDown - b.km < bendKm * 0.3 ? b.km : bendDown;
      const bendLen = km - end;
      const outside: RiverSide = (bendIndex + phase) % 2 === 0 ? 'left' : 'right';
      bends.push({ index: bendIndex, upKm: km, downKm: end, outside });
      const woodedHere = input.wooded;
      const undercut = woodedHere && seeded(input.seed, input.key, 'undercut', bendIndex) < 0.3;
      const obstruction = woodedHere ? seeded(input.seed, input.key, 'snag', bendIndex) * 0.6 : 0;
      const bed = input.bed === 'ground' ? 'gravel' : input.bed;
      const push = (up: number, down: number, flow: FlowKind, grad: number, side: RiverSide | null): void => {
        if (up - down <= 1e-9) return;
        out.push({
          course: input.key, upKm: up, downKm: down,
          kind: flow, flow, bed,
          gradient: grad,
          outside: side,
          channelAcross: side === null ? 0.5 : side === 'left' ? 0.15 : 0.85,
          banks: banksFor(flow, side, woodedHere, undercut),
          obstruction,
        });
      };
      if (cascade) {
        push(km, end, 'rapid', S, outside);
      } else {
        const cross = dials.crossingFraction;
        const crossKm = bendLen * cross;
        if (f <= cross) {
          // The steps fit in the crossing: it carries the drop the pools do not.
          const poolGrad = dials.poolGradient;
          const crossGrad = (S - poolGrad * (1 - cross)) / cross;
          const crossFlow: FlowKind =
            crossGrad >= dials.rapidGradient || bed === 'rock' ? 'rapid' : 'riffle';
          const restKm = bendLen - crossKm;
          push(km, km - crossKm, crossFlow, crossGrad, null);
          push(km - crossKm, km - crossKm - restKm * 0.4, 'run', poolGrad * 3, outside);
          push(km - crossKm - restKm * 0.4, end, 'pool', poolGrad, outside);
        } else {
          // More step than crossing: the crossing is a step, and a rapid
          // runs on into the bend before the pool.
          const extraKm = bendLen * (f - cross);
          push(km, km - crossKm, 'rapid', dials.stepGradient, null);
          push(km - crossKm, km - crossKm - extraKm, 'rapid', dials.stepGradient, outside);
          push(km - crossKm - extraKm, end, 'pool', dials.poolGradient, outside);
        }
      }
      km = end;
      bendIndex++;
    }
  }
  return out;
}

/** Split at every override's ends and apply the overrides. */
function applyOverrides(stretches: Draft[], input: LineCourseInput, dials: LineDials): Draft[] {
  let out = stretches.map((s) => ({ ...s, banks: { left: { ...s.banks.left }, right: { ...s.banks.right } } }));
  const cuts = new Set<number>();
  for (const o of input.stretches) {
    cuts.add(o.upKm);
    cuts.add(o.downKm);
  }
  for (const c of cuts) {
    const next: Draft[] = [];
    for (const s of out) {
      if (c < s.upKm - MIN_STRETCH_KM / 2 && c > s.downKm + MIN_STRETCH_KM / 2) {
        next.push({ ...s, downKm: c, banks: { left: { ...s.banks.left }, right: { ...s.banks.right } } });
        next.push({ ...s, upKm: c, banks: { left: { ...s.banks.left }, right: { ...s.banks.right } } });
      } else next.push(s);
    }
    out = next;
  }
  for (const o of input.stretches) {
    for (const s of out) {
      const m = mid(s);
      if (m > o.upKm || m < o.downKm) continue;
      if (o.bed) s.bed = o.bed;
      if (o.kind) {
        s.kind = o.kind;
        if (o.kind !== 'gorge') s.flow = o.kind;
        // ⭐ An authored riffle is a riffle in the WATER too, not only its
        // name (the drive's ford, a pool's gradient relabelled, was a slow
        // deep pool that went over a wader's head before it ever took
        // their feet): the drop gathers into the step.
        if (o.kind === 'riffle') s.gradient = Math.max(s.gradient, dials.rapidGradient / 2);
      }
      if (o.banks === 'walls') {
        s.banks = { left: wall(), right: wall() };
        if (s.kind !== 'falls') s.kind = 'gorge';
      } else if (o.banks) {
        for (const side of ['left', 'right'] as const) {
          const kind = o.banks[side];
          if (kind) s.banks[side] = bankOfKind(kind, s.banks[side].wooded);
        }
      }
      // A rock bed at a step is white water whatever the gradient.
      if (s.bed === 'rock' && s.flow === 'riffle') {
        s.flow = 'rapid';
        if (s.kind === 'riffle') s.kind = 'rapid';
      }
      if (s.flow === 'riffle' && s.gradient >= dials.rapidGradient) {
        s.flow = 'rapid';
        if (s.kind === 'riffle') s.kind = 'rapid';
      }
    }
  }
  for (const b of input.bankOverrides) {
    const s = out.find((x) => x.upKm >= b.km && x.downKm <= b.km);
    if (!s) continue;
    s.banks[b.side] = {
      kind: 'place', place: b.bank, walkable: true, climbable: true,
      currentFraction: s.banks[b.side].currentFraction,
      depthFraction: s.banks[b.side].depthFraction,
      wooded: false,
    };
  }
  return out;
}

function bankOfKind(kind: BankKind, wooded: boolean): RiverBank {
  switch (kind) {
    case 'wall':
      return wall();
    case 'bar':
      return { kind, walkable: true, climbable: true, currentFraction: 0.25, depthFraction: 0.2, wooded: false };
    case 'shelving':
      return { kind, walkable: true, climbable: true, currentFraction: 0.5, depthFraction: 0.4, wooded };
    case 'steep':
    case 'undercut':
      return { kind, walkable: true, climbable: false, currentFraction: 0.9, depthFraction: 0.85, wooded };
    default:
      return { kind: 'place', place: kind, walkable: true, climbable: true, currentFraction: 0.5, depthFraction: 0.5, wooded: false };
  }
}

function hazardId(course: string, kind: string, km: number, side: RiverSide): string {
  return `${course}:${kind}:${Math.round(km * 1000)}:${side}`;
}

function deriveHazards(
  input: LineCourseInput,
  stretches: readonly RiverStretch[],
  bends: readonly LineBend[],
  dials: LineDials,
): LineHazard[] {
  const out: LineHazard[] = [];
  const add = (km: number, side: RiverSide, kind: RiverHazardKind, row: string | undefined, authored: boolean): void => {
    const id = hazardId(input.key, kind, km, side);
    if (out.some((h) => h.id === id)) return;
    out.push({
      id, course: input.key, km, side, kind,
      row: row ?? `${RIVER_HAZARD_ROW_PREFIX}/${kind}`,
      authored,
    });
  };
  for (const h of input.hazards) add(h.km, h.side, h.kind, h.row, true);
  // ⭐ Every weir somebody builds makes a drowning machine below it.
  for (const w of input.weirs) {
    const km = Math.max(input.nodes[input.nodes.length - 1]?.km ?? 0, w.km - HYDRAULIC_BELOW_KM);
    add(km, 'left', 'hydraulic', undefined, false);
    add(km, 'right', 'hydraulic', undefined, false);
  }
  const at = (km: number): RiverStretch | undefined =>
    stretches.find((s) => s.upKm >= km && s.downKm <= km);
  for (const bend of bends) {
    const apex = (bend.upKm + bend.downKm) / 2;
    const s = at(apex);
    if (!s || s.kind === 'gorge' || s.kind === 'falls') continue;
    const len = bend.upKm - bend.downKm;
    if (input.wooded && seeded(input.seed, input.key, 'strainer', bend.index) < dials.strainerPerKm * len) {
      add(apex, bend.outside, 'strainer', undefined, false);
    }
    if (s.banks[bend.outside].kind === 'undercut') add(apex, bend.outside, 'undercut', undefined, false);
  }
  return out.sort((a, b) => b.km - a.km);
}

function deriveSpots(
  stretches: readonly RiverStretch[],
  bends: readonly LineBend[],
  hazards: readonly LineHazard[],
): { eddies: LineSpot[]; collections: LineSpot[] } {
  const eddies: LineSpot[] = [];
  const collections: LineSpot[] = [];
  const at = (km: number): RiverStretch | undefined =>
    stretches.find((s) => s.upKm >= km && s.downKm <= km);
  for (const bend of bends) {
    const inside: RiverSide = bend.outside === 'left' ? 'right' : 'left';
    const apex = (bend.upKm + bend.downKm) / 2;
    const below = apex - (bend.upKm - bend.downKm) * 0.2;
    const s = at(below);
    if (!s || s.kind === 'gorge' || s.kind === 'falls') continue;
    eddies.push({ course: s.course, km: below, side: inside, kind: 'eddy' });
    if (s.banks[inside].kind === 'bar') {
      collections.push({ course: s.course, km: below, side: inside, kind: 'bar' });
    }
  }
  for (const h of hazards) {
    if (h.kind === 'strainer') collections.push({ course: h.course, km: h.km, side: h.side, kind: 'strainer' });
    if (h.authored) {
      const s = at(h.km - 0.02);
      if (s && s.kind !== 'gorge' && s.kind !== 'falls') {
        eddies.push({ course: h.course, km: h.km - 0.02, side: h.side, kind: 'eddy' });
      }
    }
  }
  eddies.sort((a, b) => b.km - a.km);
  collections.sort((a, b) => b.km - a.km);
  return { eddies, collections };
}
