/**
 * PackController — the `pack` verb's dispatch-on-subcommand wrapper over
 * PackApi: routing per subcommand, the two controller-enforced rules
 * (`install` without `--dry-run` is rejected; `--keep` without `--pin`
 * does not exist), the three-body diff rendering, and usage on an
 * unknown subcommand. PackApi is stubbed; authorization is declarative
 * (`requiresPackInstaller` in pack.yaml) and tested with the validator.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PackController from '../PackController';
import { PackApi } from '../../../../api/pack';
import { MessageApi } from '../../../../api/message';
import { Idea } from '../../../../lib/stuff/Idea';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { PackReconcileResult } from '../../../../api/pack';

interface PackArgs extends CommandModel {
  subcommand?: string;
  packId?: string;
  path?: string;
  dryRun?: boolean;
  takePack?: boolean;
  keep?: boolean;
  pin?: boolean;
  export?: boolean;
}

const OK: PackReconcileResult = {
  packId: 'base-library',
  inserted: [],
  updated: ['/obj/material/spirit/gin'],
  adopted: [],
  deleted: [],
  kept: [],
  merged: [],
  archived: [],
  conflicts: [],
  pinnedSkipped: 0,
  normalized: 0,
  quantityTables: 0,
  documents: {},
  rehydrated: 1,
  failure: null,
  requires: {
    groupsCreated: [], groupsFound: [], titlesGranted: [], titlesKept: [],
    titlesMigrated: [], titleConflicts: [], membersAdded: [], skippedSold: [],
  },
  boot: { 'sync-read': 0, producer: 0 },
  staffed: false,
};

let note: ReturnType<typeof vi.fn>;
let told: string[];

function ctxFor(actor: Idea): CommandContext {
  note = vi.fn();
  return { commandGiver: actor as never, note } as unknown as CommandContext;
}

async function run(model: PackArgs): Promise<void> {
  const actor = makeStuffAtPath(() => new Idea(), '/obj/Avatar/dev');
  const ctrl = makeStuff(() => new PackController());
  await ctrl.execute(model, ctxFor(actor));
}

beforeEach(() => {
  vi.restoreAllMocks();
  told = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      told.push(String((m as { toString(): string }).toString()));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
});

afterEach(() => vi.restoreAllMocks());

const rejected = (reason: string) =>
  expect(note).toHaveBeenCalledWith(expect.objectContaining({ kind: 'controller-rejected', reason }));

describe('PackController routing', () => {
  it('provision <packId> → PackApi.provision; prints maintainers, groups and titles', async () => {
    const provision = vi.spyOn(PackApi, 'provision').mockResolvedValue({
      packId: 'world-seed',
      maintainers: { group: 'world-seed-maintainers', staffed: false, members: [] },
      groups: [{ name: 'duncan-hall', members: 1 }],
      titles: [{ extent: '/studio/eternal/duncan-hall', holder: "group 'duncan-hall'", outcome: 'held' }],
    });
    await run({ subcommand: 'provision', packId: 'world-seed' });
    expect(provision).toHaveBeenCalledWith('world-seed');
    const out = told.join('\n');
    expect(out).toContain('UNSTAFFED');
    expect(out).toContain('duncan-hall (1 member(s))');
    expect(out).toContain("/studio/eternal/duncan-hall — group 'duncan-hall' [held]");
    await run({ subcommand: 'provision' });
    rejected('pack-required');
  });

  it('status prints the staffing line and any title conflicts', async () => {
    vi.spyOn(PackApi, 'status').mockResolvedValue([
      {
        packId: 'p', discovered: true, manifestVersion: '0.1.0',
        maintainers: { group: 'p-maintainers', staffed: true },
        titleConflicts: ['/studio/x'],
        record: { version: '0.1.0', appliedAt: 'T', principal: 'bootstrap', status: 'applied', failure: null, pins: [], conflicts: [] },
      },
    ]);
    await run({ subcommand: 'status' });
    const out = told.join('\n');
    expect(out).toContain('maintainers: p-maintainers — staffed');
    expect(out).toContain('title conflict: /studio/x');
  });

  it('sync <packId> → PackApi.sync; defaults to base-library', async () => {
    const sync = vi.spyOn(PackApi, 'sync').mockResolvedValue(OK);
    await run({ subcommand: 'sync', packId: 'species-and-names' });
    expect(sync).toHaveBeenCalledWith('species-and-names');
    expect(note).not.toHaveBeenCalled();
    await run({ subcommand: 'sync' });
    expect(sync).toHaveBeenLastCalledWith('base-library');
  });

  it('status [<packId>] → PackApi.status, and always prints the pin line', async () => {
    const status = vi.spyOn(PackApi, 'status').mockResolvedValue([
      {
        packId: 'p',
        discovered: true,
        manifestVersion: '0.1.0',
      maintainers: { group: 'base-library-maintainers', staffed: false },
      titleConflicts: [],
        record: {
          version: '0.1.0',
          appliedAt: 'T',
          principal: 'bootstrap',
          status: 'applied',
          failure: null,
          pins: [],
          conflicts: [
            {
              path: '/obj/x',
              kind: 'domain',
              detectedAt: 'T',
              baselineHash: 'a',
              dbHash: 'b',
              packHash: 'c',
              reason: 'both-changed',
            },
          ],
        },
      },
    ]);
    await run({ subcommand: 'status', packId: 'p' });
    expect(status).toHaveBeenCalledWith('p');
    const out = told.join('\n');
    expect(out).toContain('0 row(s) pinned');
    expect(out).toContain('pack diff p /obj/x');
    expect(out).toContain('pack resolve p /obj/x');
  });

  it('install --dry-run → PackApi.dryRun; install without it is rejected', async () => {
    const dry = vi.spyOn(PackApi, 'dryRun').mockResolvedValue({
      packId: 'p',
      actions: [{ op: 'update', key: '/obj/x', kind: 'domain' }],
      conflicts: [],
      pinnedSkipped: 0,
    });
    await run({ subcommand: 'install', packId: 'p', dryRun: true });
    expect(dry).toHaveBeenCalledWith('p');
    expect(told.join('\n')).toContain('nothing written');
    expect(note).not.toHaveBeenCalled();

    await run({ subcommand: 'install', packId: 'p' });
    rejected('install-is-boot');
    expect(dry).toHaveBeenCalledTimes(1);
  });

  it('diff renders the three labeled sections', async () => {
    vi.spyOn(PackApi, 'diff').mockResolvedValue({
      packId: 'p',
      entries: [
        {
          path: '/obj/x',
          kind: 'domain',
          baseline: { hash: 'sha256:a', body: 'data:\n  v: 0\n' },
          yours: { hash: 'sha256:b', body: 'data:\n  v: 2\n' },
          theirs: { hash: 'sha256:c', body: 'data:\n  v: 1\n' },
        },
      ],
    });
    await run({ subcommand: 'diff', packId: 'p', path: '/obj/x' });
    const out = told.join('\n');
    expect(out).toContain('— baseline (as installed) —');
    expect(out).toContain('— yours (database) —');
    expect(out).toContain('— theirs (pack file) —');
    expect(out).toContain('v: 2');
  });

  it('resolve: exactly one mode; --keep without --pin does not exist', async () => {
    const resolve = vi.spyOn(PackApi, 'resolve').mockResolvedValue(null);
    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x', keep: true });
    rejected('keep-without-pin');
    expect(told.join('\n')).toContain('keeping means claiming');
    expect(resolve).not.toHaveBeenCalled();

    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x', takePack: true, export: true });
    rejected('one-mode-required');
    expect(resolve).not.toHaveBeenCalled();

    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x' });
    rejected('one-mode-required');

    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x', keep: true, pin: true });
    expect(resolve).toHaveBeenLastCalledWith('p', '/obj/x', 'keep-pin');
    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x', export: true });
    expect(resolve).toHaveBeenLastCalledWith('p', '/obj/x', 'export');
    resolve.mockResolvedValue(OK);
    await run({ subcommand: 'resolve', packId: 'p', path: '/obj/x', takePack: true });
    expect(resolve).toHaveBeenLastCalledWith('p', '/obj/x', 'take-pack');
    expect(told.at(-1)).toContain('resolved (took the pack)');
  });

  it('pin / unpin forward to PackApi', async () => {
    const pin = vi.spyOn(PackApi, 'pin').mockResolvedValue(['/obj/x']);
    const unpin = vi.spyOn(PackApi, 'unpin').mockResolvedValue([]);
    await run({ subcommand: 'pin', packId: 'p', path: '/obj/x' });
    expect(pin).toHaveBeenCalledWith('p', '/obj/x');
    await run({ subcommand: 'unpin', packId: 'p', path: '/obj/x' });
    expect(unpin).toHaveBeenCalledWith('p', '/obj/x');
    expect(note).not.toHaveBeenCalled();
  });

  it('an unknown subcommand → usage, controller-rejected, nothing called', async () => {
    const sync = vi.spyOn(PackApi, 'sync').mockResolvedValue(OK);
    await run({ subcommand: 'frob' });
    expect(sync).not.toHaveBeenCalled();
    rejected('unknown-subcommand');
    expect(told.join('\n')).toContain('usage:');
  });

  it('a sync failure emits controller-rejected', async () => {
    vi.spyOn(PackApi, 'sync').mockRejectedValue(new Error('requires class X'));
    await run({ subcommand: 'sync', packId: 'base-library' });
    rejected('sync-failed');
  });
});
