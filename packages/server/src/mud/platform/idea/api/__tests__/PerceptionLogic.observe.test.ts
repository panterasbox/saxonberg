/**
 * ⭐⭐ `PerceptionApi.observe` — the ONE perception moment of a deliberate
 * look (controller-liquidity W8). Everything `look` writes to the world
 * happens here, called directly with the actor — no controller:
 *
 *   - a THING: the airing settles first, a person is tracked, what it
 *     visibly holds is read BEFORE the close look, and the `glance`
 *     records each discovery (the sticky DISCOVERY belief);
 *   - a PLACE: the body is told what it saw on the `seen` channel — never
 *     `searched`, which only a deliberate going-over may write (location-
 *     graph § 4) — and the void teaches nothing;
 *   - `search`'s own resolve is the one writer of `searched`.
 *
 * The viewer's `awareness` band is cold (floor, capacity 0) and no vision
 * singleton is loaded, so effective perception is exactly the attention:
 * a `glance` (examine bonus 2) finds `subtle` (2) and not `hidden` (4),
 * and `hidden` is still a passive hint (gap 4 ≤ cutoff 4).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerceptionApi } from '../../../../api/perception';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { Idea } from '../../../../lib/stuff/Idea';
import Place from '../../../../lib/stuff/Place';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ConcealableMixin } from '../../../../lib/concealment/Concealable';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { NamedMixin } from '../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../lib/description/Perceptible';
import { PerceiverMixin } from '../../../../lib/description/Perceiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import SearchController from '../../cmd/perception/SearchController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';

class Viewer extends PerceiverMixin(
  BeliefStoreMixin(
    CommandGiverMixin(
      SensorMixin(
        ContainerMixin(ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea))))),
      ),
    ),
  ),
) {
  static _mixinName = 'ObserveViewer';
}
class Room extends VisibleMixin(NamedMixin(ContainerMixin(Place))) {
  static _mixinName = 'ObserveRoom';
}
class Void extends ContainerMixin(Place) {
  static _mixinName = 'ObserveVoid';
}
class Chest extends ContainerMixin(
  ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {
  static _mixinName = 'ObserveChest';
  public aired = 0;
  public reconcileAiring(): Promise<void> {
    this.aired += 1;
    return Promise.resolve();
  }
}
class Item extends ConcealableMixin(
  ContainableMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {
  static _mixinName = 'ObserveItem';
}

let counter = 0;
let viewer: Viewer;

function item(level: 'obvious' | 'subtle' | 'hidden'): Item {
  const it = makeStuffAtPath(() => new Item(), `/obj/test/observe-item-${counter++}`);
  it.setName(`item ${level}`);
  it.setShortDescription(`item ${level}`);
  it.setConcealment(level);
  return it;
}

function observe(target: Stuff) {
  return withRootContext(null, 'observe.test', () =>
    PerceptionApi.observe(viewer, target),
  );
}

beforeEach(() => {
  StuffApi.clearAll();
  viewer = makeStuff(() => new Viewer());
  viewer.setName('Watcher');
});
afterEach(() => vi.restoreAllMocks());

describe('observe — a thing', () => {
  it('⭐ the glance records the discovery, after what it holds was read', async () => {
    const chest = makeStuff(() => new Chest());
    chest.setName('chest');
    const plain = item('obvious');
    const subtle = item('subtle');
    const hidden = item('hidden');
    for (const x of [plain, subtle, hidden]) ContainmentApi.move(x, chest);

    expect(PerceptionApi.hasDiscovered(viewer, subtle)).toBe(false);
    const seen = await observe(chest);

    // The glance found the subtle thing and wrote it down — sticky.
    expect(seen.found).toEqual([subtle]);
    expect(PerceptionApi.hasDiscovered(viewer, subtle)).toBe(true);
    // What it holds was read BEFORE the close look: the find is a
    // finding, not folded into the list.
    expect(seen.holds?.carried).toEqual([plain]);
    // The hidden one is nearly seen — a hint, never found.
    expect(seen.hints).toEqual([hidden]);
    expect(PerceptionApi.hasDiscovered(viewer, hidden)).toBe(false);

    // A second look: already found is not found again, and now listed.
    const again = await observe(chest);
    expect(again.found).toEqual([]);
    expect(again.holds?.carried).toEqual([plain, subtle]);
  });

  it('settles the airing before anything is read (cleanliness D21)', async () => {
    const chest = makeStuff(() => new Chest());
    vi.spyOn(MixinApi, 'isSoilable').mockImplementation(((o: unknown) => o === chest) as never);
    await observe(chest);
    expect(chest.aired).toBe(1);
  });

  it('a person looked at is tracked; a thing is not', async () => {
    const ruth = makeStuff(() => new Chest());
    const learn = vi.spyOn(viewer, 'learnIdentityOf');
    vi.spyOn(MixinApi, 'isOrganism').mockImplementation(((o: unknown) => o === ruth) as never);
    await observe(ruth);
    expect(learn).toHaveBeenCalledWith(ruth, null);
    learn.mockClear();
    await observe(makeStuff(() => new Chest()));
    expect(learn).not.toHaveBeenCalled();
  });

  it('a thing that cannot be seen teaches nothing', async () => {
    const ghost = makeStuff(() => new Idea());
    const seen = await observe(ghost);
    expect(seen).toMatchObject({ found: [], hints: [], holds: null, exits: [] });
  });
});

describe('observe — a place', () => {
  it('⭐⭐ tells the body what it saw on the `seen` channel — never `searched`', async () => {
    const room = makeStuff(() => new Room());
    room.setName('the cellar');
    ContainmentApi.move(viewer, room);
    const crate = item('obvious');
    ContainmentApi.move(crate, room);
    const learn = vi.spyOn(viewer, 'learnSurroundings');

    const seen = await observe(room);

    expect(seen.indistinct).toBe(false);
    expect(seen.seen).toContain(crate);
    expect(seen.seen).not.toContain(viewer);
    expect(learn).toHaveBeenCalledTimes(1);
    const [where, occupants, how] = learn.mock.calls[0]!;
    expect(where).toBe(room);
    expect(occupants).toEqual(seen.seen);
    // A glance's absences are not evidence: the default channel, `seen`.
    expect(how ?? 'seen').toBe('seen');
  });

  it('the void teaches nothing — no claim, nobody tracked', async () => {
    const nowhere = makeStuff(() => new Void());
    ContainmentApi.move(viewer, nowhere);
    // The bare place answers Visible through its substrate; the void on a
    // fresh login has no prose to see.
    const isVisible = MixinApi.isVisible.bind(MixinApi);
    vi.spyOn(MixinApi, 'isVisible').mockImplementation(((o: Stuff) =>
      o === nowhere ? false : isVisible(o)) as never);
    const learn = vi.spyOn(viewer, 'learnSurroundings');
    const seen = await observe(nowhere);
    expect(seen.indistinct).toBe(true);
    expect(learn).not.toHaveBeenCalled();
  });
});

describe('`search` — the one writer of `searched`', () => {
  it('⭐ the search resolve records the place as `searched`', () => {
    const room = makeStuff(() => new Room());
    ContainmentApi.move(viewer, room);
    const learn = vi.spyOn(viewer, 'learnSurroundings');
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });
    withRootContext(null, 'observe.test', () =>
      (SearchController as unknown as {
        resolveAndRender(a: Stuff, s: readonly Stuff[], d: string): void;
      }).resolveAndRender(viewer, [], 'broad'),
    );
    expect(learn).toHaveBeenCalledWith(room, [], 'searched');
  });
});
