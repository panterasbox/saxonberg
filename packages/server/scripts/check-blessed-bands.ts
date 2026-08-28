/**
 * check-blessed-bands — composing `Blessable` obliges you to author it.
 *
 * The invariant:
 *
 * > **A template whose class carries `BlessableMixin` must carry a
 * > working that authors band variation.** Composing the mixin is
 * > opting in to the framework; opting in means saying what cursed and
 * > blessed *do*.
 *
 * ## Why this is a build check
 *
 * Because the failure is **silent and looks configured**. Before this,
 * a working with no band-varying field was "band-indifferent" — a
 * cursed wand of it fired exactly like an ordinary one, the item still
 * reported its band, `remove curse` still worked on it, and nothing
 * anywhere said the axis was inert. An author could ship a cursed item
 * that was cursed in name only and never find out.
 *
 * The alternative to the lint is a convention, and a convention that
 * fails quietly is not a convention. **The only honest way to skip BUC
 * is to not compose the mixin** — which is a real and often correct
 * choice (a signpost, a flask, a spellbook). This check makes that the
 * *only* way.
 *
 * ## ⚠ What it deliberately does NOT check
 *
 * **Quality.** `energy: [2, 2, 4]` authors three bands while leaving
 * cursed identical to uncursed, and this passes. That is the same
 * boundary the slate already drew around the monotonic contract: it is
 * a *semantic* invariant, enforced by making the easy path the correct
 * path, not by a checker. The lint stops silence; review stops laziness.
 *
 * It also does not check items that carry no working at all — there is
 * nothing for a band to vary, and such an item should not be
 * `Blessable` for a different reason the lint cannot see.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { packSources, packSrcFiles } from './pack-roots';

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, '..', 'src');
const CONTENT_ROOT = join(here, '..', '..', 'content');
const SEEDS = join(SERVER_SRC, 'mud', 'seeds');
const MUD = join(SERVER_SRC, 'mud');

function walkYaml(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith('.yaml')) out.push(full);
    }
  }
  return out;
}

function walkTs(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith('.ts') && !full.includes('__tests__')) {
        out.push(full);
      }
    }
  }
  return out;
}

function contentYaml(): string[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  return readdirSync(CONTENT_ROOT).flatMap((pack) =>
    walkYaml(join(CONTENT_ROOT, pack, 'content')),
  );
}

/**
 * Classes composing `BlessableMixin`, as `/platform/...` module paths — the
 * shape a template's `class:` names. Read from source rather than a
 * hand-kept list, so composing the mixin is itself the opt-in.
 */
function blessableClasses(): Set<string> {
  const found = new Set<string>();
  for (const file of walkTs(join(MUD, 'platform'))) {
    const src = readFileSync(file, 'utf-8');
    if (!src.includes('BlessableMixin')) continue;
    const rel = file.slice(MUD.length).replace(/\.ts$/, '').replace(/\\/g, '/');
    found.add(rel);
  }
  // A capability pack's classes: `<srcDir>/<rel>.ts` backs `<root>/<rel>`
  // for every namespace root the pack holds.
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      const src = readFileSync(file, 'utf-8');
      if (!src.includes('BlessableMixin')) continue;
      const rel = file.slice(pack.srcDir.length).replace(/\.ts$/, '').replace(/\\/g, '/');
      for (const root of pack.roots) found.add(root + rel);
    }
  }
  return found;
}

/** Every spell template's path → whether it authors band variation. */
function spellsWithBands(): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const file of [...walkYaml(SEEDS), ...contentYaml()]) {
    let doc: Record<string, unknown>;
    try {
      doc = YAML.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
    } catch {
      continue;
    }
    const data = doc?.data as Record<string, unknown> | undefined;
    const spellId = data?.spellId;
    if (typeof spellId !== 'string') continue;
    const effects = data?.effects;
    if (!Array.isArray(effects)) continue;
    // Band variation is either a field authored as an ordered list, or
    // an effect scoped to particular bands.
    const varies = effects.some((e) => {
      if (!e || typeof e !== 'object') return false;
      return Object.entries(e as Record<string, unknown>).some(
        ([k, v]) => k === 'bands' || (Array.isArray(v) && v.length >= 2),
      );
    });
    out.set(`/stuff/idea/magic/Spell/${spellId}`, varies);
  }
  return out;
}

const blessable = blessableClasses();
const spells = spellsWithBands();
const findings: string[] = [];
let checked = 0;

for (const file of [...walkYaml(SEEDS), ...contentYaml()]) {
  let doc: Record<string, unknown>;
  try {
    doc = YAML.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
  } catch {
    continue;
  }
  const cls = doc?.class;
  if (typeof cls !== 'string' || !blessable.has(cls)) continue;
  const data = doc?.data as Record<string, unknown> | undefined;
  const spellPath = data?.carriedSpellPath;
  if (typeof spellPath !== 'string' || spellPath.length === 0) continue;

  checked++;
  const varies = spells.get(spellPath);
  if (varies === undefined) {
    findings.push(
      `${file.slice(SERVER_SRC.length)}: carries '${spellPath}', which no ` +
        `seed defines`,
    );
  } else if (!varies) {
    findings.push(
      `${file.slice(SERVER_SRC.length)}: class '${cls}' composes Blessable, ` +
        `but its working '${spellPath}' authors no band variation — a ` +
        `cursed one would behave exactly like an ordinary one.\n` +
        `      Fix: author a band-varying field on the spell's effects ` +
        `(e.g. \`energy: [1, 2, 4]\`, \`bands: [cursed]\`), or stop ` +
        `composing BlessableMixin on ${cls}.`,
    );
  }
}

if (findings.length > 0) {
  console.error('check-blessed-bands: Blessable items with an inert axis\n');
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error(
    `\n${findings.length} finding(s). Composing BlessableMixin is opting ` +
      `in to the framework; opting in means authoring all three bands.`,
  );
  process.exit(1);
}

console.log(
  `check-blessed-bands: ${checked} Blessable template(s) authored across ` +
    `all bands (${blessable.size} composing class(es)).`,
);
