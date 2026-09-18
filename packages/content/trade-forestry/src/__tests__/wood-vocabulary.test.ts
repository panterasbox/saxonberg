/**
 * The wood vocabulary — closed, and minted here (forestry D11/D12).
 *
 * Eight woods in the commons (`/stuff/idea/material/wood/…`), eight
 * tree species in this pack, each naming the other: the material's
 * `biologicalSource.speciesPath` resolves to a species row, and every
 * `_materialPath` under `material/wood/` anywhere in the content tree
 * resolves to a material row. Before this build the garden bed named
 * `wood/pine` and no such row existed — a reference that resolved to
 * nothing, silently. This is the gate that keeps that from recurring.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const WOOD_DIR = join(CONTENT, 'base-library', 'content', 'stuff', 'idea', 'material', 'wood');

const EIGHT = ['oak', 'ash', 'hazel', 'beech', 'elm', 'willow', 'pine', 'yew'];

/** Every `.yaml` under every pack's `content/`, as absolute paths. */
function everyRow(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.yaml')) out.push(full);
    }
  };
  for (const pack of readdirSync(CONTENT)) {
    const content = join(CONTENT, pack, 'content');
    if (existsSync(content) && statSync(content).isDirectory()) walk(content);
  }
  return out;
}

/** A `/stuff/…` template path → the one pack file that ships it. */
function fileFor(templatePath: string): string | null {
  for (const pack of readdirSync(CONTENT)) {
    const candidate = join(CONTENT, pack, 'content', `${templatePath}.yaml`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

describe('the wood vocabulary — eight woods, eight trees, each naming the other', () => {
  it('ships exactly the eight materials', () => {
    const rows = readdirSync(WOOD_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace(/\.yaml$/, ''))
      .sort();
    expect(rows).toEqual([...EIGHT].sort());
  });

  it('every wood material names a species that exists, as wood', () => {
    for (const wood of EIGHT) {
      const doc = YAML.parse(readFileSync(join(WOOD_DIR, `${wood}.yaml`), 'utf8')) as {
        data: { biologicalSource: { speciesPath: string; tissueType: string } | null; density: number; tags: string[] };
      };
      const src = doc.data.biologicalSource;
      expect(src, wood).not.toBeNull();
      expect(src!.tissueType, wood).toBe('wood');
      const file = fileFor(src!.speciesPath);
      expect(file, `${wood} → ${src!.speciesPath}`).not.toBeNull();
      const species = YAML.parse(readFileSync(file!, 'utf8')) as {
        class: string;
        data: { commonNames: string[] };
      };
      expect(species.class).toBe('/platform/idea/species/Species');
      // The tree is called what the wood is called.
      expect(species.data.commonNames, wood).toContain(wood);
      // A number a substrate reads: the mass a bole is minted at.
      expect(doc.data.density).toBeGreaterThan(300);
      expect(doc.data.tags).toContain('wood');
    }
  });

  it('the eight species are distinct trees in this pack', () => {
    const paths = new Set<string>();
    for (const wood of EIGHT) {
      const doc = YAML.parse(readFileSync(join(WOOD_DIR, `${wood}.yaml`), 'utf8')) as {
        data: { biologicalSource: { speciesPath: string } };
      };
      const p = doc.data.biologicalSource.speciesPath;
      expect(paths.has(p), `${wood} shares a species`).toBe(false);
      paths.add(p);
      expect(fileFor(p)!.startsWith(join(CONTENT, 'trade-forestry'))).toBe(true);
    }
  });

  it('⭐ nothing in the tree references a wood that does not exist', () => {
    const bad: string[] = [];
    for (const file of everyRow()) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(\/stuff\/idea\/material\/wood\/[a-z-]+)/g)) {
        if (!fileFor(m[1]!)) bad.push(`${file.slice(CONTENT.length)}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('⭐ a length of forestry timber is what the mine’s timber-set recipe asks for — by the wood TAG', () => {
    // The recipe slot says `category: wood, minGrade: poor`; craft-resolve
    // matches a slot's category against the input material's `category`
    // OR its `tags` (CraftingLogic), and an ungraded item reads `fair`.
    // So a plain Thing made of any wood in this vocabulary satisfies it —
    // no Crafted stamp, no grade, no forestry-specific rule anywhere.
    const timber = YAML.parse(
      readFileSync(join(CONTENT, 'trade-forestry', 'content', 'trade', 'forestry', 'thing', 'timber.yaml'), 'utf8'),
    ) as { class: string; data: { _materialPath: string; gradeBand?: string } };
    expect(timber.class).toBe('/platform/thing/Thing');
    expect(timber.data._materialPath).toMatch(/^\/stuff\/idea\/material\/wood\//);
    expect(timber.data.gradeBand).toBeUndefined();
    const recipe = YAML.parse(
      readFileSync(join(CONTENT, 'trade-mining', 'content', 'recipes', 'timber-set.yaml'), 'utf8'),
    ) as { inputSlots: Array<{ category: string; minGrade: string; count: number }>; toolCapabilities: string[] };
    expect(recipe.inputSlots[0]).toMatchObject({ category: 'wood', minGrade: 'poor', count: 2 });
    expect(recipe.toolCapabilities).toEqual(['cutting']); // the felling axe offers it
    for (const wood of EIGHT) {
      const doc = YAML.parse(readFileSync(join(WOOD_DIR, `${wood}.yaml`), 'utf8')) as { data: { tags: string[] } };
      expect(doc.data.tags, wood).toContain('wood');
    }
  });
});
