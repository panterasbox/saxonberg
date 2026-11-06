/**
 * Chart — a nautical chart: marks you `read`, and claims you then hold.
 *
 * `read <chart>` shows its marks like any written thing and then writes
 * `charted` claims into your map (`ChartedMixin`) — the nodes and bands
 * it shows, as it shows them. A wrong chart is simply a chart row with
 * wrong entries: it is never corrected, and the claim it gave you is
 * still in your map after the water disagrees.
 */

import Good from '../../lib/stuff/Good';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MarkedMixin } from '../../lib/description/Marked';
import { ChartedMixin } from '../../lib/expanse/Charted';

export default class Chart extends ChartedMixin(MarkedMixin(Good)) {
  /**
   * ⭐ A chart writes what it shows into the reader's map (maritime D15) —
   * at the seam a scroll's working fires, after the text has landed. It is
   * still a reading: the marks show first.
   */
  public override async teach(reader: Stuff): Promise<string | null> {
    const n = await this.writeClaimsFor(reader);
    return n === 0 ? null : 'You take in what the chart shows and carry it in your head now — `map` will show it.';
  }
}
