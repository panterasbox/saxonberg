/**
 * check-toxin-keys — ⭐⭐ **a dose names the condition it causes by the
 * condition row's FILE LEAF** (water-supply D9).
 *
 * `Metabolic.resolveToxinBehavior(type)` resolves
 * `/platform/idea/Condition/metabolism/<type>` — the dose tag IS the row's
 * leaf; the row's `name:` is display. An unknown tag is a silent no-op: the
 * dose is carried, drunk, and causes nothing. Two shipped producers proved
 * it — five rows dosed `lead-poisoning` (the lead row's display NAME; its
 * leaf is `lead`), and fouled river water dosed `dysentery`, a row that did
 * not exist, so a town drinking below its own outfall was never ill and a
 * lead glaze never poisoned anybody.
 *
 * Every `toxicity[].type` and `leaches[].toxin` in content must resolve to
 * a `Condition/metabolism/<leaf>` or `Condition/pathogen/<leaf>` row in some
 * pack. A ratchet at zero from the day it landed — and it found a third:
 * sea water dosed `salt`, whose row's leaf is `salt-poisoning`, so drinking
 * the sea did nothing.
 *
 * ⚠ A `toxicity` entry of `amount: 0` is a PROPERTY marker on an element
 * row (iron, copper, uranium), not a dose: it is never drunk into anybody,
 * so it is not counted. Authoring those conditions is a pharmacology
 * build's, not this gate's.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

export const TOXIN_KEYS_CEILING = 0;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.yaml')) out.push(full);
  }
}

/** Every content yaml across every pack's `content/` tree. */
function contentFiles(): string[] {
  const out: string[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content');
    if (existsSync(dir)) walk(dir, out);
  }
  return out;
}

const CONDITION_ROW = /\/idea\/Condition\/(metabolism|pathogen)\/[^/]+\.yaml$/;

function main(): void {
  const files = contentFiles();
  const leaves = new Set<string>();
  for (const f of files) {
    if (CONDITION_ROW.test(f.replace(/\\/g, '/'))) leaves.add(basename(f, '.yaml'));
  }
  const findings: string[] = [];
  for (const f of files) {
    let doc: unknown;
    try {
      doc = YAML.parse(readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    const data = (doc as { data?: Record<string, unknown> } | null)?.data;
    if (!data) continue;
    const rel = relative(REPO_ROOT, f);
    for (const t of Array.isArray(data.toxicity) ? data.toxicity : []) {
      const type = (t as { type?: unknown })?.type;
      const amount = Number((t as { amount?: unknown })?.amount ?? 0);
      if (!(amount > 0)) continue;
      if (typeof type === 'string' && !leaves.has(type)) {
        findings.push(`${rel}: toxicity type '${type}' names no Condition row`);
      }
    }
    for (const l of Array.isArray(data.leaches) ? data.leaches : []) {
      const toxin = (l as { toxin?: unknown })?.toxin;
      if (typeof toxin === 'string' && !leaves.has(toxin)) {
        findings.push(`${rel}: leaches toxin '${toxin}' names no Condition row`);
      }
    }
  }
  const n = findings.length;
  // eslint-disable-next-line no-console -- the gate's own report
  console.log(`check-toxin-keys: ${n} dose tag(s) name no condition (ceiling ${TOXIN_KEYS_CEILING}).`);
  if (n > TOXIN_KEYS_CEILING) {
    for (const x of findings) console.error(`  ✗ ${x}`);
    console.error(
      `check-toxin-keys: FAIL — a dose tag is the Condition row's FILE LEAF ` +
        `(Condition/metabolism/<leaf>.yaml), not its display name. An unknown ` +
        `tag is carried, drunk, and causes nothing.`,
    );
    process.exit(1);
  }
}

main();
