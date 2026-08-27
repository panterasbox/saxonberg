/**
 * AttendancePoint — a concrete, generic service-point fixture: the plain
 * `AttendantMixin` counter, used directly by venues that need no extra
 * capability (and by the demo/test vehicles for the disciplines no v1 content
 * venue exercises — take-a-number, appointment, self-service).
 *
 * A real venue composes {@link AttendantMixin} onto its own fixture (the bar's
 * Menu-adjacent counter, the TPA window, the bank counter) so the service
 * verbs light up beside the venue's payload verbs; this is the bare form.
 */

import Thing from "../../lib/stuff/Thing";
import { VisibleMixin } from "../../lib/description/Visible";
import { DetailedMixin } from "../../lib/description/Detailed";
import { AttendantMixin } from "../../lib/attendant/Attendant";
import type { FieldMeta } from "../../lib/mixin";

const AttendancePointBase = AttendantMixin(DetailedMixin(VisibleMixin(Thing)));

export default class AttendancePoint extends AttendancePointBase {
  static fieldMeta: FieldMeta = {};
}
