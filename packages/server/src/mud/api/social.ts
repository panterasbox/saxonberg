/**
 * SocialApi — the gated dev-facing surface for the attention-management
 * (social-graph Wave 3) layer: the per-character notify-rule store and the
 * one shared `ruleFor` first-match resolution primitive that **both** the
 * display-lensing formatter (Phase 2) and the login-notification fan-out
 * (Phase 3) call. Policy attaches to any `GroupRef`; conflicts resolve by a
 * strict ordered first-match down the viewer's list.
 *
 * Phase 1 ships the store + `ruleFor` + the `notify` verb (the floor). The
 * occupant formatter and the presence consumer extend the same
 * `SocialLogic` singleton later; `boot()` is the (currently empty) seam the
 * Phase-3 presence tap installs into.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link SocialLogic} singleton at `/obj/api/social`, reached synchronously
 * via `StuffApi.singletonSync`. `dest /obj/api/social` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { Mml } from "./mml";
import type { GroupRef } from "../lib/social/GroupProvider";
import type {
  NotifyRule,
  ResolvedRule,
  RuleForOptions,
  SetResult,
} from "../lib/social/NotifyRule";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { SocialLogic } from "../obj/api/SocialLogic";
import { fileURLToPath } from "url";

export type { NotifyRule, ResolvedRule, RuleForOptions, SetResult };

const LOGIC_PATH = "/obj/api/social";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/SocialLogic", import.meta.url),
);

/** Resolve the HMR-able SocialLogic singleton (sync). */
function logic(): SocialLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "SocialLogic",
      ) as typeof SocialLogic | null) ?? SocialLogic)(),
  );
}

export class SocialApi {
  /**
   * Boot seam (idempotent). Installs the login/logout presence relay
   * (the net-new connect/disconnect → notification consumer). Wired from
   * `AppBootstrap.run()`.
   */
  public static boot(): void {
    logic().installPresenceTap();
  }

  /**
   * Restyle a matched speaker's already-buffered message body per the
   * viewer's first-matching `onMessage` surface (a *notification* surface,
   * never feed-filtering): `full`/`summary` → highlight in the rule color,
   * `silent` → body unchanged (notification suppression only — the message
   * still renders). MQL refs are excluded (a restyle is a notification
   * surface). `body` is materialized per `viewer`. See the Phase-3b wiring
   * note on {@link SocialLogic}.
   */
  public static styleMessageFor(
    viewer: Stuff,
    speaker: Stuff,
    body: Mml,
  ): Promise<Mml> {
    return logic().styleMessageFor(viewer, speaker, body);
  }

  /**
   * Resolve the first-matching rule for `person` as seen by `viewer` —
   * the shared primitive the display formatter and the notification
   * fan-out both call. Walks the effective list (virtual `foes`/`friends`
   * baseline → stored rules → virtual `strangers`/`everyone-else` tail)
   * and returns the first whose group contains the person; `everyone-else`
   * is the always-true catch-all. `excludeMql` skips `mql:` refs (the
   * notification fan-out passes it).
   */
  public static ruleFor(
    viewer: Stuff,
    person: Stuff,
    opts?: RuleForOptions,
  ): Promise<ResolvedRule> {
    return logic().ruleFor(viewer, person, opts ?? {});
  }

  /**
   * The viewer's effective ordered rule list — stored rules spliced into
   * the virtual reserved baseline. Backs the `notify` bare-list view and
   * the settings pane projection.
   */
  public static listRules(viewer: Stuff): NotifyRule[] {
    return logic().listRules(viewer);
  }

  /**
   * Upsert a per-character rule on `ref` (any `GroupRef`), merging `patch`
   * over the existing rule or a baseline/neutral default. The 50-rule soft
   * cap is enforced by the `notify` verb before calling.
   */
  public static setRule(
    viewer: Stuff,
    ref: GroupRef,
    patch: Partial<NotifyRule>,
  ): SetResult {
    return logic().setRule(viewer, ref, patch);
  }

  /** Drop the rule keyed on `ref` (group falls to the baseline tail). */
  public static removeRule(viewer: Stuff, ref: GroupRef): boolean {
    return logic().removeRule(viewer, ref);
  }

  /**
   * Render the per-viewer occupant block for a room: the display-lensing
   * formatter (Phase 2), a sibling of `RecognitionApi.describe` one
   * cardinality up. Partitions `occupants` by the shared `ruleFor`
   * first-match into boosted (lifted + full-named + colored), named-default,
   * and density-collapsed (similarity-grouped "N <species> in <feature>" /
   * "(N others present)") buckets, modulated by the viewer's
   * `social.verbosity`. `roomSize` (renderable-organism count) drives the
   * density tier.
   *
   * Returns a **fully-resolved** `Mml` for `viewer` — resolved eagerly
   * because `ruleFor` is async while MML `toString` is sync; v1 renders the
   * block for a single known viewer (look's `toSelf`, arrival's
   * `forceCommand('look')`). The collapsed lines are `mudq:` handles
   * carrying their room-scope MQL seed so the aggregate stays targetable.
   */
  public static composeOccupants(
    viewer: Stuff,
    occupants: Stuff[],
    roomSize: number,
  ): Promise<Mml> {
    return logic().composeOccupants(viewer, occupants, roomSize);
  }

  /**
   * Reorder the rule on `ref` directly above / below `anchor` — list order
   * is precedence, so this is how a rule is made authoritative. A
   * referenced reserved label is materialized with its baseline defaults.
   */
  public static reorderRule(
    viewer: Stuff,
    ref: GroupRef,
    anchor: GroupRef,
    where: "above" | "below",
  ): boolean {
    return logic().reorderRule(viewer, ref, anchor, where);
  }
}

SecurityApi.decorateApiClass(SocialApi);
