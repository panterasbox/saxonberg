/**
 * Bed — a dorm's sleeping surface. A university-owned in-room fixture
 * (invariant, respawned from template), cloned into each `DormRoom` by
 * `installFixtures`. A rest surface; no `Named` (a generic labelled thing).
 *
 *   Surfaced → Detailed → Thing (Thing already carries Tangible/Visible)
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { SurfacedMixin } from '../../../lib/spatial/Surfaced';

const BedBase = SurfacedMixin(DetailedMixin(Thing));

export default class Bed extends BedBase {
  static persistentFields: string[] = [];
}
