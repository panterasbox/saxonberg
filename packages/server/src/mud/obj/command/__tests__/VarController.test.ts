/**
 * VarController tests — list / set / unset against an
 * Environment-equipped host. The declared-key rejection path is the
 * D3 back-door close.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VarController } from '../VarController';
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
import type { CommandContext } from '../../../api/command';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

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
  return {
    commandGiver: host as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: '',
    executionId: 'test-exec',
    commandId: 'test-cmd',
  };
}

describe('VarController', () => {
  let host: Host;
  let location: CartesianLocation;
  let controller: VarController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    host = makeStuff(() => new Host());
    ContainmentApi.move(host, location);
    controller = new VarController();
  });

  describe('list', () => {
    it('reports no vars when empty', () => {
      const result = controller.execute(
        { subcommand: 'list' },
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(result.summary).toMatch(/no vars/);
    });

    it('lists ad-hoc vars', () => {
      controller.execute(
        { subcommand: 'set', name: 'a', value: 'one' },
        makeContext(host, location),
      );
      controller.execute(
        { subcommand: 'set', name: 'b', value: 'two' },
        makeContext(host, location),
      );
      const result = controller.execute(
        { subcommand: 'list' },
        makeContext(host, location),
      );
      expect(result.summary).toMatch(/2 vars/);
    });

    it('treats no subcommand as list', () => {
      const result = controller.execute({}, makeContext(host, location));
      expect(result.success).toBe(true);
    });

    it('omits declared keys from listVars', () => {
      // Declared setting is in the persistent store; an override
      // there must not surface as a var. (In addition, var set on a
      // declared key would have been rejected — this test guards the
      // listVars side, not the setVar side.)
      host.setSetting<string>('feature.declared', 'override', host);
      controller.execute(
        { subcommand: 'set', name: 'plain', value: 'val' },
        makeContext(host, location),
      );
      const result = controller.execute(
        { subcommand: 'list' },
        makeContext(host, location),
      );
      expect(result.summary).toMatch(/1 vars/);
    });
  });

  describe('set', () => {
    it('writes an ad-hoc var to the session store', () => {
      const result = controller.execute(
        { subcommand: 'set', name: 'greeting', value: 'hello' },
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(host.sessionStore.greeting).toBe('hello');
    });

    it('rejects a declared-key write (D3 back-door close)', () => {
      const result = controller.execute(
        { subcommand: 'set', name: 'feature.declared', value: 'sneak' },
        makeContext(host, location),
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/declared setting/);
    });
  });

  describe('unset', () => {
    it('clears an existing var', () => {
      controller.execute(
        { subcommand: 'set', name: 'tmp', value: 'gone' },
        makeContext(host, location),
      );
      const result = controller.execute(
        { subcommand: 'unset', name: 'tmp' },
        makeContext(host, location),
      );
      expect(result.success).toBe(true);
      expect(host.sessionStore.tmp).toBeUndefined();
    });
  });
});
