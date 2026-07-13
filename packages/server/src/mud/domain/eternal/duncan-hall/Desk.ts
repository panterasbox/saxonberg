/**
 * Desk — a dorm's work surface. A university-owned in-room fixture
 * (invariant, respawned from template), cloned into each `DormRoom` by
 * `installFixtures`. A work surface; no `Named`.
 *
 *   Surfaced → Detailed → Thing
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { SurfacedMixin } from '../../../lib/spatial/Surfaced';

const DeskBase = SurfacedMixin(DetailedMixin(Thing));

export default class Desk extends DeskBase {
  static persistentFields: string[] = [];
}
