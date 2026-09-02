/**
 * ⭐⭐⭐ **An id is a plain word.**
 *
 * `SecurityApi.uuid` is the project-wide id source, and its alphabet is
 * base58 — the digits and letters, minus `-`, `_`, and the four a human
 * cannot tell apart (`0`/`O`, `I`/`l`).
 *
 * ⚠⚠ It was not always. `nanoid`'s default alphabet is `A-Za-z0-9_-`,
 * so **one id in sixty-four began with a hyphen** — measured at 1.56% —
 * and a leading `-` means something almost everywhere an id travels. It
 * surfaced through MQL: the disambiguation loop stores `#<stuffId>` as
 * the player's focus, the lexer read `#-Xk3…` as a bare `#` and threw,
 * and about one prompt pick in sixty-four left a focus that could not be
 * re-resolved. It presented as an intermittent full-suite failure that
 * passed every time it was run alone.
 *
 * The lexer was widened AND the alphabet narrowed, and the order of
 * preference is the lesson: **tolerating a bad character at every reader
 * is the wrong shape when you can decline to mint it.** This test guards
 * the mint; `mql.lexer.test.ts` guards the reader.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { SecurityApi } from '../security';

/** Bitcoin/IPFS base58 — the alphabet, spelled out so a change is visible. */
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SAMPLE = 20_000;

describe('the project-wide id alphabet', () => {
  const ids = Array.from({ length: SAMPLE }, () => SecurityApi.uuid());

  it('⭐ every id is base58 — no `-`, no `_`, no 0/O/I/l', () => {
    const legal = new Set(BASE58.split(''));
    const offenders = ids.filter((id) =>
      [...id].some((ch) => !legal.has(ch)),
    );
    // ⚠ Asserted as a COUNT over a real sample, not `> 0` on one id: the
    // bug this replaces occurred 1.56% of the time, which a single draw
    // would have missed 98% of the time.
    expect(ids).toHaveLength(SAMPLE);
    expect(offenders.slice(0, 5)).toEqual([]);
  });

  it('⚠ and none of them STARTS with a character that means something', () => {
    // The original defect, stated as the property that prevents it.
    expect(ids.filter((id) => id.startsWith('-'))).toEqual([]);
    expect(ids.filter((id) => id.startsWith('_'))).toEqual([]);
  });

  it('an id is never all digits, so `#<id>` can never lex as `#<int>`', () => {
    // base58 drops `0`, so a 21-character all-digit id is ~1e-17. This
    // pins the property rather than the probability.
    expect(ids.filter((id) => /^\d+$/.test(id))).toEqual([]);
  });

  it('the size override keeps the alphabet', () => {
    const legal = new Set(BASE58.split(''));
    const short = Array.from({ length: 500 }, () => SecurityApi.uuid(8));
    expect(short.every((id) => id.length === 8)).toBe(true);
    expect(short.filter((id) => [...id].some((c) => !legal.has(c)))).toEqual([]);
  });

  it('⚠ still collision-free at sample size — narrowing the alphabet did not cost that', () => {
    expect(new Set(ids).size).toBe(SAMPLE);
  });
});
