/**
 * Chest — an openable stock container: `Sealable` (the open/closed lid is
 * the crafting gather walk's honest switch — an open chest feeds a craft,
 * a closed one never does) + `Container` + `Staged` (a seed declares
 * its stocked contents). The survival-game chest-pull, honestly: flip the
 * lid, forge.
 */

import Good from '../../lib/stuff/Good';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { StagedMixin } from '../../lib/stuff/Staged';

const ChestBase = StagedMixin(
  SealableMixin(ContainerMixin(Good)),
);

export default class Chest extends ChestBase {}
