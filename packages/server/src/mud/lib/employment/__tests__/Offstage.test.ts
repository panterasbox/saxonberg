/**
 * Offstage — the off-shift parking role (content packs wave 4b, D4). Two
 * venues, two rooms: each venue's cast parks in its own `Offstage` and
 * neither bleeds into the other; the room is never `Exitable`; the role
 * is a predicate (`MixinApi.isOffstage`), not a path.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as shifts } from '../../behavior/shifts';
import { Idea } from '../../stuff/Idea';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import type { BrainContext } from '../../behavior/brain';
import { makeStuff } from '../../security/__tests__/test-setup';
import Offstage from '../../../platform/location/Offstage';

class Post extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Post';
}
class Mover extends MobileMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Mover';
}

function ctxFor(host: Stuff, offstage: string): BrainContext {
  return {
    host,
    config: { behindBar: '/post', offstage },
    state: {},
    trigger: { source: 'cadence', raw: 'cadence:30s' },
  } as unknown as BrainContext;
}

describe('Offstage — the off-shift parking role', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('is the role as a predicate, and never Exitable', () => {
    const room = makeStuff(() => new Offstage());
    const post = makeStuff(() => new Post());
    expect(MixinApi.isOffstage(room)).toBe(true);
    expect(MixinApi.isOffstage(post)).toBe(false);
    expect(MixinApi.isExitable(room)).toBe(false);
    expect(MixinApi.isContainer(room)).toBe(true);
  });

  it('parks two venues’ cast in two rooms with no bleed, and returns them', async () => {
    const loungeOff = makeStuff(() => new Offstage());
    const hearthOff = makeStuff(() => new Offstage());
    const rooms: Record<string, Stuff> = {
      '/lounge/off': loungeOff,
      '/hearth/off': hearthOff,
    };
    const post = makeStuff(() => new Post());
    rooms['/post'] = post;
    vi.spyOn(StuffApi, 'singletonOrClone').mockImplementation(
      async (path: string) => rooms[path]!
    );
    const bartender = makeStuff(() => new Mover());
    const cook = makeStuff(() => new Mover());
    ContainmentApi.move(bartender, post);
    ContainmentApi.move(cook, post);

    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('off-shift');
    await shifts.act(ctxFor(bartender, '/lounge/off'));
    await shifts.act(ctxFor(cook, '/hearth/off'));

    expect(bartender.getContainer()?.stuffId).toBe(loungeOff.stuffId);
    expect(cook.getContainer()?.stuffId).toBe(hearthOff.stuffId);
    expect(loungeOff.getContents().map((s) => s.stuffId)).toEqual([bartender.stuffId]);
    expect(hearthOff.getContents().map((s) => s.stuffId)).toEqual([cook.stuffId]);

    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('on-shift');
    await shifts.act(ctxFor(bartender, '/lounge/off'));
    await shifts.act(ctxFor(cook, '/hearth/off'));
    expect(bartender.getContainer()?.stuffId).toBe(post.stuffId);
    expect(cook.getContainer()?.stuffId).toBe(post.stuffId);
    expect(loungeOff.getContents()).toEqual([]);
    expect(hearthOff.getContents()).toEqual([]);
  });
});
