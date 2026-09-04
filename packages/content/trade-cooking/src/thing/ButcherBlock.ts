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
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/**
 * ⭐⭐ **The block is what CARRIES what the gut spilled**, and it is the
 * canonical cross-contamination vector in any food-safety training: *do
 * not prep vegetables on the board you cut raw meat on.*
 *
 * ⚠ This lived on `Weapon` for one build, so the clasp knife a player buys
 * could carry it — which put `getPathogenLoad()` on the author surface of
 * a mace, a flail and a whip. Most weapons never touch food, so the claim
 * was false of most of that host set. Here it is true of every member:
 * a butcher's block is food equipment and nothing else.
 */
const ButcherBlockBase = ContaminableMixin(Surface);

export default class ButcherBlock extends ButcherBlockBase {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/butcher.yaml'],
  };
}
