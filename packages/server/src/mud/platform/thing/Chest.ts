/**
 * Chest — an openable stock container: `Sealable` (the open/closed lid is
 * the crafting gather walk's honest switch — an open chest feeds a craft,
 * a closed one never does) + `Container` + `Staged` (a seed declares
 * its stocked contents). The survival-game chest-pull, honestly: flip the
 * lid, forge.
 */

import Good from '../../lib/stuff/Good';
import { ContainerMixin } from '../../lib/spatial/Container';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { StagedMixin } from '../../lib/stuff/Staged';

// ⭐ `PlacingMixin` gives the chest a lid: things sit ON it (the `placed`
// read) as distinct from what is IN the box (`contents`), so Rung 1's
// `look chest` reads "on the lid vs in the box" instead of one flat list.
// It defaults to offering `on`; Container already supplies the interior.
const ChestBase = StagedMixin(
  PlacingMixin(SealableMixin(ContainerMixin(Good))),
);

export default class Chest extends ChestBase {}
