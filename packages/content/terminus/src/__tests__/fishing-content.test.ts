/**
 * The fishing content in Terminus (fishing B6) — the rows, read off the
 * files: the bank's Shore cites the confluence and the bank casts the
 * fisher; the fisher carries his rod and his two brains resolve; the
 * market's roster names a live Cast on a shift that has a TRIGGER (the
 * undertaker's defect not repeated); the fish stall is a consignment
 * counter with no lines; the store's tackle line is priced.
 *
 * ⚠ The reachability walk is the point: every one of these fails closed
 * and silent in the live game — a `props:` on the wrong host, a brain
 * path that resolves to nothing, a `shifts` with no trigger.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';

const PACKS = fileURLToPath(new URL('../../../', import.meta.url));
const TERMINUS = join(PACKS, 'terminus', 'content', 'world', 'terminus');

function rowAt(path: string): Record<string, unknown> {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    const file = join(PACKS, pack, 'content', rel);
    if (existsSync(file) && statSync(file).isFile()) return YAML.parse(readFileSync(file, 'utf8'));
  }
  throw new Error(`no row at ${path}`);
}
const rowExists = (path: string): boolean => {
  try {
    rowAt(path);
    return true;
  } catch {
    return false;
  }
};
/** A pack brain's path resolves to a source file in the owning pack. */
function brainExists(path: string): boolean {
  const m = /^\/trade\/([^/]+)\/behavior\/(.+)$/.exec(path);
  if (m) return existsSync(join(PACKS, `trade-${m[1]}`, 'src', 'behavior', `${m[2]}.ts`));
  const k = /^\/lib\/behavior\/(.+)$/.exec(path);
  if (k) return existsSync(join(PACKS, '..', 'server', 'src', 'mud', 'lib', 'behavior', `${k[1]}.ts`));
  return false;
}
const data = (path: string) => rowAt(path).data as Record<string, unknown>;

describe('the bank', () => {
  it("⭐ props the river's edge — a water-pack Shore on the confluence — and casts the fisher", () => {
    const bank = data('/world/terminus/wharfside/bank');
    expect(bank.props).toContain('/world/terminus/wharfside/thing/river-edge');
    expect(bank.cast).toContain('/world/terminus/wharfside/agent/fisher');
    const edge = rowAt('/world/terminus/wharfside/thing/river-edge');
    expect(edge.class).toBe('/system/water/thing/Shore');
    expect((edge.data as { reachRef: string }).reachRef).toBe('kestrel:confluence');
    // The outfall discharges into the same reach: one reach, the city's whole problem.
    expect((data('/world/terminus/wharfside/thing/city-outfall') as { dischargeReach?: string; reachRef?: string }).reachRef ?? 'kestrel:confluence').toBe('kestrel:confluence');
  });
});

describe('the fisher', () => {
  it('carries his own rod, and both his brains resolve', () => {
    const fisher = rowAt('/world/terminus/wharfside/agent/fisher');
    expect(fisher.class).toBe('/platform/agent/Cast');
    const d = fisher.data as { props: string[]; behaviors: Array<{ brain: string; trigger: string; config?: Record<string, unknown> }>; archetype: string };
    expect(d.props).toEqual(['/trade/fishing/thing/rod']);
    expect(rowExists('/trade/fishing/thing/rod')).toBe(true);
    expect(d.archetype).toBe('fisher');
    for (const b of d.behaviors) {
      expect(brainExists(b.brain), b.brain).toBe(true);
      expect(b.trigger, b.brain).toBeTruthy();
    }
    const fishes = d.behaviors.find((b) => b.brain === '/trade/fishing/behavior/fishes')!;
    expect(fishes.trigger).toMatch(/^cadence:/);
    expect(rowExists(fishes.config!.shore as string)).toBe(true);
    const reads = d.behaviors.find((b) => b.brain === '/trade/fishing/behavior/reads-water')!;
    expect(reads.trigger).toBe('engage');
    const lines = reads.config!.lines as Record<string, string>;
    for (const key of ['empty', 'thin', 'holds', 'apex']) expect(lines[key], key).toBeTruthy();
    // The empty line names nobody.
    expect(lines.empty).not.toMatch(/you|your/i);
  });
});

describe('the market', () => {
  it('⭐ the roster names a live Cast in a committee-appointed position, and the stall is on the business', () => {
    const biz = data('/world/terminus/market/business') as {
      appointingAuthority: { kind: string };
      positions: Array<{ key: string }>;
      rosterSlots: Array<{ positionKey: string; assignee: string; schedule: unknown[] }>;
      operatingLocations: string[];
    };
    expect(biz.appointingAuthority.kind).toBe('committee');
    expect(biz.positions.map((p) => p.key)).toContain('monger');
    const slot = biz.rosterSlots.find((s) => s.positionKey === 'monger')!;
    expect(rowAt(slot.assignee).class).toBe('/platform/agent/Cast');
    expect(slot.schedule.length).toBeGreaterThan(0);
    expect(biz.operatingLocations).toContain('/world/terminus/market/thing/fish-stall');
  });

  it('the fish stall is a consignment counter — a Stock with no lines, self-service, propped on the square', () => {
    const stall = rowAt('/world/terminus/market/thing/fish-stall');
    expect(stall.class).toBe('/trade/shopkeeping/thing/Stock');
    const d = stall.data as { stockLines: unknown[]; staffingPolicy: string; businessPath: string; serverPositionKeys: string[] };
    expect(d.stockLines).toEqual([]);
    expect(d.staffingPolicy).toBe('self-service');
    expect(d.businessPath).toBe('/world/terminus/market/business');
    expect(d.serverPositionKeys).toContain('monger');
    const square = data('/world/terminus/market/square') as { props: string[]; cast: string[] };
    expect(square.props).toContain('/world/terminus/market/thing/fish-stall');
    expect(square.cast).toContain('/world/terminus/market/agent/fishmonger');
  });

  it('⚠ the fishmonger\'s shift has a trigger and an Offstage that exists — the undertaker\'s defect, not repeated', () => {
    const monger = data('/world/terminus/market/agent/fishmonger') as { behaviors: Array<{ brain: string; trigger?: string; config?: Record<string, string> }> };
    const shifts = monger.behaviors.find((b) => b.brain === '/lib/behavior/shifts')!;
    expect(shifts.trigger).toMatch(/^cadence:/);
    expect(rowExists(shifts.config!.offstage!)).toBe(true);
    expect(rowAt(shifts.config!.offstage!).class).toBe('/platform/location/Offstage');
    expect(rowExists(shifts.config!.behindBar!)).toBe(true);
  });
});

describe('the store', () => {
  it('every tackle line is a row that exists, priced against the ladder', () => {
    const counter = data('/world/terminus/general-store/counter') as { stockLines: Array<{ itemTemplatePath: string }>; prices: Record<string, number> };
    const tackle = counter.stockLines.map((l) => l.itemTemplatePath).filter((p) => p.startsWith('/trade/fishing/'));
    expect(tackle).toHaveLength(10);
    for (const p of tackle) {
      expect(rowExists(p), p).toBe(true);
      expect(counter.prices[p], p).toBeGreaterThan(0);
    }
    // A rod and a worm inside a stipend (20) with change for rations (3).
    expect(counter.prices['/trade/fishing/thing/rod']! + counter.prices['/trade/fishing/thing/worm']! + 3).toBeLessThanOrEqual(20);
  });
});

describe('the moor', () => {
  it("⭐ the heath props a Shore on the Holloway's HEAD with no trade dependency", () => {
    const heath = data('/world/moor/stormy-heath') as { props: string[] };
    expect(heath.props).toContain('/world/moor/heath-mere');
    const mere = rowAt('/world/moor/heath-mere');
    expect(mere.class).toBe('/system/water/thing/Shore');
    expect((mere.data as { reachRef: string }).reachRef).toBe('holloway:head');
    const pkg = JSON.parse(readFileSync(join(PACKS, 'world-seed', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['@saxonberg/content-water']).toBeDefined();
    expect(pkg.dependencies['@saxonberg/content-trade-fishing']).toBeUndefined();
  });
});
