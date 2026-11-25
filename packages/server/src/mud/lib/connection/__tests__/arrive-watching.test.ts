/**
 * Arriving watching (stream arrival D4) — the client half on the host.
 *
 * The visit's mode resolves session → stored → legacy → explore; arriving
 * leaves the STORED `cockpit.mode` byte-identical and the snapshot says
 * watch with the program's target; `null` clears the visit's mode; the
 * personal write is the one `watch` uses.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import { ClientStateMixin } from '../ClientState';
import { SaxonbergClientMixin } from '../SaxonbergClient';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestHost extends SaxonbergClientMixin(ClientStateMixin(HasInteractiveMixin(Idea))) {}

const TARGET = { platform: 'twitch' as const, channel: 'adaplays' };

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('arriveWatching', () => {
  it('watch for this visit; the stored mode untouched; the snapshot says watch with the target', () => {
    const h = makeStuff(() => new TestHost());
    h.setClientState('cockpit.mode', 'build');
    h.arriveWatching(TARGET);
    expect(h.getCockpitMode()).toBe('watch');
    expect(h.getClientState('cockpit.mode')).toBe('build');
    const snap = h.snapshotClientState();
    expect(snap['cockpit.mode']).toBe('watch');
    expect(snap['cockpit.watch']).toEqual(TARGET);
  });

  it('null clears the visit\'s mode: the stored one reads again', () => {
    const h = makeStuff(() => new TestHost());
    h.setClientState('cockpit.mode', 'chat');
    h.arriveWatching(TARGET);
    h.arriveWatching(null);
    expect(h.getCockpitMode()).toBe('chat');
  });

  it('the visit\'s mode is transient — never part of what is saved', () => {
    const h = makeStuff(() => new TestHost());
    h.arriveWatching(TARGET);
    const declared = (h as unknown as { clientStateSchema?: () => Array<{ key: string; transient?: boolean }> });
    const decl = declared.clientStateSchema?.().find((d) => d.key === 'cockpit.sessionMode');
    if (decl) expect(decl.transient).toBe(true);
    expect(h.getClientState('cockpit.mode')).toBeNull();
  });

  it('showPersonalStream writes and pushes `cockpit.watch` — the one writer', () => {
    const h = makeStuff(() => new TestHost());
    const push = vi.spyOn(h, 'pushClientStateUpdate');
    h.showPersonalStream(TARGET);
    expect(h.getClientState('cockpit.watch')).toEqual(TARGET);
    expect(push).toHaveBeenCalledWith('cockpit.watch', TARGET);
  });
});
