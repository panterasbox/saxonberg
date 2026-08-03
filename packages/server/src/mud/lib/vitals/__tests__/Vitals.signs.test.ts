/**
 * VitalsMixin — vital signs, the per-species band lookup, and the
 * derived readouts (condition band + consciousness). Proves the
 * readouts reflect the substrate WITHOUT mutating lifecycle, and the
 * "requires OrganismMixin" composition guard.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../obj/species/Species';
import Thing from '../../stuff/Thing';
import {
  VitalsMixin,
  UNIVERSE_DEFAULT_VITAL_PROFILE,
  VITAL_SIGNS,
} from '../Vitals';
import { Quantity } from '../../quantity';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const VitalThingBase = VitalsMixin(Thing);
class VitalThing extends VitalThingBase {}

function profiledSpecies(): Species {
  const species = makeStuff(() => new Species());
  species.setVitalProfile({
    ...UNIVERSE_DEFAULT_VITAL_PROFILE,
    heartRate: { baseline: 50, survivableMin: 25, survivableMax: 200 },
  });
  stampTemplatePathForTest(species, '/obj/species/test/profiled');
  return species;
}

describe('VitalsMixin — composition + storage', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('Creature composes VitalsMixin', () => {
    const creature = makeStuff(() => new Creature());
    expect(MixinApi.hasMixin(creature, Mixins.Vitals)).toBe(true);
  });

  it('declares the seven vital-sign fields + causeOfDeath as persistent', () => {
    const fields = MixinApi.getAllPersistentFields(Creature as never);
    for (const f of [
      '_coreTemperature',
      '_heartRate',
      '_respiratoryRate',
      '_bloodPressureSystolic',
      '_bloodPressureDiastolic',
      '_spo2',
      '_bloodVolume',
      'causeOfDeath',
    ]) {
      expect(fields).toContain(f);
    }
  });

  it('round-trips every vital sign through get/setVitalSign', () => {
    const creature = makeStuff(() => new Creature());
    creature.setVitalSign('heartRate', Quantity.of(88, 'bpm'));
    creature.setVitalSign('bloodVolume', Quantity.of(4.5, 'L'));
    expect(creature.getVitalSign('heartRate').rawValue()).toBe(88);
    expect(creature.getVitalSign('bloodVolume').rawValue()).toBe(4.5);
  });

  it('setVitalSign rejects a wrong-unit Quantity', () => {
    const creature = makeStuff(() => new Creature());
    expect(() =>
      creature.setVitalSign(
        'heartRate',
        Quantity.of(88, 'K') as unknown as Quantity<'bpm'>,
      ),
    ).toThrow(TypeError);
  });

  it('setVitalSign rejects a negative value', () => {
    const creature = makeStuff(() => new Creature());
    expect(() =>
      creature.setVitalSign('bloodVolume', Quantity.of(-1, 'L')),
    ).toThrow(RangeError);
  });
});

describe('VitalsMixin — band lookup', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('reads the survivable band from the species vitalProfile', () => {
    const creature = makeStuff(() => new Creature());
    creature.setSpecies(profiledSpecies());
    expect(creature.getVitalBand('heartRate').baseline).toBe(50);
  });

  it('falls back to the universe default when the species has no profile', () => {
    const bare = makeStuff(() => new Species());
    stampTemplatePathForTest(bare, '/obj/species/test/bare');
    const creature = makeStuff(() => new Creature());
    creature.setSpecies(bare);
    expect(creature.getVitalBand('coreTemperature')).toEqual(
      UNIVERSE_DEFAULT_VITAL_PROFILE.coreTemperature,
    );
  });

  it('throws when VitalsMixin is composed without OrganismMixin', () => {
    const vt = makeStuff(() => new VitalThing());
    expect(() => vt.getVitalBand('heartRate')).toThrow(/OrganismMixin/);
  });
});

describe('VitalsMixin — derived readouts reflect substrate, never transition', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a fresh body reads healthy + conscious', () => {
    const creature = makeStuff(() => new Creature());
    expect(creature.getConditionBand()).toBe('healthy');
    expect(creature.getConsciousness()).toBe('conscious');
  });

  it('blood loss worsens the band and reads unconscious — with NO lifecycle change', () => {
    const creature = makeStuff(() => new Creature());
    const before = creature.getLifecycleState();
    // 3.4 L of a 5 L baseline (universe default): fraction 0.68 — below
    // the consciousness threshold but above the survivable floor (3.2).
    creature.setVitalSign('bloodVolume', Quantity.of(3.4, 'L'));
    expect(creature.getConsciousness()).toBe('unconscious');
    expect(creature.getConditionBand()).not.toBe('healthy');
    // The reading reflects the substrate; nothing transitioned.
    expect(creature.getLifecycleState()).toBe(before);
  });

  it('blood volume at/below the floor reads dying — still NO lifecycle change', () => {
    const creature = makeStuff(() => new Creature());
    creature.setVitalSign('bloodVolume', Quantity.of(2, 'L'));
    // `dying`, not `dead`: a floored vital opens the rescuable window
    // rather than ending the story (see Vitals.death-seam).
    expect(creature.getConditionBand()).toBe('dying');
    expect(creature.getLifecycleState()).not.toBe('dead');
  });

  it('every vital sign has a canonical band entry', () => {
    const creature = makeStuff(() => new Creature());
    for (const sign of VITAL_SIGNS) {
      const band = creature.getVitalBand(sign);
      expect(typeof band.baseline).toBe('number');
      expect(band.survivableMin).toBeLessThanOrEqual(band.survivableMax);
    }
  });
});
