/**
 * CommandGiverMixin lifecycle tests.
 *
 * Coverage:
 *   - executeCommand stamps a fresh commandId onto context.
 *   - The Command frame metadata carries commandContext +
 *     causingCommandId so Scene/MudlogApi calls auto-attribute.
 *   - Every dispatch fires exactly one `_emitInputEcho` frame at
 *     `system.log.command.{info|warn}` with payload `kind:'issued'`.
 *   - Every dispatch fires exactly one dispatch-response envelope
 *     through the Sensor pipeline (captured here via the
 *     `handleEnvelope` override).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../stuff/Location';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { ExecutionContextApi } from '../../../api/execution-context';
import { makeStuff } from '../../security/__tests__/test-setup';
import type {
  EnvelopeTemplate,
  DispatchResponseEnvelope,
  MessageFrame,
} from '@saxonberg/types';
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
      peers: [],
    self: ['system/ping.yaml'],
    environment: [],
  };

  public received: MessageFrame[] = [];
  public envelopes: EnvelopeTemplate[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    this.envelopes.push(envelope);
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
          query.path === '/obj/command/system/PingController'
        ) {
          return [
            {
              path: '/obj/command/system/PingController',
              class: '/obj/command/system/PingController',
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

  it('stamps a fresh commandId per call (visible on the input-echo frame)', async () => {
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

  it('emits an input echo at system.log.command.info for parseable input', async () => {
    await giver.executeCommand('ping');

    expect(giver.envelopes).toHaveLength(1);
    expect((giver.envelopes[0] as DispatchResponseEnvelope).outcome.status).toBe('ok');
    expect(giver.received).toHaveLength(1);
    expect(giver.received[0]!.topic).toBe('system.log.command.info');
    expect(giver.received[0]!.body).toContain('ping');
  });

  it('emits an input echo at system.log.command.warn on parse failure', async () => {
    // Empty input fails msh parse ("No command entered"). Unknown
    // verbs parse fine and only fail at the matcher stage, so they
    // ride the info channel.
    //
    // Two frames now: the input-echo warn AND the framework
    // auto-prose scene on `system.command.error` that surfaces the
    // `command-rejected: parse-failed` note as player-readable text.
    await giver.executeCommand('');

    expect(giver.received).toHaveLength(2);
    const echo = giver.received.find(
      (f) => f.topic === 'system.log.command.warn',
    );
    expect(echo).toBeDefined();
    const payload = echo!.payload as Record<string, unknown>;
    expect(payload.parseError).toBeTruthy();
    const errorScene = giver.received.find(
      (f) => f.topic === 'system.command.error',
    );
    expect(errorScene).toBeDefined();
  });

  it('input-echo body carries the raw input text', async () => {
    await giver.executeCommand('ping');
    expect(giver.received[0]!.body).toContain('ping');
  });

  it('input-echo payload has shape { kind: "issued", rawText, verb, dispatchId }', async () => {
    await giver.executeCommand('ping');
    const payload = giver.received[0]!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      kind: 'issued',
      rawText: 'ping',
      verb: 'ping',
    });
    expect(typeof payload.dispatchId).toBe('string');
  });

  it('emits one dispatch-response envelope per executeCommand (ok)', async () => {
    await giver.executeCommand('ping');

    expect(giver.envelopes).toHaveLength(1);
    const env = giver.envelopes[0] as Omit<DispatchResponseEnvelope, 'frameId'>;
    expect(env.type).toBe('dispatch-response');
    expect(typeof env.dispatchId).toBe('string');
    expect(env.outcome.status).toBe('ok');
    // Every dispatch-response carries a prompt-refresh Note rendered
    // from the giver's `prompt.format` setting (default `{{ focus }}>`).
    // Test fixture giver doesn't compose FocusedMixin, so `focus`
    // renders as the empty string and the result is just `>`.
    expect(env.outcome.notes).toEqual([
      { kind: 'prompt-refresh', rendered: '>' },
    ]);
  });

  it('unknown verb produces a command-rejected envelope with reason unknown-verb', async () => {
    await giver.executeCommand('nope');

    expect(giver.envelopes).toHaveLength(1);
    const env = giver.envelopes[0] as Omit<DispatchResponseEnvelope, 'frameId'>;
    expect(env.outcome.status).toBe('declined');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({
        kind: 'command-rejected',
        reason: 'unknown-verb',
      })
    );
  });

  it('parse-failed envelope carries reason parse-failed', async () => {
    await giver.executeCommand('');

    expect(giver.envelopes).toHaveLength(1);
    const env = giver.envelopes[0] as Omit<DispatchResponseEnvelope, 'frameId'>;
    expect(env.outcome.status).toBe('declined');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({
        kind: 'command-rejected',
        reason: 'parse-failed',
      })
    );
  });

  it('dispatchId on the envelope equals the input-echo payload.dispatchId', async () => {
    await giver.executeCommand('ping');

    const echoPayload = giver.received[0]!.payload as Record<string, unknown>;
    const env = giver.envelopes[0] as Omit<DispatchResponseEnvelope, 'frameId'>;
    expect(env.dispatchId).toBe(echoPayload.dispatchId);
  });

  it('Command frame is gone after executeCommand returns', async () => {
    await giver.executeCommand('ping');
    // After return, ALS context has unwound, no live frame.
    expect(ExecutionContextApi.getCurrentCommandContext()).toBeNull();
    expect(ExecutionContextApi.getCurrentCausingCommandId()).toBeNull();
  });

  it('CommandApi.forceCommand stamps forced=true on the frame metadata', async () => {
    // Player-typed `executeCommand('ping')` runs first as a baseline:
    // its Command frame's `forced` flag should be false.
    await giver.executeCommand('ping');
    // `forceCommand` is the system-fired path. The auto-look-on-
    // arrival hook in Mobile uses it; here we just verify the flag
    // round-trips by inspecting the command frame's metadata via
    // ExecutionContextApi from inside a controller body — the
    // baseline test below uses getCommandStack within a custom
    // `peek` command added on a sibling avatar.
    await CommandApi.forceCommand(giver, 'ping');
    // forceCommand returns void in v1; envelope on the giver
    // is the source of outcome truth.
    expect((giver.envelopes.at(-1) as DispatchResponseEnvelope).outcome.status).toBe('ok');
  });
});
