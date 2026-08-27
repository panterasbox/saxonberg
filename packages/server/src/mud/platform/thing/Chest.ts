/**
 * Chest — an openable stock container: `Sealable` (the open/closed lid is
 * the crafting gather walk's honest switch — an open chest feeds a craft,
 * a closed one never does) + `Container` + `Populates` (a seed declares
 * its stocked contents). The survival-game chest-pull, honestly: flip the
 * lid, forge.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { PopulatesMixin } from '../../lib/stuff/Populates';

const ChestBase = PopulatesMixin(
  SealableMixin(ContainerMixin(DetailedMixin(Thing))),
);

export default class Chest extends ChestBase {}
