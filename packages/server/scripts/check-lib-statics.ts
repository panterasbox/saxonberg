/**
 * check-lib-statics — ⭐⭐ **the ratchet for the value-object statics
 * sweep.**
 *
 * > Does this static answer a question about the **TYPE**, or about the
 * > **WORLD**?

 * Type-level statics — construction (`Quantity.of`, `Currency.parse`),
 * guards over the type's own closed vocabulary (`Construction.isForm`)
 * and lookups of it (`Currency.all`) — **stay on the value class**, and
 * as of W2 the author-surface projection admits them as their own
 * `value-static` kind. They were never the problem; being *invisible*
 * was, and they are visible now.
 *
 * ⭐ World-level statics are the sweep: `Freshness.growthRate`,
 * `Contamination.advance`, `CombatNarration.narrate` compute facts about
 * the world, which is a **logic singleton**'s job
 * (`platform/idea/api/<X>Logic.ts`, `@internal`, `FromModule`-gated,
 * HMR-able) with the subsystem Api forwarding. `CLAUDE.md` already calls
 * that split mandatory; these classes predate it.
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
 *   - the framework declaration statics reached reflectively by name
 *     (`FRAMEWORK` below) — they can never move and are not surface;
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
export const LIB_STATICS_CEILING = 387;

const STATIC =
  /^\s*(?:public\s+)?static\s+(?:async\s+)?(?!readonly\b|get\b|set\b|_)([a-zA-Z]\w*)\s*[(<]/;

/**
 * Statics the framework reaches **by name**, reflectively — so they can
 * never move, and they are not author surface either. They are the
 * mixin-side equivalent of an `@hook`: the class declares them and the
 * framework calls them.
 *
 * ⚠ The full set is found by grepping the framework for reflective
 * access (`hasOwnProperty.call(c, '…')`): `fieldMeta` ·
 * `subscribableFields` · `markupAugmenters` · `cleanupOnDestruct` ·
 * `captureSlice` · `restoreSlice` · `settings`. The last three are
 * declared inside mixin factories, which this census already excludes,
 * so only the first four can reach it. ⭐ `cleanupOnDestruct` was being
 * counted as a movable static — making it private would have silently
 * broken destruct cleanup, because `StuffApi` finds it with
 * `hasOwnProperty`, not with an import.
 */
const FRAMEWORK = new Set([
  'fieldMeta',
  'subscribableFields',
  'markupAugmenters',
  'cleanupOnDestruct',
  'captureSlice',
  'restoreSlice',
  'settings',
]);

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
export function exportedClasses(
  source: string,
): { cls: string; body: string; internal: boolean }[] {
  const out: { cls: string; body: string; internal: boolean }[] = [];
  const deferred = deferredExportNames(source);
  const decl = /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+(\w+)/gm;
  for (const m of source.matchAll(decl)) {
    if (!m[0].startsWith('export') && !deferred.has(m[1]!)) continue;
    // ⭐ A CLASS-level `@internal` is the honest disposition for a `lib/`
    // helper whose every caller sits in one subsystem: the class is that
    // subsystem's private collaborator, TypeDoc drops it whole, and the
    // cohesion that made it a class in the first place survives — which
    // folding its methods into a 5,000-line logic singleton would not.
    const before = source.slice(0, m.index);
    const lastDoc = before.lastIndexOf('/**');
    const internal =
      lastDoc !== -1 &&
      before.indexOf('*/', lastDoc) !== -1 &&
      before.slice(lastDoc, before.indexOf('*/', lastDoc)).includes('@internal') &&
      before.slice(before.indexOf('*/', lastDoc) + 2).trim().length === 0;
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
    out.push({ cls: m[1]!, body: source.slice(open + 1, end), internal });
  }
  return out;
}

/**
 * The public static methods declared directly in a class body — depth 1
 * only, so a static whose implementation contains a nested class or an
 * object literal contributes once and its innards contribute nothing.
 */
export function publicStaticsOf(body: string): string[] {
  return statsOf(body).surface;
}

/**
 * Split a class body's public statics into the ones that breach the
 * invariant and the ones that **declare** they do not.
 *
 * ⭐ `@internal` is the honest escape: TypeDoc drops it, so the member is
 * invisible *because its author said so*, not silently. That is not the
 * breach — the breach was invisibility nobody chose. But it is an escape
 * hatch, so the gate counts it separately and prints it: a rising
 * `declaredInternal` is a reviewable fact, not a hidden one.
 */
export function statsOf(body: string): {
  surface: string[];
  declaredInternal: string[];
} {
  const surface: string[] = [];
  const declaredInternal: string[] = [];
  let depth = 0;
  let inDoc = false;
  let docIsInternal = false;
  let sawDocRecently = false;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (depth === 0) {
      if (line.startsWith('/*')) {
        inDoc = true;
        docIsInternal = line.includes('@internal');
        if (line.includes('*/')) {
          inDoc = false;
          sawDocRecently = true;
        }
      } else if (inDoc) {
        if (line.includes('@internal')) docIsInternal = true;
        if (line.includes('*/')) {
          inDoc = false;
          sawDocRecently = true;
        }
      } else {
        const m = STATIC.exec(raw);
        if (m && !FRAMEWORK.has(m[1]!)) {
          (sawDocRecently && docIsInternal ? declaredInternal : surface).push(m[1]!);
        }
        if (line) {
          sawDocRecently = false;
          docIsInternal = false;
        }
      }
    }
    if (!inDoc) {
      for (const c of line) {
        if (c === '{') depth++;
        else if (c === '}') depth = Math.max(0, depth - 1);
      }
    }
  }
  return {
    surface: [...new Set(surface)],
    declaredInternal: [...new Set(declaredInternal)],
  };
}

function sourceFiles(): string[] {
  const files = [...packSrcFiles(join(MUD, 'lib')), ...packSrcFiles(join(MUD, 'platform'))];
  for (const pack of packSources()) files.push(...packSrcFiles(pack.srcDir));
  return files.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));
}

function census(): { rows: StaticRow[]; internal: number } {
  const rows: StaticRow[] = [];
  let internal = 0;
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const { cls, body, internal: classInternal } of exportedClasses(source)) {
      if (cls.endsWith('Api')) continue;
      const { surface, declaredInternal } = statsOf(body);
      internal += declaredInternal.length;
      if (classInternal) {
        internal += surface.length;
        continue;
      }
      if (surface.length) rows.push({ file: relative(REPO_ROOT, file), cls, statics: surface });
    }
  }
  rows.sort((a, b) => b.statics.length - a.statics.length || a.cls.localeCompare(b.cls));
  return { rows, internal };
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--lint';
  const { rows, internal } = census();
  const total = rows.reduce((n, r) => n + r.statics.length, 0);

  if (mode === '--report') {
    console.log(`${rows.length} non-Api classes with public static methods\n`);
    for (const r of rows) {
      console.log(`${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.statics.join(', ')}`);
      console.log(`    ${r.file}`);
    }
    console.log(`\n${total} public statics in total`);
    console.log(`${internal} more are declared @internal (dropped by TypeDoc)`);
    return;
  }

  if (total > LIB_STATICS_CEILING) {
    console.error(
      `\n✖ lint:lib-statics — ${total} public static(s) on ${rows.length} ` +
        `non-Api class(es); the ceiling is ${LIB_STATICS_CEILING}.\n\n` +
        `  Ask of the new one: does it answer a question about the TYPE ` +
        `or about the WORLD? Type-level (construction, a guard over the ` +
        `type's own vocabulary, a lookup of it) belongs here and is ` +
        `documented as a value-static — but the population may not GROW ` +
        `while the sweep runs. World-level logic belongs on a ` +
        `platform/idea/api/<X>Logic.ts logic singleton with the ` +
        `subsystem's Api forwarding. The ceiling may fall; it may never ` +
        `rise.\n`,
    );
    for (const r of rows.slice(0, 20)) {
      console.error(`  ${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.file}`);
    }
    if (rows.length > 20) console.error(`  … and ${rows.length - 20} more (--report for all)`);
    process.exit(1);
  }

  console.log(
    `✔ lint:lib-statics — ${total} public static(s) on non-Api classes ` +
      `(ceiling ${LIB_STATICS_CEILING}); ${internal} declared @internal.`,
  );
}

if (process.argv[1] && /check-lib-statics\.ts$/.test(process.argv[1])) main();
