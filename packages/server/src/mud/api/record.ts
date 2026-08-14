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
 * through an ordinary read, not by another character, not by a pane.
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
 * hot-reloadable {@link RecordLogic} singleton at `/obj/api/record`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/record` reloads it.
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
import { RecordLogic } from '../obj/api/RecordLogic';
import type { Stuff } from '../lib/stuff/Stuff';

const LOGIC_PATH = '/obj/api/record';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/RecordLogic', import.meta.url),
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
