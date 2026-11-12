/**
 * ⭐ Things others hang from are bounded by their LENGTH and by what their
 * material bears (size and carrying D4) — a rail, a belt, a key ring.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Placements } from '../Placement';
import { installForms, material, thing, place, Item, Surface } from './size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const STEEL = '/stuff/idea/material/_hang/steel';
const LEATHER = '/stuff/idea/material/_hang/leather';
const PINE = '/stuff/idea/material/_hang/pine';

describe('Placing — the hanging rule', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  const rail = (lengthM: number, mat = material(PINE, 500)) => {
    const r = thing(() => new Surface(), { material: mat, kg: 2, box: { width: 0.03, depth: 0.03, height: lengthM } });
    r.placements = [Placements.FROM];
    ContainmentApi.move(r, place(3, 'ceiling', 'walled'));
    return r;
  };
  const tool = (width: number, kg = 0.5) =>
    thing(() => new Item(), { material: material(STEEL, 7850), kg, box: { width, depth: 0.02, height: 0.3 } });

  it('a rail takes things until its length is spent — and the refusal names it', () => {
    const r = rail(0.5);
    expect(r.hangingLengthM()).toBeCloseTo(0.5);
    for (let i = 0; i < 4; i++) ContainmentApi.move(tool(0.12), r, Placements.FROM);
    expect(r.canPlace(tool(0.12), Placements.FROM)).toEqual({ ok: false, reason: 'no-room-along' });
  });

  it('a hook takes one thing however wide it is', () => {
    const hook = rail(0.04);
    expect(hook.canPlace(tool(0.2), Placements.FROM)).toEqual({ ok: true });
    ContainmentApi.move(tool(0.2), hook, Placements.FROM);
    expect(hook.canPlace(tool(0.01), Placements.FROM)).toEqual({ ok: false, reason: 'no-room-along' });
  });

  it('a strap bears what its material bears — a heavy load is refused', () => {
    const strap = rail(1.0, material(LEATHER, 860, 20));
    const bears = strap.bearsKg();
    expect(bears).toBeGreaterThan(0);
    expect(Number.isFinite(bears)).toBe(true);
    const anvil = thing(() => new Item(), { material: material(STEEL, 7850), kg: bears + 1, box: { width: 0.1, depth: 0.1, height: 0.3 } });
    expect(strap.canPlace(anvil, Placements.FROM)).toEqual({ ok: false, reason: 'too-heavy-for' });
  });

  it('an unset strength is unbounded', () => {
    expect(rail(1.0).bearsKg()).toBe(Infinity);
  });

  it('room left is said in words, never a number', () => {
    const r = rail(0.5);
    expect(r.roomFor(Placements.FROM)).toBe('plenty');
    ContainmentApi.move(tool(0.3), r, Placements.FROM);
    expect(r.roomFor(Placements.FROM)).toBe('one more pouch');
    ContainmentApi.move(tool(0.15), r, Placements.FROM);
    expect(r.roomFor(Placements.FROM)).toBe('a small thing');
    ContainmentApi.move(tool(0.05), r, Placements.FROM);
    expect(r.roomFor(Placements.FROM)).toBe('none');
  });

  it('a surface (`on`) bounds nothing', () => {
    const table = thing(() => new Surface(), { kg: 20, box: { width: 0.5, depth: 0.5, height: 0.7 } });
    ContainmentApi.move(table, place(3, 'ceiling', 'walled'));
    for (let i = 0; i < 10; i++) ContainmentApi.move(tool(0.3), table, Placements.ON);
    expect(table.canPlace(tool(0.3), Placements.ON)).toEqual({ ok: true });
  });
});
