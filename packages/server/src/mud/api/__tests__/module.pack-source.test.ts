/**
 * The capability-pack source table on ModuleApi (content-packs, the
 * capability rung): a registered pack `src/` normalises a file under it
 * to `/<root>/<rel>` — the same string as the template path a pack row
 * names — before the kernel root hints are consulted; the kernel's own
 * files are untouched by the table.
 */

import { describe, it, expect } from 'vitest';
import { ModuleApi } from '../module';

describe('ModuleApi pack sources', () => {
  it('a file under a registered pack src/ normalises to /<root>/<rel>', () => {
    ModuleApi.registerPackSource('/proj/packages/content/fixture-a/src', '/fixture-a');
    expect(
      ModuleApi.moduleIdOfUrl('file:///proj/packages/content/fixture-a/src/thing/Wand.ts'),
    ).toBe('/fixture-a/thing/Wand');
    expect(
      ModuleApi.moduleIdOfUrl('/proj/packages/content/fixture-a/src/idea/cmd/magic/CastController.ts'),
    ).toBe('/fixture-a/idea/cmd/magic/CastController');
  });

  it('one src/ backs every namespace the pack holds (root + claims)', () => {
    ModuleApi.registerPackSource('/proj/packages/content/fixture-b/src', '/fixture-b');
    ModuleApi.registerPackSource('/proj/packages/content/fixture-b/src', '/trade/fixture-b');
    const table = ModuleApi.packSources().filter((e) => e.dir.includes('fixture-b'));
    expect(table.map((e) => e.root).sort()).toEqual(['/fixture-b', '/trade/fixture-b']);
    // Registration is idempotent.
    ModuleApi.registerPackSource('/proj/packages/content/fixture-b/src/', '/fixture-b');
    expect(ModuleApi.packSources().filter((e) => e.dir.includes('fixture-b'))).toHaveLength(2);
  });

  it('the kernel tree still normalises through the root hints', () => {
    expect(
      ModuleApi.moduleIdOfUrl('file:///proj/packages/server/src/mud/lib/stuff/Thing.ts'),
    ).toBe('/lib/stuff/Thing');
  });
});
