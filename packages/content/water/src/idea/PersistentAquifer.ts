/**
 * PersistentAquifer — **an aquifer whose draws are the commons' history**
 * (water-supply D30): the Delight valley, where a junior pumping through a
 * dry year lowers every well and the record has to survive the reboot to
 * mean anything. `PersistableMixin` outermost — the documented host rule.
 */

import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import Aquifer from './Aquifer';

export default class PersistentAquifer extends PersistableMixin(Aquifer) {}
