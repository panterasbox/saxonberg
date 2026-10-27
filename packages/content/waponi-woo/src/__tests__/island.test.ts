/**
 * The island's rows agree (sugar W5): warm enough for cane, reachable by
 * sea, and every room it names is one it ships.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '../../content');
const W = '/world/terminus/waponi-woo';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
  });
}
const row = (path: string) => YAML.parse(readFileSync(join(CONTENT, `${path}.yaml`), 'utf8'));

describe('Waponi Woo', () => {
  it('⭐ is warm: 30° on the smaller world, an island (no continentality)', () => {
    const zone = row(W);
    expect(zone.data.latitude).toBe(30);
    expect(zone.data.continentality).toBe(0);
  });

  it('⭐ is reachable by sea: the Greywater node lands at the landing, and the landing has a way aboard', () => {
    const node = YAML.parse(
      readFileSync(join(CONTENT, '../../world-seed/content/stuff/idea/WaterExpanse/greywater/waponi-woo.yaml'), 'utf8'),
    );
    expect(node.data.kind).toBe('place');
    expect(node.data.destination).toBe(`${W}/location/landing`);
    expect(node.data.focus.theta).toBe(180);
    const landing = row(`${W}/location/landing`);
    expect(landing.data.exits.aboard.kind).toBe('/platform/idea/exits/aboard');
  });

  it('every exit inside the island names a room the island ships', () => {
    for (const file of walk(join(CONTENT, 'world/terminus/waponi-woo'))) {
      const r = YAML.parse(readFileSync(file, 'utf8'));
      for (const exit of Object.values((r?.data?.exits ?? {}) as Record<string, { destination?: string }>)) {
        const dest = exit.destination ?? '';
        if (!dest.startsWith(W)) continue;
        expect(existsSync(join(CONTENT, `${dest}.yaml`)), `${file} → ${dest}`).toBe(true);
      }
    }
  });

  it('the estate is a business with a named owner, and its store buys cane', () => {
    const estate = row(`${W}/idea/estate`);
    expect(estate.data.appointingAuthority.path).toBe(`${W}/agent/owner`);
    const stock = row(`${W}/thing/stock`);
    const cane = stock.data.stockLines.find((l: { itemTemplatePath: string }) => l.itemTemplatePath.endsWith('/crop/cane'));
    expect(cane.buys).toBe(true);
  });
});
