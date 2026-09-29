/**
 * Crate — the open stock container a producer's SOLID floor product
 * ships in (a crate of limes, a basket of mint). `Circulating` so the
 * crate is the unit the regional census counts and the spawn sweep
 * stands at target; `Staged` so a row declares what it holds (the
 * clones land inside on hydration); `Container` and never `Sealable` —
 * a crate is open, so the crafting gather walk descends into it and a
 * bartender's `press` finds the limes. `Chattel` rides `Thing`.
 *
 * The discrete sibling of `Bottle`: a bottle is a bulk holder at target,
 * a crate is a count of things at target.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ContainerMixin } from '../../lib/spatial/Container';
import { StagedMixin } from '../../lib/stuff/Staged';
import { CirculatingMixin } from '../../lib/residency/Circulating';

const CrateBase = CirculatingMixin(
  StagedMixin(ContainerMixin(DetailedMixin(Thing))),
);

export default class Crate extends CrateBase {
  constructor() {
    super();
    this.setKeywords(['crate']);
    this.setPrimaryKeyword('crate');
  }
}
