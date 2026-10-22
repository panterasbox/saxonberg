/**
 * Boat — ⭐ a small craft is a THING in a water room (river D19–D24, D38):
 * not positioned, not voyaging, its zone null for life; driven by what it
 * carries; swamped by water rougher than its freeboard; righted by a pull.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Boat from '../thing/Boat';
import Propulsion from '../thing/Propulsion';

const CONTENT_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** Every `.yaml` under a directory, recursively. */
function yamlFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yamlFiles(p, out);
    else if (name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

describe('Boat (river D19, D38)', () => {
  it('is a thing you sit in: not positioned, not voyaging — its position is its container’s', () => {
    const boat = makeStuff(() => new Boat());
    expect(MixinApi.isPositioned(boat)).toBe(false);
    expect(MixinApi.isVoyaging(boat)).toBe(false);
    expect(MixinApi.isPullable(boat)).toBe(true);
  });

  it('⭐⭐ every Boat row in every pack is a transport KIND row — so its zone is null for life', () => {
    const offenders: string[] = [];
    for (const file of yamlFiles(CONTENT_ROOT)) {
      if (!file.includes(`${'/content/'}`)) continue;
      let doc: { class?: string } | null = null;
      try {
        doc = YAML.parse(readFileSync(file, 'utf8')) as { class?: string } | null;
      } catch {
        continue;
      }
      if (doc?.class !== '/system/transport/thing/Boat') continue;
      if (!file.includes('/transport/content/system/transport/thing/')) offenders.push(file);
    }
    expect(offenders, 'a boat row under a venue would be zoned, and stuck at its first landing').toEqual([]);
  });

  it('is driven by the crew-powered part it carries', () => {
    const boat = makeStuff(() => new Boat());
    expect(boat.propulsion()).toBeNull();
    const paddle = makeStuff(() => new Propulsion());
    vi.spyOn(boat, 'getContents').mockReturnValue([paddle as never]);
    expect(boat.propulsion()).toBe(paddle);
    paddle.crewPowered = false;
    expect(boat.propulsion()).toBeNull();
  });

  it('⭐ freeboard falls with what she carries', () => {
    const boat = makeStuff(() => new Boat());
    boat.setHull({ lengthM: 5, beamM: 0.9, freeboardM: 0.3 });
    const empty = boat.freeboardNowM();
    vi.spyOn(boat, 'getContents').mockReturnValue([
      { getMass: () => ({ rawValue: () => 160 }), isTangible: () => true } as never,
    ]);
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true);
    expect(boat.freeboardNowM()).toBeLessThan(empty);
  });

  it('upside down, a pull rights her and holds you up; the right way up there is nothing to pull', async () => {
    const boat = makeStuff(() => new Boat());
    const puller = makeStuff(() => new Boat());
    const no = await boat.pullBy(puller as never, null);
    expect(no.ok).toBe(false);
    (boat as unknown as { _capsized: boolean })._capsized = true;
    const yes = await boat.pullBy(puller as never, null);
    expect(yes.ok).toBe(true);
    expect(boat.isCapsized()).toBe(false);
  });
});
