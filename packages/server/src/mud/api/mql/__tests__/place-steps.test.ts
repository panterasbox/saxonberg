/**
 * ⭐ The steps between places (harbors review 3): `:exits` (a place's
 * exits, as the viewer sees them), `:to` (an exit's destination — live
 * only, never materialized), `:from` (an exit's source). Element-derivable
 * flat-maps, reserved like `:members`.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../stuff';
import { MqlApi } from '../../mql';
import { ContainmentApi } from '../../containment';
import Location from '../../../lib/location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { NamedMixin } from '../../../lib/description/Named';
import { Idea } from '../../../lib/stuff/Idea';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../lib/security/__tests__/test-setup';

class Viewer extends NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea)))) {
  protected override handleMessage(): void {}
}

describe('MQL steps between places — :exits, :to, :from', () => {
  let zone: CartesianZone;
  let hall: Location;
  let yard: Location;
  let barn: Location;
  let viewer: Viewer;

  beforeEach(async () => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    hall = makeStuff(() => new Location());
    hall.setShortDescription('the hall');
    yard = makeStuff(() => new Location());
    yard.setShortDescription('the yard');
    barn = makeStuff(() => new Location());
    barn.setShortDescription('the barn');
    zone.addLocation(hall, 0, 0, 0);
    zone.addLocation(yard, 0, 1, 0);
    zone.addLocation(barn, 1, 1, 0);
    await hall.addBidirectionalExit(yard, 'north');
    await yard.addBidirectionalExit(barn, 'east');
    viewer = makeStuff(() => new Viewer());
    viewer.setName('Alice');
    ContainmentApi.move(viewer, hall);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  const many = (q: string) =>
    MqlApi.resolveMany(q, { commandGiver: viewer as never, scope: 'reachable' }).stuff;

  it('`here:exits` is the place’s exits, and a set', () => {
    const r = MqlApi.resolveMany('here:exits', { commandGiver: viewer as never, scope: 'reachable' });
    expect(r.stuff).toEqual([hall.getExit('north')]);
    expect(r.isSet).toBe(true);
  });

  it('`here:exits:north` narrows to the way by its keywords', () => {
    expect(many('here:exits:north')).toEqual([hall.getExit('north')]);
    expect(many('here:exits:n')).toEqual([hall.getExit('north')]);
  });

  it('`:to` is the far place; `:from` the near one', () => {
    expect(many('here:exits:north:to')).toEqual([yard]);
    expect(many('here:exits:north:from')).toEqual([hall]);
  });

  it('⭐ composes: `here:exits:north:to:exits` is the far place’s ways', () => {
    const far = many('here:exits:north:to:exits');
    expect(far).toEqual(expect.arrayContaining([yard.getExit('south'), yard.getExit('east')]));
    expect(far).toHaveLength(2);
    expect(many('here:exits:north:to:exits:east:to')).toEqual([barn]);
  });

  it('`:exits` hides what the viewer cannot see', () => {
    hall.getExit('north')!.setConcealment('hidden');
    expect(many('here:exits')).toEqual([]);
  });

  it('`:to` never materializes: an exit whose far place is not loaded yields nothing', () => {
    const north = hall.getExit('north')!;
    const peek = north.peekDestination.bind(north);
    north.peekDestination = () => null;
    try {
      expect(many('here:exits:north:to')).toEqual([]);
    } finally {
      north.peekDestination = peek;
    }
  });

  it('a non-place / non-exit contributes nothing', () => {
    expect(many('me:exits')).toEqual([]);
    expect(many('me:to')).toEqual([]);
  });
});
