/**
 * PersistentWell — **a well whose water is somebody's work** (water-supply
 * D30): a well a player dug, whose depth, lining and the water drawn from
 * its body are their own. `PersistableMixin` outermost. The realm's authored
 * wells (Rejection's) stay plain `Well`s: they read their aquifer, and
 * their trough reverts with the yard.
 */

import { PersistableMixin } from '../../lib/persistence/Persistable';
import Well from './Well';

export default class PersistentWell extends PersistableMixin(Well) {}
