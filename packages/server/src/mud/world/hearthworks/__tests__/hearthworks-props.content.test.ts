/**
 * The hearthworks venue names its trade rows and commons by TEMPLATE PATH
 * (`props:` / `cast:`), and content-packs wave 4a moved those rows into three
 * packs. A template row sits at the path its FILE mirrors under a pack's
 * `content/` (only documents derive from the manifest `root`) — so every
 * path a venue populates must be a file in SOME shipped pack at
 * `content<path>.yaml`. Found live on 2026-08-27: the trade rows shipped
 * from `content/obj/` landed at `/obj/anvil`, and the smithy's props list
 * threw `no template at '/trade/smithing/thing/iron-ingot'` on connect.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../../../../content/', import.meta.url));
const VENUE = join(CONTENT, 'hearthworks/content/world/hearthworks');

/** Every `.yaml` under the venue, recursively (branch subdirs). */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : f.endsWith('.yaml') ? [full] : [];
  });
}

function shippedFile(path: string): string | null {
  for (const pack of readdirSync(CONTENT)) {
    const f = join(CONTENT, pack, 'content', `${path.slice(1)}.yaml`);
    if (existsSync(f)) return f;
  }
  return null;
}

describe('the hearthworks venue pack props/cast rows the packs ship at those paths', () => {
  const venues = walk(VENUE);
  it('ships thirteen rows under branch subdirs', () => {
    expect(venues.map((f) => f.slice(VENUE.length + 1)).sort()).toEqual([
      'agent/cook.yaml', 'agent/smith.yaml', 'idea/business.yaml',
      'location/cellar.yaml', 'location/cookhouse.yaml', 'location/offstage.yaml', 'location/smithy.yaml', 'location/woodshed.yaml',
      'thing/forge-floor.yaml', 'thing/kitchen-menu.yaml', 'thing/pantry-chest.yaml', 'thing/smithy-menu.yaml',
    ]);
  });
  it('every props:/cast: path is a shipped template file (trade-smithing, generic-objects, the venue itself)', () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const file of venues) {
      const doc = YAML.parse(readFileSync(file, 'utf-8')) as {
        data?: { props?: unknown[]; cast?: unknown[] };
      };
      for (const spec of [...(doc.data?.props ?? []), ...(doc.data?.cast ?? [])]) {
        const path = typeof spec === 'string' ? spec : (spec as { template?: string }).template;
        if (!path) continue;
        seen.add(path);
        if (!shippedFile(path)) missing.push(`${file.slice(VENUE.length + 1)}: ${path}`);
      }
    }
    expect(missing).toEqual([]);
    // The re-cut, by path: the smithing trade's own rows, the commons, the venue's own.
    expect([...seen].filter((p) => p.startsWith('/trade/smithing/thing/')).sort()).toEqual([
      '/trade/smithing/thing/anvil', '/trade/smithing/thing/iron-ingot', '/trade/smithing/thing/spare-ingot',
      '/trade/smithing/thing/whetstone', '/trade/smithing/thing/workbench',
    ]);
    expect([...seen].filter((p) => p.startsWith('/stuff/thing/items/')).sort()).toEqual([
      '/stuff/thing/items/dry-log', '/stuff/thing/items/hide-stock', '/stuff/thing/items/plated-dish', '/stuff/thing/items/prime-cut',
      '/stuff/thing/items/ration-stock', '/stuff/thing/items/root-vegetables', '/stuff/thing/items/stew-meat', '/stuff/thing/items/wet-log',
    ]);
    expect([...seen].filter((p) => p.startsWith('/world/hearthworks/')).sort()).toEqual([
      '/world/hearthworks/agent/cook', '/world/hearthworks/agent/smith',
      '/world/hearthworks/thing/kitchen-menu', '/world/hearthworks/thing/pantry-chest', '/world/hearthworks/thing/smithy-menu',
    ]);
  });
});
