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
    // ⚠⚠ **And it lights up `measure` too, which it did not until a live
    // drive.** The doc comment above cited the right rule — *"the same
    // relationship `SurveyInstrument` has to `measure`"* — and then wired
    // only `plot`, so `measure texture` answered **"I don't understand
    // 'measure'"** to a player standing in a field with a spade in their
    // hands. Two of the survey ladder's four rungs were unreachable and
    // every test passed, because a controller test calls the controller.
    //
    // ⭐ The `SurveyInstrument` shape exactly: the whole view on
    // `environment` + `peers`, so the instrument lights the verb up by
    // being in reach and each channel's controller checks the capability
    // it actually needs. That is why `measure texture` can say *"you
    // would need something to open the ground with"* rather than simply
    // not existing — **the failure stays legible**.
    peers: ['platform/cmd/perception/measure.yaml'],
    environment: ['platform/cmd/perception/measure.yaml'],
  };
}
