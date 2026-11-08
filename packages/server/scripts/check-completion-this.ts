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

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { controllerFiles } from "./pack-roots";

/**
 * Pinned at the census (2026-10-17, the cleanliness build): the shipped
 * sites the drive did not reach — equip's several-thing chain, a tap, the
 * ditch, grub, lime, flatten, crack, mow, plough.
 *
 * ⭐ Burned to ZERO by the cover build (2026-10-28): its drive needs
 * `plough` and `grub` to land, and the last seven were the same
 * mechanical fix (a `static` finish).
 */
export const COMPLETION_THIS_CEILING = 0;

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

/** The completion-time closures (`onComplete:`, a plan's `onRefused`/`onDone`) that mention `this.`. */
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
  // ⭐ A plan's `words` land at completion too (controllers-are-io D4): an
  // `onRefused`/`onDone` that reaches `this` says nothing, just as silently.
  // The whole arrow body is read, expression or block.
  const wordsRe = /\b(?:onRefused|onDone):\s*(?:async\s*)?\([^)]*\)\s*=>\s*/g;
  for (const m of code.matchAll(wordsRe)) {
    const start = (m.index ?? 0) + m[0].length;
    let i = start;
    let depth = 0;
    while (i < code.length) {
      const c = code[i];
      if (c === "(" || c === "{" || c === "[") depth++;
      else if (c === ")" || c === "}" || c === "]") {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) break;
      i++;
    }
    if (/\bthis\./.test(code.slice(start, i))) {
      out.push({ file, line: code.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}

/**
 * Every controller module — `pack-roots.controllerFiles()`, the enumerator
 * the controller gates share (controllers-are-io W0): the kernel's
 * `platform/idea/cmd/**` and `lib/**` bases, every pack's `src/**\/idea/cmd/**`
 * (the domain-local ones included) and `src/lib/**` bases.
 */
export function collectLiveFindings(): CompletionThisFinding[] {
  const out: CompletionThisFinding[] = [];
  for (const c of controllerFiles()) {
    out.push(...scanCompletionThis(readFileSync(c.file, "utf8"), c.rel));
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
