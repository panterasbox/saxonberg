/**
 * ⭐ The cocoon is spun from the worm's own gland (organism-biology D10):
 * the shipped larva's silk-gland share is the reference the strains' shell
 * means are calibrated against, so the shipped worm spins exactly what it
 * did, and a breed with a bigger gland would spin heavier. This pins the
 * reference to the real modules.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import YAML from 'yaml';
import { Body } from '@saxonberg/server/mud/lib/species/Body';
import { BodyModule } from '@saxonberg/server/mud/lib/species/BodyModule';
import { GLAND_SHARE_REFERENCE } from '../lib/Rearing';

const mod = (name: string): BodyModule => {
  const path = `/trade/sericulture/body-modules/${name}`;
  return new BodyModule(path, YAML.parse(readFileSync(new URL(`../../content/body-modules/${name}.yaml`, import.meta.url), 'utf8')));
};

describe('the silk gland', () => {
  it('⭐ the shipped larva\'s gland share IS the calibration reference', () => {
    const plan = YAML.parse(readFileSync(new URL('../../content/stuff/idea/species/BodyPlan/silkworm-larva.yaml', import.meta.url), 'utf8')) as { data: { modules: never[] } };
    const mods: Record<string, BodyModule> = { 'torso-larva': mod('torso-larva'), 'head-larva': mod('head-larva') };
    const body = new Body({ modules: plan.data.modules }, (p) => mods[p.split('/').pop()!]!);
    const share = body.resolvedTissues().filter((t) => t.partKey.endsWith('.silk-gland')).reduce((a, t) => a + t.share, 0);
    expect(share).toBeCloseTo(GLAND_SHARE_REFERENCE, 9);
  });
});
