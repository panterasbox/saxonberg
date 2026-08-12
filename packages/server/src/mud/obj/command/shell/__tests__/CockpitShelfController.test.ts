/**
 * CockpitShelfController — `cockpit shelf list | pin | unpin | first <row>`.
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
   * ⭐ **Never default-pin a widget that does not do anything yet.** The
   * default is the three WIRED rows, not all nine — a new player's first
   * impression should not be six dead boxes, however truthfully each one
   * explains itself. The honesty convention still lands, in the widget
   * menu, where a player is actually asking what a row would show.
   */
  it('⭐ starts with only the wired rows pinned', () => {
    expect(shelf()).toEqual([...DEFAULT_SHELF]);
    expect(shelf()).toEqual(['play', 'renown', 'skill']);
    // The catalogue is still nine; the DEFAULT is three.
    expect(SHELF_ROW_IDS).toHaveLength(9);
  });

  /*
   * ⚠ And the hatched six are absent from the default, by name. A
   * regression here would put a dead widget in front of every new
   * player, which is exactly what this default exists to prevent.
   */
  it('⚠ default-pins no hatched row', () => {
    for (const row of ['make', 'coin', 'status', 'time', 'online', 'docket']) {
      expect(shelf(), `${row} was default-pinned`).not.toContain(row);
    }
  });

  describe('pin', () => {
    it('adds a hatched row, at the end, and pushes the update', async () => {
      // `coin` is NOT default-pinned (it is one of the hatched six), so
      // this is the real path a player takes to add one.
      expect(shelf()).not.toContain('coin');
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
      // A DEFAULT-pinned row, since those are the ones a player has to
      // remove rather than add.
      await run({ action: 'unpin', row: 'renown' });
      expect(shelf()).not.toContain('renown');
      expect(shelf()).toHaveLength(DEFAULT_SHELF.length - 1);
      expect(shelf()).toEqual(
        [...DEFAULT_SHELF].filter((r) => r !== 'renown'),
      );
    });

    it('unpinning what is not there is a no-op, not a corruption', async () => {
      // `coin` starts unpinned, so this is the no-op path directly.
      const before = [...shelf()];
      await run({ action: 'unpin', row: 'coin' });
      expect(shelf()).toEqual(before);
    });
  });

  /*
   * ⭐ **`first` is the shelf gaining an ORDER**, and the reason it
   * exists is a phone: the mobile bar shows `shelf.slice(0, 3)`, so
   * choosing what rides a narrow bar IS reordering the shelf. Until
   * this action the order was whatever pin-sequence happened to leave
   * behind, and there was no way to change it — on either form factor.
   */
  describe('first', () => {
    it('moves a pinned row to the front, keeping the rest in order', async () => {
      // `skill` is default-pinned LAST of the three.
      expect(shelf()).toEqual(['play', 'renown', 'skill']);
      const ctx = await run({ action: 'first', row: 'skill' });
      expect(shelf()).toEqual(['skill', 'play', 'renown']);
      expect(pushSpy).toHaveBeenCalledWith(SHELF_KEY, expect.any(Array));
      expect(ctx.getStatus()).toBe('ok');
    });

    /*
     * ⚠ The one-intention case. "Put coin on my bar" is a single
     * thought; making the player type `pin coin` and then `first coin`
     * would be two commands for it.
     */
    it('⚠ pins an UNPINNED row, at the front', async () => {
      expect(shelf()).not.toContain('coin');
      await run({ action: 'first', row: 'coin' });
      expect(shelf()[0]).toBe('coin');
      expect(shelf()).toEqual(['coin', 'play', 'renown', 'skill']);
    });

    it('on a row already first is a no-op that does not duplicate it', async () => {
      const before = [...shelf()];
      pushSpy.mockClear();
      await run({ action: 'first', row: 'play' });
      expect(shelf()).toEqual(before);
      expect(shelf().filter((r) => r === 'play')).toHaveLength(1);
      // Not merely idempotent in the result — it does not WRITE. An
      // identical array pushed back would re-save for nothing.
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('refuses an unknown row, naming the known set', async () => {
      const ctx = await run({ action: 'first', row: 'nonesuch' });
      expect(rejected(ctx)).toBe('unknown-shelf-row');
      const body = lastBody();
      for (const row of SHELF_ROW_IDS) expect(body).toContain(row);
      expect(shelf()).toEqual([...DEFAULT_SHELF]);
    });

    it('refuses with no row', async () => {
      const ctx = await run({ action: 'first' });
      expect(rejected(ctx)).toBe('missing-arg');
    });

    /*
     * ⭐ And it does not become a back door onto the closed vocabulary:
     * identity and connection are still not shelf rows.
     */
    it('⭐ cannot promote identity or connection onto the shelf', async () => {
      for (const row of ['identity', 'connection']) {
        const ctx = await run({ action: 'first', row });
        expect(rejected(ctx), `${row} was accepted`).toBe('unknown-shelf-row');
      }
      expect(shelf()).toEqual([...DEFAULT_SHELF]);
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
      // ⚠ Including `first` — a new action that the refusal did not
      // name would be a vocabulary the player cannot discover.
      for (const action of ['list', 'pin', 'unpin', 'first']) {
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
      actor.received.length = 0;
      const ctx = await run({ action: 'list' });

      const body = lastBody();
      for (const row of SHELF_ROW_IDS) {
        expect(body, `${row} missing from the catalogue`).toContain(row);
      }
      // ⚠ Three of nine by default — `list` is how a player DISCOVERS
      // the six that are not on their bar, which matters more now that
      // they no longer start there.
      expect(body).toContain('3 of 9 pinned');
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
