/**
 * migrate-lib-to-obj — the one-shot data migration for the lib/→obj/
 * taxonomy refactor.
 *
 *   tsx scripts/migrate-lib-to-obj.ts            # DRY RUN (the default)
 *   tsx scripts/migrate-lib-to-obj.ts --scan     # audit every collection
 *   tsx scripts/migrate-lib-to-obj.ts --apply    # write
 *   tsx scripts/migrate-lib-to-obj.ts --reverse --apply   # emergency rollback
 *
 * ## Why this exists at all
 *
 * `SeederManager` is INSERT-ONLY, keyed by template path, and the
 * `class:` string lives in the Mongo row — that stored value is what
 * `StuffApi.loadClassByPath` resolves at runtime. So moving a class file
 * breaks every already-seeded database, and moving a template path
 * strands every durable reference to it. Neither heals on restart.
 * (Content-pack rows DO heal — `PackApi` reconciles — but nothing else
 * does.)
 *
 * ## Why it does not import the mudlib
 *
 * Three reasons, and they are not stylistic:
 *   1. The world cannot boot until this has run, so booting it to
 *      migrate would be circular.
 *   2. Writes through `PersistApi` fire `DomainHook.aroundSave`, whose
 *      folder/leaf validation legitimately rejects intermediate states
 *      mid-run.
 *   3. `scripts/` is outside `src/mud/`, so `lint:imports` does not
 *      apply and the raw driver import is clean.
 * Use the `mongodb` driver directly. Do not "fix" this.
 *
 * ## What it rewrites
 *
 * EVERY collection, EVERY document, EVERY string — deeply, including
 * object KEYS. Not a field list. The reason is `holder_snapshots.state`:
 * an opaque per-mixin blob in which persistence slices marshal Stuff
 * identity refs AS templatePath strings, at arbitrary depth. A
 * field-by-field sweep cannot see them. Object keys matter because
 * `slotClaims` is keyed by body-plan path.
 *
 * Whole strings and whole keys only. A path embedded as a SUBSTRING of
 * a longer string (prose, a stored script body) is reported by `--scan`
 * and deliberately never rewritten.
 *
 * Idempotency is inherited from the move table: every `from` begins
 * `/lib/` and no `to` does, so re-running converges.
 */

import { MongoClient, type Db, type Document } from 'mongodb';
import { config as loadEnv } from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { MOVES, rewrite } from './lib-to-obj-moves';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: join(SERVER_ROOT, '.env') });

/* ─────────────────────────── the planner ───────────────────────────
 * Pure, exported, no I/O. This is what the tests drive.
 */

export interface DocChange {
  collection: string;
  id: unknown;
  before: Document;
  after: Document;
  touched: string[];
}

export interface Collision {
  collection: string;
  field: string;
  value: string;
  identical: boolean;
}

export interface Plan {
  changes: DocChange[];
  collisions: Collision[];
  /** Stale source rows whose destination already holds an identical copy. */
  deletions: unknown[];
  /** Whole-string /lib/ values no rule covered. */
  unmapped: string[];
  /** /lib/ occurrences inside a longer string — reported, never rewritten. */
  substrings: string[];
}

/** Invert the table for --reverse. */
function reverseRewrite(value: string): string | null {
  if (typeof value !== 'string') return null;
  const ordered = [...MOVES].sort((a, b) => b.to.length - a.to.length);
  for (const r of ordered) {
    if (r.kind === 'exact') {
      if (value === r.to) return r.from;
    } else if (value.startsWith(r.to)) {
      return r.from + value.slice(r.to.length);
    }
  }
  return null;
}

export interface RewriteOpts {
  reverse?: boolean;
  /** Collected as a side effect, for reporting. */
  unmapped?: Set<string>;
  substrings?: Set<string>;
}

function rewriteOne(value: string, opts: RewriteOpts): string | null {
  if (opts.reverse) return reverseRewrite(value);
  const r = rewrite(value);
  if (r) return r;
  // Nothing matched. Is this a /lib/ path we failed to cover, or a
  // longer string that merely contains one?
  if (value.startsWith('/lib/')) opts.unmapped?.add(value);
  else if (value.includes('/lib/')) opts.substrings?.add(value);
  return null;
}

/**
 * Only plain `{}` objects get walked and rebuilt. BSON values — ObjectId,
 * Date, Binary, Decimal128 — are objects too, and rebuilding one turns it
 * into `{buffer: {0: 106, …}}`, which Mongo then rejects (`the (immutable)
 * field '_id' was found to have been altered`). Nothing inside a BSON
 * scalar is ever a template path, so passing them through untouched is
 * both correct and necessary.
 */
function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Deep-rewrite a value: strings, array items, object values AND object
 * keys. Returns the new value and records every JSON path touched.
 */
export function rewriteDeep(
  value: unknown,
  opts: RewriteOpts = {},
  touched: string[] = [],
  at = ''
): { value: unknown; touched: string[] } {
  if (typeof value === 'string') {
    const r = rewriteOne(value, opts);
    if (r !== null) touched.push(at || '(root)');
    return { value: r ?? value, touched };
  }
  if (Array.isArray(value)) {
    const out = value.map(
      (v, i) => rewriteDeep(v, opts, touched, `${at}[${i}]`).value
    );
    return { value: out, touched };
  }
  if (value && typeof value === 'object' && isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nk = rewriteOne(k, opts);
      if (nk !== null) touched.push(`${at}.${k} (key)`);
      out[nk ?? k] = rewriteDeep(v, opts, touched, `${at}.${nk ?? k}`).value;
    }
    return { value: out, touched };
  }
  return { value, touched };
}

/** Fields whose value must stay unique within a collection. */
const UNIQUE_FIELDS: Record<string, string> = {
  domain: 'path',
  documents: 'path',
};

export function planCollection(
  name: string,
  docs: readonly Document[],
  opts: RewriteOpts = {}
): Plan {
  const unmapped = opts.unmapped ?? new Set<string>();
  const substrings = opts.substrings ?? new Set<string>();
  const o = { ...opts, unmapped, substrings };

  const changes: DocChange[] = [];
  const collisions: Collision[] = [];
  const deletions: unknown[] = [];
  const uniqueField = UNIQUE_FIELDS[name];
  const occupied = new Map<string, Document>();
  if (uniqueField) {
    for (const d of docs) {
      const v = d[uniqueField];
      if (typeof v === 'string') occupied.set(v, d);
    }
  }

  for (const doc of docs) {
    const { value, touched } = rewriteDeep(doc, o, [], '');
    if (touched.length === 0) continue;
    const after = value as Document;

    if (uniqueField) {
      const before = doc[uniqueField];
      const nowAt = after[uniqueField];
      if (typeof nowAt === 'string' && nowAt !== before) {
        const sitting = occupied.get(nowAt);
        if (sitting && sitting !== doc) {
          const identical =
            JSON.stringify({ ...sitting, _id: null }) ===
            JSON.stringify({ ...after, _id: null });
          collisions.push({
            collection: name,
            field: uniqueField,
            value: nowAt,
            identical,
          });
          // An IDENTICAL destination means the seeder already inserted
          // the row we were about to write — the app booted before the
          // migration ran. Converging means DELETING the stale source,
          // not leaving it: a leftover row still carries the old
          // `/lib/` class, and boot dies on it
          // ("failed to clone '/domain/void'"). Reporting alone was the
          // bug; the e2e suite found it because the unit tests never
          // boot a world.
          if (identical) deletions.push(doc._id);
          continue; // never write INTO an occupied slot
        }
      }
    }

    changes.push({ collection: name, id: doc._id, before: doc, after, touched });
  }

  return { changes, collisions, deletions, unmapped: [...unmapped], substrings: [...substrings] };
}

/* ─────────────────────────── the driver ─────────────────────────── */

interface Args {
  apply: boolean;
  scan: boolean;
  reverse: boolean;
  collections?: string[];
  onCollision: 'abort' | 'skip' | 'prefer-source' | 'prefer-destination';
  uri?: string;
  db?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (k: string): string | undefined =>
    argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const onCollision = (get('on-collision') ?? 'abort') as Args['onCollision'];
  return {
    apply: argv.includes('--apply'),
    scan: argv.includes('--scan'),
    reverse: argv.includes('--reverse'),
    collections: get('collections')?.split(',').filter(Boolean),
    onCollision,
    uri: get('uri'),
    db: get('db'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const uri = args.uri ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('migrate-lib-to-obj: no MONGODB_URI (set it, or pass --uri=)');
    process.exit(2);
  }

  const client = new MongoClient(uri);
  await client.connect();
  // MONGODB_DATABASE is how every other entry point picks the database;
  // `client.db()` with no argument silently falls back to whatever the
  // URI names, or `test`. On a live box that means migrating the wrong
  // database and reporting success — caught on the first real run.
  const dbName = args.db ?? process.env.MONGODB_DATABASE;
  const db: Db = dbName ? client.db(dbName) : client.db();

  const mode = args.scan ? 'SCAN' : args.apply ? 'APPLY' : 'DRY RUN';
  console.log(`migrate-lib-to-obj [${mode}]${args.reverse ? ' (reversed)' : ''}`);
  console.log(`database: ${db.databaseName}\n`);

  const names = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !args.collections || args.collections.includes(n))
    .sort();

  let totalChanges = 0;
  let totalCollisions = 0;
  const unmapped = new Set<string>();
  const substrings = new Set<string>();

  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    const plan = planCollection(name, docs, {
      reverse: args.reverse,
      unmapped,
      substrings,
    });
    if (plan.changes.length === 0 && plan.collisions.length === 0 && plan.deletions.length === 0) continue;

    totalChanges += plan.changes.length;
    totalCollisions += plan.collisions.length;
    console.log(
      `  ${name.padEnd(24)} ${String(plan.changes.length).padStart(5)} document(s)` +
        (plan.collisions.length ? `  ⚠ ${plan.collisions.length} collision(s)` : '') +
        (plan.deletions.length ? `  ${plan.deletions.length} stale source(s) to drop` : '')
    );

    for (const c of plan.collisions) {
      console.log(
        `      COLLISION ${c.field}=${c.value} — destination occupied and ` +
          (c.identical ? 'identical (an interrupted run)' : 'DIFFERENT (hand-edited?)')
      );
    }

    if (!args.scan && !args.apply) {
      for (const ch of plan.changes.slice(0, 3)) {
        console.log(`      e.g. _id=${String(ch.id)}  ${ch.touched.slice(0, 4).join(', ')}`);
      }
    }

    if (args.apply) {
      // Only a DIFFERING destination is a conflict. An identical one is
      // the seeder having already written what we were about to write —
      // convergence, handled by the deletion pass above. Aborting on it
      // would refuse the very case the migration is designed to absorb.
      const conflicts = plan.collisions.filter((c) => !c.identical);
      // `prefer-destination`: the row already sitting at the new path is
      // what the CURRENT seeds produce, so it wins and the stale source
      // is dropped. This is the "I am fine re-seeding" answer, and the
      // right one when the difference is simply that the old row predates
      // a seed change (e.g. a hydratorClass this build removed).
      if (conflicts.length && args.onCollision === 'prefer-destination') {
        for (const c of conflicts) {
          const stale = docs.find(
            (d) => typeof d.path === 'string' && rewrite(d.path) === c.value
          );
          if (stale) await db.collection(name).deleteOne({ _id: stale._id as never });
        }
        console.log(`      dropped ${conflicts.length} stale source(s) in favour of the seeded rows`);
      } else if (conflicts.length && args.onCollision === 'abort') {
        console.error(
          `\nABORT: ${name} has ${conflicts.length} conflicting collision(s). ` +
            `Nothing was written to this collection.\n` +
            `This usually means the new code booted BEFORE the migration ran ` +
            `(SeederManager is insert-only, so it inserted fresh defaults at ` +
            `the new paths). Re-run with --on-collision=prefer-source to keep ` +
            `the pre-existing rows, or investigate first.`
        );
        await client.close();
        process.exit(1);
      }
      const col = db.collection(name);
      // Stale sources whose destination already holds an identical row.
      // Deleting them is what makes an interrupted run converge; leaving
      // them behind leaves a row still carrying the old /lib/ class,
      // which boot then dies on.
      for (const id of plan.deletions) {
        await col.deleteOne({ _id: id as never });
      }
      for (const ch of plan.changes) {
        // `_id` is immutable — never send it in the replacement, and
        // always match on the ORIGINAL value rather than anything the
        // rewrite produced.
        const { _id: _drop, ...body } = ch.after;
        await col.replaceOne({ _id: ch.id as never }, body as never);
      }
    }
  }

  console.log(
    `\n${totalChanges} document(s) ${args.apply ? 'rewritten' : 'would change'}` +
      `, ${totalCollisions} collision(s).`
  );

  if (unmapped.size) {
    console.log(`\n⚠ ${unmapped.size} /lib/ value(s) matched NO rule — review each:`);
    [...unmapped].slice(0, 40).forEach((u) => console.log(`    ${u}`));
  }
  if (substrings.size) {
    console.log(
      `\n${substrings.size} string(s) CONTAIN a /lib/ path but are not one ` +
        `(prose, script bodies). Never rewritten; fix by hand if any matter:`
    );
    [...substrings].slice(0, 20).forEach((s) => console.log(`    ${s.slice(0, 120)}`));
  }
  if (args.scan && totalChanges === 0 && unmapped.size === 0) {
    console.log('\n✓ no mapped /lib/ residue — this database is migrated.');
  }

  await client.close();
}

// Only run when invoked directly; the tests import the planner.
if (process.argv[1] && process.argv[1].includes('migrate-lib-to-obj')) {
  void main();
}
