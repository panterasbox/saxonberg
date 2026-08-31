/**
 * bootstrap-schema-docs — ONE-SHOT. Deleted at the end of Phase 1.
 *
 * Emits `src/schema/<collection>.yaml` for every collection, carrying the
 * MECHANICAL truth lifted out of today's tables:
 *
 *   - the sandbox policy   (`CollectionPolicy.COLLECTION_POLICIES`)
 *   - the reset disposition (`ResetPolicy.RESET_DISPOSITIONS`, `because`
 *     strings verbatim)
 *   - the owning `Document` class (`static collectionName` across the tree)
 *   - every static index in `PersistenceManager.createIndexes()`, parsed
 *     out by AST with its leading comment as the seed for `why`
 *
 * The prose (`summary`, `purpose`, `invariants`, and each index's real
 * `why`) is then written BY HAND into the emitted files. That split is
 * the point: the machine-readable half is COPIED, not retyped, so the
 * equivalence proof in Phase 2 can only fail on something a human wrote.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import ts from 'typescript';
import { Collections } from '../src/mud/lib/persistence/Collections';
import { COLLECTION_POLICIES } from '../src/mud/lib/persistence/CollectionPolicy';
import { RESET_DISPOSITIONS } from '../src/mud/lib/persistence/ResetPolicy';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, '..');
const srcRoot = join(serverRoot, 'src');
const outDir = join(srcRoot, 'schema');

// ── The owning subsystem doc, by collection. Hand-mapped once; the gate
//    (Phase 4) keeps it honest thereafter. ──────────────────────────────
const SUBSYSTEM: Record<string, string> = {
  users: 'connection.md',
  google_profiles: 'connection.md',
  twitch_profiles: 'connection.md',
  kick_profiles: 'streaming.md',
  content: 'templates.md',
  pack_installs: 'content-packs.md',
  descriptor_banks: 'magic-items.md',
  groups: 'grouping.md',
  channels: 'chat.md',
  parties: 'party.md',
  beliefs: 'belief.md',
  chronicles: 'chronicle.md',
  transcripts: 'advancement.md',
  disposition_events: 'trait.md',
  forum_subjects: 'forums.md',
  forum_boards: 'forums.md',
  forum_entries: 'forums.md',
  forum_votes: 'forums.md',
  forum_events: 'forums.md',
  renown_events: 'renown.md',
  renown: 'renown.md',
  participation_events: 'participation.md',
  participation: 'participation.md',
  producer_events: 'influence.md',
  producer: 'influence.md',
  authoring_events: 'provenance.md',
  positions: 'influence.md',
  blueprints: 'studio.md',
  documents: 'document-store.md',
  bank_ledger: 'banking.md',
  bank_accounts: 'banking.md',
  bank_supply: 'banking.md',
  parcels: 'parcel.md',
  parcel_events: 'parcel.md',
  diagnostics: 'diagnostics.md',
  holder_snapshots: 'persistence.md',
  accountability_events: 'accountability.md',
  contracts: 'contract.md',
  contract_events: 'contract.md',
  chattel: 'chattel.md',
  chattel_events: 'chattel.md',
  app_settings: 'app-settings.md',
  world_state: 'time.md',
  media_assets: 'media.md',
  office_holders: 'governance.md',
  wiki: 'wiki.md',
  wiki_revisions: 'wiki.md',
  player_frames: 'record-layer.md',
};

// ── Owner classes: every `static collectionName` outside __tests__ ─────

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, out);
    } else if (name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function ownerClasses(): Map<string, string> {
  const byCollection = new Map<string, string>();
  const enumValue = new Map<string, string>();
  for (const [key, value] of Object.entries(Collections)) {
    enumValue.set(key, value as string);
  }
  for (const file of walk(srcRoot, [])) {
    const text = readFileSync(file, 'utf-8');
    if (!text.includes('static collectionName')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
    // File-scoped `const X = 'literal'` for the indirection case.
    const locals = new Map<string, string>();
    sf.forEachChild((node) => {
      if (!ts.isVariableStatement(node)) return;
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isStringLiteralLike(decl.initializer)
        ) {
          locals.set(decl.name.text, decl.initializer.text);
        }
      }
    });
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
          if (!init) continue;
          let value: string | undefined;
          if (ts.isStringLiteralLike(init)) value = init.text;
          else if (ts.isIdentifier(init)) value = locals.get(init.text);
          else if (
            ts.isPropertyAccessExpression(init) &&
            init.expression.getText(sf) === 'Collections'
          ) {
            value = enumValue.get(init.name.text);
          }
          if (value) byCollection.set(value, node.name.text);
        }
      }
      node.forEachChild(visit);
    };
    visit(sf);
  }
  return byCollection;
}

// ── The static indexes, parsed out of createIndexes() ──────────────────

interface Extracted {
  collection: string;
  keys: Record<string, unknown>;
  options: Record<string, unknown>;
  text: boolean;
  comment: string;
}

function literal(node: ts.Node, sf: ts.SourceFile): unknown {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.MinusToken) {
      return -(literal(node.operand, sf) as number);
    }
  }
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isStringLiteralLike(prop.name)
        ? prop.name.text
        : prop.name.getText(sf);
      out[key] = literal(prop.initializer, sf);
    }
    return out;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((e) => literal(e, sf));
  }
  throw new Error(`bootstrap: unsupported literal \`${node.getText(sf)}\``);
}

function leadingComment(node: ts.Node, text: string): string {
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const lines: string[] = [];
  for (const range of ranges) {
    const raw = text.slice(range.pos, range.end);
    for (const line of raw.split('\n')) {
      lines.push(line.replace(/^\s*(\/\/|\/\*\*?|\*\/|\*)\s?/, '').trimEnd());
    }
  }
  return lines.join('\n').trim();
}

function extractIndexes(): Extracted[] {
  const file = join(srcRoot, 'backend', 'PersistenceManager.ts');
  const text = readFileSync(file, 'utf-8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const enumValue = new Map<string, string>();
  for (const [key, value] of Object.entries(Collections)) {
    enumValue.set(key, value as string);
  }
  const resolveCollection = (node: ts.Node): string | null => {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(sf) === 'Collections'
    ) {
      return enumValue.get(node.name.text) ?? null;
    }
    return null;
  };

  let body: ts.Block | undefined;
  const findBody = (node: ts.Node): void => {
    if (
      ts.isMethodDeclaration(node) &&
      node.name.getText(sf) === 'createIndexes'
    ) {
      body = node.body;
    }
    node.forEachChild(findBody);
  };
  findBody(sf);
  if (!body) throw new Error('bootstrap: createIndexes() not found');

  const out: Extracted[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // this.getCollection(X).createIndex(spec, opts?)
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'createIndex' &&
        ts.isCallExpression(callee.expression) &&
        ts.isPropertyAccessExpression(callee.expression.expression) &&
        callee.expression.expression.name.text === 'getCollection'
      ) {
        const arg = callee.expression.arguments[0];
        const collection = arg ? resolveCollection(arg) : null;
        if (collection) {
          const statement = enclosingStatement(node);
          out.push({
            collection,
            keys: literal(node.arguments[0]!, sf) as Record<string, unknown>,
            options: node.arguments[1]
              ? (literal(node.arguments[1], sf) as Record<string, unknown>)
              : {},
            text: false,
            comment: statement ? leadingComment(statement, text) : '',
          });
        }
      }
      // this.ensureTextIndex(X, spec)
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'ensureTextIndex'
      ) {
        const collection = resolveCollection(node.arguments[0]!);
        if (collection) {
          const statement = enclosingStatement(node);
          out.push({
            collection,
            keys: literal(node.arguments[1]!, sf) as Record<string, unknown>,
            options: {},
            text: true,
            comment: statement ? leadingComment(statement, text) : '',
          });
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(body);
  return out;
}

function enclosingStatement(node: ts.Node): ts.Node | null {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current)) current = current.parent;
  return current ?? null;
}

// ── Emit ──────────────────────────────────────────────────────────────

function yamlFlowMap(value: Record<string, unknown>): string {
  const parts = Object.entries(value).map(
    ([k, v]) => `${/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `"${k}"`}: ${JSON.stringify(v)}`
  );
  return `{ ${parts.join(', ')} }`;
}

function block(field: string, text: string, indent = ''): string {
  const lines = text.split('\n').map((l) => `${indent}  ${l}`.trimEnd());
  return `${indent}${field}: |\n${lines.join('\n')}\n`;
}

function main(): void {
  const owners = ownerClasses();
  const indexes = extractIndexes();
  const byCollection = new Map<string, Extracted[]>();
  for (const entry of indexes) {
    if (!byCollection.has(entry.collection)) {
      byCollection.set(entry.collection, []);
    }
    byCollection.get(entry.collection)!.push(entry);
  }

  for (const collection of Object.values(Collections) as string[]) {
    const policy = COLLECTION_POLICIES[collection as Collections];
    const reset = RESET_DISPOSITIONS[collection as Collections];
    const owner = owners.get(collection) ?? 'none';
    const subsystem = SUBSYSTEM[collection] ?? 'persistence.md';

    let out = '';
    out += `collection: ${collection}\n`;
    out += `owner: ${owner}\n`;
    out += `subsystem: ${subsystem}\n`;
    out += `summary: TODO\n`;
    out += block('purpose', 'TODO');
    out += `invariants: []\n`;

    if (policy.verb === 'pass' && policy.mark) {
      out += `sandbox:\n  verb: pass\n  mark: true\n`;
    } else if (policy.verb === 'shadow') {
      out += `sandbox:\n  verb: shadow\n  mode: ${policy.mode}\n`;
    } else {
      out += `sandbox: ${policy.verb}\n`;
    }

    if (reset.verb === 'wipe') {
      out += `reset: wipe\n`;
    } else if (reset.verb === 'keep') {
      out += `reset:\n  verb: keep\n`;
      out += block('because', reset.because, '  ');
    } else {
      out += `reset:\n  verb: wipe-except\n  keep: declared-document-kinds\n`;
      out += block('because', reset.because, '  ');
    }

    const rows = byCollection.get(collection) ?? [];
    if (rows.length === 0) {
      out += `indexes: []\n`;
    } else {
      out += `indexes:\n`;
      for (const row of rows) {
        out += `  - keys: ${yamlFlowMap(row.keys)}\n`;
        if (row.options.unique === true) out += `    unique: true\n`;
        if (row.text) out += `    text: true\n`;
        if (typeof row.options.expireAfterSeconds === 'number') {
          out += `    expireAfterSeconds: ${row.options.expireAfterSeconds}\n`;
        }
        if (row.options.collation) {
          out += `    collation: ${yamlFlowMap(row.options.collation as Record<string, unknown>)}\n`;
        }
        if (row.options.partialFilterExpression) {
          out += `    partialFilterExpression: ${yamlFlowMap(row.options.partialFilterExpression as Record<string, unknown>)}\n`;
        }
        out += block('why', row.comment || 'TODO', '    ');
      }
    }
    writeFileSync(join(outDir, `${collection}.yaml`), out, 'utf-8');
  }
  console.info(
    `bootstrap-schema-docs: wrote ${Object.values(Collections).length} docs to ` +
      `${relative(serverRoot, outDir)}`
  );
}

main();
