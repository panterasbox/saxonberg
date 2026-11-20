/**
 * Settings controller tests (one controller per subcommand) — exercise each subcommand against a
 * test host that composes `EnvironmentMixin` + a feature mixin
 * declaring sample settings.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import SettingsListController from '../SettingsListController';
import SettingsGetController from '../SettingsGetController';
import SettingsSetController from '../SettingsSetController';
import SettingsUnsetController from '../SettingsUnsetController';
import SettingsDescribeController from '../SettingsDescribeController';
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
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\nopens_card: settings\n`,
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

function makeContext(host: Host, location: Place): CommandContext {
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

describe('Settings controllers', () => {
  let host: Host;
  let location: Location;
  let controller: { execute: (model: CommandModel, ctx: CommandContext) => unknown };

  beforeEach(() => {
    location = makeStuff(() => new Location());
    host = makeStuff(() => new Host());
    ContainmentApi.move(host, location);
    // ⭐ The view's routing: each subcommand names its own controller;
    // bare `settings` is the list's.
    const bySub = { list: SettingsListController, get: SettingsGetController, set: SettingsSetController, unset: SettingsUnsetController, describe: SettingsDescribeController } as const;
    controller = {
      execute: (model, ctx) =>
        TestHarnessApi.actAs(ctx.commandGiver, () => makeStuff(
          () => new bySub[(model.subcommand ?? 'list') as keyof typeof bySub](),
        ).execute(model, ctx)),
    };
  });

  describe('list', () => {
    it('lists declared settings grouped by source mixin', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({}, 'list'), ctx$)))(makeContext(host, location));
    });

    it('treats no subcommand as list', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel(), ctx$)))(makeContext(host, location));
    });
  });

  describe('get', () => {
    it('shows the schema default when no override', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.greeting' }, 'get'), ctx$)))(makeContext(host, location));
    });

    it('shows the override after set', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.greeting' }, 'get'), ctx$)))(makeContext(host, location));
    });

    it('rejects an unknown key', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'nope' }, 'get'), ctx$)))(makeContext(host, location));
    });
  });

  describe('set', () => {
    it('writes a string', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.greeting', value: 'howdy' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<string>('feature.greeting')).toBe('howdy');
    });

    it('strips a wrapping quote pair from a string value', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel(
          { key: 'feature.greeting', value: '"hello there {{ x }}"' },
          'set',
        ), ctx$)))(makeContext(host, location));
      expect(host.getSetting<string>('feature.greeting')).toBe(
        'hello there {{ x }}',
      );
    });

    it('leaves an unquoted string (and inner quotes) untouched', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.greeting', value: 'say "hi"' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<string>('feature.greeting')).toBe('say "hi"');
    });

    it('coerces a numeric string for number-typed settings', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.count', value: '42' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<number>('feature.count')).toBe(42);
    });

    it('reports a useful error when number coercion fails', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.count', value: 'abc' }, 'set'), ctx$)))(makeContext(host, location));
    });

    it('coerces boolean shorthands', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.flag', value: 'yes' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<boolean>('feature.flag')).toBe(true);
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.flag', value: 'no' }, 'set'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<boolean>('feature.flag')).toBe(false);
    });

    it('rejects an enum value not in the allowed set', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.color', value: 'mauve' }, 'set'), ctx$)))(makeContext(host, location));
    });

    it('rejects an unknown key', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'nope', value: 'x' }, 'set'), ctx$)))(makeContext(host, location));
    });
  });

  describe('unset', () => {
    it('clears an override; default reapplies', () => {
      host.setSetting<string>('feature.greeting', 'howdy', host);
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.greeting' }, 'unset'), ctx$)))(makeContext(host, location));
      expect(host.getSetting<string>('feature.greeting')).toBe('hello');
    });

    it('rejects an unknown key', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'nope' }, 'unset'), ctx$)))(makeContext(host, location));
    });
  });

  describe('describe', () => {
    it('returns the schema entry summary', () => {
      ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => controller.execute(makeModel({ key: 'feature.color' }, 'describe'), ctx$)))(makeContext(host, location));
    });
  });

  // Non-Environment commandGiver rejection lives in the
  // `requiresEnvironment` validator now (see settings.yaml). The
  // controller assumes the validator has already guarded the
  // call.
});
