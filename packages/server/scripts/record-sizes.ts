/**
 * records:sizes — how large is each kept record, and what is directly in it?
 *
 * ⭐ persistence-model D16. Every record in `holder_snapshots` is a keeper's
 * inside (a kept room, a kept container, a body); this reads them back with
 * `$bsonSize` so an operator can see which insides are large, without
 * printing a single field value.
 *
 * Usage (against this worktree's own database):
 *   pnpm -C packages/server records:sizes              # largest first
 *   pnpm -C packages/server records:sizes --entries    # + each direct content's template path
 *   pnpm -C packages/server records:sizes --scopes     # distinct scope prefixes only
 *   pnpm -C packages/server records:sizes --json       # one JSON document on stdout
 *   pnpm -C packages/server records:sizes --limit 50
 *
 * Read-only.
 */

import 'dotenv/config';
import { PersistenceManager } from '../src/backend/PersistenceManager';
import { Collections } from '../src/mud/lib/persistence/Collections';

interface Row {
  scope: string;
  owner: string;
  bytes: number;
  contents: number;
  entries?: string[];
}

/** The template path (or nested-host ref) of each direct content of a record's container slice. */
function directEntries(state: unknown): string[] {
  if (!state || typeof state !== 'object') return [];
  const out: string[] = [];
  for (const slice of Object.values(state as Record<string, unknown>)) {
    const contents = (slice as { contents?: unknown } | null)?.contents;
    if (!Array.isArray(contents)) continue;
    for (const e of contents as Array<{ templatePath?: string; ref?: string }>) {
      out.push(e.ref !== undefined ? `ref:${e.ref}` : (e.templatePath ?? '?'));
    }
  }
  return out;
}

/** A scope's prefix: its path to the branch and the class (`/platform/agent/Avatar/…` → `/platform/agent/Avatar`). */
function prefixOf(scope: string): string {
  const parts = scope.split('/').filter(Boolean);
  const branch = parts.findIndex((p) => ['agent', 'thing', 'location', 'idea'].includes(p));
  return '/' + parts.slice(0, branch >= 0 ? Math.min(parts.length, branch + 2) : parts.length).join('/');
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE ?? 'saxonberg';
  if (!uri) throw new Error('records:sizes: MONGODB_URI is not set');
  const argv = process.argv.slice(2);
  const withEntries = argv.includes('--entries');
  const scopesOnly = argv.includes('--scopes');
  const asJson = argv.includes('--json');
  const limitAt = argv.indexOf('--limit');
  const limit = limitAt >= 0 ? Number(argv[limitAt + 1]) : Infinity;

  const pm = PersistenceManager.get();
  await pm.connect(uri, dbName);
  try {
    const cursor = pm.getCollection(Collections.HolderSnapshots).aggregate<{
      scope: string;
      owner: string;
      bytes: number;
      state: unknown;
    }>([
      { $project: { scope: 1, owner: 1, state: 1, bytes: { $bsonSize: '$$ROOT' } } },
      { $sort: { bytes: -1 } },
    ]);
    const rows: Row[] = [];
    for await (const doc of cursor) {
      const entries = directEntries(doc.state);
      const row: Row = { scope: doc.scope, owner: doc.owner, bytes: doc.bytes, contents: entries.length };
      if (withEntries) row.entries = entries;
      rows.push(row);
    }
    const scopes = [...new Set(rows.map((r) => prefixOf(r.scope)))].sort();
    const shown = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
    if (asJson) {
      process.stdout.write(JSON.stringify(scopesOnly ? { scopes } : { records: shown, scopes }) + '\n');
      return;
    }
    if (scopesOnly) {
      for (const s of scopes) process.stdout.write(`${s}\n`);
      return;
    }
    for (const r of shown) {
      process.stdout.write(`${String(r.bytes).padStart(9)}  ${String(r.contents).padStart(4)}  ${r.scope}  ${r.owner}\n`);
      for (const e of r.entries ?? []) process.stdout.write(`                 ${e}\n`);
    }
    process.stdout.write(`${rows.length} record(s); ${rows.reduce((n, r) => n + r.bytes, 0)} bytes\n`);
  } finally {
    await pm.disconnect();
  }
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error(err);
    process.exit(1);
  },
);
