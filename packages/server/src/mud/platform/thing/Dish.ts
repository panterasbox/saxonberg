/**
 * Dish — the edible output form: a plated serving whose bulk slot holds
 * the food the craft made, stamped with the maker's mark.
 *
 * ⭐ **It IS a `CraftVessel`, and that is the build's structural finding.**
 * A dish and a bar glass were two parallel implementations of one thing:
 * both are claimed from a pool, filled, marked used, washed and claimed
 * again. Dish had none of that — no `soiled`, no `wash`, no `Thermal`, no
 * `Container` — so every plated meal CLONED a new plate into the world,
 * and nobody ever washed up. Bussing was real work at the bar and free in
 * the kitchen, for no reason but that the two classes had been written a
 * month apart.
 *
 * Subclassing it takes the whole loop at once — and, not least, the
 * `SoiledWriters` hydrator arms, whose absence once locked a player out of
 * their own character (see `CraftVessel`). What Dish adds is the one thing
 * a glass does not have:
 *
 *   - **NutritionLabel** — the honest macros a served meal shows. That is
 *     the entire delta.
 *
 * Everything else — the working line, the ice plateau, the quality verdict
 * on `getLong()` — is inherited and correct: a hot dish cooling toward the
 * room is a better dish than one that never had a temperature.
 */

import CraftVessel from './CraftVessel';
import { NutritionLabelMixin } from '../../lib/metabolism/NutritionLabel';

const DishBase = NutritionLabelMixin(CraftVessel);

export default class Dish extends DishBase {}
