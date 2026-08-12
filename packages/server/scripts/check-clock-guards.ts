/**
 * check-clock-guards — the backward-clock lint.
 *
 * **Game time is not monotonic.** It rewinds on ungraceful shutdown (to
 * the last 5-minute backstop snapshot), it restarts at zero on a fresh
 * or cleared DB, and `WorldClockRegistry`'s real source is `Date.now`,
 * so an NTP step can move it backwards mid-run. See
 * [docs/subsystems/time.md] and [docs/measurement.md] § A16.
 *
 * Nothing breaks today because **every reconcile-on-read consumer takes
 * `elapsed = now - stamp` and, on a non-positive elapsed, re-stamps and
 * integrates nothing.** The dying clock — which deliberately skips both
 * the linkdead and far-past guards — keeps this one, and says why:
 *
 *     if (dyingElapsed <= 0) continue; // clock ran backwards only
 *
 * That invariant held by **convention alone**: no base class, no shared
 * helper, no check. A new reconcile-on-read mixin that omits the guard
 * produces silent garbage on the next crash recovery — a corpse warming
 * up, a plant un-growing — and nothing catches it. This is the check.
 *
 * **The rule:** if you bind an interval by subtracting a *stamp* from a
 * *now*, the bound name must appear in a non-positive guard somewhere in
 * the same file.
 *
 * The guard need not be adjacent, and may be a `Math.max(0, x)` clamp —
 * the point is that the file demonstrably contemplates a backward clock.
 * Where the guard genuinely lives one frame down (`TraitPosition` clamps
 * inside `decayFactor`), that is an EXEMPTION with a reason, not a
 * loosened rule: the `check-boundary-exemptions` precedent, where the
 * list stays short and readable rather than being derived.
 *
 * Implemented as a standalone script rather than an ESLint rule for the
 * usual ESLint-8-legacy DX reason (`check-gate-strings`' precedent), and
 * parses with the TypeScript AST rather than regex (`check-module-scope`,
 * `check-field-meta`).
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const MUD_ROOT = join(here, '..', 'src', 'mud');

const EXIT_ON_FINDINGS = true; // CI-gating

/**
 * Names that denote a bound time interval. Deliberately narrow — `age`
 * is exact-matched rather than substring-matched, or every `message`
 * and `usage` in the tree would qualify.
 */
const INTERVAL_NAME =
  /^(.*elapsed.*|age|ageS|ageSec|ageSeconds|idle|idleS|idleMs)$/i;

/**
 * Text that marks the right-hand operand as a persisted time stamp. This
 * is the vocabulary the mudlib actually uses; if a new subsystem coins a
 * different one, the zero-candidates check below is what notices.
 */
const STAMP_TEXT =
  /(ClockStamp|Stamp\b|tickedAt|startedAt|lastTouched|\.when\b|\.last\b)/;

/**
 * Sites where the guard is real but not in this file, or where the
 * interval is not game-time at all. Each entry is a review call, not a
 * derivation — and each is verified to still resolve (below), so a
 * rename cannot silently disable one.
 */
interface Exemption {
  file: string; // mud-relative
  name: string; // the bound identifier
  reason: string;
}

const EXEMPTIONS: Exemption[] = [
  {
    file: 'lib/trait/TraitPosition.ts',
    name: 'age',
    reason:
      'guarded one frame down — decayFactor() returns 1 for ageSeconds <= 0',
  },
  {
    file: 'obj/StreamRelay.ts',
    name: 'elapsed',
    reason:
      'real time (Date.now), not the world clock — a token-bucket refill. ' +
      'An NTP step backwards over-debits the bucket and rate-limits one ' +
      'speaker until it refills; self-healing, and off the game clock.',
  },
  {
    file: 'obj/SchedulerRegistry.ts',
    name: 'elapsed',
    reason:
      '⚠ REVIEW, not a blessing. This one IS game time, and it is handed to ' +
      'authored emission consumers as a payload field. It integrates nothing ' +
      'itself, so a rewind cannot corrupt engine state — but content code ' +
      'may well integrate over it. RECOMMENDED FIX: clamp with ' +
      'Math.max(0, ...) at the binding and delete this exemption.',
  },
];

interface Finding {
  file: string;
  line: number;
  name: string;
  expr: string;
}

interface Site {
  file: string;
  name: string;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (
      full.endsWith('.ts') &&
      !full.endsWith('.test.ts') &&
      !full.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
}

/** Does any subtraction inside `node` subtract a stamp-looking operand? */
function subtractsAStamp(node: ts.Node, src: ts.SourceFile): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.MinusToken &&
      STAMP_TEXT.test(n.right.getText(src))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/**
 * Does the file guard `name` against a non-positive value? Accepts a
 * comparison against zero in either direction, or a `Math.max(0, name)`
 * clamp. Text-level on purpose: we are asking whether the file
 * contemplates a backward clock at all, not where it does so.
 */
function hasGuard(text: string, name: string): boolean {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    new RegExp(`\\b${n}\\s*(<=|<|>)\\s*0\\b`).test(text) ||
    new RegExp(`\\b0\\s*(>=|>|<)\\s*${n}\\b`).test(text) ||
    new RegExp(`Math\\.max\\(\\s*0\\s*,\\s*${n}\\b`).test(text)
  );
}

function main(): void {
  const files: string[] = [];
  walk(MUD_ROOT, files);

  const findings: Finding[] = [];
  const sites: Site[] = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (!STAMP_TEXT.test(text)) continue; // cheap pre-filter

    const src = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
    const rel = relative(MUD_ROOT, file).split('\\').join('/');

    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        INTERVAL_NAME.test(node.name.text) &&
        subtractsAStamp(node.initializer, src)
      ) {
        const name = node.name.text;
        sites.push({ file: rel, name });

        const exempt = EXEMPTIONS.some(
          (e) => e.file === rel && e.name === name,
        );
        if (!exempt && !hasGuard(text, name)) {
          const { line } = src.getLineAndCharacterOfPosition(node.getStart());
          findings.push({
            file: rel,
            line: line + 1,
            name,
            expr: node.initializer.getText(src).replace(/\s+/g, ' '),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(src, visit);
  }

  // ── A lint that silently matches nothing is worse than no lint. ──
  // If the naming vocabulary drifts, this is what notices.
  if (sites.length === 0) {
    console.error(
      '\n[lint — ERROR] check-clock-guards matched ZERO interval bindings.\n' +
        '  The naming vocabulary has drifted and this check has gone blind.\n' +
        '  Update INTERVAL_NAME / STAMP_TEXT rather than ignoring this.',
    );
    process.exit(1);
  }

  // Every exemption must still resolve to a real site, so a rename
  // cannot leave a stale entry silently excusing nothing.
  const stale = EXEMPTIONS.filter(
    (e) => !sites.some((s) => s.file === e.file && s.name === e.name),
  );
  if (stale.length > 0) {
    console.error(
      `\n[lint — ERROR] ${stale.length} stale exemption(s) — the site no ` +
        'longer exists (renamed or removed):',
    );
    for (const e of stale) console.error(`  ${e.file} :: ${e.name}`);
    process.exit(1);
  }

  if (findings.length === 0) {
    console.log(
      `check-clock-guards: ${sites.length} interval binding(s) across ` +
        `${new Set(sites.map((s) => s.file)).size} file(s) all guard a ` +
        `backward clock (${EXEMPTIONS.length} exemption(s)).`,
    );
    return;
  }

  console.warn(
    `\n[lint — ${EXIT_ON_FINDINGS ? 'ERROR' : 'WARN'}] ${findings.length} ` +
      'unguarded interval binding(s) — game time can run backwards:',
  );
  for (const f of findings) {
    console.warn(`  ${f.file}:${f.line}  const ${f.name} = ${f.expr}`);
  }
  console.warn(
    '\n  Add a non-positive guard that re-stamps and integrates nothing:\n' +
      '      if (elapsed <= 0) { this.<x>ClockStamp = nowS; return; }\n' +
      '  If the guard genuinely lives elsewhere, add an EXEMPTION with a\n' +
      '  reason in scripts/check-clock-guards.ts.\n',
  );
  if (EXIT_ON_FINDINGS) process.exit(1);
}

main();
