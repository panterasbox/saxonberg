/**
 * Misprint — the seeded errors of a hand at type or a pen (paper D17).
 *
 * ⭐ Seeded, never drawn (docs/uncertainty.md: the error is the actor's
 * competence, resolved from who set it and what — epistemic provenance, not
 * a roll on the act). The same compositor setting the same text from the
 * same case makes the same mistakes; a proofreader finds the same share.
 * A value object: what it decides is a function of its salt.
 */

/** The letters a compositor confuses — the turned and the neighbouring sorts. */
const CONFUSED: Readonly<Record<string, string>> = {
  b: 'd', d: 'b', p: 'q', q: 'p', n: 'u', u: 'n', e: 'c', c: 'e', i: 'l', l: 'i', m: 'n', h: 'b',
  a: 'o', o: 'a', s: 'z', t: 'f', f: 't', r: 'n', g: 'q', v: 'y', y: 'v', w: 'v', k: 'h', j: 'i', x: 'z', z: 's',
};

export class Misprint {
  constructor(private readonly salt: string) {}

  /** A stable 32-bit hash of `salt + key` (FNV-1a). */
  private hash(key: string): number {
    let h = 0x811c9dc5;
    const s = `${this.salt}|${key}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /**
   * Set `text` with `ceil(letters × rate)` turned sorts at seeded positions.
   * Returns the text as set and where the errors are.
   */
  public corrupt(text: string, rate: number): { text: string; at: number[] } {
    const letters: number[] = [];
    for (let i = 0; i < text.length; i++) if (/[a-z]/i.test(text[i]!)) letters.push(i);
    const n = rate > 0 && letters.length > 0 ? Math.min(letters.length, Math.ceil(letters.length * rate)) : 0;
    const at = new Set<number>();
    for (let k = 0; at.size < n && k < n * 8; k++) {
      at.add(letters[this.hash(`pos:${k}`) % letters.length]!);
    }
    const chars = text.split('');
    for (const i of at) {
      const c = chars[i]!;
      const lower = c.toLowerCase();
      const swap = CONFUSED[lower] ?? lower;
      chars[i] = c === lower ? swap : swap.toUpperCase();
    }
    return { text: chars.join(''), at: [...at].sort((a, b) => a - b) };
  }

  /** Which of the errors at `at` a proof catches: a seeded `share` of them. */
  public find(at: readonly number[], share: number): number[] {
    return at.filter((i) => this.hash(`proof:${i}`) / 0xffffffff < share);
  }
}
