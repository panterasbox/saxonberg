/**
 * Recency-stack tests for shadow attach / detach.
 *
 * A shadow attached to a CommandGiver host can declare a static
 * `commandContributions` block; ShadowApi.attach pushes the shadow's
 * contributions onto the host's recency stack via the sealed
 * mutation surface, and detach pops them. All four buckets reach
 * the right givers (self → host, inventory → host's holder if a CG,
 * environment/peers → host's CG siblings).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { ShadowApi } from '../../../api/shadow';
import { Shadow } from '../../stuff/Shadow';
import { CommandApi } from '../../../api/command';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import Location from '../../stuff/Location';
import { ContainmentApi } from '../../../api/containment';
import { Shadowing } from '../../security/decorators';
import { makeStuff } from '../../security/__tests__/test-setup';
import type {
  CommandGiver,
  RecencyEntry,
} from '../CommandGiver';
import type { CommandContributions } from '../../../api/command';
import type { Stuff } from '../../stuff/Stuff';

const HostBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestHost extends HostBase {
  static override commandContributions: CommandContributions = {
    self: ['platform/cmd/system/ping.yaml'],
  };
  protected override handleMessage(_frame: unknown): void {
    // discard
  }
  // Shadow must intercept SOMETHING — give the host a method shadows
  // can declare against.
  zap(): string {
    return 'host-zap';
  }
}

class SelfBucketShadow extends Shadow {
  static commandContributions = {
    self: ['platform/cmd/inventory/inventory.yaml'],
  };
  @Shadowing
  zap(): string {
    return this.callDown<string>();
  }
}

class EnvBucketShadow extends Shadow {
  static commandContributions = {
      peers: ['platform/cmd/perception/look.yaml'],
  };
  @Shadowing
  zap(): string {
    return this.callDown<string>();
  }
}

function stackOf(host: TestHost): RecencyEntry[] {
  return (host as unknown as { _commandStack: RecencyEntry[] })._commandStack;
}

describe('Shadow ↔ recency stack integration', () => {
  beforeEach(() => {
    CommandApi.clearCache();
  });

  it('shadow self contributions land on the host stack on attach', () => {
    const host = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    host.getAvailableCommands(); // seed self
    const baseLen = stackOf(host).length;

    const shadow = makeStuff(() => new SelfBucketShadow());
    ShadowApi.attach(host, shadow);

    expect(stackOf(host).length).toBe(baseLen + 1);
    const top = stackOf(host)[stackOf(host).length - 1]!;
    expect(top.bucket).toBe('self');
    expect(top.source).toBe(shadow as unknown as Stuff);
    expect(top.commands.map((c) => c.getPrimaryVerb())).toContain('inventory');
  });

  it('detach pops the shadow contributions from the host', () => {
    const host = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    host.getAvailableCommands();
    const shadow = makeStuff(() => new SelfBucketShadow());
    ShadowApi.attach(host, shadow);
    const attached = stackOf(host).length;

    ShadowApi.detach(shadow);

    expect(stackOf(host).length).toBe(attached - 1);
    expect(
      stackOf(host).some((e) => e.source === (shadow as unknown as Stuff))
    ).toBe(false);
  });

  it('a shadow\'s peers contribution lands on each CG sibling', () => {
    const loc = makeStuff(() => new Location());
    const host = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    const peer = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    ContainmentApi.move(host, loc);
    ContainmentApi.move(peer, loc);
    peer.getAvailableCommands();
    const peerBaseLen = stackOf(peer).length;

    const shadow = makeStuff(() => new EnvBucketShadow());
    ShadowApi.attach(host, shadow);

    // ONE new entry, not two. Under the directional model `environment`
    // (outward) and `peers` (sideways) are different fan-outs; the old
    // pair were two names for the same sibling push, and the shadow's
    // contribution collapses to the one that actually means "siblings".
    expect(stackOf(peer).length).toBe(peerBaseLen + 1);
    const fromShadow = stackOf(peer).filter(
      (e) => e.source === (shadow as unknown as Stuff)
    );
    expect(fromShadow.map((e) => e.bucket)).toEqual(['peers']);
  });

  it('detach pops the peers entry from siblings', () => {
    const loc = makeStuff(() => new Location());
    const host = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    const peer = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    ContainmentApi.move(host, loc);
    ContainmentApi.move(peer, loc);
    peer.getAvailableCommands();
    const shadow = makeStuff(() => new EnvBucketShadow());
    ShadowApi.attach(host, shadow);
    const attached = stackOf(peer).length;

    ShadowApi.detach(shadow);

    expect(stackOf(peer).length).toBe(attached - 1);
    expect(
      stackOf(peer).some((e) => e.source === (shadow as unknown as Stuff))
    ).toBe(false);
  });

  it('shadow without commandContributions is a no-op on the stack', () => {
    class BareShadow extends Shadow {
      @Shadowing
      zap(): string {
        return this.callDown<string>();
      }
    }
    const host = makeStuff(() => new TestHost()) as TestHost & CommandGiver;
    host.getAvailableCommands();
    const baseLen = stackOf(host).length;

    const shadow = makeStuff(() => new BareShadow());
    ShadowApi.attach(host, shadow);

    expect(stackOf(host).length).toBe(baseLen);
  });
});
