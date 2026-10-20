/**
 * ⭐⭐ The diver's small gear (underwater C5): a slate that talks where no
 * voice carries; air that lifts what no line can; a line's end lashed to
 * a load so the tender hauls it up.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Slate from '../thing/Slate';
import AirBag from '../thing/AirBag';
import Lifeline from '../thing/Lifeline';
import LineEnd from '../thing/LineEnd';
import Location from '@saxonberg/server/mud/platform/location/Location';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BiomeApi, type MediumRead } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

class Body extends Character {}

const BED: MediumRead = {
  tag: 'water', substance: 'water', immersed: true, atSurface: false, temperatureK: 285, depthM: 8, waterRef: null,
};

/** A quay, the top of the water below it, and the bed below that. */
async function water(): Promise<{ quay: Location; top: Location; bed: Location }> {
  const quay = makeStuffAtPath(() => new Location(), '/test/gear/quay');
  const top = makeStuffAtPath(() => new Location(), '/test/gear/top');
  const bed = makeStuffAtPath(() => new Location(), '/test/gear/bed');
  await top.addBidirectionalExit(quay as never, 'up', { opposite: 'down' });
  await bed.addBidirectionalExit(top as never, 'up', { opposite: 'down' });
  const wet = new Set<unknown>([top, bed]);
  vi.spyOn(MixinApi, 'isWaterPlace').mockImplementation(((o: unknown) => wet.has(o)) as never);
  for (const w of [top, bed]) {
    (w as unknown as { surfacePlace(): Stuff }).surfacePlace = () => top as unknown as Stuff;
  }
  return { quay, top, bed };
}

function anchor(): Good {
  const iron = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('gear-test-iron');
    m.setDensity(Quantity.of(7870, 'kg/m³'));
    return m;
  }, '/stuff/idea/material/_test/gear-test-iron') as unknown as Material;
  return makeStuff(() => {
    const g = new Good();
    g.setMass(Quantity.of(300, 'kg'));
    g.setMaterial(iron);
    return g;
  });
}

function air(): Material {
  return (StuffApi.findByTemplatePath<Material>('/stuff/idea/material/bulk/air') ??
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('air');
      return m;
    }, '/stuff/idea/material/bulk/air')) as unknown as Material;
}

function bag(): AirBag {
  const gas = air();
  return makeStuff(() => {
    const b = new AirBag();
    b.setMass(Quantity.of(3, 'kg'));
    b.interiorBulk = true;
    b.setInteriorCapacity(Quantity.of(1, 'L'));
    b.setBulkMaterial('interior', gas);
    b.setInteriorAmount(Quantity.of(1, 'L'));
    return b;
  });
}

function body(): Body {
  const b = makeStuff(() => new Body());
  b.setMass(Quantity.of(70, 'kg'));
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/trade/diving/thing/line-end') return makeStuff(() => new LineEnd());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the slate (C5)', () => {
  it('⭐ words written on it stay on it, and anybody reads them', () => {
    const diver = body();
    const slate = makeStuff(() => new Slate());
    slate.setMarkForm('embossed');
    slate.setWritingRoom(240);
    ContainmentApi.move(slate as never, diver as never);
    expect(slate.writeOn(diver as unknown as Stuff, 'anchor is here').ok).toBe(true);
    expect(slate.writeOn(diver as unknown as Stuff, 'bring bags').ok).toBe(true);
    expect(slate.getMarkText()).toBe('anchor is here / bring bags');
  });

  it('a slate not in your hand is not written on', () => {
    const slate = makeStuff(() => new Slate());
    slate.setWritingRoom(240);
    expect(slate.writeOn(body() as unknown as Stuff, 'x')).toMatchObject({ ok: false, reason: 'not-holding' });
  });

  it('⭐ a surface with no room takes no writing, and room runs out (underwater review)', () => {
    const diver = body();
    const printed = makeStuff(() => new Slate());
    ContainmentApi.move(printed as never, diver as never);
    expect(printed.writeOn(diver as unknown as Stuff, 'x')).toMatchObject({ ok: false, reason: 'no-room' });
    const small = makeStuff(() => new Slate());
    small.setWritingRoom(10);
    ContainmentApi.move(small as never, diver as never);
    expect(small.writeOn(diver as unknown as Stuff, 'anchor').ok).toBe(true);
    expect(small.writeOn(diver as unknown as Stuff, 'bring the bags')).toMatchObject({ ok: false, reason: 'full' });
    expect(small.getMarkText()).toBe('anchor');
  });
});

describe('what a line cannot bring up, air can (C5)', () => {
  it('⭐ a line lashed to the anchor will not lift it off the bed', async () => {
    const { quay, bed } = await water();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(BED);
    const tender = body();
    const diver = body();
    ContainmentApi.move(tender as never, quay as never);
    ContainmentApi.move(diver as never, bed as never);
    const a = anchor();
    ContainmentApi.move(a as never, bed as never);
    const line = makeStuff(() => new Lifeline());
    ContainmentApi.move(line as never, tender as never);
    await line.makeFast(diver as unknown as Stuff);
    const end = diver.getContents().find((c) => c instanceof LineEnd) as LineEnd;
    expect(end.lashTo(diver as unknown as Stuff, a as unknown as Stuff).ok).toBe(true);
    expect(line.getOnEnd()).toBe(a);
    expect(await line.pullBy(tender as unknown as Stuff, null)).toMatchObject({ ok: false, reason: 'too-heavy' });
    expect(a.getContainer()).toBe(bed);
  });

  it('⭐ one bag does not stir it; enough of them float it to the top, and the line brings it in', async () => {
    const { quay, top, bed } = await water();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(BED);
    const tender = body();
    const diver = body();
    ContainmentApi.move(tender as never, quay as never);
    ContainmentApi.move(diver as never, bed as never);
    const a = anchor();
    ContainmentApi.move(a as never, bed as never);

    const bags = [bag(), bag(), bag()];
    for (const b of bags) ContainmentApi.move(b as never, diver as never);
    const first = bags[0]!.lashTo(diver as unknown as Stuff, a as unknown as Stuff);
    expect(first.ok).toBe(true);
    expect(a.getContainer()).toBe(bed);
    bags[1]!.lashTo(diver as unknown as Stuff, a as unknown as Stuff);
    expect(a.getContainer()).toBe(bed);
    bags[2]!.lashTo(diver as unknown as Stuff, a as unknown as Stuff);
    expect(a.getContainer()).toBe(top);
    expect(bags.every((b) => b.getContainer() === top)).toBe(true);

    // At the top, floated, the tender's line brings it up the steps.
    const line = makeStuff(() => new Lifeline());
    ContainmentApi.move(line as never, tender as never);
    ContainmentApi.move(diver as never, top as never);
    await line.makeFast(diver as unknown as Stuff);
    const end = diver.getContents().find((c) => c instanceof LineEnd) as LineEnd;
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue({ ...BED, depthM: 0, atSurface: true });
    end.lashTo(diver as unknown as Stuff, a as unknown as Stuff);
    const pulled = await line.pullBy(tender as unknown as Stuff, null);
    expect(pulled.ok).toBe(true);
    if (pulled.ok) await pulled.takes?.finish();
    expect(a.getContainer()).toBe(quay);
  });

  it('an air bag lifts only in the water', async () => {
    const { quay } = await water();
    const diver = body();
    ContainmentApi.move(diver as never, quay as never);
    const a = anchor();
    ContainmentApi.move(a as never, quay as never);
    const b = bag();
    ContainmentApi.move(b as never, diver as never);
    expect(b.lashTo(diver as unknown as Stuff, a as unknown as Stuff)).toMatchObject({ ok: false, reason: 'not-in-water' });
  });
});
