/**
 * check-aromas — ⭐ **an aroma a row names must be a document at that path.**
 *
 * Aromas are open: any pack can ship one under `content/aromas/`, stored under
 * the pack's root (`base-library`'s `content/aromas/smoke.yaml` is
 * `/base-library/aromas/smoke`), which means nothing in the kernel can list
 * them. So a misspelled path has no list to fail against, and the failure it
 * would otherwise have is the worst this codebase knows: a smell silently
 * dropped, because the runtime reads a path with no document and has nothing to
 * say. The setters catch it at mint; this catches it where the content is
 * checked, before anything runs.
 *
 * It refuses, with no exemption list:
 *
 *   1. an aroma path with no `aroma` document there, or one in a pack the namer
 *      cannot reach through its dependencies, or a `parent:` that is neither;
 *   2. `smells:` or `burning:` on a row whose class cannot hold one (a plain
 *      `Material`), because the applier would drop the key silently;
 *   3. a `tastes:` entry in the old word-list shape, or naming a word outside
 *      the five;
 *   4. a recipe `medium:` that no material in reach carries in its `tags`.
 *
 * ⚠ The platform pack is the kernel's own content and every world installs the
 * commons, so it may name a commons aroma, the license `TemplatePaths.rootBiome`
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

const AROMA_DIR = 'aromas';
const LEAF_SHAPE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const BASIC_TASTES = new Set(['sweet', 'sour', 'salty', 'bitter', 'umami']);
/** The kernel names these itself (rot, decay and a corpse's stale blood). */
const KERNEL_AROMAS = [
  '/base-library/aromas/rot',
  '/base-library/aromas/decay',
  '/base-library/aromas/blood',
];
/** Where a row's aromas live, and which key carries the path. */
const AROMA_FIELDS: Readonly<Record<string, string>> = {
  smells: 'aroma',
  burning: 'aroma',
  combustionImparts: 'type',
  imparts: 'type',
  charredImparts: 'type',
  dissolvedAromatics: 'type',
};

/** A pack's document root: its manifest's `root:`, else `/<id>` (PackLogic's rule). */
function rootOf(pack: string, content: string): string {
  const file = join(content, pack, 'pack.yaml');
  if (!existsSync(file)) return `/${pack}`;
  const m = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as { id?: unknown; root?: unknown };
  return typeof m.root === 'string' ? m.root : `/${typeof m.id === 'string' ? m.id : pack}`;
}

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

/** Every `{field, aroma}` a row's data names, at any depth. */
function aromasIn(data: unknown, into: { field: string; aroma: unknown }[] = []): typeof into {
  if (Array.isArray(data)) {
    for (const item of data) aromasIn(item, into);
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const pathKey = AROMA_FIELDS[key];
      if (pathKey && Array.isArray(value)) {
        for (const tag of value) {
          into.push({ field: key, aroma: (tag as Record<string, unknown>)?.[pathKey] });
        }
      } else {
        aromasIn(value, into);
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
  // Every aroma document, by the path it is stored at: which pack ships it and
  // what it says. ⭐ Any depth under `aromas/`: the path is the identity, so a
  // pack may arrange its aromas in directories.
  const aromas = new Map<string, { pack: string; parent?: unknown }>();
  for (const pack of readdirSync(content)) {
    const dir = join(content, pack, 'content', AROMA_DIR);
    if (!existsSync(dir)) continue;
    const root = rootOf(pack, content);
    for (const file of walkYamlFiles(dir)) {
      const owner = relative(content, file);
      const rel = relative(dir, file).split(/[\\/]/).join('/').replace(/\.yaml$/, '');
      if (!rel.split('/').every((seg) => LEAF_SHAPE.test(seg))) {
        findings.push(`${owner}: an aroma's file and directory names are lowercase slugs (its word is the last one)`);
        continue;
      }
      const doc = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as { word?: unknown; parent?: unknown };
      if (doc.word !== undefined) {
        findings.push(`${owner}: an aroma has no \`word:\`; its word is its file name and its identity is its path`);
      }
      aromas.set(`${root}/${AROMA_DIR}/${rel}`, { pack, parent: doc.parent });
    }
  }
  const tagsByPack = new Map<string, Set<string>>();

  const checkAroma = (pack: string, owner: string, field: string, aroma: unknown): void => {
    const doc = aromas.get(String(aroma));
    if (!doc) {
      findings.push(`${owner}: ${field} names '${String(aroma)}', which is not an aroma document's path`);
    } else if (doc.pack !== pack && !reachFor(pack).has(doc.pack)) {
      findings.push(`${owner}: ${field} names '${String(aroma)}', shipped by '${doc.pack}', which '${pack}' does not depend on`);
    }
  };

  for (const row of index.rows.values()) {
    if (row.pack === 'kernel') continue;
    const doc = effectiveDoc(row.file, row.raw, index);
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    for (const { field, aroma } of aromasIn(data)) checkAroma(row.pack, row.path, field, aroma);

    const odor = data.odor as { aroma?: unknown; word?: unknown } | undefined;
    if (odor?.word !== undefined) findings.push(`${row.path}: odor names an aroma by \`aroma:\` and its path, not \`word:\``);
    if (odor?.aroma !== undefined) checkAroma(row.pack, row.path, 'odor', odor.aroma);

    const cls = typeof doc.class === 'string' ? doc.class : '';
    const isSpecies = cls.includes('/species/');
    if (!isSpecies && 'smells' in data && !composesMixin(cls, 'OdorMixin', roots)) {
      findings.push(`${row.path}: authors smells, but its class ${cls || '(none)'} cannot hold one; name a kind that composes Odor`);
    }
    if (!isSpecies && 'burning' in data && !composesMixin(cls, 'CombustionMixin', roots)) {
      findings.push(`${row.path}: authors burning, but its class ${cls || '(none)'} does not burn; name a kind that composes Combustion`);
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
    for (const { field, aroma } of aromasIn(body)) checkAroma(pack, owner, field, aroma);
    const medium = body.medium;
    if (typeof medium === 'string') {
      const carried = [...reachFor(pack)].some((p) => tagsByPack.get(p)?.has(medium));
      if (!carried) {
        findings.push(`${owner}: medium '${medium}' is a tag no material in reach of '${pack}' carries`);
      }
    }
  }

  for (const [path, doc] of aromas) {
    if (doc.parent !== undefined) checkAroma(doc.pack, path, 'parent', doc.parent);
  }
  if (content === CONTENT) {
    for (const path of KERNEL_AROMAS) {
      if (!aromas.has(path)) findings.push(`the kernel names aroma '${path}', which has no document`);
    }
  }
  return findings;
}

function main(): void {
  const findings = checkAromas();
  if (findings.length === 0) {
    console.info('check-aromas: ok — every aroma path resolves and every medium is carried.');
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f}`);
  console.error(`\n✖ check-aromas: ${findings.length} finding(s).`);
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
