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
 * Reconcile is **ownership-scoped, non-destructive, and three-way**: every
 * installed row (a `content` template, a `descriptor_banks` bank, a
 * `documents` row of a declared kind) carries a `sourcePack` stamp; a run
 * only ever touches rows
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
import { PackLogic } from '../obj/api/PackLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

/** A content pack's manifest (`pack.yaml`). */
export interface PackManifest {
  /** Stable pack id (the `sourcePack` stamp value). */
  id: string;
  /** Reserved release label; nothing reads/enforces it in v1. */
  version: string;
  description?: string;
  /** Ids of packs that must install before this one. */
  dependsOn: string[];
  /**
   * The pack's document root: every document-kind row the pack ships
   * lands at `root + '/<contentDir>/<name>'` and is owned by `root`.
   * Optional in `pack.yaml` (defaults to `/<id>`); must start with `/`.
   */
  root: string;
}

/** What a single pack's install/sync run touched. Change lists hold record keys. */
export interface PackReconcileResult {
  packId: string;
  /** Record keys newly written. */
  inserted: string[];
  /** Record keys whose stored body was overwritten from the file. */
  updated: string[];
  /** Pre-existing unstamped rows stamped + matched to file (migration). */
  adopted: string[];
  /** Stamped rows whose file vanished, removed. */
  deleted: string[];
  /** Rows the DB changed and the file did not — the DB was kept. */
  kept: string[];
  /** Rows both sides changed differently — untouched, recorded, diagnosed. */
  conflicts: string[];
  /** Pinned rows skipped before any comparison. Reported every time. */
  pinnedSkipped: number;
  /** Rows whose baseline was (re)normalized from what was written — the
   * one-time adoption count (or a per-row missing-baseline repair). */
  normalized: number;
  /** (unit, scale) tag pairs (re)loaded; 0 when the pack has no quantity kind. */
  quantityTables: number;
  /**
   * Document rows written (insert/update/adopt) per document kind
   * (`{ emote: 34, msh: 3 }`); absent kinds are absent keys.
   */
  documents: Record<string, number>;
  /** Live instances re-hydrated (sync only; 0 at boot). */
  rehydrated: number;
  /** Set when the pack FAILED — boot continued without it (install only). */
  failure: PackFailure | null;
}

/** Why a pack's install failed; recorded on its `pack_installs` row. */
export interface PackFailure {
  /** `read` | `flat-key` | `requires-kernel` | `topics` | `reconcile`. */
  step: string;
  error: string;
  file?: string;
}

/** One row's baseline as installed: kind, hash, and the hash's preimage. */
export interface PackRowBaseline {
  kind: string;
  /** `sha256:<hex>` over the canonical body. */
  hash: string;
  /**
   * The canonical serialization the hash was taken over. Stored beside
   * the hash because `pack diff` must render three bodies, and in the
   * both-changed cell the baseline content is recoverable from nowhere
   * else (not the file, not the DB, not a git ref the DB is not pinned
   * to).
   */
  body: string;
}

/** An open three-way conflict on one row. Recomputed every reconcile. */
export interface PackConflict {
  path: string;
  kind: string;
  detectedAt: string;
  baselineHash: string;
  dbHash: string;
  packHash: string;
  reason: 'both-changed' | 'deleted-vs-edited';
}

/**
 * The installer's per-deployment ledger row (`pack_installs`, one per
 * pack) — slate A17.1's schema plus `rows[].body` and `conflicts`.
 */
export interface PackInstallRecord {
  packId: string;
  version: string;
  appliedAt: string;
  /** Who applied: an Avatar templatePath, or `bootstrap` at boot. */
  principal: string;
  /** `staged` is reserved (unwritten this cycle). */
  status: 'applied' | 'staged' | 'failed';
  failure: PackFailure | null;
  /** Reserved; written `{}` this cycle. */
  parameters: Record<string, unknown>;
  /** Baselines keyed by record key (`/domain/…`, `/name-banks/<key>`, `/emotes/<verb>`). */
  rows: Record<string, PackRowBaseline>;
  /** Record keys the operator has claimed; skipped before any comparison. */
  pins: string[];
  conflicts: PackConflict[];
  /** RAM-only kinds that ran (`quantity`) — noted, never baselined. */
  sideEffects: { kinds: string[] };
}

/** One discovered-or-recorded pack, as `pack status` reports it. */
export interface PackStatusReport {
  packId: string;
  /** Present in this build's `@saxonberg/content-*` deps. */
  discovered: boolean;
  /** The manifest version (when discovered). */
  manifestVersion: string | null;
  /** The install record (when one exists for this deployment). */
  record: Pick<
    PackInstallRecord,
    'version' | 'appliedAt' | 'principal' | 'status' | 'failure' | 'pins' | 'conflicts'
  > | null;
}

/** One planned action from a dry run. */
export interface PackPlannedAction {
  op:
    | 'insert'
    | 'update'
    | 'adopt'
    | 'delete'
    | 'keep'
    | 'converge'
    | 'conflict'
    | 'pinned-skip'
    | 'normalize'
    /** archive-never-reap kinds (subjects): a vanished file archives its row. */
    | 'archive'
    /** merge-missing kinds (settings): missing keys merged into the singleton. */
    | 'merge'
    /** CAS kinds (wiki): the write is submitted to the kind's own edit path. */
    | 'submit';
  key: string;
  kind: string;
}

/** The full change set a `sync` WOULD apply — computed, never written. */
export interface PackDryRunReport {
  packId: string;
  actions: PackPlannedAction[];
  conflicts: string[];
  pinnedSkipped: number;
}

/** One body in a three-way diff: the hash and a readable rendering. */
export interface PackDiffBody {
  hash: string;
  body: string;
}

/** The three bodies for one record key. Absent sides are `null`. */
export interface PackDiffEntry {
  path: string;
  kind: string;
  /** As installed (from the record). */
  baseline: PackDiffBody | null;
  /** The database row now. */
  yours: PackDiffBody | null;
  /** The pack file now. */
  theirs: PackDiffBody | null;
}

export interface PackDiffReport {
  packId: string;
  entries: PackDiffEntry[];
}

/** How `pack resolve` settles a conflict. There is no bare keep. */
export type PackResolveMode = 'take-pack' | 'keep-pin' | 'export';

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
   * `packRoot` overrides discovery with an explicit pack-root dir, and
   * `packRoots` the install set the flat-key check runs against (tests).
   */
  public static async sync(
    packId: string,
    packRoot?: string,
    packRoots?: string[],
  ): Promise<PackReconcileResult> {
    return logic().sync(packId, packRoot, packRoots);
  }

  /** Read + order the shipped pack manifests (`dependsOn` honored). */
  public static async discoverPacks(): Promise<PackManifest[]> {
    return logic().discoverPacks();
  }

  /**
   * Join the discovered manifests with the `pack_installs` records:
   * status, version, principal, open conflicts, pins, failure. Reports
   * undiscovered-but-recorded and discovered-but-unrecorded packs too.
   */
  public static async status(packId?: string): Promise<PackStatusReport[]> {
    return logic().status(packId);
  }

  /**
   * The exact change set a `sync` would apply to one pack — computed
   * from the same planner `sync` applies, with the apply half never
   * called. Zero writes by construction.
   */
  public static async dryRun(
    packId: string,
    packRoot?: string,
  ): Promise<PackDryRunReport> {
    return logic().dryRun(packId, packRoot);
  }

  /**
   * The three bodies (baseline / yours / theirs) for one record key, or
   * for every open conflict when `path` is omitted. Presentation is the
   * verb's job; this returns bodies and hashes.
   */
  public static async diff(
    packId: string,
    path?: string,
    packRoot?: string,
  ): Promise<PackDiffReport> {
    return logic().diff(packId, path, packRoot);
  }

  /**
   * Settle a conflict: `take-pack` writes the file's row and rebaselines;
   * `keep-pin` claims the DB row (a pin — pinned rows never compare
   * again); `export` writes the DB row back to the pack's workspace
   * source file and leaves the conflict open for the next `sync` to
   * observe file == DB and clear it.
   */
  public static async resolve(
    packId: string,
    path: string,
    mode: PackResolveMode,
    packRoot?: string,
  ): Promise<PackReconcileResult | null> {
    return logic().resolve(packId, path, mode, packRoot);
  }

  /** Claim a row: it is skipped before any comparison until unpinned. */
  public static async pin(packId: string, path: string): Promise<string[]> {
    return logic().pin(packId, path);
  }

  /** Release a pin; the next reconcile compares the row again. */
  public static async unpin(packId: string, path: string): Promise<string[]> {
    return logic().unpin(packId, path);
  }
}

SecurityApi.decorateApiClass(PackApi);
