/**
 * LayoutController tests — the server-authoritative cockpit-layout verb.
 *
 * `layout <name>` writes `cockpit.layout`, persists (Avatar only), and
 * pushes the `client-state-update`. Mirrors the StyleController test
 * harness: the push wire is spied so the test runs without a backend.
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

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [layout]\ncontroller: LayoutController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'layout',
    executionId: 'test',
    commandId: 'test',
    verb: 'layout',
    command: stubCommand(),
  });
}

interface LayoutModel extends ModelData {
  name?: string;
}

function makeModel(args: Partial<LayoutModel> = {}): LayoutModel {
  return args as LayoutModel;
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

  it('defaults to world before any switch', () => {
    expect(actor.getClientState('cockpit.layout')).toBe('world');
  });

  it('sets a known layout and pushes the update', async () => {
    const controller = makeStuff(() => new LayoutController());
    const ctx = makeContext(actor, location);
    await controller.execute(makeModel({ name: 'forum' }), ctx as never);
    expect(actor.getClientState('cockpit.layout')).toBe('forum');
    expect(pushSpy).toHaveBeenCalledWith('cockpit.layout', 'forum');
    expect(ctx.getStatus()).toBe('ok');
  });

  it('rejects an unknown layout name and does not write', async () => {
    const controller = makeStuff(() => new LayoutController());
    const ctx = makeContext(actor, location);
    await controller.execute(makeModel({ name: 'kitchen' }), ctx as never);
    expect(actor.getClientState('cockpit.layout')).toBe('world');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects a missing name', async () => {
    const controller = makeStuff(() => new LayoutController());
    const ctx = makeContext(actor, location);
    await controller.execute(makeModel({}), ctx as never);
    expect(actor.getClientState('cockpit.layout')).toBe('world');
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
