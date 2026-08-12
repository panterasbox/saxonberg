/**
 * Purge e2e-minted characters and their accounts.
 *
 * ⭐ **Why this is a HARNESS script and not a backend route.**
 * `docs/antipatterns.md § A test-only capability added to the BACKEND`
 * gives the ladder, and its last rung is explicit: *only then a harness
 * seam — and put it in the harness, not in three layers of production
 * code.* A `POST /auth/test-purge` would have been gated and honest and
 * still wrong, because one seam invites the next. This is repo tooling
 * beside `check-gate-strings` and `seed-standing`; nothing in
 * `Application` / `Backend` / the routes learns that tests exist.
 *
 * ⚠ **The problem it solves is accumulation, not one bad run.** The e2e
 * helpers mint a fresh avatar PER TEST by design — that is what makes
 * the suite parallel-safe, and it is correct. What was missing is the
 * other half: nothing ever removed them. A sweep on 2026-08-12 found
 * **133 test characters** against 10 real accounts, seven of them
 * standing in the lounge visible to a live player.
 *
 * ## The safety rule
 *
 * A profile is purgeable **only if both** hold:
 *
 *   1. its `displayName` starts with `e2e-` — the shape
 *      `helpers.uniqueHandle()` mints, which no human handle takes; and
 *   2. its `email` ends `@e2e.local` — the synthetic domain the
 *      test-auth seam issues.
 *
 * ⚠⚠ **`founder` is the reason both conditions are needed.** The e2e
 * config points `FOUNDER_GOOGLE_EMAIL` at `founder@e2e.local`, which
 * makes one session a *real* founder holding the founder-default seats
 * — that is how the suite gets in-world authority without a test-only
 * backend seam. It carries the synthetic email but NOT the `e2e-`
 * handle, so rule 1 excludes it. It is also named in `NEVER_PURGE` for
 * defence in depth, because deleting it would quietly break every
 * authority-dependent spec.
 *
 * Anything failing either rule is skipped and reported, never deleted.
 * A handle passed explicitly that fails the rules is a **loud skip** —
 * the caller asked for something the guard refuses.
 *
 * ## What it does NOT delete
 *
 * The append-only ledgers (`renown_events`, `participation_events`,
 * `bank_ledger`, `accountability_events`, …). Rows keyed to a dead
 * subject are inert — nothing resolves them — and `bank_ledger` in
 * particular is the conservation chokepoint, where deleting legs to
 * tidy up would poke a real invariant for no benefit.
 *
 * ## Usage
 *
 *   tsx scripts/purge-test-characters.ts --dry-run
 *   tsx scripts/purge-test-characters.ts --handles a,b,c
 *   tsx scripts/purge-test-characters.ts --handles-file .auth/minted.log
 *   tsx scripts/purge-test-characters.ts --stale-hours 2
 *   tsx scripts/purge-test-characters.ts --all
 *
 * `--stale-hours` is what makes the teardown robust: a run that crashes
 * never writes its teardown, so the next run also sweeps any e2e
 * character older than the window. It is deliberately time-bounded so
 * two people running the suite at once cannot delete each other's live
 * characters.
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { Collections } from '../src/mud/lib/persistence/Collections';

/** The handle shape `helpers.uniqueHandle()` mints. */
const E2E_HANDLE = /^e2e-/;
/** The synthetic domain the test-auth seam issues. */
const E2E_EMAIL = /@e2e\.local$/i;

/**
 * Named survivors, checked before anything else. `founder` is
 * load-bearing (see the header); the rest are long-lived hand-made dev
 * characters that predate the e2e handle convention.
 */
const NEVER_PURGE = new Set([
  'founder',
  'dev',
  'default',
  'altplayer',
  'walker',
  'smith',
  'smith2',
  'diag',
  'speaker',
]);

interface Args {
  dryRun: boolean;
  all: boolean;
  handles: string[];
  staleHours: number | null;
}

function parseArgs(argv: string[]): Args {
  const at = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const fromFile = at('--handles-file');
  const handles: string[] = [];
  if (fromFile && existsSync(fromFile)) {
    handles.push(
      ...readFileSync(fromFile, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }
  const inline = at('--handles');
  if (inline) handles.push(...inline.split(',').map((h) => h.trim()).filter(Boolean));
  const stale = at('--stale-hours');
  return {
    dryRun: argv.includes('--dry-run'),
    all: argv.includes('--all'),
    handles: [...new Set(handles)],
    staleHours: stale ? Number(stale) : null,
  };
}

interface ProfileRow {
  _id: unknown;
  displayName?: string;
  email?: string;
  createdAt?: string | Date;
}

/** Both rules, plus the named survivors. The single decision point. */
function isPurgeable(p: ProfileRow): boolean {
  const name = p.displayName ?? '';
  if (NEVER_PURGE.has(name)) return false;
  return E2E_HANDLE.test(name) && E2E_EMAIL.test(p.email ?? '');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && !args.handles.length && args.staleHours === null) {
    console.error(
      'purge-test-characters: nothing selected. Pass --handles / ' +
        '--handles-file / --stale-hours / --all (see the file header).',
    );
    process.exit(2);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('purge-test-characters: MONGODB_URI is not set.');
    process.exit(2);
  }

  // ⚠ The URI carries no database, and each worktree runs its own
  // (`MONGODB_DATABASE=saxonberg_build1` etc.) so parallel sessions do
  // not share data. Defaulting to the driver's `test` database would
  // silently purge nothing and report success.
  const dbName = process.env.MONGODB_DATABASE ?? 'saxonberg';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`purge-test-characters: database '${dbName}'`);

  try {
    const all = (await db
      .collection(Collections.GoogleProfiles)
      .find({})
      .toArray()) as unknown as ProfileRow[];

    const wanted = new Set(args.handles);
    const staleBefore =
      args.staleHours === null
        ? null
        : Date.now() - args.staleHours * 3_600_000;

    const selected: ProfileRow[] = [];
    const refused: string[] = [];
    for (const p of all) {
      const name = p.displayName ?? '(unnamed)';
      const asked = args.all || wanted.has(name);
      const stale =
        staleBefore !== null &&
        p.createdAt !== undefined &&
        new Date(p.createdAt).getTime() < staleBefore &&
        E2E_HANDLE.test(name);

      if (!asked && !stale) continue;
      if (isPurgeable(p)) selected.push(p);
      // ⚠ Only a handle we were ASKED for is worth reporting as refused
      // — a stale sweep naturally passes over every real account and
      // saying so 10 times a run is noise.
      else if (asked && !args.all) refused.push(name);
    }

    for (const name of refused) {
      console.warn(
        `purge-test-characters: REFUSED '${name}' — not an e2e-minted ` +
          'character (needs an `e2e-` handle AND an @e2e.local email).',
      );
    }

    if (!selected.length) {
      console.log('purge-test-characters: nothing to purge.');
      return;
    }

    // ⚠ `users.googleProfileId` holds the STRING form of the profile's
    // ObjectId `_id`. Joining on the raw value silently matches nothing
    // — it resolved zero users on the first hand-run of this purge, and
    // applying that would have deleted the profiles while orphaning
    // every avatar body they owned.
    const profileIds = selected.map((p) => String(p._id));
    const users = await db
      .collection(Collections.Users)
      .find({ googleProfileId: { $in: profileIds } })
      .toArray();

    const playerIds = new Set<string>();
    for (const u of users) {
      for (const pid of ((u.playerIds as string[] | undefined) ?? [])) {
        playerIds.add(pid);
      }
    }
    const avatarPaths = [...playerIds].map((pid) => `/obj/Avatar/${pid}`);

    const doomed = {
      profiles: selected.length,
      users: users.length,
      avatarRows: await db
        .collection(Collections.Domain)
        .countDocuments({ path: { $in: avatarPaths } }),
      snapshots: await db
        .collection(Collections.HolderSnapshots)
        .countDocuments({ owner: { $in: avatarPaths } }),
    };

    console.log(
      `purge-test-characters: ${doomed.profiles} profile(s), ` +
        `${doomed.users} user(s), ${doomed.avatarRows} avatar row(s), ` +
        `${doomed.snapshots} snapshot(s)`,
    );

    if (args.dryRun) {
      console.log('purge-test-characters: DRY RUN — nothing deleted.');
      return;
    }

    await db
      .collection(Collections.Domain)
      .deleteMany({ path: { $in: avatarPaths } });
    await db
      .collection(Collections.HolderSnapshots)
      .deleteMany({ owner: { $in: avatarPaths } });
    await db
      .collection(Collections.Users)
      .deleteMany({ _id: { $in: users.map((u) => u._id) } });
    await db
      .collection(Collections.GoogleProfiles)
      .deleteMany({ _id: { $in: selected.map((p) => p._id) } as never });

    console.log('purge-test-characters: done.');
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  // ⚠ Never fail the run over cleanup. A teardown that turns a green
  // suite red because Mongo blinked is worse than the litter it removes.
  console.warn(
    `purge-test-characters: skipped (${
      err instanceof Error ? err.message : String(err)
    })`,
  );
  process.exit(0);
});
