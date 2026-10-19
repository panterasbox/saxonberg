/**
 * Offstage — the concrete off-shift holding room every venue's `offstage`
 * row names (`class: /platform/location/Offstage`). The role lives on
 * {@link OffstageMixin} in `lib/employment`; this is the clonable.
 *
 * A singleton per template path (so the lounge's and the Hearthworks'
 * offstage rooms are two rooms, not one), Visible/Detailed for the
 * description an operator sees if they teleport in; deliberately not
 * `Exitable` — nothing walks out of it.
 */

import Place from '../../lib/stuff/Place';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { OffstageMixin } from '../../lib/employment/Offstage';
import type { FieldMeta } from '../../lib/mixin';

// ⭐ `PerceptibleMixin` — a room is addressable by keyword. ⚠ It is
// composed per class because `Place` does NOT carry it (only
// `Location` does), so every room class built directly on
// `Place` has to remember. These rows were authoring `primaryKeyword`
// into a void until 2026-09-11; `lint:presentation` clause (d) found it.
const OffstageBase = SingletonMixin(
  OffstageMixin(Place)
);

export default class Offstage extends OffstageBase {
  static fieldMeta: FieldMeta = {};
}
