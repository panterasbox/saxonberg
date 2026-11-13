/**
 * Materials, stood in for a suite (load-on-use W8).
 *
 * A running world loads a material with what cites it — a body plan's
 * tissues, a deposit's mineral — and every sync read of a cited material
 * throws when it is cold. A suite that builds the citer by hand stands the
 * cited materials in: BLANK (no figures authored), which is what such a
 * suite read before, when the cold read answered nothing; or tagged, where
 * the suite's reader asks a tag (a bone is `bone`).
 */

import Material from '../Material';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** Stand a material at each path (blank, or with `tags`), unless one is live. */
export function standMaterials(paths: Record<string, string[]> | string[]): void {
  const entries = Array.isArray(paths) ? paths.map((p) => [p, [] as string[]] as const) : Object.entries(paths);
  for (const [path, tags] of entries) {
    if (StuffApi.findByTemplatePath(path)) continue;
    const m = makeStuffAtPath(() => new Material(), path);
    if (tags.length > 0) m.setTags([...tags]);
  }
}

/** The tissue materials the test body plans cite — `bone` tagged as the shipped row is. */
export const TEST_TISSUES: Record<string, string[]> = {
  '/stuff/idea/material/tissue/flesh': ['tissue'],
  '/stuff/idea/material/tissue/bone': ['tissue', 'bone'],
  '/stuff/idea/material/tissue/muscle': ['tissue'],
};
