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
import { ExecutionContext, FrameKind } from './ExecutionContext';
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
        { kind: FrameKind.Command },
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

  describe('frame-mutator allowlist', () => {
    it('allows mud/lib/security/ files', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/lib/security/proxy.ts'
        )
      ).not.toThrow();
    });

    it('allows any mud/api/ file', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/api/stuff.ts'
        )
      ).not.toThrow();
    });

    it('allows backend/ files (Backend.runRoot)', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'runRoot',
          'file:///proj/packages/server/src/backend/Backend.ts'
        )
      ).not.toThrow();
    });

    it('allows the CommandGiver mixin specifically', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'tagCurrentFrame',
          'file:///proj/packages/server/src/mud/lib/command/CommandGiver.ts'
        )
      ).not.toThrow();
    });

    it('allows test files', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/api/whatever.test.ts'
        )
      ).not.toThrow();
    });

    it('denies a domain file outside the allowlist', () => {
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/domain/evil.ts'
        )
      ).toThrow(SecurityError);
    });

    it('denies a different mixin outside the allowlist (eg. mud/lib/character/)', () => {
      // Drives home that "mud/lib" alone isn't trusted — only
      // specific files in it are. CommandGiver is in by name; a
      // hypothetical NamedMixin.ts is not.
      expect(() =>
        ExecutionContext._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/lib/character/Named.ts'
        )
      ).toThrow(SecurityError);
    });

    it('error message names the offender and the operation', () => {
      try {
        ExecutionContext._checkAllowlistForTest(
          'tagCurrentFrame',
          'file:///proj/packages/server/src/mud/domain/evil.ts'
        );
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SecurityError);
        const err = e as SecurityError;
        expect(err.message).toContain('tagCurrentFrame');
        expect(err.message).toContain('mud/domain/evil.ts');
      }
    });
  });

  describe('frame kinds + tagging', () => {
    it('tagCurrentFrame stamps the top frame in place', () => {
      const target = new Target();
      ExecutionContext.runRoot(target, 'outer', () => {
        ExecutionContext.run(null, target, 'm', undefined, () => {
          expect(ExecutionContext.findFrame(FrameKind.Command)).toBeNull();
          ExecutionContext.tagCurrentFrame(FrameKind.Command);
          const frame = ExecutionContext.findFrame(FrameKind.Command);
          expect(frame?.target).toBe(target);
          expect(frame?.method).toBe('m');
        });
      });
    });

    it('tagCurrentFrame throws outside any frame context', () => {
      expect(() => ExecutionContext.tagCurrentFrame(FrameKind.Command))
        .toThrow(SecurityError);
    });

    it('findFrame returns the most recent (topmost) tagged frame', () => {
      const a = { kind: 'a' };
      const b = { kind: 'b' };
      ExecutionContext.runRoot(null, 'r', () => {
        ExecutionContext.run(null, a, 'm', { kind: FrameKind.Command }, () => {
          ExecutionContext.run(null, b, 'm', { kind: FrameKind.Command }, () => {
            expect(ExecutionContext.findFrame(FrameKind.Command)?.target).toBe(b);
          });
        });
      });
    });

    it('runRoot stamps the synthetic frame with FrameKind.Root', () => {
      ExecutionContext.runRoot(null, 'r', () => {
        const root = ExecutionContext.findFrame(FrameKind.Root);
        expect(root).not.toBeNull();
        expect(root?.method).toBe('r');
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
