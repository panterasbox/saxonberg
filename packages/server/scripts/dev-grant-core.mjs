/**
 * dev-grant-core — put a playerId in the `core` group so a dev database
 * has somebody who can author.
 *
 * ⚠ THIS IS A STOPGAP AND IS MEANT TO DIE. The `core` group is slated for
 * removal (see the core-decomposition work: `'core'` is doing five jobs,
 * and its role as the universal fallback owner is a symptom of unparcelled
 * content). When content is parcelled and the fallback goes, delete this
 * file — it should be the only thing that has to go with it. That is why
 * this is a script rather than a `CORE_PLAYER_IDS` env seed alongside
 * `WIZARD_PLAYER_IDS`: an env var would become deployment config and a
 * documented mechanism, which is a much more expensive thing to unwind
 * than one file.
 *
 * ── Why it is needed at all ───────────────────────────────────────────
 *
 * A FRESH DATABASE HAS NOBODY WHO CAN AUTHOR ANYTHING, and there is no
 * in-game way to fix it:
 *
 *   - Untitled content resolves to `core` as its owner (`ParcelApi.ownerOf`
 *     rung 3, the state default), and `AccessApi.can` — the gate on `goto`,
 *     `clone`, `destruct` and every other content-write verb — asks for
 *     membership in that group.
 *   - `AccessRegistry.seedCoreGroup()` mints `core` EMPTY. Unlike
 *     `wizards` / `streamers` / `archwizards` it has no env seed.
 *   - `core.owner` is `'system'`, so no player is ever its owner or admin,
 *     and `group add core <id>` refuses everyone ("Only owners and admins
 *     may add").
 *
 * ⚠ AND WIZARDRY IS NOT THE ANSWER. `isWizard` is the orthogonal code-trust
 * axis (eval / reload / source writes). `goto` and `clone` never consult it
 * — a perfectly seeded `WIZARD_PLAYER_IDS` still cannot move or clone.
 *
 * Seeded at the `'owner'` role, not `'member'`: `canMutateZone` demands
 * `'owner'`, and since `core.owner` is `'system'` nobody in-game can ever
 * confer it. Additive and idempotent — never removes, never downgrades.
 *
 * Usage (dry run by default):
 *   node scripts/dev-grant-core.mjs --player <playerId> --db saxonberg_dev
 *   node scripts/dev-grant-core.mjs --player <playerId> --db saxonberg_dev --apply
 *
 * `--uri` defaults to MONGODB_URI from packages/server/.env; `--db` to
 * MONGODB_DATABASE. Refuses to touch the production database name unless
 * `--i-mean-it` is passed.
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const PROD_DB = "saxonberg";

function parseArgs(argv) {
  const out = { apply: false, iMeanIt: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--i-mean-it") out.iMeanIt = true;
    else if (a === "--player") out.player = argv[++i];
    else if (a === "--uri") out.uri = argv[++i];
    else if (a === "--db") out.db = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

/** Minimal .env reader — the script runs outside the server's boot. */
function readEnvFile() {
  const path = fileURLToPath(new URL("../.env", import.meta.url));
  const out = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnvFile();
  const uri = args.uri ?? process.env.MONGODB_URI ?? env.MONGODB_URI;
  const db = args.db ?? process.env.MONGODB_DATABASE ?? env.MONGODB_DATABASE;

  if (!args.player) throw new Error("--player <playerId> is required");
  if (!uri) throw new Error("no Mongo URI (--uri, MONGODB_URI, or .env)");
  if (!db) throw new Error("no database (--db, MONGODB_DATABASE, or .env)");
  if (db === PROD_DB && !args.iMeanIt) {
    throw new Error(
      `refusing to touch '${PROD_DB}' without --i-mean-it; ` +
        `this script is for dev databases`
    );
  }

  const memberKey = `/obj/Avatar/${args.player}`;
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const groups = client.db(db).collection("groups");
    const core = await groups.findOne({ name: "core" });

    if (!core) {
      // The world has not booted against this database yet — boot it
      // once so AccessRegistry.postRegister mints the group, then re-run.
      console.log(
        `[dev-grant-core] no 'core' group in '${db}'.\n` +
          `  Boot the server against this database once (it mints the\n` +
          `  group at postRegister), then run this again.`
      );
      process.exitCode = 1;
      return;
    }

    const ids = core.memberIds ?? [];
    const roles = core.memberRoles ?? [];
    const idx = ids.indexOf(memberKey);

    if (idx !== -1 && roles[idx] === "owner") {
      console.log(`[dev-grant-core] ${memberKey} already holds 'owner'. No-op.`);
      return;
    }

    const action =
      idx === -1
        ? `add ${memberKey} as 'owner'`
        : `upgrade ${memberKey} from '${roles[idx]}' to 'owner'`;
    console.log(`[dev-grant-core] ${db}.groups/core: ${action}`);

    if (!args.apply) {
      console.log("[dev-grant-core] dry run — pass --apply to write.");
      return;
    }

    const nextIds = idx === -1 ? [...ids, memberKey] : ids;
    const nextRoles = idx === -1 ? [...roles, "owner"] : roles.slice();
    if (idx !== -1) nextRoles[idx] = "owner";

    await groups.updateOne(
      { _id: core._id },
      { $set: { memberIds: nextIds, memberRoles: nextRoles } }
    );
    console.log(
      `[dev-grant-core] done. Restart the server — the access caches warm ` +
        `at boot.`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(`[dev-grant-core] ${err.message}`);
  process.exitCode = 1;
});
