/**
 * StyleController tests — subcommand surface coverage. Acceptance
 * criteria #19, #20, #21, #23, #24, #25 ride here. #22 is the
 * client-side bucket-resolver test; #26 is the no-`console.*`-keys
 * grep test.
 *
 * The controller mutates the host's `clientState['style.overlay']`
 * and would normally also call `host.save()` and
 * `host.pushClientStateUpdate(...)`. The test host stubs both via
 * lightweight spies so the test runs without a real backend.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import StyleController from '../StyleController';
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
import type { StyleOverlay } from '@saxonberg/types';

class TestActor extends HasInteractiveMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
  ),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [style]\ncontroller: StyleController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'style',
    executionId: 'test',
    commandId: 'test',
    verb: 'style',
    command: stubCommand(),
  });
}

interface StyleModel extends ModelData {
  subcommand?: string;
  name?: string;
  channelKey?: string;
  action?: string;
  value?: string;
  target?: string;
  state?: string;
  a?: string;
  b?: string;
  c?: string;
}

function makeModel(args: Partial<StyleModel> = {}): StyleModel {
  return args as StyleModel;
}

function getOverlay(actor: TestActor): StyleOverlay {
  return actor.getClientState<StyleOverlay>('style.overlay');
}

describe('StyleController', () => {
  let actor: TestActor;
  let location: Location;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    location = makeStuff(() => new Location());
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, location);
    // Stub the push wire so we don't need a backend; assert the call
    // shape in tests where the push matters (acceptance #20).
    pushSpy = vi
      .spyOn(actor, 'pushClientStateUpdate')
      .mockImplementation(() => {});
  });

  describe('theme', () => {
    it('sets a known theme and pushes the update', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'theme', name: 'high-contrast' }),
        ctx as never,
      );
      expect(getOverlay(actor).theme).toBe('high-contrast');
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', expect.any(Object));
      expect(ctx.getStatus()).toBe('ok');
    });

    it('rejects an unknown theme name', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'theme', name: 'rainbow' }),
        ctx as never,
      );
      expect(getOverlay(actor).theme).toBeUndefined();
      const notes = ctx.getNotes();
      expect(notes.some((n) => n.kind === 'controller-rejected')).toBe(true);
    });
  });

  describe('channel', () => {
    it('sets a per-channel color and pushes the overlay', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({
          subcommand: 'channel',
          channelKey: 'gossip',
          action: 'color',
          value: 'blue',
        }),
        ctx as never,
      );
      const overlay = getOverlay(actor);
      expect(overlay['channel.gossip.color']).toBe('blue');
      expect(pushSpy).toHaveBeenCalled();
    });

    it('clear drops both the color and per-channel plain rules', async () => {
      // Seed an overlay that has both rules, then clear.
      actor.setClientState('style.overlay', {
        'channel.gossip.color': 'blue',
        'plain.channel.gossip': true,
      });
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({
          subcommand: 'channel',
          channelKey: 'gossip',
          action: 'clear',
        }),
        ctx as never,
      );
      const overlay = getOverlay(actor);
      expect(overlay['channel.gossip.color']).toBeUndefined();
      expect(overlay['plain.channel.gossip']).toBeUndefined();
    });
  });

  describe('mention', () => {
    it('mention self off sets the suppression flag', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'mention', target: 'self', state: 'off' }),
        ctx as never,
      );
      expect(getOverlay(actor)['mention.self']).toBe(false);
    });

    it('rejects unknown target', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'mention', target: 'others', state: 'off' }),
        ctx as never,
      );
      expect(getOverlay(actor)['mention.self']).toBeUndefined();
      expect(
        ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
      ).toBe(true);
    });
  });

  describe('plain', () => {
    it('plain on sets the global flag', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'plain', a: 'on' }),
        ctx as never,
      );
      expect(getOverlay(actor).plain).toBe(true);
    });

    it('plain off clears the global flag', async () => {
      actor.setClientState('style.overlay', { plain: true });
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'plain', a: 'off' }),
        ctx as never,
      );
      expect(getOverlay(actor).plain).toBeUndefined();
    });

    it('plain channel <k> on sets the per-channel flag', async () => {
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'plain', a: 'channel', b: 'gossip', c: 'on' }),
        ctx as never,
      );
      expect(getOverlay(actor)['plain.channel.gossip']).toBe(true);
    });
  });

  describe('show / reset', () => {
    it('reset clears the overlay to {}', async () => {
      actor.setClientState('style.overlay', { theme: 'high-contrast' });
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'reset' }),
        ctx as never,
      );
      expect(getOverlay(actor)).toEqual({});
      expect(pushSpy).toHaveBeenCalledWith('style.overlay', {});
    });

    it('show emits the current overlay (verified via status ok + no rejection)', async () => {
      actor.setClientState('style.overlay', { plain: true });
      const controller = makeStuff(() => new StyleController());
      const ctx = makeContext(actor, location);
      await controller.execute(
        makeModel({ subcommand: 'show' }),
        ctx as never,
      );
      expect(ctx.getStatus()).toBe('ok');
      expect(
        ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
      ).toBe(false);
    });
  });
});
