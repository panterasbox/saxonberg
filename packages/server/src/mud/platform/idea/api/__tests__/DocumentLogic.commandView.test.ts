/**
 * Command-view saves: title over the path decides every field, the
 * `controller:` and the validator set included — a view that NAMES code is
 * content (wizard-axis D5; the content-packs wave-2 code-naming gate is
 * gone). A malformed view is refused at the chokepoint; a saved command
 * view calls `CommandApi.reload` (go-live without a restart).
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
  // ⛔ A view that NAMES code is content (wizard-axis D5): title over the
  // path decides every save; the wizard axis is never asked.
  it('a title holder\'s cosmetic edit (help text) is admitted and goes live', async () => {
    await runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, help: 'v2' }));
    expect((rows[0]!.data as { help: string }).help).toBe('v2');
    expect(reload).toHaveBeenCalledWith(PATH);
  });

  it('a title holder changing controller is admitted — no wizard asked', async () => {
    const wiz = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, controller: '/platform/idea/cmd/system/PingController' }));
    expect((rows[0]!.data as { controller: string }).controller).toBe('/platform/idea/cmd/system/PingController');
    expect(reload).toHaveBeenCalledWith(PATH);
    expect(wiz).not.toHaveBeenCalled();
  });

  it('a title holder changing the validator set is admitted', async () => {
    await runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, validators: [] }));
    expect(reload).toHaveBeenCalledWith(PATH);
  });

  it('a non-holder changing controller is refused on title', async () => {
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await expect(
      runAs(() => DocumentApi.save(PATH, 'command-view', { ...LOOK, controller: '/platform/idea/cmd/system/PingController' })),
    ).rejects.toThrow();
    expect((rows[0]!.data as { controller: string }).controller).toBe(LOOK.controller);
    expect(reload).not.toHaveBeenCalled();
  });

  it('a malformed view is refused at the chokepoint', async () => {
    await expect(
      runAs(() => DocumentApi.save(PATH, 'command-view', { description: 'no verbs' })),
    ).rejects.toThrow(/does not conform/);
    expect(reload).not.toHaveBeenCalled();
  });

  it('another kind never consults the wizard axis or reload', async () => {
    const wiz = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await runAs(() => DocumentApi.save('/emotes/grin', 'emote', { verb: 'grin' }));
    expect(wiz).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
