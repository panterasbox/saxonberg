/**
 * Offstage — the concrete off-shift holding room every venue's `offstage`
 * row names (`class: /platform/location/Offstage`). The role lives on
 * {@link OffstageMixin} in `lib/employment`; this is the clonable.
 *
 * A singleton per template path (so the lounge's and the Hearthworks'
 * offstage rooms are two rooms, not one), Visible/Detailed for the
 * description an operator sees if they teleport in. Nothing walks out of
 * it: it has a grid cell like any place, and no row authors it an exit.
 */

import Locale from '../../lib/location/Locale';
import { OffstageMixin } from '../../lib/employment/Offstage';
import type { FieldMeta } from '../../lib/mixin';

// ⭐ A `Locale` — one row is one place, and like every place but the void
// it sits on its venue's grid (the place taxonomy, `location.md`): each
// row authors `coords:` in its venue's zone. It is still not walked out
// of — no row authors an exit — and the grid does not derive exits.
const OffstageBase = OffstageMixin(Locale);

export default class Offstage extends OffstageBase {
  static fieldMeta: FieldMeta = {};
}
