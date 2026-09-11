/**
 * `FromTemplateMethod` — **trust by the calling FUNCTION.**
 *
 * `FromTemplate` says what the caller was cloned from and `FromModule`
 * says what module its class is; neither can say *"…and it is asking
 * from THIS method"*. A logic singleton has dozens of methods, and
 * admitting all of them because one needs the reach is the same shape as
 * admitting a whole module — which is why the registry-wide reads this
 * build gates are gated on a `(template, method)` pair.
 *
 * ⚠⚠ The load-bearing fact, and the one the design took four attempts to
 * get right: **the policy runs BEFORE the callee's frame is pushed**, so
 * at decision time the top frame is the *caller's own*. Everything below
 * is a consequence of that — including the two cases that can never
 * qualify (a synthetic root frame, and a caller running inside somebody
 * else's method) and the one that surprisingly can (a free function,
 * which runs AS whoever called it).
 *
 * These tests drive the real dispatch machinery rather than calling
 * `allows()` with a hand-built stack: the whole claim is about where the
 * gate sits relative to the frame push, and a synthetic stack would
 * assume the thing under test.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CallSecurity } from '../decorators';
import { SecurityPolicies } from '../SecurityPolicies';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ModuleApi } from '../../../api/module';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from './test-setup';

const VAULT = '/test/security/vault';
const HOLDER = '/test/security/holder';
const OTHER = '/test/security/other';
const OUTSIDE = '/test/elsewhere/holder';

/** The privileged surface, with one policy variant per method. */
class Vault extends Idea {
  /** Exactly `knock`, on exactly the holder template. */
  @CallSecurity(SecurityPolicies.FromTemplateMethod(HOLDER, 'knock'))
  public open(): string {
    return 'open';
  }

  /** `knock` on any template under the branch — the inherited-method case. */
  @CallSecurity(
    SecurityPolicies.FromTemplateMethod('/test/security/*', 'knock'),
  )
  public openByGlob(): string {
    return 'glob';
  }

  /** The module term as a disambiguator. */
  @CallSecurity(
    SecurityPolicies.FromTemplateMethod(HOLDER, 'knock', {
      module: '/test/stamped/**',
    }),
  )
  public openWithModule(): string {
    return 'module';
  }
}

/**
 * A free function. It has no dispatched frame of its own, so it runs as
 * whichever method called it — which is the point of the test below.
 */
function knockIndirectly(vault: Vault): string {
  return vault.open();
}

/** The admitted caller: one method named `knock`, and a sibling that is not. */
class Holder extends Idea {
  public vault: Vault | null = null;
  public knock(): string {
    return this.vault!.open();
  }
  public sneak(): string {
    return this.vault!.open();
  }
}

/** Reaches the same surface, but through a helper. */
class IndirectHolder extends Idea {
  public vault: Vault | null = null;
  public knock(): string {
    return knockIndirectly(this.vault!);
  }
}

/** A DIFFERENT template with the same method name. */
class OtherHolder extends Idea {
  public vault: Vault | null = null;
  public knock(): string {
    return this.vault!.open();
  }
  public knockGlob(): string {
    return this.vault!.openByGlob();
  }
}

/** Its `knock` reaches the GLOB-gated surface. */
class GlobHolder extends Idea {
  public vault: Vault | null = null;
  public knock(): string {
    return this.vault!.openByGlob();
  }
}

/** The module-disambiguated caller. */
class StampedHolder extends Idea {
  public vault: Vault | null = null;
  public knock(): string {
    return this.vault!.openWithModule();
  }
}

let vault: Vault;
let holder: Holder;

beforeEach(() => {
  StuffApi.clearAll();
  vault = makeStuffAtPath(() => new Vault(), VAULT);
  holder = makeStuffAtPath(() => new Holder(), HOLDER);
  holder.vault = vault;
});

afterEach(() => {
  ModuleApi._forgetForTest(StampedHolder);
});

describe('FromTemplateMethod', () => {
  it('admits the named method of the named template', () => {
    expect(holder.knock()).toBe('open');
  });

  it('refuses a SIBLING method on the very same object', () => {
    // The whole point: the object is trusted for one thing, not for
    // everything it can do. `FromTemplate` alone cannot express this.
    expect(() => holder.sneak()).toThrow();
  });

  it('refuses the right method name on the wrong template', () => {
    const other = makeStuffAtPath(() => new OtherHolder(), OTHER);
    other.vault = vault;
    expect(() => other.knock()).toThrow();
  });

  it('⭐ admits a free function called FROM the admitted method', () => {
    // A helper with no dispatched frame runs as its caller. This is what
    // lets a logic singleton keep its work in module-private functions —
    // and it is the same rule that makes a brain's `act()` unqualifiable,
    // because a brain runs inside the NPC's behaviour tick.
    const indirect = makeStuffAtPath(() => new IndirectHolder(), HOLDER);
    indirect.vault = vault;
    expect(indirect.knock()).toBe('open');
  });

  it('refuses a caller with no template identity at all', () => {
    const anonymous = { knock: () => vault.open() };
    expect(() => anonymous.knock()).toThrow();
  });

  it('⚠ refuses everything under a synthetic ROOT frame', () => {
    // A scheduled callback and a network-boundary handler both run on a
    // root frame, whose `method` is a LABEL rather than a function
    // anybody declared — so a name collision with the label must not
    // admit anyone. This is why the residency spawn sweep re-enters
    // through its own Api instead of calling the free function.
    expect(() =>
      ExecutionContextApi.runRoot(null, 'knock', () => vault.open()),
    ).toThrow();
  });

  it('matches a template GLOB — one method inherited across a family', () => {
    // `/test/security/*` covers the sibling template …
    const sibling = makeStuffAtPath(() => new GlobHolder(), OTHER);
    sibling.vault = vault;
    expect(sibling.knock()).toBe('glob');
    // … but the METHOD name still has to match, glob or no glob.
    const other = makeStuffAtPath(() => new OtherHolder(), OTHER);
    other.vault = vault;
    expect(() => other.knockGlob()).toThrow();
    // … and a template outside the branch is refused.
    const outside = makeStuffAtPath(() => new GlobHolder(), OUTSIDE);
    outside.vault = vault;
    expect(() => outside.knock()).toThrow();
  });

  it('accepts a matching module disambiguator', () => {
    // ⚠ Test modules are not plugin-stamped, so the stamp is applied
    // here explicitly — a real caller gets it from the build.
    ModuleApi._stampForTest(StampedHolder, '/test/stamped/Holder');
    const stamped = makeStuffAtPath(() => new StampedHolder(), HOLDER);
    stamped.vault = vault;
    expect(stamped.knock()).toBe('module');
  });

  it('fails closed when the module term does not match', () => {
    ModuleApi._stampForTest(StampedHolder, '/test/somewhere/else/Holder');
    const stamped = makeStuffAtPath(() => new StampedHolder(), HOLDER);
    stamped.vault = vault;
    expect(() => stamped.knock()).toThrow();
  });

  it('fails closed when the caller carries no module stamp at all', () => {
    // Template and method both match; only the disambiguator is missing.
    const stamped = makeStuffAtPath(() => new StampedHolder(), HOLDER);
    stamped.vault = vault;
    expect(() => stamped.knock()).toThrow();
  });
});

describe('FromTemplateMethod on a static method', () => {
  /** The static-wrapper dispatch path, which pushes its frame the same way. */
  class Gate {
    @CallSecurity(SecurityPolicies.FromTemplateMethod(HOLDER, 'knock'))
    public static enter(): string {
      return 'entered';
    }
  }

  class StaticHolder extends Idea {
    public knock(): string {
      return Gate.enter();
    }
    public sneak(): string {
      return Gate.enter();
    }
  }

  it('admits and refuses on the same terms as the instance gate', () => {
    const h = makeStuffAtPath(() => new StaticHolder(), HOLDER);
    expect(h.knock()).toBe('entered');
    expect(() => h.sneak()).toThrow();
  });
});
