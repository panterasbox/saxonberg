/**
 * PersistentGate — **a gate whose openings are the valley's ledger**
 * (water-supply D30): the Delight headgate and turnouts. Who opened what,
 * and when, is what the field integrates and the rider audits, so it rides
 * a record across an unload. `PersistableMixin` outermost.
 */

import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import Gate from './Gate';

export default class PersistentGate extends PersistableMixin(Gate) {}
