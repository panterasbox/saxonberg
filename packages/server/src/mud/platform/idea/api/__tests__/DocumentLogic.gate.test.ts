/**
 * The document store's mutation gate (content-packs wave 2, D11):
 * `save` is admitted or refused by `AccessApi.canAtPath` alone — no
 * zone walk, no `can(…, null)` — and the actor's own `/home/<self>/`
 * branch short-circuits before the title check.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../../../api/document';
import { AccessApi } from '../../../../api/access';
import { ProvenanceApi } from '../../../../api/provenance';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Idea } from '../../../../lib/stuff/Idea';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

let rows: Record<string, unknown>[];
let actor: Stuff;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, 'test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  rows = [];
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    find: vi.fn(async (col: string, q: Record<string, unknown>) =>
      col === 'documents' ? rows.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
    ),
    save: vi.fn(async (_c: string, doc: Record<string, unknown>) => {
      rows.push({ ...doc, _id: String(rows.length + 1) });
      return String(rows.length);
    }),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined as never);
  actor = makeStuffAtPath(() => new Idea(), '/home/test') as unknown as Stuff;
});
afterEach(() => vi.restoreAllMocks());

describe('DocumentApi.save — the title gate', () => {
  it('admits when canAtPath says so, with write-document at the path', async () => {
    const can = vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    await runAs(() => DocumentApi.save('/emotes/grin', 'emote', { verb: 'grin' }));
    expect(can).toHaveBeenCalledWith(actor, 'write-document', '/emotes/grin');
    expect(rows).toHaveLength(1);
  });

  it('refuses when canAtPath says no', async () => {
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    await expect(runAs(() => DocumentApi.save('/emotes/grin', 'emote', {}))).rejects.toThrow(
      /permission to write that document/,
    );
    expect(rows).toHaveLength(0);
  });

  it('the self-home short-circuit never consults canAtPath', async () => {
    const can = vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    await runAs(() => DocumentApi.save('/home/test/scripts/a', 'msh', { source: 'ping' }));
    expect(can).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });
});
