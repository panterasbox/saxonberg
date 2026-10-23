import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Exit from '../Exit';
import Location from '../../location/Location';
import { Vessel } from '../../stuff/Vessel';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

/**
 * ⭐ An exit into ONE of several things made from one row (the river drive:
 * three canoes on a shingle, and `go canoe` crashed "expected singleton,
 * found 3"). A vessel's own exits keep the thing they were given
 * (`keepLiveDestination`), and the far side is asked of the exit
 * (`peekDestination`), never looked up by its row's path.
 */
beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('an exit into one of several of a row', () => {
  it('holds the thing it was bound to, and its far side never throws', () => {
    const shingle = makeStuffAtPath(() => new Location(), '/test/shingle');
    const boats = [1, 2, 3].map(() => makeStuffAtPath(() => new Vessel(), '/test/thing/canoe') as unknown as Stuff & Container);
    const second = boats[1]!;
    const viaCtor = makeStuff(() => new Exit({ direction: 'in', source: shingle as never, destination: second, keepLiveDestination: true }));
    expect(viaCtor.getDestination()).toBe(second);
    expect(viaCtor.peekDestination()).toBe(second);
    expect(() => viaCtor.leadsIntoWater()).not.toThrow();
  });

  it('⭐ an exit that names a row with several instances answers null, never throws', () => {
    [1, 2, 3].map(() => makeStuffAtPath(() => new Vessel(), '/test/thing/canoe'));
    const shingle = makeStuffAtPath(() => new Location(), '/test/shingle2');
    const byPath = makeStuff(() => new Exit({ direction: 'in', source: shingle as never, destinationPath: '/test/thing/canoe' }));
    expect(byPath.peekDestination()).toBeNull();
    expect(byPath.leadsIntoWater()).toBe(false);
  });

  it('a place is still held by its path — one row, one place', () => {
    const a = makeStuffAtPath(() => new Location(), '/test/a');
    const b = makeStuffAtPath(() => new Location(), '/test/b');
    const exit = makeStuff(() => new Exit({ direction: 'north', source: a as never, destination: b as never }));
    expect(exit.getDestinationTemplatePath()).toBe('/test/b');
    expect(exit.getDestination()).toBe(b);
  });
});
