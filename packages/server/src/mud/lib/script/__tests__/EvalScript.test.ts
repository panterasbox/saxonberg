/**
 * EvalScript tests — vm-sandboxed eval container.
 *
 * Cover: code accessors clear the compiled cache, run() throws on empty
 * body, `this`/`self`/`target` bindings inside the sandbox resolve to
 * the receiver, allowlisted APIs are reachable, and non-allowlisted
 * globals (process, require, globalThis) are NOT reachable from inside
 * eval'd code.
 *
 * The sandbox via `vm.Script` is not the security boundary (per the
 * class docstring) — `@CallSecurity` on the exposed Apis is. These
 * tests just pin the moat: the curated SANDBOX_NAMES list IS the
 * contract, and a script trying to escape it gets a ReferenceError.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import EvalScript from '../EvalScript';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

class StubReceiver extends Idea {
  public marker = 'receiver';
}

describe('EvalScript', () => {
  let script: EvalScript;
  let receiver: StubReceiver;

  beforeEach(() => {
    script = makeStuff(() => new EvalScript());
    receiver = makeStuff(() => new StubReceiver());
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('code accessors', () => {
    it('starts with empty code', () => {
      expect(script.getCode()).toBe('');
    });

    it('setCode / getCode round-trip', () => {
      script.setCode('return 42;');
      expect(script.getCode()).toBe('return 42;');
    });

    it('setCode clears the compiled cache so a new body recompiles', async () => {
      script.setCode('return 1;');
      const first = await script.run(receiver);
      script.setCode('return 2;');
      const second = await script.run(receiver);
      expect(first).toBe(1);
      expect(second).toBe(2);
    });
  });

  describe('run()', () => {
    it('throws when the code body is empty', async () => {
      await expect(script.run(receiver)).rejects.toThrow(/no code/);
    });

    it('returns the value the wrapper function returns', async () => {
      script.setCode('return 42;');
      expect(await script.run(receiver)).toBe(42);
    });

    it('returns objects / arrays as-is', async () => {
      script.setCode('return { a: 1, b: [2, 3] };');
      expect(await script.run(receiver)).toEqual({ a: 1, b: [2, 3] });
    });

    it('binds `this` to the receiver', async () => {
      script.setCode('return this.marker;');
      expect(await script.run(receiver)).toBe('receiver');
    });

    it('exposes the receiver as `self`', async () => {
      script.setCode('return self.marker;');
      expect(await script.run(receiver)).toBe('receiver');
    });

    it('exposes the receiver as `target`', async () => {
      script.setCode('return target.marker;');
      expect(await script.run(receiver)).toBe('receiver');
    });

    it('uses the live receiver for each call (not the one at compile time)', async () => {
      script.setCode('return self.marker;');
      const a = makeStuff(() => {
        const s = new StubReceiver();
        s.marker = 'A';
        return s;
      });
      const b = makeStuff(() => {
        const s = new StubReceiver();
        s.marker = 'B';
        return s;
      });
      expect(await script.run(a)).toBe('A');
      expect(await script.run(b)).toBe('B');
    });

    it('propagates exceptions thrown by eval\'d code', async () => {
      script.setCode('throw new Error("bang");');
      await expect(script.run(receiver)).rejects.toThrow(/bang/);
    });
  });

  describe('sandbox allowlist', () => {
    it.each(['StuffApi', 'MqlApi', 'ContainmentApi', 'MixinApi', 'console'])(
      'exposes %s inside the sandbox',
      async (name) => {
        script.setCode(`return typeof ${name};`);
        const typeofResult = await script.run(receiver);
        // Functions / objects depending on the binding — anything but
        // 'undefined' is sufficient to prove it's reachable.
        expect(typeofResult).not.toBe('undefined');
      },
    );

    it('blocks access to `process`', async () => {
      script.setCode('return typeof process;');
      // `vm.createContext` doesn't surface the Node host globals into
      // the new context, so `process` is a free identifier and the
      // wrapper-function lookup returns undefined (or throws under
      // strict mode). Either way: not reachable.
      const result = await script.run(receiver).catch((err) => err);
      if (result instanceof Error) {
        expect(result.message).toMatch(/process is not defined/);
      } else {
        expect(result).toBe('undefined');
      }
    });

    it('blocks access to `require`', async () => {
      script.setCode('return typeof require;');
      const result = await script.run(receiver).catch((err) => err);
      if (result instanceof Error) {
        expect(result.message).toMatch(/require is not defined/);
      } else {
        expect(result).toBe('undefined');
      }
    });

    it('blocks access to host `globalThis.process`', async () => {
      // Even reaching through globalThis must not surface the host's
      // process. The sandbox's globalThis is its own object.
      script.setCode(
        'return typeof (globalThis && globalThis.process);',
      );
      expect(await script.run(receiver)).toBe('undefined');
    });
  });
});
