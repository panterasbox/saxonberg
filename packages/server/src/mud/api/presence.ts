/**
 * PresenceApi — the online-roster accessor + derived session-liveness
 * status, behind a thin security-gated forwarding shell.
 *
 * Presence is a **public fact**: every connected player is on the roster,
 * always (privacy is a disclosure floor over *fidelity*, never a way to
 * vanish — see `ProfileApi` / the social-inspection slate). What varies is
 * how much a given viewer learns about each person; that lensing lives in
 * `ProfileApi.composeRow`, not here.
 *
 * The logic lives in the hot-reloadable {@link PresenceLogic} singleton at
 * `/obj/api/presence`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/presence` reloads it.
 */

import type Avatar from '../obj/Avatar';
import type { PresenceStatus } from '@saxonberg/types';
import { StuffApi } from './stuff';

// The wire types crossing to the client live in @saxonberg/types (single
// source of truth); re-exported here so server consumers import them from
// the owning Api face.
export type { PresenceStatus, RosterFrame } from '@saxonberg/types';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PresenceLogic } from '../obj/api/PresenceLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/presence';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PresenceLogic', import.meta.url)
);

/** Resolve the HMR-able PresenceLogic singleton (sync). */
function logic(): PresenceLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PresenceLogic'
      ) as typeof PresenceLogic | null) ?? PresenceLogic)()
  );
}

export class PresenceApi {
  /**
   * Boot seam (idempotent). Installs the roster-delta tap that fans the
   * four presence transitions out to online viewers as
   * `world.social.roster` frames. Wired from `AppBootstrap.run()`.
   */
  public static boot(): void {
    logic().installRosterTap();
  }

  /**
   * Every currently-connected player avatar — the cheap filter over
   * `PlayerApi.getAllAvatars()`. Linkdead / destroyed instances are
   * excluded. The roster source for `who` and the live pane.
   */
  public static online(): Avatar[] {
    return logic().online();
  }

  /**
   * The derived session-liveness word for `target`
   * (`reconnecting` > `engaged` > `idle` > `active`). Pure, computed on
   * read against the `social.idleAfter` AppSetting and the session's
   * `lastInputAt`.
   */
  public static statusOf(target: Avatar): PresenceStatus {
    return logic().statusOf(target);
  }

  /**
   * Push a full roster snapshot to one newly-attentive viewer (pane open /
   * session establish) — every online person as a viewer-lensed
   * `world.social.roster` `snapshot` frame. Fire-and-forget.
   */
  public static snapshotFor(viewer: Avatar): void {
    void logic().snapshotFor(viewer);
  }
}

SecurityApi.decorateApiClass(PresenceApi);
