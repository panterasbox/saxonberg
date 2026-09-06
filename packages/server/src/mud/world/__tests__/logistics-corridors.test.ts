/**
 * ⭐⭐ **The realm is contiguous** — the logistics build's first four
 * acceptance criteria, checked over the shipped YAML rather than over a
 * boot.
 *
 * Before this build, Terminus, Hinkley Hills, Rejection and newbie-wilds
 * were islands stitched together only by TPA terminals: **zero exits
 * crossed a locality boundary**, and the freight slate's premise — *"you
 * do not author roads, you author which exits admit `wheeled`, and the
 * road network is the induced subgraph"* — had no graph to induce from.
 *
 * The claims, in the order the acceptance criteria make them:
 *
 *  1. **AC1** — a player walks Terminus market square → Rejection pithead
 *     yard with ordinary movement only, and back.
 *  2. **AC2** — the `wheeled`-admitting subgraph reaches the valley
 *     crossroads and **stops at the pass**, which refuses wheels with an
 *     honest sign. That is where bulk breaks, and it is why the depot has
 *     work to do on the day it opens.
 *  3. **AC3** — the water lane runs below the confluence and cannot
 *     ascend the gorge.
 *  4. **AC4** — newbie-wilds is reachable on foot from Rejection.
 *
 * plus the shape rules every corridor room is held to (**every location
 * plots**; unlit is pitch black; both sides of every cross-zone exit
 * authored explicitly) and the two facts about road CHARACTER (AC15h,
 * AC15j) that make a corridor a designed thing rather than a hallway.
 *
 * ⚠ A row-shape test, deliberately: the authored graph is what an author
 * gets wrong, and a boot would prove the same thing an order of
 * magnitude more slowly. The live drive is the other half.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { LAND_USES } from '../../lib/parcel/LandUse';

const CONTENT = fileURLToPath(new URL('../../../../../content/', import.meta.url));

interface ExitSpec {
  destination?: string;
  media?: string[];
  wheelPassable?: boolean;
  edgeMinutes?: number;
  kind?: string;
  bidirectional?: boolean;
}

interface Row {
  pack: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
  exits: Record<string, ExitSpec>;
}

/** Every template row every pack ships, keyed by template path. */
function allRows(): Map<string, Row> {
  const rows = new Map<string, Row>();
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    walk(root, root, pack, rows);
  }
  return rows;
}

function walk(dir: string, root: string, pack: string, out: Map<string, Row>): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // The document kinds are not template rows.
      if (['archetypes', 'recipes', 'emotes', 'blueprints', 'name-banks', 'settings', 'msh', 'wiki', 'releases', 'cmd'].includes(entry)) continue;
      walk(full, root, pack, out);
      continue;
    }
    if (!entry.endsWith('.yaml')) continue;
    const path = '/' + full.slice(root.length + 1).replace(/\.yaml$/, '');
    let doc: Record<string, unknown>;
    try {
      doc = (parse(readFileSync(full, 'utf8')) ?? {}) as Record<string, unknown>;
    } catch {
      continue;
    }
    const data = (doc.data ?? {}) as Record<string, unknown>;
    out.set(path, {
      pack,
      path,
      class: typeof doc.class === 'string' ? doc.class : '',
      data,
      exits: (data.exits ?? {}) as Record<string, ExitSpec>,
    });
  }
}

const ROWS = allRows();

/* ── the mode gates, mirrored from `Exit.allowsMode` ───────────────── */

/**
 * Empty `media` is the legacy default: the ground PACE family only
 * (walk / sneak / run). Anywhere you can walk you can sneak or run.
 */
const admitsOnFoot = (e: ExitSpec): boolean =>
  !e.media || e.media.length === 0 || e.media.includes('ground');

/**
 * A wheeled lane asks two questions: the medium (a cart is not going up a
 * ladder) and `wheelPassable` — the residue the medium cannot express, a
 * stair or a stile or **a pitched pass**.
 */
const admitsWheels = (e: ExitSpec): boolean =>
  !!e.media && e.media.includes('ground') && e.wheelPassable !== false;

const admitsBoat = (e: ExitSpec): boolean =>
  !!e.media && e.media.includes('water');

/** The reachable set from `start`, over edges `admits` lets through. */
function reachable(start: string, admits: (e: ExitSpec) => boolean): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const here = queue.shift()!;
    const row = ROWS.get(here);
    if (!row) continue;
    for (const spec of Object.values(row.exits)) {
      const to = spec.destination;
      if (!to || !admits(spec)) continue;
      if (seen.has(to)) continue;
      seen.add(to);
      queue.push(to);
    }
  }
  return seen;
}

const MARKET = '/world/terminus/market/square';
const BANK = '/world/terminus/wharfside/bank';
const CROSSROADS = '/world/terminus/delight-road/crossroads';
const PASS = '/world/rejection/kestrel-road/the-pass';
const YARD = '/world/rejection/location/pithead-yard';
const WILDS = '/world/newbie-wilds/crossroads/hub';
const ESTUARY_MOUTH = '/world/terminus/estuary/estuary-mouth';
const TOWPATH = '/world/terminus/valley-road/towpath';

const DELIGHT_ROAD = [
  '/world/terminus/delight-road/ford',
  '/world/terminus/delight-road/milestone',
  '/world/terminus/delight-road/drove',
  '/world/terminus/delight-road/flats',
  CROSSROADS,
];
const KESTREL_ROAD = [
  '/world/rejection/kestrel-road/lower-climb',
  '/world/rejection/kestrel-road/upper-climb',
  PASS,
  '/world/rejection/kestrel-road/tips',
  '/world/rejection/kestrel-road/yard-gate',
];
const ESTUARY = [
  '/world/terminus/estuary/lower-towpath',
  '/world/terminus/estuary/reach',
  ESTUARY_MOUTH,
];
const CORRIDOR_ROOMS = [...DELIGHT_ROAD, ...KESTREL_ROAD, ...ESTUARY];

describe('the realm is contiguous', () => {
  it('⭐ AC1 — Terminus market square to the Rejection pithead yard, on foot, both ways', () => {
    // No `teleport`, no wizard flag, no TPA: ordinary exits only.
    expect(reachable(MARKET, admitsOnFoot).has(YARD)).toBe(true);
    expect(reachable(YARD, admitsOnFoot).has(MARKET)).toBe(true);
  });

  it('AC4 — newbie-wilds is reachable on foot from Rejection, and back', () => {
    expect(reachable(YARD, admitsOnFoot).has(WILDS)).toBe(true);
    expect(reachable(WILDS, admitsOnFoot).has(YARD)).toBe(true);
  });

  it('⭐⭐ AC2 — the wheeled road reaches the crossroads and STOPS at the pass', () => {
    const wheeled = reachable(BANK, admitsWheels);
    // The wagon's road: Terminus to the valley crossroads, every room.
    for (const room of DELIGHT_ROAD) expect(wheeled.has(room)).toBe(true);
    expect(wheeled.has('/world/rejection/kestrel-road/lower-climb')).toBe(true);
    expect(wheeled.has('/world/rejection/kestrel-road/upper-climb')).toBe(true);
    // …and no further. Bulk breaks at the crossroads, which is the
    // depot's product doing real economic work rather than being a
    // service nobody needs.
    expect(wheeled.has(PASS)).toBe(false);
    expect(wheeled.has(YARD)).toBe(false);
  });

  it('the pass refuses wheels on BOTH its exits, with a sign that says so', () => {
    const pass = ROWS.get(PASS)!;
    const exits = Object.values(pass.exits);
    expect(exits).toHaveLength(2);
    for (const e of exits) {
      // Not the medium — the pass is ordinary ground and you walk it.
      expect(e.media).toContain('ground');
      expect(e.wheelPassable).toBe(false);
    }
    // An honest message: the refusal is content, not a gate string.
    const details = JSON.stringify(pass.data.details ?? {});
    expect(details).toMatch(/NO WHEELS BEYOND THIS GATE/);
    expect(details).toMatch(/BREAK YOUR LOAD AT THE CROSSING/);
  });

  it('⭐ AC3 — the boat lane runs below the confluence and cannot go above it', () => {
    const afloat = reachable(BANK, admitsBoat);
    for (const room of ESTUARY) expect(afloat.has(room)).toBe(true);
    // The gorge above Terminus is authored as "steep enough that no boat
    // has ever been up it" — the water build decided that, and the road
    // inherits the decision rather than restating it. The towpath's
    // exits admit no water at all.
    expect(afloat.has(TOWPATH)).toBe(false);
    for (const room of DELIGHT_ROAD) expect(afloat.has(room)).toBe(false);
  });
});

describe('every corridor room is a real place', () => {
  it('exists, plots, is addressed, has a biome and is not pitch black', () => {
    for (const path of CORRIDOR_ROOMS) {
      const row = ROWS.get(path);
      expect(row, `${path} is not shipped`).toBeDefined();
      const d = row!.data;
      // Coordinates are grid MEMBERSHIP — a room without them is in no
      // grid and inherits nothing.
      expect(d.coords, `${path} does not plot`).toBeDefined();
      expect(d._address, `${path} has no address`).toBeTruthy();
      expect(d._biomePath, `${path} has no biome`).toBeTruthy();
      // Unlit is PITCH BLACK, and every object in a dark room reads as
      // "something".
      expect(
        Number(d.ambientIntensity ?? 0),
        `${path} is unlit`,
      ).toBeGreaterThan(0);
      // Prose, and things to look at: a road room is a budget line.
      expect(String(d.longDescription ?? '').length).toBeGreaterThan(200);
      expect(Object.keys((d.details ?? {}) as object).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('⚠ both sides of every corridor edge are authored explicitly', () => {
    // A one-sided exit is the classic content defect: you can walk in and
    // not out, and nothing anywhere complains.
    for (const path of CORRIDOR_ROOMS) {
      for (const spec of Object.values(ROWS.get(path)!.exits)) {
        const to = spec.destination!;
        const far = ROWS.get(to);
        expect(far, `${path} points at ${to}, which is not shipped`).toBeDefined();
        const back = Object.values(far!.exits).some((e) => e.destination === path);
        expect(back, `${to} does not answer ${path}`).toBe(true);
      }
    }
  });

  it('every corridor edge carries its own duration budget', () => {
    for (const path of CORRIDOR_ROOMS) {
      for (const [dir, spec] of Object.entries(ROWS.get(path)!.exits)) {
        expect(
          spec.edgeMinutes,
          `${path}:${dir} has no edge budget`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('road character', () => {
  const totalOf = (rooms: string[]): number =>
    rooms.reduce((sum, path) => {
      const out = Object.values(ROWS.get(path)!.exits)
        .filter((e) => rooms.includes(e.destination!))
        .map((e) => e.edgeMinutes ?? 0);
      return sum + out.reduce((a, b) => a + b, 0);
    }, 0) / 2;

  it('⭐ AC15h — two corridors, the SAME total duration, read completely differently', () => {
    // The Delight road: four rooms and long edges — nothing for a long
    // time, then something. The estuary: three rooms and short ones — a
    // walk you take rather than one you endure.
    const delight = totalOf(DELIGHT_ROAD);
    const estuary = totalOf([BANK, ...ESTUARY]);

    // Room counts differ…
    expect(DELIGHT_ROAD.length).toBeGreaterThan(ESTUARY.length);
    // …edge lengths differ…
    const longest = (rooms: string[]): number =>
      Math.max(
        ...rooms.flatMap((p) =>
          Object.values(ROWS.get(p)!.exits).map((e) => e.edgeMinutes ?? 0),
        ),
      );
    expect(longest(DELIGHT_ROAD)).toBeGreaterThan(longest(ESTUARY));
    // …and yet they are within a few minutes of each other end to end,
    // which is the whole of D18: length is an EVENT BUDGET, not a
    // distance.
    expect(Math.abs(delight - estuary)).toBeLessThanOrEqual(20);
  });

  it('⭐ AC15i — the ford reads a REAL reach, and the water it names exists', () => {
    const kind = ROWS.get('/world/terminus/delight-road/exits/delight-ford');
    expect(kind, 'the ford exit-kind is not shipped').toBeDefined();
    expect(kind!.class).toBe('/system/transport/idea/FordExit');
    const reach = String(kind!.data.crossesReach);
    expect(Number(kind!.data.floodThresholdM3S)).toBeGreaterThan(0);

    // `<courseKey>:<nodeName>` — and both halves have to be real, or the
    // ford reads null forever and is silently always open.
    const [courseKey, nodeName] = reach.split(':');
    const course = ROWS.get(`/stuff/idea/Watercourse/${courseKey}`);
    expect(course, `the ford names watercourse '${courseKey}'`).toBeDefined();
    const nodes = (course!.data.nodes ?? []) as Array<{ name: string }>;
    expect(nodes.map((n) => n.name)).toContain(nodeName);

    // …and the crossing is authored on BOTH banks, or you could cross
    // one way and not the other.
    for (const room of ['/world/terminus/delight-road/ford', '/world/terminus/delight-road/milestone']) {
      const usesFord = Object.values(ROWS.get(room)!.exits).some(
        (e) => e.kind === '/world/terminus/delight-road/exits/delight-ford',
      );
      expect(usesFord, `${room} does not use the ford kind`).toBe(true);
    }
  });

  it('⭐ AC15j — every corridor parcel is `civic` or `wild`, and the closed SIX are unchanged', () => {
    const claims = corridorClaims();
    expect(claims.length).toBeGreaterThanOrEqual(3);
    for (const { extent, landUse } of claims) {
      expect(['civic', 'wild'], `${extent} claims '${landUse}'`).toContain(landUse);
    }
    // No seventh use was added: `civic` ("offices, parks and the
    // commons") is the public highway and `wild` ("unserviced ground —
    // passage and gathering only") is the unimproved track, and the
    // split IS the toll-versus-obstruction distinction already.
    expect([...LAND_USES].sort()).toEqual(
      ['agricultural', 'civic', 'commercial', 'industrial', 'residential', 'wild'].sort(),
    );
  });
});

/** The `requires.title` claims covering the three corridor extents. */
function corridorClaims(): Array<{ extent: string; landUse: string }> {
  const out: Array<{ extent: string; landUse: string }> = [];
  const wanted = [
    '/world/terminus/delight-road',
    '/world/terminus/estuary',
    '/world/rejection/kestrel-road',
  ];
  for (const pack of readdirSync(CONTENT)) {
    const manifest = join(CONTENT, pack, 'pack.yaml');
    if (!existsSync(manifest)) continue;
    const doc = parse(readFileSync(manifest, 'utf8')) as {
      requires?: { title?: Array<{ extent: string; landUse?: string }> };
    };
    for (const claim of doc.requires?.title ?? []) {
      if (wanted.includes(claim.extent)) {
        out.push({ extent: claim.extent, landUse: claim.landUse ?? '' });
      }
    }
  }
  return out;
}
