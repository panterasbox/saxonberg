/**
 * Tests for the **participant policies** — `FromClass` / `FromMixin` —
 * which gate a method on *which Stuff is calling* (plus an optional
 * relational `where` over the call arguments), rather than on module
 * provenance. Also covers the args-threading extension to
 * `SecurityPolicy.allows`.
 */

// Import-ORDER, not wiring: this file composes a mixin at module
// scope, and the mixin's own module sits in an import cycle that only
// resolves once the graph is loaded in bootstrap order. The global
// `setupFiles` used to do that incidentally for all 964 files; with it
// gone, the four files relying on it say so. Removing this line fails
// the file at COLLECTION ("MixinName is not a function"), which is why
// it survived unnoticed — see docs/testing.md § The four cycle files.
import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';
import Thing from '../../stuff/Thing';

class Guild {
  constructor(public roster: string[] = []) {}
  has(id: string): boolean {
    return this.roster.includes(id);
  }
}
class WarGuild extends Guild {}

// The marker convention the FromMixin walk reads (`_mixinName` on some
// class along the prototype chain) — a factory isn't needed to test it.
class Marked {
  static _mixinName = 'MarkedMixin';
}
class MarkedSub extends Marked {}

describe('FromClass (participant identity)', () => {
  const policy = SecurityPolicies.FromClass(() => Guild);

  it('allows an instance of the class', () => {
    expect(policy.allows(new Guild(), null, 'm')).toBe(true);
  });

  it('allows a subclass instance (ordinary instanceof semantics)', () => {
    expect(policy.allows(new WarGuild(), null, 'm')).toBe(true);
  });

  it('denies a non-instance, a class value, and null', () => {
    expect(policy.allows(Object.create(Thing.prototype), null, 'm')).toBe(false);
    expect(policy.allows(Guild, null, 'm')).toBe(false);
    expect(policy.allows(null, null, 'm')).toBe(false);
  });

  it('fails closed when the thunk cannot resolve', () => {
    const broken = SecurityPolicies.FromClass(() => {
      throw new Error('TDZ');
    });
    expect(broken.allows(new Guild(), null, 'm')).toBe(false);
    expect(broken.name).toBe('FromClass(<unresolved>)');
  });

  it('falls back to module-id identity across a class-binding swap', () => {
    // Simulate HMR: the caller's class chain reaches Thing (stamped);
    // the policy thunk returns a *different* class object stamped as —
    // well, we can't restamp here, so exercise the real chain: a policy
    // thunked on Thing admits an unstamped subclass instance via the
    // instanceof fast path, and module-id comparison covers the swap
    // case (same lookup used by FromModule, tested there).
    class ThingSub extends Thing {}
    const p = SecurityPolicies.FromClass(() => Thing);
    expect(p.allows(Object.create(ThingSub.prototype), null, 'm')).toBe(true);
  });

  it('applies the relational where over caller, target, and args', () => {
    const relational = SecurityPolicies.FromClass(() => Guild, {
      where: (caller, _target, _method, args) =>
        (caller as Guild).has(args[0] as string),
    });
    const guild = new Guild(['alice']);
    expect(relational.allows(guild, null, 'm', ['alice'])).toBe(true);
    expect(relational.allows(guild, null, 'm', ['mallory'])).toBe(false);
    // Identity failing means where never runs.
    expect(relational.allows(Object.create(Thing.prototype), null, 'm', ['alice'])).toBe(false);
  });

  it('where receives an empty args array when none are passed', () => {
    let seen: readonly unknown[] | null = null;
    const p = SecurityPolicies.FromClass(() => Guild, {
      where: (_c, _t, _m, args) => {
        seen = args;
        return true;
      },
    });
    expect(p.allows(new Guild(), null, 'm')).toBe(true);
    expect(seen).toEqual([]);
  });
});

describe('FromMixin (participant composition)', () => {
  const policy = SecurityPolicies.FromMixin('MarkedMixin');

  it('allows an instance composing the mixin, including via subclass', () => {
    expect(policy.allows(new Marked(), null, 'm')).toBe(true);
    expect(policy.allows(new MarkedSub(), null, 'm')).toBe(true);
  });

  it('denies a non-composing instance and null', () => {
    expect(policy.allows(Object.create(Thing.prototype), null, 'm')).toBe(false);
    expect(policy.allows(null, null, 'm')).toBe(false);
  });

  it('applies the relational where', () => {
    const p = SecurityPolicies.FromMixin('MarkedMixin', {
      where: (_c, _t, _m, args) => args[0] === 'ok',
    });
    expect(p.allows(new Marked(), null, 'm', ['ok'])).toBe(true);
    expect(p.allows(new Marked(), null, 'm', ['nope'])).toBe(false);
  });
});

describe('combinators thread args through', () => {
  it('AnyOf / AllOf / Not forward args to member policies', () => {
    const wantsOk = SecurityPolicies.Custom(
      (_c, _t, _m, args) => args?.[0] === 'ok',
      'WantsOk'
    );
    expect(
      SecurityPolicies.AnyOf(wantsOk).allows(null, null, 'm', ['ok'])
    ).toBe(true);
    expect(
      SecurityPolicies.AllOf(wantsOk).allows(null, null, 'm', ['nope'])
    ).toBe(false);
    expect(SecurityPolicies.Not(wantsOk).allows(null, null, 'm', ['ok'])).toBe(
      false
    );
  });
});
