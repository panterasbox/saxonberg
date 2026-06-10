/**
 * Thing - Base class for portable inanimate objects.
 *
 * Composition: `VisibleMixin(PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff))))`.
 *
 * Things are the physical-object branch: they're contained somewhere,
 * made of material, describable (Visible), and referenceable by
 * keyword (Perceptible). The presence-by-default of Visible /
 * Perceptible is the structural claim — *dynamic* invisibility
 * (illusion, concealment, darkness) is the perception subsystem's job
 * later. A Thing whose `getLong` happens to return empty is still
 * structurally a Thing.
 *
 * `NamedMixin` is deliberately NOT defaulted here — names are for
 * *proper names* (Excalibur the sword, Bob the shopkeeper), not
 * generic descriptions. A "brass thermometer" is just a Thing with a
 * short description, no name.
 *
 * If you genuinely need a physical-shaped object that opts out of
 * Visible OR Perceptible, that's a sign you want a different branch
 * (Idea for pure state holders) or you should extend Stuff directly
 * — the rare escape hatch.
 *
 * Provides (composed in):
 * - environment, container management (ContainableMixin)
 * - material refs (TangibleMixin)
 * - keyword pool, MQL matching (PerceptibleMixin)
 * - description machinery — getShort/getLong (VisibleMixin)
 * - runtimeId, destroyed (Stuff)
 */

import { Stuff } from './Stuff';
import { ContainableMixin } from '../spatial/Containable';
import { TangibleMixin } from '../material/Tangible';
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';

const ThingBase = VisibleMixin(
  PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff))),
);

export default class Thing extends ThingBase {
  static persistentFields: string[] = [];

  constructor() {
    super();
  }
}

Stuff._registerTopLevelBranch(Thing);
