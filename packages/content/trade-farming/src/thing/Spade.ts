/**
 * Spade — the farming trade's own digging tool, and ⭐ **the instrument
 * that affords the whole ground-work surface**.
 *
 * A verb affordance is a STATIC ON A CLASS (a row's
 * `commandContributions:` is dead, silently), and the affordance here is
 * the instrument rather than the ground: the same relationship
 * `SurveyInstrument` has to `measure` in the mining trade. You cannot
 * plot a field by looking at it — you cut the first sod.
 *
 * ⚠ Deliberately NOT the mine's shovel. A shovel moves what you already
 * broke and has a short handle because a long one has nowhere to go in a
 * drift; a spade cuts a clean face in soil and is worked with a foot.
 * Same `digging` capability, different tool, different trade — which is
 * the shipped rule that code is shared and **content is copied**.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class Spade extends ToolItem {
  /**
   * ⭐ A spade in your hands affords `plot`. Ground does not afford it,
   * and that is the honest arrangement: the ground has no opinion about
   * whether you are about to farm it.
   */
  static commandContributions: CommandContributions = {
    self: ['trade/farming/cmd/farming/plot.yaml'],
    // ⚠⚠ **It used to light `measure` up too, and that history is worth
    // keeping.** For a while it did not: the doc comment above cited the
    // right rule and then wired only `plot`, so `measure texture`
    // answered *"I don't understand 'measure'"* to a player standing in
    // a field with a spade in their hands — two of the survey ladder's
    // four rungs unreachable, with every test green, because a
    // controller test calls the controller.
    //
    // ⭐ The instrumentation ladder settles it a rung higher up: the
    // VERB is the Avatar's and always exists, and what the spade
    // supplies is the `digging` capability the `texture` channel names.
    // So `measure texture` with no spade now says *"you would need
    // something to open the ground with"* — which is what the
    // affordance was trying to buy, bought where it cannot be
    // forgotten.
  };
}
