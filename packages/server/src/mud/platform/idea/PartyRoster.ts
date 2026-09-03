/**
 * PartyRoster — the self-warming home of the party operational core's
 * boot (the boot()-retirement direction).
 *
 * `postRegister` drives {@link PartyLogic.materializeRoster}: register
 * the `party:` grouping provider with the (already-warmed)
 * GroupRegistry and re-materialize durable parties from their
 * `parties` records into live Party Ideas. The provider + record
 * machinery stays module-private in the Logic (it is shared with the
 * live mutation paths), its gate widened to admit this singleton.
 *
 * Ordered after GroupRegistry on the boot manifest so the grouping
 * facade is warm. Eager via the platform pack's `boot:` manifest
 * (role `producer`), NOT an AppBootstrap sequencer line.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { PartyLogic } from './api/PartyLogic';
import { StuffApi } from '../../api/stuff';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const PartyRosterBase = PostRegistrationMixin(Idea);

export default class PartyRoster extends PartyRosterBase {
  /** Residency veto — the registered provider; a culled singleton re-arms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'PartyRoster is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /** Register the provider + re-materialize durable parties (idempotent). */
  public async warm(): Promise<void> {
    const logic = StuffApi.singletonSync(
      '/platform/idea/api/party',
      () => new PartyLogic(),
    );
    await logic.materializeRoster();
  }
}
