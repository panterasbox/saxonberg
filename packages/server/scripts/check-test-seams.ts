/**
 * check-test-seams — ⭐ **a test seam must be MARKED, and the mark must
 * actually fire.**
 *
 * `@TestOnly` (lib/security/decorators.ts) withholds an Api static
 * outside a test environment: in a normal runtime the property is
 * deleted from the class, so `typeof Api.member === 'undefined'` and the
 * `eval` sandbox binding has no such key. It is also the review marker
 * that tells scaffolding from the game — which is the half a reader
 * depends on, because `WorldClockApi.advance`, its first consumer, is
 * named exactly like a game verb.
 *
 * ## ⚠⚠ Why this gate exists: the mark has TWO silent failure modes
 *
 *  1. **No module tail.** The decorator cannot delete the property
 *     itself — TypeScript's `__decorate` helper threads one descriptor
 *     through every decorator and then calls `Object.defineProperty`
 *     at the end, undoing it. So the decorator only RECORDS the name,
 *     and the removal runs from `SecurityApi.decorateApiClass(FooApi)`
 *     at the class's module tail. A `@TestOnly` on a class with no tail
 *     records a name nothing ever reads: the decorator is present, the
 *     review reads as settled, and the method is fully live in
 *     production.
 *
 *  2. **An instance method.** The decorator throws — but only when the
 *     class is imported, and a class nobody imported on the path a test
 *     happens to take never throws. A Stuff's methods are reached
 *     through the call-security Proxy against the whole prototype
 *     chain, where deleting one own descriptor would be a half-measure
 *     that reads as a guarantee.
 *
 * Both ceilings are **0**: neither is a thing the repo should hold any
 * of.
 *
 * ## ⭐ And a census, deliberately NOT ratcheted
 *
 * The run also counts Api statics that are test-only *by name*
 * (`_*ForTest` / `_*ForTesting`) and carry no `@TestOnly`. Those are the
 * candidates for the sweep that generalizes this decorator, and the
 * number is printed so the sweep has a worklist.
 *
 * ⚠ It is **not** a ceiling, and that is a decision rather than an
 * omission. Test seams grow with features, so gating today's count
 * would refuse an author for legitimately adding one — the failure mode
 * a ratchet over a content-scaling figure always has. The structural
 * checks above are the ones that can honestly sit at 0 forever.
 *
 * `lint:family` derives its roster from package.json, so this enrols
 * itself.
 */

import { readFileSync } from 'fs';
import { relative } from 'path';
import { MUD, packSrcFiles } from './pack-roots';

const EXIT_ON_FINDINGS = true; // CI-gating
const REPO = `${MUD}/../../..`;

/** The decorator's own definition + its tests describe it; they don't use it. */
function isSelfReferential(file: string): boolean {
  return (
    file.includes('__tests__') ||
    file.endsWith('lib/security/decorators.ts') ||
    file.endsWith('api/security.ts') ||
    file.includes('scripts/')
  );
}

const noTail: { file: string; cls: string }[] = [];
const onInstance: { file: string; line: number; text: string }[] = [];
let markedCount = 0;

/** Api statics named for testing that are not marked. The sweep worklist. */
const unmarked: string[] = [];

const SEAM_NAME = /^\s*(?:public\s+|protected\s+)?static\s+(_\w*[Ff]or[Tt]est(?:ing)?)\s*[(<]/;

for (const file of packSrcFiles(MUD)) {
  if (isSelfReferential(file)) continue;
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  // ⚠ A USE of the decorator is a line that is nothing but `@TestOnly`.
  // Matching the bare substring instead reads every comment that
  // DISCUSSES the marker as a use of it — which, on the first run of
  // this gate, flagged `EvalScript` and `WorldClockRegistry` for the
  // paragraphs explaining why the clock's Api static carries it.
  const uses = lines
    .map((l, i) => (/^\s*@TestOnly\s*$/.test(l) ? i : -1))
    .filter((i) => i >= 0);

  if (uses.length > 0) {
    // (1) the tail that performs the withhold
    if (!source.includes('decorateApiClass(')) {
      const m = /export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(
        source,
      );
      noTail.push({ file: relative(REPO, file), cls: m?.[1] ?? '(anonymous)' });
    }
    // (2) static-only
    for (const i of uses) {
      markedCount++;
      // The decorated member is the next non-blank, non-decorator line.
      let j = i + 1;
      while (j < lines.length && /^\s*(@\w|$|\/\/|\/\*|\*)/.test(lines[j] ?? '')) {
        j++;
      }
      const decl = lines[j] ?? '';
      if (!/\bstatic\b/.test(decl)) {
        onInstance.push({ file: relative(REPO, file), line: j + 1, text: decl.trim() });
      }
    }
  }

  // the census
  if (!file.includes(`${MUD}/api/`)) continue;
  for (let i = 0; i < lines.length; i++) {
    const m = SEAM_NAME.exec(lines[i] ?? '');
    if (!m) continue;
    const above = lines.slice(Math.max(0, i - 3), i).join('\n');
    if (above.includes('@TestOnly')) continue;
    unmarked.push(`${relative(REPO, file)}:${i + 1}  ${m[1]}`);
  }
}

const findings = noTail.length + onInstance.length;

console.log(
  `check-test-seams: ${markedCount} @TestOnly member(s) marked; ` +
    `${unmarked.length} name-only seam(s) on Api classes not yet marked ` +
    `(census, not a ceiling)`,
);

if (findings === 0) {
  console.log('check-test-seams: both structural ceilings are 0 ✔');
  if (process.argv.includes('--census')) {
    console.log('\nSweep worklist — Api statics test-only by name only:');
    for (const u of unmarked) console.log(`  ${u}`);
  }
  process.exit(0);
}

if (noTail.length > 0) {
  console.error(
    `\n⛔ ${noTail.length} class(es) carry @TestOnly but have no ` +
      `\`SecurityApi.decorateApiClass(...)\` tail, so NOTHING withholds the ` +
      `member and it is live in production:\n`,
  );
  for (const n of noTail) console.error(`  ${n.cls}  ${n.file}`);
  console.error(
    `\nAdd the standard Api tail. The removal cannot live in the decorator:\n` +
      `TypeScript's \`__decorate\` re-defines the property after every method\n` +
      `decorator has run, so a delete there is undone immediately.`,
  );
}

if (onInstance.length > 0) {
  console.error(
    `\n⛔ ${onInstance.length} @TestOnly on a non-static member:\n`,
  );
  for (const o of onInstance) {
    console.error(`  ${o.file}:${o.line}  ${o.text}`);
  }
  console.error(
    `\n@TestOnly withholds an Api STATIC — the surface the \`eval\` sandbox\n` +
      `binds. An instance method is reached through the call-security Proxy\n` +
      `against the whole prototype chain, so deleting one own descriptor\n` +
      `would not remove it. Mark the Api static that forwards there instead.`,
  );
}

console.error('\nSee docs/subsystems/call-security.md § Test seams.');
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
