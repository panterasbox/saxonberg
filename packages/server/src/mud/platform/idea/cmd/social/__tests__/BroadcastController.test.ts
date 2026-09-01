/**
 * `broadcast --at` (content-packs wave 3, D2c): forced messaging over an
 * extent the speaker HOLDS. A parcel holder reaches only the avatars
 * standing under the parcel; a locality government's member reaches its
 * locality; the PM (holding /world) reaches everyone under it; a
 * non-holder is refused with their extents listed; `--at` omitted at a
 * held location defaults to its covering extent, at an unheld one
 * refuses; a player reaches a guest in their own home.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BroadcastController from '../BroadcastController';
import Avatar from '../../../../agent/Avatar';
import Room from '../../../../location/CartesianLocation';
import { AccessApi } from '../../../../../api/access';
import { ParcelApi } from '../../../../../api/parcel';
import { MqlApi } from '../../../../../api/mql';
import { MessageApi } from '../../../../../api/message';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

let delivered: string[];
let selfLines: string[];
let notes: Array<Record<string, unknown>>;

function captureScenes(): void {
  delivered = [];
  selfLines = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.modality = () => b;
    b.payload = () => b;
    b.toSelf = (m: { toString(): string }) => { selfLines.push(m.toString()); return b; };
    b.toTarget = (t: Stuff) => { delivered.push(t.getTemplatePath() ?? '?'); return b; };
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(MessageApi, 'refOf').mockReturnValue({} as never);
}

function makeAvatar(id: string, room: Room): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  ContainmentApi.move(av, room);
  return av;
}

function ctx(giver: Avatar, location: Room): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    location,
    note: (n: Record<string, unknown>) => notes.push(n),
  } as unknown as CommandContext;
}

/** Title fixture: who holds what (the dispatch itself is AccessRegistry's, tested beside it). */
function stubTitle(held: Record<string, string[]>, covering: Record<string, string> = {}): void {
  vi.spyOn(AccessApi, 'canAtPath').mockImplementation(
    async (subject, _action, path) => (held[(subject as Stuff).getTemplatePath() ?? ''] ?? []).includes(path),
  );
  vi.spyOn(AccessApi, 'heldExtents').mockImplementation(
    async (subject) => held[(subject as Stuff | null)?.getTemplatePath() ?? ''] ?? [],
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockImplementation(async (path: string) => {
    const hit = Object.keys(covering).filter((e) => path === e || path.startsWith(e + '/')).sort((a, b) => b.length - a.length)[0];
    return hit ? ({ getExtent: () => covering[hit] } as never) : null;
  });
}

let lounge: Room;
let terminus: Room;
let home: Room;
let online: Avatar[];

async function run(giver: Avatar, location: Room, model: Record<string, unknown>): Promise<void> {
  vi.spyOn(MqlApi, 'resolveMany').mockReturnValue({ stuff: online } as never);
  const ctrl = makeStuff(() => new BroadcastController());
  await ctrl.execute({ message: 'hi', ...model } as CommandModel as never, ctx(giver, location));
}

beforeEach(() => {
  StuffApi.clearAll();
  captureScenes();
  lounge = makeStuffAtPath(() => new Room(), '/studio/lounge/bar');
  terminus = makeStuffAtPath(() => new Room(), '/studio/terminus/terminal/hall');
  home = makeStuffAtPath(() => new Room(), '/home/dave/parlor');
  online = [];
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('broadcast --at', () => {
  it('a parcel holder reaches only the avatars under the parcel', async () => {
    const dave = makeAvatar('dave', lounge);
    const guest = makeAvatar('guest', lounge);
    const far = makeAvatar('far', terminus);
    online = [dave, guest, far];
    stubTitle({ '/platform/agent/Avatar/dave': ['/studio/lounge', '/home/dave'] });
    await run(dave, lounge, { extent: '/studio/lounge' });
    expect(delivered).toEqual(['/platform/agent/Avatar/guest']);
    expect(selfLines[0]).toContain('Broadcast');
    expect(notes).toEqual([]);
  });

  it("a locality government's member reaches its locality; the PM (holding /world) reaches everyone", async () => {
    const clerk = makeAvatar('clerk', terminus);
    const pm = makeAvatar('pm', lounge);
    const a = makeAvatar('a', lounge);
    const b = makeAvatar('b', terminus);
    online = [clerk, pm, a, b];
    stubTitle({ '/platform/agent/Avatar/clerk': ['/studio/terminus'], '/platform/agent/Avatar/pm': ['/studio', '/obj'] });
    await run(clerk, terminus, { extent: '/studio/terminus' });
    expect(delivered.sort()).toEqual(['/platform/agent/Avatar/b']);
    delivered = [];
    await run(pm, lounge, { extent: '/studio' });
    expect(delivered.sort()).toEqual(['/platform/agent/Avatar/a', '/platform/agent/Avatar/b', '/platform/agent/Avatar/clerk']);
  });

  it('a non-holder is refused with their extents listed; one holding nothing is told so', async () => {
    const eve = makeAvatar('eve', lounge);
    const guest = makeAvatar('guest', lounge);
    online = [eve, guest];
    stubTitle({ '/platform/agent/Avatar/eve': ['/home/eve'] });
    await run(eve, lounge, { extent: '/studio/lounge' });
    expect(delivered).toEqual([]);
    expect(notes[0]).toMatchObject({ reason: 'extent-not-held', detail: 'you hold: /home/eve' });
    expect(selfLines[0]).toContain('You do not hold /studio/lounge');
    const zed = makeAvatar('zed', lounge);
    stubTitle({});
    await run(zed, lounge, { extent: '/studio/lounge' });
    expect(notes[0]).toMatchObject({ reason: 'extent-not-held', detail: 'you hold nothing' });
  });

  it('--at omitted at a held location defaults to its covering extent; at an unheld one refuses', async () => {
    const dave = makeAvatar('dave', lounge);
    const guest = makeAvatar('guest', lounge);
    online = [dave, guest];
    stubTitle({ '/platform/agent/Avatar/dave': ['/studio/lounge'] }, { '/studio/lounge': '/studio/lounge', '/studio/terminus': '/studio/terminus' });
    await run(dave, lounge, {});
    expect(delivered).toEqual(['/platform/agent/Avatar/guest']);
    delivered = [];
    await run(dave, terminus, {});
    expect(delivered).toEqual([]);
    expect(notes[0]).toMatchObject({ reason: 'extent-not-held' });
    expect(selfLines.at(-1)).toContain('You do not hold /studio/terminus');
  });

  it('a player reaches a guest in their own home', async () => {
    const dave = makeAvatar('dave', home);
    const guest = makeAvatar('guest', home);
    const outside = makeAvatar('outside', lounge);
    online = [dave, guest, outside];
    stubTitle({ '/platform/agent/Avatar/dave': ['/home/dave'] });
    await run(dave, home, { extent: '/home/dave' });
    expect(delivered).toEqual(['/platform/agent/Avatar/guest']);
  });
});
