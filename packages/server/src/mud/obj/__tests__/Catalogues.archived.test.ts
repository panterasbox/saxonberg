/**
 * Archive-never-reap (content-packs wave 2, D6): an archived channel and
 * an archived subject are invisible to every catalogue read — and
 * present in the store, because the installer never deletes them.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChannelCatalogue from '../ChannelCatalogue';
import SubjectCatalogue from '../SubjectCatalogue';
import { Channel } from '../../lib/social/Channel';
import Subject from '../../lib/forum/Subject';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

function channel(name: string, archived: boolean): Channel {
  const c = new Channel();
  c.name = name;
  c.kind = 'open-join-standalone';
  c.subject = `s-${name}`;
  c.archived = archived;
  return c;
}
function subject(title: string, state: 'active' | 'archived'): Subject {
  const s = new Subject();
  s.title = title;
  s.state = state;
  (s as unknown as { _id: string })._id = `s-${title}`;
  return s;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('archived rows are invisible, never reaped', () => {
  it('ChannelCatalogue.resolveByName skips an archived channel', async () => {
    vi.spyOn(Channel, 'find').mockResolvedValue([channel('Help', false), channel('Old', true)] as never);
    const cat = makeStuffAtPath(() => new ChannelCatalogue(), '/obj/ChannelCatalogue');
    await cat.warmCache();
    expect((await cat.resolveByName('help'))?.name).toBe('Help');
    expect(await cat.resolveByName('old')).toBeNull();
  });

  it('SubjectCatalogue.resolveByTitle skips an archived subject', async () => {
    vi.spyOn(Subject, 'find').mockResolvedValue([subject('Help', 'active'), subject('Old', 'archived')] as never);
    const cat = makeStuffAtPath(() => new SubjectCatalogue(), '/obj/SubjectCatalogue');
    await cat.warmCache();
    expect((await cat.resolveByTitle('help'))?.title).toBe('Help');
    expect(await cat.resolveByTitle('old')).toBeNull();
    expect(await cat.resolveById('s-Old')).toBeNull();
  });
});
