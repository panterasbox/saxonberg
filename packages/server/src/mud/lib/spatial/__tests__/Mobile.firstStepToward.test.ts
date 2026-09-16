/**
 * `Mobile.firstStepToward` — ⭐ **the kernel's only pathfinding**, and
 * the reason it is on the body rather than inside a brain.
 *
 * It was a private BFS in the `homes` brain. A second brain wanting to
 * walk somewhere would have written a second one — which is the shape
 * this whole review round was about. It is a question about a thing that
 * MOVES, so it lives on `Mobile`.
 *
 * ⚠⚠ The property that matters: **a closed door is not a longer way
 * round, it is not a way at all.** No open path returns `null`, and an
 * animal that gets `null` simply stays — which is the entire
 * implementation of "lost".
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Walker extends MobileMixin(ContainableMixin(Idea)) {}

interface FakeRoom {
  id: string;
  exits: { dest: FakeRoom; passable: boolean }[];
}
const room = (id: string): FakeRoom => ({ id, exits: [] });
function link(a: FakeRoom, b: FakeRoom, passable = true): void {
  a.exits.push({ dest: b, passable });
  b.exits.push({ dest: a, passable });
}

const cache = new Map<FakeRoom, Stuff>();
function R(r: FakeRoom): Stuff {
  if (!cache.has(r)) {
    cache.set(r, {
      stuffId: r.id,
      getExits: () => ({
        values: () =>
          r.exits.map((e) => ({
            getDestination: () => R(e.dest),
            canTraverse: () => ({ ok: e.passable }),
          })),
      }),
    } as unknown as Stuff);
  }
  return cache.get(r)!;
}

/** A walker standing in `where`. */
function walkerIn(where: FakeRoom): Walker {
  const w = makeStuff(() => new Walker());
  vi.spyOn(w, 'getContainer').mockReturnValue(R(where) as never);
  return w;
}

beforeEach(() => {
  cache.clear();
  StuffApi.clearAll();
  vi.spyOn(MixinApi, 'isExitable').mockReturnValue(true as never);
  vi.spyOn(PersistableApi, 'placeIdOf').mockImplementation(
    (s: Stuff) => (s as unknown as { stuffId: string }).stuffId,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the first step of a shortest open path', () => {
  it('returns the next-door exit when home is adjacent', () => {
    const here = room('here');
    const home = room('home');
    link(here, home);
    expect(walkerIn(here).firstStepToward('home')).not.toBeNull();
  });

  it('⭐ returns ONE step, not a route, three rooms out', () => {
    const a = room('a');
    const b = room('b');
    const c = room('c');
    const home = room('home');
    link(a, b);
    link(b, c);
    link(c, home);
    const step = walkerIn(a).firstStepToward('home');
    // The step it takes is the one INTO b — the near end of the path,
    // re-asked next beat, so a door closing mid-journey is answered by
    // the next step and not by an invalidated plan.
    expect(step?.getDestination()).toBe(R(b));
  });

  it('⚠⚠ a closed door is not a longer way round — it is no way at all', () => {
    const a = room('a');
    const b = room('b');
    const home = room('home');
    link(a, b, false); // shut
    link(b, home);
    expect(walkerIn(a).firstStepToward('home')).toBeNull();
  });

  it('prefers the open path when one route is shut', () => {
    const a = room('a');
    const shut = room('shut');
    const open = room('open');
    const home = room('home');
    link(a, shut, false);
    link(shut, home);
    link(a, open);
    link(open, home);
    expect(walkerIn(a).firstStepToward('home')?.getDestination()).toBe(R(open));
  });

  it('gives up past the hop limit rather than walking the world', () => {
    const rooms = Array.from({ length: 12 }, (_, i) => room(`r${i}`));
    for (let i = 0; i < rooms.length - 1; i++) link(rooms[i]!, rooms[i + 1]!);
    const far = rooms[rooms.length - 1]!;
    const w = walkerIn(rooms[0]!);
    expect(w.firstStepToward(far.id, 2)).toBeNull();
    expect(w.firstStepToward(far.id, 20)).not.toBeNull();
  });

  it('is already there', () => {
    const home = room('home');
    expect(walkerIn(home).firstStepToward('nowhere')).toBeNull();
  });
});
