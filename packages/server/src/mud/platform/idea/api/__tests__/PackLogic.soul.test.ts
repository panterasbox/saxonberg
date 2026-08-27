/**
 * The D2b guarantee (content-packs wave 3): a soul-disabled emote — a DB
 * edit of the row — is `kept` against an unchanged pack file, and is a
 * CONFLICT (never overwritten) when the pack later changes that emote.
 * A second emote pack claiming an extent the actor does not hold fails
 * the requires precondition.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { AccessApi } from '../../../../api/access';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { ExecutionContextApi } from '../../../../api/execution-context';
import Avatar from '../../../agent/Avatar';
import { makeStuffAtPath, withRootContext } from '../../../../lib/security/__tests__/test-setup';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  rowsOfKind,
  writePack,
  writeDocumentFile,
  cleanupPacks,
} from './pack-harness';

const WAVE = { verb: 'wave', grammar: { slots: {}, template: '{{ actor }} waves.' }, tags: ['greeting'] };

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

describe('a disabled emote against its pack', () => {
  it('is kept against an unchanged file; a later pack change is a conflict, never an overwrite', async () => {
    const root = writePack('expression', [], {
      root: '/expression',
      manifest: { maintainers: 'soul', requires: { groups: [{ name: 'soul', purpose: 'p' }], title: [{ extent: '/expression', holder: { group: 'soul' } }] } },
    });
    writeDocumentFile(root, 'emotes', 'wave', WAVE);
    const [r1] = await PackApi.install([root]);
    expect(r1!.failure).toBeNull();
    // The soul committee disables it: a DB edit of the row.
    const row = rowsOfKind('emote').find((r) => (r.data as { verb: string }).verb === 'wave')!;
    (row.data as Record<string, unknown>).disabled = true;
    const [r2] = await PackApi.install([root]);
    expect(r2!.kept).toEqual(['/emotes/wave']);
    expect(r2!.conflicts).toEqual([]);
    expect((rowsOfKind('emote')[0]!.data as { disabled?: boolean }).disabled).toBe(true);
    // The pack changes the emote: both sides changed → conflict, the row untouched.
    writeDocumentFile(root, 'emotes', 'wave', { ...WAVE, tags: ['greeting', 'friendly'] });
    const [r3] = await PackApi.install([root]);
    expect(r3!.conflicts).toEqual(['/emotes/wave']);
    const after = rowsOfKind('emote')[0]!.data as { disabled?: boolean; tags: string[] };
    expect(after.disabled).toBe(true);
    expect(after.tags).toEqual(['greeting']);
  });

  it('a second emote pack claiming an extent the syncing actor does not hold fails the precondition', async () => {
    const root = writePack('more-emotes', [], {
      root: '/expression/extra',
      manifest: { requires: { title: [{ extent: '/expression/extra' }] } },
    });
    writeDocumentFile(root, 'emotes', 'bow', { verb: 'bow', grammar: { slots: {}, template: '{{ actor }} bows.' } });
    const actor = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/dev');
    actor.setPlayerId('dev');
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    await expect(
      withRootContext(null, 'pack.test', () => {
        ExecutionContextApi.tagActingAuthor(actor);
        return PackApi.sync('more-emotes', root);
      }),
    ).rejects.toThrow(/claims '\/expression\/extra', which \/platform\/agent\/Avatar\/dev does not hold/);
    expect(rowsOfKind('emote')).toHaveLength(0);
  });
});
