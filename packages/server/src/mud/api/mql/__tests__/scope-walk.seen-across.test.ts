/**
 * ⭐ A place read from where it is reached (tracts build D30). Open ground
 * answers `isSeenAcrossExit()`, and `candidatesForHere` then offers it to
 * the viewer next door by its own name — `look upper bench` from the
 * farmyard. Only the place itself: never what stands in it.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../stuff';
import { ContainmentApi } from '../../containment';
import Location from '../../../lib/location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { NamedMixin } from '../../../lib/description/Named';
import { VisibleMixin } from '../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { Idea } from '../../../lib/stuff/Idea';
import { candidatesForHere } from '../scope-walk';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../lib/security/__tests__/test-setup';

class Viewer extends NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea)))) {
  protected override handleMessage(): void {}
}
class OpenGround extends Location {
  public override isSeenAcrossExit(): boolean {
    return true;
  }
}
class Sheaf extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}

describe('candidatesForHere — a place seen across an exit', () => {
  let field: CartesianZone;
  let yard: Location;
  let viewer: Viewer;

  beforeEach(() => {
    seedKernelContentStore();
    field = makeStuff(() => new CartesianZone());
    yard = makeStuff(() => new Location());
    yard.setShortDescription('the farmyard');
    field.addLocation(yard, 0, 0, 0);
    viewer = makeStuff(() => new Viewer());
    viewer.setName('Alice');
    ContainmentApi.move(viewer, yard);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('⭐ offers open ground through an exit, by its own name', async () => {
    const bench = makeStuff(() => new OpenGround());
    bench.setShortDescription('the upper bench');
    bench.setKeywords(['bench', 'upper bench']);
    field.addLocation(bench, 0, 1, 0);
    await yard.addBidirectionalExit(bench, 'north');
    const pool = candidatesForHere(viewer);
    expect(pool.some((c) => c.stuff === bench)).toBe(true);
  });

  it('never offers what stands in it', async () => {
    const bench = makeStuff(() => new OpenGround());
    bench.setShortDescription('the upper bench');
    field.addLocation(bench, 0, 1, 0);
    await yard.addBidirectionalExit(bench, 'north');
    const sheaf = makeStuff(() => new Sheaf());
    sheaf.setShortDescription('a sheaf');
    ContainmentApi.move(sheaf, bench);
    const pool = candidatesForHere(viewer);
    expect(pool.some((c) => c.stuff === sheaf)).toBe(false);
  });

  it('a room is entered to be seen — not offered', async () => {
    const barn = makeStuff(() => new Location());
    barn.setShortDescription('the barn');
    field.addLocation(barn, 1, 0, 0);
    await yard.addBidirectionalExit(barn, 'east');
    const pool = candidatesForHere(viewer);
    expect(pool.some((c) => c.stuff === barn)).toBe(false);
  });
});
