/**
 * PersistentBusiness — ⭐ **a business that is KEPT, and keeps a table of
 * its owners** (harbors review 1, the institutions slate's cap table): a
 * {@link BusinessEntity} composing `CapTableMixin`, with `PersistableMixin`
 * outermost so the table outlives the process.
 *
 * A cap table changes hands — a sale, a gift — and a change a restart
 * forgot would be a silent write, so the one class that carries a table is
 * one that keeps a record. Two ways it stands up:
 *
 *   - **an authored row** (the Hesper's company, the Kittiwake's): through
 *     `StuffApi.singleton`, which restores its record, or lays the row down
 *     and captures it the first time;
 *   - **a minted company** (a smack's, `<seed>/<serial>`): keyed
 *     `(seed row, serial)` by the ship that owns her company
 *     (`PersistableApi.restoreOrSeed`), and saved with her.
 *
 * ⚠ Kept means the record is authoritative over the row's runtime fields
 * once it exists — the kept-host trade every persistable makes; a pack sync
 * (go-live) still re-applies the row's authored fields to the live host.
 *
 * Ships are the first consumer. A general business gets a table when the
 * institutions slate's forms land; nothing here is ship-specific.
 */

import BusinessEntity from './Business';
import { CapTableMixin } from '../../lib/employment/CapTable';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class PersistentBusiness extends PersistableMixin(CapTableMixin(BusinessEntity)) {}
