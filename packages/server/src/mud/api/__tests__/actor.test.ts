/**
 * ⭐⭐ Who is ACTING (call-security pass W0) — `ExecutionContextApi.getActor`
 * beside the untouched `getActingAuthor`, the continuations that carry it,
 * the named system, an object acting as itself, and the check every
 * protective method makes: `AccessApi.requireActor`.
 */

import '../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { ScheduleApi } from '../schedule';
import { AccessApi } from '../access';
import { DiagnosticApi } from '../diagnostics';
import { TestHarnessApi } from '../test-harness';
import { ProxyApi } from '../proxy';
import { Refusal } from '../../lib/errors';
import { Idea } from '../../lib/stuff/Idea';
import type { Stuff } from '../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

class Person extends Idea {}

const person = (key: string): Stuff =>
  makeStuffAtPath(() => new Person(), `/platform/agent/Avatar/${key}`, `/platform/agent/Avatar/${key}`);

/** A Command frame for `giver`, as `CommandGiverMixin.executeCommand` tags one. */
function asCommand<T>(giver: unknown, forced: boolean, fn: () => T): T {
  return ExecutionContextApi.run(
    giver,
    giver,
    'executeCommand',
    { kind: FrameKind.Command, metadata: { commandContext: { commandGiver: giver }, forced } },
    fn,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('getActor — who is acting', () => {
  it('a typed command: the giver is both the actor and the author', () => {
    const ryn = person('ryn');
    ExecutionContextApi.runRoot(ryn, 'executeCommand', () =>
      asCommand(ryn, false, () => {
        expect(ExecutionContextApi.getActor()).toBe(ryn);
        expect(ExecutionContextApi.getActingAuthor()).toBe(ryn);
      }),
    );
  });

  it("an NPC's forced command is the NPC acting — and still has no author (pinned)", () => {
    const dave = person('dave');
    ExecutionContextApi.runRoot(dave, 'brain', () =>
      asCommand(dave, true, () => {
        expect(ExecutionContextApi.getActor()).toBe(dave);
        expect(ExecutionContextApi.getActingAuthor()).toBeNull();
      }),
    );
  });

  it('a ScheduleApi callback acts as whoever armed it; its author is unchanged', () => {
    vi.useFakeTimers();
    const ryn = person('ryn');
    let seen: unknown = 'unset';
    let author: unknown = 'unset';
    TestHarnessApi.actAs(ryn, () => {
      ScheduleApi.schedule(10, () => {
        seen = ExecutionContextApi.getActor();
        author = ExecutionContextApi.getCausingAuthor();
      });
    });
    vi.advanceTimersByTime(10);
    expect(seen).toBe(ryn);
    // Unchanged (pinned): a boundary's author tag was never a continuation's.
    expect(author).toBeNull();
  });

  it("a forced start's continuation acts as the NPC, though nobody authored it", () => {
    vi.useFakeTimers();
    const dave = person('dave');
    let seen: unknown = 'unset';
    let author: unknown = 'unset';
    ExecutionContextApi.runRoot(dave, 'brain', () =>
      asCommand(dave, true, () => {
        ScheduleApi.schedule(5, () => {
          seen = ExecutionContextApi.getActor();
          author = ExecutionContextApi.getCausingAuthor();
        });
      }),
    );
    vi.advanceTimersByTime(5);
    expect(seen).toBe(dave);
    expect(author).toBeNull();
  });

  it('the system acts by name, and is nobody', () => {
    ExecutionContextApi.runAsSystem('residency', () => {
      expect(ExecutionContextApi.actingSystem()).toBe('residency');
      expect(ExecutionContextApi.getActor()).toBeNull();
      expect(ExecutionContextApi.getActingAuthor()).toBeNull();
    });
  });

  it('a continuation of system work stays system work', () => {
    vi.useFakeTimers();
    let system: string | null = null;
    ExecutionContextApi.runAsSystem('boot', () => {
      ScheduleApi.schedule(1, () => {
        system = ExecutionContextApi.actingSystem();
      });
    });
    vi.advanceTimersByTime(1);
    expect(system).toBe('boot');
  });

  it('runAsSystem at an empty stack plants a root with NO circle scope (the clock would read * as quarantined)', () => {
    ExecutionContextApi.runAsSystem('boot', () => {
      expect(ExecutionContextApi.getCircleScope()).toBeNull();
    });
  });

  it('an unnamed root is nobody', () => {
    ExecutionContextApi.runRoot(null, 'timer', () => {
      expect(ExecutionContextApi.getActor()).toBeNull();
      expect(ExecutionContextApi.actingSystem()).toBeNull();
    });
  });

  it('runAsSelf makes the running object the actor — and only it', () => {
    const ryn = person('ryn');
    const cart = person('cart');
    TestHarnessApi.actAs(ryn, () => {
      ExecutionContextApi.run(ryn, cart, 'upkeep', undefined, () => {
        expect(ExecutionContextApi.getActor()).toBe(ryn);
        ExecutionContextApi.runAsSelf(() => {
          expect(ExecutionContextApi.getActor()).toBe(cart);
          // The gate's view of the caller is unchanged.
          expect(ExecutionContextApi.getCurrentTarget()).toBe(cart);
        });
      });
    });
  });

  it('captureActor + runAsCaptured carry the actor across a fresh root (the eval root)', () => {
    const wiz = person('wiz');
    const acting = TestHarnessApi.actAs(wiz, () => ExecutionContextApi.captureActor());
    ExecutionContextApi.runRoot(null, 'sandbox.runScoped', () =>
      ExecutionContextApi.runAsCaptured(acting, () => {
        expect(ExecutionContextApi.getActor()).toBe(wiz);
      }),
    );
  });

  it('a pack (or anything outside the Api tier) may not name the system on a schedule', () => {
    const outsider = person('outsider');
    expect(() =>
      ExecutionContextApi.runRoot(outsider, 'arm', () =>
        ScheduleApi.schedule(1, () => undefined, { system: 'residency' }),
      ),
    ).toThrow(/only the Api tier or a kernel singleton/);
  });
});

describe('AccessApi.requireActor — the check', () => {
  it('passes the honest actor, a null claim and the system', () => {
    const ryn = person('ryn');
    TestHarnessApi.actAs(ryn, () => {
      expect(() => AccessApi.requireActor(ryn)).not.toThrow();
      expect(() => AccessApi.requireActor(null)).not.toThrow();
    });
    ExecutionContextApi.runAsSystem('residency', () => {
      expect(() => AccessApi.requireActor(ryn)).not.toThrow();
    });
  });

  it("refuses another person, worded by the row, and tells the code's keeper", () => {
    const ryn = person('ryn');
    const sol = person('sol');
    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    let thrown: unknown = null;
    TestHarnessApi.actAs(sol, () => {
      try {
        AccessApi.requireActor(ryn);
      } catch (e) {
        thrown = e;
      }
    });
    expect(thrown).toBeInstanceOf(Refusal);
    expect((thrown as Refusal).reason).toBe('not-acting-for');
    expect((thrown as Refusal).facts.claimed).toBe(ryn);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'call-security', message: expect.stringContaining('claimed to act for /platform/agent/Avatar/ryn') }),
    );
  });

  it('refuses a claim made where nobody is acting', () => {
    const ryn = person('ryn');
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    expect(() => ExecutionContextApi.runRoot(null, 'timer', () => AccessApi.requireActor(ryn))).toThrow(Refusal);
  });

  it("refuses a forgery that answers the actor's stuffId, identity path and raw target", () => {
    const sol = person('sol');
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    // A forgery answers everything a reader could ask — even the proxy's
    // raw-target seam, with the actor's own raw self.
    const forged = {
      stuffId: sol.stuffId,
      getIdentityPath: () => sol.getIdentityPath(),
      getTemplatePath: () => sol.getTemplatePath(),
      [ProxyApi.RAW_TARGET]: ProxyApi.unwrap(sol),
    } as unknown as Stuff;
    expect(ProxyApi.unwrap(forged)).toBe(ProxyApi.unwrap(sol)); // unwrap is fooled; identityOf is not
    TestHarnessApi.actAs(sol, () => {
      expect(() => AccessApi.requireActor(forged)).toThrow(Refusal);
      // The real one — proxied or raw — passes.
      expect(() => AccessApi.requireActor(sol)).not.toThrow();
      expect(() => AccessApi.requireActor(ProxyApi.unwrap(sol))).not.toThrow();
    });
  });
});
