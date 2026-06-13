/**
 * AppApi — the application-level operations surface.
 *
 * The stable, caller-facing home for application-wide operations. Its first
 * responsibility is the application-settings read/write surface (over the
 * `AppSettings` singleton Document); future operator operations
 * (`shutdown()`, MOTD, maintenance mode) land here as the engine grows.
 * That foreseen multi-operation surface is why it's an Api rather than
 * static accessors on the Document.
 *
 * **Runtime operations only.** Seeding and cache-warming are backend
 * startup infrastructure (`AppBootstrap.run` awaits `AppSettings.loadOrSeed`),
 * NOT methods here — deliberately unlike `WorldClockApi.boot()`, because the
 * clock's boot starts a running subsystem whereas app settings have nothing
 * to start.
 *
 * Distinct from the backend `Application` class (`packages/server/src/backend/
 * Application.ts`), which is server/OAuth/signup orchestration a layer down.
 * `AppApi` is the in-engine domain surface; the two share a theme, not a
 * layer.
 *
 * Reads are synchronous from the warmed cache (the evac path in
 * `Container.cleanupOnDestruct` cannot await) and ungated — internal engine
 * consumers (evac, avatar-mint) call them. Mutation (`setSetting`) is
 * reached only through the developer-gated `config` verb; the gate lives at
 * the verb (its `requiresDeveloper` validator), not duplicated here.
 */

import { SecurityApi } from "./security";
import { AppSettings } from "../lib/config/AppSettings";
import { AppSettingDefaults } from "../lib/config/keys";

export class AppApi {
  private constructor() {}

  /**
   * The current value of a setting: the persisted bag value, or the
   * registry default when the row predates the key, or `''` for a wholly
   * unknown key. Synchronous (cached); safe from no-await consumers.
   */
  static setting(key: string): string {
    const row = AppSettings.getCached();
    return row.getValue(key) ?? AppSettingDefaults[key] ?? "";
  }

  /**
   * Every setting and its current value — the registry keys (each at its
   * current-or-default value) unioned with any ad-hoc keys set into the
   * bag. Backs the `config` listing.
   */
  static settings(): Record<string, string> {
    const row = AppSettings.getCached();
    return { ...AppSettingDefaults, ...row.getValues() };
  }

  /**
   * Set a setting: write the key into the bag, persist the row, and (by
   * mutating the very instance the cache holds) refresh the cache. Open
   * namespace — any key is accepted; the `config` verb surfaces a soft
   * note for unregistered keys.
   */
  static async setSetting(key: string, value: string): Promise<void> {
    const row = AppSettings.getCached();
    row.setValue(key, value);
    await row.save();
  }
}

SecurityApi.decorateApiClass(AppApi);
