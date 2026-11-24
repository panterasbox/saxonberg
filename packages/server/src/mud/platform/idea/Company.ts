/**
 * Company — ⭐ **a business with owners**: a {@link BusinessEntity}
 * composing `CapTableMixin` (the institutions slate's cap table). Renamed
 * from `PersistentBusiness` by persistence-model D6, because it keeps no
 * record: a business is not a container, so it does not keep one.
 *
 * ⭐⭐ Its cap table is HISTORY, filed as a paper (`cap-table`, in the
 * business's own branch through `DocumentApi.saveAsBusiness`) after every
 * sale, gift or transfer, and read back as the company stands up — its
 * hydration source. The authored `capTable:` is the table until a paper
 * exists. Two ways a company stands up:
 *
 *   - **an authored row** (the Hesper's company, the Kittiwake's), through
 *     `StuffApi.singleton`;
 *   - **a minted company** (a smack's, `<seed>/<serial>`), cloned by the
 *     ship that owns it, which files its first paper when it founds it.
 *
 * Ships are the first consumer; nothing here is ship-specific.
 */

import BusinessEntity from './Business';
import { CapTableMixin, type CapTableData } from '../../lib/employment/CapTable';
import { DocumentApi } from '../../api/document';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HydrationSource, HydrateOutcome } from '../../lib/persistence/PersistenceSlice';

export default class Company extends CapTableMixin(BusinessEntity) {
  /**
   * What the world remembers of who owns it: its filed `cap-table` paper.
   * `required: false` — an unreachable store (early boot, every unit test)
   * is a recorded skip, and the authored table stands.
   */
  static hydrationSource: HydrationSource = { name: 'documents (cap-table)', required: false };

  static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
    if (!(host instanceof Company)) return { status: 'skipped', reason: 'not-its-kind' };
    try {
      const doc = await DocumentApi.read(host.capTablePaperPath());
      const table = (doc?.getData() as { capTable?: CapTableData | null } | undefined)?.capTable;
      if (table !== undefined) host.capTable = table;
      return { status: 'hydrated' };
    } catch (err) {
      // ⚠ Never throw: a throw unregisters the half-built company.
      return { status: 'unreachable', reason: String(err) };
    }
  }
}
