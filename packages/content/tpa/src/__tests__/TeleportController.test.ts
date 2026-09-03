/**
 * The self-powered fork of `teleport` (content-packs wave 3, D2d — the
 * within-your-extent pattern): a hop between two points inside ONE extent
 * the giver holds is self-powered; crossing a boundary is the TPA like
 * everyone else; the PM (holding /world) goes anywhere under it; a
 * wizard holding nothing rides the TPA too (code trust buys no movement).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TeleportController from '../idea/cmd/movement/TeleportController';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import Avatar from '@saxonberg/server/mud/platform/agent/Avatar';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';

let notes: Array<Record<string, unknown>>;

function makeAvatar(id: string, room: SingletonCartesianLocation): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  ContainmentApi.move(av, room);
  return av;
}

function ctx(giver: Avatar, location: SingletonCartesianLocation): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    location,
    note: (n: Record<string, unknown>) => notes.push(n),
  } as unknown as CommandContext;
}

/** Did the controller take the self-powered fork? (It lands the giver in the destination.) */
async function hop(giver: Avatar, from: SingletonCartesianLocation, to: SingletonCartesianLocation): Promise<boolean> {
  const ctrl = makeStuff(() => new TeleportController());
  await ctrl.execute(
    { destination: { stuff: to, raw: to.getTemplatePath() ?? '' } } as CommandModel as never,
    ctx(giver, from),
  );
  return giver.getContainer() === (to as unknown);
}

let loungeBar: SingletonCartesianLocation;
let loungeOffice: SingletonCartesianLocation;
let terminus: SingletonCartesianLocation;

beforeEach(() => {
  StuffApi.clearAll();
  loungeBar = makeStuffAtPath(() => new SingletonCartesianLocation(), '/studio/lounge/bar');
  loungeOffice = makeStuffAtPath(() => new SingletonCartesianLocation(), '/studio/lounge/office');
  terminus = makeStuffAtPath(() => new SingletonCartesianLocation(), '/studio/terminus/hall');
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('teleport — self-powered within an extent you hold', () => {
  it('a lounge holder hops within the lounge, and is refused the hop to Terminus (the TPA it is)', async () => {
    const dave = makeAvatar('dave', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio/lounge']);
    expect(await hop(dave, loungeBar, loungeOffice)).toBe(true);
    expect(await hop(dave, loungeOffice, terminus)).toBe(false);
  });

  it('the PM (holding /studio) goes anywhere under it', async () => {
    const pm = makeAvatar('pm', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio', '/obj']);
    expect(await hop(pm, loungeBar, terminus)).toBe(true);
  });

  it('a wizard who holds nothing rides the TPA like everyone else', async () => {
    const wiz = makeAvatar('wiz', loungeBar);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue([]);
    expect(await hop(wiz, loungeBar, loungeOffice)).toBe(false);
  });
});
