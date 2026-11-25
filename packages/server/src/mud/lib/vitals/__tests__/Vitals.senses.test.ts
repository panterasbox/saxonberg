/**
 * ⭐⭐ Sense organs are parts (organism-biology D11, W9).
 *
 * A body's senses derive from its organs, and a wound costs the sense: the
 * eyes' capacity (as the body stands — no integration under a sight gate)
 * costs the perceived band, `lost` cannot see, and you are told so when you
 * look at yourself. The species' vision profile reaches perception. And
 * eyes that watch more of the world catch more of it — a cow spots what a
 * wolf misses, and a person reads exactly as before.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Character } from '../../character/Character';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { PerceptionApi } from '../../../api/perception';
import { VisionModality } from '../../../platform/idea/modalities/VisionModality';
import { Light } from '../../perception/Light';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { setFlatParts } from '../../species/__tests__/flat-body';
import type { Trauma } from '../../../platform/idea/Condition';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

class Body extends Character {
  static override _mixinName: string = 'SensesTestBody';
}

const FLESH = '/stuff/idea/material/tissue/flesh';
let seq = 0;

function withEyes(watchDeg: number, profile?: { bandShift: number }): Body {
  const id = seq++;
  const plan = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-eyes-${id}`);
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.9 }], senses: [{ modality: 'touch' }] },
    { key: 'body.head', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.08 }] },
    { key: 'body.head.eye.left', parent: 'body.head', severable: true, serves: ['vision'], tissues: [{ tissuePath: FLESH, share: 0.01 }], senses: [{ modality: 'vision', watchDeg }] },
    { key: 'body.head.eye.right', parent: 'body.head', severable: true, serves: ['vision'], tissues: [{ tissuePath: FLESH, share: 0.01 }], senses: [{ modality: 'vision', watchDeg }] },
  ]);
  const species = makeStuffAtPath(() => {
    const s = new Species();
    s.setBodyPlan(plan);
    if (profile) s.setVisionProfile({ scotopicMin: 'pitch-black', photopicMax: 'blinding', bandShift: profile.bandShift });
    return s;
  }, `/stuff/idea/species/_test/eyes-${id}`);
  const b = makeStuff(() => new Body());
  b.setSpecies(species);
  b.setLifecycleState('alive');
  return b;
}

const room = {} as unknown as Stuff & Container;

describe('the eyes are parts', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ the senses derive from the organs; an eye lost and the other kept still sees', () => {
    const b = withEyes(190);
    expect(b.getBody()?.modalities()).toEqual(['touch', 'vision']);
    b.severPart('body.head.eye.left');
    expect(b.capacityAsStands('vision')).not.toBe('lost');
    b.severPart('body.head.eye.right');
    expect(b.capacityAsStands('vision')).toBe('lost');
    expect(b.canSeeOverride(b, 'shape', true)).toBe(false);
  });

  it('⭐⭐ a wounded eye costs the perceived band, and you are told so when you look at yourself', () => {
    const b = withEyes(190);
    expect(b.perceivedBandModifier('lit', room)).toBe('lit');
    b.afflict({ kind: 'trauma', type: 'laceration', site: 'body.head.eye.left', severity: 4 } as Trauma);
    b.afflict({ kind: 'trauma', type: 'laceration', site: 'body.head.eye.right', severity: 2 } as Trauma);
    const band = b.capacityAsStands('vision');
    expect(['impaired', 'failing']).toContain(band);
    expect(b.perceivedBandModifier('lit', room)).not.toBe('lit');
    // To yourself, the eye is a fact; to anyone else it is `assess`'s.
    expect(b.getMarkupLong(b)).toMatch(/sight is blurred|barely see/);
    const other = makeStuff(() => new Body());
    expect(b.getMarkupLong(other)).not.toMatch(/sight is blurred|barely see/);
  });

  it('⭐ the species\' vision profile reaches perception', () => {
    expect(withEyes(190).getVisionProfile()).toBeNull();
    expect(withEyes(190, { bandShift: -1 }).getVisionProfile()?.bandShift).toBe(-1);
  });

  it('⭐⭐ the watched share: a cow spots what a wolf misses; a person reads as before', () => {
    const target = makeStuff(() => new Body());
    const person = PerceptionApi.effectivePerception(withEyes(190), target, 0);
    const wolf = PerceptionApi.effectivePerception(withEyes(250), target, 0);
    const cow = PerceptionApi.effectivePerception(withEyes(330), target, 0);
    const bare = PerceptionApi.effectivePerception(makeStuff(() => new Body()), target, 0);
    expect(person).toBeCloseTo(bare, 9); // the reference adds nothing
    expect(wolf - person).toBeCloseTo((250 - 190) / 360 * 6, 6);
    expect(cow - person).toBeCloseTo((330 - 190) / 360 * 6, 6);
    expect(cow).toBeGreaterThan(wolf);
  });

  it('⭐⭐ the species\' light range: a dark-sighted body sees a band further into the dark; under its floor, nothing', () => {
    const vision = makeStuff(() => new VisionModality());
    let lux = 0.001;
    while (Light.bandFor(lux) !== 'very-dim' && lux < 1e5) lux *= 1.5;
    expect(Light.bandFor(lux)).toBe('very-dim');
    const signal = Light.from({ intensity: Quantity.of(lux, 'lux') } as never);
    const plain = vision.perceiveFor(withEyes(190), room, signal).band;
    const dark = vision.perceiveFor(withEyes(190, { bandShift: 1 }), room, signal).band;
    const dim = vision.perceiveFor(withEyes(190, { bandShift: -1 }), room, signal).band;
    expect(new Set([plain, dark, dim]).size).toBe(3); // a shift either way is one band either way
    // A floor above the light: nothing.
    const floored = withEyes(190);
    floored.getSpecies()!.setVisionProfile({ scotopicMin: 'dim', photopicMax: 'blinding', bandShift: 0 });
    expect(vision.perceiveFor(floored, room, signal).band).toBe('pitch-black');
  });
});

