/**
 * Modality — the generic concrete modality.
 *
 * `lib/perception/Modality` is substrate: the sense-channel singleton a
 * row names, with `signalAt` the one seam a modality overrides when it
 * has a field to walk. Vision, sound, smell and touch each do — they
 * read light, an acoustic field, a diffusion. **Taste, emotive-ESP and
 * verbal-ESP do not**, and each shipped as its own file holding
 * `export class XModality extends Modality {}` and a docstring.
 *
 * ⭐ Three copies of nothing. Their rows name this twin now, and the
 * prose that was their only content lives in the rows, which is where a
 * fact about *this* modality belongs. The `platform/idea/Biome` shape,
 * for the same reason `Biome` has it: a base with no behaviour to add
 * is a ROW, not a class.
 *
 * ⚠ **A modality with behaviour of its own is still a subclass.** The
 * four that override `signalAt` keep their files; the test is whether
 * the class body is empty, not whether the concept is simple. See
 * CLAUDE.md § Instanceable Lives in `platform/<branch>/`.
 */

import { Modality as ModalityBase } from '../../../lib/perception/Modality';

export class Modality extends ModalityBase {}

export default Modality;
