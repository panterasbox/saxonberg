/**
 * Packs SEED, they do not OWN (content packs wave 4b, D7): a venue pack's
 * rows are an initial condition, not a continuing assertion. A venue row
 * the DB has changed and the file has not (the owner renamed the bar,
 * refit a room) is `kept` by the three-way reconcile with its baseline
 * untouched; a file change against an unedited row still `updated`s it
 * (trade updates reach venues); both changed differently → `conflict`,
 * DB untouched. No installer mechanism — this is the existing
 * file-same / DB-changed cell, asserted in the venue framing.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  recordOf,
  writePack,
  writeDomainFile,
  cleanupPacks,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const BAR_REL = 'studio/x/location/bar.yaml';
const BAR = '/studio/x/location/bar';
const KEEPER_REL = 'studio/x/agent/keeper.yaml';
const KEEPER = '/studio/x/agent/keeper';

const barFile = (name: string) => ({ rel: BAR_REL, data: { name, props: ['/trade/y/thing/stool'] } });

/** A synthetic venue pack: two rows under branch subdirs, its own claim. */
async function installVenue(): Promise<string> {
  const root = writePack('venue', [barFile("Dave's Bar"), { rel: KEEPER_REL, data: { name: 'Dave' } }], {
    root: '/studio/x',
    manifest: {
      requires: {
        groups: [{ name: 'x', purpose: 'the venue' }],
        title: [{ extent: '/studio/x', holder: { group: 'x' } }],
      },
    },
  });
  const [r] = await PackApi.install([root]);
  expect(r!.inserted.sort()).toEqual([KEEPER, BAR].sort());
  return root;
}

const barRow = () => contentRows().find((r) => r.path === BAR)!;
const barName = () => (barRow().data as { name: string }).name;

describe('a venue pack seeds, it does not own', () => {
  it("the owner renamed the bar, the file did not change → kept, baseline untouched, the DB's name stands", async () => {
    const root = await installVenue();
    const baseline = recordOf('venue')!.rows[BAR]!.hash;
    (barRow().data as { name: string }).name = "Mara's";
    const before = structuredClone(store.rows);

    const r = await PackApi.sync('venue', root);

    expect(r.kept).toEqual([BAR]);
    expect(r.updated).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(barName()).toBe("Mara's");
    expect(recordOf('venue')!.rows[BAR]!.hash).toBe(baseline);
    // The keeper (unchanged both sides) is not even mentioned.
    expect(r.inserted).toEqual([]);
    expect(r.deleted).toEqual([]);
    const after = store.rows.map((x) => ({ ...x, appliedAt: undefined }));
    expect(after.filter((x) => x.path === BAR)).toEqual(
      before.map((x) => ({ ...x, appliedAt: undefined })).filter((x) => x.path === BAR),
    );
  });

  it('the file changed, the DB did not → updated: trade and venue updates still land', async () => {
    const root = await installVenue();
    const baseline = recordOf('venue')!.rows[BAR]!.hash;
    writeDomainFile(root, barFile("Dave's Bar & Grill"));

    const r = await PackApi.sync('venue', root);

    expect(r.updated).toEqual([BAR]);
    expect(r.kept).toEqual([]);
    expect(barName()).toBe("Dave's Bar & Grill");
    expect(recordOf('venue')!.rows[BAR]!.hash).not.toBe(baseline);
  });

  it('both changed differently → conflict; the DB row is not touched', async () => {
    const root = await installVenue();
    (barRow().data as { name: string }).name = "Mara's";
    writeDomainFile(root, barFile("Dave's Bar & Grill"));

    const r = await PackApi.sync('venue', root);

    expect(r.conflicts).toEqual([BAR]);
    expect(r.updated).toEqual([]);
    expect(r.kept).toEqual([]);
    expect(barName()).toBe("Mara's");
    expect(recordOf('venue')!.conflicts).toHaveLength(1);
  });
});
