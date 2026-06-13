/**
 * AppSettings — the singleton application-config record.
 *
 * A `Document` (plain MongoDB row, NOT Stuff) holding a single open
 * key/value bag of application-wide, operator-managed settings. The fourth
 * config category beyond per-player `settings` (`EnvironmentMixin`),
 * per-Stuff `Propertied`, and client-UI-state; distinct from infra/secrets
 * (`.env` / Parameter Store).
 *
 * Shape mirrors the {@link ../time/WorldClockState | `WorldClockState`}
 * precedent — one row in its own collection, found via `find({})` with a
 * Mongo-assigned `_id`, seeded with code defaults on first boot — but the
 * persisted state is a SINGLE generic `values` bag, never a field per
 * setting. `persistentFields = ['values']` never grows: adding a setting
 * is a registry entry (`lib/config/keys.ts`) plus a consumer, never a
 * change to this file.
 *
 * The runtime read/write surface is `AppApi` (operations only). Seeding and
 * cache-warming are backend concerns: `AppBootstrap.run` awaits
 * `loadOrSeed()` once at startup, which seeds the row from the registry on
 * a fresh DB and warms the cache `AppApi.setting` reads synchronously (the
 * evac path cannot await). This Document is pure persistence + that cache.
 */

import { Document } from "../persistence/Document";
import { SecurityApi } from "../../api/security";
import { AppSettingDefaults } from "./keys";

export class AppSettings extends Document {
  static collectionName = "app_settings";
  static persistentFields = ["values"];

  /**
   * The open key/value bag — the ONLY persistent field, forever. An
   * unmarshalled plain object: `Record<string,string>` round-trips through
   * Mongo natively (no `fieldMarshallers` entry).
   */
  values: Record<string, string> = {};

  /**
   * The in-memory singleton, warmed once at boot by {@link loadOrSeed}.
   * Held here (not on `AppApi`) so the Api stays a stateless façade and the
   * cache lives with the record that produces it.
   */
  private static _cached: AppSettings | null = null;

  /**
   * Load the singleton row, seeding it from the registry on an empty
   * collection, and warm the cache. Idempotent: a second boot finds the
   * existing row and does not re-insert. Called once from `AppBootstrap`.
   *
   * Unlike `WorldClockState` (which defers its first save), the freshly
   * seeded row is persisted here so a fresh DB has exactly one
   * `app_settings` row immediately.
   */
  static async loadOrSeed(): Promise<AppSettings> {
    const rows = await AppSettings.find({});
    let instance = rows[0];
    if (!instance) {
      instance = new AppSettings();
      instance.values = { ...AppSettingDefaults };
      await instance.save();
    }
    AppSettings._cached = instance;
    return instance;
  }

  /**
   * The warmed singleton. Throws loudly if read before boot warmed it — a
   * boot-ordering bug, never a silent `undefined` into a sync consumer.
   */
  static getCached(): AppSettings {
    if (!AppSettings._cached) {
      throw new Error(
        "AppSettings.getCached: cache not warmed — AppSettings.loadOrSeed() " +
          "must run at boot (AppBootstrap) before any consumer reads a setting.",
      );
    }
    return AppSettings._cached;
  }

  /** Host-internal bag accessors. External callers go through `AppApi`. */
  getValue(key: string): string | undefined {
    return this.values[key];
  }

  setValue(key: string, value: string): void {
    this.values[key] = value;
  }

  /** A snapshot copy of the whole bag (for the `config` listing). */
  getValues(): Record<string, string> {
    return { ...this.values };
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("AppSettings._resetForTesting");
    AppSettings._cached = null;
  }
}
