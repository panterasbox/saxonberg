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
import { CommandApi } from '../../../api/command';
import { ExecutionContextApi } from '../../../api/execution-context';
import { makeStuff } from '../../security/__tests__/test-setup';
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

// The new executeCommand derives its own context — callers just
// pass the input text plus optional opts. Tests read the per-call
// commandId off the auto-emit frame's metadata.

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

  it('stamps a fresh commandId per call (visible on the auto-emit frame)', async () => {
    await giver.executeCommand('ping');
    await giver.executeCommand('ping');

    expect(giver.received).toHaveLength(2);
    const id1 = giver.received[0]!.meta.commandId;
    const id2 = giver.received[1]!.meta.commandId;
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('plants commandContext + causingCommandId on the Command frame', async () => {
    await giver.executeCommand('ping');

    expect(giver.received).toHaveLength(1);
    const frame = giver.received[0]!;
    expect(frame.meta.commandId).toBeTruthy();
    expect(frame.meta.causingCommandId).toBe(frame.meta.commandId);
  });

  it('auto-emits at system.log.command.info on success', async () => {
    const result = await giver.executeCommand('ping');

    expect(result.success).toBe(true);
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.command.info');
    expect(giver.received[0]!.body).toContain('ping');
    expect(giver.received[0]!.body).toContain('pong');
  });

  it('auto-emits at system.log.command.warn on failure', async () => {
    const result = await giver.executeCommand('nope');

    expect(result.success).toBe(false);
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.command.warn');
    expect(giver.received[0]!.body).toContain('nope');
  });

  it('auto-emit body carries the verb prefix', async () => {
    await giver.executeCommand('ping');
    expect(giver.received[0]!.body).toMatch(/^ping:/);
  });

  it('the auto-emit payload exposes verb + success + commandText', async () => {
    await giver.executeCommand('ping');
    const payload = giver.received[0]!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      verb: 'ping',
      success: true,
      commandText: 'ping',
    });
    expect(typeof payload.executionId).toBe('string');
  });

  it('Command frame is gone after executeCommand returns', async () => {
    await giver.executeCommand('ping');
    // After return, ALS context has unwound, no live frame.
    expect(ExecutionContextApi.getCurrentCommandContext()).toBeNull();
    expect(ExecutionContextApi.getCurrentCausingCommandId()).toBeNull();
  });
});
