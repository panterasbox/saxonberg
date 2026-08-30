/**
 * ⭐ The census counts PRODUCT, and product is a FILLED holder.
 *
 * The rule lives on `CirculatingMixin` — the mixin that owns `censusKey`
 * — rather than on any one holder class. It was first written as an
 * override on `Bottle`, which left `Crate` (a Container, not a Bulkable)
 * with the original bug: take the last grapefruit out and the empty
 * crate still reported `produce:grapefruit` for ever, so four emptied
 * crates read as four crates at target and the produce floor never
 * restocked.
 *
 * Covered here over the two holder shapes and the non-holder case.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { ContainmentApi } from '../../../api/containment';
import Crate from '../../../platform/thing/Crate';
import Provision from '../../../platform/thing/Provision';
import Thing from '../../stuff/Thing';
import { CirculatingMixin } from '../Circulating';

let seq = 0;

const makeCrate = (): Crate => {
  const c = makeStuff(() => new Crate());
  stampTemplatePathForTest(c, `/obj/test/crate-${seq++}`);
  return c;
};

/** A circulating thing that is neither Bulkable nor Container. */
class LooseGood extends CirculatingMixin(Thing) {}

describe('an empty circulating HOLDER is not product', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('a crate of grapefruits counts as product while it holds any; emptied it is a crate', () => {
    const crate = makeCrate();
    crate.setCensusKey('produce:grapefruit');
    // The shipped row's shape: a crate of grapefruits answers to both.
    crate.setKeywords(['crate', 'grapefruits', 'grapefruit', 'produce']);
    crate.setPrimaryKeyword('grapefruits');

    const fruit = [0, 1, 2].map(() => {
      const p = makeStuff(() => new Provision());
      stampTemplatePathForTest(p, `/obj/test/grapefruit-${seq++}`);
      return p;
    });
    for (const f of fruit) ContainmentApi.move(f as never, crate as never);

    // Full, it is what the row says it is.
    expect(crate.getCensusKey()).toBe('produce:grapefruit');
    expect(crate.isEmptyHolder()).toBe(false);

    // Take two — still product.
    ContainmentApi.move(fruit[0]! as never, null as never);
    ContainmentApi.move(fruit[1]! as never, null as never);
    expect(crate.getCensusKey()).toBe('produce:grapefruit');

    // ⭐ Take the LAST one and the floor is genuinely short: the empty
    // crate stops counting as a crate of grapefruits, so the sweep
    // restocks instead of reading `at target` over empties.
    ContainmentApi.move(fruit[2]! as never, null as never);
    expect(crate.isEmptyHolder()).toBe(true);
    // ⚠ `vessel:grapefruits`, not `vessel:crate`: the vessel KIND
    // (`category`) lives on `BulkableMixin`, and a Crate is a Container,
    // so an empty Container-only holder falls back to its primary
    // keyword. Empties therefore do not converge across fruit the way
    // empty cans converge on `vessel:can`. Nothing targets `vessel:*`
    // today so it is inert — but a returns market would want one home
    // for `category` that both holder shapes can compose.
    expect(crate.getCensusKey()).toBe('vessel:grapefruits');
  });

  it("a non-holder keeps its authored key — a grapefruit is product, not a vessel", () => {
    const good = makeStuff(() => new LooseGood());
    stampTemplatePathForTest(good, `/obj/test/loose-${seq++}`);
    good.setCensusKey('produce:grapefruit');
    expect(good.isEmptyHolder()).toBe(false);
    expect(good.getCensusKey()).toBe('produce:grapefruit');
  });
});
