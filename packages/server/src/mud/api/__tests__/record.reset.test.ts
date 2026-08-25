/**
 * The nightly reset — a destructive job, tested as one.
 *
 * ⚠⚠ There is no reflog. So the suite asserts BOTH directions, and the
 * second is the one that matters: not only *does the survivor survive*
 * but *does a representative row from every wiped collection actually
 * go*. A wipe that quietly takes one category too many and a wipe that
 * quietly leaves one behind are indistinguishable from working, and
 * only the paired assertion tells them apart.
 *
 * The disposition table is TOTAL over `Collections`, so this suite
 * seeds one row into every collection and checks the outcome against
 * the table rather than against a hand-written list — a new collection
 * is covered the day it exists.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecordApi } from '../record';
import { AccessApi } from '../access';
import { Collections } from '../../lib/persistence/Collections';
import { RESET_DISPOSITIONS } from '../../lib/persistence/ResetPolicy';
import { RELEASE_DOCUMENT_KIND } from '../../lib/press/Release';
import {
  installRecordTestDb,
  type RecordTestDb,
} from '../../lib/persistence/__tests__/record-test-db';

let db: RecordTestDb;

const ALL = Object.keys(RESET_DISPOSITIONS) as Collections[];

/** One representative row in every collection the world persists into. */
function seedTheWorld(): void {
  for (const name of ALL) {
    db.seed(name, [{ marker: `row-in-${name}` }]);
  }
  // Plus the one row the survivors list names, in the collection that
  // is otherwise wiped — the whole point of `wipe-except`.
  db.seed(Collections.Documents, [
    { kind: RELEASE_DOCUMENT_KIND, marker: 'a published release' },
  ]);
}

function rowsIn(name: Collections): Array<Record<string, unknown>> {
  return db.all(name);
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installRecordTestDb();
  db.reset();
  RecordApi._clearAllForTesting();
  // The re-seed is a separate concern with its own suite; stub it so a
  // failure there cannot be mistaken for a failure of the wipe.
  vi.spyOn(AccessApi, 'reseedSystemGroups').mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  RecordApi._clearAllForTesting();
  vi.restoreAllMocks();
});

describe('the reset policy table', () => {
  it('covers every collection, with a reason on every survivor', () => {
    for (const name of Object.values(Collections)) {
      const d = RESET_DISPOSITIONS[name];
      expect(d, `no reset disposition for '${name}'`).toBeDefined();
      if (d.verb !== 'wipe') {
        expect(
          d.because.length,
          `'${name}' survives the reset without stating why`,
        ).toBeGreaterThan(20);
      }
    }
  });
});

describe('a dry run', () => {
  it('changes NOTHING', async () => {
    seedTheWorld();
    const before = ALL.map((c) => rowsIn(c).length);

    const report = await RecordApi.wipe({ dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(ALL.map((c) => rowsIn(c).length)).toEqual(before);
  });

  it('counts what it WOULD remove, on the same predicate', async () => {
    seedTheWorld();
    const report = await RecordApi.wipe({ dryRun: true });
    const dryTotal = report.removed;

    const enforced = await RecordApi.wipe({ dryRun: false });
    expect(enforced.removed).toBe(dryTotal);
  });

  it('is the DEFAULT — an argument-free call removes nothing', async () => {
    seedTheWorld();
    const report = await RecordApi.wipe();
    expect(report.dryRun).toBe(true);
    expect(rowsIn(Collections.Users)).toHaveLength(1);
  });
});

describe('an enforced run', () => {
  beforeEach(() => {
    seedTheWorld();
  });

  it('leaves published releases, and nothing else in `documents`', async () => {
    await RecordApi.wipe({ dryRun: false });

    const left = rowsIn(Collections.Documents);
    expect(left).toHaveLength(1);
    expect(left[0]!.kind).toBe(RELEASE_DOCUMENT_KIND);
    expect(left[0]!.marker).toBe('a published release');
  });

  it('removes a representative row from EVERY wiped collection', async () => {
    await RecordApi.wipe({ dryRun: false });

    const survivors: string[] = [];
    for (const name of ALL) {
      if (RESET_DISPOSITIONS[name].verb !== 'wipe') continue;
      if (rowsIn(name).length > 0) survivors.push(name);
    }
    expect(
      survivors,
      `these collections were marked 'wipe' but kept rows`,
    ).toEqual([]);
  });

  it('leaves every KEPT collection completely alone', async () => {
    await RecordApi.wipe({ dryRun: false });

    const lost: string[] = [];
    for (const name of ALL) {
      if (RESET_DISPOSITIONS[name].verb !== 'keep') continue;
      if (rowsIn(name).length !== 1) lost.push(name);
    }
    expect(lost, `these collections are 'keep' but lost rows`).toEqual([]);
  });

  it('keeps the world itself — the seeder is insert-only', async () => {
    await RecordApi.wipe({ dryRun: false });
    // Named separately from the loop above because this is the ⚠ in the
    // requirements: "wipe everything" read literally empties the world,
    // which is a broken game rather than a reset one.
    expect(rowsIn(Collections.Content)).toHaveLength(1);
    expect(rowsIn(Collections.AppSettings)).toHaveLength(1);
    expect(rowsIn(Collections.WorldState)).toHaveLength(1);
  });

  it('re-establishes the system groups it just deleted', async () => {
    await RecordApi.wipe({ dryRun: false });
    // The groups collection IS wiped — and left that way, every
    // resource-targeted access read fails closed until a restart. The
    // re-seed is part of the job, not an operator's memory.
    expect(rowsIn(Collections.Groups)).toHaveLength(0);
    expect(AccessApi.reseedSystemGroups).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-seed on a dry run', async () => {
    await RecordApi.wipe({ dryRun: true });
    expect(AccessApi.reseedSystemGroups).not.toHaveBeenCalled();
  });

  it('takes the frame store with everything else', async () => {
    await RecordApi.wipe({ dryRun: false });
    expect(rowsIn(Collections.PlayerFrames)).toHaveLength(0);
  });
});
