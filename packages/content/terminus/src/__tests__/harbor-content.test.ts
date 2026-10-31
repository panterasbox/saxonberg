/**
 * The Port of Terminus's rows (harbors A1), read off the files: the quays
 * stand on the Kestrel's line inside the bar and the river names them; every
 * quay in the harbor's book is a HarborQuay pointing back at it and props the
 * bollards a ship's lines go round; the office is sited by the river with no
 * landing; the district joins the estuary by ONE way each direction; the
 * harbormaster's seat is rostered at the office on its hours.
 *
 * ⚠ Each of these fails closed and silent in the live game — a quay the river
 * does not name is never a course, a book quay that is a plain Quay never asks
 * the book, a seat with no roster keeps the office shut for good.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';

const PACKS = fileURLToPath(new URL('../../../', import.meta.url));

function rowAt(path: string): Record<string, unknown> {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    const file = join(PACKS, pack, 'content', rel);
    if (existsSync(file) && statSync(file).isFile()) return YAML.parse(readFileSync(file, 'utf8'));
  }
  throw new Error(`no row at ${path}`);
}
const data = (path: string) => rowAt(path).data as Record<string, unknown>;

const HARBOR = '/world/terminus/harbor/idea/harbor';
const TOWN = '/world/terminus/harbor/town-quay';
const OFFICE = '/world/terminus/harbor/office';

describe('the Port of Terminus', () => {
  const harbor = data(HARBOR) as {
    quays: Array<{ place: string; lengthM: number; berthDepthM?: number }>;
    office: string;
    seat: { business: string; positionKey: string };
    rates: { duesPerMeterPerDay: number };
    exempt: string[];
  };
  const kestrel = data('/stuff/idea/Watercourse/kestrel') as { places: string[]; nodes: Array<{ name: string; meanDepthM?: number }> };

  it('⭐ every quay in the book is a HarborQuay of this harbor, propping bollards, named by the river', () => {
    expect(harbor.quays.map((q) => q.place)).toEqual([TOWN, '/world/terminus/harbor/fish-quay', '/world/terminus/wharfside/bank']);
    for (const q of harbor.quays) {
      const row = rowAt(q.place);
      expect(row.class, q.place).toBe('/system/transport/location/HarborQuay');
      const d = row.data as { harbor: string; props: Array<string | { template: string }>; frameSite: { frame: string } };
      expect(d.harbor).toBe(HARBOR);
      expect(d.props.some((p) => (typeof p === 'string' ? p : p.template) === '/platform/thing/bollard')).toBe(true);
      expect(d.frameSite.frame).toBe('/stuff/idea/Watercourse/kestrel');
      expect(kestrel.places).toContain(q.place);
      // ⚠ Risk 1: a mud berth at or under a smack's 1.8 m hull.
      expect(q.berthDepthM ?? 99).toBeLessThanOrEqual(1.8);
    }
    expect(harbor.quays[0]!.lengthM).toBe(70);
    expect(harbor.quays[1]!.lengthM).toBe(25);
    expect(harbor.rates.duesPerMeterPerDay).toBe(0.25);
    expect(harbor.exempt).toEqual(['/world/terminus/ostrander/structure']);
  });

  it('⭐ the quays stand inside the bar, between the mouth and the reach; the estuary carries the tide', () => {
    const km = (p: string): number => Number(/estuary-([\d.]+)/.exec((data(p).frameSite as { cite: string }).cite)![1]);
    for (const p of [TOWN, '/world/terminus/harbor/fish-quay', '/world/terminus/harbor/harbor-stairs', OFFICE]) {
      expect(km(p)).toBeGreaterThan(km('/world/terminus/estuary/estuary-mouth'));
      expect(km(p)).toBeLessThan(0.7); // the reach's span runs down to 0.7
    }
    expect(kestrel.nodes.find((n) => n.name === 'estuary')?.meanDepthM).toBe(2.8);
  });

  it('⭐ the office is a hailable room sited by the river with no landing, the book on its desk, the harbormaster in it', () => {
    const row = rowAt(OFFICE);
    expect(row.class).toBe('/system/transport/location/HarborOffice');
    const d = row.data as { harbor: string; frameSite: { landing: boolean }; props: string[]; cast: string[] };
    expect(d.harbor).toBe(HARBOR);
    expect(d.frameSite.landing).toBe(false);
    expect(d.props).toContain('/world/terminus/harbor/thing/berth-book');
    expect(d.cast).toContain('/world/terminus/harbor/agent/harbormaster');
    expect(kestrel.places).toContain(OFFICE);
    expect(harbor.office).toBe(OFFICE);
  });

  it('⭐ ONE way joins the district to the estuary, each direction', () => {
    const mouth = data('/world/terminus/estuary/estuary-mouth').exits as Record<string, { destination: string }>;
    const town = data(TOWN).exits as Record<string, { destination: string }>;
    expect(mouth.south?.destination).toBe(TOWN);
    expect(town.north?.destination).toBe('/world/terminus/estuary/estuary-mouth');
  });

  it('⭐ the harbormaster is a seat on the harbor works, rostered at the office six till eight', () => {
    const works = data(harbor.seat.business) as {
      positions: Array<{ key: string }>;
      rosterSlots: Array<{ positionKey: string; assignee: string; station: string; schedule: Array<{ hours: number[] }> }>;
      operatingLocations: string[];
    };
    expect(harbor.seat.positionKey).toBe('harbormaster');
    expect(works.positions.map((p) => p.key)).toContain('harbormaster');
    const slot = works.rosterSlots.find((s) => s.positionKey === 'harbormaster')!;
    expect(slot.assignee).toBe('/world/terminus/harbor/agent/harbormaster');
    expect(slot.station).toBe(OFFICE);
    expect(slot.schedule[0]!.hours).toEqual([6, 20]);
    expect(works.operatingLocations).toContain(OFFICE);
    expect(rowAt('/world/terminus/harbor/agent/harbormaster').class).toBe('/platform/agent/Cast');
  });
});
