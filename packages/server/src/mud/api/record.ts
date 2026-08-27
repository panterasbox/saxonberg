/**
 * RecordApi — the record layer: **what the server remembers for you,
 * and how you get it back.**
 *
 * One subsystem, three faces:
 *
 *  - **The frame store.** A per-player rolling window of the frames you
 *    were actually delivered, written once per delivery at the Avatar's
 *    sensor rather than once per connected surface. Before it existed
 *    the client buffer was the *only* copy of your scrollback.
 *  - **`recall`.** One verb over several corpora — your frames, the
 *    wiki, the forums — with the corpus as a named argument so a fourth
 *    is an entry rather than a verb.
 *  - **The reset policy.** What survives the night, and the job that
 *    enforces it. See {@link RecordApi.wipe}.
 *
 * ## ⚠⚠ Owner-only, and structurally so
 *
 * A player's frame store is readable by that player: not by a wizard
 * through an ordinary read, not by another character, not by a card.
 * **There is no read on this face that takes an owner.** Every read
 * derives its subject from the acting context, so "read someone else's
 * record" is not a call that can be written, rather than one that is
 * refused at runtime.
 *
 * Stating it matters because the frames themselves are not all
 * self-addressed — a room frame you received names other people, so the
 * store contains third-party content by construction. The gate is on
 * the *store*, not on each frame's content, and that is the only
 * tractable place for it.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link RecordLogic} singleton at `/platform/idea/api/record`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /platform/idea/api/record` reloads it.
 *
 * See docs/subsystems/record-layer.md.
 */

import type {
  MessageFrame,
  RecallHit,
  RecallScope,
  StoredFrameRecord,
} from '@saxonberg/types';
import { fileURLToPath } from 'url';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ExecutionContextApi } from './execution-context';
import { SecurityApi } from './security';
import { PackApi } from './pack';
import { AccessApi } from './access';
import { AppApi } from './app';
import { ScheduleApi } from './schedule';
import { AppSettingKeys } from '../lib/config/AppSettings';
import { RecordLogic, type WipeReport } from '../platform/idea/api/RecordLogic';
import type { Stuff } from '../lib/stuff/Stuff';

export type { WipeReport, WipeLine } from '../platform/idea/api/RecordLogic';

/** A day. The reset is nightly by name and by default. */
const DEFAULT_RESET_MS = 24 * 60 * 60 * 1000;

/** One AppSettings read that survives an unwarmed store. */
function readSetting(key: string): string {
  try {
    return AppApi.setting(key) ?? '';
  } catch {
    return '';
  }
}

const LOGIC_PATH = '/platform/idea/api/record';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/RecordLogic', import.meta.url),
);

/** Resolve the HMR-able RecordLogic singleton (sync). */
function logic(): RecordLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, 'RecordLogic') as
        | typeof RecordLogic
        | null) ?? RecordLogic)(),
  );
}

/**
 * A durable owner key for a Stuff, or `''` when it has none.
 *
 * ⭐ The key is the **playerId**, not the `stuffId`: a stuffId is a
 * runtime identity that dies with the process, and a record keyed on one
 * would be empty every restart while looking healthy.
 */
function ownerKeyOf(subject: unknown): string {
  const s = subject as { getPlayerId?: () => string } | null;
  if (!s || typeof s.getPlayerId !== 'function') return '';
  try {
    return s.getPlayerId() ?? '';
  } catch {
    return '';
  }
}

/** The context-derived subject for every read. Never a parameter. */
function actingOwner(): string {
  return ownerKeyOf(ExecutionContextApi.getActingAuthor());
}

export class RecordApi {
  private constructor() {}

  /* ─── the frame store ─── */

  /**
   * Retain one delivered frame for `owner`.
   *
   * ⚠⚠ **Synchronous, allocation-cheap, and does no I/O.** This is
   * called from the message fan-out — the highest-volume path in the
   * system — so it stamps a sequence number, buffers, and returns. A
   * recurring writer does the Mongo work.
   *
   * Called from `Avatar.handleMessage`, which is reached **once per
   * delivery** no matter how many Interactives the avatar multiplexes
   * to. A tap per surface would record the same frame twice for a
   * player on two devices.
   */
  public static record(owner: Stuff, frame: MessageFrame): void {
    const key = ownerKeyOf(owner);
    if (!key) return;
    logic().record(key, frame);
  }

  /**
   * Drain the write buffer now. The shutdown / test seam; the recurring
   * writer is the normal path.
   */
  public static async flush(): Promise<void> {
    await logic().flush();
  }

  /**
   * The acting player's most recent frames, oldest→newest.
   *
   * The reconnect backfill reads this. ⚠ It is what turns the client
   * buffer from *the only copy* into a **cache**, which is a change to
   * the meaning of an existing behaviour rather than a new one — see
   * `ConnectionEstablishedPayload.frameBackfill`.
   */
  public static async recent(limit = 300): Promise<StoredFrameRecord[]> {
    return logic().recent(actingOwner(), limit);
  }

  /**
   * The session ceremony's backfill: *act as this avatar, then read
   * your own record.*
   *
   * ⚠ The subject is a parameter here and nowhere else, for a reason
   * that is mechanical rather than a relaxation of D3. `Avatar.enter`
   * runs outside any command frame, so there is no acting context to
   * derive from — and only framework files (`mud/api/**`,
   * `mud/lib/security/**`, `backend/**`) may open one, which is the
   * guard that stops mudlib code from claiming to be somebody. So the
   * frame is opened HERE, in the Api tier, and `recent()` above stays
   * the single owner-derived read that every other caller uses.
   *
   * The confidentiality claim is unchanged: this does not widen what
   * can be read, it names who is reading. Caller must already hold the
   * Avatar — the same trust `PersistableApi.capture(host)` assumes.
   */
  public static async backfill(
    owner: Stuff,
    limit = 300,
  ): Promise<StoredFrameRecord[]> {
    return ExecutionContextApi.runRoot(
      null,
      'record.backfill',
      async (): Promise<StoredFrameRecord[]> => {
        ExecutionContextApi.tagActingAuthor(owner);
        return RecordApi.recent(limit);
      },
    );
  }

  /**
   * Search one corpus. `frames` is the acting player's own store;
   * `wiki` and `forums` are shared and carry their own visibility rules.
   */
  public static async recall(
    scope: RecallScope,
    search: string,
  ): Promise<RecallHit[]> {
    return logic().recall(actingOwner(), scope, search);
  }

  /* ─── the nightly reset ─── */

  /**
   * Remove every collection the reset policy marks, and re-establish
   * what the world cannot run without.
   *
   * ⚠⚠ **Destructive by design, and there is no reflog.** Three things
   * make that survivable and all three are load-bearing:
   *
   *  - `dryRun` counts what it would take, using the SAME predicate the
   *    enforce path deletes on;
   *  - every run logs, loudly, per collection;
   *  - `RESET_DISPOSITIONS` is a total `Record<Collections, …>`, so a
   *    new collection cannot ship without a decision — the coverage
   *    fails closed at build time rather than at an audit.
   *
   * ⭐ The survivors: `documents` where `kind === 'release'`, plus the
   * seeded / pack-installed world content the boot-only installers
   * cannot replace mid-process. Everything else is player state and it
   * goes. See `lib/persistence/ResetPolicy.ts` for the reason on each
   * row.
   *
   * ⚠ The re-seed and the re-provision afterwards are not tidiness —
   * `groups` carries the axis groups and the packs' groups, `parcels`
   * every title, so without them every resource-targeted access read
   * fails closed until somebody restarts the process.
   */
  public static async wipe(
    opts: { dryRun?: boolean } = {},
  ): Promise<WipeReport> {
    const dryRun = opts.dryRun ?? true;
    const report = await logic().wipe({ dryRun });
    if (!dryRun) {
      try {
        await AccessApi.reseedSystemGroups();
        // The wipe took `parcels` and `groups`: re-grant every applied
        // pack's `requires` (content-packs wave 3 — with no state default,
        // a world with no titles refuses every `can` until restart, the
        // founder included). Idempotent: groups re-minted empty, titles
        // re-granted.
        await PackApi.reprovision();
      } catch (err) {
        // Loud, and not swallowed into the report: a wipe that left the
        // world without its system groups is a broken world, and the
        // operator has to know that from the log rather than from a
        // player reporting that nothing works.
        console.error('[reset] system-group re-seed FAILED', err);
      }
    }
    return report;
  }

  /**
   * Install the recurring reset, if this server is armed for one.
   *
   * ⚠⚠ **Off unless explicitly armed.** `world.reset.mode` follows the
   * residency-sweep precedent: absent or `dry-run` logs what it would
   * remove and removes nothing; only `enforce` deletes. A destructive
   * job that ships on by default is a data-loss bug with a schedule.
   *
   * ⚠ It also refuses to run enforcing while `world.resetPolicy` is
   * unset. That setting is the PROSE the front door prints, and a
   * server that wipes without printing it is a server whose front page
   * is silently lying about what happens to your work. The two are
   * armed together or not at all.
   */
  public static boot(): void {
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
    const every = Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : DEFAULT_RESET_MS;
    console.warn(
      `[reset] armed in ${mode} mode, every ${Math.round(every / 3600000)}h`,
    );
    ScheduleApi.recurring(every, () => {
      void RecordApi.wipe({ dryRun: mode !== 'enforce' }).catch((err) =>
        console.error('[reset] run failed', err),
      );
    });
  }

  /* ─── test seams ─── */

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAll();
  }

  public static _pendingCountForTesting(): number {
    SecurityApi.assertTestOnly('_pendingCountForTesting');
    return logic()._pendingCount();
  }

  /**
   * Trim one owner's window now, skipping the lazy-eviction slack.
   *
   * ⚠ The bound is the property; the slack constant is an
   * implementation detail. A test that pushed `EVICT_SLACK` frames to
   * watch the trim happen would be pinning the constant, and would go
   * green for the wrong reason the day it changes.
   */
  public static async _evictNowForTesting(owner: string): Promise<void> {
    SecurityApi.assertTestOnly('_evictNowForTesting');
    await logic()._evictNow(owner);
  }
}

SecurityApi.decorateApiClass(RecordApi);
