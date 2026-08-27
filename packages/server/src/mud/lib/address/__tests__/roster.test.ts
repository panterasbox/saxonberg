/**
 * Roster test — the slim demonstrative addressing inventory.
 *
 * Like Biome's 8-template roster, the address seed set is deliberately
 * small — just enough to prove the substrate (root Region, nested
 * longest-prefix winner, sibling discrimination) without committing to
 * a content map of the world. Each leaf earns its place; the
 * templatePath of every Locality deliberately diverges from its
 * claimed address, pinning namespace independence.
 *
 *   /obj/Locality/                 FolderZone  ← admin root
 *   /obj/Locality/narnia           Locality    ← root Region (fallback)
 *   /obj/Locality/cair-paravel     Locality    ← nested, longest-prefix
 *   /obj/Locality/lantern-waste    Locality    ← sibling discrimination
 *
 * The transit build adds three board-destination Localities (the first
 * non-demonstrative address content) — the TPA departures board names each
 * destination by its covering Locality (see fasttravel.md § destination
 * naming):
 *
 *   /obj/Locality/terminus            Locality  ← the transit hub
 *   /obj/Locality/the-lounge          Locality  ← the social hub
 *   /obj/Locality/last-counted-mile   Locality  ← the frontier crossroads
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
// The Locality rows: the realm + city are the platform pack's, the rest
// world-seed's (content-packs wave 3). Both roots are searched.
const PLATFORM_DIR = join(dirname(__filename), '../../../../../../content/platform/content/obj/Locality');
const SEEDS_DIR = join(dirname(__filename), '../../../../../../content/world-seed/content/obj/Locality');
const ROOTS = [SEEDS_DIR, PLATFORM_DIR];

interface AddressSeed {
  class: string;
  data?: Record<string, unknown>;
}

function loadSeed(relativePath: string): AddressSeed {
  const path = ROOTS.map((r) => join(r, relativePath)).find((p) => existsSync(p));
  expect(path, `seed missing: ${relativePath}`).toBeDefined();
  return YAML.parse(readFileSync(path!, 'utf-8')) as AddressSeed;
}

function listYamlsRelative(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listYamlsRelative(full));
    } else if (entry.endsWith('.yaml')) {
      out.push(relative(dir.includes('platform') ? PLATFORM_DIR : SEEDS_DIR, full));
    }
  }
  return out;
}

describe('Address roster — slim demonstrative inventory', () => {
  it('the /obj/Locality folder template is a FolderZone', () => {
    const seed = YAML.parse(
      readFileSync(join(PLATFORM_DIR, '../Locality.yaml'), 'utf-8'),
    ) as AddressSeed;
    expect(seed.class).toBe('/obj/FolderZone');
  });

  it('narnia is the root Region claiming the shortest prefix', () => {
    const seed = loadSeed('narnia.yaml');
    expect(seed.class).toBe('/obj/Locality');
    expect(seed.data?._address).toBe('narnia');
  });

  it('cair-paravel is a nested Locality (longest-prefix winner)', () => {
    const seed = loadSeed('cair-paravel.yaml');
    expect(seed.class).toBe('/obj/Locality');
    expect(seed.data?._address).toBe('narnia/castle');
  });

  it('lantern-waste is a sibling under the root', () => {
    const seed = loadSeed('lantern-waste.yaml');
    expect(seed.class).toBe('/obj/Locality');
    expect(seed.data?._address).toBe('narnia/wild');
  });

  it('templatePath need not match the claimed address (namespace independence)', () => {
    // The two nested Localities prove path != address: their file names
    // bear no relation to their claimed prefixes. (The root coincidence
    // narnia.yaml -> 'narnia' is allowed — there is simply no required
    // correspondence either way.)
    expect(loadSeed('cair-paravel.yaml').data?._address).toBe('narnia/castle');
    expect(loadSeed('lantern-waste.yaml').data?._address).toBe('narnia/wild');
  });

  it('the three transit-hub Localities name the TPA board destinations', () => {
    expect(loadSeed('terminus.yaml').data?._address).toBe('terminus');
    expect(loadSeed('the-lounge.yaml').data?._address).toBe('lounge');
    expect(loadSeed('last-counted-mile.yaml').data?._address).toBe(
      'last-counted-mile',
    );
    for (const f of ['terminus.yaml', 'the-lounge.yaml', 'last-counted-mile.yaml']) {
      expect(loadSeed(f).class).toBe('/obj/Locality');
    }
  });

  it('no other address seeds have crept in (slim roster discipline)', () => {
    const expected = new Set([
      // The demonstrative substrate roster.
      'narnia.yaml',
      'cair-paravel.yaml',
      'lantern-waste.yaml',
      // The transit board-destination Localities.
      'terminus.yaml',
      'the-lounge.yaml',
      'last-counted-mile.yaml',
      // The University Avenue crossing locality (Phase 3).
      'university-avenue.yaml',
      // The Terminus Counting-Houses financial-quarter locality.
      'counting-houses.yaml',
      // The Weeping Moor — the storms-and-wetness demonstrator (weather
      // Wave 2): a Locality carrying an authored alive-storm weather pin.
      'moor.yaml',
      // The three-tier government chain (the civics build): terminus is
      // the realm ROOT (re-purposed, still the board label); the city and
      // campus tiers nest under it and each declares its government.
      'terminus-city.yaml',
      'eternal-campus.yaml',
      // Hinkley Hills (living-world phase 2) — a SIBLING of the city, not
      // a child of it: `terminus/hinkley-hills`, with a government of its
      // own. Two jurisdictions a short walk apart is the point.
      'hinkley-hills.yaml',
    ]);
    const actual = new Set(ROOTS.flatMap((r) => listYamlsRelative(r)));
    expect(actual).toEqual(expected);
  });
});
