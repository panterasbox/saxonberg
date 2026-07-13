/**
 * Footlocker — a dorm's storage chest. A university-owned in-room fixture
 * (invariant, respawned from template), cloned into each `DormRoom` by
 * `installFixtures`. A store surface; no `Named`. Its tenant-scoped
 * contents are the deferred "possession" seam (per-owner loose items) — v1
 * treats it as functional-but-empty.
 *
 *   Container → Detailed → Thing
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ContainerMixin } from '../../../lib/spatial/Container';

const FootlockerBase = ContainerMixin(DetailedMixin(Thing));

export default class Footlocker extends FootlockerBase {
  static persistentFields: string[] = [];
}
