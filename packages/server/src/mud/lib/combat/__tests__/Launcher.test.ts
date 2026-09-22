/**
 * ⭐⭐ `LauncherMixin` — a weapon that stores its energy somewhere other
 * than your arm.
 *
 * That sentence is the whole of the tech curve. A sword's energy comes
 * out of the swing and no technique makes it hit harder than a person can
 * swing; a bow stores the draw, a musket stores chemistry. The energy
 * stops being a fact about the wielder — which is why armour has to start
 * answering pressure rather than effort.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Launcher from '../../../platform/thing/equipment/Launcher';
import Projectile from '../../../platform/thing/equipment/Projectile';
import Weapon from '../../../platform/thing/equipment/Weapon';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

function bow(): Launcher {
  return makeStuff(() => {
    const l = new Launcher();
    l.energySource = 'stored-elastic';
    l.muzzleSpeed = Quantity.of(55, 'm/s');
    l.projectileTemplate = '/stuff/thing/arms/arrow';
    l.readySeconds = 3;
    return l;
  });
}

function musket(): Launcher {
  return makeStuff(() => {
    const l = new Launcher();
    l.energySource = 'chemical';
    l.muzzleSpeed = Quantity.of(316, 'm/s');
    l.projectileTemplate = '/stuff/thing/arms/musket-ball';
    l.readySeconds = 12;
    return l;
  });
}

describe('LauncherMixin — host placement', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ a launcher IS a weapon — a bowstave is a club', () => {
    // Which is both true and what keeps `lint:inert-weapon` satisfied
    // without a special case for launchers.
    expect(bow()).toBeInstanceOf(Weapon);
  });

  it('⚠⚠ …but a WEAPON is not a launcher — a knife does not shoot', () => {
    // The host refusal. Putting `LauncherMixin` on `Weapon` would claim
    // every blade in the game has a muzzle speed and a projectile, and
    // every read of those would then need a guard to re-narrow the host
    // set — which is the tell that the host is wrong.
    const knife = makeStuff(() => new Weapon());
    expect(MixinApi.isLauncher(knife)).toBe(false);
    expect(MixinApi.isLauncher(bow())).toBe(true);
  });

  it('a projectile is a STACKABLE and deliberately not a weapon', () => {
    // An arrow in your hand is not a thing you fight with; it is a
    // consumable the launcher uses.
    const arrow = makeStuff(() => new Projectile());
    expect(MixinApi.isStackable(arrow)).toBe(true);
    expect(arrow).not.toBeInstanceOf(Weapon);
  });
});

describe('⭐⭐ readiness — the family’s identity in ONE number', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('an unfired launcher is ready now', () => {
    expect(bow().secondsUntilReady(1000)).toBe(0);
  });

  it('⭐ a bow comes back in three seconds and a musket in twelve', () => {
    // That ratio is the entire reason anybody kept carrying a bow for
    // two centuries after firearms arrived, and it is the whole of what
    // this build ships of the readiness model — one number, on purpose.
    const b = bow();
    const m = musket();
    b.markFired(1000);
    m.markFired(1000);
    expect(b.secondsUntilReady(1000)).toBe(3);
    expect(m.secondsUntilReady(1000)).toBe(12);
    // Four seconds later the bow can loose again and the musket cannot.
    expect(b.secondsUntilReady(1004)).toBe(0);
    expect(m.secondsUntilReady(1004)).toBe(8);
  });

  it('⚠ readiness is a READ, not a timer', () => {
    // Nothing schedules anything, so a body that logs out mid-reload
    // comes back to a launcher that is ready — because the world clock
    // moved on. The same reconcile-on-read discipline as every other
    // clock in the engine, and why this needed no engagement machinery.
    const m = musket();
    m.markFired(1000);
    expect(m.secondsUntilReady(100_000)).toBe(0);
  });

  it('a launcher with no reload is always ready', () => {
    const instant = bow();
    instant.readySeconds = 0;
    instant.markFired(1000);
    expect(instant.secondsUntilReady(1000)).toBe(0);
  });
});

describe('⭐⭐ the tech curve, in the numbers', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a musket carries thirty times a bow’s energy', () => {
    // ½mv² at the shipped figures: a 30 g arrow at 55 m/s is ~45 J; the
    // same mass at 316 m/s is ~1.5 kJ. The energy is no longer a fact
    // about the arm.
    const arrowJ = 0.5 * 0.03 * 55 * 55;
    const ballJ = 0.5 * 0.03 * 316 * 316;
    expect(ballJ / arrowJ).toBeGreaterThan(30);
  });

  it('⚠ …and pays for it four times over in readiness', () => {
    expect(musket().getReadySeconds() / bow().getReadySeconds()).toBe(4);
  });
});
