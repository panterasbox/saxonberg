/**
 * dump-indexes — what indexes does this code actually build?
 *
 * Connects (which is what runs `PersistenceManager.createIndexes()`),
 * then reads `listIndexes()` back off every collection in the vocabulary
 * and prints a sorted, normalized dump.
 *
 * ⭐ Its reason for existing: moving 80-odd authored `createIndex` calls
 * out of a 700-line method and into data is only safe if the result is
 * PROVED identical. Dump on the old code, dump on the new, diff. Without
 * that the change is a story about how it should be fine.
 *
 * Usage:
 *   tsx scripts/dump-indexes.ts --reindex --out before.json
 *
 * `--out` rather than a shell redirect because PM logs its connection to
 * stdout; the dump has to be the only thing in the file.
 *
 * `--reindex` drops every non-`_id` index first, so what comes back is
 * what THIS code builds rather than what some earlier revision left
 * behind — the property a fresh deployment has, without dropping any data
 * to get it. (Dropping the database would answer the same question and is
 * not worth the blast radius: an index is a derived structure over data
 * that is still there, so rebuilding costs time and nothing else.)
 *
 * ⚠ Run it against this worktree's own `saxonberg_buildN`. Rebuilding
 * every index on a live database is not free.
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { PersistenceManager } from '../src/backend/PersistenceManager';
import { Collections } from '../src/mud/lib/persistence/Collections';

interface DumpedIndex {
  name: string;
  key: Record<string, unknown>;
  unique?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
  collation?: Record<string, unknown>;
  weights?: Record<string, unknown>;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE ?? 'saxonberg';
  if (!uri) throw new Error('dump-indexes: MONGODB_URI is not set');

  const pm = PersistenceManager.get();

  if (process.argv.includes('--reindex')) {
    // Connect once (which builds indexes), strip every non-`_id` index,
    // then reconnect so `createIndexes()` runs against a clean slate.
    await pm.connect(uri, dbName);
    for (const collection of Object.values(Collections)) {
      try {
        await pm.getCollection(collection).dropIndexes();
      } catch (error) {
        // 26 NamespaceNotFound — a collection nothing has written yet.
        if ((error as { code?: number }).code !== 26) throw error;
      }
    }
    await pm.disconnect();
    // The singleton refuses a second connect while `client` is set;
    // `disconnect()` clears it, so this is a real reconnect.
  }

  await pm.connect(uri, dbName);

  const out: Record<string, DumpedIndex[] | 'no-such-collection'> = {};
  for (const collection of [...Object.values(Collections)].sort()) {
    let raw;
    try {
      raw = await pm.getCollection(collection).indexes();
    } catch (error) {
      // 26 NamespaceNotFound. A collection with no declared index is
      // never created by `createIndexes()` and never written by this
      // script — its absence is itself part of what the diff compares.
      if ((error as { code?: number }).code !== 26) throw error;
      out[collection] = 'no-such-collection';
      continue;
    }
    out[collection] = raw
      .map((index) => {
        const row: DumpedIndex = {
          name: String(index.name),
          key: index.key as Record<string, unknown>,
        };
        if (index.unique) row.unique = true;
        if (index.expireAfterSeconds !== undefined) {
          row.expireAfterSeconds = index.expireAfterSeconds as number;
        }
        if (index.partialFilterExpression) {
          row.partialFilterExpression = index.partialFilterExpression as Record<
            string,
            unknown
          >;
        }
        if (index.collation) {
          // Mongo echoes a fully-defaulted collation back; keep only the
          // two fields anything declares, so the diff is about intent.
          const c = index.collation as Record<string, unknown>;
          row.collation = { locale: c.locale, strength: c.strength };
        }
        if (index.weights) row.weights = index.weights as Record<string, unknown>;
        return row;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const json = `${JSON.stringify(out, null, 2)}\n`;
  const outFlag = process.argv.indexOf('--out');
  if (outFlag !== -1 && process.argv[outFlag + 1]) {
    writeFileSync(process.argv[outFlag + 1]!, json, 'utf-8');
    console.info(`dump-indexes: wrote ${process.argv[outFlag + 1]}`);
  } else {
    console.log(json);
  }
  await pm.disconnect();
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
