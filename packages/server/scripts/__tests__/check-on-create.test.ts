/**
 * check-on-create — the ratchet's invariant, and a POSITIVE fixture for
 * the two things the census must get right: it counts **declarations**,
 * never docstring mentions or call sites, and it classifies a body that
 * loads remembered state.
 *
 * ⭐⭐ **The test asserts the INVARIANT, never the number.** The ceiling
 * falls as the hydration build moves limbs 3 and 4 off the hook; a test
 * that pinned today's figure would fail on the wave that improves it.
 *
 * ⚠ The slate's first census script got the detection wrong in the other
 * direction — it scanned from any MENTION of the name to the next closing
 * brace, so every Api facade that merely described the hook counted. The
 * `docstring mention` case below is that defect, pinned.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ON_CREATE_CEILING,
  ON_CREATE_LOADING_CEILING,
  CENSUS_AT_LANDING,
  LOADING_PREDICATE,
} from '../check-on-create';

describe('the ratchet', () => {
  it('⭐ holds ceilings that may fall and may never rise', () => {
    expect(ON_CREATE_CEILING).toBeLessThanOrEqual(
      CENSUS_AT_LANDING.implementations,
    );
    expect(ON_CREATE_LOADING_CEILING).toBeLessThanOrEqual(
      CENSUS_AT_LANDING.loading,
    );
    expect(ON_CREATE_LOADING_CEILING).toBeGreaterThanOrEqual(0);
  });

  it('⭐ the implementation ceiling stays ABOVE zero on purpose', () => {
    // Limb 1 (structural completion — a Location mints its floor) and
    // limb 2 (a catalogue warms its roster) are legitimate and are not
    // going away. A burn-down to zero here would be a gate refusing a
    // class for being a registry.
    expect(ON_CREATE_CEILING).toBeGreaterThan(0);
  });

  it('⚠ the landing census is a fact about the past — never edit it down', () => {
    expect(CENSUS_AT_LANDING).toEqual({ implementations: 82, loading: 38 });
  });

  it('the loading subset can never exceed the implementations', () => {
    expect(ON_CREATE_LOADING_CEILING).toBeLessThanOrEqual(ON_CREATE_CEILING);
  });
});

describe('the loading predicate', () => {
  it('⭐ trips on a body that reads what the world remembered', () => {
    expect(LOADING_PREDICATE.test('await BeliefDocument.find({ viewerId });')).toBe(true);
    expect(LOADING_PREDICATE.test('await this.hydrateBeliefs();')).toBe(true);
    expect(LOADING_PREDICATE.test('await StuffApi.singleton(path);')).toBe(true);
    expect(LOADING_PREDICATE.test('this.rebuildIndex();')).toBe(true);
  });

  it('⚠ a POSITIVE finding: structural completion does NOT trip it', () => {
    // Limb 1. If this ever starts tripping, the gate's number stops
    // meaning "state that should be on a declared source".
    expect(LOADING_PREDICATE.test('await this.ensureFloor();')).toBe(false);
    expect(LOADING_PREDICATE.test('this._teardownBehaviors();')).toBe(false);
  });
});

describe('the census walker — declarations only', () => {
  // The walker reads the kernel + every pack from disk, so it cannot be
  // pointed at a fixture tree. These assertions exercise the two
  // discriminations its regex makes, against the exact strings the tree
  // contains.
  const DECL =
    /^\s*(?:public\s+|protected\s+|private\s+)?(?:override\s+)?(?:async\s+)?onCreate\s*\(/;

  it('counts every declaration shape the tree actually uses', () => {
    for (const line of [
      '  public async onCreate(context?: unknown): Promise<void> {',
      '  override async onCreate(context?: unknown): Promise<void> {',
      '  async onCreate(_context?: unknown): Promise<void> {',
      '  public onCreate(_context?: unknown): Promise<void> | void {}',
      '      override async onCreate(): Promise<void> {',
    ]) {
      expect(DECL.test(line), line).toBe(true);
    }
  });

  it('⚠⚠ does NOT count a call site or a docstring mention', () => {
    for (const line of [
      '      await super.onCreate(context);',
      '          await proxy.onCreate(context);',
      '   * the clone pipeline invokes `onCreate(context)`, where',
      '// the source’s onCreate verifier ran. Settled exits are',
      '    const sup = (Base.prototype as { onCreate?: () => void }).onCreate;',
    ]) {
      expect(DECL.test(line), line).toBe(false);
    }
  });
});
