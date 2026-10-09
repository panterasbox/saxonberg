/**
 * LockController / UnlockController — lock and unlock a Lockable in
 * scope; reject a non-lockable target, and ⭐⭐ **refuse a mover who
 * holds no key that fits.**
 *
 * ⚠⚠ The two positive cases here USED TO PASS WITH NO KEY AT ALL, and
 * that is what this file is really a record of. `LockController` checked
 * no key, no credential and no title, so these assertions were pinning
 * the defect: had the verbs ever been afforded, any player alive could
 * have locked the university gate and a hall's front doors. The sweep
 * that found them unafforded held them that way rather than wiring a
 * verb that lies.
 *
 * So each arm is now tested twice — ⭐ **once without a key and once
 * with one** — because "it locked the door" is only half an assertion
 * about a lock.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import LockController from '../LockController';
import UnlockController from '../UnlockController';
import Door from '../../../../thing/Door';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CredentialWalletMixin } from '../../../../../lib/credential/CredentialWallet';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Good from '../../../../../lib/stuff/Good';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';

// ⭐ The wallet is on the body because that is where `Lock.opensFor`
// looks: a synchronous scan of the MQL `person` pool for a
// `CredentialWallet` holding a matching bearer entry. An avatar with no
// wallet composed is a person carrying nothing, which is the honest
// no-key case.
const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(
    MobileMixin(
      CredentialWalletMixin(
        ContainerMixin(SensorMixin(ContainableMixin(Idea))),
      ),
    ),
  ),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function ctxFor(avatar: FakeAvatar, loc: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: verb,
    executionId: 't',
    commandId: 'c',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('LockController / UnlockController', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  let avatar: FakeAvatar;
  let room: Location;
  let door: Door;

  /** The door's own keyway — anything opaque; a re-key is a new one. */
  const KEYWAY = 'kw-test-gate';

  /** Put a bearer entry for this door's lock in the avatar's keychain. */
  function giveTheKey(): void {
    avatar.ensureCredential('key').addKey(KEYWAY, 'pin-tumbler');
  }

  beforeEach(async () => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    door = await StuffApi.create(() => new Door());
    door.setShortDescription('iron gate');
    door.setKeyway(KEYWAY);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('⛔ refuses to lock a door you hold no key for', async () => {
    const ctx = ctxFor(avatar, room, 'lock');
    await makeStuff(() => new LockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctx,
    );
    expect(door.isLocked(), 'the bolt must not have moved').toBe(false);
    expect(
      ctx.getNotes().some((n) => n.reason === 'no-key'),
      'the refusal names the missing key, not the mechanism',
    ).toBe(true);
  });

  it('locks an unlocked door when you hold its key', async () => {
    giveTheKey();
    expect(door.isLocked()).toBe(false);
    await makeStuff(() => new LockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctxFor(avatar, room, 'lock'),
    );
    expect(door.isLocked()).toBe(true);
  });

  it('⛔ refuses to unlock a door you hold no key for', async () => {
    door.setLocked(true);
    const ctx = ctxFor(avatar, room, 'unlock');
    await makeStuff(() => new UnlockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctx,
    );
    expect(door.isLocked(), 'the bolt must still be thrown').toBe(true);
    expect(ctx.getNotes().some((n) => n.reason === 'no-key')).toBe(true);
  });

  it('unlocks a locked door when you hold its key', async () => {
    giveTheKey();
    door.setLocked(true);
    await makeStuff(() => new UnlockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctxFor(avatar, room, 'unlock'),
    );
    expect(door.isLocked()).toBe(false);
  });

  it('⚠ a door with an EMPTY keyway opens for nobody — even a key-holder', async () => {
    // ⭐ The university gate's case, and the reason its content row did
    // not have to change: `locked: true` with no keyway is sealed
    // against the whole world rather than accidentally open.
    giveTheKey();
    door.setKeyway('');
    door.setLocked(true);
    const ctx = ctxFor(avatar, room, 'unlock');
    await makeStuff(() => new UnlockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctx,
    );
    expect(door.isLocked()).toBe(true);
    expect(ctx.getNotes().some((n) => n.reason === 'no-key')).toBe(true);
  });

  it('rejects a non-lockable target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Good) {})());
    const ctx = ctxFor(avatar, room, 'lock');
    await makeStuff(() => new LockController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
