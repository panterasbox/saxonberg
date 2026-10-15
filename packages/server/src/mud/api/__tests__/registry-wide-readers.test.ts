/**
 * RegistryWideReaders — ⭐ the high-water mark on who may enumerate the
 * world's registries (the scan sweep, 2026-10-14).
 *
 * Every pair in the policy is a function trusted to walk a whole mixin
 * bucket. Each is a question asked in the direction opposite to the
 * reference the content authors — *which business operates this room?*,
 * *which branch is this bank's?* — and the sweep flips them so the owner
 * answers. The count may fall and never rise: asserting the INVARIANT,
 * never a figure a later wave improves.
 */
import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** ⭐ The ceiling. Lower it as each pair goes; never raise it. */
const HIGH_WATER = 12;

function pairs(): string[] {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'stuff.ts'),
    'utf8',
  );
  const start = src.indexOf('const RegistryWideReaders = SecurityPolicies.AnyOf(');
  const end = src.indexOf('\n);', start);
  const block = src.slice(start, end);
  return [...block.matchAll(/FromTemplateMethod\(\s*'([^']+)',\s*'([^']+)'/g)].map(
    (m) => `${m[1]}#${m[2]}`,
  );
}

describe('RegistryWideReaders', () => {
  it('⭐ holds at or below its high-water mark', () => {
    const p = pairs();
    expect(p.length).toBeGreaterThan(0);
    expect(p.length).toBeLessThanOrEqual(HIGH_WATER);
  });
});
