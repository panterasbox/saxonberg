/**
 * `DocumentApi.delete` — the same mutation gate as `save` (self-home
 * admits; otherwise the ownership stack decides), no provenance row,
 * returns whether a row existed.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../../api/document';
import { AccessApi } from '../../../api/access';
import { ProvenanceApi } from '../../../api/provenance';
import { ExecutionContextApi } from '../../../api/execution-context';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Idea } from '../../../lib/stuff/Idea';
import { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

let rows: Record<string, unknown>[];
let actor: Stuff;
let deleted: string[];

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, 'test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  rows = [
    { _id: '1', path: '/home/test/scripts/a', owner: '/home/test', kind: 'msh', data: {} },
    { _id: '2', path: '/emotes/grin', owner: '', kind: 'emote', data: {} },
  ];
  deleted = [];
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    find: vi.fn(async (col: string, q: Record<string, unknown>) =>
      col === 'documents' ? rows.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
    ),
    save: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(async (_c: string, id: string) => {
      deleted.push(id);
      rows = rows.filter((r) => r._id !== id);
    }),
  } as unknown as PersistenceManager);
  vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined as never);
  actor = makeStuffAtPath(() => new Idea(), '/home/test') as unknown as Stuff;
});
afterEach(() => vi.restoreAllMocks());

describe('DocumentApi.delete', () => {
  it('is admitted under the actor’s own /home/<self>/ branch without consulting the wider gate', async () => {
    const can = vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    expect(await runAs(() => DocumentApi.delete('/home/test/scripts/a'))).toBe(true);
    expect(deleted).toEqual(['1']);
    expect(can).not.toHaveBeenCalled();
    expect(ProvenanceApi.recordAuthoring).not.toHaveBeenCalled();
  });

  it('is refused for a stranger outside their home', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    await expect(runAs(() => DocumentApi.delete('/emotes/grin'))).rejects.toThrow(/permission/);
    expect(deleted).toEqual([]);
  });

  it('is admitted when the ownership stack says so, and reports a missing row as false', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    expect(await runAs(() => DocumentApi.delete('/emotes/grin'))).toBe(true);
    expect(await runAs(() => DocumentApi.delete('/emotes/grin'))).toBe(false);
  });
});
