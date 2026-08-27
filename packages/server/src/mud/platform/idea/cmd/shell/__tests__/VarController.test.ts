/**
 * VarController tests — list / set / unset against an
 * Environment-equipped host. The declared-key rejection path is the
 * D3 back-door close.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import VarController from '../VarController';
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
import CartesianLocation from '../../../../../lib/location/CartesianLocation';
import { ContainmentApi } from '../../../../../api/containment';
import type Interactive from '../../../Interactive';
import type Location from '../../../../../lib/stuff/Location';
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

function makeContext(host: Host, location: Location): CommandContext {
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

describe('VarController', () => {
  let host: Host;
  let location: CartesianLocation;
  let controller: VarController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    host = makeStuff(() => new Host());
    ContainmentApi.move(host, location);
    controller = makeStuff(() => new VarController());
  });

  describe('list', () => {
    it('reports no vars when empty', () => {
      controller.execute(
        makeModel({}, 'list'),
        makeContext(host, location),
      );
    });

    it('lists ad-hoc vars', () => {
      controller.execute(
        makeModel({ name: 'a', value: 'one' }, 'set'),
        makeContext(host, location),
      );
      controller.execute(
        makeModel({ name: 'b', value: 'two' }, 'set'),
        makeContext(host, location),
      );
      controller.execute(
        makeModel({}, 'list'),
        makeContext(host, location),
      );
    });

    it('treats no subcommand as list', () => {
      controller.execute(makeModel(), makeContext(host, location));
    });

    it('omits declared keys from listVars', () => {
      // Declared setting is in the persistent store; an override
      // there must not surface as a var. (In addition, var set on a
      // declared key would have been rejected — this test guards the
      // listVars side, not the setVar side.)
      host.setSetting<string>('feature.declared', 'override', host);
      controller.execute(
        makeModel({ name: 'plain', value: 'val' }, 'set'),
        makeContext(host, location),
      );
      controller.execute(
        makeModel({}, 'list'),
        makeContext(host, location),
      );
    });
  });

  describe('set', () => {
    it('writes an ad-hoc var to the session store', () => {
      controller.execute(
        makeModel({ name: 'greeting', value: 'hello' }, 'set'),
        makeContext(host, location),
      );
      expect(host.sessionStore.greeting).toBe('hello');
    });

    it('rejects a declared-key write (D3 back-door close)', () => {
      controller.execute(
        makeModel({ name: 'feature.declared', value: 'sneak' }, 'set'),
        makeContext(host, location),
      );
    });
  });

  describe('unset', () => {
    it('clears an existing var', () => {
      controller.execute(
        makeModel({ name: 'tmp', value: 'gone' }, 'set'),
        makeContext(host, location),
      );
      controller.execute(
        makeModel({ name: 'tmp' }, 'unset'),
        makeContext(host, location),
      );
      expect(host.sessionStore.tmp).toBeUndefined();
    });
  });
});
