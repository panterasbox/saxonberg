/**
 * Escape battery — CROSSING: matter-smuggling and the merge vector.
 *
 * Nothing material crosses in either direction: items held at exit
 * don't come back (the vessel reaps wholesale, its inventory is
 * circle-born and dies with the discard), the vessel never writes
 * `holder_snapshots`, and a material slice (presentation) offered by
 * the fork protocol is NOT merged — the allowlist belongs to the
 * consumer, not the slice. Fails without the wire-body model + the
 * epistemic-only merge allowlist. (The `goto`-at-a-circle-path denial
 * lands with the wardrobe wave, when circle paths exist to name.)
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../../../../api/sandbox';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { EventApi } from '../../../../api/event';
import { ContainmentApi } from '../../../../api/containment';
import { Stuff } from '../../../stuff/Stuff';
import { ExecutionContextApi } from '../../../../api/execution-context';
import EventRegistry from '../../../../platform/idea/EventRegistry';
import Interactive from '../../../../platform/idea/Interactive';
import Avatar from '../../../../platform/agent/Avatar';
import { Idea } from '../../../stuff/Idea';
import { ContainableMixin } from '../../../spatial/Containable';
import type { Containable } from '../../../spatial/Containable';
import type { Container } from '../../../spatial/Container';

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


const PLAYER = 'smuggler';
const SCOPE = `/home/${PLAYER}`;

class Loot extends ContainableMixin(Idea) {}

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

describe('sandbox-escape: crossing', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    await bootRegistry();
  });

  afterEach(async () => {
    if (SandboxApi.sessionForScope(SCOPE)) {
      await SandboxApi.closeSession(SCOPE);
    }
    ExecutionContextApi._clearForTesting();
  });

  it('matter-smuggling: items held at exit do not cross back', async () => {
    const avatar = await StuffApi.create(() => new Avatar(), {
      playerId: PLAYER,
    });
    Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
    const interactive = await StuffApi.create(
      () => new Interactive('sock-smg', 'sess-smg', { _id: 'u1' } as never)
    );
    interactive.transferTo(avatar);

    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    // Conjure fat loot in-circle and hold it at exit time.
    const loot = (await ExecutionContextApi.runRootGuarded(
      null,
      'in-circle',
      async () => {
        const item = await StuffApi.create(() => new Loot());
        ContainmentApi.move(
          item as unknown as Stuff & Containable,
          wireBody as unknown as Stuff & Container
        );
        return item;
      },
      'rethrow',
      { circleScope: SCOPE }
    ))!;
    expect(loot.getCircleScope()).toBe(SCOPE);

    await SandboxApi.exit(wireBody);

    // The avatar came back empty-handed; the loot never entered the field.
    const contents = (avatar as unknown as Stuff & Container).getContents();
    expect(contents.map((c) => c.stuffId)).not.toContain(loot.stuffId);
    // The vessel is gone; the loot is circle residue at best (unreachable
    // from field dispatch — the boundary), never field inventory.
    expect(wireBody.isDestroyed()).toBe(true);
  });

  it('the merge vector: a material slice offered by the protocol is not merged', async () => {
    const avatar = await StuffApi.create(() => new Avatar(), {
      playerId: PLAYER,
    });
    Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
    avatar.setName('Honest');
    const interactive = await StuffApi.create(
      () => new Interactive('sock-mv', 'sess-mv', { _id: 'u1' } as never)
    );
    interactive.transferTo(avatar);

    await SandboxApi.enter(avatar);
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;

    // The vessel OFFERS a presentation slice (forkSlice_Presentation
    // exists) — but presentation is not on the consumer's epistemic
    // allowlist, so the in-circle rename must not follow the player out.
    ExecutionContextApi.runRoot(
      null,
      'in-circle',
      () => {
        wireBody.setName('CrimeLord');
      },
      { circleScope: SCOPE }
    );

    await SandboxApi.exit(wireBody);
    expect(avatar.getName()).toBe('Honest');
  });
});
