/**
 * A lid that shuts ADDS a side (size and carrying D4): it will not close on
 * a pole standing out of the box, and says so.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installForms, material, thing, place, Item, Chest } from './size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('Sealable — the lid will not shut on an overhang', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  it('refuses to close, naming what sticks out; closes once it is out', () => {
    const chest = thing(() => new Chest(), { kg: 20, box: { width: 0.8, depth: 0.5, height: 0.5 } });
    chest.setOpen(true);
    const pole = thing(() => new Item(), { material: material('/stuff/idea/material/_lid/ash', 700), kg: 1, box: { width: 0.04, depth: 0.04, height: 1.6 } });
    ContainmentApi.move(pole, chest);
    const by = thing(() => new Item(), {});
    const veto = chest.canClose(by);
    expect(veto.ok).toBe(false);
    expect(veto.ok === false && veto.reason).toMatch(/sticks out — the lid won't shut/);
    ContainmentApi.move(pole, place(3, 'ceiling', 'walled'));
    expect(chest.canClose(by)).toEqual({ ok: true });
  });

  it('a thing that fits under the lid does not stop it', () => {
    const chest = thing(() => new Chest(), { kg: 20, box: { width: 0.8, depth: 0.5, height: 0.5 } });
    chest.setOpen(true);
    const box = thing(() => new Item(), { material: material('/stuff/idea/material/_lid/pine', 500), kg: 1, box: { width: 0.2, depth: 0.2, height: 0.2 } });
    ContainmentApi.move(box, chest);
    expect(chest.canClose(thing(() => new Item(), {}))).toEqual({ ok: true });
  });
});
