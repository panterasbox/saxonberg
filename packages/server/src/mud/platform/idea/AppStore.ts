/**
 * AppStore — the one app store (stream arrival D21), reached as
 * `TemplateApi.appStore()`.
 *
 * ⭐ **An app is in the store because a pack PUBLISHED it** — it ships an
 * `app-listing` document (`content/apps/<key>.yaml`) naming the `App` row a
 * device installs. Nothing searches the template table for apps: a row is
 * not an app because of where it is filed or what a field says, and the
 * store is what the packs declared when they were installed. A newly
 * published app reaches every phone that exists, because a phone installs
 * from the store at runtime like a real phone would.
 *
 * ⭐ The listing's leaf is the word `apps install <key>` types, and a word
 * means one thing: a second pack listing the same word is refused at
 * install (`words:` on the kind), so the store never holds a collision.
 * The person's own wallet, calendar and forums are not listed, so they are
 * never offered to a device.
 *
 * A document catalogue: `all()` reads every listing (documents are meant to
 * be read by kind), `byWord(key)` finds one.
 */

import { DocumentCatalogue } from "../../lib/document/DocumentCatalogue";
import type { BoundaryRole } from "../../lib/security/BoundaryRole";

/** One app in the store. */
export interface StoreApp {
  /** What `apps install <key>` types — the listing's word. */
  key: string;
  /** The `App` row a device installs. */
  path: string;
}

/** What the store answers for a key. */
export type StoreLookup = { found: StoreApp } | { missing: true };

export default class AppStore extends DocumentCatalogue<StoreApp> {
  /** A register everyone reads. */
  static boundaryRole: BoundaryRole = "commons";

  protected readonly kind = "app-listing";

  /** Validate a listing; throws naming what is wrong (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): StoreApp {
    const key = path.slice(path.lastIndexOf("/") + 1);
    const app = typeof data.app === "string" ? data.app.trim() : "";
    if (!app.startsWith("/")) throw new Error(`app listing '${path}': 'app' must name an App row's path`);
    return { key, path: app };
  }

  /** Every published app, by key order. */
  public async published(): Promise<StoreApp[]> {
    return (await this.all()).sort((a, b) => a.key.localeCompare(b.key));
  }

  /** The published app keyed `key`, or nothing. */
  public async lookup(key: string): Promise<StoreLookup> {
    const found = await this.byWord(key.trim().toLowerCase());
    return found[0] ? { found: found[0].value } : { missing: true };
  }
}
