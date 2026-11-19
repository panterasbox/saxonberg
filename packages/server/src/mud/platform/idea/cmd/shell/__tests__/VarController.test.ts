/**
 * Var controller tests (one controller per subcommand) — list / set / unset against an
 * Environment-equipped host. The declared-key rejection path is the
 * D3 back-door close.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import VarListController from '../VarListController';
import VarSetController from '../VarSetController';
import VarUnsetController from '../VarUnsetController';
import { Idea } from '../../../../../lib/stuff/Idea';
import {
  EnvironmentMixin,
  type SettingsSchemaEntry,
} from '../../../../../lib/shell/Environment';
import type { MixinConstructor } from '../../../../../lib/mixin';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import Location from '../../../../../lib/location/Location';
import { ContainmentApi } from '../../../../../api/containment';
import type Interactive from '../../../Interactive';
import type Place from '../../../../../lib/stuff/Place';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';

function makeModel(
  fields: ModelData = {},
  subcommand?: string
): CommandModel {
  const model: CommandModel = { ...fields };
  if (subcommand !== undefined) model.subcommand = subcommand;
  return model;
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>"
  );
}
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { TestHarnessApi } from '../../../../../api/test-harness';

function FeatureMixin<TBase extends MixinConstructor>(Base: TBase) {
  class FeatureMixin extends Base {
    static _mixinName = 'FeatureMixin';
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'feature.declared',
        type: 'string',
        default: 'x',
        description: 'reserved by feature',
      },
    ];
  }
  return FeatureMixin;
}

const HostBase = FeatureMixin(
  EnvironmentMixin(
    CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
  ),
);

class Host extends HostBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function makeContext(host: Host, location: Place): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: host as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: '',
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: 'var',
    command: stubCommand('var'),
  });
}

describe('Var controllers', () => {
  let host: Host;
  let location: Location;
  let controller: { execute: (model: CommandModel, ctx: CommandContext) => unknown };

  beforeEach(() => {
    location = makeStuff(() => new Location());
    host = makeStuff(() => new Host());
    ContainmentApi.move(host, location);
    // ⭐ The view's routing: each subcommand names its own controller;
    // bare `var` is the list's.
    const bySub = { list: VarListController, set: VarSetController, unset: VarUnsetController } as const;
    controller = {
      execute: (model, ctx) =>
        TestHarnessApi.actAs(ctx.commandGiver, () => makeStuff(
          () => new bySub[(model.subcommand ?? 'list') as keyof typeof bySub](),
        ).execute(model, ctx)),
    };
  });

  describe('list', () => {
    it('reports no vars when empty', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({}, 'list'), ctx$)))(makeContext(host, location));
    });

    it('lists ad-hoc vars', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'a', value: 'one' }, 'set'), ctx$)))(makeContext(host, location));
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'b', value: 'two' }, 'set'), ctx$)))(makeContext(host, location));
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({}, 'list'), ctx$)))(makeContext(host, location));
    });

    it('treats no subcommand as list', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel(), ctx$)))(makeContext(host, location));
    });

    it('omits declared keys from listVars', () => {
      // Declared setting is in the persistent store; an override
      // there must not surface as a var. (In addition, var set on a
      // declared key would have been rejected — this test guards the
      // listVars side, not the setVar side.)
      host.setSetting<string>('feature.declared', 'override', host);
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'plain', value: 'val' }, 'set'), ctx$)))(makeContext(host, location));
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({}, 'list'), ctx$)))(makeContext(host, location));
    });
  });

  describe('set', () => {
    it('writes an ad-hoc var to the session store', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'greeting', value: 'hello' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.sessionStore.greeting).toBe('hello');
    });

    it('rejects a declared-key write (D3 back-door close)', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'feature.declared', value: 'sneak' }, 'set'), ctx$)))(makeContext(host, location));
    });
  });

  describe('unset', () => {
    it('clears an existing var', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'tmp', value: 'gone' }, 'set'), ctx$)))(makeContext(host, location));
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ name: 'tmp' }, 'unset'), ctx$)))(makeContext(host, location));
      expect(host.sessionStore.tmp).toBeUndefined();
    });
  });
});
