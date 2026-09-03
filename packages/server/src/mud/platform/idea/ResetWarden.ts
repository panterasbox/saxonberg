/**
 * ResetWarden — the self-warming home of the nightly world reset
 * (the boot()-retirement direction: an operator-armed destructive
 * schedule does not belong on a consumer Api).
 *
 * `postRegister` arms the recurring reset, if this server is armed for
 * one. Reads dials — safe post-P1 (AppSettings warms at step zero,
 * before the boot manifest runs).
 *
 * ⚠⚠ **Off unless explicitly armed.** `world.reset.mode` follows the
 * residency-sweep precedent: absent or `dry-run` logs what it would
 * remove and removes nothing; only `enforce` deletes. A destructive
 * job that ships on by default is a data-loss bug with a schedule.
 *
 * ⚠ It also refuses to arm enforcing while `world.resetPolicy` is
 * unset. That setting is the PROSE the front door prints, and a server
 * that wipes without printing it is a server whose front page is
 * silently lying about what happens to your work. The two are armed
 * together or not at all.
 *
 * Ordered after WorldClockRegistry on the boot manifest; it must see
 * every registry it may have to re-seed afterwards, and the manifest
 * runs before the world opens.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { RecordApi } from '../../api/record';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

/** The default reset cadence when armed with no interval dial: daily. */
const DEFAULT_RESET_MS = 24 * 60 * 60 * 1000;

/** A dial read that treats an unwarmed store as unset. */
function readSetting(key: string): string {
  try {
    return AppApi.setting(key) ?? '';
  } catch {
    return '';
  }
}

const ResetWardenBase = PostRegistrationMixin(Idea);

export default class ResetWarden extends ResetWardenBase {
  /** The armed reset handle — retained so re-arm is a no-op. */
  private resetHandle: ScheduleHandle | null = null;

  /** Residency veto — the armed schedule; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'ResetWarden is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    this.arm();
  }

  /** Arm the recurring reset if the operator dialed one (idempotent). */
  public arm(): void {
    if (this.resetHandle) return;
    const mode = readSetting(AppSettingKeys.worldResetMode);
    if (!mode || mode === 'off') return;
    if (mode === 'enforce' && !readSetting(AppSettingKeys.worldResetPolicy)) {
      console.error(
        '[reset] REFUSING to arm: `world.reset.mode` is `enforce` but ' +
          '`world.resetPolicy` is unset. The front door would say nothing ' +
          'about resets while the server performed them. Set both or neither.',
      );
      return;
    }
    const intervalMs = Number(
      readSetting(AppSettingKeys.worldResetIntervalMs) || DEFAULT_RESET_MS,
    );
    const every =
      Number.isFinite(intervalMs) && intervalMs > 0
        ? intervalMs
        : DEFAULT_RESET_MS;
    console.warn(
      `[reset] armed in ${mode} mode, every ${Math.round(every / 3600000)}h`,
    );
    this.resetHandle = ScheduleApi.recurring(every, () => {
      void RecordApi.wipe({ dryRun: mode !== 'enforce' }).catch((err) =>
        console.error('[reset] run failed', err),
      );
    });
  }
}
