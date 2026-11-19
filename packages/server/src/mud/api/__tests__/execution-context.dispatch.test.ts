/**
 * One store read per dispatch (call-security-performance W3, D4).
 *
 * The gate and the static Api wrapper read the frame stack ONCE
 * (`_dispatchContext`) and hand the node to the claimed push as `parent`,
 * where they used to read it three times. These pin that nothing about
 * WHAT a frame holds or WHERE it links changed: a push with the parent
 * builds the same stack as one without; an async continuation (which
 * passes none) links under the frame that awaited; interleaved async
 * chains keep their own stacks through the real gate; a dispatch under a
 * circle root reads that circle.
 *
 * Tests are frame-mutator-allowlisted (*.test.ts), so they claim the push
 * and plant roots directly.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecutionContextApi } from '../execution-context';
import { StuffApi } from '../stuff';
import Good from '../../lib/stuff/Good';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

const targets = (): unknown[] => ExecutionContextApi.getCallStack().map((f) => f.target);

beforeEach(() => StuffApi.clearAll());
afterEach(() => ExecutionContextApi._clearForTesting());

describe('the dispatch context', () => {
  it('is null with no stack, and the current node under one', () => {
    expect(ExecutionContextApi._dispatchContext()).toBeNull();
    const root = { r: 1 };
    ExecutionContextApi.runRoot(root, 'root', () => {
      const node = ExecutionContextApi._dispatchContext();
      expect(node?.frame.target).toBe(root);
      expect(node?.root).toBe(node);
    });
  });

  it('a push given the parent it read builds the same stack as one that reads it', () => {
    const push = ExecutionContextApi.claimFramePush();
    const root = { r: 1 };
    const a = { a: 1 };
    const b = { b: 1 };
    ExecutionContextApi.runRoot(root, 'root', () => {
      const node = ExecutionContextApi._dispatchContext();
      const withParent = push(root, a, 'm', undefined, () => push(a, b, 'n', undefined, targets), node);
      const without = push(root, a, 'm', undefined, () => push(a, b, 'n', undefined, targets));
      expect(withParent).toEqual([root, a, b]);
      expect(without).toEqual(withParent);
    });
  });

  it('a push with no parent after an await links under the frame that awaited', async () => {
    const push = ExecutionContextApi.claimFramePush();
    const root = { r: 1 };
    const awaiting = { w: 1 };
    const after = { x: 1 };
    const seen = await ExecutionContextApi.runRoot(root, 'root', () =>
      push(root, awaiting, 'wait', undefined, async () => {
        await new Promise((r) => setTimeout(r, 1));
        return push(awaiting, after, 'after', undefined, targets);
      })
    );
    expect(seen).toEqual([root, awaiting, after]);
  });
});

describe('through the real gate', () => {
  class Echo extends Good {
    /** The stack's outermost target, seen from inside a gated method. */
    public rootTarget(): unknown {
      return ExecutionContextApi.getCallStack()[0]?.target;
    }
    public async rootTargetLater(): Promise<unknown> {
      await new Promise((r) => setTimeout(r, 1));
      return this.rootTarget();
    }
  }

  it('two interleaved async chains keep their own stacks', async () => {
    const e = makeStuff(() => new Echo());
    const x = { chain: 'x' };
    const y = { chain: 'y' };
    const [fromX, fromY] = await Promise.all([
      ExecutionContextApi.runRoot(x, 'x', () => e.rootTargetLater()),
      ExecutionContextApi.runRoot(y, 'y', () => e.rootTargetLater()),
    ]);
    expect(fromX).toBe(x);
    expect(fromY).toBe(y);
  });

  it('a dispatch links its frame directly under the frame it was called from', () => {
    class Probe extends Good {
      public stack(): unknown[] {
        return targets();
      }
    }
    const p = makeStuff(() => new Probe());
    const root = { r: 1 };
    expect(ExecutionContextApi.runRoot(root, 'root', () => p.stack())).toEqual([root, p]);
  });

  it('a dispatch under a circle root reads that circle', () => {
    class Scoped extends Good {
      public scope(): string | null {
        return ExecutionContextApi.getCircleScope();
      }
    }
    const s = makeStuff(() => new Scoped());
    const SCOPE = '*';
    const seen = ExecutionContextApi.runRoot(null, 'root', () => s.scope(), { circleScope: SCOPE });
    expect(seen).toBe(SCOPE);
  });
});
