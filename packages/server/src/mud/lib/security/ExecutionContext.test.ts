/**
 * ExecutionContext tests.
 *
 * Verifies the call-stack invariants from Stage 1 §Verification:
 *   - ALS push/pop survives `await`, `setTimeout`, `Promise.then`.
 *   - run / runRoot frame shape.
 *   - getCaller, getCurrentTarget, getCallStack, dumpCallStack.
 *   - getCurrentCommandGiver finds the nearest command-tagged frame.
 *   - assertCaller throws on mismatch.
 */

import { describe, it, expect } from 'vitest';
import { ExecutionContext, COMMAND_FRAME_KIND } from './ExecutionContext';
import { SecurityError } from './errors';

class Caller {}
class Target {}

describe('ExecutionContext', () => {
  it('returns null caller/target outside any wrapper', () => {
    expect(ExecutionContext.getCaller()).toBeNull();
    expect(ExecutionContext.getCurrentTarget()).toBeNull();
    expect(ExecutionContext.getCallStack()).toEqual([]);
  });

  it('runRoot plants a synthetic root frame with caller=null', () => {
    const target = new Target();
    ExecutionContext.runRoot(target, 'entry', () => {
      expect(ExecutionContext.getCaller()).toBeNull();
      expect(ExecutionContext.getCurrentTarget()).toBe(target);
      expect(ExecutionContext.getCallStack()).toHaveLength(1);
    });
  });

  it('run pushes a frame on top of the stack', () => {
    const a = new Caller();
    const b = new Target();
    ExecutionContext.runRoot(a, 'outer', () => {
      ExecutionContext.run(a, b, 'inner', undefined, () => {
        const stack = ExecutionContext.getCallStack();
        expect(stack).toHaveLength(2);
        expect(stack[1]!.method).toBe('inner');
        expect(stack[1]!.target).toBe(b);
        expect(ExecutionContext.getCurrentTarget()).toBe(b);
      });
    });
  });

  it('survives await boundary', async () => {
    const target = new Target();
    await ExecutionContext.runRoot(target, 'asyncEntry', async () => {
      expect(ExecutionContext.getCurrentTarget()).toBe(target);
      await new Promise((r) => setTimeout(r, 5));
      expect(ExecutionContext.getCurrentTarget()).toBe(target);
    });
  });

  it('survives Promise.then', async () => {
    const target = new Target();
    await ExecutionContext.runRoot(target, 'thenEntry', () =>
      Promise.resolve().then(() => {
        expect(ExecutionContext.getCurrentTarget()).toBe(target);
      })
    );
  });

  it('pops the frame on synchronous return', () => {
    const target = new Target();
    ExecutionContext.runRoot(target, 'tmp', () => {
      expect(ExecutionContext.getCallStack()).toHaveLength(1);
    });
    expect(ExecutionContext.getCallStack()).toEqual([]);
  });

  it('getCurrentCommandGiver finds the nearest command-tagged frame', () => {
    const player = { name: 'player' };
    const middle = { name: 'middle' };
    ExecutionContext.runRoot(null, 'root', () => {
      ExecutionContext.run(
        null,
        player,
        'executeCommand',
        { kind: COMMAND_FRAME_KIND },
        () => {
          ExecutionContext.run(player, middle, 'inner', undefined, () => {
            expect(ExecutionContext.getCurrentCommandGiver()).toBe(player);
          });
        }
      );
    });
  });

  it('getCurrentCommandGiver returns null with no command frame', () => {
    ExecutionContext.runRoot(null, 'root', () => {
      ExecutionContext.run(null, new Target(), 'inner', undefined, () => {
        expect(ExecutionContext.getCurrentCommandGiver()).toBeNull();
      });
    });
  });

  it('dumpCallStack renders human-readable frames', () => {
    const c = new Caller();
    const t = new Target();
    ExecutionContext.runRoot(t, 'outer', () => {
      ExecutionContext.run(c, t, 'inner', undefined, () => {
        const dump = ExecutionContext.dumpCallStack();
        expect(dump).toContain('outer');
        expect(dump).toContain('inner');
      });
    });
  });

  it('assertCaller throws when the immediate caller is the wrong class', () => {
    const c = new Caller();
    const t = new Target();
    ExecutionContext.runRoot(t, 'outer', () => {
      ExecutionContext.run(c, t, 'inner', undefined, () => {
        expect(() => ExecutionContext.assertCaller(Target)).toThrow(SecurityError);
      });
    });
  });
});
