/**
 * Built-in policy tests.
 *
 * Table-driven where possible. Combinator tests verify short-circuit
 * semantics. Stub `ApiOnly` is exercised against the Stage-1 heuristic
 * (caller's constructor name ends in `Api`).
 */

import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';

class FooBar {}

describe('SecurityPolicies', () => {
  describe('Public', () => {
    it('lets any caller through', () => {
      expect(SecurityPolicies.Public.allows(null, null, 'm')).toBe(true);
      expect(SecurityPolicies.Public.allows(new FooBar(), null, 'm')).toBe(true);
    });
  });

  describe('SystemRoot', () => {
    it('allows null caller only', () => {
      expect(SecurityPolicies.SystemRoot.allows(null, null, 'm')).toBe(true);
      expect(SecurityPolicies.SystemRoot.allows(new FooBar(), null, 'm')).toBe(false);
    });
  });

  describe('SelfOnly', () => {
    it('allows when caller === target', () => {
      const t = {};
      expect(SecurityPolicies.SelfOnly.allows(t, t, 'm')).toBe(true);
      expect(SecurityPolicies.SelfOnly.allows({}, t, 'm')).toBe(false);
      expect(SecurityPolicies.SelfOnly.allows(null, t, 'm')).toBe(false);
    });
  });

  describe('ApiOnly (Stage-2 — real, FromModule-backed)', () => {
    // Detailed coverage lives in ModuleApi.test.ts and
    // FromModule.test.ts; here we just confirm null / unstamped
    // callers fail closed.
    it('denies null caller (no module-id)', () => {
      expect(SecurityPolicies.ApiOnly.allows(null, null, 'destroy')).toBe(false);
    });

    it('denies a caller with no stamped module-id', () => {
      // FooBar has no transform-applied stamp, so its module-id is
      // null. Identity-keyed policies fail closed.
      expect(SecurityPolicies.ApiOnly.allows(new FooBar(), null, 'destroy')).toBe(false);
    });
  });

  describe('Custom', () => {
    it('runs the predicate', () => {
      const p = SecurityPolicies.Custom((c) => c === 'allowed');
      expect(p.allows('allowed', null, 'm')).toBe(true);
      expect(p.allows('denied', null, 'm')).toBe(false);
    });
  });

  describe('AllOf', () => {
    it('requires every policy to allow', () => {
      const p = SecurityPolicies.AllOf(
        SecurityPolicies.Public,
        SecurityPolicies.SystemRoot
      );
      expect(p.allows(null, null, 'm')).toBe(true);
      expect(p.allows(new FooBar(), null, 'm')).toBe(false);
    });
  });

  describe('AnyOf', () => {
    it('passes if any policy allows', () => {
      const p = SecurityPolicies.AnyOf(
        SecurityPolicies.SelfOnly,
        SecurityPolicies.SystemRoot
      );
      expect(p.allows(null, null, 'm')).toBe(true);
      const t = {};
      expect(p.allows(t, t, 'm')).toBe(true);
      expect(p.allows({}, t, 'm')).toBe(false);
    });
  });

  describe('Not', () => {
    it('inverts', () => {
      const p = SecurityPolicies.Not(SecurityPolicies.Public);
      expect(p.allows(null, null, 'm')).toBe(false);
    });
  });

  describe('FromTemplate / FromModule (Stage-2 — real)', () => {
    // Detailed glob behaviour lives in PathPatternApi.test.ts;
    // module-id stamping in ModuleApi.test.ts. Here we just
    // assert the fail-closed contract for null callers.
    it('FromTemplate denies null caller', () => {
      expect(SecurityPolicies.FromTemplate('/x/**').allows(null, null, 'm')).toBe(false);
    });

    it('FromModule denies null caller', () => {
      expect(SecurityPolicies.FromModule('/api/**').allows(null, null, 'm')).toBe(false);
    });
  });
});
