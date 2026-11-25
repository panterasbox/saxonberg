/**
 * A cow is not a bull, and a calf grows into a cow (organism-biology D8).
 * A drafted head answers to its species' words FOR ITS FORM — read late, at
 * every bind — so `milk bull` in a byre with a cow in it finds the bull or
 * nothing (dairy step 4), and a calf aged to adult answers to `cow` with
 * nothing re-stamped.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Livestock from '../agent/Livestock';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

afterEach(() => {
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
});

/** A world clock, so an age can be read (an organism's age needs one). */
function standClock(): void {
  WorldClockApi._setNowProviderForTesting(() => 5_000_000_000);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }
}

const CATTLE = new URL(
  '../../content/stuff/idea/species/animalia/chordata/mammalia/artiodactyla/bovidae/bos/taurus.yaml',
  import.meta.url,
);

/** The shipped cattle row's names and forms (no body deltas: no plan here). */
async function cattle(): Promise<Species> {
  const { data } = parse(readFileSync(CATTLE, 'utf8')) as {
    data: { commonNames: string[]; variants: Record<string, unknown>; ageCurve: never; adultMass: number };
  };
  const species = makeStuffAtPath(() => new Species(), '/stuff/idea/species/_test/cattle');
  species.setCommonNames(data.commonNames);
  species.applyVariants(data.variants as never); // names only: no module is read
  species.setAgeCurve(data.ageCurve);
  species.setAdultMass(data.adultMass);
  species.setSexDeterminationSystem('xy');
  return species;
}

async function head(sex: string, ageDays: number): Promise<Livestock> {
  standClock();
  const species = await cattle();
  const h = makeStuff(() => new Livestock());
  h.setSpecies(species);
  h.setSex(sex);
  h.setAge(ageDays);
  return h;
}

describe('what a drafted head answers to', () => {
  it('a cow is not a bull, and is still a cow', async () => {
    const cow = await head('female', 1000);
    const words = cow.getKeywords();
    expect(words).not.toContain('bull');
    expect(words).not.toContain('ox');
    expect(words).toContain('cow');
    expect(words).toContain('cattle');
    expect(cow.getShortDescription()).toBe('cow');
  });

  it('a bull is a bull, and answers to what the room calls him', async () => {
    const bull = await head('male', 1000);
    expect(bull.getKeywords()).toContain('bull');
    expect(bull.getKeywords()).toContain('cow');
    // ⭐ A word only the other sex goes by is not his.
    expect(bull.getKeywords()).not.toContain('heifer');
    expect(bull.getShortDescription()).toBe('bull');
  });

  it('⭐⭐ a calf aged to adult answers to its adult name, with no re-draft', async () => {
    const calf = await head('female', 10);
    expect(calf.getShortDescription()).toBe('calf');
    expect(calf.getKeywords()).toContain('calf');
    calf.setAge(1000);
    expect(calf.getShortDescription()).toBe('cow');
    expect(calf.getKeywords()).not.toContain('calf');
  });

  it('⭐ the generic row\'s words stay (a head is still `stock`)', async () => {
    const cow = await head('female', 1000);
    cow.setKeywords(['of', 'head', 'stock', 'animal', 'beast']);
    expect(cow.getKeywords()).toEqual(expect.arrayContaining(['stock', 'animal', 'cow']));
  });

  it('every shipped herd species names its males under variants.sex.male', () => {
    const root = new URL('../../content/stuff/idea/species/animalia/chordata/', import.meta.url);
    for (const rel of [
      'mammalia/artiodactyla/bovidae/bos/taurus.yaml',
      'mammalia/artiodactyla/bovidae/capra/hircus.yaml',
      'mammalia/artiodactyla/bovidae/ovis/aries.yaml',
      'mammalia/artiodactyla/suidae/sus/domesticus.yaml',
      'aves/galliformes/phasianidae/gallus/domesticus.yaml',
    ]) {
      const { data } = parse(readFileSync(new URL(rel, root), 'utf8')) as {
        data: { maleNames?: string[]; variants?: { sex?: { male?: { commonNames?: string[] } } } };
      };
      expect(data.maleNames, rel).toBeUndefined();
      expect(data.variants?.sex?.male?.commonNames?.length, rel).toBeGreaterThan(0);
    }
  });
});
