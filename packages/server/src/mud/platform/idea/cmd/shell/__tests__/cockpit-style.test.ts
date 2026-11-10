/**
 * The `cockpit style` controllers — one per nested stanza (controller-
 * liquidity W7b), driven THROUGH the real cockpit view: each case types a
 * line, the real binder assembles it, the stanza names the controller,
 * and that controller runs. So the YAML-to-model mapping and the closed
 * word sets (`values:`) are exercised here, not stubbed.
 *
 * The controllers mutate the host's `clientState['style.overlay']`, call
 * `host.save()` and `host.pushClientStateUpdate(...)`; the push is spied
 * so the test runs without a real backend.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import StyleShowController from '../StyleShowController';
import StyleThemeController from '../StyleThemeController';
import StyleChannelController from '../StyleChannelController';
import StyleMentionController from '../StyleMentionController';
import StylePlainController from '../StylePlainController';
import StylePlainChannelController from '../StylePlainChannelController';
import StyleLinksController from '../StyleLinksController';
import StyleResetController from '../StyleResetController';
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
  [`${C}StyleShowController`]: StyleShowController,
  [`${C}StyleThemeController`]: StyleThemeController,
  [`${C}StyleChannelController`]: StyleChannelController,
  [`${C}StyleMentionController`]: StyleMentionController,
  [`${C}StylePlainController`]: StylePlainController,
  [`${C}StylePlainChannelController`]: StylePlainChannelController,
  [`${C}StyleLinksController`]: StyleLinksController,
  [`${C}StyleResetController`]: StyleResetController,
};

let cockpit: CommandDefinition;

function getOverlay(actor: TestActor): StyleOverlay {
  return actor.getClientState<StyleOverlay>('style.overlay');
}

describe('the cockpit style controllers', () => {
  let actor: TestActor;
  let location: Place;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    CommandApi.clearCache();
    await CommandApi.preloadAll();
    cockpit = CommandApi.getCommand('platform/cmd/shell/cockpit.yaml')!;
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
    const path = cockpit.subcommandKey(asm.model);
    const Ctor = CONTROLLERS[cockpit.controllerForSubcommand(path ?? '')!]!;
    const ctx = CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: location as never,
      commandText: line,
      executionId: 'test',
      commandId: 'test',
      verb: 'cockpit',
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
      const { ctx } = await type('cockpit style theme high-contrast');
      expect(getOverlay(actor).theme).toBe('high-contrast');
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', expect.any(Object));
      expect(ctx!.getStatus()).toBe('ok');
    });

    it.each(['ink', 'marble', 'high-contrast'])(
      'accepts the civic theme %s',
      async (name) => {
        const { ctx } = await type(`cockpit style theme ${name}`);
        expect(getOverlay(actor).theme).toBe(name);
        expect(ctx!.getStatus()).toBe('ok');
      },
    );

    it('rejects an unknown theme name (the view)', async () => {
      const { refused } = await type('cockpit style theme rainbow');
      expect(refused?.error).toBe('bind');
      expect(getOverlay(actor).theme).toBeUndefined();
    });

    it('⭐ refuses `default` — retired, and deliberately unaliased', async () => {
      // `default` stopped naming anything the moment there were two
      // grounds. The refusal must also NAME the three known themes —
      // "commands refuse honestly" is the machine-voice half of the
      // honesty rule. It is the binder's now (a `values:` slot).
      const { refused } = await type('cockpit style theme default');
      expect(getOverlay(actor).theme).toBeUndefined();
      expect(refused?.error).toBe('bind');
      expect(refused?.summary).toContain('ink');
      expect(refused?.summary).toContain('marble');
      expect(refused?.summary).toContain('high-contrast');
    });
  });

  describe('channel', () => {
    it('sets a per-channel color and pushes the overlay', async () => {
      await type('cockpit style channel gossip color blue');
      expect(getOverlay(actor)['channel.gossip.color']).toBe('blue');
      expect(pushSpy).toHaveBeenCalled();
    });

    it('clear drops both the color and per-channel plain rules', async () => {
      actor.setClientState('style.overlay', {
        'channel.gossip.color': 'blue',
        'plain.channel.gossip': true,
      });
      await type('cockpit style channel gossip clear');
      const overlay = getOverlay(actor);
      expect(overlay['channel.gossip.color']).toBeUndefined();
      expect(overlay['plain.channel.gossip']).toBeUndefined();
    });

    it('`color` with no value is refused; an unknown action is the view\'s', async () => {
      const { ctx } = await type('cockpit style channel gossip color');
      expect(ctx!.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
      expect((await type('cockpit style channel gossip paint red')).refused?.error).toBe('bind');
    });
  });

  describe('mention', () => {
    it('mention self off sets the suppression flag', async () => {
      await type('cockpit style mention self off');
      expect(getOverlay(actor)['mention.self']).toBe(false);
    });

    it('rejects an unknown target (the view)', async () => {
      const { refused } = await type('cockpit style mention others off');
      expect(refused?.error).toBe('unknown-subcommand');
      expect(getOverlay(actor)['mention.self']).toBeUndefined();
    });
  });

  describe('links (#91)', () => {
    it('`links ids` makes clickables name their target by id; `links words` restores the default', async () => {
      await type('cockpit style links ids');
      expect(getOverlay(actor).links).toBe('ids');
      await type('cockpit style links words');
      expect(getOverlay(actor).links).toBeUndefined();
    });

    it('refuses anything but words or ids (the view)', async () => {
      const { refused } = await type('cockpit style links stuffids');
      expect(refused?.error).toBe('bind');
      expect(getOverlay(actor).links).toBeUndefined();
    });
  });

  describe('plain', () => {
    it('plain on sets the global flag', async () => {
      await type('cockpit style plain on');
      expect(getOverlay(actor).plain).toBe(true);
    });

    it('plain off clears the global flag', async () => {
      actor.setClientState('style.overlay', { plain: true });
      await type('cockpit style plain off');
      expect(getOverlay(actor).plain).toBeUndefined();
    });

    it('plain channel <k> on sets the per-channel flag', async () => {
      await type('cockpit style plain channel gossip on');
      expect(getOverlay(actor)['plain.channel.gossip']).toBe(true);
    });

    it('refuses a word that is not on/off (the view)', async () => {
      expect((await type('cockpit style plain maybe')).refused).toBeDefined();
    });
  });

  describe('show / reset', () => {
    it('reset clears the overlay to {}', async () => {
      actor.setClientState('style.overlay', { theme: 'high-contrast' });
      await type('cockpit style reset');
      expect(getOverlay(actor)).toEqual({});
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', {});
    });

    it('show — and bare `cockpit style` — emit the current overlay', async () => {
      actor.setClientState('style.overlay', { plain: true });
      for (const line of ['cockpit style show', 'cockpit style']) {
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
    const { refused } = await type('cockpit style rainbow');
    expect(refused?.error).toBe('unknown-subcommand');
    expect(getOverlay(actor)).toEqual({});
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
