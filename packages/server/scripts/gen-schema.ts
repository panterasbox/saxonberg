/**
 * gen-schema — the schema docs, projected into TypeScript.
 *
 * Reads `src/schema/*.yaml` (sorted by filename, which is what makes the
 * emit deterministic) and writes three files that are **never** edited by
 * hand:
 *
 *   - `src/mud/lib/persistence/Collections.ts`       — the vocabulary
 *   - `src/mud/lib/persistence/CollectionPolicy.ts`  — COLLECTION_POLICIES
 *   - `src/mud/lib/persistence/ResetPolicy.ts`       — RESET_DISPOSITIONS
 *
 * ## Why generate rather than parse at runtime
 *
 * `Collections` is the one piece used in TYPE position —
 * `Record<Collections, …>`, `PersistApi.find(Collections.X, …)` across
 * ~50 files. Parsing the vocabulary at boot would trade a whole class of
 * compile-time error for a boot-time one. Generating keeps both: one
 * authored source, and a typo is still a build failure.
 *
 * It is the lint-family pattern applied to DATA — author it, derive the
 * checkable form, and gate that the two agree (`pnpm lint:schema`).
 *
 * ## Where the prose in the emitted files comes from
 *
 * The module-level TSDoc of each generated file is a template constant
 * below. ⚠ That is the one place it can be edited: editing the emitted
 * `.ts` is undone by the next `pnpm gen:schema`, and `lint:schema` will
 * fail before anyone notices. Everything BELOW the module comment —
 * every enum member, every table row, every `because` — comes from the
 * schema docs and is edited there.
 *
 * Usage:
 *   pnpm gen:schema            # write the three files
 *   pnpm gen:schema --check    # exit non-zero if they would change
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { SchemaDoc } from '../src/mud/lib/persistence/SchemaDoc';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '..', 'src');
const schemaDir = join(srcRoot, 'schema');
const outDir = join(srcRoot, 'mud', 'lib', 'persistence');

const BANNER = `/*
 * ⚠ GENERATED FILE — DO NOT EDIT.
 *
 * Emitted by \`pnpm gen:schema\` from the authored schema docs in
 * \`packages/server/src/schema/\`. Edit the YAML doc for the collection
 * you mean, then re-run the generator; \`pnpm lint:schema\` fails if this
 * file and the docs disagree.
 */`;

// ── The module prose of each emitted file. THIS is the editable copy. ──

const COLLECTIONS_DOC = `/**
 * Collections — the MongoDB collection-name vocabulary.
 *
 * The one concept this module defines: the closed set of collection names
 * the world persists into. It is *vocabulary*, not mechanism — no driver,
 * no connection, no I/O — which is why it lives in the mudlib rather than
 * in \`backend/\`: mudlib records name their own collection
 * (\`static collectionName = Collections.BankLedger\`), and under the import
 * boundary (docs/architecture.md § The import boundary) a mudlib module
 * may not reach into \`backend/\` to learn its own name.
 *
 * \`backend/PersistenceManager\` imports this and re-exports it, so the
 * driver side keeps one import site for the surface it speaks.
 *
 * Each member carries its collection's one-line summary. The full
 * description — purpose, invariants, indexes and both policies — is the
 * authored doc at \`src/schema/<collection>.yaml\`, and is readable in
 * game as \`help <collection>\`.
 */`;

const POLICY_DOC = `/**
 * CollectionPolicy — what a sandboxed write does to each collection.
 *
 * The one concept this module defines: the **total** per-collection
 * sandbox write disposition. Totality is the design —
 * \`Record<Collections, …>\` makes a new collection without a policy a
 * COMPILE error, so the sandbox fails closed at build time rather than at
 * an audit.
 *
 * It lives in the mudlib beside {@link Collections} for the same reason
 * that enum does: it is vocabulary, not mechanism. \`backend/
 * PersistenceManager\` imports and re-exports it, so the driver side keeps
 * one import site for the surface it speaks.
 *
 * ⚠ The REASON a collection carries the verb it does is in that
 * collection's schema doc, under \`invariants\`. This table is the
 * machine-readable half; the argument is the authored half, and putting
 * them in one place is what this build was for. Verified writer-by-writer
 * in docs/subsystems/sandbox.md.
 */`;

const RESET_DOC = `/**
 * ResetPolicy — what survives the night.
 *
 * The one concept this module defines: a **total** disposition for every
 * collection the world persists into, consulted by the nightly reset job.
 * Totality is the whole design: \`Record<Collections, …>\` makes a new
 * collection without a decision a COMPILE error, exactly as
 * \`COLLECTION_POLICIES\` does for the sandbox. A destructive job whose
 * coverage is a hand-maintained list is a job that quietly stops covering
 * things.
 *
 * ## ⚠⚠ The survivors list is short on purpose
 *
 * Decided by the user, 2026-08-14: the reset removes all **player state**
 * except \`documents\` rows carrying a declared kind — the press releases
 * the front door's press room displays, and the pack-installed world
 * content beside them. Accounts included.
 *
 * ## ⚠ Seeded world content is not player state
 *
 * The seeder and the content-pack installer are **insert-only and run at
 * boot**. The job does not restart the process, so anything they populate
 * is \`keep\`: wiping it would empty the world until somebody rebooted, and
 * *a wipe that empties the world is a wipe that broke the game*. This is
 * the one place "wipe everything", read literally, is wrong — which is
 * why every \`keep\` states its reason, now in its collection's schema doc
 * and repeated here as the \`because\` the job itself carries.
 *
 * ⚠ The knowing cost: CMS-authored templates live in \`content\` beside
 * the seeds and therefore survive too. There is no discriminator that
 * separates them (\`sourcePack\` marks pack rows, not authored ones), and
 * the alternative — an empty world every morning — is worse. Recorded so
 * it is a decision rather than a surprise.
 */`;

/**
 * The `wipe-except` keep filters that are DERIVED rather than authored.
 * One entry today. The doc names the derivation; this is what it means.
 */
const KEEP_DERIVATIONS: Record<
  string,
  { imports: string[]; expression: string }
> = {
  'declared-document-kinds': {
    imports: [
      "import { RELEASE_DOCUMENT_KIND } from '../press/Release';",
      "import { DECLARED_DOCUMENT_KINDS } from '../document/DocumentKinds';",
    ],
    expression:
      'kind: { $in: [RELEASE_DOCUMENT_KIND, ...DECLARED_DOCUMENT_KINDS] },',
  },
};

// ── Read ──────────────────────────────────────────────────────────────

export function loadDocs(): SchemaDoc[] {
  const files = readdirSync(schemaDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  return files.map((file) => {
    const raw = YAML.parse(readFileSync(join(schemaDir, file), 'utf-8'));
    const doc = SchemaDoc.parse(raw, file);
    const stem = file.replace(/\.yaml$/, '');
    if (doc.collection !== stem) {
      throw new Error(
        `gen-schema: ${file} declares collection '${doc.collection}' — the ` +
          `filename must be the collection name`
      );
    }
    return doc;
  });
}

// ── Emit ──────────────────────────────────────────────────────────────

/** Wrap a summary into a one-or-more-line TSDoc block at `indent`. */
function tsdoc(text: string, indent: string): string {
  const width = 76 - indent.length;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line.length === 0 ? word : `${line} ${word}`;
    }
  }
  if (line.length > 0) lines.push(line);
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return (
    `${indent}/**\n` +
    lines.map((l) => `${indent} * ${l}`).join('\n') +
    `\n${indent} */\n`
  );
}

export function emitCollections(docs: SchemaDoc[]): string {
  let out = `${BANNER}\n\n${COLLECTIONS_DOC}\n\nexport enum Collections {\n`;
  for (const doc of docs) {
    out += tsdoc(doc.summary, '  ');
    out += `  ${SchemaDoc.enumKey(doc.collection)} = '${doc.collection}',\n`;
  }
  out += '}\n';
  return out;
}

export function emitPolicy(docs: SchemaDoc[]): string {
  let out = `${BANNER}\n\n${POLICY_DOC}\n\n`;
  out += "import { Collections } from './Collections';\n\n";
  out += `/**
 * Per-collection sandbox write disposition (docs/subsystems/sandbox.md):
 *
 *   - \`stamp\`  — the write proceeds with \`circleScope\` stamped on the row;
 *     field reads exclude stamped rows; exit discards them. The material
 *     ledgers: the game genuinely runs in-circle, then reverts.
 *   - \`refuse\` — circle context may not write here at all (field-real
 *     registries, identity, title, config). Throws.
 *   - \`pass\`   — the write is identity-real and persists (authored truth,
 *     the epistemic ledgers). \`mark: true\` additionally records the scope
 *     on the row (the epistemic wire mark) without ever filtering reads.
 *   - \`shadow\` — rebuildable caches. \`mode: 'skip'\` silently skips the
 *     terminal write from circle context (readers derive live from their
 *     event ledgers in-circle). \`mode: 'overlay'\` is specified as the
 *     labeled attach point but not built — no collection needs it today.
 */
export type CollectionPolicy =
  | { verb: 'stamp' }
  | { verb: 'refuse' }
  | { verb: 'pass'; mark?: boolean }
  | { verb: 'shadow'; mode: 'skip' | 'overlay' };

/**
 * The total table. One row per collection, from its schema doc's
 * \`sandbox:\` field.
 */
export const COLLECTION_POLICIES: Readonly<
  Record<Collections, CollectionPolicy>
> = {\n`;
  for (const doc of docs) {
    const key = `[Collections.${SchemaDoc.enumKey(doc.collection)}]`;
    const p = doc.sandbox;
    let value: string;
    if (p.verb === 'pass') {
      value = p.mark ? "{ verb: 'pass', mark: true }" : "{ verb: 'pass' }";
    } else if (p.verb === 'shadow') {
      value = `{ verb: 'shadow', mode: '${p.mode}' }`;
    } else {
      value = `{ verb: '${p.verb}' }`;
    }
    out += `  ${key}: ${value},\n`;
  }
  out += '};\n';
  return out;
}

/**
 * A `because` as the right-hand side of `because:` — a leading space for a
 * one-liner, a newline for a wrapped concatenation. Emitted this way so
 * the generated file has no trailing whitespace to trip the formatter.
 */
function resetBecause(text: string): string {
  const value = literal(text, '      ');
  return value.startsWith('\n') ? value : ` ${value}`;
}

/** A `because` string as a TS string literal, wrapped and concatenated. */
function literal(text: string, indent: string): string {
  const width = 72 - indent.length;
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > width) {
      chunks.push(`${line} `);
      line = word;
    } else {
      line = line.length === 0 ? word : `${line} ${word}`;
    }
  }
  if (line.length > 0) chunks.push(line);
  const quoted = chunks.map((c) => `'${c.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
  if (quoted.length === 1) return quoted[0]!;
  return `\n${indent}` + quoted.join(` +\n${indent}`);
}

export function emitReset(docs: SchemaDoc[]): string {
  const derivations = new Set(
    docs
      .map((d) => (d.reset.verb === 'wipe-except' ? d.reset.keep : null))
      .filter((k): k is string => k !== null)
  );
  const imports = ["import { Collections } from './Collections';"];
  for (const name of [...derivations].sort()) {
    const derivation = KEEP_DERIVATIONS[name];
    if (!derivation) {
      throw new Error(`gen-schema: unknown reset keep derivation '${name}'`);
    }
    imports.push(...derivation.imports);
  }

  let out = `${BANNER}\n\n${RESET_DOC}\n\n${imports.join('\n')}\n\n`;
  out += `/**
 * What the reset does to one collection.
 *
 * \`because\` is required on anything that is not a plain wipe. A survivor
 * without a stated reason is how a survivors list grows.
 */
export type ResetDisposition =
  | { readonly verb: 'wipe' }
  | { readonly verb: 'keep'; readonly because: string }
  | {
      readonly verb: 'wipe-except';
      /** The rows that survive, as a Mongo equality filter. */
      readonly keep: Readonly<Record<string, unknown>>;
      readonly because: string;
    };

/**
 * The total table. Every collection, every night — from each schema doc's
 * \`reset:\` field.
 */
export const RESET_DISPOSITIONS: Readonly<
  Record<Collections, ResetDisposition>
> = {\n`;
  for (const doc of docs) {
    const key = `[Collections.${SchemaDoc.enumKey(doc.collection)}]`;
    const reset = doc.reset;
    if (reset.verb === 'wipe') {
      out += `  ${key}: { verb: 'wipe' },\n`;
      continue;
    }
    if (reset.verb === 'keep') {
      out += `  ${key}: {\n    verb: 'keep',\n`;
      out += `    because:${resetBecause(reset.because)},\n  },\n`;
      continue;
    }
    const derivation = KEEP_DERIVATIONS[reset.keep]!;
    out += `  ${key}: {\n    verb: 'wipe-except',\n`;
    out += `    keep: {\n      ${derivation.expression}\n    },\n`;
    out += `    because:${resetBecause(reset.because)},\n  },\n`;
  }
  out += '};\n';
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────

function main(): void {
  const check = process.argv.includes('--check');
  const docs = loadDocs();
  const files: Array<[string, string]> = [
    ['Collections.ts', emitCollections(docs)],
    ['CollectionPolicy.ts', emitPolicy(docs)],
    ['ResetPolicy.ts', emitReset(docs)],
  ];

  let stale = 0;
  for (const [name, content] of files) {
    const path = join(outDir, name);
    let current: string | null = null;
    try {
      current = readFileSync(path, 'utf-8');
    } catch {
      current = null;
    }
    if (current === content) continue;
    stale += 1;
    if (check) {
      console.error(
        `gen-schema: ${name} is out of date with src/schema/ — run \`pnpm gen:schema\``
      );
    } else {
      writeFileSync(path, content, 'utf-8');
      console.info(`gen-schema: wrote ${name}`);
    }
  }

  if (check) {
    if (stale > 0) process.exitCode = 1;
    else console.info(`gen-schema: ok — ${docs.length} docs, 3 files current`);
  } else if (stale === 0) {
    console.info(`gen-schema: ok — ${docs.length} docs, nothing to write`);
  }
}

if (process.argv[1]?.includes('gen-schema')) main();
