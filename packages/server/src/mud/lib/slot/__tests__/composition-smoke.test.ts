/**
 * Composition smoke tests — § 16 of the embodiment requirements.
 *
 * Confirms the v1 acceptance roster cleanly composes against the
 * substrate. Each test instantiates the composition and asserts its
 * mixin signature; deeper integration coverage lives in the
 * subsystem-specific test files.
 */

import { describe, it, expect } from 'vitest';
import Floor from '../../../obj/Floor';
import Thing from '../../stuff/Thing';
import { VisibleMixin } from '../../description/Visible';
import { SlottableMixin } from '../Slottable';
import { SlottedMixin } from '../Slotted';
import { WearableMixin } from '../Wearable';
import { WieldableMixin } from '../Wieldable';
import { PosturedMixin } from '../Postured';
import { MountableMixin } from '../Mountable';
import { DrivableMixin, SeatedDrivableMixin } from '../Drivable';
import { AdornmentMixin } from '../../boundary/Adornment';
import { ContainerMixin } from '../../spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class ClothTunic extends WearableMixin(
  SlottableMixin(VisibleMixin(Thing))
) {}

class IronLongsword extends WieldableMixin(
  SlottableMixin(VisibleMixin(Thing))
) {}

class WoodenChair extends PosturedMixin(SlottedMixin(VisibleMixin(Thing))) {}

class FourPosterBed extends PosturedMixin(SlottedMixin(VisibleMixin(Thing))) {}

class WoodenBench extends PosturedMixin(SlottedMixin(VisibleMixin(Thing))) {}

class Saddle extends DrivableMixin(
  MountableMixin(
    SlottedMixin(WearableMixin(SlottableMixin(VisibleMixin(Thing))))
  )
) {}

class Bicycle extends DrivableMixin(
  MountableMixin(SlottedMixin(VisibleMixin(Thing)))
) {}

class Car extends SeatedDrivableMixin(
  DrivableMixin(SlottedMixin(ContainerMixin(VisibleMixin(Thing))))
) {}

describe('Composition smoke (§ 16)', () => {
  it('Cloth tunic — Wearable + Slottable + Containable', () => {
    const tunic = makeStuff(() => new ClothTunic());
    expect(MixinApi.isWearable(tunic)).toBe(true);
    expect(MixinApi.isSlottable(tunic)).toBe(true);
    expect(MixinApi.isContainable(tunic)).toBe(true);
    tunic.setSlotClaim('/idea/race/bodyplan/biped', ['torso']);
    expect(tunic.getSlotClaim('/idea/race/bodyplan/biped')).toEqual([
      'torso',
    ]);
  });

  it('Iron longsword — Wieldable + Slottable + Containable', () => {
    const sword = makeStuff(() => new IronLongsword());
    expect(MixinApi.isWieldable(sword)).toBe(true);
    expect(MixinApi.isSlottable(sword)).toBe(true);
    sword.setSlotClaim('/idea/race/bodyplan/biped', [
      'hand:left',
      'hand:right',
    ]);
    expect(sword.getSlotClaim('/idea/race/bodyplan/biped')).toEqual([
      'hand:left',
      'hand:right',
    ]);
  });

  it('Wooden chair — Postured + Slotted with sit:1', () => {
    const chair = makeStuff(() => new WoodenChair());
    chair.setStaticSlots([
      {
        name: 'sit:1',
        accepts: 'SlottableMixin',
        postures: ['sit'],
        userFacingDetail: 'seat',
      },
    ]);
    expect(MixinApi.isPostured(chair)).toBe(true);
    expect(chair.getAcceptedPostures('sit:1')).toEqual(['sit']);
  });

  it('Four-poster bed — Postured with lie:1 accepting lie + sit', () => {
    const bed = makeStuff(() => new FourPosterBed());
    bed.setStaticSlots([
      {
        name: 'lie:1',
        accepts: 'SlottableMixin',
        postures: ['lie', 'sit'],
      },
    ]);
    expect(bed.getSlotsAcceptingPosture('sit')).toEqual(['lie:1']);
    expect(bed.getSlotsAcceptingPosture('lie')).toEqual(['lie:1']);
  });

  it('Wooden bench — Postured with capacity 4 sit:1', () => {
    const bench = makeStuff(() => new WoodenBench());
    bench.setStaticSlots([
      {
        name: 'sit:1',
        accepts: 'SlottableMixin',
        capacity: 4,
        postures: ['sit'],
      },
    ]);
    expect(bench.getSlotSpec('sit:1')?.capacity).toBe(4);
  });

  it('Saddle — Drivable + Mountable + Slotted + Wearable + Slottable + Containable', () => {
    const saddle = makeStuff(() => new Saddle());
    expect(MixinApi.isDrivable(saddle)).toBe(true);
    expect(MixinApi.isMountable(saddle)).toBe(true);
    expect(MixinApi.isWearable(saddle)).toBe(true);
    expect(MixinApi.isSlottable(saddle)).toBe(true);
    expect(MixinApi.isContainable(saddle)).toBe(true);
  });

  it('Bicycle — Drivable + Mountable + Slotted', () => {
    const bike = makeStuff(() => new Bicycle());
    expect(MixinApi.isDrivable(bike)).toBe(true);
    expect(MixinApi.isMountable(bike)).toBe(true);
    expect(MixinApi.isSlotted(bike)).toBe(true);
  });

  it('Two-seater car — SeatedDrivable + Drivable + Container + Slotted', () => {
    const car = makeStuff(() => new Car());
    expect(MixinApi.isDrivable(car)).toBe(true);
    expect(MixinApi.isContainer(car)).toBe(true);
    expect(MixinApi.isSlotted(car)).toBe(true);
    // SeatedDrivableMixin is an override variant, not a registry entry —
    // verify via prototype-chain walk instead of hasMixin.
    const seatedMarker = (() => {
      let proto: object | null = Car as object | null;
      while (proto) {
        if ((proto as { _mixinName?: string })._mixinName === 'SeatedDrivableMixin') {
          return true;
        }
        proto = Object.getPrototypeOf(proto) as object | null;
      }
      return false;
    })();
    expect(seatedMarker).toBe(true);
  });

  it('Default floor — Adornment + Postured + Slotted', () => {
    const floor = makeStuff(() => new Floor());
    expect(MixinApi.isAdornment(floor)).toBe(true);
    expect(MixinApi.isPostured(floor)).toBe(true);
    expect(MixinApi.isSlotted(floor)).toBe(true);
  });

  it('Mixins registry includes all v1 entries', () => {
    expect(Mixins.Slotted).toBe('SlottedMixin');
    expect(Mixins.Slottable).toBe('SlottableMixin');
    expect(Mixins.Wearable).toBe('WearableMixin');
    expect(Mixins.Wieldable).toBe('WieldableMixin');
    expect(Mixins.Postured).toBe('PosturedMixin');
    expect(Mixins.Posed).toBe('PosedMixin');
    expect(Mixins.Mountable).toBe('MountableMixin');
    expect(Mixins.Drivable).toBe('DrivableMixin');
  });
});

// Reference Adornment so the import isn't elided — used implicitly
// by Floor's composition.
void AdornmentMixin;
