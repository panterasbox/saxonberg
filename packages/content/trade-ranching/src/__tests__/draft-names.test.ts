/**
 * A cow is not a bull. A drafted head answers to its species' common names, less
 * the names only a male goes by, so `milk bull` in a byre with a cow in it finds
 * the bull or nothing (dairy step 4, found on a run where a hand's cow stood there).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Livestock from '../agent/Livestock';

const named = (sex: string): string[] => {
  const species = makeStuff(() => new Species());
  species.setCommonNames(['cow', 'cattle', 'heifer', 'bull', 'calf', 'ox', 'beast']);
  species.setMaleNames(['bull', 'ox']);
  const head = makeStuff(() => new Livestock());
  head.answerToSpecies(species, sex);
  return head.getKeywords();
};

describe('what a drafted head answers to', () => {
  it('a female is not a bull, and is still a cow', () => {
    const words = named('female');
    expect(words).not.toContain('bull');
    expect(words).not.toContain('ox');
    expect(words).toContain('cow');
  });

  it('a male is a bull, and answers to what the room calls him', () => {
    const words = named('male');
    expect(words).toContain('bull');
    expect(words).toContain('cow');
  });

  it('every shipped herd species names its males among its common names', () => {
    const root = new URL('../../content/stuff/idea/species/animalia/chordata/', import.meta.url);
    for (const rel of [
      'mammalia/artiodactyla/bovidae/bos/taurus.yaml',
      'mammalia/artiodactyla/bovidae/capra/hircus.yaml',
      'mammalia/artiodactyla/bovidae/ovis/aries.yaml',
      'mammalia/artiodactyla/suidae/sus/domesticus.yaml',
      'aves/galliformes/phasianidae/gallus/domesticus.yaml',
    ]) {
      const { data } = parse(readFileSync(new URL(rel, root), 'utf8')) as {
        data: { commonNames: string[]; maleNames: string[] };
      };
      expect(data.maleNames.length, rel).toBeGreaterThan(0);
      for (const name of data.maleNames) expect(data.commonNames, rel).toContain(name);
    }
  });
});
