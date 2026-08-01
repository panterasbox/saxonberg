/**
 * The wire-body crossing (Wave 3): enter/exit round-trip, parking
 * (Decision P), fork/merge (Decision Q), identity thread (Decision C),
 * multiplexing, death-inside re-mint, reconnect-in-grace.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../sandbox';
import { ConditionApi } from '../condition';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import { PlayerApi } from '../player';
import { Stuff } from '../../lib/stuff/Stuff';
import { ExecutionContextApi } from '../execution-context';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import WireBody from '../../lib/sandbox/WireBody';
import { Events } from '../../lib/events';
import { OMNI_SCOPE } from '../execution-context';
import { ScheduleApi } from '../schedule';

/** Run circle-side reads under a system root (tests are field-context). */
function asSystem<T>(fn: () => T): T {
  return ExecutionContextApi.runRoot(null, 'test.system', fn, {
    circleScope: OMNI_SCOPE,
  });
}

const PLAYER = 'cross-tester';
const SCOPE = `/home/${PLAYER}`;

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

let sockSeq = 0;
async function makeRig(): Promise<{ avatar: Avatar; interactive: Interactive }> {
  const avatar = await StuffApi.create(() => new Avatar(), {
    playerId: PLAYER,
  });
  Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
  avatar.setName('Crosser');
  const interactive = await StuffApi.create(
    () =>
      new Interactive(`sock-${++sockSeq}`, `sess-${sockSeq}`, {
        _id: 'u1',
      } as never)
  );
  ConnectionApi.transfer(interactive, avatar);
  return { avatar, interactive };
}

describe('sandbox crossing', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
  });

  afterEach(async () => {
    const session = SandboxApi.sessionForScope(SCOPE);
    if (session) await SandboxApi.closeSession(SCOPE);
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('enter: mints a circle-born vessel, parks the avatar, moves the link', async () => {
    const { avatar, interactive } = await makeRig();
    const events: string[] = [];
    EventApi.on(Events.PlayerDisconnected, () => {
      events.push('disconnected');
    });
    EventApi.on(Events.PlayerLoggedOut, () => {
      events.push('logged-out');
    });

    const session = await SandboxApi.enter(avatar);
    expect(session.scope).toBe(SCOPE);
    expect(session.occupants.size).toBe(1);

    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;
    expect(wireBody).toBeInstanceOf(WireBody);
    // circle-born, in the circle's entry room
    expect(wireBody.getCircleScope()).toBe(SCOPE);
    asSystem(() => {
      expect(wireBody.getContainer()).toBe(SandboxApi.entryRoomForScope(SCOPE));
      // presentation forked
      expect(wireBody.getName()).toBe('Crosser');
    });
    // identity thread: the vessel acts AS the player — this is what
    // authority (wizard/core membership, parcel title) keys on, so an
    // empty identity silently strips a player of their own powers
    // inside their own circle.
    expect(wireBody.getIdentityPath()).toBe(Avatar.getTemplatePath(PLAYER));
    expect(wireBody.getPlayerId()).toBe(PLAYER);
    // the link moved; the avatar parked, presence-frozen, NOT announced
    expect(interactive.getHolder()).toBe(wireBody);
    // The sockets moved off the field body…
    expect(avatar.getInteractives().size).toBe(0);
    expect(avatar.isParked()).toBe(true);
    // …but the person is still ONLINE: `isConnected` follows the live
    // vessel while parked (Decision N's presence half). Answering
    // `false` here is what made a player who stepped into their own
    // circle vanish from `who`, from `tell`, and from the roster.
    expect(avatar.isConnected()).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toEqual([]);
    // the parked avatar keeps the registry slot; the vessel never takes it
    expect(PlayerApi.findAvatarByPlayerId(PLAYER)).toBe(avatar);
  });

  it('a parked avatar vetoes eviction', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const verdict = avatar.canEvict({ idleMs: 1e9, reason: 'idle' });
    expect(verdict.ok).toBe(false);
  });

  it('exit: re-attaches, merges epistemic slices only, reaps the vessel', async () => {
    const { avatar, interactive } = await makeRig();
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    // In-circle: meet someone (epistemic) and get renamed (material-ish)
    ExecutionContextApi.runRoot(
      null,
      'in-circle',
      () => {
        wireBody.addContact({
          kind: 'avatar',
          playerId: 'friend-met-inside',
          label: 'met-inside',
          source: 'manual',
          addedAt: Date.now(),
        } as Parameters<Avatar['addContact']>[0]);
        wireBody.setName('Imposter');
      },
      { circleScope: SCOPE }
    );

    await SandboxApi.exit(wireBody);

    // link is home; unparked
    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isConnected()).toBe(true);
    expect(avatar.isParked()).toBe(false);
    // the vessel is gone, wholesale
    expect(wireBody.isDestroyed()).toBe(true);
    // session closed
    expect(SandboxApi.sessionForScope(SCOPE)).toBeNull();
    expect(SandboxApi.activeBodyFor(PLAYER)).toBeNull();
    // merge: the contact came back (epistemic)…
    expect(
      avatar.contactsByLabel('met-inside').length
    ).toBe(1);
    // …the rename did NOT (not on the allowlist)
    expect(avatar.getName()).toBe('Crosser');
  });

  it('multiplexing: every Interactive crosses, and crosses back', async () => {
    const { avatar, interactive } = await makeRig();
    const second = await StuffApi.create(
      () => new Interactive('sock-x2', 'sess-x2', { _id: 'u1' } as never)
    );
    ConnectionApi.transfer(second, avatar);

    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;
    expect(interactive.getHolder()).toBe(wireBody);
    expect(second.getHolder()).toBe(wireBody);

    await SandboxApi.exit(wireBody);
    expect(interactive.getHolder()).toBe(avatar);
    expect(second.getHolder()).toBe(avatar);
  });

  it('the vessel never persists (guest gate)', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;
    asSystem(() => {
      expect(wireBody.shouldPersist()).toBe(false);
    });
    // save() is the spine entry — a vessel's is a no-op by the guard
    await asSystem(() => wireBody.save());
  });

  it('death inside: EJECTS to the parked body, which is untouched', async () => {
    // A circle death is real in there and discarded with the circle — the
    // point of a holodeck, and what lets an author test a lethal trap on
    // themselves. It used to re-mint a fresh vessel and leave the player
    // inside; now they come out. No shade, no arc, no real body minted
    // from inside a circle: that is the boundary the sandbox exists to
    // hold.
    const { avatar, interactive } = await makeRig();
    await SandboxApi.enter(avatar);
    const vessel = SandboxApi.activeBodyFor(PLAYER)!;
    expect(vessel.getCircleScope()).not.toBeNull();

    // Driven from INSIDE the circle, as a lethal trap in there would be:
    // the boundary rightly refuses a field-context call on a circle-scoped
    // receiver.
    await ExecutionContextApi.runRoot(
      null,
      'test.circle-death',
      () => ConditionApi.die(vessel, 'slain'),
      { circleScope: SCOPE },
    );

    // The player is back in their own body, out of the circle.
    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isParked()).toBe(false);
    expect(SandboxApi.activeBodyFor(PLAYER)).toBeNull();

    // The FIELD body is untouched — it did not die with the vessel.
    expect(avatar.getLifecycleState()).not.toBe('dead');
    expect(avatar.getMortalArc()).toBeNull();
  });

  it('reconnect inside grace lands on the SAME wire body, in the circle', async () => {
    const { avatar, interactive } = await makeRig();
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    // Simulate the drop: the socket detaches; the wire body goes
    // connectionless and the grace machinery arms.
    ConnectionApi.detach(interactive);
    expect(wireBody.isConnected()).toBe(false);
    expect(SandboxApi.liveSessionForPlayer(PLAYER)).not.toBeNull();

    // A fresh socket reconnects inside the window.
    const fresh = await StuffApi.create(
      () => new Interactive('sock-re', 'sess-re', { _id: 'u1' } as never)
    );
    // enter() needs a container — the entry room has one; also stub the
    // ceremony bits that need a live Application.
    const ok = await SandboxApi.reconnect(fresh, PLAYER);
    expect(ok).toBe(true);
    expect(fresh.getHolder()).toBe(wireBody);
    expect(SandboxApi.activeBodyFor(PLAYER)).toBe(wireBody);
  });

  it('reconnect with no live session returns false (field login path)', async () => {
    const { interactive } = await makeRig();
    expect(await SandboxApi.reconnect(interactive, 'nobody')).toBe(false);
  });

  it('exit discards the scoped runtime residue (handles die with the session)', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    let fired = false;
    ExecutionContextApi.runRoot(
      null,
      'in-circle',
      () => {
        // a deferred continuation registered from circle context
        ScheduleApi.schedule(60_000, () => {
          fired = true;
        });
      },
      { circleScope: SCOPE }
    );

    await SandboxApi.exit(wireBody);
    await new Promise((r) => setTimeout(r, 20));
    expect(fired).toBe(false);
  });
});
