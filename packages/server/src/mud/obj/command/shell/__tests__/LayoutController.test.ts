/**
 * LayoutController tests — `cockpit layout`, the arrangement axis.
 *
 * Acceptance criterion 6: arrangements resolve against **the active
 * mode's shipped defaults plus this player's saved ones**, not a frozen
 * list; `save` names one; a name belonging to another mode is refused
 * *with that mode named*; and a saved name can never silently shadow a
 * shipped default.
 *
 * The push wire is spied so the test runs without a backend.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LayoutController from '../LayoutController';
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
import type { ArrangementSpec } from '@saxonberg/types';

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [cockpit]\ncontroller: LayoutController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'cockpit layout',
    executionId: 'test',
    commandId: 'test',
    verb: 'cockpit',
    command: stubCommand(),
  });
}

interface LayoutModel extends ModelData {
  name?: string;
  target?: string;
}

describe('LayoutController', () => {
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

  async function run(model: LayoutModel): Promise<CommandContext> {
    const controller = makeStuff(() => new LayoutController());
    const ctx = makeContext(actor, location);
    await controller.execute(model as never, ctx as never);
    return ctx;
  }

  function rejection(ctx: CommandContext): string | undefined {
    return ctx.getNotes().find((n) => n.kind === 'controller-rejected')
      ?.reason;
  }

  function saved(): Record<string, Record<string, ArrangementSpec>> {
    return actor.getClientState('cockpit.savedArrangements');
  }

  it('recalls a shipped arrangement of the active mode, and pushes', async () => {
    actor.setClientState('cockpit.mode', 'watch');
    const ctx = await run({ name: 'streamer' });
    expect(actor.getCockpitArrangement()).toBe('streamer');
    expect(ctx.getStatus()).toBe('ok');
    // The push is how the client learns; without it the switch only
    // lands on the next reconnect.
    expect(pushSpy).toHaveBeenCalledWith(
      'cockpit.arrangements',
      expect.objectContaining({ watch: 'streamer' }),
    );
  });

  it('does not push when it refuses', async () => {
    await run({ name: 'nonesuch' });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  /*
   * The compatibility projection. The shipped client still swaps its
   * frame off `cockpit.layout`, so the arrangement axis has to keep
   * that key painted until the client reads mode + arrangement itself.
   */
  it('projects the legacy layout key for the shipped client', async () => {
    actor.setClientState('cockpit.mode', 'watch');
    await run({ name: 'streamer' });
    expect(actor.getClientState('cockpit.layout')).toBe('streamer');

    await run({ name: 'viewer' });
    expect(actor.getClientState('cockpit.layout')).toBe('livestream-viewer');
  });

  /*
   * Criterion 6's headline: NOT a frozen list. `wide` is not a shipped
   * name anywhere, so it can only resolve because the player saved it.
   */
  it('resolves a saved arrangement, not just the shipped set', async () => {
    const refused = await run({ name: 'wide' });
    expect(rejection(refused)).toBe('unknown-arrangement');

    await run({ name: 'save', target: 'wide' });
    expect(saved().play?.wide).toEqual({ panes: [] });

    const ok = await run({ name: 'wide' });
    expect(rejection(ok)).toBeUndefined();
    expect(actor.getCockpitArrangement()).toBe('wide');
  });

  /*
   * A dead end ("unknown arrangement") would be a lie to a player who
   * has that name one door over. The refusal names the mode.
   */
  it('refuses a name from another mode, naming that mode', async () => {
    // `viewer` ships with watch; the actor is in play.
    const ctx = await run({ name: 'viewer' });
    expect(rejection(ctx)).toBe('wrong-mode-arrangement');
    const detail = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected')?.detail;
    expect(detail).toContain('watch');
    expect(actor.getCockpitArrangement()).toBe('default');
  });

  /*
   * Shadowing is refused at SAVE time, where it can still be explained,
   * rather than resolved silently at recall time in favour of whichever
   * happened to be checked first.
   */
  it('never lets a saved name shadow a shipped default', async () => {
    actor.setClientState('cockpit.mode', 'watch');
    const ctx = await run({ name: 'save', target: 'viewer' });
    expect(rejection(ctx)).toBe('bad-arrangement-name');
    expect(saved().watch?.viewer).toBeUndefined();
  });

  it('bounds a player-supplied name', async () => {
    const tooLong = await run({ name: 'save', target: 'x'.repeat(33) });
    expect(rejection(tooLong)).toBe('bad-arrangement-name');

    const empty = await run({ name: 'save', target: '   ' });
    expect(rejection(empty)).toBe('missing-arg');

    expect(Object.keys(saved().play ?? {})).toEqual([]);
  });

  describe('forget', () => {
    beforeEach(async () => {
      await run({ name: 'save', target: 'wide' });
    });

    it('drops a saved arrangement', async () => {
      const ctx = await run({ name: 'forget', target: 'wide' });
      expect(rejection(ctx)).toBeUndefined();
      expect(saved().play?.wide).toBeUndefined();
    });

    it('falls back to the mode default when forgetting the active one', async () => {
      expect(actor.getCockpitArrangement()).toBe('wide');
      await run({ name: 'forget', target: 'wide' });
      expect(actor.getCockpitArrangement()).toBe('default');
    });

    it('refuses to forget a shipped arrangement', async () => {
      const ctx = await run({ name: 'forget', target: 'default' });
      expect(rejection(ctx)).toBe('shipped-arrangement');
    });

    it('refuses to forget one you never saved', async () => {
      const ctx = await run({ name: 'forget', target: 'narrow' });
      expect(rejection(ctx)).toBe('unknown-arrangement');
    });
  });

  it('lists the union, marking origin and the active one', async () => {
    actor.setClientState('cockpit.mode', 'watch');
    await run({ name: 'save', target: 'wide' });
    const names = actor.getArrangementNames('watch');
    expect(names).toEqual(['viewer', 'streamer', 'wide']);
    expect(actor.isShippedArrangement('watch', 'viewer')).toBe(true);
    expect(actor.isShippedArrangement('watch', 'wide')).toBe(false);

    const ctx = await run({ name: 'list' });
    expect(rejection(ctx)).toBeUndefined();
    expect(ctx.getStatus()).toBe('ok');
  });

  it('keeps saved arrangements scoped per mode', async () => {
    await run({ name: 'save', target: 'wide' });
    actor.setClientState('cockpit.mode', 'chat');
    // Saved in play, so it must not resolve in chat...
    const ctx = await run({ name: 'wide' });
    expect(rejection(ctx)).toBe('wrong-mode-arrangement');
    // ...and the same name may be saved independently here.
    await run({ name: 'save', target: 'wide' });
    expect(saved().chat?.wide).toBeDefined();
    expect(saved().play?.wide).toBeDefined();
  });
});
