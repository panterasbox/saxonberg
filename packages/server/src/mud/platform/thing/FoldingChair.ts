/**
 * FoldingChair — the collapsible camp-chair variant of {@link Chair}.
 *
 * `FoldingChair` = `Chair` + `Foldable`: it folds down. A folded chair
 * refuses its posture slot (the gate lives in `Slotted.canOccupy`), so
 * `fold`/`unfold` and `sit` compose with no verb knowing about the other.
 * Gus's camp chair is a `FoldingChair` he keeps deployed forever — the
 * someday in aluminum and canvas — but the folded state exists; his never
 * goes into it.
 *
 * Its own file (not a named export of Chair.ts) so seeds can reference it
 * by path as `/platform/thing/FoldingChair`: the clone pipeline resolves a template's
 * `class:` by file basename, so one concrete Stuff class per file.
 */

import Chair from './Chair';
import { FoldableMixin } from '../../lib/slot/Foldable';

const FoldingChairBase = FoldableMixin(Chair);

export default class FoldingChair extends FoldingChairBase {}
