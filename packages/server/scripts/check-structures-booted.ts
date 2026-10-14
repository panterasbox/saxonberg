/**
 * check-structures-booted — ⭐ **every Structure and every expanse is
 * resident from boot** (maritime R4).
 *
 * The horizon (`PerceptionApi.horizonFor`) is the MQL `horizon` seed's
 * pool, and the resolver is synchronous — so it reads the structures and
 * the seas that are RESIDENT, never a catalogue it would have to await.
 * A Structure is never culled once stood up (`Structure.canEvict`), but
 * something has to stand it up: a tower nothing boots is missing from
 * every horizon it stands on, SILENTLY, until somebody happens to walk
 * into it. The ship already was booted (a craft under way must advance
 * with nobody aboard); this makes the rule the same for the light and the
 * clock tower, and for the sea they stand on.
 *
 * The rule: a row whose effective `class:` is `/platform/idea/Structure`,
 * or whose class's basename ends `Expanse` (a sea frame — the water
 * pack's `WaterExpanse`), must be a `boot:` entry of the pack that ships
 * it. CI-gating; no ceiling — there is no legitimate unbooted structure.
 *
 * Usage: tsx scripts/check-structures-booted.ts
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import { CONTENT, effectiveDoc, inheritanceIndex } from './pack-roots';

const STRUCTURE_CLASS = '/platform/idea/Structure';
/** A Ship is a Structure whose position is a variable (maritime review). */
const SHIP_CLASS = '/platform/idea/Ship';

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (e.endsWith('.yaml')) out.push(full);
  }
  return out;
}

const idx = inheritanceIndex();
const findings: string[] = [];
let checked = 0;
const packs = readdirSync(CONTENT).filter((p) => existsSync(join(CONTENT, p, 'pack.yaml')));

for (const pack of packs) {
  const manifest = YAML.parse(readFileSync(join(CONTENT, pack, 'pack.yaml'), 'utf8')) as {
    boot?: Array<{ template?: string }>;
  };
  const booted = new Set((manifest.boot ?? []).map((b) => b.template ?? ''));
  const contentDir = join(CONTENT, pack, 'content');
  for (const file of walk(contentDir)) {
    let doc: Record<string, unknown>;
    try {
      doc = effectiveDoc(
        file,
        (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>,
        idx,
      ) as Record<string, unknown>;
    } catch {
      continue; // a malformed row is another gate's finding
    }
    const cls = String(doc.class ?? '');
    const isStructure = cls === STRUCTURE_CLASS || cls === SHIP_CLASS;
    const isExpanse = /\/[A-Za-z]*Expanse$/.test(cls);
    if (!isStructure && !isExpanse) continue;
    checked++;
    const path = `/${relative(contentDir, file).replace(/\.yaml$/, '')}`;
    if (!booted.has(path)) {
      findings.push(
        `${relative(join(CONTENT, '..', '..'), file)}: '${path}' (${isStructure ? 'a Structure' : 'an expanse'}) ` +
          `is not a \`boot:\` entry of pack '${pack}' — the horizon reads it resident, so unbooted it is ` +
          `missing from every horizon, silently.`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error(`✖ lint:structures — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✔ lint:structures — ${checked} structure/expanse row(s), every one booted by its pack.`);
