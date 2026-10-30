/**
 * The pack is born (ceramics W0): its manifest names its root and its
 * three Disciplines resolve as rows. Later waves fill the trade.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const pack = join(here, '..', '..');

describe('trade-ceramics', () => {
  it('holds its own root', () => {
    const manifest = parse(readFileSync(join(pack, 'pack.yaml'), 'utf8')) as { id: string; root: string };
    expect(manifest.id).toBe('trade-ceramics');
    expect(manifest.root).toBe('/trade/ceramics');
  });

  it('ships brickmaking, pottery and masonry', () => {
    const dir = join(pack, 'content', 'trade', 'ceramics', 'idea', 'Discipline');
    const keys = readdirSync(dir)
      .map((f) => (parse(readFileSync(join(dir, f), 'utf8')) as { data: { key: string } }).data.key)
      .sort();
    expect(keys).toEqual(['brickmaking', 'masonry', 'pottery']);
  });
});
