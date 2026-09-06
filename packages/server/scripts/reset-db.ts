/**
 * reset-db — drop this worktree's own Mongo database.
 *
 * ⭐ **This game has never held data a boot of the same checkout did not
 * write.** There are no users and no migrations, ever (CLAUDE.md; see
 * `docs/subsystems/content-packs.md` on the wave-4a junk sweep), so a
 * drop costs a reboot and nothing else — and it is the *only* answer to
 * the one thing that reliably wedges a boot after a rename:
 *
 *     PackApi: pack 'trade-cooking' FAILED at step 'reconcile' —
 *       … wants recipe document '/recipes/fine-roast' but it is owned
 *       by pack 'trade-hearth-cooking'
 *
 * A renamed pack cannot take ownership of rows the old pack id owns, and
 * writing an adoption path for it would be exactly the migration/compat
 * junk the project deletes on sight.
 *
 * ⚠ It drops `MONGODB_DATABASE` from `packages/server/.env` — the
 * worktree's OWN database (`saxonberg_build1/2/3`). It refuses
 * `saxonberg_demo`, which backs the live box: dropping that is an
 * outage, not a reset, and stays a conversation.
 *
 *     pnpm --filter @saxonberg/server reset:db
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MongoClient } from "mongodb";

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: join(HERE, "..", ".env") });

const uri = process.env.MONGODB_URI;
const name = process.env.MONGODB_DATABASE ?? "saxonberg";

if (!uri) {
  console.error("reset-db: MONGODB_URI is not set in packages/server/.env");
  process.exit(1);
}

// The one database this script may never touch.
const LIVE = "saxonberg_demo";
if (name === LIVE) {
  console.error(
    `reset-db: refusing to drop '${LIVE}' — that database backs the live ` +
      `box (docs/deployment.md). Dropping it is an outage, not a reset.`,
  );
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const before = (await client.db(name).listCollections().toArray()).length;
await client.db(name).dropDatabase();
await client.close();
console.log(`reset-db: dropped '${name}' (${before} collection(s)).`);
console.log("Reboot the server; the packs reinstall from the checkout.");
