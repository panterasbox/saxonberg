/**
 * Phase E — char-gen landing repoint. The avatar seed spawns via the
 * lounge Warren (`startLocation`), while the evacuation fallback constant
 * stays the lobby (a real Container). The two are separate concerns.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import LoungeWarren from '../LoungeWarren';
import { DEFAULT_STARTING_LOCATION_PATH } from '../../../config/constants';

function readSeed(): { data: Record<string, unknown> } {
  const path = fileURLToPath(
    new URL('../../../seeds/obj/Avatar/seed.yaml', import.meta.url),
  );
  return YAML.parse(readFileSync(path, 'utf-8'));
}

describe('avatar seed landing repoint', () => {
  it('spawns via the lounge Warren and drops the old container default (AC 7)', () => {
    const seed = readSeed();
    expect(seed.data.startLocation).toBe(LoungeWarren.WARREN_PATH);
    expect('container' in seed.data).toBe(false);
  });

  it('leaves the evacuation fallback constant as the lobby (the ★ regression guard)', () => {
    // The constant is the container-typed evac fallback, NOT the spawn
    // pointer. Repointing it to the (non-Container) Warren would destruct
    // stranded players in Container.cleanupOnDestruct.
    expect(DEFAULT_STARTING_LOCATION_PATH).toBe(
      '/domain/eternal/duncan-hall/lobby',
    );
    expect(DEFAULT_STARTING_LOCATION_PATH).not.toBe(LoungeWarren.WARREN_PATH);
  });
});
