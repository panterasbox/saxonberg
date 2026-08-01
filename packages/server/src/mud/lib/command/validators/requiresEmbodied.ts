/**
 * requiresEmbodied — verb-level precondition. Rejects the command when the
 * giver has no body that can act on matter.
 *
 * The fourth sibling of `requiresAnimate` (is this a living/active
 * organism at all) and `requiresConscious` (can an animate body currently
 * take a volitional action). This one asks a different question again: is
 * there a body here to touch things WITH?
 *
 * It is where **function over form** becomes mechanical. The verbs tagged
 * with this are exactly the embodied half of what a participant can do —
 * take, wear, wield, strike, craft, buy, cast. Everything untagged is the
 * platform half, and it keeps working no matter what has happened to the
 * body: a dead player still talks, still walks the commons, still reads
 * the forums, still shows up in `who`. Death costs embodied agency and the
 * price of coming back; it never costs a seat as a person.
 *
 * Because the split is a validator tag, it is legible: the surface a shade
 * loses is greppable in the YAML and pinned by `embodied-tagging.test.ts`
 * rather than living in anyone's head.
 *
 * The prose comes from the host (`getRevocationReason`), so the same lever
 * re-skins for the deferred prison work without a second validator.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  // Anything that is not incorporeal is embodied — the default, and the
  // reason tagging a verb costs nothing for ordinary bodies.
  if (!MixinApi.isIncorporeal(giver)) return undefined;
  return giver.getRevocationReason();
};

export default validator;
