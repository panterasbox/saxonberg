/**
 * check-typed-words — ⭐ **a word a player types means one thing.**
 *
 * A document's path is its only identity (documents path identity, D3), so
 * two packs may each ship a `smoke` aroma under their own roots and neither
 * is the other. A **typed word** is different: `smile`, `carve stool`,
 * `survey`'s room archetypes are names a player TYPES, and a word that two
 * packs ship would mean two things. The installer refuses the second
 * claimant at install (the install set, and the store for a pack synced
 * live); this gate runs the same check over the shipped packs before merge,
 * so a collision is found in review and not by an operator at boot.
 *
 * The kinds checked are exactly the kinds whose `DocumentKinds` spec
 * declares `words` — the vocabulary is read, never listed here.
 *
 * Usage: tsx scripts/check-typed-words.ts
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import { CONTENT } from './pack-roots';
import {
  DOCUMENT_KINDS,
  type DocumentKindSpec,
} from '../src/mud/lib/document/DocumentKinds';

/** A pack's document root: its manifest's `root:`, else `/<id>` (PackLogic's rule). */
function rootOf(pack: string, content: string): string {
  const file = join(content, pack, 'pack.yaml');
  if (!existsSync(file)) return `/${pack}`;
  const m = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as { id?: unknown; root?: unknown };
  return typeof m.root === 'string' ? m.root : `/${typeof m.id === 'string' ? m.id : pack}`;
}

function* walk(dir: string, ext: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p, ext);
    else if (p.endsWith(`.${ext}`)) yield p;
  }
}

export function checkTypedWords(content: string = CONTENT): string[] {
  const findings: string[] = [];
  const specs = Object.values(DOCUMENT_KINDS as Record<string, DocumentKindSpec>).filter(
    (s) => s.words !== undefined,
  );
  for (const spec of specs) {
    const seen = new Map<string, string>();
    for (const pack of readdirSync(content).sort()) {
      const dir = join(content, pack, 'content', spec.contentDir);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      const root = rootOf(pack, content);
      for (const file of walk(dir, spec.ext)) {
        const rel = relative(dir, file).replace(new RegExp(`\\.${spec.ext}$`), '');
        const path = `${root}/${spec.contentDir}/${rel.split(/[\\/]/).join('/')}`;
        const data =
          spec.ext === 'yaml'
            ? ((YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>)
            : {};
        for (const word of spec.words!({ path, data })) {
          const first = seen.get(word);
          const here = relative(content, file);
          if (first) {
            findings.push(
              `${spec.kind} word '${word}' is shipped twice: ${first} and ${here}. ` +
                `A typed word means one thing — rename one (its file name IS its word).`,
            );
          } else {
            seen.set(word, here);
          }
        }
      }
    }
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = checkTypedWords();
  if (findings.length > 0) {
    console.error(`✖ lint:typed-words — ${findings.length} collision(s):`);
    for (const f of findings) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('✔ lint:typed-words — every typed word is shipped once.');
}
