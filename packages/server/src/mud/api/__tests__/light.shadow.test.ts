import { describe, it, expect, expectTypeOf, beforeEach, afterEach } from 'vitest';
import { Shadow } from '../../lib/stuff/Shadow';
import { installV1QuantityTagTables } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Shadowing } from '../../lib/security/decorators';
import type { LightBand, VisionProfile } from '../../lib/perception/Light';
import { LightApi } from '../light';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';
import { CartesianZone } from '../../lib/spatial/CartesianZone';
import { Light } from '../../lib/perception/Light';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { AmbientLitMixin } from '../../lib/perception/AmbientLit';
import { Thing } from '../../lib/stuff/Thing';
import { SensorMixin } from '../../lib/message/Sensor';
import { PerceptionMixin } from '../../lib/perception/Perception';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainmentApi } from '../containment';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sensor } from '../../lib/message/Sensor';
import type { Perception } from '../../lib/perception/Perception';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}
class TestObserver extends PerceptionMixin(
  SensorMixin(ContainableMixin(Thing))
) {
  handleMessage(): void {}
}
class Candle extends LightSourceMixin(Thing) {}

class BlindfoldShadow extends Shadow {
  @Shadowing
  perceivedBandModifier(_raw: LightBand): LightBand {
    return 'pitch-black';
  }
}

class NightVisionShadow extends Shadow {
  @Shadowing
  getVisionProfile(): VisionProfile {
    return {
      scotopicMin: 'pitch-black',
      photopicMax: 'blinding',
      bandShift: 1,
    };
  }
}

class XRayShadow extends Shadow {
  @Shadowing
  canSeeOverride(): boolean {
    return true;
  }
}

describe('LightApi — type-level viewer constraint', () => {
  it('viewer parameters require Stuff & Sensor & Perception', () => {
    expectTypeOf(LightApi.perceivedBand)
      .parameter(0)
      .toEqualTypeOf<Stuff & Sensor & Perception>();
    expectTypeOf(LightApi.canSee)
      .parameter(0)
      .toEqualTypeOf<Stuff & Sensor & Perception>();
    expectTypeOf(LightApi.viewerVisionProfile)
      .parameter(0)
      .toEqualTypeOf<Stuff & Sensor & Perception>();

    // A bare Sensor (without Perception) is NOT assignable.
    type SensorOnly = Stuff & Sensor;
    expectTypeOf<SensorOnly>().not.toMatchTypeOf<Stuff & Sensor & Perception>();
    // A plain Stuff is NOT assignable.
    type PlainStuff = Stuff;
    expectTypeOf<PlainStuff>().not.toMatchTypeOf<Stuff & Sensor & Perception>();
  });
});

describe('LightApi.perceivedBand — viewer-aware overrides', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('returns the raw band when no shadow is attached', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(40);
    const viewer = await StuffApi.create(() => new TestObserver());

    expect(LightApi.perceivedBand(viewer, room)).toBe('lit');
  });

  it('BlindfoldShadow makes every room read pitch-black', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);
    const viewer = await StuffApi.create(() => new TestObserver());
    const target = makeStuff(() => new Candle());
    ContainmentApi.move(target, room);
    const blindfold = await StuffApi.create(() => new BlindfoldShadow());
    ShadowApi.attach(viewer, blindfold);

    expect(LightApi.perceivedBand(viewer, room)).toBe('pitch-black');
    // canSee against a target IN the room consults perceivedBand
    // for the target's environment — blindfolded means false.
    expect(LightApi.canSee(viewer, target, 'figure')).toBe(false);
  });

  it('NightVisionShadow shifts the band up via getVisionProfile', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(2); // very-dim raw

    const viewer = await StuffApi.create(() => new TestObserver());
    expect(LightApi.perceivedBand(viewer, room)).toBe('very-dim');

    const nightVision = await StuffApi.create(() => new NightVisionShadow());
    ShadowApi.attach(viewer, nightVision);

    // bandShift: +1 — very-dim becomes dim.
    expect(LightApi.perceivedBand(viewer, room)).toBe('dim');
    expect(LightApi.viewerVisionProfile(viewer).bandShift).toBe(1);
  });

  it('multiple shadows compose via callDown — chain order respected', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60); // 'lit' raw

    const viewer = await StuffApi.create(() => new TestObserver());

    // Shadow that bumps the band UP one level via callDown.
    class BoostShadow extends Shadow {
      @Shadowing
      perceivedBandModifier(
        raw: LightBand,
        loc: Stuff & import('../../lib/spatial/Container').Container
      ): LightBand {
        const lower = (this as unknown as {
          callDown<T>(...a: unknown[]): T;
        }).callDown<LightBand>(raw, loc);
        const order: readonly LightBand[] = [
          'pitch-black',
          'very-dim',
          'dim',
          'lit',
          'bright',
          'blinding',
        ];
        const idx = order.indexOf(lower);
        return order[Math.min(order.length - 1, idx + 1)]!;
      }
    }

    const boost1 = await StuffApi.create(() => new BoostShadow());
    const boost2 = await StuffApi.create(() => new BoostShadow());
    ShadowApi.attach(viewer, boost1);
    ShadowApi.attach(viewer, boost2);

    // Two boosts compose: lit → bright → blinding.
    expect(LightApi.perceivedBand(viewer, room)).toBe('blinding');
  });

  it('per-viewer specialization: two viewers, two answers', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(40);

    const a = await StuffApi.create(() => new TestObserver());
    const b = await StuffApi.create(() => new TestObserver());
    const blindfold = await StuffApi.create(() => new BlindfoldShadow());
    ShadowApi.attach(a, blindfold);

    // a is blindfolded; b reads the raw band.
    expect(LightApi.perceivedBand(a, room)).toBe('pitch-black');
    expect(LightApi.perceivedBand(b, room)).toBe('lit');
  });
});

describe('LightApi.canSee — detail levels and overrides', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('detail-level threshold gates discernment', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const viewer = await StuffApi.create(() => new TestObserver());
    const target = makeStuff(() => new Candle());
    ContainmentApi.move(target, room);

    // pitch-black: nothing
    expect(LightApi.canSee(viewer, target, 'shape')).toBe(false);
    expect(LightApi.canSee(viewer, target, 'fine')).toBe(false);

    room.setAmbientFlux(2); // very-dim
    expect(LightApi.canSee(viewer, target, 'shape')).toBe(true);
    expect(LightApi.canSee(viewer, target, 'figure')).toBe(false);

    room.setAmbientFlux(10); // dim
    expect(LightApi.canSee(viewer, target, 'figure')).toBe(true);
    expect(LightApi.canSee(viewer, target, 'detail')).toBe(false);

    room.setAmbientFlux(40); // lit
    expect(LightApi.canSee(viewer, target, 'detail')).toBe(true);
    expect(LightApi.canSee(viewer, target, 'fine')).toBe(false);

    room.setAmbientFlux(100); // bright
    expect(LightApi.canSee(viewer, target, 'fine')).toBe(true);
  });

  it('XRayShadow override forces canSee to true', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const viewer = await StuffApi.create(() => new TestObserver());
    const target = makeStuff(() => new Candle());
    ContainmentApi.move(target, room);

    expect(LightApi.canSee(viewer, target, 'fine')).toBe(false);

    const xray = await StuffApi.create(() => new XRayShadow());
    ShadowApi.attach(viewer, xray);

    expect(LightApi.canSee(viewer, target, 'fine')).toBe(true);
  });
});
