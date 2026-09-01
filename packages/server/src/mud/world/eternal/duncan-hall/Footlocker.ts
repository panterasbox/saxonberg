/**
 * Footlocker — a dorm's storage chest. A university-owned in-room fixture
 * (invariant, respawned from template), seeded into each `DormRoom` via its
 * `props:` data (the spine's seed-once). A store surface; no `Named`. Its
 * tenant-scoped contents are the deferred "possession" seam (per-owner loose
 * items) — v1 treats it as functional-but-empty.
 *
 * A chest is the textbook `Vessel` — a container-object (a Thing that holds
 * things), so it composes `Vessel` rather than bolting `Container` onto
 * `Thing`. `Vessel` already carries Visible/Perceptible/Tangible/Containable
 * (via Thing) + Container.
 *
 *   Detailed → Vessel
 */

import { Vessel } from '../../../lib/stuff/Vessel';
import { DetailedMixin } from '../../../lib/description/Detailed';
import type { FieldMeta } from '../../../lib/mixin';

const FootlockerBase = DetailedMixin(Vessel);

export default class Footlocker extends FootlockerBase {
  static fieldMeta: FieldMeta = {};
}
