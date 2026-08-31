/**
 * check-schema-docs — the gate that makes the collection ↔ doc ↔ class ↔
 * subsystem-doc link REAL.
 *
 * A collection's name, its sandbox policy, its reset disposition and its
 * indexes used to live in four TypeScript files, and what the collection
 * was FOR lived almost nowhere. The schema docs put all of that in one
 * authored place; this is what stops the four legs from drifting apart
 * again.
 *
 * Six assertions (requirements D6):
 *
 *   1. Every doc names a collection and every collection has exactly one
 *      doc. Neither set has an extra.
 *   2. Regenerating produces byte-identical `Collections.ts`,
 *      `CollectionPolicy.ts` and `ResetPolicy.ts`.
 *   3. Every `static collectionName` outside `__tests__` is
 *      `Collections.X`, never a string literal.
 *   4. Every doc's `owner` names a real `Document` subclass whose
 *      `collectionName` is that collection, and its `ownerModule` names
 *      exactly the file that class is declared in — so the path the help
 *      projector resolves cannot drift when a class moves. `owner: none`
 *      is legal and means *nothing but `PersistApi` writes here*, which
 *      must then be true.
 *   5. Every doc's `subsystem` resolves to a real file under
 *      `docs/subsystems/`.
 *   6. Every doc has a non-empty `summary` and `purpose`.
 *
 * **No exemption list, by design.** Test-fixture classes are exempt from
 * (3) by living under `__tests__` — they name collections that are not in
 * the vocabulary and must not be — and that is the only carve-out.
 *
 * ⚠ Resolution for (3) and (4) is AST-based and **file-scoped**: the
 * class → collection mapping is built per file from that file's own
 * declarations. The `lint:topics` lesson is specific — an earlier
 * revision of that gate resolved names against one tree-wide table and
 * silently matched an unrelated file's declaration, so it passed while
 * two emitters kept firing retired keys. A name-based resolver must
 * prefer the local declaration or it manufactures exactly the quiet
 * wrongness it exists to catch.
 *
 * Usage:
 *   pnpm lint:schema                       # CI gate
 *   tsx scripts/check-schema-docs.ts       # full report
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative, sep } from 'path';
import ts from 'typescript';
import YAML from 'yaml';
import { SchemaDoc } from '../src/mud/lib/persistence/SchemaDoc';
import { Collections } from '../src/mud/lib/persistence/Collections';
import {
  loadDocs,
  emitCollections,
  emitPolicy,
  emitReset,
} from './gen-schema';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, '..');
const repoRoot = join(serverRoot, '..', '..');
const srcRoot = join(serverRoot, 'src');
const schemaDir = join(srcRoot, 'schema');
const persistenceDir = join(srcRoot, 'mud', 'lib', 'persistence');
const subsystemsDir = join(repoRoot, 'docs', 'subsystems');

export interface Finding {
  assertion: string;
  detail: string;
}

/**
 * Where the four legs live. Overridable so the gate's own tests can point
 * it at a fixture tree — a gate with no failing fixture is a gate nobody
 * has proved.
 */
export interface AuditRoots {
  schemaDir: string;
  srcRoot: string;
  persistenceDir: string;
  subsystemsDir: string;
  /** For the `--check` half: skip regeneration when pointed at a fixture. */
  checkGenerated?: boolean;
}

const DEFAULT_ROOTS: AuditRoots = {
  schemaDir,
  srcRoot,
  persistenceDir,
  subsystemsDir,
  checkGenerated: true,
};

// ── Source scan: one pass, file-scoped ────────────────────────────────

/** A `static collectionName = …` as it was actually written. */
export interface CollectionNameSite {
  file: string;
  className: string;
  /** The enum member, when written as `Collections.X`. */
  member: string | null;
  /** The source text of the initializer, for the failure message. */
  source: string;
}

function walk(dir: string, out: string[]): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(path, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Every `static collectionName` declaration outside `__tests__`, with how
 * it was written. File-scoped: nothing here consults another file.
 */
export function collectionNameSites(files: string[]): CollectionNameSite[] {
  const sites: CollectionNameSite[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    if (!text.includes('static collectionName')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        for (const member of node.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          if (member.name.getText(sf) !== 'collectionName') continue;
          if (
            !member.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.StaticKeyword
            )
          ) {
            continue;
          }
          const init = member.initializer;
          if (!init) continue; // the abstract declaration on `Document`
          const isEnumAccess =
            ts.isPropertyAccessExpression(init) &&
            init.expression.getText(sf) === 'Collections';
          sites.push({
            file,
            className: node.name!.text,
            member: isEnumAccess
              ? (init as ts.PropertyAccessExpression).name.text
              : null,
            source: init.getText(sf),
          });
        }
      }
      node.forEachChild(visit);
    };
    visit(sf);
  }
  return sites;
}

/** `Collections.BankLedger` → `bank_ledger`. */
function valueOfMember(member: string): string | null {
  const table = Collections as unknown as Record<string, string>;
  return table[member] ?? null;
}

// ── The six assertions ────────────────────────────────────────────────

export function audit(roots: AuditRoots = DEFAULT_ROOTS): Finding[] {
  const { schemaDir, srcRoot, persistenceDir, subsystemsDir } = roots;
  const findings: Finding[] = [];
  const add = (assertion: string, detail: string): void => {
    findings.push({ assertion, detail });
  };

  // (1) Set equivalence, both directions.
  const files = readdirSync(schemaDir).filter((f) => f.endsWith('.yaml'));
  const docs: SchemaDoc[] = [];
  for (const file of files.sort()) {
    const raw = YAML.parse(readFileSync(join(schemaDir, file), 'utf-8'));
    let doc: SchemaDoc;
    try {
      doc = SchemaDoc.parse(raw, file);
    } catch (error) {
      add('1 · one doc per collection', (error as Error).message);
      continue;
    }
    if (doc.collection !== file.replace(/\.yaml$/, '')) {
      add(
        '1 · one doc per collection',
        `${file} declares collection '${doc.collection}' — the filename ` +
          `must be the collection name`
      );
    }
    docs.push(doc);
  }
  const described = new Set(docs.map((d) => d.collection));
  const known = new Set<string>(Object.values(Collections));
  for (const collection of [...known].sort()) {
    if (!described.has(collection)) {
      add(
        '1 · one doc per collection',
        `${collection} has no schema doc — write src/schema/${collection}.yaml`
      );
    }
  }
  for (const collection of [...described].sort()) {
    if (!known.has(collection)) {
      add(
        '1 · one doc per collection',
        `src/schema/${collection}.yaml names no collection in the ` +
          `vocabulary — run \`pnpm gen:schema\``
      );
    }
  }

  // (2) The generated tables are current.
  if (roots.checkGenerated === false) {
    // A fixture tree has no generated files to compare against.
  } else if (findings.length === 0) {
    const generated = loadDocs();
    const emitted: Array<[string, string]> = [
      ['Collections.ts', emitCollections(generated)],
      ['CollectionPolicy.ts', emitPolicy(generated)],
      ['ResetPolicy.ts', emitReset(generated)],
    ];
    for (const [name, content] of emitted) {
      const path = join(persistenceDir, name);
      const current = existsSync(path) ? readFileSync(path, 'utf-8') : '';
      if (current !== content) {
        add(
          '2 · the generated tables are current',
          `${name} is out of date with src/schema/ — run \`pnpm gen:schema\``
        );
      }
    }
  } else {
    add(
      '2 · the generated tables are current',
      'skipped — the docs do not parse, so regeneration would be meaningless'
    );
  }

  // (3) + (4) The class link, over one file-scoped source scan.
  const sites = collectionNameSites(walk(srcRoot, []));
  const ownerOf = new Map<string, CollectionNameSite[]>();
  for (const site of sites) {
    if (site.member === null) {
      add(
        '3 · collectionName is always Collections.X',
        `${relative(serverRoot, site.file)}: ${site.className}.collectionName ` +
          `= ${site.source} — name the enum member, not the string. A bare ` +
          `literal is a collection the vocabulary cannot see.`
      );
      continue;
    }
    const value = valueOfMember(site.member);
    if (value === null) {
      add(
        '3 · collectionName is always Collections.X',
        `${relative(serverRoot, site.file)}: ${site.className}.collectionName ` +
          `= Collections.${site.member}, which is not a member of the enum`
      );
      continue;
    }
    if (!ownerOf.has(value)) ownerOf.set(value, []);
    ownerOf.get(value)!.push(site);
  }

  for (const doc of docs) {
    const writers = ownerOf.get(doc.collection) ?? [];
    if (doc.owner === null) {
      // `owner: none` asserts that nothing but PersistApi writes here.
      if (writers.length > 0) {
        add(
          '4 · owner names the class that writes here',
          `${doc.collection}.yaml says \`owner: none\`, but ` +
            `${writers.map((w) => w.className).join(', ')} declares ` +
            `\`collectionName = Collections.${writers[0]!.member}\``
        );
      }
      continue;
    }
    const match = writers.find((w) => w.className === doc.owner);
    if (!match) {
      const named = writers.map((w) => w.className).join(', ') || 'nothing';
      add(
        '4 · owner names the class that writes here',
        `${doc.collection}.yaml names owner \`${doc.owner}\`, but the class ` +
          `whose collectionName is ${doc.collection} is ${named}`
      );
      continue;
    }
    // The module path the help projector resolves, checked against the
    // file the class is actually declared in.
    const actual =
      '/' +
      relative(join(srcRoot, 'mud'), match.file)
        .replace(/\.ts$/, '')
        .split(sep)
        .join('/');
    if (doc.ownerModule !== actual) {
      add(
        '4 · owner names the class that writes here',
        `${doc.collection}.yaml says \`ownerModule: ${doc.ownerModule}\`, ` +
          `but ${doc.owner} is declared in ${actual}`
      );
    }
  }

  // (5) The subsystem doc exists.
  for (const doc of docs) {
    if (!existsSync(join(subsystemsDir, doc.subsystem))) {
      add(
        '5 · subsystem resolves to a real doc',
        `${doc.collection}.yaml names \`${doc.subsystem}\`, which is not a ` +
          `file under docs/subsystems/`
      );
    }
  }

  // (6) Non-empty summary + purpose. `SchemaDoc.parse` already refuses an
  //     empty one, so this catches the placeholder that parses.
  for (const doc of docs) {
    for (const [field, value] of [
      ['summary', doc.summary],
      ['purpose', doc.purpose],
    ] as const) {
      if (/^TODO\b/i.test(value) || value.trim().length < 10) {
        add(
          '6 · every doc says what the collection is',
          `${doc.collection}.yaml has a placeholder \`${field}\``
        );
      }
    }
  }

  return findings;
}

// ── Report ────────────────────────────────────────────────────────────

function main(): void {
  const findings = audit();
  const docCount = readdirSync(schemaDir).filter((f) =>
    f.endsWith('.yaml')
  ).length;

  if (findings.length === 0) {
    console.log(
      `check-schema-docs: ok — ${docCount} collections, each with a doc, ` +
        `an owner, a subsystem and current generated tables.`
    );
    process.exit(0);
  }

  console.error(
    `check-schema-docs: ${findings.length} problem(s) — the collection ↔ ` +
      `doc ↔ class ↔ subsystem link is broken:`
  );
  let lastAssertion = '';
  for (const finding of findings) {
    if (finding.assertion !== lastAssertion) {
      console.error(`\n  ${finding.assertion}`);
      lastAssertion = finding.assertion;
    }
    console.error(`    ✗ ${finding.detail}`);
  }
  process.exit(1);
}

if (process.argv[1]?.includes('check-schema-docs')) main();
