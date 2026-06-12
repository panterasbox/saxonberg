/**
 * Bulk verb roster — drives the requirements acceptance roster through
 * the real controllers (fill / sip / drink / pour / spill), asserting
 * state transitions, clamp / mismatch / drain-through outcomes, and
 * that the `ingest` seam fires. Models are hand-built `MqlOneResult`s
 * (MQL resolution is covered in `api/__tests__/bulk-mql.test.ts`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FillController from '../FillController';
import PourController from '../PourController';
import SpillController from '../SpillController';
import DrinkController from '../DrinkController';
import SipController from '../SipController';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { BulkableMixin } from '../../../../lib/bulk/Bulkable';
import { UnboundedSourceMixin } from '../../../../lib/bulk/UnboundedSource';
import { Idea } from '../../../../lib/stuff/Idea';
import Thing from '../../../../lib/stuff/Thing';
import Floor from '../../../../obj/Floor';
import Location from '../../../../lib/stuff/Location';
import Material from '../../../../lib/material/Material';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { BulkableApi } from '../../../../api/bulk';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult, MqlQuantity } from '../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestActor extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
  public ingested: Array<{ material: string; litres: number }> = [];
  ingest(material: Material, q: Quantity<'L'>): void {
    this.ingested.push({ material: material.getName(), litres: q.rawValue() });
  }
}

class Receptacle extends BulkableMixin(Thing) {
  static _mixinName = 'Receptacle';
}

class UnboundedReceptacle extends UnboundedSourceMixin(BulkableMixin(Thing)) {
  static _mixinName = 'UnboundedReceptacle';
}

function material(path: string, name: string): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setAppearance(`some ${name}`);
    return m;
  }, path) as unknown as Material;
}

function vessel(
  label: string,
  opts: {
    material?: Material;
    amountL?: number;
    capacityL?: number;
    closure?: 'open' | 'liquidTight' | 'sealed';
    unbounded?: boolean;
  },
): Stuff {
  return makeStuff(() => {
    const v = opts.unbounded ? new UnboundedReceptacle() : new Receptacle();
    v.setShortDescription(label);
    v.interiorBulk = true;
    if (opts.closure) v.setClosure(opts.closure);
    if (opts.capacityL !== undefined)
      v.setInteriorCapacity(Quantity.of(opts.capacityL, 'L'));
    if (opts.material) v.setBulkMaterial('interior', opts.material);
    if (opts.amountL !== undefined)
      v.setBulkAmount('interior', Quantity.of(opts.amountL, 'L'));
    return v;
  }) as unknown as Stuff;
}

function floorIn(loc: Stuff): Stuff {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (loc as unknown as { addFixture(f: Stuff): boolean }).addFixture(floor);
  return floor as unknown as Stuff;
}

function ctxFor(actor: Stuff, loc: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: loc as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function one(stuff: Stuff | null, raw: string, extra?: Partial<MqlOneResult>): MqlOneResult {
  return { stuff, raw, ...extra } as MqlOneResult;
}

function model(fields: Record<string, MqlOneResult>): never {
  return fields as ModelData as never;
}

function amountL(v: Stuff): number {
  return (v as unknown as { getBulk(a: string): { getAmount(): Quantity<'L'> } })
    .getBulk('interior')
    .getAmount()
    .rawValue();
}

function surfaceAmountL(floor: Stuff): number {
  return (floor as unknown as { getBulk(a: string): { getAmount(): Quantity<'L'> } })
    .getBulk('surface')
    .getAmount()
    .rawValue();
}

const MEASURE = (value: number, unit: 'cup' | 'L'): MqlQuantity => ({
  value: { kind: 'measure', value, unit },
  mode: 'lenient',
});

describe('Bulk verbs — command YAML views load + validate', () => {
  it.each([
    ['bulk/fill.yaml', 'fill', 'bulk/FillController'],
    ['bulk/pour.yaml', 'pour', 'bulk/PourController'],
    ['bulk/spill.yaml', 'spill', 'bulk/SpillController'],
    ['bulk/drink.yaml', 'drink', 'bulk/DrinkController'],
    ['bulk/sip.yaml', 'sip', 'bulk/SipController'],
  ])('%s parses, exposes %s, binds %s', (file, verb, controller) => {
    const cmd = CommandApi.getCommand(file);
    expect(cmd).not.toBeNull();
    expect(cmd!.verbs).toContain(verb);
    expect(cmd!.controller).toBe(controller);
  });
});

describe('Bulk verbs — fill / sip / drink', () => {
  let actor: Stuff & { ingested: Array<{ material: string; litres: number }> };
  let loc: Stuff;
  let urn: Stuff;
  let thermos: Stuff;
  let coffee: Material;

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    floorIn(loc);
    actor = makeStuff(() => new TestActor()) as never;
    (actor as unknown as { setName(n: string): void }).setName('bob');
    ContainmentApi.move(actor as never, loc as never);
    coffee = material('/lib/material/bulk/coffee', 'coffee');
    urn = vessel('a coffee urn', { material: coffee, unbounded: true });
    ContainmentApi.move(urn as never, loc as never);
    thermos = vessel('a steel thermos', { capacityL: 0.5 });
    ContainmentApi.move(thermos as never, actor as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('fills the thermos to capacity from the unbounded urn', async () => {
    const c = makeStuff(() => new FillController());
    await c.execute(
      model({ target: one(thermos, 'thermos'), source: one(urn, 'urn') }),
      ctxFor(actor, loc, 'fill'),
    );
    expect(amountL(thermos)).toBeCloseTo(0.5);
  });

  it('sip drops the amount by one sip and fires ingest; drink empties it', async () => {
    // Prime the thermos.
    await makeStuff(() => new FillController()).execute(
      model({ target: one(thermos, 'thermos'), source: one(urn, 'urn') }),
      ctxFor(actor, loc, 'fill'),
    );
    await makeStuff(() => new SipController()).execute(
      model({ target: one(thermos, 'thermos') }),
      ctxFor(actor, loc, 'sip'),
    );
    expect(amountL(thermos)).toBeCloseTo(0.47);
    expect(actor.ingested).toHaveLength(1);
    expect(actor.ingested[0]).toEqual({ material: 'coffee', litres: 0.03 });

    await makeStuff(() => new DrinkController()).execute(
      model({ target: one(thermos, 'thermos') }),
      ctxFor(actor, loc, 'drink'),
    );
    expect(amountL(thermos)).toBeCloseTo(0);
    expect(actor.ingested).toHaveLength(2);

    // Refill works — the urn is unbounded.
    await makeStuff(() => new FillController()).execute(
      model({ target: one(thermos, 'thermos'), source: one(urn, 'urn') }),
      ctxFor(actor, loc, 'fill'),
    );
    expect(amountL(thermos)).toBeCloseTo(0.5);
  });

  it('drink coffee resolves through via.bulk to the holder', async () => {
    await makeStuff(() => new FillController()).execute(
      model({ target: one(thermos, 'thermos'), source: one(urn, 'urn') }),
      ctxFor(actor, loc, 'fill'),
    );
    const ctx = ctxFor(actor, loc, 'drink');
    await makeStuff(() => new DrinkController()).execute(
      model({
        target: one(thermos, 'coffee', { via: { bulk: { affordance: 'interior' } } }),
      }),
      ctx,
    );
    expect(amountL(thermos)).toBeCloseTo(0);
    expect(actor.ingested.at(-1)?.material).toBe('coffee');
  });
});

describe('Bulk verbs — pour clamp / mismatch / drain; spill', () => {
  let actor: Stuff;
  let loc: Stuff;
  let floor: Stuff;
  let waterSrc: Stuff;
  let mug: Stuff;
  let colander: Stuff;
  let water: Material;
  let coffee: Material;

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    floor = floorIn(loc);
    actor = makeStuff(() => new TestActor()) as unknown as Stuff;
    (actor as unknown as { setName(n: string): void }).setName('bob');
    ContainmentApi.move(actor as never, loc as never);
    water = material('/lib/material/bulk/water', 'water');
    coffee = material('/lib/material/bulk/coffee', 'coffee');
    waterSrc = vessel('a water tap', { material: water, unbounded: true });
    ContainmentApi.move(waterSrc as never, loc as never);
    mug = vessel('a ceramic mug', { capacityL: 0.35 });
    ContainmentApi.move(mug as never, actor as never);
    colander = vessel('a tin colander', { capacityL: 0.5, closure: 'open' });
    ContainmentApi.move(colander as never, loc as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('pour 2 cups water into mug → mug gains ~0.35 L (clamped at capacity)', async () => {
    const ctx = ctxFor(actor, loc, 'pour');
    await makeStuff(() => new PourController()).execute(
      model({
        source: one(waterSrc, '2 cups water', { quantity: MEASURE(2, 'cup') }),
        target: one(mug, 'mug'),
      }),
      ctx,
    );
    // 2 cups ≈ 0.473 L; mug capacity 0.35 → clamped.
    expect(amountL(mug)).toBeCloseTo(0.35);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'quantity-clamped' }),
    );
  });

  it('pour water:{99 cups} into mug (strict) → declined, rejected note', async () => {
    const ctx = ctxFor(actor, loc, 'pour');
    await makeStuff(() => new PourController()).execute(
      model({
        source: one(waterSrc, 'water', {
          quantity: { value: { kind: 'measure', value: 99, unit: 'cup' }, mode: 'strict' },
        }),
        target: one(mug, 'mug'),
      }),
      ctx,
    );
    expect(amountL(mug)).toBeCloseTo(0);
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'quantity-clamped-rejected' }),
    );
  });

  it('pour coffee into a water-holding mug → material mismatch', async () => {
    // Seed the mug with water first.
    await makeStuff(() => new PourController()).execute(
      model({ source: one(waterSrc, 'water'), target: one(mug, 'mug') }),
      ctxFor(actor, loc, 'pour'),
    );
    expect(amountL(mug)).toBeGreaterThan(0);
    const coffeeSrc = vessel('a coffee pot', { material: coffee, amountL: 1, capacityL: 2 });
    ContainmentApi.move(coffeeSrc as never, loc as never);

    const ctx = ctxFor(actor, loc, 'pour');
    await makeStuff(() => new PourController()).execute(
      model({ source: one(coffeeSrc, 'coffee'), target: one(mug, 'mug') }),
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: 'target-declined', reason: 'material-mismatch' }),
    );
  });

  it('pour water into an open colander → drains through to a floor puddle', async () => {
    const ctx = ctxFor(actor, loc, 'pour');
    await makeStuff(() => new PourController()).execute(
      model({
        source: one(waterSrc, '2 cups water', { quantity: MEASURE(2, 'cup') }),
        target: one(colander, 'colander'),
      }),
      ctx,
    );
    expect(amountL(colander)).toBeCloseTo(0);
    expect(surfaceAmountL(floor)).toBeGreaterThan(0);
  });

  it('spill mug → mug empties; a puddle pools on the floor', async () => {
    // Fill the mug with water first.
    await makeStuff(() => new PourController()).execute(
      model({
        source: one(waterSrc, '1 cup water', { quantity: MEASURE(1, 'cup') }),
        target: one(mug, 'mug'),
      }),
      ctxFor(actor, loc, 'pour'),
    );
    const before = amountL(mug);
    expect(before).toBeGreaterThan(0);

    await makeStuff(() => new SpillController()).execute(
      model({ target: one(mug, 'mug') }),
      ctxFor(actor, loc, 'spill'),
    );
    expect(amountL(mug)).toBeCloseTo(0);
    expect(surfaceAmountL(floor)).toBeCloseTo(before);
  });
});

describe('Bulk verbs — look composes Material.appearance', () => {
  let actor: Stuff;
  let loc: Stuff;
  let floor: Stuff;
  let water: Material;

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    floor = floorIn(loc);
    actor = makeStuff(() => new TestActor()) as unknown as Stuff;
    (actor as unknown as { setName(n: string): void }).setName('bob');
    ContainmentApi.move(actor as never, loc as never);
    water = material('/lib/material/bulk/water', 'water');
  });

  const markupLong = (s: Stuff): string =>
    (s as unknown as { getMarkupLong(v: Stuff): string }).getMarkupLong(actor);

  it('look <holder> appends the interior contents via appearance', () => {
    const mug = vessel('a ceramic mug', { material: water, amountL: 0.2, capacityL: 0.35 });
    expect(markupLong(mug)).toContain('It holds some water.');
  });

  it('an empty holder adds nothing to its description', () => {
    const mug = vessel('a ceramic mug', { capacityL: 0.35 });
    expect(markupLong(mug)).not.toContain('It holds');
  });

  it('a floor puddle surfaces on the floor description and in the room view', () => {
    const src = vessel('a tap', { material: water, unbounded: true });
    ContainmentApi.move(src as never, loc as never);
    const mug = vessel('a ceramic mug', { capacityL: 0.35 });
    ContainmentApi.move(mug as never, actor as never);
    // Fill the mug then spill it onto the floor.
    makeStuff(() => new PourController()).execute(
      model({ source: one(src, 'water'), target: one(mug, 'mug') }),
      ctxFor(actor, loc, 'pour'),
    );
    makeStuff(() => new SpillController()).execute(
      model({ target: one(mug, 'mug') }),
      ctxFor(actor, loc, 'spill'),
    );
    expect(markupLong(floor)).toContain('A puddle of some water pools here.');
    expect(BulkableApi.floorPuddleSummary(loc)).toBe(
      'A puddle of some water pools on the floor.',
    );
  });
});
