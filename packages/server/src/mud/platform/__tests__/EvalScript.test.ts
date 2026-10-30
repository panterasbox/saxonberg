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

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import EvalScript from '../idea/EvalScript';
import { StuffApi } from '../../api/stuff';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { SecurityApi } from '../../api/security';
import { ExecutionContextApi } from '../../api/execution-context';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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

  describe('⭐ the surface is every self-decorating Api (soak-harness D15)', () => {
    /**
     * The drift gate. The four bootstrap-special Apis never call
     * `decorateApiClass` (call-security.md § Why Some Api Files Don't
     * Self-Decorate), so they are out by construction; every other
     * exported `*Api` class must be bound. An Api that forgets its tail
     * — or a fifth bootstrap-special one nobody wrote down — fails here.
     */
    const BOOTSTRAP_SPECIAL = new Set([
      'ExecutionContextApi',
      'ModuleApi',
      'SecurityApi',
      'ProxyApi',
    ]);

    it('binds exactly the exported *Api classes but the four', async () => {
      const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'api');
      const modules = await Promise.all(
        readdirSync(dir)
          .filter((f) => f.endsWith('.ts'))
          .map((f) => import(join(dir, f)) as Promise<unknown>),
      );
      const exported = new Set<string>();
      for (const mod of modules) {
        for (const [name, value] of Object.entries(mod as Record<string, unknown>)) {
          if (/Api$/.test(name) && typeof value === 'function') exported.add(name);
        }
      }
      for (const name of BOOTSTRAP_SPECIAL) exported.delete(name);
      script.setCode(
        `return ${JSON.stringify([...exported])}.filter((n) => typeof globalThis[n] !== 'object');`,
      );
      expect(await script.run(receiver), 'exported Apis eval does not bind').toEqual([]);
      const bound = SecurityApi.decoratedApiClasses()
        .map((c) => ((c as { name?: string }).name ?? '').replace(/^_+/, ''))
        .filter((n) => /Api$/.test(n));
      expect(new Set(bound)).toEqual(exported);
    });

    it('a facade is frozen and carries @internal statics behind their own gates', async () => {
      script.setCode('return [Object.isFrozen(StuffApi), typeof StuffApi.singletonSync, typeof WeatherApi.resolveWeatherFor];');
      expect(await script.run(receiver)).toEqual([true, 'function', 'function']);
    });

    it('`this` survives the binding — an Api with #-statics still works', async () => {
      script.setCode("return PathPatternApi.matches('/a/b', '/a/*');");
      expect(await script.run(receiver)).toBe(true);
    });

    it('⛔ a @TestOnly static is a stub that names its door', async () => {
      script.setCode("return WorldClockApi.advance('1 hour');");
      await expect(script.run(receiver)).rejects.toThrow(
        /WorldClockApi\.advance is a test seam.*testharness clock advance/s,
      );
      script.setCode("return TestHarnessApi.advanceClock('1 hour');");
      await expect(script.run(receiver)).rejects.toThrow(/testharness clock advance/);
    });
  });

  describe('⭐ an expression returns itself; await is legal', () => {
    it('`1 + 1` is 2, with or without the semicolon', async () => {
      script.setCode('1 + 1');
      expect(await script.run(receiver)).toBe(2);
      script.setCode('1 + 1;');
      expect(await script.run(receiver)).toBe(2);
    });

    it('a body awaits', async () => {
      script.setCode('const x = await Promise.resolve(20); return x + 1;');
      expect(await script.run(receiver)).toBe(21);
    });
  });

  describe('⭐ the budget (eval.timeoutMs) holds every shape of runaway', () => {
    it('a synchronous loop', async () => {
      script.setCode('while (true) {}');
      const t0 = Date.now();
      await expect(script.run(receiver, { timeoutMs: 200 })).rejects.toThrow(
        /timed out after 200 ms \(eval\.timeoutMs\)/,
      );
      expect(Date.now() - t0).toBeLessThan(700);
    });

    it('an awaited tail that outlives it — abandoned, answered in time', async () => {
      script.setCode('await new Promise((r) => ScheduleApi.schedule(3000, r)); return 1;');
      const t0 = Date.now();
      await expect(script.run(receiver, { timeoutMs: 200 })).rejects.toThrow(
        /timed out after 200 ms .*abandoned/,
      );
      expect(Date.now() - t0).toBeLessThan(700);
    });

    it('a runaway that keeps calling into the world is refused past the deadline', async () => {
      // ⛔ A PURE CPU loop after an await cannot be stopped under node:vm
      // on Node 22: the only mechanism (`microtaskMode: 'afterEvaluate'`)
      // aborts the process when it fires under async hooks. A loop that
      // touches any Api is stopped by the facade.
      script.setCode(
        'await null; for (;;) { await PathPatternApi.matches("/a", "/a"); }',
      );
      await expect(script.run(receiver, { timeoutMs: 200 })).rejects.toThrow(
        /timed out after 200 ms/,
      );
    });
  });

  describe('⭐⭐ no eval-born rejection is left unhandled (D20)', () => {
    let unhandled: unknown[];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    beforeEach(() => {
      unhandled = [];
      process.on('unhandledRejection', onUnhandled);
    });
    afterEach(() => {
      process.off('unhandledRejection', onUnhandled);
    });

    it('a rejection the code DROPPED is caught by the net and reported', async () => {
      // The dairy drive's crash shape: a clone written as a statement.
      script.setCode(
        "StuffApi.clone('/no/such/template');" +
          ' await new Promise((r) => ScheduleApi.schedule(200, r));' +
          " return 'went on';",
      );
      const out = await script.runReporting(receiver);
      expect(out.value).toBe('went on');
      expect(out.late.map((l) => `${l.api}.${l.name}`)).toEqual(['StuffApi.clone']);
      expect(unhandled).toEqual([]);
    });

    it('one that lands AFTER the result is still held (the mudlog has it)', async () => {
      script.setCode("StuffApi.clone('/no/such/template'); return 'went on';");
      expect(await script.run(receiver)).toBe('went on');
      await new Promise((r) => setTimeout(r, 300));
      expect(unhandled).toEqual([]);
    });

    it('a rejection the code RETURNS is the eval\'s error', async () => {
      script.setCode("return StuffApi.clone('/no/such/template');");
      await expect(script.run(receiver)).rejects.toThrow();
      await new Promise((r) => setTimeout(r, 50));
      expect(unhandled).toEqual([]);
    });
  });

  describe('⭐ SecurityApi.assertNotFromEval names the door, from eval only', () => {
    class EvalGuardProbe {
      static probe(): string {
        SecurityApi.assertNotFromEval('probe', 'testharness probe <x>');
        return 'ran';
      }
    }
    SecurityApi.decorateApiClass(EvalGuardProbe);

    it('throws the pointer under an eval frame, before and after an await', async () => {
      script.setCode('return EvalGuardProbe.probe();');
      await expect(script.run(receiver)).rejects.toThrow(
        /`probe` is not callable from eval.*use `testharness probe <x>`/,
      );
      script.setCode('await null; return EvalGuardProbe.probe();');
      await expect(script.run(receiver)).rejects.toThrow(/not callable from eval/);
    });

    it('is silent outside one — including a sandbox root with no eval', async () => {
      expect(EvalGuardProbe.probe()).toBe('ran');
      const r = await ExecutionContextApi.runRootGuarded(
        null,
        'sandbox.runScoped',
        async () => EvalGuardProbe.probe(),
        'rethrow',
        { circleScope: '/home/t' },
      );
      expect(r).toBe('ran');
    });
  });
});
