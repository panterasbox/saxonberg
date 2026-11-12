/**
 * ⭐ A pocket is a named REGION of its garment, never an object (size and
 * carrying D26): the row's entries become the coat's offers; what is put in
 * one lives in the wearer's contents with the pair `(coat, left pocket)`;
 * each pocket has its own mouth and room; an inner pocket is covered, a
 * buttoned one closes; and the pair is what persists.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { BiomeApi } from '../../../../api/biome';
import { MqlApi } from '../../../../api/mql';
import { Quantity } from '../../../../lib/quantity';
import { Placements } from '../../../../lib/spatial/Placement';
import type { PlacementEntry } from '../../../../lib/spatial/Placing';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms, material } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, wornGarment, garment } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import Location from '../../../../lib/location/Location';

/** D26's coat: two patch pockets, a buttoned breast pocket, a covered inner one. */
const COAT: PlacementEntry[] = [
  { member: Placements.POCKET, name: 'left pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
  { member: Placements.POCKET, name: 'right pocket', mouth: { width: 0.16, height: 0.05 }, volumeM3: 0.0015 },
  { member: Placements.POCKET, name: 'breast pocket', mouth: { width: 0.12, height: 0.03 }, volumeM3: 0.0004, closes: true },
  { member: Placements.POCKET, name: 'inner pocket', mouth: { width: 0.14, height: 0.03 }, volumeM3: 0.0006, covered: true },
];
/** D26's trousers: two pockets a key goes in and a mug does not. */
const TROUSERS: PlacementEntry[] = [
  { member: Placements.POCKET, name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
  { member: Placements.POCKET, name: 'right pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];

const key = () => tool('key', 0.02, [0.06, 0.025, 0.003]);
const mug = () => tool('mug', 0.35, [0.09, 0.09, 0.1]);
const put = (item: Stuff, target: Stuff, by: Stuff, prep?: string, region?: string) =>
  ContainmentApi.putPlanFor(item as Stuff & Containable, target, { by, ...(prep ? { prep } : {}), ...(region ? { region } : {}) });

describe('Garment — pockets as regions (D26)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a garment with no pockets offers nothing; the row\'s entries become offers', async () => {
    const shirt = await garment('shirt');
    expect(shirt.getPlacements()).toEqual([]);
    const coat = await garment('coat', COAT);
    expect(coat.getPlacements()).toEqual(['left pocket', 'right pocket', 'breast pocket', 'inner pocket']);
    expect(coat.namedRegions()).toEqual(['left pocket', 'right pocket', 'breast pocket', 'inner pocket']);
    // A coat answers to its pockets' names — the binder's facet.
    expect(coat.getKeywords()).toEqual(expect.arrayContaining(['coat', 'inner pocket', 'left pocket']));
  });

  it('`put cup in coat` asks which pocket; `put key in inner pocket` takes it', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    const k = key();
    ContainmentApi.move(k, me);
    const asked = put(k, coat, me, 'in');
    expect(asked.ok).toBe(false);
    if (!asked.ok && asked.reason === 'preposition-ambiguous') {
      expect(asked.facts.regions).toEqual(['left pocket', 'right pocket', 'breast pocket', 'inner pocket']);
    } else {
      throw new Error(`expected an ambiguous put, got ${JSON.stringify(asked)}`);
    }
    const plan2 = put(k, coat, me, 'in', 'inner pocket');
    expect(plan2.ok).toBe(true);
    if (!plan2.ok) return;
    expect((await plan2.onComplete()).ok).toBe(true);
    // In the WEARER's contents, the pair naming the coat's region.
    expect(k.getContainer()).toBe(me);
    expect(k.getPlacement()).toEqual({ host: coat, name: 'inner pocket' });
    expect(coat.getPlaced('inner pocket')).toEqual([k]);
    expect(me.tierOf(k)).toBe('ready');
    expect(me.isHonest(k)).toBe(true);
  });

  it('the binder names the region: `inner pocket` binds the coat with via.region', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    const r = MqlApi.resolveOne('inner pocket', { commandGiver: me as never, scope: 'inventory' });
    expect(r.stuff).toBe(coat);
    expect(r.via?.region).toBe('inner pocket');
  });

  it('one pocket is taken without asking', async () => {
    const { me, plan } = makeBody();
    const apron = await wornGarment(me, plan, 'apron', 'torso', [
      { member: Placements.POCKET, name: 'front pocket', mouth: { width: 0.2, height: 0.05 }, volumeM3: 0.002 },
    ]);
    const k = key();
    ContainmentApi.move(k, me);
    const p = put(k, apron, me, 'in');
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.facts.route).toEqual({ kind: 'region', name: 'front pocket', word: 'into' });
  });

  it('each pocket fits by its own mouth and room: a key goes in a trouser pocket, a mug does not', async () => {
    const { me, plan } = makeBody();
    const trousers = await wornGarment(me, plan, 'trousers', 'legs', TROUSERS);
    const m = mug();
    ContainmentApi.move(m, me);
    const refused = put(m, trousers, me, 'in', 'left pocket');
    expect(refused).toMatchObject({ ok: false, reason: 'cannot-rest', facts: { why: 'too-big-for-mouth' } });
    expect(trousers.canPlace(key(), 'left pocket')).toEqual({ ok: true });
    // Capacity: 0.0006 m³ of box takes this many matchboxes and no more.
    const box = () => tool('matchbox', 0.02, [0.05, 0.035, 0.015]);
    let placed = 0;
    for (let i = 0; i < 40; i++) {
      const b = box();
      ContainmentApi.move(b, me);
      if (!trousers.canPlace(b, 'right pocket').ok) {
        expect(trousers.canPlace(b, 'right pocket')).toEqual({ ok: false, reason: 'no-room' });
        break;
      }
      ContainmentApi.move(b, trousers, 'right pocket');
      placed++;
    }
    expect(placed).toBe(22); // 0.0006 / (0.05 × 0.035 × 0.015)
  });

  it('a buttoned pocket keeps a floater under water; an open one lets it go', async () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue({
      tag: 'water', substance: 'water', immersed: true, atSurface: false,
    } as never);
    vi.spyOn(BiomeApi, 'densityOf').mockReturnValue(Quantity.of(1000, 'kg/m³'));
    const cork = () => {
      const c = tool('cork', 0.003, [0.02, 0.02, 0.03]);
      c.setMaterial(material('/stuff/idea/material/_pocket/cork', 240));
      return c;
    };
    const buttoned = cork();
    ContainmentApi.move(buttoned, me);
    ContainmentApi.move(buttoned, coat, 'breast pocket');
    const loose = cork();
    ContainmentApi.move(loose, me);
    ContainmentApi.move(loose, coat, 'left pocket');
    const left = me.reconcilePressing();
    expect(left).toEqual([loose]);
    expect(loose.getContainer()).toBe(room);
    expect(buttoned.getPlacement()).toEqual({ host: coat, name: 'breast pocket' });
    // Reaching into a buttoned pocket costs the undoing of it.
    expect(me.readySeconds(buttoned)).toBeGreaterThan(me.readySeconds(key()));
  });

  it('the placement pair is what persists — the shipped restore puts it back', async () => {
    const { me, plan } = makeBody();
    const coat = await wornGarment(me, plan, 'coat', 'torso', COAT);
    const k = key();
    ContainmentApi.move(k, me);
    ContainmentApi.move(k, coat, 'left pocket');
    expect(k.getPlacement()?.name).toBe('left pocket');
    // Taken out and put back by its region name — the pair is the name.
    ContainmentApi.move(k, me);
    expect(k.getPlacement()).toBeNull();
    ContainmentApi.move(k, coat, 'left pocket');
    expect(coat.getPlaced('left pocket')).toEqual([k]);
    // The pair's region resolves to its way of sitting by the host.
    expect(coat.placementOf('left pocket').getEncloses()).toBe(true);
  });
});
