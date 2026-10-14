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
import { MarkedMixin } from '../../lib/description/Marked';
import { ChartedMixin } from '../../lib/expanse/Charted';

export default class Chart extends ChartedMixin(MarkedMixin(Good)) {}
