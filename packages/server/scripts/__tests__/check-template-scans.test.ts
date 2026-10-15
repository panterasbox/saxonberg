/**
 * check-template-scans — the ratchet's INVARIANT and a POSITIVE fixture:
 * a search outside a sanctioned home is found, prose naming one is not,
 * and an allowance above what a file holds is stale.
 */
import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ALLOWLIST,
  CENSUS_AT_LANDING,
  TEMPLATE_SCAN_CEILING,
  sitesIn,
  check,
} from '../check-template-scans';

describe('the ratchet', () => {
  it('⭐ the ceiling may fall and never rise', () => {
    expect(TEMPLATE_SCAN_CEILING).toBeLessThanOrEqual(CENSUS_AT_LANDING);
    expect(TEMPLATE_SCAN_CEILING).toBeGreaterThan(0);
  });

  it('every allowance carries a reason', () => {
    for (const e of ALLOWLIST) expect(e.reason.length).toBeGreaterThan(0);
  });
});

describe('a positive fixture', () => {
  const dir = mkdtempSync(join(tmpdir(), 'template-scans-'));
  const file = join(dir, 'Asker.ts');
  writeFileSync(
    file,
    [
      '// Template.findByClass(X) in prose is not a search',
      '/** nor is Template.findDescendants("/") in a docblock */',
      'const rows = await Template.findWhereDataHas("operatingLocations");',
      'const more = await Template.findByClass<Business>(BUSINESS);',
      'const one = await Template.findByPath("/exact");',
    ].join('\n'),
  );

  it('counts the two searches and not the prose or the exact read', () => {
    const sites = sitesIn([file], dir);
    expect(sites.map((s) => s.method)).toEqual(['findWhereDataHas', 'findByClass']);
  });

  it('refuses a search outside the allowlist', () => {
    const problems = check(sitesIn([file], dir), []);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Asker.ts:3');
  });

  it('refuses a stale allowance', () => {
    const problems = check(sitesIn([file], dir), [{ file: 'Asker.ts', count: 3, reason: 'r' }]);
    expect(problems[0]).toContain('lower the ALLOWLIST entry');
  });
});
