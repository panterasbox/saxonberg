/**
 * Whetstone — the personal-capital exemplar: a carried tool whose
 * `whetstone` capability backs the `sharpen` ritual (the working-surface
 * maintenance tier — cheap, frequent, owner-performed, anywhere). Also
 * carries real BEHAVIOR: {@link AudibleMixin}, so the rasp of stone on
 * steel is *heard* (SharpenController emits through it). Wears with use
 * like any durable tool; sold at the general store.
 *
 * ⭐ **`sharpen` lands only in the `environment` bucket** — the
 * personal-capital rule, which used to be the data value `placement:
 * carried` on a capability entry. It means the stone confers its verb
 * OUTWARD to whoever carries it and not sideways to the room: you
 * sharpen with your own stone, anywhere, and a stone on a shelf across
 * the room lends you nothing. The four buckets said this all along; the
 * row-level `placement` was a second, coarser vocabulary for a subset of
 * them.
 *
 * ⚠ Moved out of `/platform/thing/` when verbs became class statics: a
 * class that names `trade/smithing/cmd/crafting/sharpen.yaml` belongs to
 * the smithing pack, or the kernel would be naming a trade's verb.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const WhetstoneBase = AudibleMixin(ToolItem);

export default class Whetstone extends WhetstoneBase {
  /** Carried, never sideways — see the note above. */
  static commandContributions: CommandContributions = {
    environment: ['trade/smithing/cmd/crafting/sharpen.yaml'],
  };

  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['whetstone'];
}
