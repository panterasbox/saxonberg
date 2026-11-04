/**
 * ⭐ The mill (paper W2): the stamper beats clean rags to pulp at the race's
 * power and leaves a paint rag alone; the vat lifts a wet sheet onto a
 * mould, colored by its water — brown where the water carries a persistent
 * load, white where it does not; the mould couches it onto the post.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import Rag from '@saxonberg/server/mud/platform/thing/Rag';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import ScrewPress from '@saxonberg/server/mud/platform/thing/ScrewPress';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Stamper from '../thing/Stamper';
import PulpVat from '../thing/PulpVat';
import PaperMould from '../thing/PaperMould';

const PULP = '/trade/papermaking/idea/material/_test/pulp';
let now = 1_000;

beforeEach(() => {
  installV1QuantityMarshallers();
  now = 1_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('pulp');
    m.setTags(['liquid', 'pulp']);
    m.setDensity(Quantity.of(1010, 'kg/m³'));
    return m;
  }, PULP);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function vat(litres = 0): PulpVat {
  return makeStuff(() => {
    const v = new PulpVat();
    v.interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(400, 'L'));
    v.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(PULP)!);
    v.setBulkAmount('interior', Quantity.of(litres, 'L'));
    return v;
  });
}

function rags(n: number, oily = false): Rag {
  const r = makeStuff(() => {
    const x = new Rag();
    x.setMass(Quantity.of(0.05, 'kg'));
    x.setQuantity(n);
    return x;
  });
  if (oily) vi.spyOn(r, 'oilCoats').mockReturnValue([{ material: 'oil', thicknessM: 1, state: 'wet' }]);
  return r;
}

describe('⭐ the stamper', () => {
  it('beats clean rags to pulp at the race\'s power, for the hours it ran', async () => {
    const s = makeStuff(() => new Stamper());
    const r = rags(20);
    ContainmentApi.move(r, s as unknown as Stuff & Container);
    vi.spyOn(s, 'powerW').mockResolvedValue(2000);
    const v = vat();
    s.switchOn();
    now += 3600; // one hour at 2 kW: 0.6 kg — twelve rags
    expect(await s.beatInto(v as never)).toBeCloseTo(0.6, 5);
    expect(r.getQuantity()).toBe(8);
    expect(v.getBulkAmount('interior').rawValue()).toBeCloseTo(18, 5);
  });

  it('⭐ a short race beats slower — half the power, half the rags', async () => {
    const s = makeStuff(() => new Stamper());
    ContainmentApi.move(rags(20), s as unknown as Stuff & Container);
    vi.spyOn(s, 'powerW').mockResolvedValue(1000);
    s.switchOn();
    now += 3600;
    expect(await s.beatInto(vat() as never)).toBeCloseTo(0.3, 5);
  });

  it('leaves a paint rag alone, and stops when switched off', async () => {
    const s = makeStuff(() => new Stamper());
    ContainmentApi.move(rags(5, true), s as unknown as Stuff & Container);
    vi.spyOn(s, 'powerW').mockResolvedValue(2000);
    s.switchOn();
    now += 3600;
    expect(await s.beatInto(vat() as never)).toBe(0);
    s.switchOff();
    now += 3600;
    expect(await s.beatInto(vat() as never)).toBe(0);
  });
});

describe('⭐ the vat and the mould', () => {
  async function dip(color: 'white' | 'brown'): Promise<{ mould: PaperMould; sheet: Sheet | null }> {
    const v = vat(10);
    v.sheetTemplate = '/test/thing/waterleaf';
    vi.spyOn(v, 'waterColor').mockResolvedValue(color);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Sheet()) as never);
    const room = makeStuff(() => new Holder());
    const mould = makeStuff(() => new PaperMould());
    ContainmentApi.move(mould, room as unknown as Stuff & Container);
    const actor = makeStuff(() => new Holder());
    const plan = await v.dipPlanFor({ actor, target: mould, faces: null, raw: null });
    expect(plan?.ok).toBe(true);
    if (plan === null || !plan.ok) return { mould, sheet: null };
    await plan.onComplete();
    return { mould, sheet: mould.sheetOnWire() };
  }

  it('lifts a wet sheet onto the wire, the color of the water', async () => {
    const { sheet } = await dip('white');
    expect(sheet).not.toBeNull();
    expect(sheet!.color).toBe('white');
    vi.spyOn(sheet!, 'dryness').mockReturnValue(0);
    expect(sheet!.isWaterleaf()).toBe(true);
    expect(sheet!.isSized()).toBe(false);
    expect((await dip('brown')).sheet!.color).toBe('brown');
  });

  it('refuses a thing that is not a mould, and a mould with a sheet still on it', async () => {
    const v = vat(10);
    const actor = makeStuff(() => new Holder());
    const notMould = makeStuff(() => new Holder());
    expect(await v.dipPlanFor({ actor, target: notMould, faces: null, raw: null })).toMatchObject({ ok: false, reason: 'not-a-mould' });
    const { mould } = await dip('white');
    expect(await v.dipPlanFor({ actor, target: mould, faces: null, raw: null })).toMatchObject({ ok: false, reason: 'mould-full' });
  });

  it('⭐ couched onto the press and pressed, it dries flat; dried unpressed, it cockles', async () => {
    const { mould, sheet } = await dip('white');
    const press = makeStuff(() => {
      const p = new ScrewPress();
      p.setPlacements(['on']);
      return p;
    });
    ContainmentApi.move(press, mould.getContainer() as unknown as Stuff & Container);
    expect(mould.couchOnto(press).ok).toBe(true);
    expect(press.getPlaced('on')).toContain(sheet);
    await press.turnBy(makeStuff(() => new Holder()), false);
    expect(sheet!.pressed).toBe(true);
    // Dried (the loft's air is the world's; here the water is read as dry).
    vi.spyOn(sheet!, 'dryness').mockReturnValue(1);
    expect(sheet!.isCockled()).toBe(false);
    const other = (await dip('white')).sheet!;
    vi.spyOn(other, 'dryness').mockReturnValue(1);
    expect(other.isCockled()).toBe(true);
  });
});
