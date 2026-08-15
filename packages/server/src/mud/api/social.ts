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
import type Avatar from "../obj/Avatar";
import type { PresenceStatus, RosterRow } from "@saxonberg/types";
import { SocialLogic } from "../obj/api/SocialLogic";
import { PresenceLogic } from "../obj/api/PresenceLogic";
import { ProfileLogic } from "../obj/api/ProfileLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

export type { NotifyRule, ResolvedRule, RuleForOptions, SetResult };

// Wire types crossing to the client live in @saxonberg/types (single
// source of truth); re-exported from this — the social-graph read face —
// since `composeRow`/`composeCard` speak them.
export type { PresenceStatus, RosterRow, RosterFrame } from "@saxonberg/types";

/** The proper-name surface (recognition-gated). */
export interface ProfileNameSurface {
  honorific?: string;
  name: string;
  surname?: string;
  suffix?: string;
  alternates?: string[];
}

/** The self-only standing digest (empty lines hidden). */
export interface ProfileDigest {
  renown?: string;
  /**
   * ⚠ `make` is OPTIONAL: it is account-level, and an account that
   * cannot be resolved yields no figure rather than the per-character
   * one. See `InfluenceApi.standingForHost`.
   */
  influence?: { play: string; make?: string };
  competence?: { discipline: string; band: string }[];
  traits?: { axis: string; band: string }[];
}

/** The full viewer-redacted inspection card (`composeCard`). */
export interface ProfileCard {
  handle: string;
  header: string;
  isSelf: boolean;
  recognized: boolean;
  // account / world facts — always shown
  country?: string;
  newness?: "new-arrival";
  status?: PresenceStatus;
  // physical / observable (disguise-aware)
  species?: string;
  sex?: string;
  pronouns?: string;
  ageStage?: string;
  flavor?: string;
  // persona — recognition-gated
  nameSurface?: ProfileNameSurface;
  aspiration?: string;
  bio?: string;
  chronicle?: { prologue?: string; deeds: string[] };
  // always-outward standing
  renownBand?: string;
  competenceBands?: { discipline: string; band: string }[];
  // self-only digest
  digest?: ProfileDigest;
  // observer-owned annotations (your read, never the target's disclosure)
  yourLabel?: string;
  yourRegard?: string;
}

const LOGIC_PATH = "/obj/api/social";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/SocialLogic", import.meta.url),
);
const PRESENCE_LOGIC_PATH = "/obj/api/presence";
const PRESENCE_LOGIC_FILE = fileURLToPath(
  new URL("../obj/api/PresenceLogic", import.meta.url),
);
const PROFILE_LOGIC_PATH = "/obj/api/profile";
const PROFILE_LOGIC_FILE = fileURLToPath(
  new URL("../obj/api/ProfileLogic", import.meta.url),
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

/**
 * The presence/profile reads live in their own logic singletons (kept
 * separate for file size + HMR granularity) but behind this one facade —
 * so the author navigates a single `SocialApi`, not three. Both are
 * `@internal`; only `SocialApi` is the surface.
 */
function presenceLogic(): PresenceLogic {
  return StuffApi.singletonSync(
    PRESENCE_LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        PRESENCE_LOGIC_FILE,
        "PresenceLogic",
      ) as typeof PresenceLogic | null) ?? PresenceLogic)(),
  );
}

function profileLogic(): ProfileLogic {
  return StuffApi.singletonSync(
    PROFILE_LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        PROFILE_LOGIC_FILE,
        "ProfileLogic",
      ) as typeof ProfileLogic | null) ?? ProfileLogic)(),
  );
}

export class SocialApi {
  /**
   * Boot seam (idempotent). Installs both social-graph presence consumers:
   * the notify-gated login/logout **notification** relay and the
   * presence-PUBLIC **roster** delta tap (feeding the "Who's Online" card).
   * Both ride the same four presence events. Wired from `AppBootstrap.run()`.
   */
  public static boot(): void {
    logic().installPresenceTap();
    presenceLogic().installRosterTap();
  }

  // --- Inspection reads (the `who` / `profile` / `score` surface) ---

  /**
   * Every currently-connected player avatar — the cheap filter over the
   * online set (linkdead / destroyed excluded). The roster source for
   * `who` and the live card.
   */
  public static online(): Avatar[] {
    return presenceLogic().online();
  }

  /**
   * Derived session-liveness for `target`, in display-precedence order
   * (`reconnecting` > `engaged` > `idle` > `active`). Computed on read
   * against the `social.idleAfter` AppSetting; no stored idle state.
   */
  public static statusOf(target: Avatar): PresenceStatus {
    // Boundary read aperture: a roster row is composed for a viewer who
    // may be on the other side of a circle from the person it describes
    // (`who` from inside, the roster card from outside). Reading their
    // engagements is a pure read that yields a display string.
    return SecurityApi.projectAcross(target, undefined, () =>
      presenceLogic().statusOf(target),
      SocialApi
    );
  }

  /**
   * Push a full viewer-lensed roster snapshot to one viewer (card open /
   * session establish) as a `self.group` frame. Fire-and-forget.
   */
  public static snapshotFor(viewer: Avatar): void {
    void presenceLogic().snapshotFor(viewer);
  }

  /**
   * The full inspection card for `target`, viewer-redacted by recognition
   * + the target's disclosure dial. `viewer === target` returns the
   * unredacted self-card plus the standing digest. The cardinality-one
   * sibling of {@link composeOccupants}.
   */
  public static composeCard(
    viewer: Stuff,
    target: Stuff,
  ): Promise<ProfileCard> {
    return profileLogic().composeCard(viewer, target);
  }

  /**
   * The one viewer-lensed roster row — header + country + (gated) status —
   * shared by `who` and the live roster card.
   */
  public static composeRow(viewer: Stuff, target: Stuff): Promise<RosterRow> {
    // The roster row IS the per-viewer projection of a person — the
    // same category as naming, and the same aperture.
    return SecurityApi.projectAcross(viewer, target, () =>
      profileLogic().composeRow(viewer, target),
      SocialApi
    );
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
   * the settings card projection.
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
