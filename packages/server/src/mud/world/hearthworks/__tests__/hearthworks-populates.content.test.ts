/**
 * The hearthworks venue names its trade rows and commons by TEMPLATE PATH
 * (`populates:`), and content-packs wave 4a moved those rows into three
 * packs. A template row sits at the path its FILE mirrors under a pack's
 * `content/` (only documents derive from the manifest `root`) — so every
 * path a venue populates must be a file in SOME shipped pack at
 * `content<path>.yaml`. Found live on 2026-08-27: the trade rows shipped
 * from `content/obj/` landed at `/obj/anvil`, and the smithy's populates
 * threw `no template at '/trade/smithing/obj/iron-ingot'` on connect.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../../../../content/', import.meta.url));
const VENUE = join(CONTENT, 'world-seed/content/world/hearthworks');

function shippedFile(path: string): string | null {
  for (const pack of readdirSync(CONTENT)) {
    const f = join(CONTENT, pack, 'content', `${path.slice(1)}.yaml`);
    if (existsSync(f)) return f;
  }
  return null;
}

describe('the hearthworks venue (world-seed) populates rows the packs ship at those paths', () => {
  const venues = readdirSync(VENUE).filter((f) => f.endsWith('.yaml'));
  it('every populates: path is a shipped template file (trade-smithing, generic-objects, world-seed)', () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const file of venues) {
      const doc = YAML.parse(readFileSync(join(VENUE, file), 'utf-8')) as { data?: { populates?: unknown[] } };
      for (const spec of doc.data?.populates ?? []) {
        const path = typeof spec === 'string' ? spec : (spec as { template?: string }).template;
        if (!path) continue;
        seen.add(path);
        if (!shippedFile(path)) missing.push(`${file}: ${path}`);
      }
    }
    expect(missing).toEqual([]);
    // The re-cut, by path: the smithing trade's own rows, the commons, the venue's own.
    expect([...seen].filter((p) => p.startsWith('/trade/smithing/obj/')).sort()).toEqual([
      '/trade/smithing/obj/anvil', '/trade/smithing/obj/iron-ingot', '/trade/smithing/obj/spare-ingot',
      '/trade/smithing/obj/whetstone', '/trade/smithing/obj/workbench',
    ]);
    expect([...seen].filter((p) => p.startsWith('/obj/items/')).sort()).toEqual([
      '/obj/items/dry-log', '/obj/items/hide-stock', '/obj/items/plated-dish', '/obj/items/prime-cut',
      '/obj/items/ration-stock', '/obj/items/root-vegetables', '/obj/items/stew-meat', '/obj/items/wet-log',
    ]);
  });
});
