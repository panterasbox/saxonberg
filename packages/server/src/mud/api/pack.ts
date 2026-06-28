/**
 * PackApi — the content-pack installer surface.
 *
 * A **content pack** is a standalone, git-versioned bundle of pure data
 * (zero TypeScript) — the slow-moving substrate content (materials, biomes,
 * quantity units) lifted out of the server into its own package
 * (`@saxonberg/content-*`). The pack files are the **source of truth**; the
 * database is a *derived install* of them.
 *
 * This Api reconciles packs into the running game:
 * - {@link PackApi.install} — the boot pass: discover every shipped pack,
 *   reconcile each into Mongo (writes only — nothing is live yet).
 * - {@link PackApi.sync} — the runtime pass (the `pack sync` dev verb):
 *   reconcile one pack AND re-hydrate the affected live singletons, so a
 *   file edit goes live with no restart.
 * - {@link PackApi.discoverPacks} — read + order the shipped pack manifests.
 *
 * Reconcile is **ownership-scoped and non-destructive**: every installed
 * `domain` row carries a `sourcePack` stamp; a run only ever touches rows
 * stamped by *that* pack (adopting pre-existing unstamped rows on first
 * install — migration without a wipe). Anything unstamped/other-stamped is
 * invisible. A pack's referenced backing classes must resolve (the
 * `requires-kernel` check) or the install aborts before any write — this is
 * the enforced content-pack ↔ mod boundary (a pack assumes classes; a mod
 * brings them).
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link PackLogic} singleton at `/obj/api/pack`.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PackLogic } from '../obj/api/PackLogic';
import { fileURLToPath } from 'url';

/** A content pack's manifest (`pack.yaml`). */
export interface PackManifest {
  /** Stable pack id (the `sourcePack` stamp value). */
  id: string;
  /** Reserved release label; nothing reads/enforces it in v1. */
  version: string;
  description?: string;
  /** Ids of packs that must install before this one. */
  dependsOn: string[];
}

/** What a single pack's install/sync run touched. */
export interface PackReconcileResult {
  packId: string;
  /** Template paths newly written. */
  inserted: string[];
  /** Template paths whose stored `data` was overwritten. */
  updated: string[];
  /** Pre-existing unstamped rows stamped + matched to file (migration). */
  adopted: string[];
  /** Stamped rows whose file vanished, removed. */
  deleted: string[];
  /** (unit, scale) tag pairs (re)loaded; 0 when the pack has no quantity kind. */
  quantityTables: number;
  /** Live instances re-hydrated (sync only; 0 at boot). */
  rehydrated: number;
}

const LOGIC_PATH = '/obj/api/pack';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PackLogic', import.meta.url),
);

/** Resolve the HMR-able PackLogic singleton (sync). */
function logic(): PackLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PackLogic',
      ) as typeof PackLogic | null) ?? PackLogic)(),
  );
}

export class PackApi {
  /**
   * Boot pass: discover every shipped content pack (from `server`'s
   * `@saxonberg/content-*` deps), order by `dependsOn`, and reconcile each
   * into the DB. Writes rows only — no re-hydrate (nothing is live yet).
   * Returns one {@link PackReconcileResult} per pack. Throws (before any
   * write for that pack) if a pack references a class the kernel lacks.
   *
   * `packRoots` overrides discovery with explicit pack-root dirs (tests).
   */
  public static async install(
    packRoots?: string[],
  ): Promise<PackReconcileResult[]> {
    return logic().install(packRoots);
  }

  /**
   * Runtime pass: reconcile one pack by id AND re-hydrate the affected live
   * singletons (the `pack sync` verb) so file edits go live with no restart.
   * `packRoot` overrides discovery with an explicit pack-root dir (tests).
   */
  public static async sync(
    packId: string,
    packRoot?: string,
  ): Promise<PackReconcileResult> {
    return logic().sync(packId, packRoot);
  }

  /** Read + order the shipped pack manifests (`dependsOn` honored). */
  public static async discoverPacks(): Promise<PackManifest[]> {
    return logic().discoverPacks();
  }
}

SecurityApi.decorateApiClass(PackApi);
