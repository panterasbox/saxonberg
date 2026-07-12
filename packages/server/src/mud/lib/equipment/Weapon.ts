/**
 * Weapon — a melee implement (delivery half only).
 *
 * The symmetric dual of {@link Armor}: a `Thing` carrying a `Material` (on
 * `Thing`'s `Tangible`), a `Construction` (its weapon-delivery form), a
 * `Grade`, and a wear-on-use `condition`. It *derives* which channel(s) it
 * delivers from its form via `MaterialApi.deliverableChannels` — a dagger
 * (`bladed`) delivers edge, a mace (`hafted`) blunt — so harm can be driven
 * by real objects.
 *
 * v1 ships the **delivery** half only: no `WieldableMixin`, no hand-slot
 * combat loadout, no playstyle (reach / guard / gambits) — that whole
 * bundle is the combat build. A weapon here is an inspectable, graded,
 * wearing implement whose construction says what it *would* do.
 *
 * Seeded as content (e.g. `/domain/eternal/arms/steel-dagger`) with
 * `_materialPath`, `constructionForm: bladed`, and a `grade`.
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { ConstructedMixin } from '../material/Constructed';
import { ToolMixin } from '../craft/Tooled';
import { GradedMixin } from '../craft/Graded';

const WeaponBase = GradedMixin(
  ToolMixin(ConstructedMixin(DetailedMixin(Thing))),
);

export default class Weapon extends WeaponBase {}
