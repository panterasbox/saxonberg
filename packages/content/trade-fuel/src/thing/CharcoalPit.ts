/**
 * CharcoalPit — the clamp: a covered heap of cordwood, burned WITHOUT
 * enough air to burn.
 *
 * ⭐⭐ **Airflow is the decision, and the failure mode is the point.**
 *
 * Charring is not lighting a fire — it is running a fire that is
 * deliberately starving. The volatiles cook out and leave, the carbon
 * stays, and the collier's whole job for three days is holding the
 * draught between two ways of losing everything:
 *
 *  - **too much air** and the charge CATCHES: at or above
 *    `fire.air.flamingCompleteness` a flame can burn in the heap, so the
 *    cordwood goes onto the bed and burns like any fuel (`catchContents`),
 *    and you open a clamp on **ash** in the grate;
 *  - **too little** and the heap runs too cool: the wood's `char`
 *    transition only reaches its first rung, and you draw **half-burnt
 *    brands**, heavy and worth a fraction.
 *
 * ⭐⭐ **None of that is in this file any more** (ceramics ruling A). The
 * three outcomes were a threshold table on the pit and three template rows
 * it minted from; they are now ONE rule: charcoal is the WOOD's heat
 * transition (`requiresStarvedAir`), the flame needs air
 * (`FireLogic.mediumBurns`), and a burn that took too much air is ordinary
 * combustion. The lengths themselves BECOME charcoal — the same lengths,
 * a quarter of their mass. What stays here is the trade's verb and the
 * heap's dials (`draught`, its ceiling heat), authored on the row.
 *
 * Nothing rolls: a collier who learns the number gets it right every time.
 * What competence is FOR here is knowing what to set, not being allowed to.
 */

import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

// ⭐ A firebox that encloses its own feedstock — the clamp burns the
// wood it contains, which is why `Container` and not `Placing`.
const CharcoalPitBase = ContainerMixin(Firebox);

/**
 * ⭐ The clamp affords its own act. A verb an object affords is a
 * property of what the object IS, declared exactly once on the class —
 * the `Anvil` shape. ⚠ A row's `commandContributions:` would be dead
 * silently, and the kernel's `BurnerMixin` cannot name a trade's view
 * (the pack boundary), which is why the list lives here.
 */
const CHARRING = ['trade/fuel/cmd/fuel/char.yaml'];

export default class CharcoalPit extends CharcoalPitBase {
  static commandContributions: CommandContributions = {
    environment: CHARRING,
    peers: CHARRING,
  };
}
