/**
 * ProfileApi — the single viewer-aware redaction seam for player
 * inspection. `composeCard` builds the full identity card; `composeRow`
 * the cheap roster line. Both are redacted by recognition (the persona is
 * recognition-gated) and the target's disclosure dial (the granular
 * presence status), with country / coarse-newness / outward standing
 * shown regardless. `viewer === target` yields the unredacted self-card
 * plus the standing digest.
 *
 * The redaction logic lives in exactly one place — the hot-reloadable
 * {@link ProfileLogic} singleton at `/obj/api/profile` — so `who` rows,
 * the `profile` card, and the live roster pane never grow a second
 * composer. Reached synchronously via `StuffApi.singletonSync`;
 * `dest /obj/api/profile` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { PresenceStatus, RosterRow } from '@saxonberg/types';
import { StuffApi } from './stuff';

// RosterRow is a wire type (it rides the roster frame to the client), so
// it lives in @saxonberg/types; re-exported here for server consumers.
export type { RosterRow } from '@saxonberg/types';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ProfileLogic } from '../obj/api/ProfileLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/profile';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ProfileLogic', import.meta.url)
);

/** Resolve the HMR-able ProfileLogic singleton (sync). */
function logic(): ProfileLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ProfileLogic'
      ) as typeof ProfileLogic | null) ?? ProfileLogic)()
  );
}

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
  influence?: { play: string; make: string };
  competence?: { discipline: string; band: string }[];
  traits?: { axis: string; band: string }[];
}

/** The full viewer-redacted inspection card. */
export interface ProfileCard {
  handle: string;
  header: string;
  isSelf: boolean;
  recognized: boolean;
  // account / world facts — always shown
  country?: string;
  newness?: 'new-arrival';
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

export class ProfileApi {
  /**
   * The full inspection card for `target`, viewer-redacted. `viewer ===
   * target` returns the unredacted self-card plus the standing digest.
   */
  public static composeCard(
    viewer: Stuff,
    target: Stuff
  ): Promise<ProfileCard> {
    return logic().composeCard(viewer, target);
  }

  /**
   * The one viewer-lensed roster row — header + country + (gated) status.
   * Shared by `who` and the live roster pane.
   */
  public static composeRow(viewer: Stuff, target: Stuff): Promise<RosterRow> {
    return logic().composeRow(viewer, target);
  }
}

SecurityApi.decorateApiClass(ProfileApi);
