/**
 * The trade's rows — **every path a row names resolves to a shipped row**,
 * because the miss is silent (fishing B2). A species whose `_bodyPlanPath`
 * names nothing reads `['air']` and drowns in its bowl; a yield whose
 * `cut` names nothing announces *nothing is wasted* and lists one part
 * fewer; a material nobody ships makes a fillet that cannot spoil.
 *
 * ⚠ And the two facts the whole build stands on, pinned against the
 * rows rather than restated: the fish plan breathes WATER, and every
 * species authors a habitat whose every word is in the vocabulary.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WATER_PARAMETERS, HABITAT_ROLES } from '@saxonberg/server/mud/platform/idea/species/Species';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', 'content');
const PACKS = join(HERE, '..', '..', '..');

function rowExists(path: string): boolean {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    try {
      if (statSync(join(PACKS, pack, 'content', rel)).isFile()) return true;
    } catch {
      /* not this pack */
    }
  }
  return false;
}

function rowsUnder(dir: string): Array<{ file: string; row: { class: string; data: Record<string, unknown> } }> {
  const out: Array<{ file: string; row: { class: string; data: Record<string, unknown> } }> = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...rowsUnder(full));
      continue;
    }
    if (!name.endsWith('.yaml')) continue;
    out.push({ file: full, row: YAML.parse(readFileSync(full, 'utf8')) });
  }
  return out;
}

const SPECIES_DIR = join(CONTENT, 'stuff', 'idea', 'species');
const species = () =>
  rowsUnder(SPECIES_DIR).filter((r) => r.row.class === '/platform/idea/species/Species');

describe('the species rows', () => {
  it('ships six, in the commons, each naming a body plan, a material and cuts that exist', () => {
    const rows = species();
    expect(rows).toHaveLength(6);
    for (const { file, row } of rows) {
      const d = row.data;
      expect(rowExists(d._bodyPlanPath as string), `${file}: body plan`).toBe(true);
      expect(rowExists(d._defaultMaterialPath as string), `${file}: material`).toBe(true);
      expect(rowExists(d._parentCladePath as string), `${file}: clade`).toBe(true);
      for (const line of d.butcheryYield as Array<{ cut: string }>) {
        expect(rowExists(line.cut), `${file}: cut ${line.cut}`).toBe(true);
        expect(line.cut).not.toMatch(/\/idea\/material\//);
      }
    }
  });

  it('⭐ every species authors a habitat, and every word of it is in the vocabulary', () => {
    for (const { file, row } of species()) {
      const h = row.data.habitat as { tolerances: Record<string, unknown>; role: string; abundance: number; fightRating: number; seasons?: string[] };
      expect(h, file).toBeDefined();
      for (const word of Object.keys(h.tolerances)) {
        expect(WATER_PARAMETERS as readonly string[], `${file}: ${word}`).toContain(word);
      }
      expect(HABITAT_ROLES as readonly string[]).toContain(h.role);
      expect(h.abundance).toBeGreaterThan(0);
      expect(h.fightRating).toBeGreaterThanOrEqual(0);
      // ⭐ The tank's numbers, on every fish, inert in a river (D22).
      expect(h.tolerances.ammoniaMgL, `${file}: ammonia`).toBeDefined();
      expect(h.tolerances.nitriteMgL, `${file}: nitrite`).toBeDefined();
    }
  });

  it('⚠ a Bonded class\'s species declares biddability (lint:kept-animals), and only the carp has a feeding rung', () => {
    for (const { file, row } of species()) {
      expect(row.data.biddability, file).toBe(0);
      const rungs = row.data.feedingStyle as string[] | undefined;
      if (file.endsWith('carp.yaml')) expect(rungs).toEqual(['surface']);
      else expect(rungs).toBeUndefined();
    }
  });
});

describe('the body plans', () => {
  it('⚠⚠ the fish plan breathes WATER and only water; the crab breathes both', () => {
    const fish = YAML.parse(readFileSync(join(SPECIES_DIR, 'BodyPlan', 'fish.yaml'), 'utf8'));
    expect(fish.data.breathableMedia).toEqual(['water']);
    expect(fish.data.locomotionModes).toEqual(['swim']);
    expect(fish.data.respires).toBe(true);
    const crab = YAML.parse(readFileSync(join(SPECIES_DIR, 'BodyPlan', 'crustacean.yaml'), 'utf8'));
    expect(crab.data.breathableMedia).toEqual(['water', 'air']);
  });
});

describe('the agent rows', () => {
  it('six Fish rows, one per species, each naming its species and no walking brain', () => {
    const agents = rowsUnder(join(CONTENT, 'trade', 'fishing', 'agent'));
    expect(agents).toHaveLength(6);
    const named = new Set<string>();
    for (const { file, row } of agents) {
      expect(row.class).toBe('/trade/fishing/agent/Fish');
      const sp = row.data._speciesPath as string;
      expect(rowExists(sp), `${file}: species`).toBe(true);
      named.add(sp);
      const brains = (row.data.behaviors as Array<{ brain: string }>).map((b) => b.brain);
      expect(brains).not.toContain('/lib/behavior/follows');
      expect(brains).not.toContain('/lib/behavior/homes');
      expect(brains).toContain('/lib/behavior/feeds');
    }
    expect(named.size).toBe(6);
  });
});

describe('the material and the cuts', () => {
  it('fish flesh is meat (the shipped cure/smoke/dry rows match by category) and perishable', () => {
    const m = YAML.parse(readFileSync(join(CONTENT, 'stuff', 'idea', 'material', 'food', 'fish-flesh.yaml'), 'utf8'));
    expect(m.data.tags).toContain('meat');
    expect(m.data.tags).toContain('food');
    expect(m.data.spoilActivationEnergy).toBeGreaterThan(0);
    expect(m.data.waterActivity).toBeGreaterThan(0.6);
    for (const cut of ['fillet', 'roe']) {
      const row = YAML.parse(readFileSync(join(CONTENT, 'trade', 'fishing', 'thing', `${cut}.yaml`), 'utf8'));
      expect(row.class).toBe('/platform/thing/Provision');
      expect(row.data._materialPath).toBe('/stuff/idea/material/food/fish-flesh');
    }
  });
});
