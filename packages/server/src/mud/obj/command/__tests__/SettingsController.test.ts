/**
 * SettingsController tests — exercise each subcommand against a
 * test host that composes `EnvironmentMixin` + a feature mixin
 * declaring sample settings.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsController } from '../SettingsController';
import { Idea } from '../../../lib/stuff/Idea';
import {
  EnvironmentMixin,
  type SettingsSchemaEntry,
} from '../../../lib/shell/Environment';
import type { MixinConstructor } from '../../../lib/mixin';
import { Stuff } from '../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../lib/message/Sensor';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { ContainmentApi } from '../../../api/containment';
import type { Interactive } from '../../Interactive';
import type { Location } from '../../../lib/stuff/Location';
import type {
  CommandContext,
  CommandModel,
  ModelData,
} from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';

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
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

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
  return {
    commandGiver: host as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: '',
    executionId: 'test-exec',
    commandId: 'test-cmd',
  verb: 'settings',
  command: stubCommand('settings'),
  };
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
      const result = controller.execute(
        makeModel({}, 'list'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(result.summary).toMatch(/5 settings/);
    });

    it('treats no subcommand as list', () => {
      const result = controller.execute(makeModel(), makeContext(host, location));
      expect(result.success).toBe(true);
      expect(result.summary).toMatch(/5 settings/);
    });
  });

  describe('get', () => {
    it('shows the schema default when no override', () => {
      const result = controller.execute(
        makeModel({ key: 'feature.greeting' }, 'get'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(result.summary).toContain('hello');
    });

    it('shows the override after set', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      const result = controller.execute(
        makeModel({ key: 'feature.greeting' }, 'get'),
        makeContext(host, location),
      );
      expect(result.summary).toContain('howdy');
    });

    it('rejects an unknown key', () => {
      const result = controller.execute(
        makeModel({ key: 'nope' }, 'get'),
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/no such setting/);
    });
  });

  describe('set', () => {
    it('writes a string', () => {
      const result = controller.execute(
        makeModel({ key: 'feature.greeting', value: 'howdy' }, 'set'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(host.getSetting<string>('feature.greeting')).toBe('howdy');
    });

    it('coerces a numeric string for number-typed settings', () => {
      const result = controller.execute(
        makeModel({ key: 'feature.count', value: '42' }, 'set'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(host.getSetting<number>('feature.count')).toBe(42);
    });

    it('reports a useful error when number coercion fails', () => {
      const result = controller.execute(
        makeModel({ key: 'feature.count', value: 'abc' }, 'set'),
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/not a number/);
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
      const result = controller.execute(
        makeModel({ key: 'feature.color', value: 'mauve' }, 'set'),
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/expected one of/);
    });

    it('rejects an unknown key', () => {
      const result = controller.execute(
        makeModel({ key: 'nope', value: 'x' }, 'set'),
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/no such setting/);
    });
  });

  describe('unset', () => {
    it('clears an override; default reapplies', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      const result = controller.execute(
        makeModel({ key: 'feature.greeting' }, 'unset'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(host.getSetting<string>('feature.greeting')).toBe('hello');
    });

    it('rejects an unknown key', () => {
      const result = controller.execute(
        makeModel({ key: 'nope' }, 'unset'),
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('describe', () => {
    it('returns the schema entry summary', () => {
      const result = controller.execute(
        makeModel({ key: 'feature.color' }, 'describe'),
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(result.summary).toMatch(/enum/);
    });
  });

  describe('non-Environment commandGiver', () => {
    it('declines gracefully', () => {
      // A bare Stuff without EnvironmentMixin should be rejected at
      // the surface, not crash with an undefined-method error.
      const bare = makeStuff(() => new (class extends Idea {})());
      const result = controller.execute(
        makeModel({}, 'list'),
        {
          commandGiver: bare as unknown as CommandContext['commandGiver'],
          interactive: {} as Interactive,
          location,
          commandText: '',
          executionId: 'e',
          commandId: 'c',
          verb: 'settings',
          command: stubCommand('settings'),
        },
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/no settings/);
    });
  });
});
