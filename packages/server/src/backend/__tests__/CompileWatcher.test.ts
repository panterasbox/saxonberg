/**
 * CompileWatcher — the diagnostic mapping + lifecycle guards. The live
 * `tsc --watch` program is exercised end-to-end by running the dev server
 * (it spawns filesystem watchers and async recompiles, which don't unit
 * test deterministically); here we cover the pure `toRaw` mapping, the
 * start/stop/arm guards, and — over a two-file fixture — that the first
 * program leaves `__tests__` out.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as ts from 'typescript';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompileWatcher } from '../CompileWatcher';
import { DiagnosticApi } from '../../mud/api/diagnostics';

function fakeDiagnostic(over: Partial<ts.Diagnostic>): ts.Diagnostic {
  return {
    category: ts.DiagnosticCategory.Error,
    code: 2304,
    file: undefined,
    start: undefined,
    length: undefined,
    messageText: 'Cannot find name X',
    ...over,
  } as ts.Diagnostic;
}

describe('CompileWatcher.toRaw', () => {
  it('maps an error diagnostic (no position)', () => {
    const raw = CompileWatcher.toRaw(fakeDiagnostic({}));
    expect(raw.severity).toBe('error');
    expect(raw.code).toBe(2304);
    expect(raw.message).toBe('Cannot find name X');
    expect(raw.line).toBeNull();
    expect(raw.col).toBeNull();
  });

  it('maps a warning category to warning', () => {
    const raw = CompileWatcher.toRaw(
      fakeDiagnostic({ category: ts.DiagnosticCategory.Warning })
    );
    expect(raw.severity).toBe('warning');
  });

  it('derives 1-based line/col from a source position', () => {
    const src = ts.createSourceFile(
      'x.ts',
      'const a = 1;\nconst b: string = 2;\n',
      ts.ScriptTarget.ES2022,
      true
    );
    const start = src.text.indexOf('2'); // the offending literal on line 2
    const raw = CompileWatcher.toRaw(
      fakeDiagnostic({ file: src, start })
    );
    expect(raw.line).toBe(2);
    expect(raw.col).toBeGreaterThan(0);
  });

  it('flattens chained message text', () => {
    const chain: ts.DiagnosticMessageChain = {
      messageText: 'outer',
      category: ts.DiagnosticCategory.Error,
      code: 1,
      next: [
        {
          messageText: 'inner',
          category: ts.DiagnosticCategory.Error,
          code: 2,
        },
      ],
    };
    const raw = CompileWatcher.toRaw(fakeDiagnostic({ messageText: chain }));
    expect(raw.message).toContain('outer');
    expect(raw.message).toContain('inner');
  });
});

describe('CompileWatcher lifecycle', () => {
  it('start() throws loudly on a missing tsconfig', () => {
    expect(() =>
      CompileWatcher.get().start('/no/such/tsconfig.json')
    ).toThrow(/tsconfig not found/);
  });

  it('stop() is idempotent and leaves ready=false', () => {
    const w = CompileWatcher.get();
    w.stop();
    w.stop();
    expect(w.ready).toBe(false);
  });
});

describe('CompileWatcher — loaded on use, tests left out', () => {
  let dir: string | undefined;
  afterEach(() => {
    CompileWatcher.get().stop();
    vi.restoreAllMocks();
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('arm() throws loudly on a missing tsconfig', () => {
    expect(() =>
      CompileWatcher.get().arm('/no/such/tsconfig.json')
    ).toThrow(/tsconfig not found/);
  });

  it('isTestFile() names a __tests__ path and nothing else', () => {
    expect(CompileWatcher.isTestFile('/a/src/__tests__/x.test.ts')).toBe(true);
    expect(CompileWatcher.isTestFile('C:\\a\\__tests__\\x.ts')).toBe(true);
    expect(CompileWatcher.isTestFile('/a/src/tests/x.ts')).toBe(false);
    expect(CompileWatcher.isTestFile('/a/src/my__tests__x.ts')).toBe(false);
  });

  it('the program checks source files and never a __tests__ file', async () => {
    dir = mkdtempSync(join(tmpdir(), 'compile-watcher-'));
    mkdirSync(join(dir, 'src', '__tests__'), { recursive: true });
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, types: [] },
        include: ['src/**/*'],
      })
    );
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a: number = "x";\n');
    writeFileSync(
      join(dir, 'src', '__tests__', 'a.test.ts'),
      'export const b: number = "y";\n'
    );
    const seen: string[] = [];
    vi.spyOn(DiagnosticApi, 'recordDiagnostics').mockImplementation(
      async (file: string) => {
        seen.push(file);
      }
    );
    CompileWatcher.get().start(join(dir, 'tsconfig.json'));
    // Records are awaited one at a time after a synchronous drain.
    await vi.waitFor(() =>
      expect(seen.some((f) => f.endsWith('/src/a.ts'))).toBe(true)
    );
    expect(seen.some((f) => CompileWatcher.isTestFile(f))).toBe(false);
  });
});
