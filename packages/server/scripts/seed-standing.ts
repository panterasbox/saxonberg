/**
 * seed-standing — give a character a plausible past, so the live
 * standing figures have something true to say.
 *
 * ⚠ **Why this exists.** Every standing in this game derives on read
 * from an append-only ledger, and none of those ledgers is seeded. So
 * on a freshly wiped database every figure is a real, honest zero: the
 * widget shelf, the practice record and the standing curve all
 * correctly render `—`. That is the honesty convention working exactly
 * as designed, and it is also the least impressive possible demo — a
 * beautifully engraved dashboard of dashes.
 *
 * The design handoff's own preference order says the fix is option 3,
 * *seed the world so the real endpoint answers*, and calls it "the only
 * version that survives contact with a screenshot." This is that,
 * scoped to the five ledgers the figures read.
 *
 * **It is a script, not a seeder.** `SeederManager` owns the `domain`
 * collection only, and the boot seeders in `backend/` run against a
 * fixed dataset at startup. This has to target *whichever character is
 * being driven* after a wipe, which is a per-run argument.
 *
 * **It is not the demo world.** Chronicle depth, chain-of-title
 * history, named regulars with belief state — all of that is
 * docs/slates/builds/demo-slate.md item 2 and its own design pass. This
 * writes five ledgers and nothing else. It mints no Avatar, touches no
 * `domain` row, and creates no content.
 *
 * Usage:
 *   tsx scripts/seed-standing.ts --uri <uri> --db <db> --player <id>
 *   tsx scripts/seed-standing.ts --uri <uri> --db <db> --player <id> --clear
 *
 * `--player` takes either a bare player id (`maren`) or a full durable
 * key (`/obj/Avatar/maren`). `--clear` removes this script's own rows
 * for that subject and exits.
 */

import { MongoClient, type Db } from 'mongodb';

/**
 * Stamped on every row this script writes. Makes the seeding
 * **idempotent** (a re-run replaces rather than doubles) and
 * **reversible** (`--clear` knows exactly what it may delete), and
 * keeps the script honest about which history is authored.
 */
const SEED_MARK = 'seed-standing';

/** Real-time bucket size the participation ledger dedupes on. */
const BUCKET_MS = 600 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The shape of the authored past. Deliberately **spread over weeks**:
 * the practice record and the standing curve are both figures *about
 * time*, so a burst of rows at one timestamp renders as a single spike
 * and proves nothing. A career should look like a career.
 */
const SPAN_DAYS = 84; // twelve weeks — the practice grid's own window

/** Trades worked, in the order a career touched them. */
const TRADES: { discipline: string; fromDay: number; toDay: number }[] = [
  { discipline: 'metalwork', fromDay: 84, toDay: 30 },
  { discipline: 'cooking', fromDay: 45, toDay: 12 },
  { discipline: 'medicine', fromDay: 20, toDay: 0 },
];

/** Opposed-pair axes the disposition ledger records against. */
const DISPOSITIONS: { disposition: string; valence: number; n: number }[] = [
  { disposition: 'diligent', valence: 1, n: 14 },
  { disposition: 'brave', valence: 1, n: 6 },
  { disposition: 'patient', valence: -1, n: 4 },
];

interface Row {
  [k: string]: unknown;
}

function durableKey(player: string): string {
  return player.startsWith('/obj/Avatar/') ? player : `/obj/Avatar/${player}`;
}

/**
 * Deterministic pseudo-randomness. `Math.random()` would make each run
 * produce a different past, so a re-run after a wipe would not
 * reproduce the demo anyone screenshotted.
 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function buildRows(subject: string, now: number): Record<string, Row[]> {
  const rand = rng(
    [...subject].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  );
  const at = (daysAgo: number): number => now - daysAgo * DAY_MS;

  // ── transcripts: the practice record + practising competence ──
  const transcripts: Row[] = [];
  for (const t of TRADES) {
    for (let day = t.fromDay; day >= t.toDay; day--) {
      // Not every day — a career has gaps, and a grid that shames you
      // for a holiday is the version that gets closed.
      if (rand() > 0.45) continue;
      const sessions = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < sessions; i++) {
        transcripts.push({
          owner: subject,
          kind: 'deed',
          when: Math.floor(at(day) / 1000),
          discipline: t.discipline,
          difficulty: 1 + Math.floor(rand() * 4),
          outcome: rand() > 0.25 ? 'success' : 'failure',
          tags: [SEED_MARK],
        });
      }
    }
  }

  // ── disposition_events: the dominant trait ──
  const dispositions: Row[] = [];
  for (const d of DISPOSITIONS) {
    for (let i = 0; i < d.n; i++) {
      dispositions.push({
        owner: subject,
        kind: 'deed',
        when: Math.floor(at(Math.floor(rand() * SPAN_DAYS)) / 1000),
        disposition: d.disposition,
        valence: d.valence,
        tags: [SEED_MARK],
      });
    }
  }

  // ── participation_events: PLAY standing ──
  // One row per distinct bucket, because the ledger dedupes per bucket
  // and a second row in one bucket is silently discarded.
  const participation: Row[] = [];
  const seenBuckets = new Set<number>();
  for (let day = SPAN_DAYS; day >= 0; day--) {
    if (rand() > 0.5) continue;
    const perDay = 3 + Math.floor(rand() * 8);
    for (let i = 0; i < perDay; i++) {
      const realAt = at(day) + Math.floor(rand() * DAY_MS);
      const bucket = Math.floor(realAt / BUCKET_MS);
      if (seenBuckets.has(bucket)) continue;
      seenBuckets.add(bucket);
      participation.push({
        subject,
        bucket,
        kind: 'command',
        at: Math.floor(realAt / 1000),
        realAt,
        tags: [SEED_MARK],
      });
    }
  }

  // ── producer_events: MAKE standing ──
  // Credit requires an actor distinct from the author (A != P), so the
  // authored past includes other people engaging with your work.
  const producer: Row[] = [];
  const others = ['/obj/Avatar/tomas', '/obj/Avatar/bramble', '/obj/Avatar/sable'];
  for (let day = SPAN_DAYS; day >= 0; day -= 2) {
    if (rand() > 0.55) continue;
    const actor = others[Math.floor(rand() * others.length)]!;
    const realAt = at(day) + Math.floor(rand() * DAY_MS);
    producer.push({
      author: subject,
      actor,
      zonePath: '/domain/eternal',
      weight: 1,
      bucket: Math.floor(realAt / BUCKET_MS),
      kind: 'engagement',
      at: Math.floor(realAt / 1000),
      realAt,
      tags: [SEED_MARK],
    });
  }

  // ── renown_events: how widely you are known ──
  const renown: Row[] = [];
  for (let day = SPAN_DAYS; day >= 0; day -= 3) {
    if (rand() > 0.5) continue;
    const source = others[Math.floor(rand() * others.length)]!;
    const realAt = at(day) + Math.floor(rand() * DAY_MS);
    renown.push({
      subject,
      source,
      kind: 'reaction',
      signal: { emote: rand() > 0.2 ? 'nod' : 'frown' },
      locality: null,
      groups: [],
      at: Math.floor(realAt / 1000),
      realAt,
      tags: [SEED_MARK],
    });
  }

  return {
    transcripts,
    disposition_events: dispositions,
    participation_events: participation,
    producer_events: producer,
    renown_events: renown,
  };
}

/** Delete only rows this script wrote for this subject. */
async function clearSeeded(db: Db, subject: string): Promise<number> {
  let removed = 0;
  const targets: [string, string][] = [
    ['transcripts', 'owner'],
    ['disposition_events', 'owner'],
    ['participation_events', 'subject'],
    ['producer_events', 'author'],
    ['renown_events', 'subject'],
  ];
  for (const [coll, keyField] of targets) {
    const res = await db
      .collection(coll)
      .deleteMany({ [keyField]: subject, tags: SEED_MARK });
    removed += res.deletedCount ?? 0;
  }
  return removed;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const get = (flag: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? (argv[i + 1] as string) : '';
  };
  const uri = get('--uri');
  const dbName = get('--db');
  const player = get('--player');
  const doClear = argv.includes('--clear');

  if (!uri || !dbName || !player) {
    throw new Error(
      'seed-standing: --uri, --db and --player are required\n' +
        '  tsx scripts/seed-standing.ts --uri <uri> --db <db> --player <id> [--clear]'
    );
  }

  const subject = durableKey(player);
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);

    // Idempotent by construction: a re-run clears its own rows first,
    // so the authored past is replaced rather than doubled.
    const removed = await clearSeeded(db, subject);
    if (doClear) {
      console.log(`seed-standing: removed ${removed} row(s) for ${subject}`);
      return;
    }
    if (removed > 0) {
      console.log(`seed-standing: replaced ${removed} existing seeded row(s)`);
    }

    const rows = buildRows(subject, Date.now());
    let total = 0;
    for (const [coll, docs] of Object.entries(rows)) {
      if (docs.length === 0) continue;
      await db.collection(coll).insertMany(docs);
      total += docs.length;
      console.log(`  ${coll.padEnd(22)} ${String(docs.length).padStart(4)} row(s)`);
    }
    console.log(`seed-standing: wrote ${total} row(s) for ${subject}`);
    console.log(
      '\nRestart the server (or wait for the next ledger append) so the\n' +
        'derived caches fold the new history.'
    );
  } finally {
    await client.close();
  }
}

if (process.argv[1] && process.argv[1].includes('seed-standing')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
