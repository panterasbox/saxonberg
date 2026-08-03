/**
 * PackController — the `pack sync <packId>` author verb. Asserts the
 * dispatch-on-subcommand wrapper: a `sync` forwards to PackApi.sync (with the
 * default packId when omitted); a bad subcommand and a sync failure both emit
 * a `controller-rejected` note without invoking PackApi.sync twice. Developer
 * gating is declarative (pack.yaml's requiresWizard validator), enforced by
 * the dispatcher, not re-tested here.
 */

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
}

const OK: PackReconcileResult = {
  packId: 'base-library',
  inserted: [],
  updated: ['/obj/material/spirit/gin'],
  adopted: [],
  deleted: [],
  quantityTables: 0,
  nameBanks: 0,
  rehydrated: 1,
};

let note: ReturnType<typeof vi.fn>;

function ctxFor(actor: Idea): CommandContext {
  note = vi.fn();
  return { commandGiver: actor as never, note } as unknown as CommandContext;
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Stub the message scene so `tell` doesn't need a real Sensor.
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('PackController', () => {
  it('pack sync <packId> → forwards to PackApi.sync, no rejection', async () => {
    const sync = vi.spyOn(PackApi, 'sync').mockResolvedValue(OK);
    const actor = makeStuffAtPath(() => new Idea(), '/obj/Avatar/dev');
    const ctrl = makeStuff(() => new PackController());
    await ctrl.execute({ subcommand: 'sync', packId: 'base-library' } as PackArgs, ctxFor(actor));
    expect(sync).toHaveBeenCalledWith('base-library');
    expect(note).not.toHaveBeenCalled();
  });

  it('defaults packId to base-library when omitted', async () => {
    const sync = vi.spyOn(PackApi, 'sync').mockResolvedValue(OK);
    const actor = makeStuffAtPath(() => new Idea(), '/obj/Avatar/dev');
    const ctrl = makeStuff(() => new PackController());
    await ctrl.execute({ subcommand: 'sync' } as PackArgs, ctxFor(actor));
    expect(sync).toHaveBeenCalledWith('base-library');
  });

  it('a bad subcommand emits controller-rejected and does not sync', async () => {
    const sync = vi.spyOn(PackApi, 'sync').mockResolvedValue(OK);
    const actor = makeStuffAtPath(() => new Idea(), '/obj/Avatar/dev');
    const ctrl = makeStuff(() => new PackController());
    await ctrl.execute({ subcommand: 'frob' } as PackArgs, ctxFor(actor));
    expect(sync).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });

  it('a sync failure (e.g. requires-kernel abort) emits controller-rejected', async () => {
    vi.spyOn(PackApi, 'sync').mockRejectedValue(new Error('requires class X'));
    const actor = makeStuffAtPath(() => new Idea(), '/obj/Avatar/dev');
    const ctrl = makeStuff(() => new PackController());
    await ctrl.execute({ subcommand: 'sync', packId: 'base-library' } as PackArgs, ctxFor(actor));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });
});
