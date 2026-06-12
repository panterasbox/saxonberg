/**
 * MQL bulk-surface tests — the `:b` transform, material-keyword
 * resolution, and the `:{N unit}` measure grammar (formal + natural
 * language). The substrate itself is covered in
 * `lib/bulk/__tests__/Bulkable.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { makeWorld, type MqlWorld } from './fixtures/mql-world';
import { MqlApi } from '../mql';
import type { MqlContext } from '../mql/types';
import { desugar } from '../mql/desugar';
import { parse } from '../mql/parser';
import Receptacle from '../../obj/Receptacle';
import Material from '../../lib/material/Material';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

function makeMaterial(path: string, name: string, keywords: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords(keywords);
    m.setAppearance(`some ${name}`);
    return m;
  }, path) as unknown as Material;
}

function makeThermos(material: Material, amountL: number): Stuff {
  const v = makeStuff(() => {
    const t = new Receptacle();
    t.setShortDescription('a steel thermos');
    t.addKeyword('thermos');
    t.interiorBulk = true;
    t.setInteriorCapacity(Quantity.of(0.5, 'L'));
    t.setBulkMaterial('interior', material);
    t.setBulkAmount('interior', Quantity.of(amountL, 'L'));
    return t;
  });
  return v as unknown as Stuff;
}

describe('MQL — bulk measure grammar (pure functions)', () => {
  it('desugars "2 cups water" → measure hint + keyword residual', () => {
    const r = desugar('2 cups water');
    expect(r.rewritten).toBe('water');
    expect(r.quantityHint).toEqual({
      value: { kind: 'measure', value: 2, unit: 'cup' },
      mode: 'lenient',
    });
  });

  it('keeps "5 coins" a discrete count (unit-token check precedes)', () => {
    const r = desugar('5 coins');
    expect(r.rewritten).toBe('coins');
    expect(r.quantityHint).toEqual({
      value: { kind: 'count', n: 5 },
      mode: 'lenient',
    });
  });

  it('parses water:{2 cups} → a measure QuantityNode', () => {
    const ast = parse('water:{2 cups}');
    const q = ast.sublists[0]!.base.rest.find(
      (op) => op.element.kind === 'quantity',
    );
    expect(q?.element).toMatchObject({
      kind: 'quantity',
      value: { kind: 'measure', value: 2, unit: 'cup' },
    });
  });

  it('parses water:{*} → all (no unit)', () => {
    const ast = parse('water:{*}');
    const q = ast.sublists[0]!.base.rest.find(
      (op) => op.element.kind === 'quantity',
    );
    expect(q?.element).toMatchObject({ value: { kind: 'all' } });
  });
});

describe('MQL — bulk scope resolution', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    world = makeWorld();
    ctx = {
      commandGiver: world.giver,
      scope: 'reachable',
      permission: { isAuthor: false },
    };
  });

  it('drink coffee → resolves the holder via material keyword, via.bulk set', () => {
    const coffee = makeMaterial('/lib/material/bulk/coffee', 'coffee', ['coffee']);
    const thermos = makeThermos(coffee, 0.3);
    ContainmentApi.move(
      thermos as never,
      world.giver as never,
    );
    const r = MqlApi.resolveOne('coffee', ctx);
    expect(r.stuff?.stuffId).toBe(thermos.stuffId);
    expect(r.via?.bulk?.affordance).toBe('interior');
  });

  it('thermos:b → keeps the holder, stamps via.bulk interior', () => {
    const coffee = makeMaterial('/lib/material/bulk/coffee', 'coffee', ['coffee']);
    const thermos = makeThermos(coffee, 0.3);
    ContainmentApi.move(thermos as never, world.giver as never);
    const r = MqlApi.resolveOne('thermos:b', ctx);
    expect(r.stuff?.stuffId).toBe(thermos.stuffId);
    expect(r.via?.bulk?.affordance).toBe('interior');
  });

  it(':b on a non-holder yields empty (rose is not Bulkable)', () => {
    const r = MqlApi.resolveMany('rose:b', ctx);
    expect(r.stuff).toHaveLength(0);
  });

  it('an empty holder contributes no material-keyword candidate', () => {
    const coffee = makeMaterial('/lib/material/bulk/coffee', 'coffee', ['coffee']);
    const thermos = makeThermos(coffee, 0); // empty
    ContainmentApi.move(thermos as never, world.giver as never);
    const r = MqlApi.resolveMany('coffee', ctx);
    expect(r.stuff).toHaveLength(0);
  });

  it('water:{2 cups} threads a strict measure quantity', () => {
    const r = MqlApi.resolveMany('water:{2 cups}', ctx);
    expect(r.quantity).toEqual({
      value: { kind: 'measure', value: 2, unit: 'cup' },
      mode: 'strict',
    });
  });

  it('"2 cups water" natural language threads a lenient measure', () => {
    const r = MqlApi.resolveMany('2 cups water', ctx);
    expect(r.quantity).toMatchObject({
      value: { kind: 'measure', value: 2, unit: 'cup' },
      mode: 'lenient',
    });
  });
});
