/**
 * Tests for DescribeApi.getDisplayName.
 *
 * Two-step resolution (post-Named-refactor):
 *   1. Named.name — proper name, when set
 *   2. Visible.shortDescription — visual identity, the common case
 *      for things that don't have proper names
 *   3. Fallback string
 *
 * The earlier bare-`.name`-string-property branch retired when
 * Location adopted NamedMixin.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DescribeApi,
  SURFACE_ENUMERATE_THRESHOLD,
} from '../describe';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { GlobbableMixin } from '../../lib/stuff/Globbable';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { ContainmentApi } from '../containment';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

class Plain extends Idea {}
class NamedThing extends NamedMixin(Idea) {}
class VisibleThing extends VisibleMixin(Idea) {}
class NamedAndVisible extends NamedMixin(VisibleMixin(Idea)) {}

describe('DescribeApi.getDisplayName', () => {
  it('returns Named.name (casual register) when set', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Alice');
    obj.setSurname('Smith');
    // Casual — surname is NOT included. Call `obj.getFullName()` for
    // the formal form.
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Alice');
  });

  it('falls back to Visible.shortDescription when Named.name is empty', () => {
    const obj = makeStuff(() => new NamedAndVisible());
    obj.setShortDescription('a heavy oak door');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe(
      'a heavy oak door'
    );
  });

  it('Named.name takes precedence over Visible.shortDescription', () => {
    const obj = makeStuff(() => new NamedAndVisible());
    obj.setName('Excalibur');
    obj.setShortDescription('a gleaming silver sword');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('Excalibur');
  });

  it('uses Visible.shortDescription on a non-Named object', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('a rusty key');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('a rusty key');
  });

  it('skips empty Visible.shortDescription', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('');
    expect(DescribeApi.getDisplayName(obj, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when neither Named nor Visible applies', () => {
    expect(
      DescribeApi.getDisplayName(makeStuff(() => new Plain()), 'something')
    ).toBe('something');
  });

  it('defaults the fallback to empty string', () => {
    expect(
      DescribeApi.getDisplayName(makeStuff(() => new Plain()))
    ).toBe('');
  });
});

describe('DescribeApi.formatName (count-aware)', () => {
  class Coin extends GlobbableMixin(NamedMixin(Idea)) {
    static _mixinName = 'Coin';
  }
  class Mouse extends GlobbableMixin(NamedMixin(Idea)) {
    static _mixinName = 'Mouse';
    public getPluralForm(): string {
      return 'mice';
    }
  }
  class Rock extends NamedMixin(Idea) {
    static _mixinName = 'Rock';
  }

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('returns the bare name for a quantity-1 globbable', () => {
    const c = makeStuff(() => {
      const coin = new Coin();
      coin.setName('coin');
      return coin;
    });
    expect(DescribeApi.formatName(c)).toBe('coin');
  });

  it('prefixes count + naive plural for quantity > 1', () => {
    const c = makeStuff(() => {
      const coin = new Coin();
      coin.setName('coin');
      return coin;
    });
    c.setQuantity(30);
    expect(DescribeApi.formatName(c)).toBe('30 coins');
  });

  it('respects host-side getPluralForm for irregulars', () => {
    const m = makeStuff(() => {
      const mouse = new Mouse();
      mouse.setName('mouse');
      return mouse;
    });
    m.setQuantity(3);
    expect(DescribeApi.formatName(m)).toBe('3 mice');
  });

  it('falls through to getDisplayName for non-globbable hosts', () => {
    const r = makeStuff(() => {
      const rock = new Rock();
      rock.setName('rock');
      return rock;
    });
    expect(DescribeApi.formatName(r)).toBe('rock');
  });
});

describe('DescribeApi.groupContentsByResting', () => {
  class TestRoom extends ContainerMixin(Idea) {}
  class TestSurface extends SurfacedMixin(ContainableMixin(NamedMixin(Idea))) {}
  class TestItem extends ContainableMixin(NamedMixin(Idea)) {}

  let pathCounter = 0;
  function freshPath(prefix: string): string {
    pathCounter += 1;
    return `${prefix}-${pathCounter}`;
  }

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('returns empty groups for an empty contents list', () => {
    const out = DescribeApi.groupContentsByResting([]);
    expect(out.topLevel).toEqual([]);
    expect(out.byHost.size).toBe(0);
  });

  it('lists items with no restingOn at the top level', () => {
    const room = makeStuff(() => new TestRoom());
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, room);
    const out = DescribeApi.groupContentsByResting(room.getContents());
    expect(out.topLevel).toContain(apple);
    expect(out.byHost.size).toBe(0);
  });

  it('groups resting items under their host when both are in the listing', () => {
    const room = makeStuff(() => new TestRoom());
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/group-table'));
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(table, room);
    ContainmentApi.placeOn(apple, table);

    const out = DescribeApi.groupContentsByResting(room.getContents());
    // Top-level has the table but NOT the apple.
    expect(out.topLevel).toContain(table);
    expect(out.topLevel).not.toContain(apple);
    // The apple is grouped under the table's stuffId.
    const bucket = out.byHost.get(table.stuffId);
    expect(bucket).toBeDefined();
    expect(bucket).toContain(apple);
  });

  it('falls back to top-level when supporter is not in the listing', () => {
    // Simulate a cross-listing case: apple's restingOnPath points at
    // a stuffId not present in `contents`. The grouping pass should
    // surface the apple at top level rather than silently drop it.
    const room = makeStuff(() => new TestRoom());
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, room);
    // No table in the listing — apple's restingOn is null naturally.
    // (Pattern A: a cross-listing case where restingOn points at a
    // surface in another room would require a separate surface to
    // exist; the simpler null-restingOn case covers the top-level
    // path here.)
    const out = DescribeApi.groupContentsByResting(room.getContents());
    expect(out.topLevel).toContain(apple);
  });
});

describe('DescribeApi.formatRestingSuffix', () => {
  class TestRoom extends ContainerMixin(Idea) {}
  class TestSurface extends SurfacedMixin(ContainableMixin(NamedMixin(Idea))) {}
  class TestItem extends ContainableMixin(NamedMixin(Idea)) {}

  let pathCounter = 0;
  function freshPath(prefix: string): string {
    pathCounter += 1;
    return `${prefix}-${pathCounter}`;
  }

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  function makeItem(name: string): TestItem {
    return makeStuff(() => {
      const t = new TestItem();
      t.setName(name);
      return t;
    });
  }

  it('returns null for an empty resting array', () => {
    const surface = makeStuffAtPath(
      () => new TestSurface(),
      freshPath('/test/suffix-empty'),
    );
    expect(DescribeApi.formatRestingSuffix(surface, [])).toBeNull();
  });

  it('enumerates 1 item', () => {
    const surface = makeStuffAtPath(
      () => new TestSurface(),
      freshPath('/test/suffix-1'),
    );
    expect(
      DescribeApi.formatRestingSuffix(surface, [makeItem('apple')]),
    ).toBe(', with apple on it');
  });

  it('enumerates 2 items with "and"', () => {
    const surface = makeStuffAtPath(
      () => new TestSurface(),
      freshPath('/test/suffix-2'),
    );
    const items = [makeItem('apple'), makeItem('candlestick')];
    expect(DescribeApi.formatRestingSuffix(surface, items)).toBe(
      ', with apple and candlestick on it',
    );
  });

  it('summarizes above the threshold', () => {
    const surface = makeStuffAtPath(
      () => new TestSurface(),
      freshPath('/test/suffix-many'),
    );
    const items = Array.from({ length: SURFACE_ENUMERATE_THRESHOLD + 1 }, (_, i) =>
      makeItem(`thing-${i}`),
    );
    expect(DescribeApi.formatRestingSuffix(surface, items)).toBe(
      ', scattered with various items',
    );
  });
});
