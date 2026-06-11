import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SoundModality } from '../SoundModality';
import { MAX_HOPS } from '../../Modality';
import { Sound } from '../../Sound';
import { SoundSourceMixin } from '../../SoundSource';
import { AtmosphericMixin } from '../../../biome/Atmospheric';
import CartesianLocation from '../../../location/CartesianLocation';
import CartesianZone from '../../../location/CartesianZone';
import Door from '../../../boundary/Door';
import Thing from '../../../stuff/Thing';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from './test-helpers';

class Whistle extends SoundSourceMixin(Thing) {}
class AtmosphericLocation extends AtmosphericMixin(CartesianLocation) {}

describe('SoundModality.signalAt — propagation core', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('empty room with no emitters returns null', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    expect(SoundModality.soundAt(loc)).toBeNull();
  });

  it('a whistle in a room is perceived at that scope', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    const w = makeStuff(() => new Whistle());
    w.setEmittedAmplitude(110);
    w.setCharacter('piercing whistle');
    ContainmentApi.move(w, loc);

    const sound = SoundModality.soundAt(loc);
    expect(sound).toBeInstanceOf(Sound);
    expect(sound!.amplitude.rawValue()).toBeCloseTo(110, 1);
    expect(sound!.character).toBe('piercing whistle');
  });

  it('two 60 dB sources in a room sum to ~63 dB (logarithmic)', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    const a = makeStuff(() => new Whistle());
    a.setEmittedAmplitude(60);
    a.setCharacter('a');
    ContainmentApi.move(a, loc);
    const b = makeStuff(() => new Whistle());
    b.setEmittedAmplitude(60);
    b.setCharacter('b');
    ContainmentApi.move(b, loc);

    const sound = SoundModality.soundAt(loc);
    expect(sound!.amplitude.rawValue()).toBeCloseTo(63.0103, 2);
  });

  it('sound leaks through open doorless exits', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    const w = makeStuff(() => new Whistle());
    w.setEmittedAmplitude(100);
    w.setCharacter('whistle');
    ContainmentApi.move(w, b);

    const soundInA = SoundModality.soundAt(a);
    expect(soundInA!.amplitude.rawValue()).toBeCloseTo(100, 1);
  });

  it('a closed door blocks the leak', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    const w = makeStuff(() => new Whistle());
    w.setEmittedAmplitude(100);
    w.setCharacter('whistle');
    ContainmentApi.move(w, b);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    door.setOpen(false);
    await a.addBidirectionalExit(b, 'north', { door });

    expect(SoundModality.soundAt(a)).toBeNull();
    door.open();
    const soundInA = SoundModality.soundAt(a);
    expect(soundInA!.amplitude.rawValue()).toBeCloseTo(100, 1);
  });

  it('vacuum atmosphere blocks sound at the recipient', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new AtmosphericLocation());
    zone.addLocation(a, 0, 0, 0);
    a.setAtmosphere('vacuum');
    const w = makeStuff(() => new Whistle());
    w.setEmittedAmplitude(100);
    w.setCharacter('whistle');
    ContainmentApi.move(w, a);

    expect(SoundModality.soundAt(a)).toBeNull();
  });

  it('MAX_HOPS truncates propagation past depth 2', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    const d = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 0, 2, 0);
    zone.addLocation(d, 0, 3, 0);
    const w = makeStuff(() => new Whistle());
    w.setEmittedAmplitude(100);
    w.setCharacter('whistle');
    ContainmentApi.move(w, d);

    expect(MAX_HOPS).toBe(2);
    expect(SoundModality.soundAt(a)).toBeNull();
  });
});
