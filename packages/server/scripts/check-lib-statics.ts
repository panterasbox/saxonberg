/**
 * check-lib-statics — ⭐⭐ **the census for the value-object statics
 * sweep**, and the ratchet that will hold it once the sweep lands.
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
 * generated docs. That is a direct breach of `CLAUDE.md`'s governing
 * invariant, **`callable == visible == cared-about`**.
 *
 * ⚠ This is a REPORT today, not a gate. It becomes census-then-ratchet
 * the moment the sweep starts: record the count, hold it as a ceiling,
 * drive it to zero.
 *
 * Usage:
 *   tsx scripts/check-lib-statics.ts            # the roster
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = '/home/bobalu/play/saxonberg/build-2';
const ROOTS = [
  join(ROOT, 'packages/server/src/mud/lib'),
  ...readdirSync(join(ROOT, 'packages/content'))
    .map((p) => join(ROOT, 'packages/content', p, 'src'))
    .filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } }),
];

const files: string[] = [];
const walk = (d: string): void => {
  for (const e of readdirSync(d)) {
    const a = join(d, e);
    if (statSync(a).isDirectory()) { if (e !== '__tests__') walk(a); continue; }
    if (a.endsWith('.ts')) files.push(a);
  }
};
for (const r of ROOTS) walk(r);

// A public static METHOD on an exported class that is not an *Api.
const CLASS = /^export (?:default )?(?:abstract )?class (\w+)/m;
const STATIC = /^ {2}(?:public\s+)?static\s+(?!readonly\b|_)([a-zA-Z]\w*)\s*[(<]/gm;

type Row = { file: string; cls: string; statics: string[] };
const rows: Row[] = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const cm = CLASS.exec(src);
  if (!cm) continue;
  const cls = cm[1]!;
  if (cls.endsWith('Api')) continue;
  const found = [...src.matchAll(STATIC)].map((m) => m[1]!)
    .filter((n) => !['fieldMeta','subscribableFields','markupAugmenters'].includes(n));
  if (found.length) rows.push({ file: relative(ROOT, f), cls, statics: [...new Set(found)] });
}
rows.sort((a, b) => b.statics.length - a.statics.length);
console.log(`${rows.length} non-Api classes under lib/ with public static methods\n`);
let total = 0;
for (const r of rows) {
  total += r.statics.length;
  console.log(`${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.statics.join(', ')}`);
  console.log(`    ${r.file}`);
}
console.log(`\n${total} public statics in total`);
