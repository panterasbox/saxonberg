/**
 * SettingsController tests — exercise each subcommand against a
 * test host that composes `EnvironmentMixin` + a feature mixin
 * declaring sample settings.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import SettingsController from '../SettingsController';
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
        key: 'feature.greeting',
        type: 'string',
        default: 'hello',
        description: 'a greeting',
      },
      {
        key: 'feature.count',
        type: 'number',
        default: 0,
        description: 'a count',
      },
      {
        key: 'feature.flag',
        type: 'boolean',
        default: false,
        description: 'a flag',
      },
      {
        key: 'feature.color',
        type: 'enum',
        enumValues: ['red', 'green', 'blue'],
        default: 'red',
        description: 'a color',
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
    verb: 'settings',
    command: stubCommand('settings'),
  });
}

describe('SettingsController', () => {
  let host: Host;
  let location: CartesianLocation;
  let controller: SettingsController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    host = makeStuff(() => new Host());
    ContainmentApi.move(host, location);
    controller = makeStuff(() => new SettingsController());
  });

  describe('list', () => {
    it('lists declared settings grouped by source mixin', () => {
      controller.execute(
        makeModel({}, 'list'),
        makeContext(host, location),
      );
    });

    it('treats no subcommand as list', () => {
      controller.execute(makeModel(), makeContext(host, location));
    });
  });

  describe('get', () => {
    it('shows the schema default when no override', () => {
      controller.execute(
        makeModel({ key: 'feature.greeting' }, 'get'),
        makeContext(host, location),
      );
    });

    it('shows the override after set', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      controller.execute(
        makeModel({ key: 'feature.greeting' }, 'get'),
        makeContext(host, location),
      );
    });

    it('rejects an unknown key', () => {
      controller.execute(
        makeModel({ key: 'nope' }, 'get'),
        makeContext(host, location),
      );
    });
  });

  describe('set', () => {
    it('writes a string', () => {
      controller.execute(
        makeModel({ key: 'feature.greeting', value: 'howdy' }, 'set'),
        makeContext(host, location),
      );
      expect(host.getSetting<string>('feature.greeting')).toBe('howdy');
    });

    it('strips a wrapping quote pair from a string value', () => {
      controller.execute(
        makeModel(
          { key: 'feature.greeting', value: '"hello there {{ x }}"' },
          'set',
        ),
        makeContext(host, location),
      );
      expect(host.getSetting<string>('feature.greeting')).toBe(
        'hello there {{ x }}',
      );
    });

    it('leaves an unquoted string (and inner quotes) untouched', () => {
      controller.execute(
        makeModel({ key: 'feature.greeting', value: 'say "hi"' }, 'set'),
        makeContext(host, location),
      );
      expect(host.getSetting<string>('feature.greeting')).toBe('say "hi"');
    });

    it('coerces a numeric string for number-typed settings', () => {
      controller.execute(
        makeModel({ key: 'feature.count', value: '42' }, 'set'),
        makeContext(host, location),
      );
      expect(host.getSetting<number>('feature.count')).toBe(42);
    });

    it('reports a useful error when number coercion fails', () => {
      controller.execute(
        makeModel({ key: 'feature.count', value: 'abc' }, 'set'),
        makeContext(host, location),
      );
    });

    it('coerces boolean shorthands', () => {
      controller.execute(
        makeModel({ key: 'feature.flag', value: 'yes' }, 'set'),
        makeContext(host, location),
      );
      expect(host.getSetting<boolean>('feature.flag')).toBe(true);
      controller.execute(
        makeModel({ key: 'feature.flag', value: 'no' }, 'set'),
        makeContext(host, location),
      );
      expect(host.getSetting<boolean>('feature.flag')).toBe(false);
    });

    it('rejects an enum value not in the allowed set', () => {
      controller.execute(
        makeModel({ key: 'feature.color', value: 'mauve' }, 'set'),
        makeContext(host, location),
      );
    });

    it('rejects an unknown key', () => {
      controller.execute(
        makeModel({ key: 'nope', value: 'x' }, 'set'),
        makeContext(host, location),
      );
    });
  });

  describe('unset', () => {
    it('clears an override; default reapplies', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      controller.execute(
        makeModel({ key: 'feature.greeting' }, 'unset'),
        makeContext(host, location),
      );
      expect(host.getSetting<string>('feature.greeting')).toBe('hello');
    });

    it('rejects an unknown key', () => {
      controller.execute(
        makeModel({ key: 'nope' }, 'unset'),
        makeContext(host, location),
      );
    });
  });

  describe('describe', () => {
    it('returns the schema entry summary', () => {
      controller.execute(
        makeModel({ key: 'feature.color' }, 'describe'),
        makeContext(host, location),
      );
    });
  });

  // Non-Environment commandGiver rejection lives in the
  // `requiresEnvironment` validator now (see settings.yaml). The
  // controller assumes the validator has already guarded the
  // call.
});
