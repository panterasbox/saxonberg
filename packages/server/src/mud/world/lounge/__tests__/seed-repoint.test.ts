/**
 * Char-gen landing repoint, post app-settings. The new-player spawn is no
 * longer a seed-YAML literal or a code constant: it's the
 * `defaultStartLocation` app setting (shipped by the platform pack's settings,
 * default the lounge Warren), stamped into each avatar at mint time. The
 * `evacuationFallback` app setting (default `/world/void`) is the separate,
 * container-typed evac target. The two remain distinct concerns — the ★
 * regression guard ensures evac never points at the non-Container Warren.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import LoungeWarren from '../LoungeWarren';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

function readYaml(rel: string): Record<string, unknown> {
  return YAML.parse(
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8'),
  );
}

function appSettings(): Record<string, string> {
  // The platform pack ships the engine settings (core.yaml); the lounge
  // pack ships the landing (content-packs wave 3: the platform must NOT
  // carry defaultStartLocation — merge-missing means first-merged wins).
  const out: Record<string, string> = {};
  for (const rel of [
    '../../../../../../content/platform/content/settings/core.yaml',
    '../../../../../../content/saxonberg-lounge/content/settings/lounge.yaml',
  ]) {
    const parsed = readYaml(rel) as { settings: Array<{ key: string; value: string }> };
    for (const s of parsed.settings) out[s.key] = s.value;
  }
  return out;
}

describe('avatar seed landing repoint', () => {
  it('no longer carries a spawn literal in the seed (injected at mint)', () => {
    const seed = readYaml('../../../../../../content/platform/content/obj/Avatar/seed.yaml') as {
      data: Record<string, unknown>;
    };
    expect('startLocation' in seed.data).toBe(false);
    expect('container' in seed.data).toBe(false);
  });

  it('seeds the lounge Warren as the default spawn', () => {
    expect(appSettings()[AppSettingKeys.defaultStartLocation]).toBe(
      LoungeWarren.WARREN_PATH,
    );
  });

  it('keeps the evacuation fallback the void, NOT the Warren (the ★ regression guard)', () => {
    // The evac fallback must resolve to a live Container — the void is the
    // bootstrap-pinned, destruct-refusing one. Repointing it at the
    // (non-Container) Warren would destruct stranded players in
    // Container.cleanupOnDestruct.
    expect(appSettings()[AppSettingKeys.evacuationFallback]).toBe('/world/void');
    expect(appSettings()[AppSettingKeys.evacuationFallback]).not.toBe(
      LoungeWarren.WARREN_PATH,
    );
  });
});
