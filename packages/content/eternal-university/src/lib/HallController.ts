/**
 * HallController — the base the two Duncan Hall letting verbs
 * (`provision`, `unprovision`) share: who may act for the landlord.
 *
 * ⭐ Staff or owner, never "a member of the landlord group". Katie holds
 * the `hall-manager` position at Duncan Hall (`duncan-hall/idea/college`,
 * an Organization whose appointing authority is the hall's committee),
 * read off its authored roster; the owner is whoever sits on the
 * committee over the hall's extent. An NPC is never on a committee
 * (economic bootstrap D8), so the old `AccessApi.isAgentOf` read — group
 * membership — is exactly the wrong question here.
 *
 * Pack `lib/`: substrate only ever inherited; nothing instances it and
 * no row names it.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandModel } from '@saxonberg/server/mud/api/command';
import { CompactApi } from '@saxonberg/server/mud/api/compact';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** The hall's extent — the committee that owns it. */
export const HALL_EXTENT = '/world/terminus/eternal/duncan-hall';
/** The college's staff — the Organization whose `hall-manager` position is Katie's job. */
export const COLLEGE_PATH = '/world/terminus/eternal/duncan-hall/idea/college';

export abstract class HallController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * May `actor` provision or unprovision a dorm? Staff (a holder of a
   * position at the college) or the owner (a member of the committee over
   * the hall). Fails closed when the college is not resident — it is a
   * boot entry.
   */
  protected static async mayProvision(actor: Stuff): Promise<boolean> {
    const college = StuffApi.findByTemplatePath(COLLEGE_PATH);
    if (college && MixinApi.isOrganization(college) && college.employs(actor)) return true;
    return CompactApi.isCommitteeMember(actor, HALL_EXTENT);
  }
}
