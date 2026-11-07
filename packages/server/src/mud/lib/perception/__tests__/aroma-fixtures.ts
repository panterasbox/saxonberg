/**
 * Stand aroma rows up where the engine loads them from: by path, the way a
 * material's setter does in play. `parents` gives the tree, root first.
 */

import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import Aroma from '../../../platform/idea/Aroma';
import { TemplatePathPrefixes } from '../../paths';

export interface AromaFixture {
  word: string;
  threshold?: number;
  parents?: string[];
  discipline?: string;
  liking?: { peak: number; width: number; valence: number };
}

export function installAromas(rows: readonly (AromaFixture | string)[]): void {
  for (const raw of rows) {
    const row = typeof raw === 'string' ? { word: raw } : raw;
    makeStuffAtPath(
      () =>
        Object.assign(new Aroma(), {
          threshold: row.threshold ?? 1,
          discipline: row.discipline ?? '',
          liking: row.liking ?? null,
          lineage: [...(row.parents ?? []), row.word],
        }),
      TemplatePathPrefixes.aroma + row.word,
    );
  }
}
