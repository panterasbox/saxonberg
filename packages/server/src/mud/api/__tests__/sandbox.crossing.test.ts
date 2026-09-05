/**
 * The wire-body crossing (Wave 3): enter/exit round-trip, parking
 * (Decision P), fork/merge (Decision Q), identity thread (Decision C),
 * multiplexing, death-inside re-mint, reconnect-in-grace.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../sandbox';
import { TemplatePaths } from '../../lib/paths';
import { Creature } from '../../lib/creature/Creature';
import { ConditionApi } from '../condition';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { PlayerApi } from '../player';
import { Stuff } from '../../lib/stuff/Stuff';
import { ExecutionContextApi } from '../execution-context';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import WireBody from '../../platform/agent/sandbox/WireBody';
import { Events } from '../../lib/events';
import { OMNI_SCOPE } from '../execution-context';
import { ScheduleApi } from '../schedule';
import { AccountabilityApi } from '../accountability';
import AccountabilityEvent, {
  type AccountabilityFields,
} from '../../lib/accountability/AccountabilityEvent';

/*
 * ⚠⚠ **A 20 s timeout, and the number is a MEASUREMENT rather than a
 * guess.** Every test in this file drives a whole session ceremony —
 * mint a vessel, move the sockets, run `Avatar.enter`, auto-sense the
 * circle — which costs 2–3.2 s each on an idle box against vitest's
 * 5 s default. That is under one contention spike of failing, and on a
 * loaded full-suite run it duly did: three to five `Test timed out in
 * 5000ms` in the sandbox files, every one of them green in isolation.
 *
 * ⚠ The card-surface build made it worse and the cost was measured, not
 * assumed: arrival auto-senses, `sense` now opens a card, and a card
 * open resolves + subscribes. Removing `opens_card` from `sense.yaml`
 * and re-running took this file from 19.3 s to 17.5 s — **~10%**, or
 * ~100 ms per arrival. That is the feature costing what the feature
 * costs, not a regression to chase; it is recorded here so the next
 * person to see these files time out knows what is in them.
 *
 * ⚠ Raised per FILE, deliberately. A global `testTimeout` bump would
 * buy this file's honesty at the price of every genuine hang in the
 * suite taking four times as long to report.
 */
vi.setConfig({ testTimeout: 20_000 });


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
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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
  interactive.transferTo(avatar);
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
    second.transferTo(avatar);

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

    // The corpse is cloned from an authored template, and the mint THROWS
    // when it is missing — a body failing to appear where someone died
    // should be loud. This world has no Template store, so stand in for
    // that one path and leave every other clone alone.
    const realClone = StuffApi.clone.bind(StuffApi);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (
      path: string,
      ...rest: unknown[]
    ) => {
      if (path === TemplatePaths.mortalityCorpse) {
        // Minted through `create` so it picks up the AMBIENT scope, as a
        // real clone inside the circle would: a field-scoped stand-in
        // would be denied at the sandbox boundary on the very next call.
        return StuffApi.create(() => new Creature());
      }
      return realClone(path, ...(rest as []));
    }) as unknown as typeof StuffApi.clone);

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

  /**
   * ⚠⚠ **Issue #42, and the reason it stayed invisible.**
   *
   * The accountability ledger keyed on `getTemplatePath()` while every
   * other ledger keyed on `getIdentityPath()`. A `WireBody` is stamped
   * `/platform/agent/Avatar/<playerId>/wire` — a vessel path, backed by
   * nothing — while *projecting* the player's real identity. So an
   * in-circle harm filed under the **vessel**: invisible to
   * `blameFor(realIdentity)`, and unreachable by the one reader that
   * cares.
   *
   * ⚠ `sandbox.md` classes `accountability_events` PASS(mark) — *"what
   * happened to YOU stays yours"* — and `deriveBlame` carries a circle
   * filter written precisely so nobody can *"stage a killing and mint a
   * real crime row against a real identity."* ⭐ **That filter had never
   * been exercised by a row it could match**, because no in-circle row
   * was ever keyed on a real identity to begin with. Keying on
   * `getIdentityPath()` is what makes it load-bearing — which is why it
   * is proven here, in the same change that makes it matter.
   */
  it('a death inside a circle files under the REAL identity, and convicts nobody', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const vessel = SandboxApi.activeBodyFor(PLAYER)!;
    // The premise: the vessel's template path is its OWN, and it is not
    // the person. If these two ever converge, this test is lying.
    expect(vessel.getTemplatePath()).toBe(
      `${Avatar.getTemplatePath(PLAYER)}/wire`,
    );
    expect(vessel.getIdentityPath()).toBe(Avatar.getTemplatePath(PLAYER));

    const rows: AccountabilityFields[] = [];
    vi.spyOn(AccountabilityApi, 'record').mockImplementation(
      (fields: AccountabilityFields) => {
        rows.push(fields);
      },
    );

    const realClone = StuffApi.clone.bind(StuffApi);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (
      path: string,
      ...rest: unknown[]
    ) => {
      if (path === TemplatePaths.mortalityCorpse) {
        return StuffApi.create(() => new Creature());
      }
      return realClone(path, ...(rest as []));
    }) as unknown as typeof StuffApi.clone);

    await ExecutionContextApi.runRoot(
      null,
      'test.circle-death',
      () => ConditionApi.die(vessel, 'slain'),
      { circleScope: SCOPE },
    );

    const death = rows.find((r) => r.kind === 'death');
    expect(death).toBeDefined();
    // The defect, stated: this was the VESSEL's path, which no reader
    // ever asks about — so what happened to you in your own circle was
    // recorded and then addressed to nobody.
    expect(death!.victim).not.toBe(vessel.getTemplatePath());
    expect(death!.victim).toBe(Avatar.getTemplatePath(PLAYER));

    // Now the half that used to be unreachable. Take the identity the
    // production path just produced and stage the killing that WOULD
    // convict — lethal terms, no consent, a sentient victim.
    const staged = (marked: boolean): AccountabilityEvent => {
      const ev = new AccountabilityEvent();
      Object.assign(ev, {
        kind: 'death',
        sessionId: 'staged',
        initiator: '/platform/agent/Avatar/forger',
        opponent: '/platform/agent/Avatar/forger',
        victim: death!.victim,
        killer: '/platform/agent/Avatar/forger',
        lethality: 'lethal',
        consented: false,
        sentient: true,
        realAt: 1,
        circleScope: marked ? SCOPE : null,
      });
      return ev;
    };
    // The control: on the field, that row convicts.
    expect(AccountabilityEvent.deriveBlame([staged(false)])!.crime).toBe(true);
    // In the circle, against the very same real identity, it does not.
    expect(AccountabilityEvent.deriveBlame([staged(true)])).toBeNull();
  });

  /**
   * ⭐ **Issue #40's blocker: every corpse shared one identity.**
   *
   * `mintCorpseFrom` cloned the authored corpse template and stamped no
   * identity, so every body in the world was the same object to every
   * identity-keyed ledger. Per-instance facts survived as hydrated
   * *fields*, which is exactly why nothing looked broken.
   *
   * The scheme has to survive one person leaving SEVERAL corpses, which
   * is what this drives: two deaths, one identity, two bodies.
   */
  it('two corpses of the same person are told apart', async () => {
    const { avatar } = await makeRig();
    const minted: (string | undefined)[] = [];

    const realClone = StuffApi.clone.bind(StuffApi);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (
      path: string,
      container?: unknown,
      opts?: { asIdentityPath?: string },
    ) => {
      if (path === TemplatePaths.mortalityCorpse) {
        minted.push(opts?.asIdentityPath);
        // ⚠ The stand-in has to STAMP, not just record. The scheme's
        // same-second disambiguator asks the registry whether that
        // identity is already taken, so a mock that swallows the stamp
        // silently tests the wrong branch — the ordinal would never fire
        // and two corpses would look distinct in the test while
        // colliding in the world.
        const c = await StuffApi.create(() => new Creature());
        if (opts?.asIdentityPath) {
          Stuff._stampIdentityPath(c, opts.asIdentityPath);
          StuffApi.unregister(c);
          StuffApi.register(c);
        }
        return c;
      }
      return realClone(path, container as never, opts as never);
    }) as unknown as typeof StuffApi.clone);

    const dieInCircle = async (): Promise<void> => {
      await SandboxApi.enter(avatar);
      const vessel = SandboxApi.activeBodyFor(PLAYER)!;
      await ExecutionContextApi.runRoot(
        null,
        'test.circle-death',
        () => ConditionApi.die(vessel, 'slain'),
        { circleScope: SCOPE },
      );
    };

    await dieInCircle();
    await dieInCircle();

    expect(minted).toHaveLength(2);
    // Both are real identities — not `undefined`, which is what every
    // corpse in the game had.
    expect(minted[0]).toBeTruthy();
    expect(minted[1]).toBeTruthy();
    // Both name the deceased…
    for (const id of minted) {
      expect(id).toContain(Avatar.getTemplatePath(PLAYER).replace(/^\//, ''));
    }
    // …and they are not the same body. (Same game-second in a test world
    // whose clock does not advance — so this is the ORDINAL branch, which
    // is the case a moment-only scheme would have got wrong.)
    expect(minted[0]).not.toBe(minted[1]);
  });

  it('reconnect inside grace lands on the SAME wire body, in the circle', async () => {
    const { avatar, interactive } = await makeRig();
    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    // Simulate the drop: the socket detaches; the wire body goes
    // connectionless and the grace machinery arms.
    interactive.detach();
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
