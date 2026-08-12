/**
 * Disguise (Wave 4) — the worn/imposed resolver, the `getPresentation`
 * deferral, and the recognition mask + re-fire on removal.
 *
 * Covers: `getDisguise` resolves a worn DisguiseBearing garment;
 * `setDisguise`/`clearDisguise` impose/lift with no worn item;
 * `getPresentation` defers to the merged `appearsAs` (no shadow); a known
 * wearer reads as "a hooded figure" to others while hooded and recognition
 * re-fires when it comes off (BOTH transitions).
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { DisguisableMixin } from '../Disguisable';
import { DisguiseBearingMixin, type Disguise } from '../Disguise';
import { RecognitionApi } from '../../../api/recognition';
import { RECOGNITION } from '../../belief/BeliefStore';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { SlottedMixin } from '../../slot/Slotted';
import { SlottableMixin } from '../../slot/Slottable';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { OrganismMixin } from '../../species/Organism';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

// A wearer: Disguisable + a slot host + recognizable being.
class Wearer extends DisguisableMixin(
  SlottedMixin(
    OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
  ),
) {}

// A hood: a slottable that bears a disguise. (The shipped hood is a
// full DisguiseGarment/Wearable; the worn-scan only checks
// `isDisguiseBearing`, so a plain Slottable occupant exercises it
// without the species/body-plan machinery Wearable.fitsSlot needs.)
class Hood extends DisguiseBearingMixin(
  SlottableMixin(VisibleMixin(NamedMixin(Thing))),
) {}

// A viewer who can recognize the wearer.
class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}

const IMPOSED: Disguise = {
  appearsAs: 'a shimmering illusion',
  covers: ['face'],
  masksIdentity: true,
};

let counter = 0;
function makeWearer(name: string, appearance: string): Wearer {
  const w = makeStuffAtPath(() => new Wearer(), `/obj/npc/wearer-${counter++}`);
  w.setName(name);
  w.setShortDescription(appearance);
  // A head slot so the hood has somewhere to go.
  w.setStaticSlots([{ name: 'head', accepts: 'SlottableMixin' }]);
  return w;
}

function makeHood(): Hood {
  const h = makeStuff(() => new Hood());
  h.setShortDescription('a deep grey hood');
  h.setAppearsAs('a hooded figure');
  h.setCovers(['face']);
  h.setMasksIdentity(true);
  return h;
}

describe('Disguisable resolver', () => {
  it('resolves a worn DisguiseBearing garment', () => {
    const w = makeWearer('Bob', 'a tall man');
    const hood = makeHood();
    w.occupy(hood, 'head');
    const d = w.getDisguise();
    expect(d).not.toBeNull();
    expect(d!.appearsAs).toBe('a hooded figure');
    expect(d!.masksIdentity).toBe(true);
  });

  it('setDisguise/clearDisguise impose and lift with no worn item', () => {
    const w = makeWearer('Bob', 'a tall man');
    expect(w.getDisguise()).toBeNull();
    w.setDisguise(IMPOSED);
    expect(w.getDisguise()?.appearsAs).toBe('a shimmering illusion');
    w.clearDisguise();
    expect(w.getDisguise()).toBeNull();
  });

  it('getPresentation defers to the disguise (not via a shadow)', () => {
    const w = makeWearer('Bob', 'a tall man');
    expect(w.getPresentation()).toBe('Bob'); // unmasked → proper name
    w.setDisguise(IMPOSED);
    expect(w.getPresentation()).toBe('a shimmering illusion');
    w.clearDisguise();
    expect(w.getPresentation()).toBe('Bob');
  });
});

describe('disguise masks recognition, removal re-fires it', () => {
  it('a known wearer reads as the disguise while hooded, by name once removed', () => {
    const viewer = makeStuff(() => new Viewer());
    const bob = makeWearer('Bob', 'a tall man');
    const hood = makeHood();

    // The viewer knows Bob.
    viewer.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });
    expect(RecognitionApi.describe(viewer, bob)).toBe('Bob');

    // Hood up → masked. The known name is withheld; the covering shows.
    bob.occupy(hood, 'head');
    expect(RecognitionApi.describe(viewer, bob)).toBe('a hooded figure');

    // Hood off → recognition re-fires (no stored disguise state; the
    // worn-scan simply finds nothing now).
    bob.vacate('head', hood);
    expect(RecognitionApi.describe(viewer, bob)).toBe('Bob');
  });
});
