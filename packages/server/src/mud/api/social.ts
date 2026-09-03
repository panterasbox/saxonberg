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
 * {@link SocialLogic} singleton at `/platform/idea/api/social`, reached synchronously
 * via `StuffApi.singletonSync`. `dest /platform/idea/api/social` reloads it.
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
import type Avatar from "../platform/agent/Avatar";
import type { PresenceStatus, RosterRow } from "@saxonberg/types";
import { SocialLogic } from "../platform/idea/api/SocialLogic";
import { PresenceLogic } from "../platform/idea/api/PresenceLogic";
import { ProfileLogic } from "../platform/idea/api/ProfileLogic";
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

const LOGIC_PATH = "/platform/idea/api/social";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/SocialLogic", import.meta.url),
);
const PRESENCE_LOGIC_PATH = "/platform/idea/api/presence";
const PRESENCE_LOGIC_FILE = fileURLToPath(
  new URL("../platform/idea/api/PresenceLogic", import.meta.url),
);
const PROFILE_LOGIC_PATH = "/platform/idea/api/profile";
const PROFILE_LOGIC_FILE = fileURLToPath(
  new URL("../platform/idea/api/ProfileLogic", import.meta.url),
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
  // --- Inspection reads (the `who` / `profile` / `score` surface) ---

  /**
   * Every currently-connected player avatar — the cheap filter over the
   * online set (linkdead / destroyed excluded). The roster source for
   * `who` and the live card.
   */
  public static online(): Avatar[] {
    return presenceLogic().online();
  }

}

SecurityApi.decorateApiClass(SocialApi);
