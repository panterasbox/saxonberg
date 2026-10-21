/**
 * ⭐ The potter's hand (ceramics S4, D16): the instrument plans, the clay
 * yields, and competence decides the pot — a beginner's mug is heavy, a
 * pot beyond the hand is refused naming the band, and a day at the brick
 * table is the band's rate × the hours, one stack, as far as the clay goes.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Form from '@saxonberg/server/mud/platform/idea/Form';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { TestActor } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { ShapePlan, ShapeRefusal } from '@saxonberg/server/mud/lib/craft/Shapeable';
import Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';
import Wheel from '../thing/Wheel';
import BrickTable from '../thing/BrickTable';
import Ware from '../thing/Ware';
import Brick from '../thing/Brick';

class Shed extends Place {}

let clayMat: Material;
let seq = 0;
const forms = new Map<string, Form>();

function form(key: string, formClass: Form['formClass'], capacityL: number, product: string, discipline = 'pottery'): string {
  const path = `/trade/ceramics/idea/form/${key}`;
  const f = makeStuff(() => new Form());
  f.key = key;
  f.formClass = formClass;
  f.capacityL = capacityL;
  f.product = product;
  f.discipline = discipline;
  f.greenScale = formClass === 'block' ? 1.08 : 1;
  forms.set(path, f);
  return path;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  forms.clear();
  seq += 1;
  clayMat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('clay');
    m.setTags(['earth', 'plastic', 'clay']);
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    return m;
  }, `/stuff/idea/material/_shape/clay-${seq}`) as unknown as Material;
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => forms.get(p) ?? null) as never);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (row: string) => {
    if (row.endsWith('/brick')) {
      const b = makeStuff(() => new Brick());
      b.setMass(Quantity.of(3.6, 'kg'));
      return b;
    }
    const w = makeStuff(() => new Ware());
    w.interiorBulk = true;
    return w;
  }) as never);
  vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation((async () => {}) as never);
});
afterEach(() => vi.restoreAllMocks());

async function standUp(band: CompetenceBandName, clayKg: number) {
  const shed = makeStuff(() => new Shed());
  const actor = makeStuff(() => new TestActor());
  vi.spyOn(actor, 'competenceBandFor').mockResolvedValue(band);
  await ContainmentApi.move(actor, shed);
  const clay = makeStuff(() => new Clay());
  clay.setMaterial(clayMat);
  clay.setMass(Quantity.of(clayKg, 'kg'));
  await ContainmentApi.move(clay, actor);
  return { shed, actor, clay };
}

async function wheelIn(shed: Place): Promise<Wheel> {
  const w = makeStuff(() => new Wheel());
  w.forms = [form('mug', 'open', 0.3, '/trade/ceramics/thing/mug'), form('jar', 'closed', 2, '/trade/ceramics/thing/jar')];
  await ContainmentApi.move(w, shed);
  return w;
}

async function run(plan: ShapePlan | ShapeRefusal | null): Promise<void> {
  expect(plan?.ok).toBe(true);
  if (plan?.ok) plan.onComplete();
  for (let i = 0; i < 12; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

describe('the wheel and the hand', () => {
  it('⭐ a novice’s mug is heavier than a proficient potter’s — never failed', async () => {
    const masses: number[] = [];
    for (const band of ['novice', 'proficient'] as const) {
      const { shed, actor, clay } = await standUp(band, 12);
      const wheel = await wheelIn(shed);
      await run(await wheel.shapePlanFor({ actor, material: clay, formText: 'mug', commandText: 'shape clay into mug' }));
      const mug = actor.getContents().find((c) => c instanceof Ware) as Ware | undefined;
      expect(mug, `${band} made no mug`).toBeDefined();
      expect(mug!.getMaterial()).toBe(clayMat);
      expect(mug!.getMaker()).toBe(actor.getIdentityPath() ?? '');
      masses.push(mug!.getMass().rawValue());
    }
    expect(masses[0]!).toBeGreaterThan(masses[1]! * 1.4);
  });

  it('⭐ a jar beyond the hand is refused, and the refusal names the band', async () => {
    const { shed, actor, clay } = await standUp('novice', 30);
    const wheel = await wheelIn(shed);
    const plan = await wheel.shapePlanFor({ actor, material: clay, formText: 'jar holding 2 gallons', commandText: '' });
    expect(plan?.ok).toBe(false);
    expect(String((plan as ShapeRefusal).line)).toMatch(/novice/);
  });

  it('the wheel will not make a brick, and asks for a size it understands', async () => {
    const { shed, actor, clay } = await standUp('expert', 12);
    const wheel = await wheelIn(shed);
    const brick = await wheel.shapePlanFor({ actor, material: clay, formText: 'block', commandText: '' });
    expect(brick?.ok).toBe(false);
    const teapot = await wheel.shapePlanFor({ actor, material: clay, formText: 'teapot', commandText: '' });
    expect((teapot as ShapeRefusal).reason).toBe('unknown-form');
  });

  it('the clay is consumed by mass, and the piece is captured where it landed', async () => {
    const { shed, actor, clay } = await standUp('proficient', 12);
    const wheel = await wheelIn(shed);
    await run(await wheel.shapePlanFor({ actor, material: clay, formText: 'jar', commandText: '' }));
    expect(clay.clayKg()).toBeLessThan(12);
    expect(PersistableApi.captureHostOf).toHaveBeenCalled();
  });
});

describe('a day at the brick table', () => {
  async function table(shed: Place): Promise<BrickTable> {
    const t = makeStuff(() => new BrickTable());
    t.forms = [form('brick', 'block', 0, '/trade/ceramics/thing/brick', 'brickmaking')];
    await ContainmentApi.move(t, shed);
    return t;
  }

  it('⭐ the band’s rate × the hours, as ONE stack, as far as the clay goes', async () => {
    const plenty = await standUp('competent', 20_000);
    const t1 = await table(plenty.shed);
    await run(await t1.shapePlanFor({ actor: plenty.actor, material: plenty.clay, formText: 'brick', commandText: '' }));
    const day = plenty.shed.getContents().find((c) => c instanceof Brick) as Brick | undefined;
    expect(day?.getQuantity()).toBe(150 * 8);

    const short = await standUp('expert', 40);
    const t2 = await table(short.shed);
    await run(await t2.shapePlanFor({ actor: short.actor, material: short.clay, formText: 'brick', commandText: '' }));
    const few = short.shed.getContents().find((c) => c instanceof Brick) as Brick | undefined;
    // 40 kg ÷ (3.6 kg × 1.08) = 10 bricks — the clay ran out first.
    expect(few?.getQuantity()).toBe(10);
  });

  it('a novice moulds fewer than a master in the same day', async () => {
    const a = await standUp('novice', 20_000);
    await run(await (await table(a.shed)).shapePlanFor({ actor: a.actor, material: a.clay, formText: 'brick', commandText: '' }));
    const novice = (a.shed.getContents().find((c) => c instanceof Brick) as Brick).getQuantity();
    expect(novice).toBeLessThan(150 * 8);
  });
});
