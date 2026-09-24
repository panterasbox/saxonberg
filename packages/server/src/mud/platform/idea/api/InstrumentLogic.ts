// InstrumentLogic — the hot-reloadable logic singleton behind
// InstrumentApi. (Doc comment on the class below so @internal lands on
// the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import ReadingCatalogue, { READING_CATALOGUE_PATH } from '../ReadingCatalogue';
import type Reading from '../../../lib/instrument/Reading';

const InstrumentApiCallers = SecurityPolicies.FromModule(
  '/api/instrument#InstrumentApi',
);

/**
 * InstrumentLogic — the resolution half of the reading ladder.
 *
 * ⭐ Its one real job is **making the dispatch path independent of boot
 * order**. The catalogue may not have been stood up (a bare test world,
 * a pack installed after boot, a fresh process where nothing has asked
 * yet), and a channel lookup that answered `null` in that window would
 * read exactly like *"no trade ships that channel"* — the
 * reference-Idea-inert trap, which has cost this repo three
 * shipped-but-dead rosters. So a miss stands the catalogue up and warms
 * it before it answers, and the answer after that is an index read.
 *
 * @internal
 */
export class InstrumentLogic extends ApiLogic {
  /**
   * The channel a player typed, or `null` when no installed pack ships
   * it. Warms the roster on the way past if nothing has.
   */
  @Unshadowable
  @CallSecurity(InstrumentApiCallers)
  public async reading(channel: string): Promise<Reading | null> {
    const key = channel.trim().toLowerCase();
    if (key === '') return null;
    const catalogue = await this.catalogue();
    return catalogue.warmed(key);
  }

  /** Every channel this install ships, alphabetical by token. */
  @Unshadowable
  @CallSecurity(InstrumentApiCallers)
  public async readings(): Promise<Reading[]> {
    const catalogue = await this.catalogue();
    return catalogue.allWarmed();
  }

  /**
   * The catalogue singleton, cloned on a miss.
   *
   * ⚠ `singleton` IS the get-or-create — its first act is the index
   * read, and it clones only on a miss — so a resident pre-check in
   * front of it would be the lookup written twice.
   */
  private async catalogue(): Promise<ReadingCatalogue> {
    return StuffApi.singleton<ReadingCatalogue>(READING_CATALOGUE_PATH);
  }
}
