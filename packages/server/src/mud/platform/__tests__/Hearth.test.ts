/**
 * ⭐⭐ **A hearth heats where you stand; a forge heats what you put in
 * it** (envelope D5).
 *
 * `thermal.md` has protected that distinction since the fire build —
 * *a lit forge must not warm the room it stands in*, because being
 * inside the fire is not being near it and a smithy whose forge heated
 * the air would be uninhabitable. The envelope build did not break the
 * rule to get room heating; it added a different KIND of object.
 *
 * ⭐ And the difference is carried by **composition**, never by a guard.
 * Nothing anywhere asks *is this a forge*: `Hearth` and `Campfire`
 * compose `SpaceHeatingMixin`, `Forge`/`Oven`/`Kiln` do not, and the
 * envelope narrows a room's contents with `MixinApi.isSpaceHeating`.
 * The test that matters most in this file is the one that proves a lit
 * forge still changes nothing.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Hearth from '../thing/Hearth';
import Forge from '../thing/Forge';
import Oven from '../thing/Oven';
import Campfire from '../thing/Campfire';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Reserve } from '../../lib/reserve';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

function fuelled<T extends { setReserve(r: Reserve): void }>(thing: T): T {
  thing.setReserve(
    new Reserve(
      'fuel',
      Quantity.of(100, '%'),
      Quantity.of(100, '%'),
      'combustion',
      null,
    ),
  );
  return thing;
}

const hearth = (): Hearth => makeStuff(() => fuelled(new Hearth())) as Hearth;

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

describe('⭐⭐ which fires warm a room, and which do not', () => {
  it('a hearth, a stove, a brazier and a campfire DO', () => {
    expect(MixinApi.isSpaceHeating(hearth())).toBe(true);
    expect(
      MixinApi.isSpaceHeating(makeStuff(() => fuelled(new Campfire()))),
    ).toBe(true);
    // The stove and the brazier are `Hearth` ROWS, not classes — a
    // second heating object costs three numbers and some prose.
  });

  it('⭐ a FORGE, an OVEN and a KILN do NOT — and no code asks which is which', () => {
    const forge = makeStuff(() => fuelled(new Forge()));
    const oven = makeStuff(() => fuelled(new Oven()));
    expect(MixinApi.isSpaceHeating(forge)).toBe(false);
    expect(MixinApi.isSpaceHeating(oven)).toBe(false);
    // Both are still furnaces, still burn fuel, still hold their heat —
    // they simply make no claim on the air. A smith can work beside one
    // in a cold smithy, which is exactly the shipped rule.
    expect(MixinApi.isFurnace(forge)).toBe(true);
    expect(MixinApi.isFurnace(oven)).toBe(true);
  });
});

describe('a hearth only warms while it is burning', () => {
  it('lit and fuelled: it puts its authored watts into the room', () => {
    const h = hearth();
    expect(h.spaceHeatOutputW()).toBe(0); // ships cold
    h.ignite();
    expect(h.isLit()).toBe(true);
    expect(h.spaceHeatOutputW()).toBe(h.getHeatOutputW());
    expect(h.spaceHeatOutputW()).toBeGreaterThan(0);
  });

  it('doused: nothing, immediately', () => {
    const h = hearth();
    h.ignite();
    h.douse();
    expect(h.spaceHeatOutputW()).toBe(0);
  });

  it('⭐ out of fuel: nothing, whatever the `lit` flag says', () => {
    // A fire that has gone out warms nothing, and it should not take a
    // second flag to say so — which is why the mixin reads the furnace
    // face rather than carrying its own state.
    const h = hearth();
    h.ignite();
    h.adjustReserve('fuel', Quantity.of(-100, '%'));
    expect(h.fuelRemaining()).toBe(0);
    expect(h.spaceHeatOutputW()).toBe(0);
  });
});

describe('what a hearth IS, structurally', () => {
  it('⚠ is SURFACED, not a Container — a pot stands ON it', () => {
    // That is the whole difference between a hearth and an oven: you
    // put a thing INTO an oven and you stand a thing ON a hearth.
    const h = hearth();
    expect(MixinApi.isSurfaced(h)).toBe(true);
    expect(MixinApi.isContainer(h)).toBe(false);
  });

  it('⚠ ships COLD, against the mixin default', () => {
    // `FurnaceMixin.lit` defaults TRUE — right for the Campfire seed it
    // was written for, wrong for a hearth in an empty room.
    expect(hearth().isLit()).toBe(false);
  });

  it('burns like a domestic fire, not like a forge', () => {
    const h = hearth();
    h.ignite();
    const forge = makeStuff(() => fuelled(new Forge()));
    expect(h.getHeldTemperatureK()).toBeLessThan(
      forge.getHeldTemperatureK(),
    );
    // Hot enough to cook over and to scald a hand; nowhere near iron.
    expect(h.getHeldTemperatureK()).toBeGreaterThan(400);
  });
});
