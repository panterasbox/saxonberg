/**
 * CockpitModeController tests — `cockpit mode <name>`, the activity axis.
 *
 * Acceptance criteria 1 (the mode write), 4 (validated against
 * `COCKPIT_MODES`), 7 (per-mode arrangement memory survives a round
 * trip) and 8 (the change rides the command bus, so it is attributable
 * — there is no client-side mode state to diverge from).
 *
 * Mirrors the LayoutController harness: the push wire is spied so the
 * test runs without a backend.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CockpitModeController from '../CockpitModeController';
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

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [cockpit]\ncontroller: CockpitModeController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'cockpit mode',
    executionId: 'test',
    commandId: 'test',
    verb: 'cockpit',
    command: stubCommand(),
  });
}

interface ModeModel extends ModelData {
  name?: string;
  arrangement?: string;
}

function makeModel(args: Partial<ModeModel> = {}): ModeModel {
  return args as ModeModel;
}

describe('CockpitModeController', () => {
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

  async function run(
    name?: string,
    arrangement?: string,
  ): Promise<CommandContext> {
    const controller = makeStuff(() => new CockpitModeController());
    const ctx = makeContext(actor, location);
    await controller.execute(
      makeModel(name === undefined ? {} : { name, arrangement }),
      ctx as never,
    );
    return ctx;
  }

  it('starts on the default mode', () => {
    expect(actor.getCockpitMode()).toBe('play');
  });

  it('sets a known mode and pushes both axes', async () => {
    const ctx = await run('watch');
    expect(actor.getCockpitMode()).toBe('watch');
    expect(pushSpy).toHaveBeenCalledWith('cockpit.mode', 'watch');
    expect(ctx.getStatus()).toBe('ok');
  });

  /*
   * Entering a mode pins its arrangement, so the map on the wire always
   * carries a concrete answer. Without this the client would have to
   * derive an arrangement it was never told — which is exactly the
   * "client owns zero semantics" line this build exists to hold.
   */
  it('pins the mode’s arrangement on entry', async () => {
    await run('watch');
    const arrangements = actor.getClientState<Record<string, string>>(
      'cockpit.arrangements',
    );
    expect(arrangements.watch).toBe('viewer');
    expect(pushSpy).toHaveBeenCalledWith(
      'cockpit.arrangements',
      expect.objectContaining({ watch: 'viewer' }),
    );
  });

  it('rejects an unknown mode and does not write', async () => {
    const ctx = await run('study');
    expect(actor.getCockpitMode()).toBe('play');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(
      ctx.getNotes().some(
        (n) => n.kind === 'controller-rejected' && n.reason === 'unknown-mode',
      ),
    ).toBe(true);
  });

  it('reports rather than refusing on a bare invocation', async () => {
    const ctx = await run();
    expect(actor.getCockpitMode()).toBe('play');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
    expect(ctx.getStatus()).toBe('ok');
  });

  /*
   * The two-axis form the Views menu sends. One command, one preview —
   * a menu item means a point on both axes, and sending two commands
   * per click would break "every clickable previews what it sends".
   */
  describe('with an explicit arrangement', () => {
    it('enters the mode in that arrangement', async () => {
      await run('watch', 'streamer');
      expect(actor.getCockpitMode()).toBe('watch');
      expect(actor.getCockpitArrangement()).toBe('streamer');
      // The compatibility projection follows both axes.
      expect(actor.getClientState('cockpit.layout')).toBe('streamer');
    });

    it('overrides the remembered arrangement', async () => {
      await run('watch', 'streamer');
      await run('play');
      await run('watch', 'viewer');
      expect(actor.getCockpitArrangement()).toBe('viewer');
    });

    /*
     * Judged against the mode being ENTERED, not the one being left —
     * otherwise `cockpit mode watch streamer` from play would be
     * checked against play's vocabulary and always refuse.
     */
    it('validates against the target mode, not the current one', async () => {
      expect(actor.getCockpitMode()).toBe('play');
      const ok = await run('watch', 'streamer');
      expect(
        ok.getNotes().some((n) => n.kind === 'controller-rejected'),
      ).toBe(false);

      const bad = await run('play', 'streamer');
      expect(
        bad.getNotes().some(
          (n) =>
            n.kind === 'controller-rejected' &&
            n.reason === 'unknown-arrangement',
        ),
      ).toBe(true);
    });
  });

  /*
   * Criterion 7. Switching away and back must not silently discard an
   * arrangement choice — the memory is per mode, which is the whole
   * reason the two axes are separate.
   */
  it('remembers each mode’s arrangement across a round trip', async () => {
    await run('watch');
    // Choose the other watch arrangement, the way `cockpit layout` will.
    actor.setClientState('cockpit.arrangements', {
      ...actor.getClientState<Record<string, string>>('cockpit.arrangements'),
      watch: 'streamer',
    });

    await run('play');
    expect(actor.getCockpitArrangement()).toBe('default');

    await run('watch');
    expect(actor.getCockpitMode()).toBe('watch');
    expect(actor.getCockpitArrangement()).toBe('streamer');
  });
});
