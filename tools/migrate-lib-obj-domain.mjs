#!/usr/bin/env node
/**
 * migrate-lib-obj-domain — repoint `domain` rows left behind by the
 * lib/obj taxonomy refactor.
 *
 * WHY THIS EXISTS
 * ---------------
 * The refactor (629fb5cd / 4c8f6fbf) moved every instanceable class from
 * `/lib/` to `/obj/` — "nothing instances /lib/". The seed FILES were
 * updated, but `SeederManager` is insert-only, so a corrected `class:`
 * never reaches a row that already exists. Every such row still names a
 * module that is no longer there, and `BootstrapManager` dies on the
 * first one it tries to clone:
 *
 *   FATAL: failed to clone '/domain/void':
 *          Cannot find module .../lib/stuff/VoidLocation.js
 *
 * That aborts boot for EVERY branch, not just a feature branch.
 *
 * WHAT IT DOES
 * ------------
 * Rewrites `class` on `domain` rows whose value starts with `/lib/`,
 * using the mapping below. The mapping was derived mechanically — for
 * each stale class, the basename was located under `src/mud/**` and
 * resolved to its single `/obj/` home — and then eyeballed. 26 distinct
 * classes over ~170 rows.
 *
 * The one non-mechanical entry is `CartesianLocation`, which is now
 * `lib/` SUBSTRATE and therefore instanceable by nobody. Its rows become
 * `/obj/location/Room`, the concrete subclass, which is what the seed
 * tree already says they should be.
 *
 * SAFETY
 * ------
 *   --dry-run   (default) print what would change, touch nothing
 *   --apply     perform the update, after writing a backup JSON
 *   --revert F  restore `class` values from a backup file
 *
 * Run from packages/server so it can read .env and resolve `mongodb`:
 *
 *   node ../../tools/migrate-lib-obj-domain.mjs            # dry run
 *   node ../../tools/migrate-lib-obj-domain.mjs --apply
 *   node ../../tools/migrate-lib-obj-domain.mjs --revert lib-obj-domain-backup.json
 */

import { MongoClient } from "mongodb";
import { readFileSync, writeFileSync } from "fs";

const MAPPING = {
  "/lib/augmentation/AetherImplant": "/obj/AetherImplant",
  "/lib/biome/Biome": "/obj/Biome",
  "/lib/biome/SkyExposedBiome": "/obj/SkyExposedBiome",
  "/lib/boundary/Door": "/obj/Door",
  "/lib/equipment/Garment": "/obj/equipment/Garment",
  "/lib/home/HomeZone": "/obj/HomeZone",
  "/lib/locomotion/LocomotionMode": "/obj/LocomotionMode",
  "/lib/material/Material": "/obj/material/Material",
  "/lib/material/RadioactiveMaterial": "/obj/material/RadioactiveMaterial",
  "/lib/messaging/Topic": "/obj/Topic",
  "/lib/perception/modalities/EmotiveESPModality": "/obj/modalities/EmotiveESPModality",
  "/lib/perception/modalities/SmellModality": "/obj/modalities/SmellModality",
  "/lib/perception/modalities/SoundModality": "/obj/modalities/SoundModality",
  "/lib/perception/modalities/TasteModality": "/obj/modalities/TasteModality",
  "/lib/perception/modalities/TouchModality": "/obj/modalities/TouchModality",
  "/lib/perception/modalities/VerbalESPModality": "/obj/modalities/VerbalESPModality",
  "/lib/perception/modalities/VisionModality": "/obj/modalities/VisionModality",
  "/lib/persistence/PersistentHydrator": "/obj/persistence/PersistentHydrator",
  "/lib/persistence/QuantityMarshaller": "/obj/persistence/QuantityMarshaller",
  // Substrate now — the concrete subclass takes the clones.
  "/lib/spatial/CartesianLocation": "/obj/location/Room",
  "/lib/spatial/CartesianZone": "/obj/location/CartesianZone",
  "/lib/species/BodyPlan": "/obj/species/BodyPlan",
  "/lib/species/Clade": "/obj/species/Clade",
  "/lib/species/Species": "/obj/species/Species",
  "/lib/stuff/VoidLocation": "/obj/VoidLocation",
  "/lib/zone/FolderZone": "/obj/FolderZone",
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const revertAt = args.indexOf("--revert");
const uri = readFileSync(".env", "utf8").match(/MONGODB_URI=(.*)/)[1].trim();
const client = new MongoClient(uri);
await client.connect();
const domain = client.db("saxonberg").collection("domain");

if (revertAt !== -1) {
  const file = args[revertAt + 1];
  const rows = JSON.parse(readFileSync(file, "utf8"));
  let n = 0;
  for (const r of rows) {
    const res = await domain.updateOne(
      { path: r.path },
      { $set: { class: r.class } },
    );
    n += res.modifiedCount;
  }
  console.log(`reverted ${n} row(s) from ${file}`);
  await client.close();
  process.exit(0);
}

const stale = await domain
  .find({ class: /^\/lib\// })
  .project({ _id: 1, path: 1, class: 1 })
  .toArray();

const unmapped = stale.filter((r) => !MAPPING[r.class]);
if (unmapped.length > 0) {
  console.error(`REFUSING: ${unmapped.length} row(s) have no mapping:`);
  for (const u of new Set(unmapped.map((r) => r.class))) console.error("   ", u);
  await client.close();
  process.exit(1);
}

const counts = {};
for (const r of stale) counts[r.class] = (counts[r.class] ?? 0) + 1;
console.log(`${stale.length} stale row(s), ${Object.keys(counts).length} distinct class(es):`);
for (const [from, n] of Object.entries(counts).sort()) {
  console.log(`  ${String(n).padStart(3)}x  ${from}\n         -> ${MAPPING[from]}`);
}

if (!apply) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply.");
  await client.close();
  process.exit(0);
}

const backup = "lib-obj-domain-backup.json";
writeFileSync(
  backup,
  JSON.stringify(
    stale.map((r) => ({ _id: String(r._id), path: r.path, class: r.class })),
    null,
    2,
  ),
);
console.log(`\nbackup written -> ${backup}`);

let changed = 0;
for (const [from, to] of Object.entries(MAPPING)) {
  const res = await domain.updateMany({ class: from }, { $set: { class: to } });
  changed += res.modifiedCount;
}
console.log(`migrated ${changed} row(s).`);
console.log(`revert with: node ../../tools/migrate-lib-obj-domain.mjs --revert ${backup}`);
await client.close();
