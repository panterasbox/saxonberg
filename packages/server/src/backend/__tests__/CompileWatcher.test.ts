/**
 * CompileWatcher — the diagnostic mapping + lifecycle guards. The live
 * `tsc --watch` program is exercised end-to-end by running the dev server
 * (it spawns filesystem watchers and async recompiles, which don't unit
 * test deterministically); here we cover the pure `toRaw` mapping and the
 * start/stop guards.
 */

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { CompileWatcher } from '../CompileWatcher';

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
