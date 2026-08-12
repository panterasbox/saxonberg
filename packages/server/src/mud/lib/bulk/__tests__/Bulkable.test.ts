/**
 * Bulkable substrate tests — the `transfer` primitive, the closure
 * scale, slot accessors, surface-bulk on the Floor, and the
 * volume-unit round-trip. Drives `BulkableApi.transfer` directly; the
 * verb-level wiring is covered in `obj/command/bulk/__tests__`.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { BulkableApi } from '../../../api/bulk';
import {
  BulkableMixin,
  type ClosureLevel,
  type Bulkable,
} from '../Bulkable';
import { UnboundedSourceMixin } from '../UnboundedSource';
import { NamedMixin } from '../../description/Named';
import { ContainableMixin } from '../../spatial/Containable';
import type { Containable } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import Material from '../../material/Material';
import Floor from '../../../obj/Floor';
import Location from '../../stuff/Location';
import { Stuff } from '../../stuff/Stuff';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { ExecutionContextApi } from '../../../api/execution-context';
import type { BulkSlot } from '../Bulkable';
import type { TransferAmount, TransferResult } from '../../../api/bulk';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

/** Attach a fixture (the floor) to an Adornable host (the location). */
function attachFixture(host: Stuff, fixture: Stuff): void {
  (host as unknown as { addFixture(f: Stuff): boolean }).addFixture(fixture);
}

/** Run an ApiOnly-gated call (transfer) from a synthetic Api frame. */
function transfer(
  from: BulkSlot,
  to: BulkSlot | null,
  amount: TransferAmount,
): TransferResult {
  return ExecutionContextApi.run(null, BulkableApi, 'test-harness', undefined, () =>
    BulkableApi.transfer(from, to, amount),
  );
}

class TestVessel extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestVessel';
}

class TestSource extends UnboundedSourceMixin(
  BulkableMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestSource';
}

class LooseItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'LooseItem';
}

function makeMaterial(
  path: string,
  name: string,
  keywords: string[],
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords(keywords);
    m.setAppearance(`some ${name}`);
    return m;
  }, path) as unknown as Material;
}

function makeVessel(opts: {
  material?: Material;
  amountL?: number;
  capacityL?: number;
  closure?: ClosureLevel;
  unbounded?: boolean;
}): Stuff & Bulkable & Containable {
  return makeStuff(() => {
    const v = opts.unbounded ? new TestSource() : new TestVessel();
    v.setName('vessel');
    v.interiorBulk = true;
    if (opts.closure) v.setClosure(opts.closure);
    if (opts.capacityL !== undefined) {
      v.setInteriorCapacity(Quantity.of(opts.capacityL, 'L'));
    }
    if (opts.material) v.setBulkMaterial('interior', opts.material);
    if (opts.amountL !== undefined) {
      v.setBulkAmount('interior', Quantity.of(opts.amountL, 'L'));
    }
    return v;
  }) as unknown as Stuff & Bulkable & Containable;
}

describe('Bulkable — closure scale', () => {
  it('orders open < liquidTight < sealed', () => {
    expect(BulkableApi.compareClosure('open', 'liquidTight')).toBeLessThan(0);
    expect(BulkableApi.compareClosure('liquidTight', 'sealed')).toBeLessThan(0);
    expect(BulkableApi.compareClosure('liquidTight', 'liquidTight')).toBe(0);
  });

  it('liquid requires liquidTight', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    expect(BulkableApi.requiredClosureFor(water as unknown as Material)).toBe(
      'liquidTight',
    );
  });
});

describe('Bulkable — transfer clamp + material rules', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('accumulates the same material (+=)', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const src = makeVessel({ material: water, amountL: 2, capacityL: 5 });
    const dst = makeVessel({ material: water, amountL: 1, capacityL: 5 });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'measure', litres: 1, mode: 'lenient' },
    );
    expect(r.applied).toBeCloseTo(1);
    expect(dst.getBulk('interior').getAmount().rawValue()).toBeCloseTo(2);
    expect(src.getBulk('interior').getAmount().rawValue()).toBeCloseTo(1);
  });

  it('rejects a cross-material pour (material mismatch)', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const coffee = makeMaterial('/obj/material/bulk/coffee', 'coffee', [
      'coffee',
    ]);
    const src = makeVessel({ material: coffee, amountL: 2, capacityL: 5 });
    const dst = makeVessel({ material: water, amountL: 1, capacityL: 5 });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'all' },
    );
    expect(r.applied).toBe(0);
    expect(r.status).toBe('declined');
    expect(r.notes).toContainEqual(
      expect.objectContaining({ kind: 'target-declined', reason: 'material-mismatch' }),
    );
  });

  it('clamps a lenient overflow to what fits', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const src = makeVessel({ material: water, amountL: 10, capacityL: 20, unbounded: false });
    const dst = makeVessel({ capacityL: 0.35 });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'measure', litres: 5, mode: 'lenient' },
    );
    expect(r.applied).toBeCloseTo(0.35);
    expect(r.status).toBe('partial');
    expect(r.notes).toContainEqual(
      expect.objectContaining({ kind: 'quantity-clamped' }),
    );
  });

  it('rejects a strict overflow entirely', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const src = makeVessel({ material: water, amountL: 10, capacityL: 20 });
    const dst = makeVessel({ capacityL: 0.35 });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'measure', litres: 5, mode: 'strict' },
    );
    expect(r.applied).toBe(0);
    expect(r.status).toBe('declined');
    expect(r.notes).toContainEqual(
      expect.objectContaining({ kind: 'quantity-clamped-rejected' }),
    );
  });

  it('declines an empty source', () => {
    const dst = makeVessel({ capacityL: 1 });
    const src = makeVessel({ capacityL: 1 });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'all' },
    );
    expect(r.applied).toBe(0);
    expect(r.notes).toContainEqual(
      expect.objectContaining({ kind: 'empty-result' }),
    );
  });

  it('never depletes an unbounded source', () => {
    const coffee = makeMaterial('/obj/material/bulk/coffee', 'coffee', ['coffee']);
    const urn = makeVessel({ material: coffee, unbounded: true });
    const mug = makeVessel({ capacityL: 0.35 });
    expect(urn.getBulk('interior').available()).toBe(Infinity);
    const r = transfer(
      urn.getBulk('interior'),
      mug.getBulk('interior'),
      { kind: 'measure', litres: 0.35, mode: 'lenient' },
    );
    expect(r.applied).toBeCloseTo(0.35);
    // urn still full / not empty
    expect(urn.getBulk('interior').isEmpty()).toBe(false);
    expect(mug.getBulk('interior').getAmount().rawValue()).toBeCloseTo(0.35);
    expect(mug.getBulk('interior').getMaterialPath()).toBe(
      '/obj/material/bulk/coffee',
    );
  });

  it('empties a bounded source via the discard sink (drink)', () => {
    const coffee = makeMaterial('/obj/material/bulk/coffee', 'coffee', ['coffee']);
    const mug = makeVessel({ material: coffee, amountL: 0.3, capacityL: 0.35 });
    const r = transfer(mug.getBulk('interior'), null, { kind: 'all' });
    expect(r.applied).toBeCloseTo(0.3);
    expect(mug.getBulk('interior').isEmpty()).toBe(true);
    expect(mug.getBulk('interior').getMaterialPath()).toBeNull();
  });
});

describe('Bulkable — closure retention + drain-through', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('a liquidTight vessel retains liquid', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const src = makeVessel({ material: water, amountL: 1, capacityL: 5 });
    const dst = makeVessel({ capacityL: 1, closure: 'liquidTight' });
    const r = transfer(
      src.getBulk('interior'),
      dst.getBulk('interior'),
      { kind: 'all' },
    );
    expect(r.status).not.toBe('drained');
    expect(dst.getBulk('interior').getAmount().rawValue()).toBeGreaterThan(0);
  });

  it('an open vessel drains through to the floor puddle', () => {
    const water = makeMaterial('/obj/material/bulk/water', 'water', ['water']);
    const loc = makeStuff(() => new Location());
    const floor = makeStuff(() => {
      const f = new Floor();
      f.surfaceBulk = true;
      return f;
    });
    attachFixture(loc, floor);
    const colander = makeVessel({ capacityL: 0.5, closure: 'open' });
    ContainmentApi.move(colander, loc);
    const src = makeVessel({ material: water, amountL: 1, capacityL: 5 });

    const r = transfer(
      src.getBulk('interior'),
      colander.getBulk('interior'),
      { kind: 'measure', litres: 0.2, mode: 'lenient' },
    );
    expect(r.status).toBe('drained');
    expect(r.applied).toBeCloseTo(0.2);
    // The colander holds nothing; the floor holds the puddle.
    expect(colander.getBulk('interior').isEmpty()).toBe(true);
    const puddle = (floor as unknown as { getBulk: (a: string) => { getAmount(): Quantity<'L'> } }).getBulk('surface');
    expect(puddle.getAmount().rawValue()).toBeCloseTo(0.2);
  });
});

describe('Bulkable — Floor surface-bulk vs discrete containment', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('the Floor is Bulkable with a surface slot but NOT Surfaced', () => {
    const floor = makeStuff(() => {
      const f = new Floor();
      f.surfaceBulk = true;
      return f;
    });
    expect(MixinApi.isBulkable(floor as never)).toBe(true);
    expect((floor as unknown as { hasSurfaceBulk(): boolean }).hasSurfaceBulk()).toBe(true);
    expect(MixinApi.isSurfaced(floor as never)).toBe(false);
  });

  it('a dropped item is container=room, not resting on the floor', () => {
    const loc = makeStuff(() => new Location());
    const floor = makeStuff(() => {
      const f = new Floor();
      f.surfaceBulk = true;
      return f;
    });
    attachFixture(loc, floor);
    const apple = makeStuff(() => {
      const a = new LooseItem();
      a.setName('apple');
      return a;
    });
    ContainmentApi.move(apple as never, loc);
    expect(apple.getContainer()).toBe(loc);
  });
});

describe('Bulkable — volume units round-trip', () => {
  it('parses and formats cup / mL / L and converts to L', () => {
    expect(Quantity.parse('2 cup', 'cup').format()).toBe('2 cup');
    expect(Quantity.of(2, 'cup').to('L').rawValue()).toBeCloseTo(0.473176, 4);
    expect(Quantity.of(500, 'mL').to('L').rawValue()).toBeCloseTo(0.5);
    expect(Quantity.parse('250 mL', 'L').rawValue()).toBeCloseTo(0.25);
    const round = Quantity.fromJSON(Quantity.of(1.5, 'L').toJSON());
    expect(round.unit).toBe('L');
    expect(round.rawValue()).toBeCloseTo(1.5);
  });
});
