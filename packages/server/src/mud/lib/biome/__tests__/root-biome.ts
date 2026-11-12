/**
 * The root biome, stood in for a suite (load-on-use W8).
 *
 * What a place is built of when neither its row nor its class says is the
 * root (`universe`) biome's `_enclosureMaterial` — content, loaded with the
 * booted root in a running world. A suite that measures a room with no
 * authored enclosure stands the root in, naming the wall material it has
 * made, as the shipped root names granite.
 */

import Biome from '../Biome';
import Material from '../../material/Material';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

const UNIVERSE = '/stuff/idea/biome/universe';

/** The blank wall a suite's default stands as — no conductivity, density or heat authored. */
const BLANK_WALL = '/stuff/idea/material/_test/default-wall';

/** Stand the blank default wall in (unless live) and name it — the harness's stand-in. */
export function blankDefaultWall(): string {
  if (!StuffApi.findByTemplatePath(BLANK_WALL)) makeStuffAtPath(() => new Material(), BLANK_WALL);
  return BLANK_WALL;
}

/**
 * Stand the root biome in (or reuse a live one) with `enclosureMaterial` as
 * its default walls. With none named, the walls are a BLANK material — the
 * envelope's own fallback figures, which is what a suite with no wall
 * material read before the default became the root's.
 */
export function standRootBiome(enclosureMaterial: string = BLANK_WALL): Biome {
  if (enclosureMaterial === BLANK_WALL && !StuffApi.findByTemplatePath(BLANK_WALL)) {
    makeStuffAtPath(() => new Material(), BLANK_WALL);
  }
  const live = StuffApi.findByTemplatePath<Biome>(UNIVERSE);
  const root = live ?? makeStuffAtPath(() => new Biome(), UNIVERSE);
  root.setEnclosureMaterial(enclosureMaterial);
  BiomeApi.invalidateRootBiomeCache();
  return root;
}
