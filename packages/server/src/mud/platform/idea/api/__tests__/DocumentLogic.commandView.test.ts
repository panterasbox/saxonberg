/**
 * The command-view code-naming gate (content-packs wave 2, D8): a
 * non-wizard may edit a view's prose but not its `controller:` or its
 * validator / `requires` SET (any change — a validator is a gate); a
 * wizard may; a malformed view is refused at the chokepoint; a saved
 * command view calls `CommandApi.reload` (go-live without a restart).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../../../api/document';
import { AccessApi } from '../../../../api/access';
import { CommandApi } from '../../../../api/command';
import { ProvenanceApi } from '../../../../api/provenance';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Idea } from '../../../../lib/stuff/Idea';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const PATH = '/platform/cmd/perception/look';
const LOOK = {
  verbs: ['look'],
  controller: '/platform/idea/cmd/perception/LookController',
  description: 'look around',
  help: 'v1',
  validators: ['/lib/command/validators/requiresEmbodied'],
};

let rows: Record<string, unknown>[];
let actor: Stuff;
let reload: ReturnType<typeof vi.fn>;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, 'test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  rows = [{ _id: '1', path: PATH, owner: '/platform', kind: 'command-view', data: LOOK }];
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    find: vi.fn(async (col: string, q: Record<string, unknown>) =>
      col === 'documents' ? rows.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
    ),
    save: vi.fn(async (_c: string, doc: Record<string, unknown>) => {
      const i = rows.findIndex((r) => r._id === doc._id);
      if (i >= 0) rows[i] = { ...rows[i], ...doc };
      else rows.push({ ...doc, _id: String(rows.length + 1) });
      return String(doc._id ?? rows.length);
    }),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
  vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined as never);
  reload = vi.spyOn(CommandApi, 'reload').mockResolvedValue(true) as never;
  actor = makeStuffAtPath(() => new Idea(), '/platform/agent/Avatar/ann') as unknown as Stuff;
});
afterEach(() => vi.restoreAllMocks());

describe('command-view saves', () => {
  it('a non-wizard cosmetic edit (help text) is admitted and goes live', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, help: 'v2' }));
    expect((rows[0]!.data as { help: string }).help).toBe('v2');
    expect(reload).toHaveBeenCalledWith(PATH);
  });

  it('a non-wizard changing controller is refused', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(
      runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, controller: '/platform/idea/cmd/system/PingController' })),
    ).rejects.toThrow(/wizard code trust/);
    expect((rows[0]!.data as { controller: string }).controller).toBe(LOOK.controller);
    expect(reload).not.toHaveBeenCalled();
  });

  it('a non-wizard changing the validator set (even removing one) is refused', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(
      runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, validators: [] })),
    ).rejects.toThrow(/wizard code trust/);
  });

  it('a non-wizard minting a NEW view that names a controller is refused', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(
      runAs(() => DocumentApi.save('/platform/cmd/system/zap', 'command-view', { verbs: ['zap'], controller: '/platform/idea/cmd/system/PingController', description: 'x' })),
    ).rejects.toThrow(/wizard code trust/);
  });

  it('a wizard changing controller is admitted', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, controller: '/platform/idea/cmd/system/PingController' }));
    expect((rows[0]!.data as { controller: string }).controller).toBe('/platform/idea/cmd/system/PingController');
    expect(reload).toHaveBeenCalledWith(PATH);
  });

  it('a malformed view is refused at the chokepoint', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await expect(
      runAs(() => DocumentApi.save(PATH, 'command-view', { description: 'no verbs' })),
    ).rejects.toThrow(/does not conform/);
    expect(reload).not.toHaveBeenCalled();
  });

  it('another kind never consults the wizard gate or reload', async () => {
    const wiz = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await runAs(() => DocumentApi.save('/emotes/grin', 'emote', { verb: 'grin' }));
    expect(wiz).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
