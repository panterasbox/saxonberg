/**
 * Whetstone — the personal-capital exemplar: a carried `ToolItem` whose
 * `whetstone` capability backs the `sharpen` ritual (the working-surface
 * maintenance tier — cheap, frequent, owner-performed, anywhere). The
 * class survives the capability-table build because it carries real
 * BEHAVIOR — {@link AudibleMixin}, so the rasp of stone on steel is
 * *heard* (SharpenController emits through it) — never for affordances:
 * the `sharpen` verb rides the `whetstone` capability entry through the
 * table (carried placement), exactly as on a data-only ToolItem. Wears
 * with use like any durable tool; sold at the general store.
 */

import ToolItem from './ToolItem';
import { AudibleMixin } from '../../lib/perception/Audible';

const WhetstoneBase = AudibleMixin(ToolItem);

export default class Whetstone extends WhetstoneBase {
  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['whetstone'];
}
