/**
 * ⭐⭐ **A content edit cannot mint or alter a title** (metal chain R4).
 *
 * The governing security invariant, and it is structural rather than
 * procedural: title lives in the gated `parcels` collection, **stored
 * separately from the `content` rows it gates** — because if title lived
 * beside the thing it governs, editing the thing could edit who may edit
 * it. `ParcelApi.ownerOf` resolves a path to a holder by longest prefix,
 * and every content-write authorisation in the system bottoms out there.
 *
 * A mining claim is the sharpest test of that, because staking is the one
 * act in the game that CREATES title from nothing but standing somewhere:
 * `stake` is a first-come registration over ground, not a purchase from a
 * catalogue of lots somebody laid out. If content could confer title, a
 * player who can edit a room could award themselves the mine.
 *
 * ⚠ This asserts the shape a reviewer can check by reading, not a
 * runtime path: no shipped row carries an ownership key, and the staking
 * verb reaches title only through the gated Api.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, '..', '..', '..');

/**
 * Keys that would confer or describe ownership if a row could carry
 * them. `ownerGroup`/`accessGroups` are the historical ones — they lived
 * on the editable zone template until property phase 0a moved title into
 * `parcels`, which is the precedent this guards.
 */
const OWNERSHIP_KEYS = [
  'ownerGroup',
  'ownerGroupName',
  'accessGroups',
  'owner',
  'holder',
  'title',
  'parcelOwner',
];

function rowsUnder(pack: string): Array<{ file: string; data: Record<string, unknown> }> {
  const out: Array<{ file: string; data: Record<string, unknown> }> = [];
  const root = join(PACKS, pack, 'content');
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${rel}/${entry}`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      try {
        const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        const data = (doc?.data ?? null) as Record<string, unknown> | null;
        if (data && typeof data === 'object') out.push({ file: `${rel}/${entry}`, data });
      } catch {
        // A row that does not parse is another gate's problem.
      }
    }
  };
  walk(root, pack);
  return out;
}

describe('title is not content (metal chain R4)', () => {
  const rows = [...rowsUnder('trade-mining'), ...rowsUnder('rejection')];

  it('⚠ the scan reads a real corpus — it would pass identically finding nothing', () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  it('⭐ no shipped row of the mine or its town carries an ownership key', () => {
    const offenders: string[] = [];
    for (const { file, data } of rows) {
      for (const key of OWNERSHIP_KEYS) {
        if (key in data) offenders.push(`${file}: ${key}`);
      }
    }
    expect(
      offenders,
      `content rows conferring title:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⭐⭐ title lives in its OWN collection, never beside the content it gates', () => {
    // The two are distinct collections by name, which is the whole of the
    // invariant: an editor with write access to one has none to the other.
    expect(Collections.Parcels).toBe('parcels');
    expect(Collections.Parcels).not.toBe(Collections.Content);
  });

  it('⭐ `stake` reaches title ONLY through the gated Api, and mints no room', () => {
    const src = readFileSync(
      join(PACKS, 'trade-mining', 'src', 'idea', 'cmd', 'mining', 'StakeController.ts'),
      'utf8',
    );
    // It registers title…
    expect(src).toMatch(/ParcelApi\.subdivide\(/);
    expect(src).toMatch(/ParcelApi\.ownerOf\(/);
    /*
     * …and mints NO room. A claim is a title over ground and nothing
     * else — that is the difference between `stake` and `title buy`, and
     * it is why a claim block's `parcelExtent` is deliberately allowed to
     * name ground no template backs (`IGNORED_PATH_FIELDS`).
     */
    expect(src).not.toMatch(/StuffApi\.clone\(/);
    // Nor does it write the collection directly — no path around the gate.
    expect(src).not.toMatch(/Collections\.Parcels/);
    expect(src).not.toMatch(/parcel_events/);
  });
});
