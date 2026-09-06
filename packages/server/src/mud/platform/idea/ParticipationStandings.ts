/**
 * ParticipationStandings — the self-warming home of the participation standing aggregate — the consumer-influence quantity faucet
 * (the MaturationProfileCatalogue shape; the boot()-retirement direction:
 * an operator-shaped warm does not belong on a consumer Api).
 *
 * `postRegister` warms the materialized aggregate read-cache
 * (`ParticipationStanding.warm()` — so the first reads are populated) and
 * then installs the ingestion tap(s) + the real-time recompute
 * schedule on the {@link ConsumerLogic} singleton. The tap/schedule
 * state (subscription + schedule handles) stays on the Logic — it is
 * entangled with the Logic's module internals and its hot-reload
 * re-assertion — so the install methods live there, their gates
 * widened to admit this singleton (P3's fallback arm).
 *
 * Eager via the platform pack's `boot:` manifest (role `producer`),
 * NOT an AppBootstrap sequencer line.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import ParticipationStanding from '../../lib/standing/ParticipationStanding';
import { ConsumerLogic } from './api/ConsumerLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const ParticipationStandingsBase = PostRegistrationMixin(Idea);

export default class ParticipationStandings extends ParticipationStandingsBase {
  /** Residency veto — the warm + taps; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'ParticipationStandings is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Warm the aggregate cache, then arm the taps + recompute schedule
   * (all idempotent). Public so a pack go-live can re-warm.
   */
  public async warm(): Promise<void> {
    await ParticipationStanding.warm();
    // The Api's own logic() factory (with its HMR getCurrentExport
    // wrapper) is authoritative; at boot the statically-imported class
    // is identical, and singletonSync returns any already-live one.
    const logic = StuffApi.singletonSync(
      '/platform/idea/api/consumer',
      () => new ConsumerLogic(),
    );
    logic.installDispatchTap();
    logic.installRecomputeSchedule();
  }
}
