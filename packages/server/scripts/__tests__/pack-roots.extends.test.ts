/**
 * The lint family's shared inheritance reader.
 *
 * ⚠⚠ Each case here feeds the reader a row it should REJECT or resolve
 * a particular way. A gate proved only against clean input is a gate
 * this repo has already shipped broken and silently passing — and the
 * whole point of this reader is that fifteen gates used to skip a
 * class-less child without a word.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import {
  templateRows,
  effectiveRow,
  effectiveDoc,
  inheritanceIndex,
  fieldMetaKeys,
  isTemplateRelPath,
} from '../pack-roots';

/** A throwaway content tree: `<tmp>/packages/content/<pack>/content/…`. */
function tree(files: Record<string, Record<string, unknown>>): {
  serverSrc: string;
  contentDir: string;
  fileOf: (rel: string) => string;
} {
  const root = mkdtempSync(join(tmpdir(), 'pack-roots-'));
  const contentDir = join(root, 'content');
  const packContent = join(contentDir, 'p', 'content');
  for (const [rel, body] of Object.entries(files)) {
    const file = join(packContent, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, YAML.stringify(body));
  }
  // An empty server src — no seeds, no DocumentKinds; the kind-dir
  // derivation falls back to its four literals, which is enough here.
  const serverSrc = join(root, 'src');
  mkdirSync(join(serverSrc, 'mud', 'seeds'), { recursive: true });
  return {
    serverSrc,
    contentDir,
    fileOf: (rel) => join(packContent, rel),
  };
}

describe('effectiveRow', () => {
  it('a child takes its parent’s class and hydrator, and merges data', () => {
    const t = tree({
      'a/parent.yaml': { class: '/x/Y', hydratorClass: '/h', data: { a: 1, b: 2 } },
      'a/child.yaml': { extends: '/a/parent', data: { b: 9, c: 3 } },
    });
    const rows = templateRows(t.serverSrc, t.contentDir);
    const eff = effectiveRow('/a/child', rows);
    expect(eff.error).toBeNull();
    expect(eff.class).toBe('/x/Y');
    expect(eff.hydratorClass).toBe('/h');
    expect(eff.data).toEqual({ a: 1, b: 9, c: 3 });
    expect(eff.chain).toEqual(['/a/parent']);
  });

  it('REJECTS a parent no row ships', () => {
    const t = tree({ 'a/child.yaml': { extends: '/a/ghost', data: {} } });
    const eff = effectiveRow('/a/child', templateRows(t.serverSrc, t.contentDir));
    expect(eff.error).toMatch(/which no row ships/);
  });

  it('REJECTS a cycle', () => {
    const t = tree({
      'a/x.yaml': { extends: '/a/y', data: {} },
      'a/y.yaml': { extends: '/a/x', data: {} },
    });
    const eff = effectiveRow('/a/x', templateRows(t.serverSrc, t.contentDir));
    expect(eff.error).toMatch(/cyclic/);
  });

  it('REJECTS a chain deeper than the cap', () => {
    const files: Record<string, Record<string, unknown>> = {};
    for (let i = 0; i < 40; i++) {
      files[`a/r${i}.yaml`] = { extends: `/a/r${i + 1}`, data: {} };
    }
    files['a/r40.yaml'] = { class: '/x/Y', data: {} };
    const t = tree(files);
    const eff = effectiveRow('/a/r0', templateRows(t.serverSrc, t.contentDir));
    expect(eff.error).toMatch(/deeper than 32/);
  });

  it('a chain that states no class anywhere resolves to a null class', () => {
    const t = tree({
      'a/p.yaml': { data: { a: 1 } },
      'a/c.yaml': { extends: '/a/p', data: {} },
    });
    const eff = effectiveRow('/a/c', templateRows(t.serverSrc, t.contentDir));
    expect(eff.error).toBeNull();
    expect(eff.class).toBeNull();
  });
});

describe('effectiveDoc — the gate shim', () => {
  it('gives a class-less child the class a gate selects on', () => {
    const t = tree({
      'a/parent.yaml': { class: '/x/Y', data: {} },
      'a/child.yaml': { extends: '/a/parent', data: { k: 1 } },
    });
    const idx = inheritanceIndex(t.serverSrc, t.contentDir);
    const raw = { extends: '/a/parent', data: { k: 1 } };
    const doc = effectiveDoc(t.fileOf('a/child.yaml'), raw, idx);
    expect(doc.class).toBe('/x/Y');
    // …and a parentless row passes through as the very same object.
    const plain = { class: '/x/Y', data: {} };
    expect(effectiveDoc(t.fileOf('a/parent.yaml'), plain, idx)).toBe(plain);
  });
});

describe('fieldMetaKeys', () => {
  it('reads the top-level keys only, never a nested entry’s properties', () => {
    const keys = fieldMetaKeys(`
      static fieldMeta: FieldMeta = {
        path: { persistent: true },
        props: { persistent: true, instruction: true, inherit: 'by-entry' },
        'quoted-key': { persistent: true },
      };
    `);
    expect(keys).toEqual(['path', 'props', 'quoted-key']);
  });
});

describe('isTemplateRelPath', () => {
  const kinds = new Set(['emotes', 'recipes', 'settings']);
  it('skips a kind dir and skips cmd/ at ANY depth', () => {
    expect(isTemplateRelPath('emotes/bow.yaml', kinds)).toBe(false);
    expect(isTemplateRelPath('platform/cmd/shell/write.yaml', kinds)).toBe(false);
    expect(isTemplateRelPath('platform/thing/can.yaml', kinds)).toBe(true);
    expect(isTemplateRelPath('home.yaml', kinds)).toBe(true);
  });
});
