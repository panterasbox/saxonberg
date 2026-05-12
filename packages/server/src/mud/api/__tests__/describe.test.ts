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
import { DescribeApi } from '../describe';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { GlobbableMixin } from '../../lib/stuff/Globbable';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
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
