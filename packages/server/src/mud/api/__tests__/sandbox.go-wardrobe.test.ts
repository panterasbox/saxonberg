/**
 * The wardrobe crossing through the REAL command pipeline: an avatar
 * standing in a room with a wardrobe types `go wardrobe` and ends up in
 * their circle; `out` brings them home. This is the seam the e2e specs
 * exercise in a browser — kept here too because a failure in the
 * command path (validators, MQL target resolution, the locomotion
 * pre-gate, the traversal hook) is much easier to read at this level.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SandboxApi } from '../sandbox';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';
import { ContainmentApi } from '../containment';
import { CommandApi } from '../command';
import { Stuff } from '../../lib/stuff/Stuff';
import { ExecutionContextApi, OMNI_SCOPE } from '../execution-context';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import CartesianLocation from '../../lib/location/CartesianLocation';
import SandboxCrossing from '../../obj/sandbox/SandboxCrossing';
import type { Containable } from '../../lib/spatial/Containable';
import type { Container } from '../../lib/spatial/Container';

const PLAYER = 'go-wardrobe-tester';
const SCOPE = `/home/${PLAYER}`;

function asSystem<T>(fn: () => T): T {
  return ExecutionContextApi.runRoot(null, 'test.system', fn, {
    circleScope: OMNI_SCOPE,
  });
}

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

describe('go wardrobe (the real command path)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
    await CommandApi.preloadAll();
  });

  afterEach(async () => {
    if (SandboxApi.sessionForScope(SCOPE)) {
      await SandboxApi.closeSession(SCOPE);
    }
    ExecutionContextApi._clearForTesting();
  });

  it('carries the player into their circle, and `out` brings them back', async () => {
    const room = await StuffApi.create(() => new CartesianLocation());
    room.setShortDescription('the wire alcove');
    const avatar = await StuffApi.create(() => new Avatar(), {
      playerId: PLAYER,
    });
    Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
    ContainmentApi.move(
      avatar as unknown as Stuff & Containable,
      room as unknown as Stuff & Container
    );
    const interactive = await StuffApi.create(
      () => new Interactive('sock-gw', 'sess-gw', { _id: 'u1' } as never)
    );
    ConnectionApi.transfer(interactive, avatar);

    // Place the (unowned, public) wardrobe: its onMoved installs the
    // passage into the room.
    const wardrobe = await StuffApi.create(() => new SandboxCrossing());
    ContainmentApi.move(
      wardrobe as unknown as Stuff & Containable,
      room as unknown as Stuff & Container
    );
    expect(
      (room as unknown as { getExit(d: string): unknown }).getExit('crossing')
    ).toBeTruthy();

    // Walk it through the real Mobile.traverse path (which consults
    // `Exit.applyTraversal` — the crossing hook). The `go` VERB layer on
    // top needs a live template store for its locomotion-mode load, so
    // the verb itself is covered by the e2e suite; this pins the
    // traversal seam the verb calls into.
    const exit = (
      room as unknown as {
        getExit(d: string): import('../../lib/boundary/Exit').default;
      }
    ).getExit('crossing');
    await (avatar as unknown as import('../../lib/spatial/Mobile').Mobile).traverse(
      exit,
      'walk'
    );

    const wireBody = SandboxApi.activeBodyFor(PLAYER);
    expect(wireBody, 'the crossing should have minted a wire body').not.toBeNull();
    expect(interactive.getHolder()).toBe(wireBody);
    // The field body never moved.
    expect(avatar.getContainer()).toBe(room);
    expect(avatar.isParked()).toBe(true);

    // …and `out` walks back, through the same seam.
    await asSystem(async () => {
      const entry = SandboxApi.entryRoomForScope(SCOPE)!;
      const back = (
        entry as unknown as {
          getExit(d: string): import('../../lib/boundary/Exit').default;
        }
      ).getExit('out');
      await (
        wireBody as unknown as import('../../lib/spatial/Mobile').Mobile
      ).traverse(back, 'walk');
    });
    expect(interactive.getHolder()).toBe(avatar);
    expect(avatar.isParked()).toBe(false);
  });
});
