/**
 * GlobbableMixin tests — substrate-only coverage. Containment ripple,
 * GlobbableApi.split / merge / applyQuantity, and controller
 * integration are exercised in their own test files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Idea } from '../Idea';
import { Stuff } from '../Stuff';
import { Shadow } from '../Shadow';
import { Shadowing } from '../../security/decorators';
import { GlobbableMixin } from '../Globbable';
import { ContainerMixin } from '../../spatial/Container';
import { SingletonMixin } from '../Singleton';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class Coin extends GlobbableMixin(Idea) {
  static _mixinName = 'Coin';
  static persistentFields = ['quantity', 'tarnished', 'denomination'];
  static globIdentityFields = ['tarnished', 'denomination'];

  public tarnished: boolean = false;
  public denomination: 'gold' | 'silver' | 'copper' = 'copper';
}

class Arrow extends GlobbableMixin(Idea) {
  static _mixinName = 'Arrow';
}

describe('GlobbableMixin', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('registers in the mixin registry under Mixins.Globbable', () => {
    const coin = makeStuff(() => new Coin());
    expect(MixinApi.isGlobbable(coin)).toBe(true);
    expect(MixinApi.hasMixin(coin, Mixins.Globbable)).toBe(true);
  });

  it('default quantity is 1', () => {
    const coin = makeStuff(() => new Coin());
    expect(coin.getQuantity()).toBe(1);
  });

  it('setQuantity validates positive integer', () => {
    const coin = makeStuff(() => new Coin());
    coin.setQuantity(5);
    expect(coin.getQuantity()).toBe(5);

    expect(() => coin.setQuantity(0)).toThrow(/positive integer/);
    expect(() => coin.setQuantity(-1)).toThrow(/positive integer/);
    expect(() => coin.setQuantity(1.5)).toThrow(/positive integer/);
    expect(() => coin.setQuantity(Number.NaN)).toThrow(/positive integer/);
  });

  describe('canSplit', () => {
    it('rejects n < 1 and non-integer n', () => {
      const coin = makeStuff(() => new Coin());
      coin.setQuantity(10);
      expect(coin.canSplit(0)).toBe(false);
      expect(coin.canSplit(-1)).toBe(false);
      expect(coin.canSplit(1.5)).toBe(false);
    });

    it('rejects n > current quantity', () => {
      const coin = makeStuff(() => new Coin());
      coin.setQuantity(10);
      expect(coin.canSplit(11)).toBe(false);
    });

    it('accepts 1 <= n <= quantity', () => {
      const coin = makeStuff(() => new Coin());
      coin.setQuantity(10);
      expect(coin.canSplit(1)).toBe(true);
      expect(coin.canSplit(5)).toBe(true);
      expect(coin.canSplit(10)).toBe(true);
    });

    it('rejects when a shadow is attached', () => {
      class TagShadow extends Shadow {
        @Shadowing('getQuantity')
        passthrough(): number {
          return this.callDown<number>();
        }
      }
      const coin = makeStuff(() => new Coin());
      coin.setQuantity(10);
      const sh = makeStuff(() => new TagShadow());
      ShadowApi.attach(coin, sh);
      expect(coin.canSplit(3)).toBe(false);
    });
  });

  describe('canMergeWith', () => {
    it('true for same template + matching identity fields', () => {
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const b = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      a.tarnished = false;
      a.denomination = 'gold';
      b.tarnished = false;
      b.denomination = 'gold';
      expect(a.canMergeWith(b)).toBe(true);
      // Symmetric.
      expect(b.canMergeWith(a)).toBe(true);
    });

    it('false against different template path', () => {
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const b = makeStuffAtPath(() => new Arrow(), '/obj/item/Arrow');
      expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
    });

    it('false when a glob-identity field differs', () => {
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const b = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      a.denomination = 'gold';
      b.denomination = 'silver';
      expect(a.canMergeWith(b)).toBe(false);
    });

    it('false against a non-Globbable peer', () => {
      class Plain extends Idea {}
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const p = makeStuff(() => new Plain());
      expect(a.canMergeWith(p)).toBe(false);
    });

    it('false against self', () => {
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      expect(a.canMergeWith(a)).toBe(false);
    });

    it('false when either side carries a shadow', () => {
      class TagShadow extends Shadow {
        @Shadowing('getQuantity')
        passthrough(): number {
          return this.callDown<number>();
        }
      }
      const a = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const b = makeStuffAtPath(() => new Coin(), '/obj/item/Coin');
      const sh = makeStuff(() => new TagShadow());
      ShadowApi.attach(a, sh);
      expect(a.canMergeWith(b)).toBe(false);
      expect(b.canMergeWith(a)).toBe(false);
    });

    it('false when neither side has a stamped template path', () => {
      // Unstamped globs can't be merged — there's no kind identity.
      const a = makeStuff(() => new Coin());
      const b = makeStuff(() => new Coin());
      expect(a.canMergeWith(b)).toBe(false);
    });
  });

  describe('composition validation at registration', () => {
    it('throws when a class composes both Globbable and Container', () => {
      class BadStack extends GlobbableMixin(ContainerMixin(Idea)) {
        static _mixinName = 'BadStack';
      }
      expect(() => makeStuff(() => new BadStack())).toThrow(
        /globs cannot be containers/
      );
    });

    it('throws when a class composes both Globbable and Singleton (splits collide)', () => {
      class SingletonGlob extends GlobbableMixin(SingletonMixin(Idea)) {
        static _mixinName = 'SingletonGlob';
      }
      expect(() => makeStuff(() => new SingletonGlob())).toThrow(
        /SingletonMixin/
      );
    });

    it('throws when globIdentityFields is not a subset of persistentFields', () => {
      class Misdeclared extends GlobbableMixin(Idea) {
        static _mixinName = 'Misdeclared';
        static persistentFields = ['quantity'];
        static globIdentityFields = ['notPersisted'];
      }
      expect(() => makeStuff(() => new Misdeclared())).toThrow(
        /globIdentityFields entry 'notPersisted' is not in persistentFields/
      );
    });

    it('accepts an empty globIdentityFields default (strict fungibility)', () => {
      // Arrow declares no globIdentityFields and no extra persistentFields;
      // first registration should not throw.
      expect(() => makeStuff(() => new Arrow())).not.toThrow();
    });
  });
});
