/**
 * ⭐ The closed-vocabulary census, pinned by its INVARIANT and by a
 * positive fixture.
 *
 * Two lessons from `docs/lint-family.md` are load-bearing here and the
 * file is shaped around them:
 *
 *   - **lesson 2 — a ratchet's test asserts the INVARIANT, not the
 *     number.** `check-lib-statics.test.ts` once asserted
 *     `expect(CEILING).toBe(392)` under the title *"holds a ceiling that
 *     may fall and may never rise"*, so the one thing a ratchet exists to
 *     permit was a failing test. Nothing below names today's count.
 *   - **lesson 3 — a gate that has never been seen to fail is
 *     indistinguishable from one that cannot report.** So the detector is
 *     proved on a fixture that MUST be caught and one that must not,
 *     rather than only on a clean tree.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  scan,
  decomment,
  CLOSED_BY_DESIGN,
  CLOSED_VOCABULARY_CEILING,
} from '../check-closed-vocabularies';

/** A throwaway source tree the scanner can walk. */
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'closed-vocab-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body, 'utf8');
  }
  return root + '/';
}

describe('the ratchet invariant', () => {
  it('holds a ceiling that may fall and may never rise', () => {
    // ⚠ The INVARIANT: the live count is at or under the ceiling, and the
    // ceiling is a real budget rather than a disabled gate. Deliberately
    // NOT `toBe(5)` — a lowering must not have to edit this file.
    const counted = scan().filter((v) => !(v.name in CLOSED_BY_DESIGN));
    expect(counted.length).toBeLessThanOrEqual(CLOSED_VOCABULARY_CEILING);
    expect(CLOSED_VOCABULARY_CEILING).toBeGreaterThan(0);
  });

  it('every declared exemption carries a reason that is a claim', () => {
    // ⚠ An exemption with an empty or name-echoing reason is how an
    // allowlist becomes a rubber stamp.
    for (const [name, reason] of Object.entries(CLOSED_BY_DESIGN)) {
      expect(reason.length, name).toBeGreaterThan(60);
      expect(reason.toLowerCase(), name).not.toBe(name.toLowerCase());
    }
  });
});

describe('the detector reads the USE, not the name', () => {
  it('⭐ catches a vocabulary whose membership is refused — the positive', () => {
    const root = fixture({
      'lib/x/Textures.ts': `
export const TEXTURES: readonly string[] = ['smooth', 'coarse', 'waxy'];
export function setTexture(t: string): void {
  if (!TEXTURES.includes(t)) throw new RangeError('not a texture');
}
`,
    });
    try {
      expect(scan(root).map((v) => v.name)).toContain('TEXTURES');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('⭐ catches one walked with a FOR LOOP, not just `.includes`', () => {
    // ⚠⚠ The first draft of this detector missed `AROMAS` itself, because
    // `isAroma` walks the list with a for-of. A gate blind to its own
    // motivating case is lesson 1 all over again.
    const root = fixture({
      'lib/x/Aromas.ts': `
export const SMELLS: readonly { type: string }[] = [{ type: 'smoke' }, { type: 'oak' }];
export function isSmell(t: string): boolean {
  for (const s of SMELLS) if (s.type === t) return true;
  return false;
}
export function demand(t: string): void {
  if (!isSmell(t)) throw new Error('no');
}
`,
    });
    try {
      expect(scan(root).map((v) => v.name)).toContain('SMELLS');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('⚠ does NOT count a list that only iterates ITSELF — the negative', () => {
    // The char-gen `FIELD_ORDER` case: `.filter` over its own members is
    // ordering, not a refusal of anything an author wrote. Counting it
    // would make the census measure documentation rather than injury.
    const root = fixture({
      'lib/x/Order.ts': `
export const FIELD_ORDER: readonly string[] = ['species', 'sex', 'name'];
export function remaining(done: Set<string>): readonly string[] {
  return FIELD_ORDER.filter((f) => !done.has(f));
}
`,
    });
    try {
      expect(scan(root).map((v) => v.name)).not.toContain('FIELD_ORDER');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('⚠ does NOT count a list only DISCUSSED in a comment', () => {
    // Without `decomment`, the best-documented vocabularies would count
    // and the real ones would hide — the census would be inverted.
    const root = fixture({
      'lib/x/Doc.ts': `
/**
 * The colours. A caller that passes an unknown one would throw, if
 * anything validated it — nothing does, and this list is prose-only.
 */
export const COLOURS: readonly string[] = ['red', 'blue'];
`,
    });
    try {
      expect(scan(root).map((v) => v.name)).not.toContain('COLOURS');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignores a one-word list — that is a constant, not a vocabulary', () => {
    const root = fixture({
      'lib/x/One.ts': `
export const CHARTERS: readonly string[] = ['bank'];
export function demand(c: string): void {
  if (!CHARTERS.includes(c)) throw new Error('no');
}
`,
    });
    try {
      expect(scan(root).map((v) => v.name)).not.toContain('CHARTERS');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('decomment', () => {
  it('blanks comments and preserves line numbering', () => {
    const src = 'const a = 1;\n/* two\n   three */\nconst b = 2; // four\n';
    const out = decomment(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out).not.toMatch(/two|three|four/);
    expect(out).toMatch(/const a = 1;/);
    expect(out).toMatch(/const b = 2;/);
  });
});
