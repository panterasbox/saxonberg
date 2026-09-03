/**
 * AttendantWarden — the self-warming home of the storefront-attention anti-grief guards — the lease idle-eviction sweep + the linkdead release
 * (the FermentProfileCatalogue shape; the boot()-retirement direction:
 * an operator-shaped sweep install does not belong on a consumer Api).
 *
 * `postRegister` arms the sweep(s) on the {@link AttendantLogic}
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
import { AttendantLogic } from './api/AttendantLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const AttendantWardenBase = PostRegistrationMixin(Idea);

export default class AttendantWarden extends AttendantWardenBase {
  /** Residency veto — the armed sweeps; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'AttendantWarden is a system singleton; never destructed',
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
      '/platform/idea/api/attendant',
      () => new AttendantLogic(),
    );
    logic.installGuards();
  }
}
