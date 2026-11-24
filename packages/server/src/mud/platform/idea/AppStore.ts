/**
 * AppStore — the one app store (stream arrival D21), reached as
 * `TemplateApi.appStore()`.
 *
 * ⭐ **The store IS the rows, and an app publishes ITSELF.** Two facts make
 * a row a published app, and neither is where it is filed: its class is an
 * `App` (or extends one), and its row says `published: true`. Every such row
 * any pack ships is in the store, wherever its path; nothing else is — no
 * document, no roster to keep, no list on each device. A phone
 * installs from it at runtime like a real phone would (the owner), so every
 * phone that exists can install a newly published app. The person's own
 * wallet, calendar and forums are unpublished rows: never listed, never
 * installable on a device.
 *
 * ⭐ **A keyed dictionary's own lazy warm** (`lint:template-scans`'s
 * sanctioned home): one read of the rows that state `published`, the first
 * time `apps` or `apps install` is typed — never at boot.
 *
 * A key is the app's own NAME (`appName: Broadcast` → `broadcast`), as
 * `apps install <key>` types it. ⚠ Two packs publishing one name is a
 * collision the store REPORTS, naming both rows, and installs neither —
 * never a silent first-wins.
 */

import { Idea } from "../../lib/stuff/Idea";
import { Template } from "../../lib/stuff/Template";
import { StuffApi } from "../../api/stuff";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";
import type { BoundaryRole } from "../../lib/security/BoundaryRole";
import App from "./App";

/** One published app in the store. */
export interface StoreApp {
  /** What `apps install <key>` types — the app's own name, lower-cased. */
  key: string;
  /** The row path an install clones. */
  path: string;
}

/** What the store answers for a key. */
export type StoreLookup =
  | { found: StoreApp }
  | { collision: readonly string[] }
  | { missing: true };

/** The store as read: published apps by key, and keys two packs claim. */
interface StoreIndex {
  apps: Map<string, StoreApp>;
  collisions: Map<string, string[]>;
}

export default class AppStore extends Idea {
  /** A register everyone reads. */
  static boundaryRole: BoundaryRole = "commons";

  // `#` (CLAUDE.md special case 3): the index is the class's own, and must
  // outlive an instance stood up again (a suite's `clearAll`, an HMR swap).
  static #index: Promise<StoreIndex> | null = null;

  /** Every published app, by key order. */
  public async published(): Promise<StoreApp[]> {
    const index = await this.index();
    return [...index.apps.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  /** The published app keyed `key`, a collision, or nothing. */
  public async lookup(key: string): Promise<StoreLookup> {
    const index = await this.index();
    const k = key.trim().toLowerCase();
    const clash = index.collisions.get(k);
    if (clash) return { collision: clash };
    const found = index.apps.get(k);
    return found ? { found } : { missing: true };
  }

  /** Forget the index — the go-live of a pack install that ships an app. */
  public forget(): void {
    AppStore.#index = null;
  }

  private index(): Promise<StoreIndex> {
    AppStore.#index ??= readIndex().catch((err: unknown) => {
      AppStore.#index = null;
      throw err;
    });
    return AppStore.#index;
  }

  /** Residency veto — the store's home; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }
}

/** The key an app is installed by: its own name, lower-cased, spaces as hyphens. */
function keyOf(row: { path: string; data?: Record<string, unknown> }): string {
  const name = typeof row.data?.appName === "string" ? row.data.appName.trim() : "";
  const word = name.length > 0 ? name : row.path.slice(row.path.lastIndexOf("/") + 1);
  return word.toLowerCase().replace(/\s+/g, "-");
}

/** One read of the rows that publish themselves (D21). */
async function readIndex(): Promise<StoreIndex> {
  const rows = await Template.findWhereDataHas("published");
  const byKey = new Map<string, string[]>();
  const isApp = new Map<string, boolean>();
  for (const row of rows) {
    const data = (row.data ?? {}) as Record<string, unknown>;
    if (data.published !== true) continue;
    if (!isApp.has(row.class)) isApp.set(row.class, await isAppClass(row.class));
    if (!isApp.get(row.class)) continue;
    const key = keyOf(row);
    byKey.set(key, [...(byKey.get(key) ?? []), row.path]);
  }
  const index: StoreIndex = { apps: new Map(), collisions: new Map() };
  for (const [key, paths] of byKey) {
    if (paths.length === 1) {
      index.apps.set(key, { key, path: paths[0]! });
    } else {
      index.collisions.set(key, paths);
      console.warn(`AppStore: '${key}' is published by ${paths.join(" and ")} — neither is installable`);
    }
  }
  return index;
}

/** Does the row's class extend `App` (any pack's app class qualifies)? */
async function isAppClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as { prototype?: unknown };
    return typeof cls === "function" && (cls === App || cls.prototype instanceof App);
  } catch {
    // @quiet a class that will not load is not an app; the installer
    // reports the row's own defect where it is installed.
    return false;
  }
}
