/**
 * The ops surface (pack-installer W1.6): dry-run (zero writes, by
 * construction), status, the three-body diff, the three resolve modes,
 * and pin / unpin.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { PackApi } from '../../../api/pack';
import { DiagnosticApi } from '../../../api/diagnostics';
import { StuffApi } from '../../../api/stuff';
import { TemplateApi } from '../../../api/template';
import {
  MATERIAL,
  HYDRATOR,
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

const GIN_REL = 'obj/material/spirit/gin.yaml';
const GIN = '/obj/material/spirit/gin';
const RUM_REL = 'obj/material/spirit/rum.yaml';

/** Install, then create a both-changed conflict at gin. Returns the root. */
async function conflicted(): Promise<string> {
  const root = writePack('p', [{ rel: GIN_REL, data: { name: 'gin', v: 0 } }]);
  await PackApi.install([root]);
  writeDomainFile(root, { rel: GIN_REL, data: { name: 'gin', v: 1 } });
  contentRows().find((r) => r.path === GIN)!.data = { name: 'gin', v: 2 };
  await PackApi.sync('p', root);
  expect(recordOf('p')!.conflicts).toHaveLength(1);
  return root;
}

describe('dry-run', () => {
  it('reports the exact change set and writes nothing', async () => {
    const root = writePack('p', [{ rel: GIN_REL, data: { v: 0 } }, { rel: RUM_REL }]);
    await PackApi.install([root]);
    // file edit (update), DB edit on rum (keep), new file (insert), pin.
    writeDomainFile(root, { rel: GIN_REL, data: { v: 1 } });
    contentRows().find((r) => r.path === '/obj/material/spirit/rum')!.data = { edited: true };
    writeDomainFile(root, { rel: 'obj/material/spirit/vodka.yaml' });
    recordOf('p')!.pins.push('/obj/material/spirit/rum');

    const before = structuredClone(store.rows);
    const plan = await PackApi.dryRun('p', root);
    expect(store.rows).toEqual(before); // DB hash-identical
    expect(plan.packId).toBe('p');
    expect(
      plan.actions.map((a) => `${a.op} ${a.key}`).sort(),
    ).toEqual([
      'insert /obj/material/spirit/vodka',
      'pinned-skip /obj/material/spirit/rum',
      'update /obj/material/spirit/gin',
    ]);
    expect(plan.pinnedSkipped).toBe(1);
    expect(plan.conflicts).toEqual([]);
  });

  it('reports a would-be conflict without writing it', async () => {
    const root = writePack('p', [{ rel: GIN_REL, data: { v: 0 } }]);
    await PackApi.install([root]);
    writeDomainFile(root, { rel: GIN_REL, data: { v: 1 } });
    contentRows()[0]!.data = { v: 2 };
    const plan = await PackApi.dryRun('p', root);
    expect(plan.conflicts).toEqual([GIN]);
    expect(recordOf('p')!.conflicts).toEqual([]); // not recorded by a dry run
  });
});

describe('status', () => {
  it('joins manifests with records: conflicts, pins, failure', async () => {
    const root = await conflicted();
    await PackApi.pin('p', '/obj/material/spirit/other');
    // `status` discovers from server deps (real packs) + records; our
    // fixture pack is recorded-but-undiscovered.
    const [s] = await PackApi.status('p');
    expect(s).toMatchObject({
      packId: 'p',
      discovered: false,
      manifestVersion: null,
    });
    expect(s!.record!.status).toBe('applied');
    expect(s!.record!.principal).toBe('bootstrap');
    expect(s!.record!.pins).toEqual(['/obj/material/spirit/other']);
    expect(s!.record!.conflicts.map((c) => c.path)).toEqual([GIN]);
    expect(existsSync(root)).toBe(true);
  });

  it('lists the shipped packs as discovered-but-unrecorded on a fresh store', async () => {
    const all = await PackApi.status();
    const base = all.find((s) => s.packId === 'base-library')!;
    expect(base.discovered).toBe(true);
    expect(base.manifestVersion).toBeTruthy();
    expect(base.record).toBeNull();
  });
});

describe('diff', () => {
  it('returns three distinct bodies whose hashes match the record triple', async () => {
    const root = await conflicted();
    const c = recordOf('p')!.conflicts[0]!;
    const d = await PackApi.diff('p', GIN, root);
    expect(d.entries).toHaveLength(1);
    const e = d.entries[0]!;
    expect(e.kind).toBe('domain');
    expect(e.baseline!.hash).toBe(c.baselineHash);
    expect(e.yours!.hash).toBe(c.dbHash);
    expect(e.theirs!.hash).toBe(c.packHash);
    expect(new Set([e.baseline!.body, e.yours!.body, e.theirs!.body]).size).toBe(3);
    expect(e.baseline!.body).toContain('v: 0');
    expect(e.yours!.body).toContain('v: 2');
    expect(e.theirs!.body).toContain('v: 1');
  });

  it('with no path, covers every open conflict', async () => {
    const root = await conflicted();
    const d = await PackApi.diff('p', undefined, root);
    expect(d.entries.map((e) => e.path)).toEqual([GIN]);
  });
});

describe('resolve', () => {
  it('take-pack: writes the file row, rebaselines, clears, re-hydrates', async () => {
    const root = await conflicted();
    const inst = { fake: true };
    vi.spyOn(StuffApi, 'findAllByTemplatePath').mockReturnValue([inst] as never);
    const restore = vi.spyOn(TemplateApi, 'restoreFromTemplate').mockResolvedValue(undefined as never);
    const r = await PackApi.resolve('p', GIN, 'take-pack', root);
    expect(r!.updated).toEqual([GIN]);
    expect(r!.rehydrated).toBe(1);
    expect(restore).toHaveBeenCalledWith(inst);
    expect(contentRows()[0]!.data).toEqual({ name: 'gin', v: 1 });
    const rec = recordOf('p')!;
    expect(rec.conflicts).toEqual([]);
    expect(JSON.parse(rec.rows[GIN]!.body).data).toEqual({ name: 'gin', v: 1 });
    const again = await PackApi.sync('p', root);
    expect([...again.updated, ...again.kept, ...again.conflicts]).toEqual([]);
  });

  it('keep-pin: records the pin; the next sync skips the row and touches nothing', async () => {
    const root = await conflicted();
    const r = await PackApi.resolve('p', GIN, 'keep-pin', root);
    expect(r).toBeNull();
    const rec = recordOf('p')!;
    expect(rec.pins).toEqual([GIN]);
    expect(rec.conflicts).toEqual([]);
    const before = structuredClone(contentRows());
    const s = await PackApi.sync('p', root);
    expect(s.pinnedSkipped).toBe(1);
    expect(s.conflicts).toEqual([]);
    expect(contentRows()).toEqual(before);
  });

  it('export: writes the DB row to the workspace file; the next sync converges and clears', async () => {
    const root = await conflicted();
    const r = await PackApi.resolve('p', GIN, 'export', root);
    expect(r).toBeNull();
    const file = join(root, 'content', GIN_REL);
    const written = YAML.parse(readFileSync(file, 'utf-8'));
    expect(written).toEqual({
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'gin', v: 2 },
    });
    expect(recordOf('p')!.conflicts).toHaveLength(1); // stays open until sync
    const s = await PackApi.sync('p', root);
    expect(s.conflicts).toEqual([]);
    expect(s.updated).toEqual([]);
    expect(recordOf('p')!.conflicts).toEqual([]);
  });
});

describe('pin / unpin', () => {
  it('round-trips, and an unpin lets the hidden conflict resurface', async () => {
    const root = await conflicted();
    expect(await PackApi.pin('p', GIN)).toEqual([GIN]);
    expect(recordOf('p')!.conflicts).toEqual([]);
    expect((await PackApi.sync('p', root)).pinnedSkipped).toBe(1);
    expect(await PackApi.unpin('p', GIN)).toEqual([]);
    const s = await PackApi.sync('p', root);
    expect(s.pinnedSkipped).toBe(0);
    expect(s.conflicts).toEqual([GIN]);
  });
});
