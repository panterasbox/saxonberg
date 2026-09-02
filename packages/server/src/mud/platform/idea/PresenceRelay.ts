/**
 * PresenceRelay — the self-warming home of the two social-graph
 * presence consumers (the boot()-retirement direction: an
 * operator-shaped tap install does not belong on a consumer Api).
 *
 * `postRegister` installs BOTH: the notify-gated login/logout
 * **notification** relay ({@link SocialLogic.installPresenceTap}) and
 * the presence-PUBLIC **roster** delta tap
 * ({@link PresenceLogic.installRosterTap}, feeding the "Who's Online"
 * card). Both ride the same four presence events; the subscription
 * state stays on the Logics (hot-reload re-assertion), their gates
 * widened to admit this singleton.
 *
 * Eager via the platform pack's `boot:` manifest (role `producer`),
 * NOT an AppBootstrap sequencer line.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { SocialLogic } from './api/SocialLogic';
import { PresenceLogic } from './api/PresenceLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const PresenceRelayBase = PostRegistrationMixin(Idea);

export default class PresenceRelay extends PresenceRelayBase {
  /** Residency veto — the armed taps; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'PresenceRelay is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /** Arm both presence taps (idempotent). Public so a go-live can re-arm. */
  public async warm(): Promise<void> {
    // The Apis' own logic() factories (HMR getCurrentExport wrappers)
    // are authoritative; at boot the statically-imported classes are
    // identical, and singletonSync returns any already-live one.
    StuffApi.singletonSync(
      '/platform/idea/api/social',
      () => new SocialLogic(),
    ).installPresenceTap();
    StuffApi.singletonSync(
      '/platform/idea/api/presence',
      () => new PresenceLogic(),
    ).installRosterTap();
  }
}
