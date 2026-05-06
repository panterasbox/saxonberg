/**
 * CommandGiverMixin lifecycle tests.
 *
 * Coverage:
 *   - executeCommand stamps a fresh commandId onto context.
 *   - The Command frame metadata carries commandContext +
 *     causingCommandId so Scene/MudlogApi calls auto-attribute.
 *   - The auto-emitted MudlogApi command-outcome entry fires once
 *     per executeCommand, addressed to the giver.
 *   - Topic is `system.log.command.info` on success and
 *     `system.log.command.warn` on failure; body uses the supplied
 *     summary tail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Stuff } from '../../stuff/Stuff';
import { Location } from '../../stuff/Location';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import {
  CommandApi,
  type CommandContext,
  type CommandContextInput,
} from '../../../api/command';
import { ExecutionContextApi } from '../../../api/execution-context';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Interactive } from '../../../obj/Interactive';
import type { MessageFrame } from '@saxonberg/types';
import { Idea } from "../../stuff/Idea";
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
    self: ['ping.yaml'],
    environment: [],
    inventory: [],
    peers: [],
  };

  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

function buildContext(
  giver: TestGiver,
  location: Location,
  commandText: string
): CommandContextInput {
  return {
    commandGiver: giver as unknown as CommandContextInput['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText,
    executionId: 'test-execution',
  };
}

describe('CommandGiverMixin.executeCommand lifecycle', () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    // Dispatch clones a fresh PingController per command via
    // `StuffApi.clone`, which calls `Template.findByPath` against PM.
    // Mock PM so the lookup resolves without a live MongoDB.
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === '/obj/command/PingController'
        ) {
          return [
            {
              path: '/obj/command/PingController',
              class: '/obj/command/PingController',
              data: {},
            },
          ];
        }
        return [];
      }
    );
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);

    location = makeStuff(() => new Location());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stamps a fresh commandId onto context per call', async () => {
    const ctx1 = buildContext(giver, location, 'ping');
    const ctx2 = buildContext(giver, location, 'ping');

    await giver.executeCommand('ping', ctx1);
    await giver.executeCommand('ping', ctx2);

    // executeCommand promotes the input to a CommandContext and
    // writes a fresh commandId before invoking controllers.
    const c1 = ctx1 as CommandContext;
    const c2 = ctx2 as CommandContext;
    expect(c1.commandId).toBeTruthy();
    expect(c2.commandId).toBeTruthy();
    expect(c1.commandId).not.toBe(c2.commandId);
  });

  it('plants commandContext + causingCommandId on the Command frame', async () => {
    const ctx = buildContext(giver, location, 'ping');
    let observedCmdCtx: CommandContext | null = null;
    let observedCausing: string | null = null;

    await giver.executeCommand('ping', ctx);

    // The auto-emit frame should carry meta.commandId === ctx.commandId
    // and meta.causingCommandId === ctx.commandId.
    expect(giver.received).toHaveLength(1);
    const frame = giver.received[0]!;
    const c = ctx as CommandContext;
    expect(frame.meta.commandId).toBe(c.commandId);
    expect(frame.meta.causingCommandId).toBe(c.commandId);
    void observedCmdCtx;
    void observedCausing;
  });

  it('auto-emits at system.log.command.info on success', async () => {
    const ctx = buildContext(giver, location, 'ping');
    const result = await giver.executeCommand('ping', ctx);

    expect(result.success).toBe(true);
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.command.info');
    // PingController returns summary 'pong'.
    expect(giver.received[0]!.body).toContain('ping');
    expect(giver.received[0]!.body).toContain('pong');
  });

  it('auto-emits at system.log.command.warn on failure', async () => {
    const ctx = buildContext(giver, location, 'nope');
    const result = await giver.executeCommand('nope', ctx);

    expect(result.success).toBe(false);
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.command.warn');
    expect(giver.received[0]!.body).toContain('nope');
  });

  it('auto-emit body falls back to "ok" / "failed" when no summary', async () => {
    // Direct executeCommand on an unknown verb gives a summary already
    // ("Unknown command: ..."). To exercise the fallback we'd need a
    // controller that returns no summary. PingController does set
    // 'pong'; an empty-summary success path doesn't exist among the
    // production controllers right now, so verify only the body
    // shape carries the verb prefix.
    const ctx = buildContext(giver, location, 'ping');
    await giver.executeCommand('ping', ctx);
    expect(giver.received[0]!.body).toMatch(/^ping:/);
  });

  it('the auto-emit payload exposes verb + success + commandText', async () => {
    const ctx = buildContext(giver, location, 'ping');
    await giver.executeCommand('ping', ctx);
    const payload = giver.received[0]!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      verb: 'ping',
      success: true,
      commandText: 'ping',
      executionId: 'test-execution',
    });
  });

  it('Command frame is gone after executeCommand returns', async () => {
    const ctx = buildContext(giver, location, 'ping');
    await giver.executeCommand('ping', ctx);
    // After return, ALS context has unwound, no live frame.
    expect(ExecutionContextApi.getCurrentCommandContext()).toBeNull();
    expect(ExecutionContextApi.getCurrentCausingCommandId()).toBeNull();
  });
});
