/**
 * Rick — a stack of hay built where it is wanted, and the store a trough
 * is kept from (cover build D11).
 *
 * The kernel's generic container (`Vessel` — no lid, discrete goods in
 * it) made `Staged`, so a rick row can say what it was stacked with: a
 * venue's rick starts the world holding last summer's hay. Fixed where
 * it is built, by its row.
 */

import Vessel from '@saxonberg/server/mud/platform/thing/Vessel';
import { StagedMixin } from '@saxonberg/server/mud/lib/stuff/Staged';

export default class Rick extends StagedMixin(Vessel) {}
