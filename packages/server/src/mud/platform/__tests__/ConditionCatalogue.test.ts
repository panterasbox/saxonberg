/**
 * ConditionCatalogue — the self-warming condition roster (the boot()-
 * retirement shape, MaturationProfileCatalogue precedent).
 *
 * ## The bug the warm closes, and why it survived
 *
 * Condition seeds are inserted as template ROWS and **nothing cloned
 * them into Ideas**, so `StuffApi.findByTemplatePath` answered `null`
 * for every condition in a running world. Signs, names, progression and
 * `toxinBehavior` were read off an object that was not there. It failed
 * **silently** (`Metabolic.resolveToxinBehavior` returns `null`; its
 * caller does `if (!behavior) continue`), so a toxin never cleared.
 *
 * ⚠ **And the tests could not have caught it**: every toxin suite
 * hand-constructs its own `Condition` at the path it expects. So the
 * load-bearing test here is the real-seed coverage below, which drives
 * off the seed files on disk. Add a condition seed the warm would not
 * stand up, or rename one out from under a fixture, and it goes red.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import ConditionCatalogue from '../idea/ConditionCatalogue';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { TemplatePathPrefixes } from '../../lib/paths';
import Condition from '../idea/Condition';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const SEEDS_ROOT = join(
  fileURLToPath(new URL('../../../../../content/platform/content/platform/idea/Condition', import.meta.url)),
);

/** Every authored condition seed, as `(templatePath, class)`. */
function authoredConditionSeeds(): { path: string; cls: string }[] {
  const out: { path: string; cls: string }[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}${entry}/`);
      } else if (entry.endsWith('.yaml')) {
        const doc = YAML.parse(readFileSync(full, 'utf-8')) as {
          class?: string;
        };
        out.push({
          path: `${prefix}${entry.replace(/\.yaml$/, '')}`,
          cls: doc?.class ?? '',
        });
      }
    }
  };
  walk(SEEDS_ROOT, TemplatePathPrefixes.condition);
  return out;
}

describe('the roster warm', () => {
  it('postRegister stands up Condition rows and skips folder rows', async () => {
    vi.spyOn(Template, 'findDescendants').mockResolvedValue([
      { path: '/platform/idea/Condition/metabolism', class: '/platform/idea/FolderZone' },
      { path: '/platform/idea/Condition/metabolism/alcohol', class: '/platform/idea/Condition' },
      { path: '/platform/idea/Condition/thermal/hypothermia', class: '/platform/idea/Condition' },
    ] as unknown as Template[]);
    const stood: string[] = [];
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
      stood.push(path);
      return makeStuff(() => new Condition()) as never;
    });

    const catalogue = makeStuff(() => new ConditionCatalogue());
    await catalogue.postRegister();
    expect(stood).toEqual([
      '/platform/idea/Condition/metabolism/alcohol',
      '/platform/idea/Condition/thermal/hypothermia',
    ]);
  });

  it('tolerates one failed standup and continues (the MaterialCatalogue shape)', async () => {
    vi.spyOn(Template, 'findDescendants').mockResolvedValue([
      { path: '/platform/idea/Condition/metabolism/bad', class: '/platform/idea/Condition' },
      { path: '/platform/idea/Condition/metabolism/good', class: '/platform/idea/Condition' },
    ] as unknown as Template[]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
      if (path.endsWith('bad')) throw new Error('boom');
      return makeStuff(() => new Condition()) as never;
    });
    const catalogue = makeStuff(() => new ConditionCatalogue());
    expect(await catalogue.warm()).toBe(1);
  });

  it('the platform pack boots it eagerly, after materials (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/platform/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/platform\/idea\/ConditionCatalogue/);
    expect(src).toMatch(
      /ConditionCatalogue.*dependsOn: \[\/platform\/idea\/MaterialCatalogue\]/,
    );
  });
});

describe('⭐ the real-seed coverage — driven off the seed files, not a mock', () => {
  it('there are seeds to cover', () => {
    expect(authoredConditionSeeds().length).toBeGreaterThan(5);
  });

  it('EVERY authored condition seed is one the warm would stand up', () => {
    // The assertion that would have caught the original bug, and that
    // catches the next condition added under a class the warm filters
    // out.
    const missed = authoredConditionSeeds().filter(
      (s) => s.cls !== '/platform/idea/Condition',
    );
    expect(
      missed.map((s) => `${s.path} (class: ${s.cls || 'none'})`),
      'condition seeds the warm would silently skip',
    ).toEqual([]);
  });

  it('⚠ the paths the toxin fixtures fabricate are REAL seeded paths', () => {
    // The masking bug, pinned. The toxin suites hand-construct a
    // `Condition` at a hard-coded path; if that path drifted from the
    // seed, production would resolve nothing and those suites would
    // still pass. This ties them to the roster on disk.
    const seeded = new Set(authoredConditionSeeds().map((s) => s.path));
    for (const p of [
      '/platform/idea/Condition/metabolism/alcohol',
      '/platform/idea/Condition/metabolism/ptomaine',
    ]) {
      expect(seeded, `${p} is fabricated by a fixture`).toContain(p);
    }
  });
});
