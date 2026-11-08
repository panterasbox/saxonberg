/**
 * Stand aromas up where the nose reads them from, with no document store behind
 * them. A fixture names an aroma by its WORD for readability and it is stood up
 * at the commons path that word would have (`aromaPath`), which is the identity
 * everything else reads. `parents` gives the tree, root first; each parent is
 * stood up too.
 */

import { Aroma, type HedonicCurve } from '../Aroma';

export interface AromaFixture {
  word: string;
  threshold?: number;
  parents?: string[];
  discipline?: string;
  liking?: HedonicCurve;
}

/** The commons path a fixture word stands for: `smoke` → `/base-library/aromas/smoke`. */
export function aromaPath(word: string): string {
  return `/base-library/aromas/${word}`;
}

export function installAromas(rows: readonly (AromaFixture | string)[]): void {
  for (const raw of rows) {
    const row = typeof raw === 'string' ? { word: raw } : raw;
    let parent: Aroma | null = null;
    for (const word of row.parents ?? []) {
      parent = Aroma.resolveKnown(aromaPath(word)) ?? Aroma.remember(aromaPath(word), {}, parent);
    }
    Aroma.remember(
      aromaPath(row.word),
      { threshold: row.threshold, discipline: row.discipline, liking: row.liking },
      parent,
    );
  }
}
