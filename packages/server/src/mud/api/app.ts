/**
 * AppApi — the application-level operations surface.
 *
 * The stable, caller-facing home for application-wide operations. Its first
 * responsibility is the application-settings read/write surface (over the
 * `AppSettings` singleton Document); future operator operations
 * (`shutdown()`, MOTD, maintenance mode) land here as the engine grows.
 *
 * **Runtime operations only.** Seeding (`AppSettingsSeeder`) and the boot
 * cache-warm (`AppSettings.warm`) are backend startup infrastructure, NOT
 * methods here — deliberately unlike `WorldClockApi.boot()`, because the
 * clock's boot starts a running subsystem whereas app settings have nothing
 * to start.
 *
 * Distinct from the backend `Application` class (`packages/server/src/backend/
 * Application.ts`), which is server/OAuth/signup orchestration a layer down.
 *
 * Reads are synchronous from the warmed cache (the evac path in
 * `Container.cleanupOnDestruct` cannot await) and ungated — internal engine
 * consumers (evac, avatar-mint) call them. The values are guaranteed present
 * by the seeder, so reads just hit the DB-backed cache; there are no
 * code-side defaults. Mutation (`setSetting`) is reached only through the
 * developer-gated `config` verb; the gate lives at the verb.
 */

import { SecurityApi } from "./security";
import { AppSettings } from "../lib/config/AppSettings";

export class AppApi {
  private constructor() {}

  /**
   * The current value of a setting (the seeded-or-operator-set value), or
   * `''` for a key that was never seeded or set. Synchronous (cached); safe
   * from no-await consumers.
   */
  static setting(key: string): string {
    return AppSettings.getCached().getValue(key) ?? "";
  }

  /**
   * Every setting and its current value — the keys present in the bag
   * (seeded + any operator-set ad-hoc keys). Backs the `config` listing.
   */
  static settings(): Record<string, string> {
    return AppSettings.getCached().getValues();
  }

  /**
   * Set a setting: write the key into the bag, persist the row, and (by
   * mutating the very instance the cache holds) refresh the cache. Open
   * namespace — any key is accepted; the `config` verb surfaces a soft note
   * for unregistered keys.
   */
  static async setSetting(key: string, value: string): Promise<void> {
    const row = AppSettings.getCached();
    row.setValue(key, value);
    await row.save();
  }
}

SecurityApi.decorateApiClass(AppApi);
