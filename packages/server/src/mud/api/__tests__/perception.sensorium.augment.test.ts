/**
 * PerceptionApi.sensorium — augment-conferred ESP modalities.
 *
 * Verifies that the AetherMixin._augmentGated / _grantsModalities
 * combination, together with `MixinApi.getActiveMixins` walking
 * slot occupants for AugmentMixin conferrals, surfaces ESP
 * modalities only when an Avatar-shaped fixture carries a baseline
 * comm implant.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerceptionApi } from '../perception';
import { StuffApi } from '../stuff';
import { Species } from '../../lib/species/Species';
import { BodyPlan } from '../../lib/species/BodyPlan';
import { OrganismMixin } from '../../lib/species/Organism';
import { AetherMixin } from '../../lib/message/Aether';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { Thing } from '../../lib/stuff/Thing';
import { AetherImplant } from '../../lib/augmentation/AetherImplant';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { buildAllModalities } from '../../lib/perception/modalities/__tests__/test-helpers';
import type { Stuff } from '../../lib/stuff/Stuff';

class AvatarLike extends SlottedMixin(AetherMixin(OrganismMixin(Thing))) {
  static persistentFields: string[] = [];
  // staticSlots is consulted by Slotted to know what slot names exist.
  // The test's cranial slot accepts SlottableMixin (the AetherImplant
  // composes it via AugmentMixin → SlottableMixin → TangibleMixin → Thing).
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function makeAvatarLike(): Stuff {
  const biped = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/lib/body-plans/biped-test',
  );
  biped.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
  ]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const sapiens = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/animalia/homo-sapiens-test',
  );
  sapiens.setBodyPlan(biped);
  const actor = makeStuff(() => new AvatarLike()) as AvatarLike & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(sapiens);
  return actor;
}

describe('PerceptionApi.sensorium — augment-conferred ESP modalities', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('pre-implant sensorium has NO ESP modalities', () => {
    const avatar = makeAvatarLike();
    const names = PerceptionApi.sensorium(avatar)
      .map((m) => m.getName())
      .sort();
    expect(names).not.toContain('verbal-esp');
    expect(names).not.toContain('emotive-esp');
  });

  it('installing the AetherImplant adds ESP modalities', () => {
    const avatar = makeAvatarLike() as AvatarLike;
    const implant = makeStuff(() => new AetherImplant());
    avatar.occupy(implant, 'cranial');
    const names = PerceptionApi.sensorium(avatar)
      .map((m) => m.getName())
      .sort();
    expect(names).toContain('verbal-esp');
    expect(names).toContain('emotive-esp');
  });

  it('removing the implant strips ESP modalities (lazy walk, no caching)', () => {
    const avatar = makeAvatarLike() as AvatarLike;
    const implant = makeStuff(() => new AetherImplant());
    avatar.occupy(implant, 'cranial');
    expect(PerceptionApi.sensorium(avatar).map((m) => m.getName())).toContain(
      'verbal-esp',
    );
    avatar.vacate('cranial', implant);
    expect(PerceptionApi.sensorium(avatar).map((m) => m.getName())).not.toContain(
      'verbal-esp',
    );
  });
});
