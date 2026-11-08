/**
 * PersistentWaterStore — **a store whose water is somebody's** (water-supply
 * D30): a holding's cistern, the yard's roof cistern sold to a house, Avila's
 * bench cistern. What was poured in and drawn out is the house's water, so
 * the level rides a record across an unload. `PersistableMixin` outermost —
 * the documented host rule.
 *
 * ⭐ The staged/live choice is the row's: Rejection's butts stay plain
 * {@link WaterStore}s, whose rain-fill derives and whose water is nobody's.
 */

import { PersistableMixin } from '../../lib/persistence/Persistable';
import WaterStore from './WaterStore';

export default class PersistentWaterStore extends PersistableMixin(WaterStore) {}
