/**
 * RiverLine — the river as a line (river D1): the step–pool distribution,
 * the seeded meander, banks per side, derived hazards, and the profile
 * decision the build pinned (the Kestrel's falls at 140 m).
 */
import { describe, it, expect } from 'vitest';
import { RiverLine, type LineCourseInput, type LineNodeInput } from '../RiverLine';

function kestrel(fallsElevation: number, seed = 1): LineCourseInput {
  const nodes: LineNodeInput[] = [
    { name: 'headwaters', km: 62, elevation: 1400, widthM: null, drop: 0 },
    { name: 'gorge', km: 48, elevation: 1400 - (1400 - fallsElevation) * (14 / 21), widthM: null, drop: 0 },
    { name: 'falls', km: 41, elevation: fallsElevation, widthM: 18, drop: 22 },
    { name: 'confluence', km: 9, elevation: 30, widthM: 90, drop: 0 },
    { name: 'estuary', km: 0, elevation: 0, widthM: 160, drop: 0 },
  ];
  return {
    key: 'kestrel', bed: 'gravel', wooded: true, seed, nodes,
    stretches: [{ upKm: 48, downKm: 41, banks: 'walls', bed: 'rock' }],
    bankOverrides: [{ km: 8.9, side: 'left', bank: 'quay' }],
    hazards: [],
    bends: [{ km: 24, name: "Hob's Bend" }],
    weirs: [],
  };
}

const kinds = (line: RiverLine, from: number, to: number): Set<string> =>
  new Set(line.stretchesBetween(from, to).map((s) => s.kind));

describe('RiverLine', () => {
  it('lays the line down contiguously, source to mouth', () => {
    const line = new RiverLine(kestrel(140));
    expect(line.lengthKm()).toBe(62);
    const s = line.stretches;
    expect(s[0]!.upKm).toBe(62);
    expect(s[s.length - 1]!.downKm).toBeCloseTo(0, 6);
    for (let i = 1; i < s.length; i++) expect(s[i]!.upKm).toBeCloseTo(s[i - 1]!.downKm, 9);
    s.forEach((x, i) => expect(x.id).toBe(`kestrel:${i}`));
  });

  it('⭐ the lower Kestrel at 140 m is pools and riffles; at 500 m it is white water', () => {
    const low = new RiverLine(kestrel(140));
    const lower = kinds(low, 40.9, 9);
    expect(lower.has('pool')).toBe(true);
    expect(lower.has('riffle')).toBe(true);
    expect(lower.has('rapid')).toBe(false);
    const high = new RiverLine(kestrel(500));
    expect(kinds(high, 40.9, 9).has('rapid')).toBe(true);
  });

  it('the gorge is walled and rock; the falls is a stretch of its own', () => {
    const line = new RiverLine(kestrel(140));
    const gorge = line.stretchAt(45)!;
    expect(gorge.kind).toBe('gorge');
    expect(gorge.bed).toBe('rock');
    expect(gorge.banks.left.kind).toBe('wall');
    expect(gorge.banks.right.walkable).toBe(false);
    expect(line.stretchAt(40.98)!.kind).toBe('falls');
    expect(line.elevationAtKm(40.95)).toBeCloseTo(118, 3);
  });

  it('the meander is seeded: the same river every compile, a different one per seed', () => {
    const a = new RiverLine(kestrel(140, 7));
    const b = new RiverLine(kestrel(140, 7));
    expect(a.bends.map((x) => x.outside)).toEqual(b.bends.map((x) => x.outside));
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => new RiverLine(kestrel(140, s)).bends[0]!.outside);
    expect(new Set(seeds).size).toBe(2);
  });

  it('banks flip at every bend: the cut bank outside, the bar inside', () => {
    const line = new RiverLine(kestrel(140));
    const pools = line.stretchesBetween(30, 10).filter((s) => s.kind === 'pool');
    expect(pools.length).toBeGreaterThan(4);
    for (const p of pools) {
      const inside = p.outside === 'left' ? 'right' : 'left';
      expect(['steep', 'undercut']).toContain(p.banks[p.outside!].kind);
      expect(p.banks[inside].kind).toBe('bar');
      expect(p.channelAcross).toBe(p.outside === 'left' ? 0.15 : 0.85);
    }
    const sides = pools.map((p) => p.outside);
    expect(new Set(sides).size).toBe(2);
  });

  it('a flat river wanders and a steep one runs straight', () => {
    const line = new RiverLine(kestrel(140));
    const below = line.bends.filter((b) => b.upKm <= 40 && b.downKm >= 10);
    const meanLower = below.reduce((n, b) => n + b.upKm - b.downKm, 0) / below.length;
    const gorge = line.bends.filter((b) => b.upKm <= 61 && b.downKm >= 49);
    const meanUpper = gorge.reduce((n, b) => n + b.upKm - b.downKm, 0) / gorge.length;
    expect(meanUpper).toBeGreaterThan(meanLower);
  });

  it('a hydraulic forms below every weir, both sides', () => {
    const input = kestrel(140);
    input.weirs = [{ km: 20, row: '/world/x/thing/weir' }];
    const line = new RiverLine(input);
    const h = line.hazards.filter((x) => x.kind === 'hydraulic');
    expect(h.map((x) => x.side).sort()).toEqual(['left', 'right']);
    expect(h[0]!.km).toBeCloseTo(19.97, 6);
    expect(h[0]!.row).toBe('/system/water/thing/river-hazard/hydraulic');
  });

  it('strainers sit on the outside of bends; what floats fetches up at bars and strainers', () => {
    const line = new RiverLine(kestrel(140));
    const strainers = line.hazards.filter((x) => x.kind === 'strainer');
    expect(strainers.length).toBeGreaterThan(0);
    for (const s of strainers) expect(line.bendAt(s.km)!.outside).toBe(s.side);
    const next = line.collectsAt(30)!;
    expect(next.km).toBeLessThan(30);
    expect(['bar', 'strainer']).toContain(next.kind);
  });

  it('an authored bank and a named bend stand where the author put them', () => {
    const line = new RiverLine(kestrel(140));
    const at = line.stretchAt(8.9)!;
    expect(at.banks.left.kind).toBe('place');
    expect(at.banks.left.place).toBe('quay');
    expect(line.stretchAt(24)!.bendName).toBe("Hob's Bend");
  });

  it('citations: a node plus a downstream offset and a side', () => {
    expect(RiverLine.parseCitation('kestrel:confluence')).toEqual({ course: 'kestrel', node: 'confluence', offsetKm: 0, side: null });
    expect(RiverLine.parseCitation('kestrel:confluence+0.4,left')).toEqual({ course: 'kestrel', node: 'confluence', offsetKm: 0.4, side: 'left' });
    expect(RiverLine.parseCitation('kestrel:confluence-15')).toEqual({ course: 'kestrel', node: 'confluence', offsetKm: -15, side: null });
    const line = new RiverLine(kestrel(140));
    expect(line.kmOf('confluence', 0.4)).toBeCloseTo(8.6, 9);
    expect(line.kmOf('confluence', -15)).toBeCloseTo(24, 9);
    expect(RiverLine.isStretchId('kestrel:12')).toBe(true);
    expect(RiverLine.isStretchId('kestrel:confluence')).toBe(false);
  });

  it('a stretch override splits the line where it begins and ends', () => {
    const input = kestrel(140);
    input.stretches.push({ upKm: 20.3, downKm: 20.15, kind: 'riffle' });
    const line = new RiverLine(input);
    expect(line.stretchAt(20.29)!.kind).toBe('riffle');
    expect(line.stretchAt(20.16)!.kind).toBe('riffle');
    const covered = line.stretchesBetween(20.3, 20.15);
    expect(Math.max(...covered.map((x) => x.upKm))).toBeCloseTo(20.3, 9);
    expect(Math.min(...covered.map((x) => x.downKm))).toBeCloseTo(20.15, 9);
    expect(covered.every((x) => x.kind === 'riffle')).toBe(true);
  });

  it('sight runs to the end of the bend and half round the next', () => {
    const line = new RiverLine(kestrel(140));
    const bend = line.bendAt(20)!;
    const sight = line.sightKm(20, 1.7);
    expect(sight.downKm).toBeGreaterThan(20 - bend.downKm - 1e-9);
    expect(sight.downKm).toBeLessThan(3.57 * Math.sqrt(1.7) + 1e-9);
  });
});
