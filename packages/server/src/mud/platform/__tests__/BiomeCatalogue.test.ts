/**
 * BiomeCatalogue — the self-warming biome roster (the `MaterialCatalogue`
 * shape, added by the ground build after the ground build's DRIVE found every
 * outdoor room in the world reading as the indoor floor default).
 *
 * ⚠⚠ The bug it closes, stated once: `Atmospheric.getBiome()` resolves a
 * cited path through `StuffApi.findByTemplatePath` — a **registry** read, so
 * only already-live instances answer. Nothing stood biome rows up, so every
 * room's biome was `null`, `isSkyExposed` answered its documented
 * false-when-nothing-resolves, and a mine adit read as oak boards.
 *
 * ⭐ The wiring assert at the bottom is the load-bearing one. A catalogue
 * nothing boots is the same silence it was written to end — and the repo has
 * the receipt: `base-library`'s own boot line exists because the ROOT biome
 * was never cloned by anything.
 */

import '../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import BiomeCatalogue from '../idea/BiomeCatalogue';
// ⚠ The lib base, for the reason the catalogue's import comment gives.
import Biome from '../../lib/biome/Biome';
import ConcreteBiome from '../idea/Biome';
import { SkyExposedBiome } from '../idea/SkyExposedBiome';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the roster warm', () => {
  it('stands up Biome rows — including a pack’s own — and skips the folders', async () => {
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      { path: '/stuff/idea/biome/outdoor', class: '/platform/idea/FolderZone' },
      { path: '/stuff/idea/biome/universe', class: '/platform/idea/Biome' },
      {
        path: '/stuff/idea/biome/outdoor/baseline',
        class: '/platform/idea/SkyExposedBiome',
      },
    ] as unknown as Template[]);
    const stood: string[] = [];
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
      stood.push(path);
      return makeStuff(() => new ConcreteBiome()) as never;
    });

    const catalogue = makeStuff(() => new BiomeCatalogue());
    await catalogue.postRegister();

    // ⭐ The folder is skipped by the CLASS test, not by a path allowlist —
    // which is what lets a realm pack ship `/world/<place>/idea/biome/cavern`
    // with nothing to edit here.
    expect(stood).toEqual([
      '/stuff/idea/biome/universe',
      '/stuff/idea/biome/outdoor/baseline',
    ]);
    expect(Template.findByPathInfix).toHaveBeenCalledWith('/idea/biome/');
  });

  it('⚠⚠ both concrete biomes pass the class test — against the LIB base', () => {
    // If this stopped being true the warm would skip exactly the biomes that
    // decide sky exposure, which is the whole point of it. And the trap is
    // live: `SkyExposedBiome` extends the lib base, NOT the concrete twin, so
    // testing against `platform/idea/Biome` answers FALSE for it.
    expect(SkyExposedBiome.prototype instanceof Biome).toBe(true);
    expect(ConcreteBiome.prototype instanceof Biome).toBe(true);
    expect(SkyExposedBiome.prototype instanceof ConcreteBiome).toBe(false);
  });

  it('tolerates a single failed standup and continues', async () => {
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      { path: '/stuff/idea/biome/bad', class: '/platform/idea/Biome' },
      { path: '/stuff/idea/biome/good', class: '/platform/idea/Biome' },
    ] as unknown as Template[]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
      if (path.endsWith('bad')) throw new Error('boom');
      return makeStuff(() => new ConcreteBiome()) as never;
    });
    const catalogue = makeStuff(() => new BiomeCatalogue());
    expect(await catalogue.warm()).toBe(1);
  });

  it('is never culled — a culled catalogue re-warms nothing', () => {
    const c = makeStuff(() => new BiomeCatalogue());
    expect(c.canEvict({} as never).ok).toBe(false);
    expect(c.canDestruct().ok).toBe(false);
  });

  it('⭐ the platform pack boots it eagerly (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/platform/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/platform\/idea\/BiomeCatalogue/);
  });

  it('⚠ and base-library still boots the ROOT biome, whose absence THROWS', () => {
    // `BiomeApi.getRootBiome()` throws when it is cold — a deliberate
    // boot-time invariant — so belt and braces for the one row whose absence
    // is fatal rather than merely silent.
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/base-library/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/stuff\/idea\/biome\/universe/);
  });
});
