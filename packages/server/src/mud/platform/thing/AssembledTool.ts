/**
 * AssembledTool — a tool made of parts — a head on a haft, a blade on a handle (the pick, the felling axe, the froe, the drawknife, the croze, the inshave, the plough). Wear goes to the part that takes it, and a worn part is replaced alone.
 *
 * ⭐ Its own class, not `AssembledMixin` on `Tool`: most tool rows
 * have no parts, and a mixin every instance does not need is the
 * antipattern the base-class narrowing removed. `lint:bills` holds both
 * directions: a class that composes `AssembledMixin` has a bill on every
 * row, and a row with a bill names such a class.
 */

import Tool from './Tool';
import { AssembledMixin } from '../../lib/craft/Assembled';

const AssembledToolBase = AssembledMixin(Tool);

export default class AssembledTool extends AssembledToolBase {}
