import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { WearableMixin } from '../Wearable';
import { SlottableMixin } from '../Slottable';
import { SlottedMixin } from '../Slotted';
import { BodyPlanSlotsMixin } from '../BodyPlanSlots';
import { ContainableMixin } from '../../spatial/Containable';
import { OrganismMixin } from '../../species/Organism';
import { SingletonMixin } from '../../stuff/Singleton';
import { Idea } from '../../stuff/Idea';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Species from '../../../platform/idea/species/Species';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { SlotApi } from '../../../api/slot';

class Boots extends WearableMixin(SlottableMixin(ContainableMixin(Idea))) {}

// A minimal Avatar-shaped host: Slottable + Slotted + Organism +
// BodyPlanSlots + Singleton (so Species path resolution works).
class TestAvatar extends BodyPlanSlotsMixin(
  SlottableMixin(SlottedMixin(OrganismMixin(SingletonMixin(Idea))))
) {}

describe('WearableMixin', () => {
  let boots: Boots;

  beforeEach(() => {
    boots = makeStuff(() => new Boots());
  });

  it('passes the MixinApi.isWearable predicate', () => {
    expect(MixinApi.isWearable(boots)).toBe(true);
    expect(MixinApi.hasMixin(boots, Mixins.Wearable)).toBe(true);
  });

  it('round-trips slotClaims', () => {
    boots.setSlotClaim('/idea/race/bodyplan/biped', [
      'foot:left',
      'foot:right',
    ]);
    expect(boots.getSlotClaim('/idea/race/bodyplan/biped')).toEqual([
      'foot:left',
      'foot:right',
    ]);
    expect(boots.getEligibleBodyPlans()).toEqual([
      '/idea/race/bodyplan/biped',
    ]);
  });

  it('fitsSlot returns false on non-Organism host', () => {
    class Plain extends SlottedMixin(Idea) {}
    const host = makeStuff(() => new Plain());
    host.setStaticSlots([{ name: 'foot:left', accepts: 'WearableMixin' }]);
    expect(boots.fitsSlot(host, 'foot:left')).toBe(false);
  });

  it('multi-slot atomicity via SlotApi.occupyAll', () => {
    class TestHost extends SlottedMixin(Idea) {}
    const host = makeStuff(() => new TestHost());
    host.setStaticSlots([
      { name: 'foot:left', accepts: 'WearableMixin' },
      { name: 'foot:right', accepts: 'WearableMixin' },
    ]);
    boots.setSlotClaim('test', ['foot:left', 'foot:right']);
    // fitsSlot would return false because no Organism, but the host
    // composes WearableMixin requirement only — the slot accepts the
    // mixin, and we test atomicity not fitsSlot here. Override the
    // candidate-side test by giving boots a stub fitsSlot.
    boots.fitsSlot = () => true;
    SlotApi.occupyAll(host, boots, ['foot:left', 'foot:right']);
    expect(host.getOccupant('foot:left')).toBe(boots);
    expect(host.getOccupant('foot:right')).toBe(boots);
  });
});

// Reference TestAvatar / BodyPlan / Species to keep imports live —
// real avatar-flow integration tests live in the controller tests.
void TestAvatar;
void BodyPlan;
void Species;
