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
import { MqlApi } from '@saxonberg/server/mud/api/mql';
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

describe('teleport — free movement is AUTHORIAL AUTHORITY (D11, AC19/AC20)', () => {
  it('AC19 — inside a held extent it is free: no mana, no fare, no registration', async () => {
    const dave = makeAvatar('dave2', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio/lounge']);
    // No terminal in the room, no travel credential, no caster faculty —
    // and the hop still lands. That is the claim: moving around inside
    // what you author is not a journey.
    expect(await hop(dave, loungeBar, loungeOffice)).toBe(true);
    expect(notes).toHaveLength(0);
  });

  it('AC20 — a USE-GRANT holder is denied, and gets that for free', async () => {
    const tenant = makeAvatar('tenant', loungeBar);
    // ⭐ This is a PIN on existing behaviour, not new code.
    // `AccessRegistry.heldExtents` admits on `ParcelRecord.getOwner()`
    // and is structurally blind to `grants[]`, so a lease can never
    // widen it — nothing in this build had to exclude anything. A
    // lease is not authorship.
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue([]);
    expect(await hop(tenant, loungeBar, loungeOffice)).toBe(false);
  });
});

describe('teleport — the anchored resolver (D10, AC16/AC17)', () => {
  /**
   * ⚠⚠ AC17, and it is asserted against the RESOLVER rather than
   * inferred from behaviour: **no branch of the anchored resolver may
   * issue a `world` query.** Resolving is not permission, and a world
   * scan would quietly turn "somewhere you hold in mind" into "anywhere
   * that exists" — plus it is the scan the world-scan-perf slate exists
   * to keep out of a player-typed verb. The spy watches the SCOPE
   * ARGUMENT, so a future fourth anchor cannot slip one past.
   */
  it('AC17 — no anchor issues a `world` query, on a hit or a miss', async () => {
    const actor = makeAvatar('anchored', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio/lounge']);
    const scopes: string[] = [];
    const raws: string[] = [];
    const spy = vi
      .spyOn(MqlApi, 'resolveMany')
      .mockImplementation((raw: string, c: { scope: string }) => {
        raws.push(raw);
        scopes.push(c.scope);
        return { stuff: [], raw } as never;
      });

    const miss = await TeleportController.resolveAnchored(
      actor as never,
      'nowhere-at-all',
    );
    expect(miss.stuff).toBeNull();
    expect(miss.anchor).toBeNull();

    expect(spy).toHaveBeenCalled();
    for (const s of scopes) expect(s).not.toContain('world');
    for (const r of raws) expect(r.startsWith('world')).toBe(false);
    // The three scope anchors, plus one path-glob per held extent.
    expect(scopes).toEqual([
      '/studio/lounge/**',
      'here',
      'peers',
      'reachable',
    ]);
  });

  it('anchor 1 — a held extent answers first', async () => {
    const actor = makeAvatar('holder', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio/lounge']);
    vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
      (raw: string, c: { scope: string }) =>
        (c.scope === '/studio/lounge/**'
          ? { stuff: [loungeOffice], raw }
          : { stuff: [], raw }) as never,
    );
    const hit = await TeleportController.resolveAnchored(actor as never, 'office');
    expect(hit.anchor).toBe('extent');
    expect(hit.stuff).toBe(loungeOffice as unknown);
  });

  it('AC16 — two matches is a FAILED SPECIFICATION, not a prompt', async () => {
    const actor = makeAvatar('vague', loungeBar);
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue(['/studio/lounge']);
    vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
      (raw: string) => ({ stuff: [loungeOffice, loungeBar], raw }) as never,
    );
    const hit = await TeleportController.resolveAnchored(actor as never, 'room');
    expect(hit.ambiguous).toBe(true);
    expect(hit.stuff).toBeNull();

    // …and the controller turns that into a refusal whose reason names
    // the mechanic, rather than asking which one you meant.
    const ctrl = makeStuff(() => new TeleportController());
    await ctrl.execute(
      { destination: { stuff: null, raw: 'room' } } as CommandModel as never,
      ctx(actor, loungeBar),
    );
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          n.reason === 'failed-specification',
      ),
    ).toBe(true);
  });
});
