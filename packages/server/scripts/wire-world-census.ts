/**
 * wire-world-census — what `tools/wire-indifference` reads off a wire world's
 * database (test-world-lifecycle D9, drive steps 2 and 5). Read-only; prints
 * one `key value` line per fact and nothing else (never the URI):
 *
 *   supply <currency> <minor>   the money supply (minted − drained), per currency
 *   fixture-rows <n>            content rows stamped `sourcePack: test-fixtures`
 *   test-characters <n>         profiles the wire purge would take (`wire-` + @e2e.local)
 *
 * It refuses `saxonberg_demo`, the live box's database, as reset-db does.
 *
 *   tsx scripts/wire-world-census.ts
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MongoClient } from "mongodb";
import { Collections } from "../src/mud/lib/persistence/Collections";

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: join(HERE, "..", ".env") });

const uri = process.env.MONGODB_URI;
const name = process.env.MONGODB_DATABASE ?? "saxonberg";
if (!uri) {
  console.error("wire-world-census: MONGODB_URI is not set in packages/server/.env");
  process.exit(1);
}
if (name === "saxonberg_demo") {
  console.error("wire-world-census: refusing 'saxonberg_demo' — the live box's database.");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(name);
  for (const row of await db.collection(Collections.BankSupply).find({}).toArray()) {
    console.log(`supply ${String(row.currency)} ${Number(row.minted ?? 0) - Number(row.drained ?? 0)}`);
  }
  console.log(`fixture-rows ${await db.collection(Collections.Content).countDocuments({ sourcePack: "test-fixtures" })}`);
  console.log(
    `test-characters ${await db
      .collection(Collections.GoogleProfiles)
      .countDocuments({ displayName: /^wire-/, email: /@e2e\.local$/i })}`,
  );
} finally {
  await client.close();
}
