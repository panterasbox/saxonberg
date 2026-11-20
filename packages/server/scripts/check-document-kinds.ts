/**
 * check-document-kinds — ⭐ **every document kind is declared, once, and
 * every declaration stands.**
 *
 * Kinds are free text (naming overhaul, Stage A): a kind exists because
 * somebody ships its declaration at `<root>/kinds/<kind>` — nothing in code
 * lists them. The installer refuses a broken declaration at boot; this gate
 * finds it in review:
 *
 *   1. every declaration parses (`DocumentKind.fromData` — an unknown trait
 *      or parameter is an error);
 *   2. one declaration per name — the namespace is global;
 *   3. a `catalogued.by` service resolves to a class file, as a view's
 *      `controller:` does;
 *   4. no two shipped kinds claim one dir;
 *   5. a pack ships documents only in dirs a kind declared by itself or a
 *      pack it depends on;
 *   6. a `unique` keyword means one document across every pack (the word
 *      dispatches without asking — an emote, a formation).
 *
 * Usage: tsx scripts/check-document-kinds.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import {
  CONTENT,
  classFileOf,
  kindDeclarations,
  packManifests,
  packSources,
} from './pack-roots';
import { DocumentKind } from '../src/mud/lib/document/DocumentKind';

function* walk(dir: string, ext: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p, ext);
    else if (p.endsWith(`.${ext}`)) yield p;
  }
}

/**
 * Whether a service path names a class file — directly, or by the logic
 * singletons' one exception (`/platform/idea/api/command` is
 * `CommandLogic.ts`: the template is named for the feature, the class for
 * the logic).
 */
function serviceFileExists(by: string, sources: ReturnType<typeof packSources>): boolean {
  const file = classFileOf(by, sources);
  if (existsSync(file)) return true;
  const leaf = file.slice(file.lastIndexOf('/') + 1, -'.ts'.length);
  const logic = `${file.slice(0, file.lastIndexOf('/') + 1)}${leaf.charAt(0).toUpperCase()}${leaf.slice(1)}Logic.ts`;
  return by.includes('/idea/api/') && existsSync(logic);
}

export function checkDocumentKinds(content: string = CONTENT): string[] {
  const findings: string[] = [];
  const sources = packSources(content);
  const manifests = new Map(packManifests(content).map((m) => [m.id, m]));
  const declared = new Map<string, { pack: string; file: string; kind: DocumentKind }>();
  for (const d of kindDeclarations(content)) {
    const where = relative(content, d.file);
    let kind: DocumentKind;
    try {
      kind = new DocumentKind(d.name, d.data);
    } catch (err) {
      findings.push(`${where}: ${(err as Error).message}`);
      continue;
    }
    const first = declared.get(d.name);
    if (first) {
      findings.push(`kind '${d.name}' is declared twice: ${first.file} and ${where}`);
      continue;
    }
    if (d.name === DocumentKind.BOOTSTRAP_NAME) {
      findings.push(`${where}: 'kind' is the bootstrap — nobody declares it`);
      continue;
    }
    declared.set(d.name, { pack: d.pack, file: where, kind });
    const by = kind.servedBy();
    if (by && !serviceFileExists(by, sources)) {
      findings.push(`${where}: catalogued.by '${by}' resolves to no class file`);
    }
  }

  // Shipped dirs: one kind per dir; a pack's dirs declared by it or a dependency.
  const byDir = new Map<string, { name: string; pack: string }>();
  byDir.set('kinds', { name: DocumentKind.BOOTSTRAP_NAME, pack: 'platform' });
  for (const [name, d] of declared) {
    const dir = d.kind.shipped()?.dir;
    if (!dir) continue;
    const other = byDir.get(dir);
    if (other) findings.push(`kinds '${other.name}' and '${name}' both ship dir '${dir}'`);
    else byDir.set(dir, { name, pack: d.pack });
  }
  for (const m of manifests.values()) {
    const contentDir = join(m.dir, 'content');
    if (!existsSync(contentDir)) continue;
    const reach = new Set(['platform', m.id, ...m.depends]);
    for (const e of readdirSync(contentDir)) {
      const owner = byDir.get(e);
      if (!owner || !statSync(join(contentDir, e)).isDirectory()) continue;
      if (!reach.has(owner.pack)) {
        findings.push(
          `pack '${m.id}' ships ${owner.name} documents (content/${e}) but neither declares ` +
            `the kind nor depends on '${owner.pack}', which does`,
        );
      }
    }
  }

  // Unique words: one document per word across every pack.
  for (const [name, d] of declared) {
    const shipped = d.kind.shipped();
    if (!d.kind.isUnique() || !shipped?.dir) continue;
    const seen = new Map<string, string>();
    for (const m of manifests.values()) {
      const dir = join(m.dir, 'content', shipped.dir);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      for (const file of walk(dir, shipped.ext)) {
        const rel = relative(dir, file).replace(new RegExp(`\\.${shipped.ext}$`), '');
        const path = `${m.root}/${shipped.dir}/${rel.split(/[\\/]/).join('/')}`;
        const data =
          shipped.ext === 'yaml'
            ? ((YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>)
            : {};
        for (const word of d.kind.keywordsOf(path, data)) {
          const here = relative(content, file);
          const first = seen.get(word);
          if (first) {
            findings.push(`${name} word '${word}' is shipped twice: ${first} and ${here} (the kind is unique)`);
          } else seen.set(word, here);
        }
      }
    }
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = checkDocumentKinds();
  if (findings.length > 0) {
    console.error(`✖ lint:document-kinds — ${findings.length} finding(s):`);
    for (const f of findings) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('✔ lint:document-kinds — every kind is declared once, and every declaration stands.');
}
