/**
 * PersistentHall — ONE particular interior whose state outlives the
 * process: a {@link Hall} that is kept (the baths' hot tubs, the ward,
 * the distillery floor). `PersistableMixin` outermost, as on
 * `PersistentLocale`: one row, one place, one `holder_snapshots` record
 * keyed by its template path.
 */

import Hall from './Hall';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class PersistentHall extends PersistableMixin(Hall) {}
