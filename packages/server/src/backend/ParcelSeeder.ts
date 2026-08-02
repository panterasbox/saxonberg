/**
 * ParcelSeeder — populate the `parcels` collection from a single seed YAML
 * declaring the platform's infrastructure title rows.
 *
 * **The governing security invariant.** Ownership is declared here — a
 * gated platform seed channel — never on the editable `domain` zone
 * template. A content edit (or a future untrusted content pack) can never
 * forge a title, because access-check data lives only in this collection
 * (written by the seed installer + the gated `ParcelApi`). This is the
 * shape forward-compatible with the content-pack/mod future: ownership
 * assigned inside content would be a supply-chain spoof.
 *
 * Insert-only / idempotent (the `RecipeSeeder` precedent): rows are matched
 * by `extent`; existing records are left alone (a second run → no-op).
 *
 * Source file is at `mud/config/parcels.yaml` (NOT under `mud/seeds/`):
 * parcel rows aren't Stuff templates and don't belong in the `domain`
 * collection that `SeederManager` walks. Runs in bootstrap after
 * `PersistenceManager.connect` and before `BootstrapManager.run` (which
 * warms `ParcelRegistry`'s coverage index from the just-populated
 * collection).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import {
  ParcelRecord,
  type ParcelOwner,
} from "../mud/lib/parcel/ParcelRecord";
import { LandUses } from "../mud/lib/parcel/LandUse";

interface ParcelSeedEntry {
  extent: string;
  zonePath?: string;
  owner: ParcelOwner;
  parentParcel?: string;
  /** One of the closed six; omitted = inherit from the covering parcel. */
  landUse?: string;
  /** Declared lot area in m². Omitted = undeclared (path-branch rows). */
  areaM2?: number;
}

interface ParcelSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/parcels.yaml. */
  seedPath?: string;
}

export class ParcelSeeder {
  public static async run(opts: ParcelSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? ParcelSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch {
      console.info(`ParcelSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { parcels?: ParcelSeedEntry[] }
      | ParcelSeedEntry[]
      | null;
    const entries: ParcelSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.parcels)
        ? parsed!.parcels!
        : [];
    let inserted = 0;
    for (const entry of entries) {
      ParcelSeeder.#validate(entry, path);
      const existing = await ParcelRecord.findByExtent(entry.extent);
      if (existing) continue;
      const record = new ParcelRecord();
      record.extent = entry.extent;
      record.zonePath = entry.zonePath ?? entry.extent;
      record.owner = entry.owner;
      record.parentParcel = entry.parentParcel ?? null;
      record.setLandUse(entry.landUse ?? null);
      record.area = typeof entry.areaM2 === "number" ? entry.areaM2 : 0;
      await record.save();
      inserted++;
    }
    console.info(
      `ParcelSeeder: ${inserted} new parcel${inserted === 1 ? "" : "s"} from ${path}`,
    );
    return inserted;
  }

  static #validate(entry: ParcelSeedEntry, path: string): void {
    if (!entry || typeof entry.extent !== "string" || !entry.extent) {
      throw new Error(
        `ParcelSeeder: malformed entry in ${path}: missing 'extent'`,
      );
    }
    const owner = entry.owner;
    if (!owner || typeof owner !== "object" || typeof owner.kind !== "string") {
      throw new Error(
        `ParcelSeeder: parcel '${entry.extent}' missing a typed 'owner'`,
      );
    }
    if (owner.kind === "group" && !owner.name && !owner.ref) {
      throw new Error(
        `ParcelSeeder: group owner of '${entry.extent}' needs a 'name' or 'ref'`,
      );
    }
    if (owner.kind === "player" && !owner.templatePath) {
      throw new Error(
        `ParcelSeeder: player owner of '${entry.extent}' needs a 'templatePath'`,
      );
    }
    // Fail the boot rather than silently seeding an unknown use: a typo
    // here would read as `wild` through the inheritance walk, which is
    // indistinguishable from "deliberately unzoned".
    if (entry.landUse !== undefined && !LandUses.isLandUse(entry.landUse)) {
      throw new Error(
        `ParcelSeeder: parcel '${entry.extent}' declares unknown landUse ` +
          `'${entry.landUse}' (expected one of ${LandUses.ALL.join(", ")})`,
      );
    }
    if (entry.areaM2 !== undefined && !(entry.areaM2 > 0)) {
      throw new Error(
        `ParcelSeeder: parcel '${entry.extent}' declares a non-positive ` +
          `areaM2 (${entry.areaM2})`,
      );
    }
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, "../mud/config/parcels.yaml");
  }
}
