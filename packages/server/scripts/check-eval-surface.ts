/**
 * check-eval-surface — the `eval` sandbox's ungated-internal census, as a
 * ratchet.
 *
 * ⭐ `eval` binds every Api that self-decorates (EvalScript, via
 * `SecurityApi.decoratedApiClasses()`), so its surface is a FACT the
 * Apis declare rather than a list anybody keeps. What keeps that safe is
 * the rule that binding an Api exposes exactly what its own per-static
 * gates allow. A static marked `@internal` (hidden from the author docs,
 * so not author surface) but carrying NO gate is the one shape that rule
 * does not cover: it is callable from eval and invisible in the docs —
 * `callable == visible == cared-about`, broken.
 *
 * Counted: every public static method on an exported `*Api` class under
 * `src/mud/api/` (the four bootstrap-special Apis excepted — they never
 * self-decorate, so eval never binds them) whose TSDoc carries
 * `@internal` and which has neither a `@CallSecurity(` nor a `@TestOnly(`
 * decorator, nor a `_` prefix (the `assertTestOnly` convention for test
 * seams).
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): today's count is the
 * CEILING. It may fall, never rise; the second step gates or marks each
 * one and flips the ceiling to zero.
 */

import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(here, '..', 'src', 'mud', 'api');

/** Never bound by eval — they never call `decorateApiClass`. */
const BOOTSTRAP_SPECIAL = new Set([
  'ExecutionContextApi',
  'ModuleApi',
  'SecurityApi',
  'ProxyApi',
]);

/** The ratchet. Lower it when the census falls; never raise it. */
const CEILING = 14;

interface Finding {
  file: string;
  api: string;
  member: string;
}

function hasInternalTag(node: ts.Node, sf: ts.SourceFile): boolean {
  const ranges = ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? [];
  return ranges.some((r) => /@internal\b/.test(sf.text.slice(r.pos, r.end)));
}

function decoratorText(node: ts.MethodDeclaration, sf: ts.SourceFile): string {
  return (ts.getDecorators(node) ?? []).map((d) => d.getText(sf)).join(' ');
}

const findings: Finding[] = [];
for (const name of readdirSync(API_ROOT).sort()) {
  if (!name.endsWith('.ts')) continue;
  const path = join(API_ROOT, name);
  const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  sf.forEachChild((stmt) => {
    if (!ts.isClassDeclaration(stmt) || !stmt.name) return;
    const api = stmt.name.text;
    if (!/Api$/.test(api) || BOOTSTRAP_SPECIAL.has(api)) return;
    const exported = (ts.getModifiers(stmt) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!exported) return;
    for (const m of stmt.members) {
      if (!ts.isMethodDeclaration(m) || !m.name) continue;
      if (ts.isPrivateIdentifier(m.name)) continue;
      const mods = ts.getModifiers(m) ?? [];
      if (!mods.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)) continue;
      if (
        mods.some(
          (x) =>
            x.kind === ts.SyntaxKind.PrivateKeyword ||
            x.kind === ts.SyntaxKind.ProtectedKeyword,
        )
      ) {
        continue;
      }
      const member = m.name.getText(sf);
      if (member.startsWith('_')) continue;
      if (!m.body) continue; // an overload signature; the implementation is counted
      if (!hasInternalTag(m, sf)) continue;
      if (/CallSecurity\(|TestOnly\(/.test(decoratorText(m, sf))) continue;
      findings.push({ file: name, api, member });
    }
  });
}

const count = findings.length;
console.log(
  `check-eval-surface: ${count} ungated @internal static(s) on eval-bound Apis (ceiling ${CEILING}).`,
);
for (const f of findings) console.log(`  ${f.api}.${f.member}  (api/${f.file})`);
if (count > CEILING) {
  console.error(
    `check-eval-surface: ${count} > ceiling ${CEILING}. A new @internal static on an Api ` +
      'is callable from eval: give it a @CallSecurity gate, @TestOnly it, or drop @internal ' +
      'if it is author surface (docs/lint-family.md § census, then ratchet).',
  );
  process.exit(1);
}
if (count < CEILING) {
  console.log(`check-eval-surface: the census fell — lower CEILING to ${count}.`);
}
