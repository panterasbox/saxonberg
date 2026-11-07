/**
 * check-aromas — ⭐ **a word a row names must resolve to a row.**
 *
 * Aroma words are open: any pack can ship one at `/stuff/idea/aroma/<word>`,
 * which means nothing in the kernel can list them. So a misspelled word has no
 * list to fail against, and the failure it would otherwise have is the worst
 * this codebase knows: a smell silently dropped, because the runtime reads a
 * word with no row and has nothing to say. The setters catch it at mint; this
 * catches it where the content is checked, before anything runs.
 *
 * It refuses, with no exemption list:
 *
 *   1. an aroma word that has no row, or whose row is in a pack the namer
 *      cannot reach through its dependencies;
 *   2. `smells:` or `burning:` on a row whose class cannot hold one (a plain
 *      `Material`), because the applier would drop the key silently;
 *   3. a `tastes:` entry in the old word-list shape, or naming a word outside
 *      the five;
 *   4. a recipe `medium:` that no material in reach carries in its `tags`.
 *
 * ⚠ The platform pack is the kernel's own content and every world installs the
 * commons, so it may name a commons word, the license `TemplatePaths.rootBiome`
 * already takes.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import { pathToFileURL } from 'url';
import YAML from 'yaml';
import {
  CONTENT,
  SERVER_SRC,
  composesMixin,
  effectiveDoc,
  inheritanceIndex,
  packSources,
  walkYamlFiles,
} from './pack-roots';

const AROMA_ROOT = '/stuff/idea/aroma/';
const BASIC_TASTES = new Set(['sweet', 'sour', 'salty', 'bitter', 'umami']);
/** The kernel names these itself (rot, decay and a corpse's stale blood). */
const KERNEL_WORDS = ['rot', 'decay', 'blood'];
/** Where a row's words live, and which key carries the word. */
const WORD_FIELDS: Readonly<Record<string, string>> = {
  smells: 'word',
  burning: 'word',
  combustionImparts: 'type',
  imparts: 'type',
  charredImparts: 'type',
  dissolvedAromatics: 'type',
};

/** The packs `pack` can reach, itself included. */
function reachOf(pack: string, content: string): Set<string> {
  const seen = new Set<string>();
  const walk = (p: string): void => {
    if (seen.has(p)) return;
    seen.add(p);
    const file = join(content, p, 'package.json');
    if (!existsSync(file)) return;
    const pj = JSON.parse(readFileSync(file, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    for (const d of Object.keys(pj.dependencies ?? {})) {
      if (d.startsWith('@saxonberg/content-')) walk(d.slice('@saxonberg/content-'.length));
    }
  };
  walk(pack);
  if (pack === 'platform') seen.add('base-library');
  return seen;
}

/** Every `{field, word}` a row's data names, at any depth. */
function wordsIn(data: unknown, into: { field: string; word: unknown }[] = []): typeof into {
  if (Array.isArray(data)) {
    for (const item of data) wordsIn(item, into);
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const wordKey = WORD_FIELDS[key];
      if (wordKey && Array.isArray(value)) {
        for (const tag of value) {
          into.push({ field: key, word: (tag as Record<string, unknown>)?.[wordKey] });
        }
      } else {
        wordsIn(value, into);
      }
    }
  }
  return into;
}

function recipeFiles(content: string): { pack: string; file: string }[] {
  const out: { pack: string; file: string }[] = [];
  for (const pack of readdirSync(content)) {
    const dir = join(content, pack, 'content', 'recipes');
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      for (const file of walkYamlFiles(dir)) out.push({ pack, file });
    }
  }
  return out;
}

export function checkAromas(
  content: string = CONTENT,
  serverSrc: string = SERVER_SRC,
): string[] {
  const findings: string[] = [];
  const index = inheritanceIndex(serverSrc, content);
  const reach = new Map<string, Set<string>>();
  const reachFor = (pack: string): Set<string> => {
    let r = reach.get(pack);
    if (!r) reach.set(pack, (r = reachOf(pack, content)));
    return r;
  };
  const roots = packSources(content);
  const tagsByPack = new Map<string, Set<string>>();

  const checkWord = (pack: string, owner: string, field: string, word: unknown): void => {
    const row = index.rows.get(AROMA_ROOT + String(word));
    if (!row) {
      findings.push(`${owner}: ${field} names '${String(word)}', which has no row at ${AROMA_ROOT}${String(word)}`);
    } else if (row.pack !== 'kernel' && row.pack !== pack && !reachFor(pack).has(row.pack)) {
      findings.push(`${owner}: ${field} names '${String(word)}', shipped by '${row.pack}', which '${pack}' does not depend on`);
    }
  };

  for (const row of index.rows.values()) {
    if (row.pack === 'kernel') continue;
    const doc = effectiveDoc(row.file, row.raw, index);
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    for (const { field, word } of wordsIn(data)) checkWord(row.pack, row.path, field, word);

    const odor = data.odor as { word?: unknown } | undefined;
    if (odor?.word !== undefined) checkWord(row.pack, row.path, 'odor', odor.word);

    const cls = typeof doc.class === 'string' ? doc.class : '';
    const isSpecies = cls.includes('/species/');
    if (!isSpecies && ('smells' in data || 'burning' in data) && !composesMixin(cls, 'OdorousMixin', roots)) {
      findings.push(`${row.path}: authors smells or burning, but its class ${cls || '(none)'} cannot hold one; name an Odorous class`);
    }
    const tastes = data.tastes;
    if (Array.isArray(tastes)) {
      for (const t of tastes) {
        const tag = t as { type?: unknown; amount?: unknown };
        if (typeof t === 'string') {
          findings.push(`${row.path}: tastes names '${t}' with no amount; write { type, amount } in g/kg`);
        } else if (!BASIC_TASTES.has(String(tag?.type)) || !(Number(tag?.amount) > 0)) {
          findings.push(`${row.path}: tastes entry '${String(tag?.type)}' needs one of the five tastes and a positive amount`);
        }
      }
    }
    const docTags = (doc.data as { tags?: unknown } | undefined)?.tags;
    if (Array.isArray(docTags) && row.path.includes('/idea/material/')) {
      let tags = tagsByPack.get(row.pack);
      if (!tags) tagsByPack.set(row.pack, (tags = new Set()));
      for (const t of docTags) tags.add(String(t));
    }
  }

  for (const { pack, file } of recipeFiles(content)) {
    const owner = relative(content, file);
    const raw = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>;
    const body = (raw.data ?? raw) as Record<string, unknown>;
    for (const { field, word } of wordsIn(body)) checkWord(pack, owner, field, word);
    const medium = body.medium;
    if (typeof medium === 'string') {
      const carried = [...reachFor(pack)].some((p) => tagsByPack.get(p)?.has(medium));
      if (!carried) {
        findings.push(`${owner}: medium '${medium}' is a tag no material in reach of '${pack}' carries`);
      }
    }
  }

  if (content === CONTENT) {
    for (const word of KERNEL_WORDS) {
      if (!index.rows.has(AROMA_ROOT + word)) {
        findings.push(`the kernel names aroma '${word}', which has no row at ${AROMA_ROOT}${word}`);
      }
    }
  }
  return findings;
}

function main(): void {
  const findings = checkAromas();
  if (findings.length === 0) {
    console.info('check-aromas: ok — every aroma word resolves and every medium is carried.');
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f}`);
  console.error(`\n✖ check-aromas: ${findings.length} finding(s).`);
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
