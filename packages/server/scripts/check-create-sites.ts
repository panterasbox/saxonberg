/**
 * check-create-sites — ⭐⭐ **every object in the world is born from a
 * ROW**, and the exceptions are ENUMERATED.
 *
 * The doctrine (template-inheritance requirements, the user's words):
 *
 * > We should still be cloning a template from the content db. If we
 * > want to patch it afterwards that's fine, but do what we can in the
 * > template and patch the rest.
 *
 * `StuffApi.create(factory)` is not banned — it is a real pattern when
 * a factory builds from RUNTIME state rather than from a persisted
 * collection. What is banned is using it for something an author could
 * have written down, because a code-minted object can say nothing an
 * author wrote: no prose, no keywords, no detail. The coat-check ticket
 * carried a comment reading *"a runtime-minted thing has no row to
 * author them in"*, and that comment was the finding.
 *
 * So: a census, then a ratchet (docs/lint-family.md). Each survivor is
 * listed below with WHY, and the count may fall and may never rise.
 *
 * ⚠ The two shapes that survive:
 *   - the **connection layer** — per-socket objects with no world
 *     identity (`Interactive`, `Login`);
 *   - a **framework seam** that takes a FACTORY from its caller, where
 *     there is no path to look up because the caller supplies the
 *     class.
 *
 * ⚠ `StudioLogic.readClassDefault` is the one that needs a sentence: it
 * constructs an instance to ask the CLASS what its field defaults are,
 * so a row would be answering a question about itself.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const SRC = join(SERVER_ROOT, 'src');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** The ceiling. It may fall. It may never rise. */
const CEILING = 5;

/**
 * The enumerated survivors, `<repo-relative file>` → why. A site not on
 * this list is a finding even when the total is under the ceiling —
 * the list IS the enumeration acceptance criterion 11 asks for.
 */
const ALLOWED: ReadonlyMap<string, string> = new Map([
  [
    'packages/server/src/backend/ConnectionManager.ts',
    'the connection layer: an Interactive is per-socket and has no world identity',
  ],
  [
    'packages/server/src/backend/Application.ts',
    'the connection layer: a Login exists before there is a character',
  ],
  [
    'packages/server/src/mud/platform/idea/api/BoundaryLogic.ts',
    'a framework seam — `BoundaryApi.create` takes a FACTORY from its caller, so there is no path to clone',
  ],
  [
    'packages/server/src/mud/platform/idea/api/PersistableLogic.ts',
    'a framework seam — the shadow follower is minted from a `describeFork` factory; a Shadow rides another object and is never template-backed',
  ],
  [
    'packages/server/src/mud/platform/idea/api/StudioLogic.ts',
    'introspection of a CLASS, not an object: it constructs an instance to ask what the class defaults to, so a row would be answering a question about itself',
  ],
]);

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === '__tests__') continue;
      yield* walk(p);
    } else if (e.endsWith('.ts') && !e.endsWith('.test.ts')) {
      yield p;
    }
  }
}

/**
 * Strip comments and string literals, so a `StuffApi.create(...)` in a
 * doc comment or an error message is not a call site. ⚠ Every one of
 * the eleven false hits the first cut produced was one of those.
 */
export function stripNonCode(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (two === '/*') {
      i += 2;
      while (i < src.length && src.slice(i, i + 2) !== '*/') i++;
      i += 2;
      continue;
    }
    const c = src[i]!;
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        // ⚠ A `'` or `"` scan that reaches a NEWLINE was never a string
        // — it was an apostrophe in prose, or a quote inside a regex
        // literal. Without this guard the scanner ran away and ate 85%
        // of `StudioLogic.ts`, so the gate reported that file as
        // minting nothing. A stripper that over-strips is a gate that
        // passes.
        if (quote !== '`' && src[j] === '\n') break;
        if (src[j] === '\\') j++;
        j++;
      }
      if (j < src.length && src[j] === quote) {
        i = j + 1;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function main(): void {
  const files: string[] = [...walk(SRC)];
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const src = join(CONTENT, pack, 'src');
      if (existsSync(src)) files.push(...walk(src));
    }
  }

  const sites = new Map<string, number>();
  for (const f of files) {
    const code = stripNonCode(readFileSync(f, 'utf8'));
    const hits = [...code.matchAll(/\bStuffApi\.(?:create|createSync)\s*\(/g)];
    if (hits.length === 0) continue;
    const rel = relative(REPO_ROOT, f).split('\\').join('/');
    // `api/stuff.ts` IS the implementation; it is not a call site.
    if (rel.endsWith('packages/server/src/mud/api/stuff.ts')) continue;
    sites.set(rel, hits.length);
  }

  const unlisted = [...sites.keys()].filter((f) => !ALLOWED.has(f)).sort();
  const total = [...sites.values()].reduce((a, b) => a + b, 0);

  console.log(
    `check-create-sites: ${sites.size} file(s), ${total} call site(s); ` +
      `ceiling ${CEILING}` +
      (sites.size < CEILING ? ` — ratchet down to ${sites.size}` : ''),
  );

  const problems: string[] = [];
  for (const f of unlisted) {
    problems.push(
      `${f}: mints with StuffApi.create/createSync and is not on the ` +
        `enumerated list. Clone a row and patch what the row cannot ` +
        `know — "the template is the base, the factory is the patch". ` +
        `If this genuinely is a framework seam or the connection layer, ` +
        `add it to ALLOWED here WITH its reason.`,
    );
  }
  if (sites.size > CEILING) {
    problems.push(
      `${sites.size} files mint directly, ceiling ${CEILING}. The count ` +
        `may fall and may never rise.`,
    );
  }
  if (problems.length === 0) {
    for (const [f, why] of ALLOWED) {
      if (!sites.has(f)) {
        console.warn(
          `  ⚠ listed but no longer mints: ${f} — drop it from ALLOWED ` +
            `and lower the ceiling (${why})`,
        );
      }
    }
    return;
  }
  console.error(`\n[check-create-sites — ERROR] ${problems.length} finding(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

if (process.argv[1] && /check-create-sites\.ts$/.test(process.argv[1])) main();
