/**
 * EmploymentEngine — the self-warming home of the recurring game-time roster tick — each assignee's shift status maintained, shift-end wages settled. (The IMMEDIATE boot-time roster pass stays a sequencer line — EmploymentApi.tickRoster() after BootstrapManager.run — because the Businesses it walks are other packs' manifest entries, which platform dependsOn edges cannot name; see the plan's P2.)
 * (the FermentProfileCatalogue shape; the boot()-retirement direction:
 * an operator-shaped sweep install does not belong on a consumer Api).
 *
 * `postRegister` arms the sweep(s) on the {@link EmploymentLogic}
 * singleton. The handle state stays on the Logic — it is entangled
 * with the Logic's module internals and hot-reload re-assertion — so
 * the install methods live there, their gates widened to admit this
 * singleton (P3's fallback arm).
 *
 * Eager via the platform pack's `boot:` manifest (role `producer`),
 * NOT an AppBootstrap sequencer line.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { EmploymentLogic } from './api/EmploymentLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const EmploymentEngineBase = PostRegistrationMixin(Idea);

export default class EmploymentEngine extends EmploymentEngineBase {
  /** Residency veto — the armed sweeps; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'EmploymentEngine is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /** Arm the sweep(s) (idempotent). Public so a pack go-live can re-arm. */
  public async warm(): Promise<void> {
    // The Api's own logic() factory (with its HMR getCurrentExport
    // wrapper) is authoritative; at boot the statically-imported class
    // is identical, and singletonSync returns any already-live one.
    const logic = StuffApi.singletonSync(
      '/platform/idea/api/employment',
      () => new EmploymentLogic(),
    );
    logic.installRosterSchedule();
  }
}
