/**
 * ExecutionContextApi tests.
 *
 * Verifies the call-stack invariants from Stage 1 §Verification:
 *   - ALS push/pop survives `await`, `setTimeout`, `Promise.then`.
 *   - run / runRoot frame shape.
 *   - getCaller, getCurrentTarget, getCallStack, dumpCallStack.
 *   - getCurrentCommandGiver finds the nearest command-tagged frame.
 *   - assertCaller throws on mismatch.
 */

import { describe, it, expect } from 'vitest';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { SecurityError } from '../../lib/security/errors';

class Caller {}
class Target {}

describe('ExecutionContextApi', () => {
  it('returns null caller/target outside any wrapper', () => {
    expect(ExecutionContextApi.getCaller()).toBeNull();
    expect(ExecutionContextApi.getCurrentTarget()).toBeNull();
    expect(ExecutionContextApi.getCallStack()).toEqual([]);
  });

  it('runRoot plants a synthetic root frame with caller=null', () => {
    const target = new Target();
    ExecutionContextApi.runRoot(target, 'entry', () => {
      expect(ExecutionContextApi.getCaller()).toBeNull();
      expect(ExecutionContextApi.getCurrentTarget()).toBe(target);
      expect(ExecutionContextApi.getCallStack()).toHaveLength(1);
    });
  });

  it('run pushes a frame on top of the stack', () => {
    const a = new Caller();
    const b = new Target();
    ExecutionContextApi.runRoot(a, 'outer', () => {
      ExecutionContextApi.run(a, b, 'inner', undefined, () => {
        const stack = ExecutionContextApi.getCallStack();
        expect(stack).toHaveLength(2);
        expect(stack[1]!.method).toBe('inner');
        expect(stack[1]!.target).toBe(b);
        expect(ExecutionContextApi.getCurrentTarget()).toBe(b);
      });
    });
  });

  it('survives await boundary', async () => {
    const target = new Target();
    await ExecutionContextApi.runRoot(target, 'asyncEntry', async () => {
      expect(ExecutionContextApi.getCurrentTarget()).toBe(target);
      await new Promise((r) => setTimeout(r, 5));
      expect(ExecutionContextApi.getCurrentTarget()).toBe(target);
    });
  });

  it('survives Promise.then', async () => {
    const target = new Target();
    await ExecutionContextApi.runRoot(target, 'thenEntry', () =>
      Promise.resolve().then(() => {
        expect(ExecutionContextApi.getCurrentTarget()).toBe(target);
      })
    );
  });

  it('pops the frame on synchronous return', () => {
    const target = new Target();
    ExecutionContextApi.runRoot(target, 'tmp', () => {
      expect(ExecutionContextApi.getCallStack()).toHaveLength(1);
    });
    expect(ExecutionContextApi.getCallStack()).toEqual([]);
  });

  it('getCurrentCommandGiver finds the nearest command-tagged frame', () => {
    const player = { name: 'player' };
    const middle = { name: 'middle' };
    ExecutionContextApi.runRoot(null, 'root', () => {
      ExecutionContextApi.run(
        null,
        player,
        'executeCommand',
        { kind: FrameKind.Command },
        () => {
          ExecutionContextApi.run(player, middle, 'inner', undefined, () => {
            expect(ExecutionContextApi.getCurrentCommandGiver()).toBe(player);
          });
        }
      );
    });
  });

  it('getCurrentCommandGiver returns null with no command frame', () => {
    ExecutionContextApi.runRoot(null, 'root', () => {
      ExecutionContextApi.run(null, new Target(), 'inner', undefined, () => {
        expect(ExecutionContextApi.getCurrentCommandGiver()).toBeNull();
      });
    });
  });

  describe('getCommandStack / getParentCommandContext', () => {
    function makeCtx(commandId: string): { commandId: string } {
      // Synthetic "CommandContext" for the test — getCommandStack
      // only reads `metadata.commandContext`, so a stub object is
      // sufficient. The real context shape is verified by the
      // command-pipeline tests.
      return { commandId };
    }

    it('returns an empty array outside any frame', () => {
      expect(ExecutionContextApi.getCommandStack()).toEqual([]);
      expect(ExecutionContextApi.getParentCommandContext()).toBeNull();
    });

    it('returns Command frames in outer→inner order with forced flag', () => {
      const outer = { name: 'outer-giver' };
      const inner = { name: 'inner-giver' };
      ExecutionContextApi.runRoot(null, 'root', () => {
        ExecutionContextApi.run(
          null,
          outer,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: {
              commandContext: makeCtx('outer-cmd'),
              forced: false,
            },
          },
          () => {
            ExecutionContextApi.run(
              outer,
              inner,
              'executeCommand',
              {
                kind: FrameKind.Command,
                metadata: {
                  commandContext: makeCtx('inner-cmd'),
                  forced: true,
                },
              },
              () => {
                const stack = ExecutionContextApi.getCommandStack();
                expect(stack).toHaveLength(2);
                expect(
                  (stack[0]!.context as { commandId: string }).commandId
                ).toBe('outer-cmd');
                expect(stack[0]!.forced).toBe(false);
                expect(
                  (stack[1]!.context as { commandId: string }).commandId
                ).toBe('inner-cmd');
                expect(stack[1]!.forced).toBe(true);

                // getParentCommandContext returns the second-from-
                // top frame (the outer command).
                const parent = ExecutionContextApi.getParentCommandContext();
                expect(
                  (parent as { commandId: string }).commandId
                ).toBe('outer-cmd');
              }
            );
          }
        );
      });
    });

    it('skips non-Command frames in the walk', () => {
      const giver = { name: 'giver' };
      ExecutionContextApi.runRoot(null, 'root', () => {
        ExecutionContextApi.run(
          null,
          giver,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: { commandContext: makeCtx('only-cmd'), forced: false },
          },
          () => {
            // Plain (untagged) inner frame between Command frames.
            ExecutionContextApi.run(giver, {}, 'helper', undefined, () => {
              const stack = ExecutionContextApi.getCommandStack();
              expect(stack).toHaveLength(1);
              expect(
                (stack[0]!.context as { commandId: string }).commandId
              ).toBe('only-cmd');
            });
          }
        );
      });
    });

    it('forced defaults to false when metadata omits the flag', () => {
      const giver = { name: 'giver' };
      ExecutionContextApi.runRoot(null, 'root', () => {
        ExecutionContextApi.run(
          null,
          giver,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: { commandContext: makeCtx('cmd') },
          },
          () => {
            const stack = ExecutionContextApi.getCommandStack();
            expect(stack[0]!.forced).toBe(false);
          }
        );
      });
    });

    it('getParentCommandContext returns null with only one Command frame', () => {
      const giver = { name: 'giver' };
      ExecutionContextApi.runRoot(null, 'root', () => {
        ExecutionContextApi.run(
          null,
          giver,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: { commandContext: makeCtx('only'), forced: false },
          },
          () => {
            expect(ExecutionContextApi.getParentCommandContext()).toBeNull();
          }
        );
      });
    });
  });

  it('dumpCallStack renders human-readable frames', () => {
    const c = new Caller();
    const t = new Target();
    ExecutionContextApi.runRoot(t, 'outer', () => {
      ExecutionContextApi.run(c, t, 'inner', undefined, () => {
        const dump = ExecutionContextApi.dumpCallStack();
        expect(dump).toContain('outer');
        expect(dump).toContain('inner');
      });
    });
  });

  describe('frame-mutator allowlist', () => {
    it('allows mud/lib/security/ files', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/lib/security/proxy.ts'
        )
      ).not.toThrow();
    });

    it('allows any mud/api/ file', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/api/stuff.ts'
        )
      ).not.toThrow();
    });

    it('allows backend/ files (Backend.runRoot)', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'runRoot',
          'file:///proj/packages/server/src/backend/Backend.ts'
        )
      ).not.toThrow();
    });

    it('allows the CommandGiver mixin specifically', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'tagCurrentFrame',
          'file:///proj/packages/server/src/mud/lib/command/CommandGiver.ts'
        )
      ).not.toThrow();
    });

    it('allows test files', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/api/whatever.test.ts'
        )
      ).not.toThrow();
    });

    it('denies a domain file outside the allowlist', () => {
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
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
        ExecutionContextApi._checkAllowlistForTest(
          'run',
          'file:///proj/packages/server/src/mud/lib/description/Named.ts'
        )
      ).toThrow(SecurityError);
    });

    it('error message names the offender and the operation', () => {
      try {
        ExecutionContextApi._checkAllowlistForTest(
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
      ExecutionContextApi.runRoot(target, 'outer', () => {
        ExecutionContextApi.run(null, target, 'm', undefined, () => {
          expect(ExecutionContextApi.findFrame(FrameKind.Command)).toBeNull();
          ExecutionContextApi.tagCurrentFrame(FrameKind.Command);
          const frame = ExecutionContextApi.findFrame(FrameKind.Command);
          expect(frame?.target).toBe(target);
          expect(frame?.method).toBe('m');
        });
      });
    });

    it('tagCurrentFrame throws outside any frame context', () => {
      expect(() => ExecutionContextApi.tagCurrentFrame(FrameKind.Command))
        .toThrow(SecurityError);
    });

    it('findFrame returns the most recent (topmost) tagged frame', () => {
      const a = { kind: 'a' };
      const b = { kind: 'b' };
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(null, a, 'm', { kind: FrameKind.Command }, () => {
          ExecutionContextApi.run(null, b, 'm', { kind: FrameKind.Command }, () => {
            expect(ExecutionContextApi.findFrame(FrameKind.Command)?.target).toBe(b);
          });
        });
      });
    });

    it('runRoot stamps the synthetic frame with FrameKind.Root', () => {
      ExecutionContextApi.runRoot(null, 'r', () => {
        const root = ExecutionContextApi.findFrame(FrameKind.Root);
        expect(root).not.toBeNull();
        expect(root?.method).toBe('r');
      });
    });
  });

  it('assertCaller throws when the immediate caller is the wrong class', () => {
    const c = new Caller();
    const t = new Target();
    ExecutionContextApi.runRoot(t, 'outer', () => {
      ExecutionContextApi.run(c, t, 'inner', undefined, () => {
        expect(() => ExecutionContextApi.assertCaller(Target)).toThrow(SecurityError);
      });
    });
  });

  describe('command-attribution accessors', () => {
    it('getCurrentCommandContext returns null outside any command frame', () => {
      ExecutionContextApi.runRoot(null, 'r', () => {
        expect(ExecutionContextApi.getCurrentCommandContext()).toBeNull();
      });
    });

    it('getCurrentCommandContext reads commandContext off the Command frame metadata', () => {
      const giver = { kind: 'giver' };
      const fakeCtx = {
        commandGiver: giver,
        commandText: 'look',
        executionId: 'x',
        commandId: 'cmd-1',
      };
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(
          null,
          giver,
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: { commandContext: fakeCtx },
          },
          () => {
            // Walk through a deeper non-Command frame and still find it.
            ExecutionContextApi.run(giver, {}, 'inner', undefined, () => {
              expect(ExecutionContextApi.getCurrentCommandContext()).toBe(
                fakeCtx
              );
            });
          }
        );
      });
    });

    it('getCurrentCausingCommandId walks top-down for the first metadata hit', () => {
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(
          null,
          {},
          'executeCommand',
          {
            kind: FrameKind.Command,
            metadata: { causingCommandId: 'cmd-outer' },
          },
          () => {
            ExecutionContextApi.run(
              null,
              {},
              'inner',
              { metadata: { causingCommandId: 'cmd-inner' } },
              () => {
                // Top-down walk picks the most recent one.
                expect(
                  ExecutionContextApi.getCurrentCausingCommandId()
                ).toBe('cmd-inner');
              }
            );
            // Back in outer frame.
            expect(
              ExecutionContextApi.getCurrentCausingCommandId()
            ).toBe('cmd-outer');
          }
        );
      });
    });

    it('getCurrentCausingCommandId returns null when no frame carries the metadata', () => {
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(null, {}, 'inner', undefined, () => {
          expect(
            ExecutionContextApi.getCurrentCausingCommandId()
          ).toBeNull();
        });
      });
    });

    it('updateCurrentFrameMetadata merges into the top frame', () => {
      ExecutionContextApi.runRoot(null, 'r', () => {
        ExecutionContextApi.run(null, {}, 'm', undefined, () => {
          ExecutionContextApi.updateCurrentFrameMetadata({
            causingCommandId: 'abc',
          });
          expect(
            ExecutionContextApi.getCurrentCausingCommandId()
          ).toBe('abc');
          // Subsequent merge augments rather than replaces.
          ExecutionContextApi.updateCurrentFrameMetadata({ extra: 1 });
          expect(
            ExecutionContextApi.getCurrentCausingCommandId()
          ).toBe('abc');
        });
      });
    });

    it('updateCurrentFrameMetadata throws outside any frame context', () => {
      expect(() =>
        ExecutionContextApi.updateCurrentFrameMetadata({ x: 1 })
      ).toThrow(SecurityError);
    });

    it('updateCurrentFrameMetadata is gated by the frame-mutator allowlist', () => {
      // Sanity: the allowlist gate covers updateCurrentFrameMetadata
      // alongside run/runRoot/tagCurrentFrame.
      expect(() =>
        ExecutionContextApi._checkAllowlistForTest(
          'updateCurrentFrameMetadata',
          'file:///proj/packages/server/src/mud/domain/evil.ts'
        )
      ).toThrow(SecurityError);
    });
  });
});
