/**
 * navSelectors — views over your map's copy (navigation card D2).
 *
 * ⭐ The ONLY readers of `mapCopy` outside the slice. Every function here
 * is pure: it derives from the claims on read and stores nothing, and a
 * view never corrects a claim — where two claims disagree, both are
 * drawn (location-graph.md § claims append and nothing is corrected).
 *
 * Paths are used as KEYS only, never displayed: no view puts one where a
 * player reads it (client-knowledge-model-slate: *keys are not display*).
 * A path reaches the player only as the tooltip's spoiler block.
 *
 * Memoized on the copy object's identity — the slice replaces the object
 * on every change — so a burst of claims costs one re-index.
 */

import type {
  LocalitiesSection,
  WayState,
  WireClaim,
} from "@saxonberg/types";
import type { CopyClaim } from "./navSlice";

type Channel = WireClaim["channel"];

/** A compass or vertical word → its step on the grid (`dz` for up/down). */
export const DIRECTION_VECTORS: Readonly<
  Record<string, readonly [dx: number, dy: number, dz: number]>
> = {
  north: [0, 1, 0],
  south: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  northeast: [1, 1, 0],
  northwest: [-1, 1, 0],
  southeast: [1, -1, 0],
  southwest: [-1, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

/** The ten arms of the rose, in drawing order. */
export const ROSE_DIRECTIONS = [
  "northwest",
  "north",
  "northeast",
  "west",
  "east",
  "southwest",
  "south",
  "southeast",
  "up",
  "down",
] as const;

const SHORT: Record<string, string> = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
  u: "up",
  d: "down",
};

/** A direction word in its long form (`ne` → `northeast`); other words unchanged. */
export function longDirection(dir: string): string {
  const d = dir.toLowerCase();
  return SHORT[d] ?? d;
}

/** How a fact about a place was learned, with its dates. */
export interface ViewSource {
  channel: Channel;
  firstSeen: number;
  lastSeen: number;
  toldBy?: string;
}

/** A place your map holds. */
export interface ViewPlace {
  /** The place's path — a KEY, never shown. */
  key: string;
  name: string;
  keywords: string[];
  group?: string;
  /** The Locality document the claim is filed in. */
  locality: string;
  /** Whether a claim gave it a cell in its zone. */
  placed: boolean;
  zone?: string;
  x: number;
  y: number;
  level: number;
  /** ⭐ `walked` — you have been there; `known` — seen, searched, told, charted or published. */
  tier: "walked" | "known";
  sources: ViewSource[];
  firstSeen: number;
  lastSeen: number;
  /** The last time you looked here (a `seen` or `searched` place claim). */
  lastLook?: number;
}

/**
 * How an edge draws:
 * - `link` — to an adjacent cell you know;
 * - `track` — to a cell you know, more than one cell away (drawn along its bearing);
 * - `leaves` — to a place your map has in another zone;
 * - `opening` — to somewhere you do not know (a stub ending `?`);
 * - `vertical` — up or down (a corner glyph);
 * - `named` — a way with no compass bearing (`out`, `pumphouse`).
 */
export type EdgeShape = "link" | "track" | "leaves" | "opening" | "vertical" | "named";

/** One way your map holds from a place, in one direction, to one far side. */
export interface ViewEdge {
  /** A stable key for drawing (`<from>|<dir>|<variant>`). */
  id: string;
  from: string;
  dir: string;
  shape: EdgeShape;
  /** The far place's key, when your map knows it. */
  to?: string;
  /** The last known state — of the claim seen latest. */
  state?: WayState;
  /** ⭐ Not seen the last time you looked at its place. */
  stale: boolean;
  /** Your first record of it came from a search. */
  foundBySearching: boolean;
  /** Another claim for this `(place, direction)` names a different far side. */
  conflict: boolean;
  /** 0 for the first far side of a `(place, direction)`, 1… for the others (drawn offset). */
  variant: number;
  /** For `vertical`: whether you know the place above or below. */
  farKnown?: boolean;
  claims: WireClaim[];
  firstSeen: number;
  lastSeen: number;
}

export interface LevelExtent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** ⭐ The zone as your map knows it — never as the world is. */
export interface ZoneView {
  zone: string;
  places: ViewPlace[];
  /** Known in this zone's Localities, with no cell yet — listed, never guessed. */
  unplaced: ViewPlace[];
  edges: ViewEdge[];
  /** The levels you have found, ascending. */
  levels: number[];
  /** What you have found on each level. */
  extent: Record<number, LevelExtent>;
  counts: { walked: number; known: number; openings: number; oldest?: number };
}

// ---------------------------------------------------------------------------
// The index — one per copy object
// ---------------------------------------------------------------------------

interface CopyIndex {
  /** place key → its place claims (with the document each is filed in). */
  placeClaims: Map<string, CopyClaim[]>;
  /** place key → its edge claims. */
  edgeClaims: Map<string, WireClaim[]>;
  /** address → its locality claim. */
  localities: Map<string, WireClaim>;
  /** every claim, by document. */
  byDocument: Map<string, WireClaim[]>;
  places: Map<string, ViewPlace>;
  zoneViews: Map<string, ZoneView>;
}

const INDEX = new WeakMap<Record<string, CopyClaim>, CopyIndex>();

const pathOf = (p: WireClaim["place"] | null | undefined): string | undefined =>
  p === null || p === undefined ? undefined : typeof p === "string" ? p : p.path;

function indexOf(copy: Record<string, CopyClaim>): CopyIndex {
  const hit = INDEX.get(copy);
  if (hit) return hit;
  const idx: CopyIndex = {
    placeClaims: new Map(),
    edgeClaims: new Map(),
    localities: new Map(),
    byDocument: new Map(),
    places: new Map(),
    zoneViews: new Map(),
  };
  for (const entry of Object.values(copy)) {
    const { claim, locality } = entry;
    const docList = idx.byDocument.get(locality) ?? [];
    docList.push(claim);
    idx.byDocument.set(locality, docList);
    const key = pathOf(claim.place);
    if (key === undefined) continue;
    if (claim.kind === "place") {
      const list = idx.placeClaims.get(key) ?? [];
      list.push(entry);
      idx.placeClaims.set(key, list);
    } else if (claim.kind === "edge") {
      const list = idx.edgeClaims.get(key) ?? [];
      list.push(claim);
      idx.edgeClaims.set(key, list);
    } else if (claim.kind === "locality") {
      const prev = idx.localities.get(key);
      if (!prev || claim.lastSeen > prev.lastSeen) idx.localities.set(key, claim);
    }
  }
  for (const [key, entries] of idx.placeClaims) {
    idx.places.set(key, placeFrom(key, entries));
  }
  INDEX.set(copy, idx);
  return idx;
}

const LOOK_CHANNELS: ReadonlySet<Channel> = new Set(["seen", "searched"]);

function placeFrom(key: string, entries: CopyClaim[]): ViewPlace {
  // Latest first: the newest claim names the place and, among the
  // claims that carry one, gives its cell.
  const sorted = [...entries].sort((a, b) => b.claim.lastSeen - a.claim.lastSeen);
  const named = sorted.find((e) => e.claim.name)?.claim;
  const cell = sorted.find(
    (e) => typeof e.claim.at?.x === "number" && typeof e.claim.at?.y === "number",
  )?.claim.at;
  const keywords = sorted.find((e) => e.claim.keywords?.length)?.claim.keywords ?? [];
  const group = sorted.find((e) => e.claim.group)?.claim.group;
  const zone = sorted.find((e) => e.claim.at?.zone)?.claim.at?.zone?.path;
  let lastLook: number | undefined;
  for (const e of entries) {
    if (LOOK_CHANNELS.has(e.claim.channel)) {
      lastLook = Math.max(lastLook ?? 0, e.claim.lastSeen);
    }
  }
  return {
    key,
    name: named?.name ?? "somewhere",
    keywords,
    ...(group ? { group } : {}),
    locality: sorted[0]!.locality,
    placed: cell !== undefined,
    ...(zone ? { zone } : {}),
    x: cell?.x ?? 0,
    y: cell?.y ?? 0,
    level: cell?.level ?? cell?.z ?? 0,
    tier: entries.some((e) => e.claim.channel === "walked") ? "walked" : "known",
    sources: sorted.map((e) => ({
      channel: e.claim.channel,
      firstSeen: e.claim.firstSeen,
      lastSeen: e.claim.lastSeen,
      ...(e.claim.toldBy ? { toldBy: e.claim.toldBy.path } : {}),
    })),
    firstSeen: Math.min(...entries.map((e) => e.claim.firstSeen)),
    lastSeen: Math.max(...entries.map((e) => e.claim.lastSeen)),
    ...(lastLook !== undefined ? { lastLook } : {}),
  };
}

// ---------------------------------------------------------------------------
// The zone
// ---------------------------------------------------------------------------

/**
 * ⭐ The zone `zonePath` as your map knows it. `addresses` are the
 * Localities covering where you stand; a place claim filed under one of
 * them with no cell is listed as *known, not yet placed*.
 */
export function zoneView(
  copy: Record<string, CopyClaim>,
  zonePath: string,
  addresses: readonly string[] = [],
): ZoneView {
  const idx = indexOf(copy);
  const memoKey = `${zonePath}\u0000${addresses.join("\u0000")}`;
  const hit = idx.zoneViews.get(memoKey);
  if (hit) return hit;

  const places: ViewPlace[] = [];
  const unplaced: ViewPlace[] = [];
  const addressSet = new Set(addresses);
  for (const place of idx.places.values()) {
    if (place.placed && place.zone === zonePath) places.push(place);
    else if (!place.placed && addressSet.has(place.locality)) unplaced.push(place);
  }
  const inZone = new Map(places.map((p) => [p.key, p]));

  const edges: ViewEdge[] = [];
  for (const from of places) {
    const claims = idx.edgeClaims.get(from.key);
    if (!claims) continue;
    edges.push(...edgesFrom(from, claims, inZone, idx.places));
  }

  // A link drawn from both ends is ONE line: keep the pair once, with
  // every claim behind it, in its latest state.
  const merged = mergeReciprocal(edges);

  const levels = [...new Set(places.map((p) => p.level))].sort((a, b) => a - b);
  const extent: Record<number, LevelExtent> = {};
  for (const p of places) {
    const e = extent[p.level];
    if (!e) extent[p.level] = { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y };
    else {
      e.minX = Math.min(e.minX, p.x);
      e.maxX = Math.max(e.maxX, p.x);
      e.minY = Math.min(e.minY, p.y);
      e.maxY = Math.max(e.maxY, p.y);
    }
  }
  const relied = [...places.map((p) => p.lastSeen), ...merged.map((e) => e.lastSeen)];
  const view: ZoneView = {
    zone: zonePath,
    places,
    unplaced,
    edges: merged,
    levels,
    extent,
    counts: {
      walked: places.filter((p) => p.tier === "walked").length,
      known: places.filter((p) => p.tier === "known").length,
      openings: merged.filter((e) => e.shape === "opening").length,
      ...(relied.length ? { oldest: Math.min(...relied) } : {}),
    },
  };
  idx.zoneViews.set(memoKey, view);
  return view;
}

function edgesFrom(
  from: ViewPlace,
  claims: WireClaim[],
  inZone: Map<string, ViewPlace>,
  everywhere: Map<string, ViewPlace>,
): ViewEdge[] {
  const byDir = new Map<string, WireClaim[]>();
  for (const c of claims) {
    if (c.dir === undefined) continue;
    const dir = longDirection(c.dir);
    const list = byDir.get(dir) ?? [];
    list.push(c);
    byDir.set(dir, list);
  }
  const out: ViewEdge[] = [];
  for (const [dir, group] of byDir) {
    // Variants: one per far side named. `to` (a durable handle) wins; a
    // far row's path (`toLabel`) is the same handle for a template place
    // — the server's own planner makes the same join (KnowledgeGraph).
    const variants = new Map<string, WireClaim[]>();
    for (const c of group) {
      const far = pathOf(c.to) ?? pathOf(c.toLabel) ?? "";
      const list = variants.get(far) ?? [];
      list.push(c);
      variants.set(far, list);
    }
    // A claim with no far side at all joins the variant that names one,
    // when there is exactly one: it is the same way, seen less well.
    const unnamed = variants.get("");
    const named = [...variants.keys()].filter((k) => k !== "");
    if (unnamed && named.length === 1) {
      variants.get(named[0]!)!.push(...unnamed);
      variants.delete("");
    }
    const conflict = variants.size > 1;
    let variant = 0;
    const ordered = [...variants.entries()].sort(
      (a, b) => minFirst(a[1]) - minFirst(b[1]),
    );
    for (const [far, vClaims] of ordered) {
      out.push(
        edgeOf(from, dir, far || undefined, vClaims, conflict, variant++, inZone, everywhere),
      );
    }
  }
  return out;
}

const minFirst = (cs: WireClaim[]): number => Math.min(...cs.map((c) => c.firstSeen));

function edgeOf(
  from: ViewPlace,
  dir: string,
  far: string | undefined,
  claims: WireClaim[],
  conflict: boolean,
  variant: number,
  inZone: Map<string, ViewPlace>,
  everywhere: Map<string, ViewPlace>,
): ViewEdge {
  const latest = [...claims].sort((a, b) => b.lastSeen - a.lastSeen)[0]!;
  const earliest = [...claims].sort((a, b) => a.firstSeen - b.firstSeen)[0]!;
  const lastSeen = latest.lastSeen;
  const vec = DIRECTION_VECTORS[dir];
  const farHere = far ? inZone.get(far) : undefined;
  const farElsewhere = far ? everywhere.get(far) : undefined;
  let shape: EdgeShape;
  if (vec && vec[2] !== 0) shape = "vertical";
  else if (farHere && farHere.level === from.level) {
    const adjacent =
      Math.abs(farHere.x - from.x) <= 1 && Math.abs(farHere.y - from.y) <= 1;
    shape = adjacent ? "link" : "track";
  } else if (!vec) shape = farElsewhere?.placed && farElsewhere.zone !== from.zone ? "leaves" : "named";
  else if (farElsewhere?.placed && farElsewhere.zone !== from.zone) shape = "leaves";
  else shape = "opening";
  return {
    id: `${from.key}|${dir}|${variant}`,
    from: from.key,
    dir,
    shape,
    ...(farHere || farElsewhere ? { to: far } : {}),
    ...(latest.state ? { state: latest.state } : {}),
    stale: from.lastLook !== undefined && lastSeen < from.lastLook,
    foundBySearching: earliest.channel === "searched",
    conflict,
    variant,
    ...(shape === "vertical" ? { farKnown: farElsewhere !== undefined } : {}),
    claims,
    firstSeen: earliest.firstSeen,
    lastSeen,
  };
}

function mergeReciprocal(edges: ViewEdge[]): ViewEdge[] {
  const out: ViewEdge[] = [];
  const linkAt = new Map<string, ViewEdge>();
  for (const e of edges) {
    if ((e.shape !== "link" && e.shape !== "track") || e.to === undefined) {
      out.push(e);
      continue;
    }
    const pair = [e.from, e.to].sort().join("\u0000");
    const prev = linkAt.get(pair);
    if (!prev) {
      const copy = { ...e, claims: [...e.claims] };
      linkAt.set(pair, copy);
      out.push(copy);
      continue;
    }
    prev.claims.push(...e.claims);
    prev.firstSeen = Math.min(prev.firstSeen, e.firstSeen);
    prev.stale = prev.stale && e.stale;
    prev.foundBySearching = prev.foundBySearching && e.foundBySearching;
    prev.conflict = prev.conflict || e.conflict;
    if (e.lastSeen > prev.lastSeen) {
      prev.lastSeen = e.lastSeen;
      if (e.state) prev.state = e.state;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// One place, one Locality, the breadcrumb
// ---------------------------------------------------------------------------

/** The place your map holds at a cell of a zone (where you stand), if any. */
export function placeAt(
  copy: Record<string, CopyClaim>,
  zonePath: string,
  at: { x: number; y: number; z: number },
): ViewPlace | undefined {
  for (const p of indexOf(copy).places.values()) {
    if (p.placed && p.zone === zonePath && p.x === at.x && p.y === at.y && p.level === at.z) {
      return p;
    }
  }
  return undefined;
}

/** A place by its key. */
export function placeByKey(
  copy: Record<string, CopyClaim>,
  key: string,
): ViewPlace | undefined {
  return indexOf(copy).places.get(key);
}

/** What your map holds of a Locality: its claim, and how much of your map lies there. */
export interface LocalityKnowledge {
  address: string;
  claim?: WireClaim;
  /** Claims filed in documents at or under this address. */
  claims: number;
}

export function localityKnowledge(
  copy: Record<string, CopyClaim>,
  address: string,
): LocalityKnowledge {
  const idx = indexOf(copy);
  let claims = 0;
  for (const [doc, list] of idx.byDocument) {
    if (doc === address || doc.startsWith(`${address}/`)) claims += list.length;
  }
  const claim = idx.localities.get(address);
  return { address, ...(claim ? { claim } : {}), claims };
}

/** One crumb — named only from YOUR claim. */
export interface Crumb {
  address: string;
  /** The claim's name; absent when your map holds no claim for it. */
  name?: string;
  claim?: WireClaim;
  /** The ship you are aboard (the last crumb). */
  ship?: true;
}

/**
 * ⭐ The breadcrumb from your map (D10): the section supplies the ORDER
 * and the addresses; each crumb's name is your claim's, or none. The
 * live name the section carries is never shown.
 */
export function crumbsView(
  copy: Record<string, CopyClaim>,
  localities: LocalitiesSection | undefined,
): Crumb[] {
  if (!localities) return [];
  const idx = indexOf(copy);
  const crumbs: Crumb[] = localities.chain.map((c) => {
    const claim = idx.localities.get(c.address);
    return {
      address: c.address,
      ...(claim?.name ? { name: claim.name } : {}),
      ...(claim ? { claim } : {}),
    };
  });
  if (localities.ship) {
    crumbs.push({ address: "", name: localities.ship.name, ship: true });
  }
  return crumbs;
}

// ---------------------------------------------------------------------------
// What a click on the map runs (D3, D5)
// ---------------------------------------------------------------------------

/** Where you stand, as the map needs it. */
export interface Standing {
  zone: string;
  at: { x: number; y: number; z: number };
  /** The ways from here, as the ways section sends them. */
  ways: readonly { direction: string }[];
}

/**
 * ⭐ The way from where you stand that leads to `place`, if one does: its
 * direction's step lands on the place's cell, or (a track, a named way)
 * your map's edge from here names it as the far side.
 */
export function neighborDirection(
  copy: Record<string, CopyClaim>,
  standing: Standing,
  place: ViewPlace,
): string | undefined {
  const { at } = standing;
  if (place.zone === standing.zone) {
    for (const way of standing.ways) {
      const vec = DIRECTION_VECTORS[longDirection(way.direction)];
      if (!vec) continue;
      if (place.x === at.x + vec[0] && place.y === at.y + vec[1] && place.level === at.z + vec[2]) {
        return way.direction;
      }
    }
  }
  const here = placeAt(copy, standing.zone, at);
  if (!here) return undefined;
  const view = zoneView(copy, standing.zone);
  for (const way of standing.ways) {
    const dir = longDirection(way.direction);
    if (view.edges.some((e) => (e.from === here.key && e.dir === dir && e.to === place.key) ||
      // A link drawn once for both ends (reciprocal merge).
      (e.to === here.key && e.from === place.key && e.claims.some((c) => c.dir !== undefined && longDirection(c.dir) === dir && pathOf(c.place) === here.key)))) {
      return way.direction;
    }
  }
  return undefined;
}

const quoteWord = (w: string): string => (/\s/.test(w) ? `"${w}"` : w);

/**
 * ⭐ `route to <keyword>` for a place you know (D5): the first of its
 * keywords no other known place in the same Locality document shares
 * (else its first — the verb then asks *which?*, its own behavior), led
 * by its group's last segment when it has one. `null` when the place has
 * no keyword: it cannot be routed to by a click, and its tooltip says so.
 * ⛔ Never a path — a path is a spoiler, and the status bar previews it.
 */
export function routeCommandFor(
  copy: Record<string, CopyClaim>,
  place: ViewPlace,
): string | null {
  if (place.keywords.length === 0) return null;
  const others = new Set<string>();
  for (const p of indexOf(copy).places.values()) {
    if (p.key !== place.key && p.locality === place.locality) {
      for (const k of p.keywords) others.add(k.toLowerCase());
    }
  }
  const word = place.keywords.find((k) => !others.has(k.toLowerCase())) ?? place.keywords[0]!;
  const group = place.group?.split("/").filter(Boolean).pop();
  return `route to ${group ? `${quoteWord(group)} ` : ""}${quoteWord(word)}`;
}

/** Where a way leads, as your map knows it (D10), and how you know. */
export interface LeadsTo {
  name: string;
  /** `seen` when it is the ways section's (you can see it from here). */
  channel: Channel;
  lastSeen?: number;
}

/**
 * ⭐ Where a way from where you stand leads (D10): your map's edge from
 * here names a far place → that place's own name, with its source and
 * date; else the ways section's destination (you can see it from here),
 * marked `seen`; else unknown.
 */
export function wayLeadsTo(
  copy: Record<string, CopyClaim>,
  standing: Standing,
  way: { direction: string; destination?: string },
): LeadsTo | undefined {
  const here = placeAt(copy, standing.zone, standing.at);
  if (here) {
    const dir = longDirection(way.direction);
    const edge = (indexOf(copy).edgeClaims.get(here.key) ?? [])
      .filter((c) => c.dir !== undefined && longDirection(c.dir) === dir)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .map((c) => pathOf(c.to) ?? pathOf(c.toLabel))
      .find((k) => k !== undefined && indexOf(copy).places.has(k));
    if (edge) {
      const far = indexOf(copy).places.get(edge)!;
      return { name: far.name, channel: far.sources[0]!.channel, lastSeen: far.lastSeen };
    }
  }
  return way.destination ? { name: way.destination, channel: "seen" } : undefined;
}

// ---------------------------------------------------------------------------
// The boundaries lens (D11)
// ---------------------------------------------------------------------------

/** A cell side the boundaries lens draws a border on. */
export interface BorderSide {
  x: number;
  y: number;
  side: "north" | "south" | "east" | "west";
}

/**
 * ⭐ Whose ground each placed place is on, as YOUR map knows it: the place's
 * Locality document → the nearest covering `locality` claim that names a
 * government. A border is drawn where two adjacent cells you know differ,
 * and on a way that leaves the zone. Nothing is drawn from the live world.
 */
export function boundariesView(
  copy: Record<string, CopyClaim>,
  view: ZoneView,
  level: number,
): BorderSide[] {
  const idx = indexOf(copy);
  const govOf = (doc: string): string => {
    let best: { len: number; key: string } | null = null;
    for (const [address, claim] of idx.localities) {
      if (!claim.government) continue;
      if (doc === address || doc.startsWith(`${address}/`)) {
        if (!best || address.length > best.len) best = { len: address.length, key: claim.government.key };
      }
    }
    return best?.key ?? "";
  };
  const onLevel = view.places.filter((p) => p.level === level);
  const at = new Map(onLevel.map((p) => [`${p.x},${p.y}`, p]));
  const gov = new Map(onLevel.map((p) => [p.key, govOf(p.locality)]));
  const out: BorderSide[] = [];
  for (const p of onLevel) {
    const east = at.get(`${p.x + 1},${p.y}`);
    if (east && gov.get(east.key) !== gov.get(p.key)) out.push({ x: p.x, y: p.y, side: "east" });
    const north = at.get(`${p.x},${p.y + 1}`);
    if (north && gov.get(north.key) !== gov.get(p.key)) out.push({ x: p.x, y: p.y, side: "north" });
  }
  for (const e of view.edges) {
    if (e.shape !== "leaves") continue;
    const from = view.places.find((p) => p.key === e.from);
    const vec = DIRECTION_VECTORS[e.dir];
    if (!from || from.level !== level || !vec || (vec[0] !== 0 && vec[1] !== 0)) continue;
    const side = vec[0] === 1 ? "east" : vec[0] === -1 ? "west" : vec[1] === 1 ? "north" : "south";
    out.push({ x: from.x, y: from.y, side });
  }
  return out;
}
