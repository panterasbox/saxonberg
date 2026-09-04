/**
 * RenownStandings — the self-warming home of the renown standing aggregate — the measured, signed 'quality' half of consumer influence
 * (the MaturationProfileCatalogue shape; the boot()-retirement direction:
 * an operator-shaped warm does not belong on a consumer Api).
 *
 * `postRegister` warms the materialized aggregate read-cache
 * (`RenownStanding.warm()` — so the first reads are populated) and
 * then installs the ingestion tap(s) + the real-time recompute
 * schedule on the {@link RenownLogic} singleton. The tap/schedule
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
import RenownStanding from '../../lib/standing/RenownStanding';
import { RenownLogic } from './api/RenownLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const RenownStandingsBase = PostRegistrationMixin(Idea);

export default class RenownStandings extends RenownStandingsBase {
  /** Residency veto — the warm + taps; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'RenownStandings is a system singleton; never destructed',
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
    await RenownStanding.warm();
    // The Api's own logic() factory (with its HMR getCurrentExport
    // wrapper) is authoritative; at boot the statically-imported class
    // is identical, and singletonSync returns any already-live one.
    const logic = StuffApi.singletonSync(
      '/platform/idea/api/renown',
      () => new RenownLogic(),
    );
    logic.installReactionTap();
    logic.installReceptionTap();
    logic.installRecomputeSchedule();
  }
}
