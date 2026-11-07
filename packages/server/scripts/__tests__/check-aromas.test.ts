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
  write('base-library/content/stuff/idea/aroma/tar.yaml', 'class: /platform/idea/Aroma\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const material = (data: string, cls = '/platform/idea/material/OdorousMaterial') =>
  `class: ${cls}\ndata:\n${data}\n`;

describe('lint:aromas', () => {
  it('passes a row whose word resolves in a dependency', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material('  smells: [{ word: tar, strength: 10 }]'),
    );
    expect(checkAromas(root)).toEqual([]);
  });

  it('refuses a misspelled word', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material('  smells: [{ word: tarr, strength: 10 }]'),
    );
    expect(checkAromas(root).join()).toMatch(/'tarr', which has no row/);
  });

  it('refuses a word in a pack the namer does not depend on', () => {
    pack('trade-x');
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material('  smells: [{ word: tar, strength: 10 }]'),
    );
    expect(checkAromas(root).join()).toMatch(/does not depend on/);
  });

  it('refuses a smell on a material that cannot hold one', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      material('  smells: [{ word: tar, strength: 10 }]', '/platform/idea/material/Material'),
    );
    expect(checkAromas(root).join()).toMatch(/cannot hold one/);
  });

  it('refuses a medium nothing in reach carries, and passes one that is', () => {
    pack('trade-x', ['base-library']);
    write('trade-x/content/recipes/boil.yaml', 'recipeId: boil\nmedium: brine\n');
    expect(checkAromas(root).join()).toMatch(/medium 'brine'/);
    write(
      'trade-x/content/stuff/idea/material/salt-water.yaml',
      'class: /platform/idea/material/Material\ndata:\n  tags: [brine]\n',
    );
    expect(checkAromas(root)).toEqual([]);
  });

  it('refuses a taste with no amount', () => {
    pack('trade-x', ['base-library']);
    write(
      'trade-x/content/stuff/idea/material/x.yaml',
      'class: /platform/idea/material/Material\ndata:\n  tastes: [sweet]\n',
    );
    expect(checkAromas(root).join()).toMatch(/no amount/);
  });
});
