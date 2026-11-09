/**
 * lint:aromas, proved on fixtures that must be caught (a gate that has never
 * been seen to fail is indistinguishable from one that cannot report).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { checkAromas } from '../check-aromas';

let root: string;

function write(rel: string, body: string): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

function pack(id: string, deps: string[] = []): void {
  write(`${id}/pack.yaml`, `id: ${id}\n`);
  write(
    `${id}/package.json`,
    JSON.stringify({
      name: `@saxonberg/content-${id}`,
      dependencies: Object.fromEntries(deps.map((d) => [`@saxonberg/content-${d}`, 'workspace:*'])),
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aromas-'));
  pack('base-library');
  write('base-library/content/aromas/tar.yaml', 'threshold: 1\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const material = (data: string, cls = '/platform/idea/material/Food') =>
  `class: ${cls}\ndata:\n${data}\n`;
const TAR = '/base-library/aromas/tar';

describe('lint:aromas', () => {
  it('passes a row whose aroma path resolves in a dependency', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material(`  smells: [{ aroma: ${TAR}, strength: 10 }]`),
    );
    expect(checkAromas(root)).toEqual([]);
  });

  it('refuses a misspelled path, and a bare word', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material(`  smells: [{ aroma: ${TAR}r, strength: 10 }, { aroma: tar, strength: 10 }]`),
    );
    const found = checkAromas(root).join();
    expect(found).toMatch(/'\/base-library\/aromas\/tarr', which is not an aroma document's path/);
    expect(found).toMatch(/'tar', which is not an aroma document's path/);
  });

  it("an aroma lives at its own pack's root: the same file name in two packs is two aromas", () => {
    pack('trade-x', ['base-library']);
    write('trade-x/pack.yaml', 'id: trade-x\nroot: /trade/x\n');
    write('trade-x/content/aromas/tar.yaml', 'parent: /base-library/aromas/tar\n');
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material(`  smells: [{ aroma: /trade/x/aromas/tar, strength: 10 }, { aroma: ${TAR}, strength: 5 }]`),
    );
    expect(checkAromas(root)).toEqual([]);
  });

  it('refuses an aroma in a pack the namer does not depend on', () => {
    pack('trade-x');
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material(`  smells: [{ aroma: ${TAR}, strength: 10 }]`),
    );
    expect(checkAromas(root).join()).toMatch(/does not depend on/);
  });

  it('refuses a smell on a material that cannot hold one', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material(`  smells: [{ aroma: ${TAR}, strength: 10 }]`, '/platform/idea/material/Metal'),
    );
    expect(checkAromas(root).join()).toMatch(/cannot hold one/);
  });

  it('refuses a parent that is not an aroma path; a directory under aromas/ is part of the path', () => {
    write('base-library/content/aromas/smoke/pine-tar.yaml', 'parent: /base-library/aromas/tarr\n');
    write('base-library/content/aromas/smoke/kiln-tar.yaml', 'parent: /base-library/aromas/smoke/pine-tar\n');
    const found = checkAromas(root);
    expect(found.join()).toMatch(/parent names '\/base-library\/aromas\/tarr'/);
    expect(found).toHaveLength(1);
  });

  it('refuses a `word:` on an aroma or an odor: the path is the identity', () => {
    write('base-library/content/aromas/odd.yaml', 'word: odd\n');
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/DirtKind/x.yaml',
      'class: /platform/idea/DirtKind\ndata:\n  odor: { word: tar, ouPerLoad: 1 }\n',
    );
    const found = checkAromas(root).join();
    expect(found).toMatch(/an aroma has no `word:`/);
    expect(found).toMatch(/odor names an aroma by `aroma:`/);
  });

  it('refuses a medium nothing in reach carries, and passes one that is', () => {
    pack('trade-x', ['base-library']);
    write('trade-x/content/recipes/boil.yaml', 'recipeId: boil\nmedium: brine\n');
    expect(checkAromas(root).join()).toMatch(/medium 'brine'/);
    write(
      'trade-x/content/stuff/idea/material/salt-water.yaml',
      'class: /platform/idea/material/Metal\ndata:\n  tags: [brine]\n',
    );
    expect(checkAromas(root)).toEqual([]);
  });

  it('refuses a taste with no amount', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      'class: /platform/idea/material/Metal\ndata:\n  tastes: [sweet]\n',
    );
    expect(checkAromas(root).join()).toMatch(/no amount/);
  });
});
