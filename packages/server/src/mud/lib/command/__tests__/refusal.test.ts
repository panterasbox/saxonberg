/**
 * Failure-model W0 — a refusal with a row is worded by the root, returned
 * or thrown; a bug is worded `went-wrong` and never shows its own text.
 */
import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Place from '../../stuff/Place';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { makeStuff } from '../../security/__tests__/test-setup';
import PingController from '../../../platform/idea/cmd/system/PingController';
import { DiagnosticApi } from '../../../api/diagnostics';
import { CommandController } from '../CommandController';
import { Mml } from '../../../api/mml';
import type { CommandContext } from '../../../api/command';
import { ContentError, Refusal } from '../../errors';
import { ExecutionContextApi } from '../../../api/execution-context';
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
import { TestHarnessApi } from '../../../api/test-harness';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['platform/cmd/system/ping.yaml'],
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
        collection === Collections.Content &&
        query.path === '/platform/idea/cmd/system/PingController'
      ) {
        return [
          {
            path: '/platform/idea/cmd/system/PingController',
            class: '/platform/idea/cmd/system/PingController',
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


const LOCKED = '/platform/reasons/locked';
const WENT_WRONG = '/platform/reasons/went-wrong';

/** Stand a reason row as the installer would (parse = its validator). */
function standRow(path: string, data: Record<string, unknown>): void {
  const reasons = CommandApi.reasons();
  reasons.forget([path]);
  reasons.remember(path, reasons.parse(data, path));
}

const said = (g: TestGiver): string =>
  g.received.map((f) => String((f as { body?: unknown }).body ?? '')).join('\n');

describe('failure model W0 — reasons, the family, the envelope', () => {
  let giver: TestGiver;
  let location: Place;
  let door: Idea;

  beforeEach(() => {
    CommandApi.clearCache();
    mockPmForPing();
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    location = makeStuff(() => new Place());
    giver = makeStuff(() => new TestGiver());
    door = makeStuff(() => new Idea());
    ContainmentApi.move(giver, location);
    standRow(LOCKED, { facts: { target: 'thing' }, says: 'The lock holds on {{ target | item }}.' });
    standRow(WENT_WRONG, { says: 'Something went wrong there.', topic: 'shell.error', catchable: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const refusedNote = (): Record<string, unknown> | undefined =>
    asEnv(giver.envelopes[0]!).outcome.notes.find((n) => n.kind === 'refused') as
      | Record<string, unknown>
      | undefined;

  it('a returned refusal is noted `refused` and worded from its row by the root', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async (_m, ctx) => {
      ctx.refuse({ ok: false, reason: 'locked', facts: { target: door } });
    });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);

    const env = asEnv(giver.envelopes[0]!);
    expect(env.outcome.status).toBe('declined');
    expect(refusedNote()).toEqual({
      kind: 'refused',
      reason: 'locked',
      facts: { target: expect.objectContaining({ stuffId: door.stuffId }) },
    });
    expect(said(giver)).toContain('The lock holds on');
  });

  it('a thrown Refusal reads exactly as a returned one', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async (_m, ctx) => {
      ctx.refuse({ ok: false, reason: 'locked', facts: { target: door } });
    });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);
    const returnedNote = refusedNote();
    const returnedLine = said(giver);

    giver.envelopes.length = 0;
    giver.received.length = 0;
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async () => {
      throw new Refusal('/platform/reasons/locked', { target: door });
    });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);

    expect(refusedNote()).toEqual(returnedNote);
    expect(said(giver)).toBe(returnedLine);
    expect(asEnv(giver.envelopes[0]!).outcome.status).toBe('declined');
  });

  it('a bug says went-wrong and never its own text', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async () => {
      throw new Error('secret-internal-boom');
    });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);

    const env = asEnv(giver.envelopes[0]!);
    expect(env.outcome.status).toBe('error');
    const note = env.outcome.notes.find((n) => n.kind === 'controller-error') as { detail: string };
    expect(note.detail).toBe('Something went wrong there.');
    expect(JSON.stringify(env)).not.toContain('secret-internal-boom');
    expect(said(giver)).not.toContain('secret-internal-boom');
    expect(said(giver)).toContain('Something went wrong there.');
    expect(DiagnosticApi.record).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('secret-internal-boom') }),
    );
  });

  it('re-wording the row changes the sentence with no restart', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async (_m, ctx) => {
      ctx.refuse({ ok: false, reason: 'locked', facts: { target: door } });
    });
    standRow(LOCKED, { facts: { target: 'thing' }, says: 'Barred fast: {{ target | item }}.' });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);
    expect(said(giver)).toContain('Barred fast:');
  });

  it('a code no row ships is a defect: went-wrong and a diagnostic', async () => {
    vi.spyOn(PingController.prototype, 'execute').mockImplementation(async (_m, ctx) => {
      ctx.refuse({ ok: false, reason: 'no-such-reason-row' });
    });
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('ping'));
    await settleUntil(() => giver.envelopes.length > 0);
    expect(said(giver)).toContain('Something went wrong there.');
    expect(DiagnosticApi.record).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('no-such-reason-row') }),
    );
  });
});

describe('ReasonCatalogue — the code rule and the row', () => {
  const reasons = (): ReturnType<typeof CommandApi.reasons> => CommandApi.reasons();

  it('a bare word is the platform\'s; a path is itself', () => {
    expect(reasons().pathOf('locked')).toBe('/platform/reasons/locked');
    expect(reasons().pathOf('/trade/forestry/reasons/wrong-tool')).toBe('/trade/forestry/reasons/wrong-tool');
    expect(reasons().codeOf('/platform/reasons/locked')).toBe('locked');
    expect(reasons().codeOf('/trade/forestry/reasons/wrong-tool')).toBe('/trade/forestry/reasons/wrong-tool');
  });

  it('refuses a malformed row', () => {
    const p = '/platform/reasons/x';
    expect(() => reasons().parse({ says: 'hi', colour: 'red' }, p)).toThrow(/unknown key/);
    expect(() => reasons().parse({ facts: { a: 'blob' }, says: 'hi' }, p)).toThrow(/kind/);
    expect(() => reasons().parse({ says: '{{ target | item }} shut' }, p)).toThrow(/not a declared fact/);
    expect(() => reasons().parse({ facts: {}, says: '' }, p)).toThrow(/says/);
    expect(() => reasons().parse({ says: 'x', catchable: 'no' }, p)).toThrow(/catchable/);
  });

  it('checks a refusal\'s facts against its row', () => {
    const r = reasons().parse({ facts: { target: 'thing', why: 'text?' }, says: '{{ target | item }}' }, '/platform/reasons/y');
    expect(r.mismatch({})).toMatch(/missing fact 'target'/);
    expect(r.mismatch({ target: 'a string' })).toMatch(/not thing/);
    expect(r.mismatch({ target: { stuffId: 's1' } })).toBeNull();
    expect(r.mismatch({ target: { stuffId: 's1' }, other: 1 })).toMatch(/undeclared/);
  });
});

describe('failure model W3 — late failures are owned', () => {
  let giver: TestGiver;

  beforeEach(() => {
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    giver = makeStuff(() => new TestGiver());
    standRow(LOCKED, { facts: { target: 'thing' }, says: 'The lock holds.' });
    standRow(WENT_WRONG, { says: 'Something went wrong there.', topic: 'shell.error', catchable: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Run `fn` as work the giver caused, the way a scheduled root carries it. */
  const asCausedBy = <T>(fn: () => Promise<T>): Promise<T> =>
    ExecutionContextApi.runRoot(null, 'late', () => {
      ExecutionContextApi.updateCurrentFrameMetadata({ causingAuthor: giver });
      return fn();
    }, { acting: { boundary: 'test' } }) as Promise<T>;

  it('a late Refusal reaches the causing author worded, and records nothing', async () => {
    await asCausedBy(() => CommandApi.reportFailure(new Refusal('locked', { target: giver })));
    expect(said(giver)).toContain('The lock holds.');
    expect(DiagnosticApi.record).not.toHaveBeenCalled();
  });

  it('a late bug says went-wrong and records a diagnostic, never its text', async () => {
    await asCausedBy(() => CommandApi.reportFailure(new Error('late-secret'), null, '/somewhere'));
    expect(said(giver)).toContain('Something went wrong there.');
    expect(said(giver)).not.toContain('late-secret');
    expect(DiagnosticApi.record).toHaveBeenCalledWith(expect.objectContaining({ path: '/somewhere' }));
  });

  it('a content error records channel content-error at the row', async () => {
    await asCausedBy(() => CommandApi.reportFailure(new ContentError('/x/recipes/bad', 'baseGradeBand', 'not a band')));
    expect(DiagnosticApi.record).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/x/recipes/bad', channel: 'content-error' }),
    );
  });
});

/** A controller that engages a step whose completion is refused (the world changed under it). */
class LateRefusingController extends CommandController {
  async execute(): Promise<void> {
    /* not dispatched — `engage` drives the protocol directly */
  }
  engage(context: CommandContext, target: Idea): Promise<void> {
    return this.engagePlan(context, {
      ok: true,
      durationMs: 1000,
      effortW: 0,
      facts: undefined,
      onComplete: () => ({ ok: false, reason: 'locked', facts: { target } }),
    }, { beginSelf: () => Mml.compose`` });
  }
}

describe('failure model — a late completion refusal is said ONCE', () => {
  let giver: TestGiver;
  let door: Idea;

  beforeEach(() => {
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    giver = makeStuff(() => new TestGiver());
    door = makeStuff(() => new Idea());
    standRow(LOCKED, { facts: { target: 'thing' }, says: 'The lock holds on {{ target | item }}.' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ctxFor = (scriptLine?: string): CommandContext =>
    CommandApi.createCommandContext({
      commandGiver: giver,
      location: null,
      commandText: scriptLine ?? 'open north',
      executionId: 'e',
      commandId: 'c',
      verb: 'open',
      command: CommandApi.getCommand('platform/cmd/system/ping.yaml')!,
      ...(scriptLine !== undefined ? { scriptLine } : {}),
    });

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
  };

  it('in a script: left on the context for the stop line, and NOT said at once', async () => {
    const ctx = ctxFor('open north');
    await makeStuff(() => new LateRefusingController()).engage(ctx, door);
    await settle();
    expect(ctx.getRefusal()?.reason).toBe('locked');
    expect(said(giver)).not.toContain('The lock holds');
  });

  it('a typed command: said once, at once (its envelope already went)', async () => {
    const ctx = ctxFor();
    await ExecutionContextApi.runRoot(null, 'typed', async () => {
      ExecutionContextApi.updateCurrentFrameMetadata({ causingAuthor: giver });
      await makeStuff(() => new LateRefusingController()).engage(ctx, door);
      await settle();
    }, { acting: { boundary: 'test' } });
    expect(said(giver).match(/The lock holds/g)).toHaveLength(1);
  });
});
