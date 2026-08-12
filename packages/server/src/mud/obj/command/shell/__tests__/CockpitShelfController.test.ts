/**
 * CockpitShelfController — `cockpit shelf list | pin <row> | unpin <row>`.
 *
 * ⚠ The actions ride positional slots (`action` / `row`), not command
 * subcommands: `cockpit shelf` has already spent the one level of
 * nesting the framework has. These tests drive a bound model directly
 * and therefore **skip the binder** — that `cockpit shelf pin play`
 * tokenizes into those two slots at all is asserted in
 * `api/__tests__/cockpit-verb.test.ts`, through the real parser.
 *
 * ⭐ The refusals matter more than the writes here. The shelf is a
 * closed vocabulary; a verb that accepted an unknown row would persist
 * a name nothing can render, and one that refused without naming the
 * known set would leave the player guessing at it.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CockpitShelfController from '../CockpitShelfController';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { SHELF_ROW_IDS, DEFAULT_SHELF } from '@saxonberg/types';

const SHELF_KEY = 'cockpit.shelf';

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
  public received: Array<{ topic?: string; body?: string }> = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as { topic?: string; body?: string });
  }
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [cockpit]\ncontroller: CockpitShelfController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'cockpit shelf',
    executionId: 'test',
    commandId: 'test',
    verb: 'cockpit',
    command: stubCommand(),
  });
}

interface ShelfModel extends ModelData {
  action?: string;
  row?: string;
}

describe('CockpitShelfController', () => {
  let actor: TestActor;
  let location: Location;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    location = makeStuff(() => new Location());
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, location);
    pushSpy = vi
      .spyOn(actor, 'pushClientStateUpdate')
      .mockImplementation(() => {});
  });

  async function run(model: ShelfModel): Promise<CommandContext> {
    const controller = makeStuff(() => new CockpitShelfController());
    const ctx = makeContext(actor, location);
    await controller.execute(model as never, ctx as never);
    return ctx;
  }

  function shelf(): string[] {
    return actor.getClientState<string[]>(SHELF_KEY);
  }

  function lastBody(): string {
    const frames = actor.received;
    return JSON.stringify(frames[frames.length - 1] ?? {});
  }

  function rejected(ctx: CommandContext): string | undefined {
    const note = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    return note?.reason;
  }

  /*
   * ⭐ The default is all nine, not the reference art's five: the build's
   * claim is that the shelf is mostly hatched BY CONSTRUCTION and that
   * this is the convention working — a claim that is invisible on first
   * login if six of the nine start unpinned.
   */
  it('starts with every row pinned', () => {
    expect(shelf()).toEqual([...DEFAULT_SHELF]);
    expect(shelf()).toHaveLength(9);
  });

  describe('pin', () => {
    it('adds a row back, at the end, and pushes the update', async () => {
      await run({ action: 'unpin', row: 'coin' });
      pushSpy.mockClear();

      const ctx = await run({ action: 'pin', row: 'coin' });

      expect(shelf()).toContain('coin');
      expect(shelf()[shelf().length - 1]).toBe('coin');
      expect(pushSpy).toHaveBeenCalledWith(SHELF_KEY, expect.any(Array));
      expect(ctx.getStatus()).toBe('ok');
    });

    /*
     * ⚠ Not an error — the state the player asked for is the state they
     * have. What must not happen is the row appearing twice, which the
     * schema validator would then reject on the next write.
     */
    it('pinning twice does not duplicate the row', async () => {
      await run({ action: 'pin', row: 'coin' });
      const before = [...shelf()];
      await run({ action: 'pin', row: 'coin' });
      expect(shelf()).toEqual(before);
      expect(shelf().filter((r) => r === 'coin')).toHaveLength(1);
    });
  });

  describe('unpin', () => {
    it('removes the row and leaves the rest in order', async () => {
      await run({ action: 'unpin', row: 'coin' });
      expect(shelf()).not.toContain('coin');
      expect(shelf()).toHaveLength(8);
      expect(shelf()).toEqual(
        [...DEFAULT_SHELF].filter((r) => r !== 'coin'),
      );
    });

    it('unpinning what is not there is a no-op, not a corruption', async () => {
      await run({ action: 'unpin', row: 'coin' });
      const before = [...shelf()];
      await run({ action: 'unpin', row: 'coin' });
      expect(shelf()).toEqual(before);
    });
  });

  describe('refusals', () => {
    it('refuses an unknown row, NAMING the known rows', async () => {
      const ctx = await run({ action: 'pin', row: 'nonesuch' });
      expect(rejected(ctx)).toBe('unknown-shelf-row');
      // The machine voice names the closed set — the
      // `cockpit style theme default` precedent. A refusal that says
      // only "no" leaves the vocabulary a guessing game.
      const body = lastBody();
      for (const row of SHELF_ROW_IDS) expect(body).toContain(row);
      // And nothing was written.
      expect(shelf()).toEqual([...DEFAULT_SHELF]);
    });

    /*
     * ⭐ The AC's "identity and connection cannot be unpinned", asserted
     * from the direction a player would actually attack it. They are
     * not rows with a protection rule — they are not rows at all, which
     * is a stronger guarantee than a rule that could be edited away.
     */
    it('⭐ refuses identity and connection — they are not widgets', async () => {
      for (const row of ['identity', 'connection']) {
        const ctx = await run({ action: 'unpin', row });
        expect(rejected(ctx), `${row} was accepted as a shelf row`).toBe(
          'unknown-shelf-row',
        );
      }
      expect(shelf()).toEqual([...DEFAULT_SHELF]);
    });

    it('refuses an unknown action, naming the known ones', async () => {
      const ctx = await run({ action: 'obliterate', row: 'coin' });
      expect(rejected(ctx)).toBe('unknown-shelf-action');
      const body = lastBody();
      for (const action of ['list', 'pin', 'unpin']) {
        expect(body).toContain(action);
      }
    });

    it('refuses pin / unpin with no row', async () => {
      const ctx = await run({ action: 'pin' });
      expect(rejected(ctx)).toBe('missing-arg');
    });
  });

  describe('list', () => {
    /*
     * ⚠ The CATALOGUE, not just what is pinned. A player cannot pin a
     * row the verb never mentioned, so the unpinned ones have to appear
     * — marked as absent rather than omitted.
     */
    it('prints all nine rows with their pinned-ness', async () => {
      await run({ action: 'unpin', row: 'coin' });
      actor.received.length = 0;
      const ctx = await run({ action: 'list' });

      const body = lastBody();
      for (const row of SHELF_ROW_IDS) {
        expect(body, `${row} missing from the catalogue`).toContain(row);
      }
      expect(body).toContain('8 of 9 pinned');
      expect(ctx.getStatus()).toBe('ok');
    });

    it('bare `cockpit shelf` lists', async () => {
      await run({});
      expect(lastBody()).toContain('pinned');
    });

    /*
     * ⭐ `list` reports PINNED-NESS, never live-or-hatched. Hatched-ness
     * is a property of the client's wiring — the server cannot know
     * which of the fields it sends the client actually paints, and a
     * verb printing a guess would be the confident wrong answer this
     * whole build exists to eliminate.
     */
    it('⭐ reports pinned-ness, not a guess at what the client painted', async () => {
      await run({ action: 'list' });
      const body = lastBody();
      expect(body).not.toMatch(/hatch|not wired|unwired/i);
    });
  });
});
