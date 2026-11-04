/**
 * PersistentShore — a {@link Shore} that is KEPT: a place beside a named
 * water whose state outlives the process.
 *
 * The shape {@link PersistentLocale} names for a kept locale with
 * substrate of its own: `PersistableMixin` outermost over its own stack.
 * The first is the Delight ditch's bank (water-supply, the browser walk):
 * it was kept already, and it had no way to say which water it stands
 * beside — so `analyze water` there read the RIVER, and no instrument in
 * the game could read the ditch, whether it ran earth or lined.
 */

import { FrameSitedMixin } from '../../lib/expanse/FrameSited';
import { ShoreMixin } from '../../lib/location/Shore';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import Locale from './Locale';

export default class PersistentShore extends PersistableMixin(
  FrameSitedMixin(ShoreMixin(Locale)),
) {}
