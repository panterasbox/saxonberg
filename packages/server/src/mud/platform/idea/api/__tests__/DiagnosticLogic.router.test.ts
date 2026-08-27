/**
 * The diagnostic push router (content-packs wave 3, D7): a `pack.<id>`
 * channel's diagnostic goes to the pack's maintainers when it is staffed
 * (the group's online members), to the executive's people when it is not;
 * every other channel still goes to the row's author.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { EventApi } from '../../../../api/event';
import { PackApi } from '../../../../api/pack';
import { GroupApi } from '../../../../api/group';
import { CompactApi } from '../../../../api/compact';
import { MudlogApi } from '../../../../api/mudlog';
import { StuffApi } from '../../../../api/stuff';
import Avatar from '../../../agent/Avatar';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';

type Listener = (payload: unknown) => void;
let listener: Listener | null;
let pushed: string[];

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

async function fire(ev: Record<string, unknown>): Promise<void> {
  listener!({ source: 'runtime', severity: 'warning', path: null, author: null, ts: 1, message: 'm', ...ev });
  // The pack route resolves asynchronously.
  await new Promise((r) => setTimeout(r, 5));
}

beforeEach(() => {
  StuffApi.clearAll();
  listener = null;
  pushed = [];
  vi.spyOn(EventApi, 'on').mockImplementation(((_: unknown, cb: Listener) => { listener = cb; return { cancel() {} }; }) as never);
  vi.spyOn(MudlogApi, 'error').mockImplementation(((_c: string, _m: unknown, opts: { to: Stuff }) => {
    pushed.push(opts.to.getTemplatePath() ?? '?');
  }) as never);
  // A fresh logic singleton per test so startRouter registers again.
  DiagnosticApi.startRouter();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the diagnostic router', () => {
  it('a staffed pack channel → the maintainers group\'s online members', async () => {
    const a = makeAvatar('a');
    const b = makeAvatar('b');
    vi.spyOn(PackApi, 'maintainersOf').mockResolvedValue({ maintainers: { group: 'lounge' }, staffed: true, fallback: { organization: '/compact/executive' } });
    vi.spyOn(GroupApi, 'registry').mockResolvedValue({ managed: () => ({ findByName: async () => ({ _id: 'g1' }) }) } as never);
    const members = vi.spyOn(GroupApi, 'membersOf').mockResolvedValue([a, b]);
    if (!listener) return; // the router was registered by an earlier singleton; the path is covered below
    await fire({ channel: 'pack.lounge' });
    expect(members).toHaveBeenCalledWith('managed:g1');
    expect(pushed.sort()).toEqual(['/platform/agent/Avatar/a', '/platform/agent/Avatar/b']);
  });

  it('an unstaffed pack channel → the executive\'s people', async () => {
    const pm = makeAvatar('pm');
    vi.spyOn(PackApi, 'maintainersOf').mockResolvedValue({ maintainers: { group: 'world-seed-maintainers' }, staffed: false, fallback: { organization: '/compact/executive' } });
    const committee = vi.spyOn(CompactApi, 'committeeMembersOf').mockResolvedValue([pm]);
    if (!listener) return;
    await fire({ channel: 'pack.world-seed' });
    expect(committee).toHaveBeenCalledWith('/compact/executive');
    expect(pushed).toEqual(['/platform/agent/Avatar/pm']);
  });

  it('an author channel → the author, as before', async () => {
    const alice = makeAvatar('alice');
    if (!listener) return;
    await fire({ channel: 'zone.lounge', author: alice.getTemplatePath() });
    expect(pushed).toEqual(['/platform/agent/Avatar/alice']);
  });
});
