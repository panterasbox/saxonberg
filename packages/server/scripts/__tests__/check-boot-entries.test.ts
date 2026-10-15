/**
 * check-boot-entries — the ratchet's INVARIANT and a POSITIVE fixture:
 * a content entry booted for a live-read reason is found, and one kept for
 * the unobserved economy is not. ⭐ Asserts the invariant, never the
 * number — the ceiling falls as the sweep unboots the realm.
 */
import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BOOT_ENTRY_CEILING,
  UNCITED_CONTENT_CEILING,
  CENSUS_AT_LANDING,
  bootEntries,
  check,
} from '../check-boot-entries';

describe('the ratchet', () => {
  it('⭐ holds ceilings that may fall and may never rise', () => {
    expect(BOOT_ENTRY_CEILING).toBeLessThanOrEqual(CENSUS_AT_LANDING.entries);
    expect(UNCITED_CONTENT_CEILING).toBeLessThanOrEqual(CENSUS_AT_LANDING.uncited);
    expect(UNCITED_CONTENT_CEILING).toBeGreaterThanOrEqual(0);
  });

  it('⭐ the total stays ABOVE zero — the engine has wardens', () => {
    expect(BOOT_ENTRY_CEILING).toBeGreaterThan(0);
  });

  it('the shipped roster passes', () => {
    expect(check(bootEntries()).problems).toEqual([]);
  });
});

describe('a positive fixture', () => {
  const dir = mkdtempSync(join(tmpdir(), 'boot-entries-'));
  mkdirSync(join(dir, 'p'));
  writeFileSync(
    join(dir, 'p', 'pack.yaml'),
    [
      'boot:',
      '  - { template: /platform/idea/Warden, role: producer, reason: "arms the sweep" }',
      '  - { template: /trade/x/idea/business, role: sync-read, reason: "advertises live" }',
      '  - { template: /trade/x/idea/mill, role: producer, reason: "hands run consigns (unobserved-economy-slate)" }',
      '  - { template: /stuff/idea/nothing, role: producer }',
    ].join('\n'),
  );
  const entries = bootEntries(dir);

  it('finds the content entry booted for a live read, and only it', () => {
    const r = check(entries, { total: 10, uncited: 0 });
    expect(r.uncited.map((e) => e.template)).toEqual(['/trade/x/idea/business']);
    expect(r.problems.some((p) => p.startsWith('(c)'))).toBe(true);
  });

  it('refuses an entry with no reason', () => {
    const r = check(entries, { total: 10, uncited: 1 });
    expect(r.problems).toEqual(['(b) p: \'/stuff/idea/nothing\' has no reason']);
  });

  it('refuses a rise in the total', () => {
    expect(check(entries, { total: 3, uncited: 1 }).problems.some((p) => p.startsWith('(a)'))).toBe(true);
  });
});
