/**
 * Tests for MudlogApi — recipient resolution, throws-on-no-recipient,
 * commandId stamping, and async-aftermath causingCommandId via
 * ScheduleApi propagation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MudlogApi } from '../mudlog';
import { Mml } from '../mml';
import { ScheduleApi } from '../schedule';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { Stuff } from '../../lib/stuff/Stuff';
import { SensorMixin } from '../../lib/message/Sensor';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

class CapSensor extends SensorMixin(ContainableMixin(Stuff)) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

describe('MudlogApi recipient resolution', () => {
  it('opts.to (single sensor) overrides everything', () => {
    const s = makeStuff(() => new CapSensor());
    MudlogApi.info(Mml.compose`hello`, { to: s });
    expect(s.received).toHaveLength(1);
    expect(s.received[0]!.topic).toBe('system.log.info');
  });

  it('opts.to as an array delivers to all listed sensors', () => {
    const a = makeStuff(() => new CapSensor());
    const b = makeStuff(() => new CapSensor());
    MudlogApi.warn('admin', Mml.compose`heads up`, { to: [a, b] });
    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(1);
    expect(a.received[0]!.topic).toBe('system.log.admin.warn');
  });

  it('falls back to the command giver when opts.to is absent', () => {
    const giver = makeStuff(() => new CapSensor());
    const fakeCtx = {
      commandGiver: giver,
      commandText: 'x',
      executionId: 'e',
      commandId: 'cmd-1',
    };
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        giver,
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: {
            commandContext: fakeCtx,
            causingCommandId: 'cmd-1',
          },
        },
        () => {
          MudlogApi.info(Mml.compose`from inside cmd`);
        }
      );
    });
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.info');
  });

  it('throws when no recipient is obtainable', () => {
    expect(() => MudlogApi.info(Mml.compose`orphan`)).toThrow(/no recipient/);
  });

  it('throws when the command giver is not a Sensor', () => {
    class NonSensor extends Stuff {}
    const giver = makeStuff(() => new NonSensor()) as unknown as CapSensor;
    const fakeCtx = {
      commandGiver: giver,
      commandText: 'x',
      executionId: 'e',
      commandId: 'cmd-1',
    };
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        giver,
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: {
            commandContext: fakeCtx,
            causingCommandId: 'cmd-1',
          },
        },
        () => {
          expect(() => MudlogApi.info(Mml.compose`x`)).toThrow(/recipient/);
        }
      );
    });
  });
});

describe('MudlogApi topic + frame shape', () => {
  it('every level has body-only and categorized overloads', () => {
    const s = makeStuff(() => new CapSensor());
    MudlogApi.trace(Mml.compose`t`, { to: s });
    MudlogApi.debug(Mml.compose`d`, { to: s });
    MudlogApi.info(Mml.compose`i`, { to: s });
    MudlogApi.warn(Mml.compose`w`, { to: s });
    MudlogApi.error(Mml.compose`e`, { to: s });
    MudlogApi.fatal(Mml.compose`f`, { to: s });
    MudlogApi.info('cat', Mml.compose`ic`, { to: s });

    const topics = s.received.map((f) => f.topic);
    expect(topics).toEqual([
      'system.log.trace',
      'system.log.debug',
      'system.log.info',
      'system.log.warn',
      'system.log.error',
      'system.log.fatal',
      'system.log.cat.info',
    ]);
  });

  it('frames carry level: tag and (when categorized) category: tag', () => {
    const s = makeStuff(() => new CapSensor());
    MudlogApi.warn('hot-reload', Mml.compose`x`, { to: s });
    expect(s.received[0]!.tags).toEqual(
      expect.arrayContaining(['level:warn', 'category:hot-reload'])
    );
  });

  it('passes through opts.payload onto the frame', () => {
    const s = makeStuff(() => new CapSensor());
    MudlogApi.info(Mml.compose`x`, { to: s, payload: { extra: 1 } });
    expect(s.received[0]!.payload).toEqual({ extra: 1 });
  });
});

describe('MudlogApi attribution stamping', () => {
  it('stamps commandId during a command execution', () => {
    const s = makeStuff(() => new CapSensor());
    const fakeCtx = {
      commandGiver: s,
      commandText: 'x',
      executionId: 'e',
      commandId: 'cmd-A',
    };
    ExecutionContextApi.runRoot(null, 'r', () => {
      ExecutionContextApi.run(
        null,
        s,
        'executeCommand',
        {
          kind: FrameKind.Command,
          metadata: {
            commandContext: fakeCtx,
            causingCommandId: 'cmd-A',
          },
        },
        () => {
          MudlogApi.info('command', Mml.compose`look: ok`);
        }
      );
    });
    expect(s.received).toHaveLength(1);
    expect(s.received[0]!.meta.commandId).toBe('cmd-A');
    expect(s.received[0]!.meta.causingCommandId).toBe('cmd-A');
  });

  describe('async aftermath via ScheduleApi', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('stamps causingCommandId but not commandId after a propagating schedule', () => {
      const s = makeStuff(() => new CapSensor());
      const fakeCtx = {
        commandGiver: s,
        commandText: 'x',
        executionId: 'e',
        commandId: 'cmd-B',
      };
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(
          null,
          s,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: {
              commandContext: fakeCtx,
              causingCommandId: 'cmd-B',
            },
          },
          () => {
            ScheduleApi.schedule(50, () => {
              MudlogApi.info(Mml.compose`from async`, { to: s });
            });
          }
        );
      });
      vi.advanceTimersByTime(50);
      // CommandContext is gone (no live commandId), but the chain
      // re-planted causingCommandId on the Root frame ScheduleApi
      // built.
      expect(s.received).toHaveLength(1);
      expect(s.received[0]!.meta.commandId).toBeUndefined();
      expect(s.received[0]!.meta.causingCommandId).toBe('cmd-B');
    });
  });
});

describe('MudlogApi.isEnabled', () => {
  it('returns true in v1 (no level/category filtering)', () => {
    expect(MudlogApi.isEnabled('combat', 'debug')).toBe(true);
    expect(MudlogApi.isEnabled(undefined, 'fatal')).toBe(true);
  });
});
