/**
 * ⭐⭐ The column under a deep water (underwater A2, D5–D9).
 *
 *  - A water six metres deep with three metres of clarity has a lit band,
 *    a dark band and a bed; a clear five metres has no dark band; three
 *    metres is only the bed.
 *  - The bands bud on demand, keyed `<surface>#<band>`, wired up and down
 *    with lazy column exits; the surface gets its way down.
 *  - Under the surface you are in the water at the band's depth — even
 *    standing on the bed.
 *  - Mid-water has nothing to stand on, said in words; the bed is ground.
 *  - What sinks goes to the bed; what floats goes to the surface.
 *  - Under ice the only way up is the hole.
 *
 * Synthetic rows against an in-memory store (the MineWarren harness).
 */

import '@saxonberg/server/test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ColumnWarren from '../idea/ColumnWarren';
import ColumnExit from '../idea/exits/ColumnExit';
import Band from '../location/Band';
import OpenWater from '../thing/OpenWater';
import Pool from '@saxonberg/server/mud/platform/location/Pool';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import { Actor } from '@saxonberg/server/mud/lib/creature/Actor';
import TemplateApplier from '@saxonberg/server/mud/platform/idea/TemplateApplier';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { WaterRead } from '@saxonberg/server/mud/lib/location/WaterSource';

interface Doc extends Record<string, unknown> { _id?: string }

const PH = TemplateApplier.templatePath;
const SURFACE = '/world/fx-water/location/basin';
const SLOT = {
  name: 'ground:1', accepts: 'SlottableMixin', capacity: 1000, postures: ['sit', 'lie', 'kneel', 'stand'],
};

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) { arr = []; store.set(name, arr); }
  return arr;
}

function seedContent(): void {
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  content.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  for (const row of KERNEL_CONTENT_ROWS) content.push({ _id: `d-${++idCounter}`, ...row });
  add(TemplatePaths.waterColumn, '/system/water/idea/ColumnWarren');
  add('/system/water/idea/exits/column', '/system/water/idea/exits/ColumnExit');
  add('/system/water/thing/open-water', '/system/water/thing/OpenWater', { staticSlots: [SLOT] });
  add(TemplatePaths.defaultFloor, '/platform/thing/Floor', { staticSlots: [SLOT] });
  add(TemplatePaths.waterSurface, '/platform/thing/WaterSurface', { staticSlots: [SLOT] });
  for (const band of ['lit', 'dark']) {
    add(`/system/water/location/band/${band}`, '/system/water/location/Band', {
      shortDescription: `${band} water`,
      floor: { template: '/system/water/thing/open-water' },
      proseBank: { look: [`the ${band} water, one`, `the ${band} water, two`] },
    });
  }
  add('/system/water/location/band/bed', '/system/water/location/Band', { shortDescription: 'the bottom' });
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedContent();
  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc }; else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) => keys.every((k) => {
      const stored = d[k];
      if (Array.isArray(stored)) return stored.includes(q[k]);
      return stored === q[k];
    }));
  });
  const findById = vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null);
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save, find, findById, delete: del, isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(() => undefined, async () => undefined);
}

/** A water place at the surface, its read pinned. */
async function surface(depthM = 6, clarityM = 3, frozen = false): Promise<Pool> {
  const p = makeStuffAtPath(() => new Pool(), SURFACE);
  p.setWater({ of: 'fx:reach', depthM });
  p.setCoordinates([0, 0, 0]);
  const read: WaterRead = {
    ref: 'fx', atS: 0, name: 'the water', frozen,
    draw: { materialPath: '/stuff/idea/material/bulk/water', temperatureK: 283 }, levelM: 0, clarityM,
  };
  vi.spyOn(p, 'peekWaterRead').mockReturnValue(read);
  await p.ensureFloor();
  return p;
}

class Diver extends Actor {}
function diver(): Diver {
  return makeStuff(() => {
    const d = new Diver();
    d.setMass(Quantity.of(70, 'kg'));
    return d;
  });
}

class Lump extends Good {}
function lump(densityKgM3: number): Lump {
  const l = makeStuff(() => new Lump());
  l.setMass(Quantity.of(5, 'kg'));
  vi.spyOn(l, 'getMaterial').mockReturnValue({ getDensity: () => Quantity.of(densityKgM3, 'kg/m³') } as never);
  return l;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

async function column(): Promise<ColumnWarren> {
  return StuffApi.singleton<ColumnWarren>(TemplatePaths.waterColumn);
}

describe('the column (underwater A2)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ the bands derive from depth and clarity', async () => {
    expect((await surface(6, 3)).bandsNow()).toEqual(['lit', 'dark', 'bed']);
    StuffApi.clearAll();
    installStore();
    expect((await surface(5, 8)).bandsNow()).toEqual(['lit', 'bed']);
    StuffApi.clearAll();
    installStore();
    expect((await surface(3, 2)).bandsNow()).toEqual(['bed']);
    StuffApi.clearAll();
    installStore();
    expect((await surface(1.2, 3)).bandsNow()).toEqual([]);
  });

  it('⭐ the surface gets its way down, and each band buds keyed and wired up and down', async () => {
    const p = await surface();
    await p.ensureColumnExits();
    const down = p.getExit('down');
    expect(down).toBeInstanceOf(ColumnExit);
    expect((down as ColumnExit).getTarget()).toBe('lit');

    const warren = await column();
    const lit = (await warren.bandOf(p, 'lit')) as unknown as Band;
    expect(lit).toBeInstanceOf(Band);
    expect(lit.getBand()).toBe('lit');
    expect(warren.bandAt(SURFACE, 'lit')).toBe(lit);
    expect(warren.keyOf(SURFACE, 'lit')).toBe(`${SURFACE}#lit`);
    expect((lit.getExit('up') as ColumnExit).getTarget()).toBe('surface');
    expect((lit.getExit('down') as ColumnExit).getTarget()).toBe('dark');
    // Asking again is the same room, never a second one.
    expect(await warren.bandOf(p, 'lit')).toBe(lit);

    const bed = (await warren.bandOf(p, 'bed')) as unknown as Band;
    expect((bed.getExit('up') as ColumnExit).getTarget()).toBe('dark');
    expect(bed.getExit('down')).toBeUndefined();
    expect((bed as unknown as { getCoordinates(): number[] }).getCoordinates()).toEqual([0, 0, -3]);
  });

  it('a water you can stand in has no column', async () => {
    const p = await surface(1, 3);
    await p.ensureColumnExits();
    expect(p.getExit('down')).toBeUndefined();
    expect(await (await column()).bandOf(p, 'lit')).toBeNull();
  });

  it('⭐ under the surface you are in the water at the band\'s depth — on the bed too', async () => {
    const p = await surface();
    const warren = await column();
    const lit = (await warren.bandOf(p, 'lit')) as unknown as Band;
    const bed = (await warren.bandOf(p, 'bed')) as unknown as Band;
    const a = diver();
    const b = diver();
    ContainmentApi.move(a as never, lit as never);
    ContainmentApi.move(b as never, bed as never);
    const inLit = BiomeApi.mediumFor(a as unknown as Stuff);
    expect(inLit).toMatchObject({ tag: 'water', immersed: true, atSurface: false, temperatureK: 283 });
    expect(inLit.depthM).toBeGreaterThan(1.5);
    expect(inLit.depthM).toBeLessThan(3);
    expect(BiomeApi.mediumFor(b as unknown as Stuff)).toMatchObject({ immersed: true, atSurface: false, depthM: 6 });
  });

  it('⭐ mid-water there is nothing to stand on, said in words; the bed is ground', async () => {
    const p = await surface();
    const warren = await column();
    const lit = (await warren.bandOf(p, 'lit')) as unknown as Band;
    const bed = (await warren.bandOf(p, 'bed')) as unknown as Band;
    const floor = lit.getFloor() as unknown as OpenWater;
    expect(floor).toBeInstanceOf(OpenWater);
    expect(floor.canOccupyReason(diver() as never, 'ground:1')).toBe('There is nothing under you but water.');
    const ground = bed.getFloor() as unknown as { bears(kg: number): boolean };
    expect(ground.bears(500)).toBe(true);
  });

  it('⭐ a dropped ingot goes to the bed; cork in the dark goes up to the surface', async () => {
    const p = await surface();
    const warren = await column();
    const lit = (await warren.bandOf(p, 'lit')) as unknown as Band;
    const dark = (await warren.bandOf(p, 'dark')) as unknown as Band;
    const iron = lump(7800);
    const cork = lump(240);
    ContainmentApi.move(iron as never, lit as never);
    ContainmentApi.move(cork as never, dark as never);
    await settle();
    expect(iron.getContainer()).toBe(warren.bandAt(SURFACE, 'bed'));
    expect(cork.getContainer()).toBe(p);
  });

  it('⭐ dropped into the surface\'s open water, iron goes all the way to the bed', async () => {
    const p = await surface();
    const iron = lump(7800);
    ContainmentApi.move(iron as never, p as never);
    await settle();
    const bed = (await column()).bandAt(SURFACE, 'bed');
    expect(bed).not.toBeNull();
    expect(iron.getContainer()).toBe(bed);
  });

  it('⭐ under ice the only way up is the hole', async () => {
    const p = await surface();
    const warren = await column();
    const lit = (await warren.bandOf(p, 'lit')) as unknown as Band;
    const up = lit.getExit('up') as ColumnExit;
    const floor = p.getFloor() as unknown as { openWaterAreaM2(): number };
    const d = diver();
    ContainmentApi.move(d as never, lit as never);
    vi.spyOn(floor, 'openWaterAreaM2').mockReturnValue(0);
    const shut = await up.canTraverse(d as never, 'swim');
    expect(shut).toMatchObject({ ok: false, reason: 'The ice is a ceiling over you; the only way up is the hole.' });
  });

  it('⭐ a disconnected body on the bed is brought up and held at the surface (D11)', async () => {
    const p = await surface();
    const bed = (await (await column()).bandOf(p, 'bed')) as unknown as Band;
    const d = diver();
    ContainmentApi.move(d as never, bed as never);
    expect(await bed.holdAtSurface(d as unknown as Stuff)).toBe(true);
    expect(d.getContainer()).toBe(p);
    expect(bed.surfacePlace()).toBe(p);
  });

  it('a band reads from its prose bank, steady within the hour', async () => {
    const p = await surface();
    const lit = (await (await column()).bandOf(p, 'lit')) as unknown as Band;
    const first = lit.getLongDescription();
    expect(['the lit water, one', 'the lit water, two']).toContain(first);
    expect(lit.getLongDescription()).toBe(first);
  });
});
