/**
 * CpController — the content-tree copy picks the backend's op and words
 * its answer (controller-liquidity W8). The W0 record caught
 * `cp /stuff/thing/rag ~/rag` as a thrown `controller-error`: the old
 * controller asked a READ gate of the source's live representative, and
 * that question threw. The source is an open read now (W3) and the
 * destination's title is `writeTemplate`'s own, so the act is a worded
 * refusal or a copy — never a throw.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import CpController from '../CpController';
import { MixinApi } from '../../../../../api/mixin';
import { MessageApi } from '../../../../../api/message';
import { TemplateApi } from '../../../../../api/template';
import { Template } from '../../../../../lib/stuff/Template';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

afterEach(() => vi.restoreAllMocks());

/** A workspace giver in the content tree, home `/` (the default). */
function ctx(): CommandContext {
  const giver = {
    pickTree: () => 'content',
    getHome: () => '/',
    getCwd: () => '/',
  } as unknown as Stuff;
  return { commandGiver: giver, note: vi.fn() } as unknown as CommandContext;
}

function quiet(): void {
  vi.spyOn(MixinApi, 'isWorkspace').mockReturnValue(true);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(Template, 'findByPath').mockResolvedValue({
    path: '/stuff/thing/rag',
    own: { class: '/platform/thing/Thing', data: { name: 'rag' } },
    extends: undefined,
  } as never);
}

describe('cp (content tree)', () => {
  it('the record row: an untitled destination is a worded refusal, not a throw', async () => {
    quiet();
    const write = vi
      .spyOn(TemplateApi, 'writeTemplate')
      .mockResolvedValue({ ok: false, reason: 'access-denied', path: '/rag' });
    const c = ctx();
    await makeStuff(() => new CpController()).execute(
      { src: '/stuff/thing/rag', dst: '~/rag' } as never,
      c,
    );
    expect(write).toHaveBeenCalledWith('/rag', {
      class: '/platform/thing/Thing',
      extends: undefined,
      data: { name: 'rag' },
    });
    expect(c.note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'access-denied' }),
    );
  });

  it('copies the RAW row to a destination the giver holds', async () => {
    quiet();
    vi.spyOn(TemplateApi, 'writeTemplate').mockResolvedValue({ ok: true, paths: ['/home/a/rag'] });
    const c = ctx();
    await makeStuff(() => new CpController()).execute(
      { src: '/stuff/thing/rag', dst: '/home/a/rag' } as never,
      c,
    );
    expect(c.note).not.toHaveBeenCalled();
  });
});
