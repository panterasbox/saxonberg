/**
 * ⭐⭐ **No row anywhere authors an `air` Reserve** — the inert-budget
 * finding, closed.
 *
 * Seven rows authored `reserves: { air: … }` as a scope's combustion
 * oxygen budget. **Four of them could not hold it**: they are
 * `SingletonCartesianLocation` rows, and nothing in that chain composes
 * `ReservedMixin`, so the applier — which iterates persistent fields —
 * dropped the key. The fire driver's `airReserveOf` therefore answered
 * `null` and the room was *open air, unlimited*: the vintner cellar, the
 * brewing floor, the cold store and the Crowsfoot floor all meant to
 * displace their own air and none of them ever did. The ferment's cellar
 * CO₂ gate early-returned there too, for the same reason.
 *
 * The fire build derives a scope's air from its own OPENINGS, so all
 * seven behave identically now — and identically to the hundreds of
 * rooms that never authored one. This test is the ratchet: the key is
 * gone and may not come back, because a row that authors it would once
 * again be making a claim the engine does not read.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';

const PACKS = fileURLToPath(new URL('../../../', import.meta.url));

function* yamlFiles(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* yamlFiles(full);
    else if (entry.endsWith('.yaml')) yield full;
  }
}

describe('the air Reserve is retired', () => {
  it('no content row in any pack authors one', () => {
    const offenders: string[] = [];
    for (const pack of readdirSync(PACKS)) {
      for (const file of yamlFiles(join(PACKS, pack, 'content'))) {
        let doc: { data?: { reserves?: Record<string, unknown> } } | null;
        try {
          doc = YAML.parse(readFileSync(file, 'utf8'));
        } catch {
          continue;
        }
        const reserves = doc?.data?.reserves;
        if (reserves && Object.prototype.hasOwnProperty.call(reserves, 'air')) {
          offenders.push(file.substring(PACKS.length));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('⭐ and the scan itself works — it would catch one', () => {
    // The premise, asserted. A scan that silently matched nothing would
    // pass for the wrong reason, which is the shape of defect this whole
    // finding WAS: a key nobody read, reported by nobody.
    const doc = YAML.parse(
      'data:\n  reserves:\n    air:\n      capacityValue: 100\n',
    ) as { data?: { reserves?: Record<string, unknown> } };
    expect(
      Object.prototype.hasOwnProperty.call(doc.data?.reserves ?? {}, 'air'),
    ).toBe(true);
  });

  it('⚠ other reserves are untouched — a fuel reserve is a different thing', () => {
    // ⭐ The guard against over-reading the finding. `fuel` on a
    // `Combustible` is the object-IS-the-fuel path and stays (the log, the
    // bale); only the SCOPE's oxygen budget was the thing that could not
    // be held. The scan above is keyed on `air` for exactly that reason.
    let sawFuel = false;
    for (const pack of readdirSync(PACKS)) {
      for (const file of yamlFiles(join(PACKS, pack, 'content'))) {
        let doc: { data?: { reserves?: Record<string, unknown> } } | null;
        try {
          doc = YAML.parse(readFileSync(file, 'utf8'));
        } catch {
          continue;
        }
        if (doc?.data?.reserves?.['fuel'] !== undefined) sawFuel = true;
      }
    }
    expect(sawFuel).toBe(true);
  });
});
