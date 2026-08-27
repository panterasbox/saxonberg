/**
 * Provision — a graded discrete ingredient: a `Thing` (Tangible, so it
 * carries its food Material) that also carries a {@link GradedMixin} band,
 * the discrete sibling of the bar's `GradedReceptacle`. The grade is what
 * lets a recipe's `minGrade` spread bite on solid stock — a *fine* cut
 * makes the fine roast; an ungraded scrap derives at `fair`.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { GradedMixin } from '../../lib/craft/Graded';

const ProvisionBase = GradedMixin(DetailedMixin(Thing));

export default class Provision extends ProvisionBase {}
