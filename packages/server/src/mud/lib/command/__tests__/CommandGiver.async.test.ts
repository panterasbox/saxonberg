/**
 * Async command-dispatch tests.
 *
 * The `async` override detaches a command's controller body from the
 * giver's own input chain at accept-time: `executeCommand` resolves
 * before the body completes, and the single (late) dispatch-response
 * envelope fires when the body finishes. Default is sync (blocks the
 * giver's own chain) — and sync is per-giver, never global.
 *
 * Determinism comes from a test-owned `Deferred` gate the slow fixture
 * controller (`PingController.prototype.execute`, mocked) awaits — no
 * wall-clock, no fake timers. The `tick()` macrotask yield drains the
 * detached body's clone/execute microtasks up to the gate.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../stuff/Location';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { makeStuff } from '../../security/__tests__/test-setup';
import PingController from '../../../obj/command/system/PingController';
import { DiagnosticApi } from '../../../api/diagnostics';
import { ScriptApi } from '../../../api/script';
import type {
  EnvelopeTemplate,
  DispatchResponseEnvelope,
  MessageFrame,
} from '@saxonberg/types';
import { Idea } from '../../stuff/Idea';
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

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}
function makeDeferred<T = void>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
/** Yield a macrotask so pending microtasks (clone/execute) settle. */
const tick = (): Promise<void> =>
  new Promise((r) => setTimeout(r, 0));
/**
 * Drain several macrotasks — enough for a detached body to run its full
 * clone → execute → finally(emit) chain from a standing start (the async
 * `StuffApi.clone` spans multiple turns).
 */
const settle = async (n = 10): Promise<void> => {
  for (let i = 0; i < n; i++) await tick();
};
/** Drain macrotasks until `pred` holds (or a generous cap) — robust to
 * how many turns the detached clone/execute chain takes under load. */
const settleUntil = async (
  pred: () => boolean,
  max = 200
): Promise<void> => {
  for (let i = 0; i < max && !pred(); i++) await tick();
};

function mockPmForPing(): void {
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
}

const asEnv = (e: EnvelopeTemplate): Omit<DispatchResponseEnvelope, 'frameId'> =>
  e as Omit<DispatchResponseEnvelope, 'frameId'>;

/** The dispatchId of the most recent input-echo (== the command's id). */
function lastEchoDispatchId(giver: TestGiver): string {
  const echo = [...giver.received]
    .reverse()
    .find((f) => f.topic.startsWith('shell.diagnostic'));
  return (echo!.payload as { dispatchId: string }).dispatchId;
}

describe('async command dispatch', () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    mockPmForPing();
    location = makeStuff(() => new Location());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('async detaches: executeCommand resolves before the body completes; envelope fires late', async () => {
    const gate = makeDeferred();
    const events: string[] = [];
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        events.push('body-start');
        await gate.promise;
        events.push('body-end');
      }
    );

    await giver.executeCommand('ping --async');
    await settle(); // give the detached clone+execute a chance to start

    // executeCommand resolved though the body has NOT completed and no
    // dispatch-response has fired — the detached run owns it, fires it
    // late. (Whether the body has physically reached its first line yet
    // is a timing detail; that it hasn't *finished* is the invariant.)
    expect(events).not.toContain('body-end');
    expect(giver.envelopes).toHaveLength(0);
    // The dispatch id (input echo) is already stamped at accept-time.
    const dispatchId = lastEchoDispatchId(giver);

    gate.resolve();
    await settleUntil(() => giver.envelopes.length > 0);

    expect(events).toContain('body-end');
    expect(giver.envelopes).toHaveLength(1);
    const env = asEnv(giver.envelopes[0]!);
    expect(env.type).toBe('dispatch-response');
    expect(env.dispatchId).toBe(dispatchId);
    expect(env.outcome.status).toBe('ok');
  });

  it('sync (same slow controller) holds the giver chain until the body completes', async () => {
    const gate = makeDeferred();
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        await gate.promise;
      }
    );

    let resolved = false;
    const p = giver.executeCommand('ping').then(() => {
      resolved = true;
    });
    await tick();

    expect(resolved).toBe(false); // still blocked on the gate
    expect(giver.envelopes).toHaveLength(0);

    gate.resolve();
    await p;
    expect(resolved).toBe(true);
    expect(giver.envelopes).toHaveLength(1);
  });

  it('spec × flag matrix: flag overrides the verb spec default', async () => {
    // detaches(cmd) — true iff executeCommand resolves before the gate
    // (i.e. the body ran detached).
    async function detaches(cmd: string): Promise<boolean> {
      const gate = makeDeferred();
      const spy = vi
        .spyOn(PingController.prototype, 'execute')
        .mockImplementation(async () => {
          await gate.promise;
        });
      let resolved = false;
      const p = giver.executeCommand(cmd).then(() => {
        resolved = true;
      });
      await tick();
      const detached = resolved;
      gate.resolve();
      await p;
      spy.mockRestore();
      return detached;
    }

    // spec async: false (ping's real default)
    expect(await detaches('ping')).toBe(false); // no flag → sync
    expect(await detaches('ping --async')).toBe(true); // flag → async

    // spec async: true — flip the cached ping def (isolated: beforeEach
    // clearCache reloads it). The dispatcher reads `command.async` off
    // this same cached instance via the recency stack.
    const def = CommandApi.getCommand('system/ping.yaml')!;
    (def as { async: boolean }).async = true;
    expect(await detaches('ping')).toBe(true); // spec → async
    expect(await detaches('ping --sync')).toBe(false); // flag overrides → sync
  });

  it('a detached body that throws surfaces a user-visible error envelope (not a silent log)', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        throw new Error('boom');
      }
    );

    await giver.executeCommand('ping --async');
    await settleUntil(() => giver.envelopes.length > 0);

    expect(giver.envelopes).toHaveLength(1);
    const env = asEnv(giver.envelopes[0]!);
    expect(env.outcome.status).toBe('error');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({ kind: 'controller-error' })
    );
  });

  it('a controller throw also records an author diagnostic (store + push)', async () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        throw new Error('kaboom');
      }
    );

    await giver.executeCommand('ping --async');
    await settleUntil(() => giver.envelopes.length > 0);

    expect(record).toHaveBeenCalledTimes(1);
    const arg = record.mock.calls[0]?.[0];
    expect(arg?.path).toBe('/obj/command/system/PingController');
    expect(arg?.message).toContain('kaboom');
  });

  it('async fires exactly one dispatch-response, keyed on the command id', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        /* fast, no-op body */
      }
    );

    await giver.executeCommand('ping --async');
    await settleUntil(() => giver.envelopes.length > 0);

    expect(giver.envelopes).toHaveLength(1);
    expect(asEnv(giver.envelopes[0]!).dispatchId).toBe(
      lastEchoDispatchId(giver)
    );
  });

  it('the input echo fires at accept-time, ahead of the detached body', async () => {
    const gate = makeDeferred();
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async () => {
        await gate.promise;
      }
    );

    await giver.executeCommand('ping --async');
    // Body still parked — but the input echo already landed.
    const echo = giver.received.find((f) =>
      f.topic.startsWith('shell.diagnostic')
    );
    expect(echo).toBeDefined();
    expect((echo!.payload as { kind: string }).kind).toBe('issued');

    gate.resolve();
    await tick();
  });

  it('a pre-execute failure (unknown verb) never detaches — one synchronous envelope', async () => {
    await giver.executeCommand('nope --async');
    // Synchronous: the envelope is already present with no tick.
    expect(giver.envelopes).toHaveLength(1);
    const env = asEnv(giver.envelopes[0]!);
    expect(env.outcome.status).toBe('declined');
    expect(env.outcome.notes).toContainEqual(
      expect.objectContaining({ kind: 'command-rejected', reason: 'unknown-verb' })
    );
  });
});

describe('sync is per-giver, not global', () => {
  let giverA: TestGiver;
  let giverB: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    mockPmForPing();
    location = makeStuff(() => new Location());
    giverA = makeStuff(() => new TestGiver());
    giverB = makeStuff(() => new TestGiver());
    ContainmentApi.move(giverA, location);
    ContainmentApi.move(giverB, location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("giver A's slow SYNC command does not block giver B's command", async () => {
    // Inbound is serialized per-socket (ConnectionApi.sequenceInbound's
    // ordered lane; prompt replies ride the second lane);
    // this exercises the underlying per-giver property directly. The
    // slow body only stalls giver A (keyed on the executing giver).
    const gate = makeDeferred();
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(
      async (_model, ctx: { commandGiver: unknown }) => {
        if (ctx.commandGiver === giverA) await gate.promise;
      }
    );

    let aDone = false;
    const pA = giverA.executeCommand('ping').then(() => {
      aDone = true;
    });

    // B's chain is independent — it completes while A is parked.
    await giverB.executeCommand('ping');
    expect(giverB.envelopes).toHaveLength(1);
    expect(aDone).toBe(false);

    gate.resolve();
    await pA;
    expect(aDone).toBe(true);
    expect(giverA.envelopes).toHaveLength(1);
  });
});

/**
 * The `script` verb is an ordinary command routed through `_executeOne`,
 * so it inherits the async override with no special-casing. `ScriptApi.run`
 * is mocked (a gate) — the interpreter isn't under test here, only that
 * the verb rides the same detach seam.
 */
class ScriptGiver extends TestGiver {
  static override commandContributions = {
      peers: [],
    self: ['shell/script.yaml'],
    environment: [],
  };
}

describe('the script verb inherits the async override', () => {
  let giver: ScriptGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === '/obj/command/shell/ScriptController'
        ) {
          return [
            {
              path: '/obj/command/shell/ScriptController',
              class: '/obj/command/shell/ScriptController',
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
    giver = makeStuff(() => new ScriptGiver());
    ContainmentApi.move(giver, location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The body is a single statement: a top-level `;` would be split by
  // the script parser into the bare-typed-script path (`parseResult.
  // script`) BEFORE the `script` verb — that path is the unflaggable
  // sync sibling, tested elsewhere. The verb's flaggable surface is the
  // single-statement (or client `fields.body`) body.
  it('script <body> is sync by default — holds the giver chain', async () => {
    const gate = makeDeferred();
    vi.spyOn(ScriptApi, 'run').mockImplementation(async () => {
      await gate.promise;
    });

    let resolved = false;
    const p = giver.executeCommand('script look at the sword').then(() => {
      resolved = true;
    });
    await tick();
    expect(resolved).toBe(false); // blocked on the (mocked) script run
    expect(giver.envelopes).toHaveLength(0);

    gate.resolve();
    await p;
    expect(resolved).toBe(true);
    expect(giver.envelopes).toHaveLength(1);
  });

  it('script --async <body> detaches — frees the prompt, fires one late envelope', async () => {
    const gate = makeDeferred();
    const runs: string[] = [];
    vi.spyOn(ScriptApi, 'run').mockImplementation(async (text: string) => {
      runs.push(text);
      await gate.promise;
    });

    await giver.executeCommand('script --async look at the sword');
    await settleUntil(() => runs.length > 0);

    // Prompt freed though the script run is parked; the body received
    // the greedy remainder (the flag was stripped, not part of the body).
    expect(runs).toEqual(['look at the sword']);
    expect(giver.envelopes).toHaveLength(0);
    const dispatchId = lastEchoDispatchId(giver);

    gate.resolve();
    await settleUntil(() => giver.envelopes.length > 0);

    expect(giver.envelopes).toHaveLength(1);
    expect(asEnv(giver.envelopes[0]!).dispatchId).toBe(dispatchId);
  });
});
