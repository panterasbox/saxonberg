/**
 * LettingController — the base the two Seznick House letting verbs
 * (`lease`, `unlease`) share: who may act for the landlord.
 *
 * ⭐ Staff or owner, never "a member of the landlord group". Walter holds
 * the `agent` position at Mayfield Holdings (the letting agency — an
 * Organization whose appointing authority is the building's committee),
 * read off its authored roster; the owner is whoever sits on the
 * committee over the building's extent. An NPC is never on a committee
 * (economic bootstrap D8), so the old `AccessApi.isAgentOf` read — group
 * membership — is exactly the wrong question here.
 *
 * Pack `lib/`: substrate only ever inherited (the kernel's own rule
 * applied to a pack); nothing instances it and no row names it.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandModel } from '@saxonberg/server/mud/api/command';
import { CompactApi } from '@saxonberg/server/mud/api/compact';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** Seznick House's authored anchors — these are content verbs. */
export const BUILDING_EXTENT = '/world/terminus/mayfield-row/seznick-house';
export const BUILDING_PATH = `${BUILDING_EXTENT}/building`;
export const HOUSE_ADDRESS = 'terminus/mayfield-row/seznick-house';
/** The letting agency — the Organization whose `agent` position is Walter's job. */
export const AGENCY_PATH = '/world/terminus/mayfield-row/idea/agency';

export abstract class LettingController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * May `actor` let or end a let at Seznick House? Staff (a holder of the
   * agency's `agent` position) or the owner (a member of the committee
   * over the building's extent). Fails closed when the agency is not
   * resident — it is a boot entry.
   */
  protected static async mayLet(actor: Stuff): Promise<boolean> {
    const agency = StuffApi.findByTemplatePath(AGENCY_PATH);
    if (agency && MixinApi.isOrganization(agency) && agency.employs(actor)) return true;
    return CompactApi.isCommitteeMember(actor, BUILDING_EXTENT);
  }
}
