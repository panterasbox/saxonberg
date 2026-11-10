import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import ExitableVessel from '../ExitableVessel';
import { SealableMixin } from '../../spatial/Sealable';
import Location from '../../location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { VisionModality } from '../../../platform/idea/modalities/VisionModality';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import { Light } from '../../perception/Light';
import { AmbientLitMixin } from '../../perception/AmbientLit';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import { PerceptionApi } from '../../../api/perception';

/** The vision modality singleton — these are instance methods on it. */
const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

class AmbientLocation extends AmbientLitMixin(Location) {}

/** A wardrobe whose door is its own seal — the coach's shape (`Sealable(… ExitableVessel)`). */
class Wardrobe extends SealableMixin(ExitableVessel) {}


/**
 * ⭐⭐ **These read the room's ILLUMINANCE, not its flux** — amended at the
 * envelope sweep (2026-09-25).
 *
 * They used to expect the wardrobe interior to read `60` from a room whose
 * ambient is **60 lumens**. But the room is a 3 m cell — 9 m² — so the
 * room itself is at `60 / 9 = 6.67` lux, and handing the wardrobe's 1 m²
 * interior all 60 lumens made **a wardrobe nine times brighter than the
 * room it stands in.**
 *
 * That is the same defect the sweep's browser walk found at city scale: a
 * doorless exit passed its neighbour's whole flux and a chain of bright
 * roads made each other `blinding`. The walk caps light from other scopes
 * at the brightest neighbour's illuminance now — *an opening cannot make
 * you brighter than what is through it* — so an open wardrobe door
 * delivers the room's **lux**.
 *
 * ⭐ Every claim these tests make is intact and one is stronger: open
 * leaks, closed reads zero. Only the arithmetic the old walk got wrong has
 * changed.
 *
 * ⭐ Boundary build (2026-11): a vessel's door is its OWN `Sealable` now —
 * no door slot, no anchor pair migrating on a move (the coach authors
 * `open: false` and no `door:`). So these build the wardrobe as
 * `Sealable(ExitableVessel)`, the coach's composition.
 */
const ROOM_AREA_M2 = 9; // a 3 m CartesianZone cell

describe('ExitableVessel — its seal is its door (light)', () => {
  beforeEach(() => {
    seedKernelContentStore();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  async function wardrobeIn(room: AmbientLocation): Promise<Wardrobe> {
    const wardrobe = await StuffApi.create(() => new Wardrobe());
    wardrobe.setShortDescription('oak wardrobe');
    ContainmentApi.move(wardrobe, room);
    return wardrobe;
  }

  function brightRoom(): AmbientLocation {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);
    return room;
  }

  it('an OPEN wardrobe leaks the room light into its interior', async () => {
    const wardrobe = await wardrobeIn(brightRoom());
    wardrobe.setOpen(true);
    expect(vision().lightAt(wardrobe).intensity.rawValue()).toBeCloseTo(
      60 / ROOM_AREA_M2,
      6,
    );
  });

  it('a SHUT wardrobe reads ZERO inside even when the room is bright', async () => {
    const wardrobe = await wardrobeIn(brightRoom());
    wardrobe.setOpen(false);
    expect(vision().lightAt(wardrobe).intensity.rawValue()).toBe(0);

    wardrobe.setOpen(true);
    expect(vision().lightAt(wardrobe).intensity.rawValue()).toBeCloseTo(
      60 / ROOM_AREA_M2,
      6,
    );
  });

  it('the synthesized out exit carries no boundary', async () => {
    const wardrobe = await wardrobeIn(brightRoom());
    expect(wardrobe.getExit('out')!.getBoundary()).toBeNull();
    expect(wardrobe.getEntryExit()!.getBoundary()).toBeNull();
  });
});
