/**
 * typecheck-child — type-check ONE TypeScript file and exit.
 *
 * Spawned by `DiagnosticLogic.typecheck` as its own Node process (plain
 * JS, no tsx, so it starts in well under a second), so the semantic check
 * never blocks the world's event loop and its memory (~300 MB for a
 * typical kernel module's import closure) is returned to the OS when it
 * exits. The program is rooted at the one file: its imports are parsed
 * and bound, but only that file is checked — so the answer is "does X
 * type-check", not "did X break something that imports it" (`pnpm build`
 * and CI own the second question).
 *
 * argv: <tsconfig.json> <file.ts>
 * stdout: one JSON line — `{ diagnostics: RawDiagnostic[] }`, or
 *         `{ error: string }` when the check could not run.
 */
import ts from 'typescript';

function toRaw(d) {
  let line = null;
  let col = null;
  if (d.file && typeof d.start === 'number') {
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    line = pos.line + 1;
    col = pos.character + 1;
  }
  return {
    severity:
      d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
    line,
    col,
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  };
}

function main() {
  const [configPath, file] = process.argv.slice(2);
  if (!configPath || !file) throw new Error('usage: <tsconfig> <file>');
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      },
    }
  );
  if (!parsed) throw new Error(`could not read ${configPath}`);
  const program = ts.createProgram([file], parsed.options);
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`not in the program: ${file}`);
  const diags = [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ];
  return { diagnostics: diags.map(toRaw) };
}

let out;
try {
  out = main();
} catch (err) {
  out = { error: err instanceof Error ? err.message : String(err) };
}
process.stdout.write(JSON.stringify(out) + '\n');
