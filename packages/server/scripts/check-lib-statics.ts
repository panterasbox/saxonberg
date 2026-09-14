/**
 * check-lib-statics — ⭐⭐ **the ratchet for the value-object statics
 * sweep.**
 *
 * > A public `static` on a non-`Api` class is **callable by anyone and
 * > visible to nobody.**
 *
 * `scripts/project-author-surface.ts` admits exactly two things into the
 * consumer tier — public statics on an `*Api`, and public *instance*
 * methods on everything else:
 *
 * ```ts
 * const isStaticApi   =  apiClass && member.flags?.isStatic === true;
 * const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
 * if (!isStaticApi && !isStuffMethod) continue;   // ← dropped
 * ```
 *
 * A static on a `lib/` class satisfies neither, so it never reaches the
 * generated docs. Its *instance* methods survive; only the statics
 * vanish — which is exactly what somebody goes looking for. That is a
 * direct breach of `CLAUDE.md`'s governing invariant,
 * **`callable == visible == cared-about`**.
 *
 * ## Census, then ratchet
 *
 * The count is the ceiling. It may fall and may never rise, which is
 * what stops the population growing while the sweep works through it
 * (`docs/lint-family.md § census-then-ratchet`, the pattern that took
 * `lint:object-verbs` from 338 to 0). A static's home is its subsystem
 * **Api** (construction, guards, lookups) or an
 * `platform/idea/api/<X>Logic.ts` **logic singleton** (domain logic) —
 * see `docs/slates/builds/value-object-statics-slate.md`.
 *
 * ## ⚠ What counts, stated exactly
 *
 * A **public static method** declared in the body of an **exported class
 * declaration** that does not end in `Api`, under the kernel's `lib/` or
 * `platform/`, or any capability pack's `src/`. Excluded, deliberately:
 *
 *   - `private` / `protected` / `#` statics — already invisible by
 *     intent, and the projection agrees;
 *   - `static readonly` fields and `_`-prefixed slots — data and
 *     framework seams, not a calling surface;
 *   - the three framework declaration statics the Hydrator and the
 *     wire read by name (`fieldMeta`, `subscribableFields`,
 *     `markupAugmenters`);
 *   - ⚠ **statics inside a mixin factory's returned class expression.**
 *     They are equally invisible, but a mixin's statics are reached
 *     through the composed host and rehoming them is a different
 *     question from rehoming a value class's. Out of scope by
 *     definition, not by oversight — count them when that question is
 *     asked.
 *
 * Usage:
 *   tsx scripts/check-lib-statics.ts --lint      # CI gate
 *   tsx scripts/check-lib-statics.ts --report    # the roster
 */

import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { MUD, packSources, packSrcFiles } from './pack-roots';

const REPO_ROOT = join(MUD, '../../../..');

/**
 * ⭐ **The ceiling. It may fall; it may never rise.**
 *
 * ⚠ The slate quotes **461**, which was this script's first pass — and
 * that pass read only the FIRST exported class in each file, so every
 * file declaring a value class beside its mixin was undercounted (11
 * such files under the kernel's `lib/` alone) and it required a static
 * to sit at exactly two spaces of indent. W0 corrected that to
 * **159 classes · 535 statics**, every pair verified to exist.
 *
 * ⭐ W1 then widened the SCOPE to `mud/platform/` as well (D2): the
 * projection's own report showed 31 equally-invisible statics there —
 * `VisionModality.canSee` among them — and the invariant is about
 * visibility, not about which directory a class sits in. **564.**
 * Lowering it is the sweep's whole job.
 */
export const LIB_STATICS_CEILING = 564;

const STATIC =
  /^\s*(?:public\s+)?static\s+(?:async\s+)?(?!readonly\b|get\b|set\b|_)([a-zA-Z]\w*)\s*[(<]/;

/** Declaration statics the framework reads by name — data, not surface. */
const FRAMEWORK = new Set(['fieldMeta', 'subscribableFields', 'markupAugmenters']);

export interface StaticRow {
  file: string;
  cls: string;
  statics: string[];
}

/**
 * The names a module exports through a *statement* rather than inline —
 * `export default Provision;` / `export { Foo, Bar };`. ⚠ Ten files
 * under `lib/` and `platform/` declare their class bare and export it on
 * a later line, and none of them carries a static TODAY. A ratchet with
 * a hole in it is the documented failure class (*gates ship broken and
 * silently pass*), so the hole is closed while it is still empty.
 */
function deferredExportNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const m of source.matchAll(/^export\s+default\s+(\w+)\s*;/gm)) {
    names.add(m[1]!);
  }
  for (const m of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * Every exported class declaration in a source file, with the exact
 * extent of its body — brace-matched, so a nested class expression (a
 * mixin factory's return) is inside its OWN extent and never attributed
 * to the enclosing declaration.
 */
export function exportedClasses(source: string): { cls: string; body: string }[] {
  const out: { cls: string; body: string }[] = [];
  const deferred = deferredExportNames(source);
  const decl = /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+(\w+)/gm;
  for (const m of source.matchAll(decl)) {
    if (!m[0].startsWith('export') && !deferred.has(m[1]!)) continue;
    const open = source.indexOf('{', m.index + m[0].length);
    if (open === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i++) {
      const c = source[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    out.push({ cls: m[1]!, body: source.slice(open + 1, end) });
  }
  return out;
}

/**
 * The public static methods declared directly in a class body — depth 1
 * only, so a static whose implementation contains a nested class or an
 * object literal contributes once and its innards contribute nothing.
 */
export function publicStaticsOf(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (depth === 0) {
      const m = STATIC.exec(raw);
      if (m && !FRAMEWORK.has(m[1]!)) out.push(m[1]!);
    }
    for (const c of line) {
      if (c === '{') depth++;
      else if (c === '}') depth = Math.max(0, depth - 1);
    }
  }
  return [...new Set(out)];
}

function sourceFiles(): string[] {
  const files = [...packSrcFiles(join(MUD, 'lib')), ...packSrcFiles(join(MUD, 'platform'))];
  for (const pack of packSources()) files.push(...packSrcFiles(pack.srcDir));
  return files.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));
}

function census(): StaticRow[] {
  const rows: StaticRow[] = [];
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const { cls, body } of exportedClasses(source)) {
      if (cls.endsWith('Api')) continue;
      const statics = publicStaticsOf(body);
      if (statics.length) rows.push({ file: relative(REPO_ROOT, file), cls, statics });
    }
  }
  return rows.sort((a, b) => b.statics.length - a.statics.length || a.cls.localeCompare(b.cls));
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--lint';
  const rows = census();
  const total = rows.reduce((n, r) => n + r.statics.length, 0);

  if (mode === '--report') {
    console.log(`${rows.length} non-Api classes with public static methods\n`);
    for (const r of rows) {
      console.log(`${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.statics.join(', ')}`);
      console.log(`    ${r.file}`);
    }
    console.log(`\n${total} public statics in total`);
    return;
  }

  if (total > LIB_STATICS_CEILING) {
    console.error(
      `\n✖ lint:lib-statics — ${total} public static(s) on ${rows.length} ` +
        `non-Api class(es); the ceiling is ${LIB_STATICS_CEILING}.\n\n` +
        `  A public static on a non-Api class is callable by anyone and ` +
        `visible to nobody: the author-surface projection admits public ` +
        `Api statics and public INSTANCE methods, and a static here is ` +
        `neither. Move it to the subsystem's Api (construction, guards, ` +
        `lookups) or to a platform/idea/api/<X>Logic.ts logic singleton ` +
        `(domain logic). The ceiling may fall; it may never rise.\n`,
    );
    for (const r of rows.slice(0, 20)) {
      console.error(`  ${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.file}`);
    }
    if (rows.length > 20) console.error(`  … and ${rows.length - 20} more (--report for all)`);
    process.exit(1);
  }

  console.log(
    `✔ lint:lib-statics — ${total} public static(s) on non-Api classes ` +
      `(ceiling ${LIB_STATICS_CEILING}).`,
  );
}

if (process.argv[1] && /check-lib-statics\.ts$/.test(process.argv[1])) main();
