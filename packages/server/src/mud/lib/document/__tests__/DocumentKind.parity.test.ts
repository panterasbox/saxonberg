/**
 * Naming overhaul A0 — the declarations agree with the closed table they
 * replace. Every `<pack>/content/kinds/<kind>.yaml` is read off disk and
 * compared with its `DOCUMENT_KINDS` entry: the shipped dir, extension and
 * vanish policy, the catalogue, and the card (keys + words) on sample data.
 * Retired with the table in A1.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { DOCUMENT_KINDS, type DocumentKindSpec } from '../DocumentKinds';
import { DocumentKind } from '../DocumentKind';

const CONTENT = join(fileURLToPath(new URL('.', import.meta.url)), '../../../../../../content');

function declarations(): Map<string, DocumentKind> {
  const out = new Map<string, DocumentKind>();
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content', 'kinds');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.yaml')) continue;
      const name = f.slice(0, -5);
      out.set(name, new DocumentKind(name, YAML.parse(readFileSync(join(dir, f), 'utf8')) ?? {}));
    }
  }
  return out;
}

/** Sample data that exercises every key derivation the table holds. */
const SAMPLE: Record<string, unknown> = {
  outputTemplate: '/stuff/thing/stool',
  material: '/stuff/idea/material/madder',
  publishedAt: 1234,
  pinned: true,
  releaseId: 'r-1',
  prepositions: ['on', 'upon'],
};

describe('kind declarations agree with DOCUMENT_KINDS (A0 parity)', () => {
  const decl = declarations();
  const table = DOCUMENT_KINDS as Record<string, DocumentKindSpec>;

  it('declares every tabled kind, plus venue-eighty-six', () => {
    const names = [...decl.keys(), 'kind'].sort();
    expect(names).toEqual([...Object.keys(table), 'venue-eighty-six'].sort());
  });

  for (const [name, spec] of Object.entries(table)) {
    if (name === 'kind') continue;
    it(`${name}: dir, ext, vanish, catalogue, card`, () => {
      const kind = decl.get(name)!;
      expect(kind).toBeDefined();
      const shipped = kind.shipped();
      // A runtime-only kind (no pack ships its dir) is not shipped: its
      // tabled dir was a reserved name nobody used (defect 3).
      const shippedAnywhere = readdirSync(CONTENT).some((p) => existsSync(join(CONTENT, p, 'content', spec.contentDir)));
      if (shipped) {
        expect(shipped.dir ?? shipped.inTree).toBe(spec.contentDir);
        expect(shipped.ext).toBe(spec.ext);
        expect(shipped.vanish).toBe(spec.onVanish);
      } else {
        expect(shippedAnywhere).toBe(false);
      }
      expect(kind.servedBy()).toBe(spec.catalogue ?? null);
      const path = `/platform/${spec.contentDir}/sample-leaf`;
      const keys: Record<string, unknown> = {};
      for (const [k, derive] of Object.entries(spec.keys ?? {})) {
        const v = derive({ path, data: SAMPLE });
        if (v !== undefined) keys[k] = v;
      }
      const card = kind.cardOf(path, SAMPLE);
      for (const [k, v] of Object.entries(keys)) expect(card[k]).toEqual(v);
      // Every word the table derived is still a keyword (titles may add more).
      const words = spec.words ? spec.words({ path, data: SAMPLE }) : [];
      for (const w of words) expect(kind.keywordsOf(path, SAMPLE)).toContain(w);
      // herd gains keywords by the traits slate's ruling (a herd is named).
      if (!spec.words && name !== 'herd') expect(kind.keyworded()).toBeNull();
    });
  }
});
