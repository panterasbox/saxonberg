/**
 * Inspectable — ⭐ **works you can go and look at** (underwater D17): the
 * intake's screen under the water, a weir, a sluice. The thing reports
 * what an inspector sees, in its own words, and says WHICH works the
 * looking counts for (a face under the water is the intake's), so an
 * `inspection` gig on those works is satisfied by having looked.
 *
 * Not a mixin — a shape (the `Pumpable`/`Haulable` category): the
 * controller narrows by it and renders what it returns.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

export interface Inspectable {
  /** What an inspector sees, in the works' own words. */
  inspectionReport(inspector: Stuff): Promise<Mml>;
  /** The works the looking counts for — itself, or what it is the face of. */
  inspectedWorks(): Stuff;
}
