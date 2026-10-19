/**
 * check-completion-this — ⭐⭐ **an engaged step's completion must not call
 * back into its controller.**
 *
 * A controller is one ephemeral clone per execution, and the dispatcher
 * destructs it in a `finally` the moment `execute` returns
 * (`CommandGiver._executeOne`) — while the engagement it started is still
 * pending. A completion that calls `this.<method>` then runs on a destroyed
 * Stuff, and the proxy answers with a **silent no-op**: the step plays its
 * scene and nothing happens.
 *
 * The lesson had been learned three times and written down each time — the
 * mining acts, the smelt, `WorkedActController`'s own header — and the
 * cleanliness drive found it a fourth: over the wire, `wear` had never put
 * anything on (`EquipController`'s completion called `this.put`), and the
 * nutrition-fitness drive had been tolerating the symptom as a finding.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): every `onComplete:` closure
 * in a controller (kernel and every pack `src/`), comments stripped, that
 * mentions `this.`. The ceiling is today's count; it may fall, never rise.
 * The fix is always the same — resolve what the completion needs BEFORE
 * engaging, or call a module function / a `static`.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import { MUD, SERVER_SRC, packSources, packSrcFiles } from "./pack-roots";

/**
 * Pinned at the census (2026-10-17, the cleanliness build): the shipped
 * sites the drive did not reach — equip's several-thing chain, a tap, the
 * ditch, grub, lime, flatten, crack, mow, plough.
 */
export const COMPLETION_THIS_CEILING = 7;

export interface CompletionThisFinding {
  file: string;
  line: number;
}

/** Strip block and line comments, keeping line count stable. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
}

/** The `onComplete:` closures in one module that mention `this.`. */
export function scanCompletionThis(src: string, file: string): CompletionThisFinding[] {
  const code = stripComments(src);
  const out: CompletionThisFinding[] = [];
  const re = /onComplete:\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
  for (const m of code.matchAll(re)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    while (depth > 0 && i < code.length) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
      i++;
    }
    const body = code.slice((m.index ?? 0) + m[0].length, i);
    if (/\bthis\./.test(body)) {
      out.push({ file, line: code.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}

function controllerFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...controllerFiles(full));
    } else if (entry.endsWith("Controller.ts")) {
      out.push(full);
    }
  }
  return out;
}

export function collectLiveFindings(): CompletionThisFinding[] {
  const out: CompletionThisFinding[] = [];
  for (const file of controllerFiles(MUD)) {
    out.push(...scanCompletionThis(readFileSync(file, "utf8"), "src/" + relative(SERVER_SRC, file)));
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      if (!file.endsWith("Controller.ts")) continue;
      out.push(
        ...scanCompletionThis(
          readFileSync(file, "utf8"),
          `packages/content/${pack.id}/src/${relative(pack.srcDir, file)}`,
        ),
      );
    }
  }
  return out;
}

function main(): void {
  const findings = collectLiveFindings();
  const n = findings.length;
  if (n > COMPLETION_THIS_CEILING) {
    console.error(
      `check-completion-this: ${n} completion(s) call back into their controller — ` +
        `the ceiling is ${COMPLETION_THIS_CEILING}.\n`,
    );
    for (const f of findings) console.error(`  ${f.file}:${f.line}`);
    console.error(
      `\nThe dispatcher destructs the controller when \`execute\` returns; a\n` +
        `completion calling \`this.<method>\` runs on a dead proxy and does\n` +
        `NOTHING, silently. Resolve what it needs before engaging, or call a\n` +
        `module function or a \`static\`.`,
    );
    process.exit(1);
  }
  if (n < COMPLETION_THIS_CEILING) {
    console.error(
      `check-completion-this: the count has FALLEN to ${n} and the ceiling is ` +
        `still ${COMPLETION_THIS_CEILING}. Lower it — a ratchet that is not ` +
        `re-pinned stops ratcheting.`,
    );
    process.exit(1);
  }
  console.log(`check-completion-this: ${n} / ceiling ${COMPLETION_THIS_CEILING} ✔`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
