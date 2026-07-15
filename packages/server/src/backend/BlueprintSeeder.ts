/**
 * BlueprintSeeder — populate the `blueprints` collection in two layers:
 *
 *   (a) Derived skeleton — enumerate the DISTINCT backing `class` paths across
 *       the `domain` collection, introspect each (`signatureOf`), and insert a
 *       `concrete` structural blueprint when no blueprint with that signature
 *       exists yet. Migration IS the derive step: every existing backing class
 *       gets a catalog entry, deduped on signature.
 *
 *   (b) Curated overlay — read `mud/config/blueprints.yaml`; each entry
 *       names/blesses a pure-composition blueprint or a concrete kind. Match /
 *       dedup by `signature` so a curated name ATTACHES to the derived
 *       skeleton entry (blessing it in place) rather than duplicating it; an
 *       entry whose composition matches no existing class is inserted fresh.
 *
 * Insert-only / idempotent (the `RecipeSeeder` precedent): signatures already
 * present are skipped, and the curated attach only fires on an un-blessed row,
 * so a second run inserts (and mutates) nothing — and a later `publishBlueprint`
 * rename is not reverted.
 *
 * Source file is at `mud/config/blueprints.yaml` (NOT under `mud/seeds/`):
 * Blueprint records aren't Stuff templates and don't belong in the `domain`
 * collection that `SeederManager` walks (the `recipes.yaml` rationale).
 *
 * Runs in bootstrap after `PersistenceManager.connect` (indexes) and before
 * `BootstrapManager.run` (which warms the `BlueprintCatalogue` singleton from
 * the just-populated collection).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Blueprint } from '../mud/lib/studio/Blueprint';
import { StuffApi } from '../mud/api/stuff';
import type { AnyConstructor } from '../mud/api/mixin';
import { PersistenceManager, Collections } from './PersistenceManager';
import type { BlueprintKind } from '@saxonberg/types';

interface BlueprintSeedEntry {
  blueprintId: string;
  name?: string;
  kind?: BlueprintKind;
  baseClass: string;
  mixinNames?: string[];
  classPath?: string;
  parent?: string;
  blessed?: boolean;
  description?: string;
}

interface BlueprintSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/blueprints.yaml. */
  seedPath?: string;
}

export class BlueprintSeeder {
  public static async run(opts: BlueprintSeedOptions = {}): Promise<number> {
    // The signature index of everything already stored — the idempotency +
    // dedup spine for both layers.
    const existing = await Blueprint.find<Blueprint>({});
    const bySignature = new Map<string, Blueprint>();
    // The set of blueprintIds already stored. A class whose *signature*
    // changed (e.g. a mixin added to Avatar) derives the same `blueprintId`
    // but a new signature, so the signature-dedup passes yet the unique
    // `blueprintId` index would throw E11000 on insert. Guarding on the id
    // too keeps the derived-skeleton pass idempotent across signature drift
    // — a redeploy re-seeds a populated DB without a fatal boot crash.
    const byId = new Set<string>();
    for (const bp of existing) {
      const sig = bp.getSignature();
      if (sig) bySignature.set(sig, bp);
      if (bp.blueprintId) byId.add(bp.blueprintId);
    }

    let inserted = 0;
    inserted += await BlueprintSeeder.#deriveSkeleton(bySignature, byId);
    inserted += await BlueprintSeeder.#curatedOverlay(bySignature, opts);

    console.info(
      `BlueprintSeeder: ${inserted} new blueprint${inserted === 1 ? '' : 's'}`
    );
    return inserted;
  }

  /**
   * Layer (a): one `concrete` blueprint per distinct backing `class` path,
   * deduped on the introspected signature. Class paths that fail to resolve
   * (stale/moved modules) are skipped with a warning, never fatal.
   */
  static async #deriveSkeleton(
    bySignature: Map<string, Blueprint>,
    byId: Set<string>
  ): Promise<number> {
    let classPaths: string[];
    try {
      const raw = await PersistenceManager.get()
        .getCollection(Collections.Domain)
        .distinct('class');
      classPaths = raw.filter(
        (c): c is string => typeof c === 'string' && c.length > 0
      );
    } catch (err) {
      console.warn(
        `BlueprintSeeder: could not enumerate domain classes: ${(err as Error).message}`
      );
      return 0;
    }

    let inserted = 0;
    for (const classPath of classPaths) {
      let ctor: AnyConstructor;
      try {
        ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
      } catch (err) {
        console.warn(
          `BlueprintSeeder: skipping ${classPath} (unresolvable): ` +
            (err as Error).message
        );
        continue;
      }
      const signature = Blueprint.signatureOf(ctor);
      if (bySignature.has(signature)) continue; // dedup on signature

      const id = BlueprintSeeder.#derivedId(classPath);
      // A blueprint already holds this id under a *different* signature
      // (the class's structure drifted since it was last seeded). Skip
      // rather than collide on the unique `blueprintId` index — additive,
      // never-removes, and the curated overlay / on-demand regen own
      // accuracy for a drifted skeleton.
      if (byId.has(id)) continue;

      const bp = new Blueprint();
      bp.blueprintId = id;
      bp.signature = signature;
      bp.baseClass = Blueprint.baseClassOf(ctor);
      bp.mixinNames = Blueprint.mixinNamesOf(ctor);
      bp.kind = 'concrete';
      bp.classPath = classPath;
      bp.blessed = false;
      bp.name = BlueprintSeeder.#derivedName(classPath);
      await bp.save();
      bySignature.set(signature, bp);
      byId.add(id);
      inserted++;
    }
    return inserted;
  }

  /**
   * Layer (b): the curated overlay. Attaches a name/blessing to the derived
   * skeleton entry with the matching signature (in place, once), or inserts a
   * fresh curated blueprint when no class produced that composition.
   */
  static async #curatedOverlay(
    bySignature: Map<string, Blueprint>,
    opts: BlueprintSeedOptions
  ): Promise<number> {
    const path = opts.seedPath ?? BlueprintSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`BlueprintSeeder: no seed file at ${path}, skipping overlay.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { blueprints?: BlueprintSeedEntry[] }
      | BlueprintSeedEntry[]
      | null;
    const entries: BlueprintSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.blueprints)
        ? parsed!.blueprints!
        : [];

    let inserted = 0;
    for (const entry of entries) {
      BlueprintSeeder.#validate(entry, path);

      // A concrete kind names a real class: introspect it for the true
      // signature (so a curated name attaches to the derived skeleton rather
      // than duplicating it with a hand-enumerated, possibly-drifted mixin
      // list). A pure-composition entry uses its declared base + mixins.
      let baseClass = entry.baseClass;
      let mixinNames = [...new Set(entry.mixinNames ?? [])].sort();
      if (entry.classPath && (!entry.mixinNames || entry.mixinNames.length === 0)) {
        try {
          const ctor = (await StuffApi.loadClassByPath(
            entry.classPath
          )) as AnyConstructor;
          baseClass = Blueprint.baseClassOf(ctor);
          mixinNames = Blueprint.mixinNamesOf(ctor);
        } catch (err) {
          console.warn(
            `BlueprintSeeder: curated '${entry.blueprintId}' classPath ` +
              `${entry.classPath} unresolvable: ${(err as Error).message}`
          );
        }
      }
      const signature = Blueprint.signatureFromParts(baseClass, mixinNames);
      const existing = bySignature.get(signature);

      if (existing) {
        // Attach curated identity to an un-blessed derived skeleton, once.
        if (existing.isBlessed()) continue;
        existing.name = entry.name ?? existing.getName();
        existing.kind = entry.kind ?? existing.getKind();
        if (entry.classPath) existing.classPath = entry.classPath;
        existing.parent = entry.parent ?? '';
        existing.description = entry.description ?? '';
        existing.blessed = entry.blessed ?? true;
        await existing.save();
        continue;
      }

      // No class produced this composition — insert the curated blueprint.
      const bp = new Blueprint();
      bp.blueprintId = entry.blueprintId;
      bp.signature = signature;
      bp.name = entry.name ?? entry.blueprintId;
      bp.baseClass = baseClass;
      bp.mixinNames = mixinNames;
      bp.kind = entry.kind ?? 'composition';
      bp.classPath = entry.classPath ?? '';
      bp.parent = entry.parent ?? '';
      bp.blessed = entry.blessed ?? true;
      bp.description = entry.description ?? '';
      await bp.save();
      bySignature.set(signature, bp);
      inserted++;
    }
    return inserted;
  }

  static #validate(entry: BlueprintSeedEntry, path: string): void {
    if (!entry || typeof entry.blueprintId !== 'string' || !entry.blueprintId) {
      throw new Error(
        `BlueprintSeeder: malformed entry in ${path}: missing 'blueprintId'`
      );
    }
    if (typeof entry.baseClass !== 'string' || !entry.baseClass) {
      throw new Error(
        `BlueprintSeeder: blueprint '${entry.blueprintId}' missing 'baseClass'`
      );
    }
  }

  /** Deterministic, unique id for a derived skeleton row (stable re-runs). */
  static #derivedId(classPath: string): string {
    return 'bp-' + BlueprintSeeder.#slug(classPath);
  }

  /** A readable derived name from a class path's last segment. */
  static #derivedName(classPath: string): string {
    const leaf = classPath.split('/').filter(Boolean).pop() ?? classPath;
    return leaf;
  }

  static #slug(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/blueprints.yaml');
  }
}
