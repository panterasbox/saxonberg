/**
 * ⭐ AC 7 — reeling silk off stifled cocoons: the cocoons refuse in their
 * own words until they can be reeled, and a reeling makes one skein of
 * raw silk whose fineness is the count and whose evenness is the reeler's
 * hands and the reel's control — plus a handful of pupae (AC 18).
 *
 * Real cocoons, a real lit oven for the hot water; the raw-silk and pupae
 * row clones are stubbed.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Cocoons from '../thing/Cocoons';
import RawSilk from '../thing/RawSilk';
import Strain from '../idea/Strain';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { chargeHot } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { TestActor } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const BASE = 10_000_000;
let now = BASE;
const STRAIN = '/trade/sericulture/idea/strain/valley-gold';
const SHELL = '/trade/sericulture/idea/material/cocoon-shell';

class Reeler extends TestActor {}

let room: Location;
let reeler: Reeler;

function fixtures(): void {
  if (!StuffApi.findByTemplatePath(SHELL)) {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('spun silk');
      m.setTags(['fibre', 'protein', 'gummed']);
      return m;
    }, SHELL);
  }
  if (!StuffApi.findByTemplatePath(STRAIN)) {
    makeStuffAtPath(() => {
      const s = new Strain();
      s.setKey('valley-gold');
      s.setColour('gold');
      return s;
    }, STRAIN);
  }
}

function stack(count: number, opts: { stifled?: boolean; pierced?: boolean } = {}): Cocoons {
  const c = makeStuff(() => new Cocoons());
  stampTemplatePathForTest(c as unknown as Stuff, '/trade/sericulture/thing/cocoons');
  c.setMaterial(StuffApi.findByTemplatePath<Material>(SHELL)!);
  c.setMass(Quantity.of(0.1, 'kg'));
  c.seedFromTray({
    strainPath: STRAIN,
    heftBand: 'heavy',
    count,
    meanShellMg: 436,
    lotMeanMg: 380,
    lotGeneticMg: 380,
    pebrineLoad: 0,
    spunAt: WorldClockApi.getNow().rawValue(),
    maker: '/platform/agent/Avatar/grower',
  });
  const raw = c as unknown as { stifled: boolean; pierced: boolean };
  raw.stifled = opts.stifled ?? true;
  raw.pierced = opts.pierced ?? false;
  ContainmentApi.move(c, reeler as unknown as Stuff & never);
  return c;
}

function reel(rate: number, control?: string): Tool {
  return makeStuff(() => {
    const t = new Tool();
    t.setCapabilities([{ kind: 'reeling', rate, ...(control ? { control } : {}) }] as never);
    return t;
  });
}

function lightAFire(): void {
  const o = makeStuff(() => {
    const oven = new Oven();
    oven.setBurnTemperatureK(500);
    chargeHot(oven as unknown as Stuff & Burner, 40);
    return oven;
  });
  ContainmentApi.move(o, room as never);
}

function stubMints(): Stuff[] {
  const made: Stuff[] = [];
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const m = path.endsWith('/raw-silk') ? makeStuff(() => new RawSilk()) : makeStuff(() => new Good());
    stampTemplatePathForTest(m as unknown as Stuff, path);
    made.push(m as unknown as Stuff);
    return m;
  }) as never);
  return made;
}

function band(b: CompetenceBandName): void {
  vi.spyOn(reeler, 'competenceBandFor').mockResolvedValue(b);
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  fixtures();
  room = makeStuff(() => new Location());
  reeler = makeStuff(() => new Reeler());
  ContainmentApi.move(reeler as never, room as never);
  vi.spyOn(reeler, 'getIdentityPath').mockReturnValue('/platform/agent/Avatar/reeler');
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('reeling silk', () => {
  it('refuses in the cocoons’ own words until they can be reeled', async () => {
    lightAFire();
    const r = reel(1);
    // ⚠ One stack at a time — two of the same state would MERGE on the
    // move into the reeler's hands, and the second would be a husk.
    const once = async (c: Cocoons, tool: Tool | null) => {
      const p = await c.planReel(reeler, tool, 8);
      StuffApi.destruct(c as unknown as Stuff);
      return p;
    };
    expect(await once(stack(60, { stifled: false }), r)).toMatchObject({ kind: 'refusal', reason: 'not-stifled' });
    expect(await once(stack(60, { pierced: true }), r)).toMatchObject({ kind: 'refusal', reason: 'pierced' });
    expect(await once(stack(10), r)).toMatchObject({ reason: 'too-few' });
    expect(await once(stack(60), null)).toMatchObject({ reason: 'no-reel' });
  });

  it('…and wants hot water — no fire, no reeling', async () => {
    expect(await stack(60).planReel(reeler, reel(1), 8)).toMatchObject({ kind: 'refusal', reason: 'no-heat' });
  });

  it('fewer cocoons to the thread is slower; a faster reel is quicker', async () => {
    lightAFire();
    const c = stack(60);
    const at8 = await c.planReel(reeler, reel(1), 8);
    const at4 = await c.planReel(reeler, reel(1), 4);
    const basin = await c.planReel(reeler, reel(2, 'fine'), 8);
    expect(at8.kind === 'plan' && at4.kind === 'plan' && basin.kind === 'plan').toBe(true);
    if (at8.kind !== 'plan' || at4.kind !== 'plan' || basin.kind !== 'plan') return;
    expect(at4.durationMs).toBeGreaterThan(at8.durationMs);
    expect(basin.durationMs).toBeLessThan(at8.durationMs);
  });

  it('⭐ a reeling: one skein of raw silk, marked, counted; pupae; the cocoons used', async () => {
    lightAFire();
    const made = stubMints();
    band('competent');
    const c = stack(60);
    const r = reel(1);
    const plan = await c.planReel(reeler, r, 6);
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    const result = await c.completeReel(reeler, r, plan.token);
    expect(c.getQuantity()).toBe(20);
    const skein = made.find((m) => m instanceof RawSilk) as RawSilk;
    expect(skein.getFilamentCount()).toBe(6);
    expect(skein.getMaker()).toBe('/platform/agent/Avatar/reeler');
    expect(skein.getYarnCount()).toBe(0);
    expect(made.some((m) => m.getTemplatePath() === '/trade/sericulture/thing/pupae')).toBe(true);
    expect(result.self).toMatch(/6 cocoons to it/);
    expect(result.credit).toEqual({ discipline: 'textiles', difficulty: 'standard' });
  });

  it('⭐ evenness: a master at a basin is even; a novice at a pot with a fine thread is not', async () => {
    lightAFire();
    const made = stubMints();
    band('untrained');
    const pot = stack(60);
    const p1 = await pot.planReel(reeler, reel(1), 4);
    if (p1.kind !== 'plan') throw new Error();
    await pot.completeReel(reeler, reel(1), p1.token);
    StuffApi.destruct(pot as unknown as Stuff);
    vi.restoreAllMocks();
    vi.spyOn(reeler, 'getIdentityPath').mockReturnValue('/platform/agent/Avatar/reeler');
    const made2 = stubMints();
    band('proficient' as CompetenceBandName);
    const basin = stack(60);
    const p2 = await basin.planReel(reeler, reel(2, 'fine'), 8);
    if (p2.kind !== 'plan') throw new Error();
    await basin.completeReel(reeler, reel(2, 'fine'), p2.token);
    const novice = made.find((m) => m instanceof RawSilk) as RawSilk;
    const master = made2.find((m) => m instanceof RawSilk) as RawSilk;
    expect(master.getEvenness()).toBeGreaterThan(novice.getEvenness());
    expect(master.threadLine()).toMatch(/even along its whole length/);
    expect(novice.threadLine()).toMatch(/thick and thin|uneven/);
  });

  it('the cocoon stack affords nothing; the skein is spinnable stock', () => {
    const offered = JSON.stringify(
      (Cocoons as unknown as { commandContributions?: unknown }).commandContributions ?? {},
    );
    expect(offered).not.toMatch(/reel\.yaml/);
    const s = makeStuff(() => new RawSilk());
    expect(s.getYarnCount()).toBe(0);
  });
});
