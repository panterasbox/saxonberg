/**
 * The `client-style` controllers — one per subcommand (controller-
 * liquidity W7b; its own verb since W16), driven THROUGH the real view:
 * each case types a line, the real binder assembles it, the subcommand
 * names the controller,
 * and that controller runs. So the YAML-to-model mapping and the closed
 * word lists (`type: enum`) are exercised here, not stubbed.
 *
 * The controllers mutate the host's `clientState['style.overlay']`, call
 * `host.save()` and `host.pushClientStateUpdate(...)`; the push is spied
 * so the test runs without a real backend.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import ClientStyleShowController from '../ClientStyleShowController';
import ClientStyleThemeController from '../ClientStyleThemeController';
import ClientStyleChannelController from '../ClientStyleChannelController';
import ClientStyleMentionController from '../ClientStyleMentionController';
import ClientStylePlainController from '../ClientStylePlainController';
import ClientStylePlainChannelController from '../ClientStylePlainChannelController';
import ClientStyleLinksController from '../ClientStyleLinksController';
import ClientStyleResetController from '../ClientStyleResetController';
import { HasInteractiveMixin } from '../../../../../lib/connection/HasInteractive';
import { ClientStateMixin } from '../../../../../lib/connection/ClientState';
import { SaxonbergClientMixin } from '../../../../../lib/connection/SaxonbergClient';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import type { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandLineApi } from '../../../../../api/command-line';
import { StuffApi } from '../../../../../api/stuff';
import { ShadowApi } from '../../../../../api/shadow';
import { ContainmentApi } from '../../../../../api/containment';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { StyleOverlay } from '@saxonberg/types';

class TestActor extends SaxonbergClientMixin(ClientStateMixin(HasInteractiveMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
  ),
))) {
  static _mixinName = 'TestActor';
}

const C = '/platform/idea/cmd/shell/';
const CONTROLLERS: Record<string, new () => { execute(m: never, c: never): unknown }> = {
  [`${C}ClientStyleShowController`]: ClientStyleShowController,
  [`${C}ClientStyleThemeController`]: ClientStyleThemeController,
  [`${C}ClientStyleChannelController`]: ClientStyleChannelController,
  [`${C}ClientStyleMentionController`]: ClientStyleMentionController,
  [`${C}ClientStylePlainController`]: ClientStylePlainController,
  [`${C}ClientStylePlainChannelController`]: ClientStylePlainChannelController,
  [`${C}ClientStyleLinksController`]: ClientStyleLinksController,
  [`${C}ClientStyleResetController`]: ClientStyleResetController,
};

let cockpit: CommandDefinition;

function getOverlay(actor: TestActor): StyleOverlay {
  return actor.getClientState<StyleOverlay>('style.overlay');
}

describe('the client-style controllers', () => {
  let actor: TestActor;
  let location: Place;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    CommandApi.clearCache();
    await CommandApi.preloadAll();
    cockpit = CommandApi.getCommand('platform/cmd/shell/client-style.yaml')!;
  });

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    location = makeStuff(() => new Place());
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, location);
    pushSpy = vi
      .spyOn(actor, 'pushClientStateUpdate')
      .mockImplementation(() => {});
  });

  /**
   * Type a line: the real binder assembles it, the stanza's controller
   * runs. A binder refusal comes back as `refused` (nothing ran).
   */
  async function type(line: string): Promise<{
    ctx?: CommandContext;
    refused?: { error: string; summary?: string };
  }> {
    const asm = CommandApi.assemble(
      CommandLineApi.parsePipeline(line).commands[0]!,
      cockpit,
      { commandGiver: actor as never, location: location as never },
    );
    if ('error' in asm) return { refused: asm as { error: string; summary?: string } };
    const sub = asm.model.subcommand;
    const Ctor = CONTROLLERS[(sub ? cockpit.controllerForSubcommand(sub) : cockpit.resolvedController)!]!;
    const ctx = CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: location as never,
      commandText: line,
      executionId: 'test',
      commandId: 'test',
      verb: 'client-style',
      command: cockpit,
    });
    await (makeStuff(() => new Ctor() as never) as unknown as { execute(m: never, c: never): unknown }).execute(
      asm.model as never,
      ctx as never,
    );
    return { ctx };
  }

  describe('theme', () => {
    it('sets a known theme and pushes the update', async () => {
      const { ctx } = await type('client-style theme high-contrast');
      expect(getOverlay(actor).theme).toBe('high-contrast');
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', expect.any(Object));
      expect(ctx!.getStatus()).toBe('ok');
    });

    it.each(['ink', 'marble', 'high-contrast'])(
      'accepts the civic theme %s',
      async (name) => {
        const { ctx } = await type(`client-style theme ${name}`);
        expect(getOverlay(actor).theme).toBe(name);
        expect(ctx!.getStatus()).toBe('ok');
      },
    );

    it('rejects an unknown theme name (the view)', async () => {
      const { refused } = await type('client-style theme rainbow');
      expect(refused?.error).toBe('bind');
      expect(getOverlay(actor).theme).toBeUndefined();
    });

    it('⭐ refuses `default` — retired, and deliberately unaliased', async () => {
      // `default` stopped naming anything the moment there were two
      // grounds. The refusal must also NAME the three known themes —
      // "commands refuse honestly" is the machine-voice half of the
      // honesty rule. It is the binder's now (an enum slot).
      const { refused } = await type('client-style theme default');
      expect(getOverlay(actor).theme).toBeUndefined();
      expect(refused?.error).toBe('bind');
      expect(refused?.summary).toContain('ink');
      expect(refused?.summary).toContain('marble');
      expect(refused?.summary).toContain('high-contrast');
    });
  });

  describe('channel', () => {
    it('sets a per-channel color and pushes the overlay', async () => {
      await type('client-style channel gossip color blue');
      expect(getOverlay(actor)['channel.gossip.color']).toBe('blue');
      expect(pushSpy).toHaveBeenCalled();
    });

    it('clear drops both the color and per-channel plain rules', async () => {
      actor.setClientState('style.overlay', {
        'channel.gossip.color': 'blue',
        'plain.channel.gossip': true,
      });
      await type('client-style channel gossip clear');
      const overlay = getOverlay(actor);
      expect(overlay['channel.gossip.color']).toBeUndefined();
      expect(overlay['plain.channel.gossip']).toBeUndefined();
    });

    it('`color` with no value is refused; an unknown action is the view\'s', async () => {
      const { ctx } = await type('client-style channel gossip color');
      expect(ctx!.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
      expect((await type('client-style channel gossip paint red')).refused?.error).toBe('bind');
    });
  });

  describe('mention', () => {
    it('mention off sets the suppression flag', async () => {
      await type('client-style mention off');
      expect(getOverlay(actor)['mention.self']).toBe(false);
    });

    it('rejects anything but on/off (the view)', async () => {
      const { refused } = await type('client-style mention others');
      expect(refused?.error).toBe('bind');
      expect(getOverlay(actor)['mention.self']).toBeUndefined();
    });
  });

  describe('links (#91)', () => {
    it('`links ids` makes clickables name their target by id; `links words` restores the default', async () => {
      await type('client-style links ids');
      expect(getOverlay(actor).links).toBe('ids');
      await type('client-style links words');
      expect(getOverlay(actor).links).toBeUndefined();
    });

    it('refuses anything but words or ids (the view)', async () => {
      const { refused } = await type('client-style links stuffids');
      expect(refused?.error).toBe('bind');
      expect(getOverlay(actor).links).toBeUndefined();
    });
  });

  describe('plain', () => {
    it('plain on sets the global flag', async () => {
      await type('client-style plain on');
      expect(getOverlay(actor).plain).toBe(true);
    });

    it('plain off clears the global flag', async () => {
      actor.setClientState('style.overlay', { plain: true });
      await type('client-style plain off');
      expect(getOverlay(actor).plain).toBeUndefined();
    });

    it('plain-channel <k> on sets the per-channel flag', async () => {
      await type('client-style plain-channel gossip on');
      expect(getOverlay(actor)['plain.channel.gossip']).toBe(true);
    });

    it('refuses a word that is not on/off (the view)', async () => {
      expect((await type('client-style plain maybe')).refused).toBeDefined();
    });
  });

  describe('show / reset', () => {
    it('reset clears the overlay to {}', async () => {
      actor.setClientState('style.overlay', { theme: 'high-contrast' });
      await type('client-style reset');
      expect(getOverlay(actor)).toEqual({});
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', {});
    });

    it('show — and bare `client-style` — emit the current overlay', async () => {
      actor.setClientState('style.overlay', { plain: true });
      for (const line of ['client-style show', 'client-style']) {
        const { ctx } = await type(line);
        expect(ctx!.getStatus()).toBe('ok');
        expect(ctx!.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(false);
      }
    });
  });

  /*
   * ⭐ An unknown setting is the binder's `unknown-subcommand` now — it
   * never reaches a controller, so it can never silently succeed.
   */
  it('refuses an unknown style setting at the view, naming the settings', async () => {
    const { refused } = await type('client-style rainbow');
    expect(refused?.error).toBe('unknown-subcommand');
    expect(getOverlay(actor)).toEqual({});
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
