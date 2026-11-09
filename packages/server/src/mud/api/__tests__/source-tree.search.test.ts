/**
 * `SourceTreeApi.search` (controller-liquidity W3, C86): the limits are the
 * search's own — an unsafe pattern is refused before it runs, and the walk
 * stops at a match cap, a byte budget or a deadline, saying which.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceTreeApi } from '../source-tree';

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cliq-search-'));
  writeFileSync(join(dir, 'a.txt'), 'oak\nash\noak again\n');
  mkdirSync(join(dir, 'sub'));
  writeFileSync(join(dir, 'sub', 'b.txt'), 'deep oak\n');
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('SourceTreeApi.search', () => {
  it('finds lines one level down, and the subtree with recursive', async () => {
    const flat = await SourceTreeApi.search(dir, 'oak');
    expect(flat.ok && flat.matches.map((m) => m.line)).toEqual([1, 3]);
    const deep = await SourceTreeApi.search(dir, 'oak', { recursive: true });
    expect(deep.ok && deep.matches).toHaveLength(3);
    expect(deep.ok && deep.truncated).toBeNull();
  });

  it('stops at the match cap and says so', async () => {
    const r = await SourceTreeApi.search(dir, 'oak', { recursive: true, maxMatches: 1 });
    expect(r).toMatchObject({ ok: true, truncated: 'matches' });
    expect(r.ok && r.matches).toHaveLength(1);
  });

  it('stops at the byte budget and says so', async () => {
    const r = await SourceTreeApi.search(dir, 'oak', { recursive: true, maxBytes: 4 });
    expect(r).toMatchObject({ ok: true, truncated: 'bytes' });
  });

  it.each(['(a+)+$', '(.*)*x', '(x|y+){2,}', '(a)\\1'])(
    'refuses %s before it runs (catastrophic backtracking)',
    async (p) => {
      expect(await SourceTreeApi.search(dir, p)).toMatchObject({ ok: false, reason: 'unsafe-pattern' });
    },
  );

  it('refuses an invalid pattern, naming it', async () => {
    expect(SourceTreeApi.compilePattern('(')).toMatchObject({ ok: false, reason: 'bad-pattern' });
  });

  it('admits an ordinary pattern', () => {
    const r = SourceTreeApi.compilePattern('o[ak]+', true);
    expect(r.ok && r.regex.test('OAK')).toBe(true);
  });
});
