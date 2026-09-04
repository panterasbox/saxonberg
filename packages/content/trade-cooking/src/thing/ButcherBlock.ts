/**
 * ButcherBlock — the scrubbed end-grain block you take an animal apart on,
 * and the thing that affords `butcher`.
 *
 * ⚠⚠ **This verb was on `CookPot`, which is a different fact.** A pot is
 * the vessel you cook *in*; it says nothing about opening a carcass, and
 * putting `butcher` on it handed the verb to anyone standing near a
 * saucepan while the name of the class stopped predicting its own surface.
 * That is the `wash`-on-`UnboundedReceptacle` mistake exactly — *an urn is
 * not a degraded basin*, and a pot is not a degraded block.
 *
 * ⭐ **The fixture provides DISCOVERABILITY; the edge provides
 * capability.** `ButcherController` stays deliberately more permissive
 * than this affordance: it accepts any reachable `constructionForm:
 * 'bladed'` implement, a pocket knife included. What the block gives you
 * is learning that `butcher` exists by walking into a kitchen — the same
 * split `WaterFixture` documents for `wash`.
 *
 * ⚠ `peers`, not `environment`: a block stands in the room as your
 * SIBLING, and nobody carries one. `environment` grants outward to the
 * containers ABOVE a thing, which is how `wash` once shipped afforded to
 * nobody anywhere.
 *
 * ⭐ And being fixed is the honest consequence: **you cannot field-dress a
 * boar in the woods.** You carry it home to the block, with the clock
 * already running since the kill — which is precisely the pressure the
 * cuts' age model exists to create.
 */

import Surface from '@saxonberg/server/mud/platform/thing/Surface';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class ButcherBlock extends Surface {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/butcher.yaml'],
  };
}
