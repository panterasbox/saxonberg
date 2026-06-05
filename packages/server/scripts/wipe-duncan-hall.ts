/**
 * One-shot: delete the Duncan Hall zone + room docs so the fixed
 * seeds re-insert on next server boot.
 *
 * The seeder is insert-only. To pick up a YAML change for a doc
 * that already exists, the doc has to be gone first. This is
 * dev-only and explicitly scoped to the duncan-hall tree — it
 * does NOT touch the Avatar, the User, or any other content.
 *
 * Run: cd packages/server && pnpm exec tsx scripts/wipe-duncan-hall.ts
 */

import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

// Run from packages/server/ — load .env from cwd.
config();

const PATHS_TO_WIPE = [
  '/domain/eternal/duncan-hall',
  '/domain/eternal/duncan-hall/lobby',
  '/domain/eternal/duncan-hall/steps',
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in packages/server/.env');

  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to Mongo');

  const db = client.db('saxonberg');
  const domain = db.collection('domain');

  // 1. Exact-path docs for the three known templates.
  const exactRes = await domain.deleteMany({
    path: { $in: PATHS_TO_WIPE },
  });
  console.log(`Deleted ${exactRes.deletedCount} duncan-hall template doc(s)`);

  // 2. Any runtime instance whose container field points at one of
  //    the deleted rooms (defensive — clears stale populates from
  //    prior boots; no-op when there aren't any).
  const instRes = await domain.deleteMany({
    'data.container': { $in: PATHS_TO_WIPE },
  });
  console.log(
    `Deleted ${instRes.deletedCount} instance doc(s) referencing those paths`
  );

  // 3. Any instance under a duncan-hall path (in case the runtime
  //    stamped paths under the zone tree).
  const subtreeRes = await domain.deleteMany({
    path: { $regex: '^/domain/eternal/duncan-hall/' },
  });
  console.log(
    `Deleted ${subtreeRes.deletedCount} additional subtree doc(s)`
  );

  await client.close();
  console.log('Done. Restart the server to re-seed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
