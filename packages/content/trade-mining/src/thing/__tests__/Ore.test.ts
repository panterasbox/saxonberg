/**
 * The ore lump (metal chain M6) — grade, pooling, and the one thing
 * about ore that makes theft a real subject later.
 *
 * ⭐ **Ore stacks fungibly and grade averages when lumps pool**, which is
 * literally what happens in a cart. That does not weaken *"true weight,
 * true grade"* — it **moves the lie from physics to declaration**. Ore
 * that pools cannot be audited lump by lump, so high-grading (pocketing
 * the rich pieces before the lot is weighed) is a theft that works
 * *because* ore pools. Stage A ships the pooling and the honest assay;
 * high-grading as an OFFENCE wants an adjudicator, which is Stage B.
 *
 * ⚠ The formula is the DELTA form, and the shipped merge order is why —
 * see `Ore.onMerged`. This suite verifies that order rather than trusting
 * it, including the one thing the plan flagged as unknown: whether the
 * absorbed stack's fields are still readable after `destruct`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ore from '../Ore';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { GlobbableApi } from '@saxonberg/server/mud/api/glob';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';

const MALACHITE = '/stuff/idea/material/mineral/malachite';
const COPPER = '/stuff/idea/material/element/copper';
const ORE_ROW = '/world/fx/thing/copper-ore';

/**
 * `merge` and `split` are `ApiOnly` — the glob substrate's own gate. A
 * cart pooling ore is an Api caller in the world (`GetController`'s
 * merge-on-arrival); here the harness stands in as one.
 */
function asApiCaller<T>(fn: () => T): T {
  return ExecutionContextApi.run(null, StuffApi, 'test-harness', undefined, fn);
}

function lump(quantity: number, grade: number): Ore {
  const o = makeStuff(() => new Ore());
  stampTemplatePathForTest(o, ORE_ROW);
  o.setQuantity(quantity);
  o.setGrade(grade);
  (o as unknown as { _materialPath: string })._materialPath = MALACHITE;
  return o;
}

describe('the ore lump', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: async () => '1',
      find: async () => [],
      findById: async () => null,
      delete: async () => undefined,
      isConnected: () => true,
    } as unknown as PersistenceManager);
    // A split clones the row — the stack the lot was cut from.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => {
      const o = makeStuff(() => new Ore());
      stampTemplatePathForTest(o, ORE_ROW);
      (o as unknown as { _materialPath: string })._materialPath = MALACHITE;
      return o;
    }) as never);
    const m = makeStuffAtPath(() => new Material(), MALACHITE);
    // ⭐ Chemistry, not a dial: two Cu in a 221.114 g/mol formula unit.
    m.setComposition([{ materialPath: COPPER, fraction: 0.5748 }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('is Globbable and Chattel — it stacks, and a lump carries its owner', () => {
    const o = lump(1, 0.08);
    expect(MixinApi.isGlobbable(o)).toBe(true);
    expect(MixinApi.isChattel(o)).toBe(true);
    // ⚠ NOT GradedMixin — that is the poor…masterful QUALITY band, a
    // different axis entirely. Grade is a fraction of metal by mass.
    expect(MixinApi.isGraded(o)).toBe(false);
  });

  it('⭐ two lumps of different grade pool to the MASS-WEIGHTED average', () => {
    const rich = lump(2, 0.20);
    const lean = lump(6, 0.04);
    // Two lumps of ONE row pool regardless of grade — the shipped
    // `canMergeWith` default, and what a cart does.
    expect(rich.canMergeWith(lean)).toBe(true);
    asApiCaller(() => rich.absorb(lean));
    expect(rich.getQuantity()).toBe(8);
    expect(rich.getGrade()).toBeCloseTo((0.2 * 2 + 0.04 * 6) / 8, 10);
  });

  it('⚠ the absorbed stack is DESTRUCTED before the hook fires — and its fields still read', () => {
    const survivor = lump(3, 0.10);
    const absorbed = lump(1, 0.50);
    asApiCaller(() => survivor.absorb(absorbed));
    // The plan flagged this as the one unknown: if `destruct` had cleared
    // the absorbed stack's fields, the delta form could not be written at
    // all and the read would have to move to a pre-hook. It does not.
    expect(absorbed.isDestroyed()).toBe(true);
    expect(survivor.getGrade()).toBeCloseTo((0.1 * 3 + 0.5 * 1) / 4, 10);
  });

  it('pooling is associative enough to trust: three lots in any order land the same', () => {
    const order1 = lump(2, 0.20);
    asApiCaller(() => order1.absorb(lump(3, 0.05)));
    asApiCaller(() => order1.absorb(lump(5, 0.10)));

    const order2 = lump(5, 0.10);
    asApiCaller(() => order2.absorb(lump(3, 0.05)));
    asApiCaller(() => order2.absorb(lump(2, 0.20)));

    expect(order1.getQuantity()).toBe(order2.getQuantity());
    expect(order1.getGrade()).toBeCloseTo(order2.getGrade(), 10);
    expect(order1.getGrade()).toBeCloseTo((0.2 * 2 + 0.05 * 3 + 0.1 * 5) / 10, 10);
  });

  it('the pooled figure survives a SPLIT — a sample off the lot assays as the lot', async () => {
    const lot = lump(2, 0.20);
    asApiCaller(() => lot.absorb(lump(6, 0.04)));
    const pooled = lot.getGrade();
    const sample = (await asApiCaller(() => lot.split(3))) as unknown as Ore;
    expect(sample.getGrade()).toBeCloseTo(pooled, 10);
    expect(lot.getGrade()).toBeCloseTo(pooled, 10);
    expect(lot.getQuantity()).toBe(5);
  });

  it('⭐ the metal in a lump is CHEMISTRY × grade — nobody authors how much copper comes out', () => {
    const rich = lump(1, 0.20);
    const lean = lump(1, 0.04);
    expect(rich.metalFractionOf(COPPER)).toBeCloseTo(0.5748 * 0.2, 10);
    expect(lean.metalFractionOf(COPPER)).toBeCloseTo(0.5748 * 0.04, 10);
    // A lean lump honestly makes less metal — the ratio is the grade's.
    expect(rich.metalFractionOf(COPPER) / lean.metalFractionOf(COPPER)).toBeCloseTo(5, 6);
  });

  it('a lump of something with no copper in it yields an honest ZERO, never an invented figure', () => {
    const o = lump(1, 0.5);
    expect(o.metalFractionOf('/stuff/idea/material/element/iron')).toBe(0);
  });

  it('grade is clamped to a fraction — a row cannot author 300% copper ore', () => {
    const o = lump(1, 0);
    o.setGrade(3);
    expect(o.getGrade()).toBe(1);
    o.setGrade(-1);
    expect(o.getGrade()).toBe(0);
  });
});
