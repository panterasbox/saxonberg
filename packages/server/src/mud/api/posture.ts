/**
 * PostureApi — slot+state mechanics for posture verbs.
 *
 * Pure mechanism — no messaging. Verb controllers (Sit, Lie, Kneel,
 * Stand, Mount, …) own their own `MessageApi.scene(...).send()` calls
 * because narration is verb-specific and controllers are the right
 * layer for verb-specific surface. PostureApi just does the slot
 * swap and posture-string flip; callers shape success/failure prose.
 *
 * `transferPosture` is the workflow consolidator: atomically vacate
 * the actor's current posture-bearing slot, find a posture-accepting
 * slot on the target, occupy it, set the actor's `Posed` posture
 * string. Returns a discriminated result so callers can shape their
 * own failure summary.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link PostureLogic} singleton at `/obj/api/posture`,
 * reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/posture` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Slottable } from '../lib/slot/Slottable';
import type { Slotted } from '../lib/slot/Slotted';
import type { Postured } from '../lib/slot/Postured';
import type { Posed } from '../lib/character/Posed';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { PostureLogic } from '../obj/api/PostureLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

/**
 * Outcome of `transferPosture`. On success the controller emits its
 * verb-specific narration; on failure the controller emits the
 * summary as a Scene frame and `ctx.note({kind: 'controller-rejected',
 * reason})` so the dispatch-response envelope carries the structured
 * signal. `verb` is folded into the "no-accepting-slot" message
 * ("you can't `sit` on the wallpaper") since that's the one failure
 * mode where verb name reads naturally.
 *
 * `reason` is a stable kebab-case identifier that controllers
 * forward into the `controller-rejected` note kind: `'no-posture-slot'`
 * when the target accepts no slot for this posture, `'occupied'` when
 * every candidate slot is full, `'transfer-failed'` when the
 * underlying `SlotApi.transferOccupancy` throws.
 */
export type PostureTransferResult =
  | { ok: true; host: Stuff & Slotted; slot: string }
  | { ok: false; reason: string; summary: string };

const LOGIC_PATH = '/obj/api/posture';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PostureLogic', import.meta.url)
);

/** Resolve the HMR-able PostureLogic singleton (sync). */
function logic(): PostureLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PostureLogic'
      ) as typeof PostureLogic | null) ?? PostureLogic)()
  );
}

export class PostureApi {
  /**
   * Atomic posture transfer. Vacates any current posture-bearing
   * slot, finds a slot on `target` accepting `posture`, occupies
   * it, and sets the actor's `Posed` posture string.
   *
   * `verb` is used only for the "no posture-accepting slot" failure
   * surface ("you can't `sit` on …") — every other failure phrases
   * itself naturally without the verb name.
   *
   * Throws on type-shape violations (target not Postured, actor not
   * Posed/Slottable) — those are validator-should-have-caught cases,
   * not user-facing failures.
   */
  public static transferPosture(
    actor: Stuff & Posed & Slottable,
    target: Stuff & Postured,
    posture: string,
    verb: string
  ): PostureTransferResult {
    return logic().transferPosture(actor, target, posture, verb);
  }

  /**
   * Vacate every posture-bearing slot the actor currently occupies.
   * Returns the count of slots vacated. No-op if the actor isn't
   * Slottable. Does NOT touch the actor's `Posed` posture string —
   * callers (typically `StandController`) flip it to `Postures.Stand`
   * separately so the value is explicit at the call site.
   */
  public static vacatePostureBearingSlots(actor: Stuff & Posed): number {
    return logic().vacatePostureBearingSlots(actor);
  }

  /**
   * Find the (host, slot) pair the candidate currently occupies that
   * is posture-bearing (i.e. its `SlotSpec.postures` is non-empty).
   * Returns null if the candidate occupies no posture-bearing slot.
   *
   * The substrate guarantees a single actor occupies at most one
   * posture-bearing slot at a time — `transferPosture` enforces this
   * by vacating before occupying. The first match wins.
   */
  public static findCurrentPostureBearingSlot(
    candidate: Stuff & Slottable
  ): { host: Stuff & Slotted; slot: string } | null {
    return logic().findCurrentPostureBearingSlot(candidate);
  }
}

SecurityApi.decorateApiClass(PostureApi);
