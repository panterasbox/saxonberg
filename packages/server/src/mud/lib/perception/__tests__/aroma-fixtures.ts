/**
 * Stand aroma words up where the nose reads them from, with no document store
 * behind them. `parents` gives the tree, root first; each parent is stood up too.
 */

import { Aroma, type HedonicCurve } from '../Aroma';

export interface AromaFixture {
  word: string;
  threshold?: number;
  parents?: string[];
  discipline?: string;
  liking?: HedonicCurve;
}

export function installAromas(rows: readonly (AromaFixture | string)[]): void {
  for (const raw of rows) {
    const row = typeof raw === 'string' ? { word: raw } : raw;
    let parent: Aroma | null = null;
    for (const word of row.parents ?? []) {
      parent = Aroma.resolveKnown(word) ?? Aroma.remember(word, {}, parent);
    }
    Aroma.remember(
      row.word,
      { threshold: row.threshold, discipline: row.discipline, liking: row.liking },
      parent,
    );
  }
}
