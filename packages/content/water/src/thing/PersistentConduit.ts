/**
 * PersistentConduit — **a main whose state is somebody's act** (water-supply
 * D30): the city intake, the Cold Fell aqueduct. A cut, a switch-off, the
 * delivery log a tank integrates — the works' own record, kept across an
 * unload and a reboot.
 *
 * ⭐ Staged or live is the CONTENT's choice, never the class's: a plain
 * {@link Conduit} (the outfall nobody acts on) reverts to its row when its
 * room unloads; a row names this twin when what happens to it is a deed
 * worth remembering. `PersistableMixin` outermost — the documented host
 * rule.
 */

import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import Conduit from './Conduit';

export default class PersistentConduit extends PersistableMixin(Conduit) {}
