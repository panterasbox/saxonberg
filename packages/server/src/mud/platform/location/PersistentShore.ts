/**
 * PersistentShore — ⭐ **a shore that is KEPT**: a
 * {@link Shore} whose state outlives the process — the kept-locale shape
 * (`PersistentLocale`) over a shore's stack, `PersistableMixin` outermost.
 *
 * A landing where a house keeps goods it sells where they lie — the put-in,
 * its boats upturned on the shingle — has state a sale made: the boat sold
 * is the buyer's, and the house has one fewer. A plain shore re-lays its
 * authored `props:` every time it is stood up again (a restart, a residency
 * eviction), so the house's boats would come back — a faucet, the fiction
 * betraying itself. Kept, it lays its `props:` down ONCE and its record is
 * authoritative thereafter: unstamped goods (the house's boats, their hire
 * state) capture as its contents, a buyer's boat persists owner-side and is
 * laid back down here, the cast is transient.
 *
 * ⚠ Not for a quay a ship makes fast at: a ship's lines re-tie from her own
 * record at a restart, so a kept quay would restore the ends twice (the
 * reason a landing's list of who lies at it is a `berth-roll` document,
 * not its own state). A kept shore holds no bollards.
 */

import Shore from './Shore';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class PersistentShore extends PersistableMixin(Shore) {}
