import { describe, it, expect } from 'vitest';
import {
  RequiresActive,
  InactiveCapabilityError,
} from '../RequiresActive';

class FakeStuff {
  // Match MixinApi.queryMixins's marker shape so the runtime check
  // sees the mixin "composed."
  static _augmentGated = false;
  static _mixinName = 'FakeMixin';
}

describe('RequiresActive decorator', () => {
  it('throws InactiveCapabilityError when the mixin name is not active', () => {
    class C extends FakeStuff {
      @RequiresActive('NotComposedMixin')
      bang(): string {
        return 'ok';
      }
    }
    const c = new C();
    expect(() => c.bang()).toThrow(InactiveCapabilityError);
  });

  it('runs the body when the mixin is active (un-gated → always active)', () => {
    class C extends FakeStuff {
      @RequiresActive('FakeMixin')
      bang(): string {
        return 'ok';
      }
    }
    // FakeStuff doesn't compose FakeMixin in the canonical mixin
    // sense — but `_mixinName` matches, so the prototype-chain walk
    // in MixinApi.queryMixins picks it up.
    const c = new C();
    expect(c.bang()).toBe('ok');
  });

  it('error carries mixinName + methodName', () => {
    class C extends FakeStuff {
      @RequiresActive('GhostMixin')
      whoosh(): void {
        throw new Error('should not reach');
      }
    }
    const c = new C();
    try {
      c.whoosh();
      throw new Error('unreachable');
    } catch (err) {
      expect(err).toBeInstanceOf(InactiveCapabilityError);
      const e = err as InactiveCapabilityError;
      expect(e.mixinName).toBe('GhostMixin');
      expect(e.methodName).toBe('whoosh');
    }
  });
});
