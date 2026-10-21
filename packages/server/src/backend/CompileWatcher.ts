import * as ts from 'typescript';
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import type { RawDiagnostic, DiagnosticSeverity } from '@saxonberg/types';
import { DiagnosticApi } from '../mud/api/diagnostics';
import { EventApi, Events } from '../mud/api/event';

/**
 * CompileWatcher — Producer 3 of the author-diagnostics subsystem: a
 * long-running `tsc --watch` over the server package, feeding **semantic**
 * TypeScript diagnostics into the `diagnostics` store.
 *
 * `pnpm dev` runs `tsx`, a type-stripping transpiler that never
 * typechecks; `HotReloadApi.reload` inherits that, so an in-game author
 * can edit source, reload successfully, and never learn the file no longer
 * typechecks. This watcher closes that gap by running the TypeScript
 * **Compiler API** (`createWatchProgram` + a semantic builder program)
 * alongside the dev server and streaming each rechecked file's diagnostics
 * into `DiagnosticApi.recordDiagnostics`.
 *
 * Dev-only: armed only when `NODE_ENV !== 'production'` (prod has no TS
 * source to watch). A backend singleton (`#`-private is correct — not a
 * proxy-wrapped Stuff).
 *
 * ⭐ **Loaded on use, never at boot.** A semantic program over the whole
 * server tree is the single largest thing a dev world holds — measured
 * 2026-10-21 at ~2.35 GB of live heap and a ~60 s synchronous first check,
 * against ~190 MB for the entire booted world. Nothing needs it until an
 * author is working on code, so {@link arm} only subscribes: the watcher
 * starts on the first module reload (an author edited source) or the
 * first wizard read of `compile` rows (`errors`). A test world and an idle
 * dev world never pay for it.
 *
 * **Tests are outside the program.** `__tests__` files are half the tree
 * and more than half the cost; nothing imports them, and `pnpm build`
 * still typechecks them. The config's directory read is filtered rather
 * than the root list frozen, so a new source file is still picked up.
 *
 * Cold-start rows flow through `{ live: false }` (stored, but no
 * author-push / event), so authors aren't firehosed with the project's
 * existing baseline at boot; `#ready` flips to `true` once TS reports
 * steady state (status codes 6193 / 6194), after which rechecks are live.
 *
 * v1 is **semantic-only** — parse errors are already surfaced by tsx at
 * module load (`Events.ModuleReloadFailed`) and by the CMS save-time
 * reload error.
 *
 * See [diagnostics-slate.md](../../../docs/slates/builds/diagnostics-slate.md).
 */
export class CompileWatcher {
  static #instance: CompileWatcher | null = null;

  static get(): CompileWatcher {
    if (!CompileWatcher.#instance) CompileWatcher.#instance = new CompileWatcher();
    return CompileWatcher.#instance;
  }

  #ready = false;
  #watch?: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>;
  #armedConfig?: string;
  #starting = false;

  /**
   * Arm the watcher against `configPath`: subscribe to the demand events
   * and start on the first one. Idempotent. Throws, like {@link start},
   * when the config is missing — at arm time, not at first use.
   */
  arm(configPath: string): void {
    if (this.#armedConfig) return;
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `CompileWatcher: tsconfig not found at ${configPath} — cannot arm`
      );
    }
    this.#armedConfig = configPath;
    const demand = (): void => this.#startDeferred();
    EventApi.on(Events.ModuleReloaded, demand);
    EventApi.on(Events.ModuleReloadFailed, demand);
    EventApi.on(Events.CompileDiagnosticsWanted, demand);
  }

  /**
   * Start off the emitting stack: the first check is synchronous and long,
   * and must not run inside the reload or the `errors` read that asked.
   */
  #startDeferred(): void {
    if (this.#watch || this.#starting || !this.#armedConfig) return;
    this.#starting = true;
    const configPath = this.#armedConfig;
    setImmediate(() => {
      try {
        this.start(configPath);
        console.info('CompileWatcher: started on demand — watching for TypeScript diagnostics');
      } catch (err) {
        console.warn(
          `CompileWatcher: not started — ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        this.#starting = false;
      }
    });
  }

  /**
   * Start watching against `configPath` (a `tsconfig.json`). Fails loudly
   * if the config can't be read/parsed rather than silently no-oping.
   */
  start(configPath: string): void {
    if (this.#watch) return; // idempotent
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `CompileWatcher: tsconfig not found at ${configPath} — cannot start`
      );
    }

    // The config's `include` globs are expanded through `readDirectory`;
    // dropping `__tests__` there keeps tests out of the program while a
    // new source file is still found (see the class doc).
    const system: ts.System = {
      ...ts.sys,
      readDirectory: (path, extensions, exclude, include, depth) =>
        ts.sys
          .readDirectory(path, extensions, exclude, include, depth)
          .filter((f) => !CompileWatcher.isTestFile(f)),
    };
    const host = ts.createWatchCompilerHost(
      configPath,
      { noEmit: true },
      system,
      ts.createSemanticDiagnosticsBuilderProgram,
      // We drive diagnostic reporting from afterProgramCreate in batches,
      // so the per-diagnostic reporter is a no-op.
      () => {},
      (d) => this.#onWatchStatus(d)
    );

    const origAfter = host.afterProgramCreate;
    host.afterProgramCreate = (program) => {
      void this.#flushAffected(program);
      origAfter?.(program);
    };

    this.#watch = ts.createWatchProgram(host);
  }

  /** Stop the watcher. Idempotent. */
  stop(): void {
    this.#watch?.close();
    this.#watch = undefined;
    this.#ready = false;
  }

  #onWatchStatus(d: ts.Diagnostic): void {
    // 6193: "Found 1 error. Watching…"  6194: "Found N errors. Watching…"
    // Either means TS reached steady state — subsequent rechecks are live.
    if (d.code === 6193 || d.code === 6194) this.#ready = true;
  }

  async #flushAffected(
    program: ts.SemanticDiagnosticsBuilderProgram
  ): Promise<void> {
    // Drain the affected files SYNCHRONOUSLY, then record. The host's own
    // `afterProgramCreate` runs right after this returns and consumes
    // whatever is still pending, so awaiting between files recorded only
    // the first one of every check (found 2026-10-21; it had been so since
    // the watcher shipped).
    const batch: { fileName: string; diags: readonly ts.Diagnostic[] }[] = [];
    try {
      for (;;) {
        const next = program.getSemanticDiagnosticsOfNextAffectedFile();
        if (!next) break;
        const affected = next.affected;
        if (!('fileName' in affected)) continue; // whole-program, skip
        batch.push({
          fileName: (affected as ts.SourceFile).fileName,
          diags: next.result,
        });
      }
      for (const { fileName, diags } of batch) {
        await this.#flushFile(fileName, diags);
      }
    } catch {
      // never let a flush error escape into TS's watch loop
    }
  }

  async #flushFile(
    filePath: string,
    diags: readonly ts.Diagnostic[]
  ): Promise<void> {
    const versionId = hashFile(filePath);
    const raws = diags.map((d) => CompileWatcher.toRaw(d));
    await DiagnosticApi.recordDiagnostics(filePath, versionId, raws, {
      live: this.#ready,
    });
  }

  /** Whether `file` is a test the watcher's program leaves out. */
  static isTestFile(file: string): boolean {
    return /(^|[\\/])__tests__[\\/]/.test(file);
  }

  /** Whether the watcher has reached TS steady state (rechecks are live). */
  get ready(): boolean {
    return this.#ready;
  }

  /**
   * Map a `ts.Diagnostic` to the store's `RawDiagnostic` — severity from
   * the category, 1-based line/col from the source position, TS code and
   * flattened message. Static + pure so it's unit-testable without a live
   * watch program.
   */
  static toRaw(d: ts.Diagnostic): RawDiagnostic {
    const severity: DiagnosticSeverity =
      d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error';
    let line: number | null = null;
    let col: number | null = null;
    if (d.file && typeof d.start === 'number') {
      const pos = d.file.getLineAndCharacterOfPosition(d.start);
      line = pos.line + 1;
      col = pos.character + 1;
    }
    return {
      severity,
      line,
      col,
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    };
  }
}

/** sha256 of the file bytes, truncated to 16 hex chars (the supersede key). */
function hashFile(filePath: string): string {
  try {
    const bytes = fs.readFileSync(filePath);
    return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}

