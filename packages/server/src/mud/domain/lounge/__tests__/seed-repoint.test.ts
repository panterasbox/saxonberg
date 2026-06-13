/**
 * Char-gen landing repoint, post app-settings. The new-player spawn is no
 * longer a seed-YAML literal or a code constant: it's the
 * `defaultStartLocation` app setting (default the lounge Warren), stamped
 * into each avatar at mint time. The `evacuationFallback` app setting
 * (default `/domain/void`) is the separate, container-typed evac target.
 * The two remain distinct concerns — the ★ regression guard below ensures
 * evac never points at the non-Container Warren.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import LoungeWarren from '../LoungeWarren';
import { AppSettingKeys, AppSettingDefaults } from '../../../lib/config/keys';

function readSeed(): { data: Record<string, unknown> } {
  const path = fileURLToPath(
    new URL('../../../seeds/obj/Avatar/seed.yaml', import.meta.url),
  );
  return YAML.parse(readFileSync(path, 'utf-8'));
}

describe('avatar seed landing repoint', () => {
  it('no longer carries a spawn literal in the seed (injected at mint)', () => {
    const seed = readSeed();
    expect('startLocation' in seed.data).toBe(false);
    expect('container' in seed.data).toBe(false);
  });

  it('seeds the lounge Warren as the default spawn', () => {
    expect(AppSettingDefaults[AppSettingKeys.defaultStartLocation]).toBe(
      LoungeWarren.WARREN_PATH,
    );
  });

  it('keeps the evacuation fallback the void, NOT the Warren (the ★ regression guard)', () => {
    // The evac fallback must resolve to a live Container — the void is the
    // bootstrap-pinned, destruct-refusing one. Repointing it at the
    // (non-Container) Warren would destruct stranded players in
    // Container.cleanupOnDestruct.
    expect(AppSettingDefaults[AppSettingKeys.evacuationFallback]).toBe(
      '/domain/void',
    );
    expect(AppSettingDefaults[AppSettingKeys.evacuationFallback]).not.toBe(
      LoungeWarren.WARREN_PATH,
    );
  });
});
