/**
 * BiomeCatalogue — the self-warming home of the authored biome roster (the
 * `MaterialCatalogue` shape, for the same reason and after the same bug).
 *
 * ⚠⚠ **Why this exists, and it is the FOURTH time.** `Atmospheric.getBiome()`
 * is an identity ref resolved on read:
 *
 *     BiomeApi.findByPath(path) → StuffApi.findByTemplatePath(path)
 *
 * — a **registry** read, which returns only already-live instances. So a room
 * whose row cites `/stuff/idea/biome/outdoor/baseline` answers `null` unless
 * something stood that row up first, and **nothing did.** Every consequence of
 * a room's biome was therefore inert in a fresh world: `isSkyExposed` answered
 * its documented `false`-when-no-biome-resolves, and the chain walk never got
 * past the room.
 *
 * ⭐ The repo had already hit exactly this for ONE biome and patched it with a
 * single `boot:` line — `base-library/pack.yaml` still carries the note: *"It
 * was never cloned by anything … so `analyze power <thing>` threw 'root
 * universe biome is not loaded' in every fresh world, found by the grain-chain
 * wire flow."* That fixed the root and left every other biome cold. ⚠ Which is
 * the shape of the whole *reference-Ideas-inert-at-boot* family: an
 * enumerated boot list is a list somebody has to remember to extend, and the
 * next author is not going to.
 *
 * Found (again) by the ground build's drive: every outdoor room in the world
 * read *"It is oak, laid as boards"* — the INDOOR floor default — because the
 * floor asks whether the ground continues beneath it, that question routes
 * through `isSkyExposed`, and no biome resolved. A mine adit read as boards.
 *
 * ## The roster is DERIVED, never listed
 *
 * Every root's `idea/biome/` subtree, filtered to rows whose `class` extends
 * `Biome` wherever it lives — the kernel's `/platform/idea/Biome` and
 * `/platform/idea/SkyExposedBiome`, or a pack's own — never an allowlist of
 * roots. So a realm pack shipping `/world/<place>/idea/biome/cavern` is warmed
 * by the same line, with nothing to edit here. The folder rows in that subtree
 * are `FolderZone`s owned by the zone substrate and are filtered out by the
 * class test.
 *
 * Holds NO state and keeps NO index — the queries live on `Biome` and its
 * readers over the live population. This singleton exists for exactly one
 * reason: **rows cannot stand themselves up, and something template-backed
 * must own the warm.**
 *
 * ⚠ `base-library`'s single `boot:` entry for the root universe biome STAYS.
 * `BiomeApi.getRootBiome()` **throws** when it is cold (a deliberate boot-time
 * invariant), and a belt-and-braces guarantee for the one row whose absence is
 * fatal costs one line. This catalogue covers the other N, whose absence was
 * merely silent — which is worse.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
// ⚠ The `lib/` BASE, not the concrete twin beside this file. `SkyExposedBiome`
// extends `SkyExposedMixin(lib/biome/Biome)` and NOT
// `platform/idea/Biome`, so `prototype instanceof platform/idea/Biome` is
// FALSE for it — and the warm would have skipped exactly the biomes that
// decide sky exposure. The shared-stem twin pattern is easy to import the
// wrong half of; `MaterialCatalogue` reaches for `lib/material/Material` for
// the same reason. Caught by the subclass assertion in this class's test.
import Biome from '../../lib/biome/Biome';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const BiomeCatalogueBase = PostRegistrationMixin(Idea);

export default class BiomeCatalogue extends BiomeCatalogueBase {
  /** Residency veto — the roster's warm; a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'BiomeCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored Biome row as a live singleton. Public so a pack
   * go-live can re-warm (idempotent — `singleton` no-ops rows already live).
   * Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/biome/');
    let stood = 0;
    const isBiome = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isBiome.has(tpl.class)) {
        isBiome.set(tpl.class, await isBiomeClass(tpl.class));
      }
      if (!isBiome.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(`BiomeCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    console.info(`BiomeCatalogue: ${stood} biome singleton(s) live`);
    return stood;
  }
}

/** Does `classPath` resolve to a class whose prototype chain includes `Biome`? */
async function isBiomeClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return typeof cls === 'function' && cls.prototype instanceof Biome;
  } catch {
    return false;
  }
}
