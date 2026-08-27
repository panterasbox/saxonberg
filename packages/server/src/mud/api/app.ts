/**
 * AppApi — the application-level operations surface.
 *
 * The stable, caller-facing home for application-wide operations. Its first
 * responsibility is the application-settings read/write surface (over the
 * `AppSettings` singleton Document); future operator operations
 * (`shutdown()`, MOTD, maintenance mode) land here as the engine grows.
 *
 * **Runtime operations only.** Seeding (the platform pack's `settings` kind) and the boot
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
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link AppLogic} singleton at `/platform/idea/api/app`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/app` reloads it.
 */

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { AppLogic } from "../platform/idea/api/AppLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

const LOGIC_PATH = "/platform/idea/api/app";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/AppLogic", import.meta.url)
);

/** Resolve the HMR-able AppLogic singleton (sync). */
function logic(): AppLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "AppLogic"
      ) as typeof AppLogic | null) ?? AppLogic)()
  );
}

export class AppApi {
  private constructor() {}

  /**
   * The current value of a setting (the seeded-or-operator-set value), or
   * `''` for a key that was never seeded or set. Synchronous (cached); safe
   * from no-await consumers.
   */
  static setting(key: string): string {
    return logic().setting(key);
  }

  /**
   * Every setting and its current value — the keys present in the bag
   * (seeded + any operator-set ad-hoc keys). Backs the `config` listing.
   */
  static settings(): Record<string, string> {
    return logic().settings();
  }

  /**
   * Set a setting: write the key into the bag, persist the row, and (by
   * mutating the very instance the cache holds) refresh the cache. Open
   * namespace — any key is accepted; the `config` verb surfaces a soft note
   * for unregistered keys.
   */
  static async setSetting(key: string, value: string): Promise<void> {
    return logic().setSetting(key, value);
  }
}

SecurityApi.decorateApiClass(AppApi);
