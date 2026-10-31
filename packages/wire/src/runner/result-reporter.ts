/**
 * `.wire/result.json` — the run, machine-readable.
 *
 * The verbose reporter prints for a person; this writes the same run for
 * a program. Its first reader is the soak lane's runner (`tools/soak`),
 * which runs a merge's soak files unattended and needs to know, without
 * parsing a terminal, which file failed, at which step, with what
 * message — the issue it files carries exactly this.
 *
 * ⭐ The `tests` array of each file, in file order, IS the drive record:
 * a wire file is a drive, its `it` blocks are the steps.
 *
 * Written once, at `onFinished`, which runs in the main process before
 * the global teardown — so `.wire/declarations.json` (the registry's
 * per-file record: packs, dirty reason, prose reads) is still there to
 * merge. If it is not, the annotations are empty and the tests are
 * still recorded: the result is a courtesy to the runner, never a gate
 * on the run, so this reporter never throws.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import type { File, Task } from 'vitest';
import type { Reporter } from 'vitest/reporters';
import { readRunReport, type FileRecord } from '../harness/registry';
import { WIRE_LOG } from './boot';

/** Where the runner reads it. `tools/soak` names the same path. */
export const RESULT_PATH = join(dirname(WIRE_LOG), 'result.json');

type State = 'pass' | 'fail' | 'skip';

interface TestResult {
  readonly name: string;
  readonly state: State;
  readonly durationMs: number;
  readonly errors: Array<{ message: string; stack: string }>;
}

interface FileResult {
  readonly file: string;
  readonly state: State;
  readonly durationMs: number;
  readonly dirtyReason: string | null;
  readonly proseReads: number;
  readonly packs: string[];
  readonly tests: TestResult[];
}

const stateOf = (t: Task): State => {
  const s = t.result?.state;
  if (s === 'fail') return 'fail';
  if (s === 'pass') return 'pass';
  return 'skip';
};

const errorsOf = (t: Task): TestResult['errors'] =>
  (t.result?.errors ?? []).map((e) => ({
    message: String(e.message ?? e),
    stack: String(e.stack ?? ''),
  }));

/** Every test under a task, in file order, named by its suite path. */
const testsOf = (task: Task, path: string[] = []): TestResult[] => {
  if (task.type === 'suite') {
    const here = 'filepath' in task ? path : [...path, task.name];
    return task.tasks.flatMap((t) => testsOf(t, here));
  }
  return [
    {
      name: [...path, task.name].join(' > '),
      state: stateOf(task),
      durationMs: Math.round(task.result?.duration ?? 0),
      errors: errorsOf(task),
    },
  ];
};

export default class ResultReporter implements Reporter {
  #startedAt = new Date();

  onInit(): void {
    this.#startedAt = new Date();
  }

  onFinished(files: File[] = [], errors: unknown[] = []): void {
    try {
      const report = process.env.WIRE_RUN_REPORT;
      const declared = new Map<string, FileRecord>(
        (report ? readRunReport(report) : []).map((r) => [r.file, r])
      );
      const finishedAt = new Date();
      const result = {
        schema: 1,
        mode: process.env.WIRE_SOAK === '1' ? 'soak' : 'blocking',
        owned: process.env.WIRE_TEST_WORLD === '1',
        serverUrl: process.env.WIRE_SERVER_URL ?? null,
        serverLog: process.env.WIRE_SERVER_LOG ?? null,
        startedAt: process.env.WIRE_STARTED_AT ?? this.#startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        wallMs: finishedAt.getTime() - this.#startedAt.getTime(),
        files: files.map((f): FileResult => {
          const name = basename(f.filepath ?? f.name);
          const d = declared.get(name);
          const tests = testsOf(f);
          // A file whose suite-level hook failed has no failing test but
          // a failing FILE — vitest records it on the file's own result.
          const fileFailed =
            stateOf(f) === 'fail' || tests.some((t) => t.state === 'fail');
          if (stateOf(f) === 'fail' && !tests.some((t) => t.state === 'fail')) {
            tests.unshift({
              name: '(file)',
              state: 'fail',
              durationMs: 0,
              errors: errorsOf(f),
            });
          }
          return {
            file: name,
            state: fileFailed
              ? 'fail'
              : tests.length > 0 && tests.every((t) => t.state === 'skip')
                ? 'skip'
                : 'pass',
            durationMs: Math.round(f.result?.duration ?? 0),
            dirtyReason: d?.dirtyReason ?? null,
            proseReads: d?.proseReads ?? 0,
            packs: d?.packs ?? [],
            tests,
          };
        }),
        errors: errors.map((e) =>
          e instanceof Error ? (e.stack ?? e.message) : String(e)
        ),
      };
      mkdirSync(dirname(RESULT_PATH), { recursive: true });
      writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2) + '\n');
    } catch (e) {
      console.warn(`wire: result.json not written — ${String(e)}`);
    }
  }
}
