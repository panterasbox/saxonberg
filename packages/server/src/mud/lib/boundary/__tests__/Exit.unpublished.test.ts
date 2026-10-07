/**
 * ⭐⭐ Draft is a WALL: an exit into content that is not published
 * refuses, with a reason that names the place.
 *
 * Two properties make it usable rather than merely correct:
 *
 *   - it runs **before the lock gate**, so a wall reads as a wall
 *     rather than as a locked door — a player told "the gate is locked"
 *     goes looking for a key that does not exist;
 *   - it **never resolves the destination**, which is the rule the lock
 *     gate already states about itself. The far side may be unloaded,
 *     unbuilt or dark, and a sync refusal has to work for all three.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Exit from '../Exit';
import { ParcelApi } from '../../../api/parcel';
import { StuffApi } from '../../../api/stuff';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Door from '../../../platform/thing/Door';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

const ZONE = '/test/pub/zone';
const HERE = '/test/pub/zone/here';
const DRAFT = '/test/pub/draftville/hall';

let dark: Set<string>;

beforeEach(() => {
  StuffApi.clearAll();
  dark = new Set();
  vi.spyOn(ParcelApi, 'isPathPublished').mockImplementation(
    ((path: string) =>
      ![...dark].some((d) => path === d || path.startsWith(d + '/'))) as never,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function here(): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  const loc = makeStuffAtPath(() => new CartesianLocation(), HERE);
  zone.addLocation(loc, 0, 0, 0);
  return loc;
}

/**
 * An exit at a path-only destination — the cross-zone storage shape.
 *
 * ⚠ Built through the CONSTRUCTOR, not `bind()`: binding is gated
 * `FromMixin(ExitableMixin)` because only an exitable place may wire an
 * exit onto itself. The constructor is the shape every other boundary
 * suite uses for a standalone exit.
 */
function exitTo(source: CartesianLocation, path: string): Exit {
  return makeStuff(
    () =>
      new Exit({
        direction: 'north',
        source: source as never,
        destinationPath: path,
      }),
  );
}

describe('an exit into draft content', () => {
  it('⭐⭐ refuses, naming the GATE and a reason', () => {
    dark.add('/test/pub/draftville');
    const exit = exitTo(here(), DRAFT);
    const guard = exit.canTraverse({} as never);
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('unpublished');
    expect(guard.reason).toMatch(/is not open\.$/);
  });

  it('names the far side READABLY, from the path when it is not loaded', () => {
    dark.add('/test/pub/draftville');
    const guard = exitTo(here(), DRAFT).canTraverse({} as never);
    // The leaf, read as words — never a raw path dumped at a player.
    expect(guard.reason).toContain('Hall');
  });

  it('an exit into PUBLISHED content is admitted', () => {
    const exit = exitTo(here(), DRAFT);
    expect(exit.canTraverse({} as never).ok).toBe(true);
  });

  it('⭐⭐ the wall runs BEFORE the lock gate — a wall is not a locked door', async () => {
    // A player told "the gate is locked" goes looking for a key that
    // does not exist.
    dark.add('/test/pub/draftville');
    const source = here();
    const door = makeStuff(() => new Door());
    door.setOpen(false);
    door.setLocked?.(true);
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: source as never,
          destinationPath: DRAFT,
          door,
        }),
    );

    const guard = exit.canTraverse({} as never);
    expect(guard.gate).toBe('unpublished');
  });

  it('⚠ `blocked` still wins — it is a fact about the exit itself', () => {
    dark.add('/test/pub/draftville');
    const exit = exitTo(here(), DRAFT);
    exit.setBlocked(true);
    expect(exit.canTraverse({} as never).gate).toBe('blocked');
  });

  it('an exit with no destination path at all is not walled', () => {
    // An unbound kind clone — and the shape a `DeferredDestinationExit`
    // is a door onto: a space nobody has decided yet. Not draft
    // content, so not this gate's business.
    const exit = makeStuff(() => new Exit());
    expect(exit.canTraverse({} as never).gate).not.toBe('unpublished');
  });

  it('⭐ the gate NEVER resolves the destination', () => {
    dark.add('/test/pub/draftville');
    const spy = vi.spyOn(StuffApi, 'singleton');
    exitTo(here(), DRAFT).canTraverse({} as never);
    // Resolving would mint the very room the parcel says is not open.
    expect(spy).not.toHaveBeenCalled();
  });
});
