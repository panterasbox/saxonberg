/**
 * ⭐⭐ WatchWarden — the singleton whose `postRegister` arms the **watch
 * reconcile**: the sweep that pays a guard for standing at their post.
 *
 * The `AttendantWarden` shape (self-warming; the boot()-retirement
 * direction — an operator-shaped sweep install does not belong on a
 * consumer Api). ⚠ Unlike `AttendantWarden` the **timer lives here**
 * rather than on the Logic, for two reasons found the hard way at boot:
 *
 *   1. `ContractLogic` is deep in a circular import graph (its
 *      controllers import it, it imports their neighbours). Adding
 *      `ScheduleApi` to that graph re-entered the module before its
 *      policy consts had initialized, and every controller that
 *      imports it failed to load with `ContractWatchSweepCallers is
 *      not defined`. A TDZ error, from one import line.
 *   2. `AttendantLogic` keeps its own handle because it is entangled
 *      with that module's HMR re-assertion. This sweep only calls an
 *      Api static, so it has no such entanglement to respect.
 *
 * ⚠⚠ **Why a sweep exists here at all**, since contracts are otherwise
 * entirely lazy (`expireStale` runs on read): a watch clause is *"be at
 * place P for N hours"*, and accrual that only advanced when somebody
 * happened to read the record would pay by curiosity rather than by
 * presence. The engine has to look on its own schedule, which is what a
 * sweep is for.
 *
 * ⭐ It replaced a `watch` VERB. Typing a word never made anybody keep
 * watch — standing there is the whole of the work, and where somebody is
 * standing is a fact the engine already holds. See
 * `ContractLogic.reconcileWatches`.
 *
 * Eager via the platform pack's `boot:` manifest (role `producer`).
 */

import { Idea } from "../../lib/stuff/Idea";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { ContractApi } from "../../api/contract";
import { ScheduleApi } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import type { ScheduleHandle } from "../../api/schedule";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";

/** How often the reconcile samples, in REAL ms. */
const DEFAULT_SWEEP_MS = 30_000;

function readInt(key: string, fallback: number): number {
  try {
    const raw = Number(AppApi.setting(key));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
  } catch {
    return fallback;
  }
}

const WatchWardenBase = PostRegistrationMixin(Idea);

export default class WatchWarden extends WatchWardenBase {
  /** Residency veto — the armed sweep; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: "WatchWarden is a system singleton; never destructed",
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * ⚠ TypeScript `private`, never `#`. This is a `Stuff`, so it is
   * wrapped in the call-security Proxy and `this.#field` from a method
   * dispatched through that proxy throws *"Cannot read from private
   * field"* — which is exactly how the first cut of this failed at boot.
   * `CLAUDE.md § Member Privacy` states the rule; the proxy enforces it.
   */
  private sweep: ScheduleHandle | null = null;

  /** Arm the reconcile (idempotent). Public so a pack go-live can re-arm. */
  public async warm(): Promise<void> {
    if (this.sweep) return;
    this.sweep = ScheduleApi.recurring(
      readInt(AppSettingKeys.contractWatchSweepMs, DEFAULT_SWEEP_MS),
      () => {
        void ContractApi.reconcileWatches().catch(() => {});
      },
    );
  }
}
