/**
 * PotionMaterial — the `Material` subclass a **potion liquid** authors
 * as (`class: /obj/material/PotionMaterial`).
 *
 * The `RadioactiveMaterial` capability-subclass pattern, composing the
 * two mixins a potion needs: `PotableMixin` (route + dose + the
 * discharge leg) over `ArcaneMixin` (which spell it carries, who made
 * it, how efficiently it delivers).
 *
 * **A potion's class IS its material**, which is the point. Every flask
 * of the same draught reaches the same singleton, so identification
 * (wave 5) keys on the same object the effect hangs off, and decanting
 * a potion into another vial carries the magic because the *substance*
 * moved. It sits on `ConsumableMaterial` because a potion is, first,
 * something a body takes in — nutrients, toxins, and the digestion
 * buffer all apply to it exactly as they do to soup.
 *
 * This does NOT loosen the fixed-vocabulary rule that governs the
 * material library. A potion kind is a **kind that differs in
 * substrate-read properties** — a different spell is a different
 * substance in the only sense the substrate cares about — so it earns a
 * row on the same test steak and eggs do. What is still forbidden is a
 * row per *flask*.
 */

import { ConsumableMaterial } from './ConsumableMaterial';
import { PotableMixin } from '../../lib/magic/Potable';
import { ArcaneMixin } from '../../lib/magic/Arcane';
import { IdentifiableMixin } from '../../lib/identification/Identifiable';

/**
 * `Identifiable` rides the MATERIAL, which is where a potion's identity
 * already lives: knowing "cerulean means veiling" is a fact about the
 * draught, not about the flask holding it. So the belief record keys on
 * the material's path and one identification covers every flask of that
 * substance — which is the same reason `Potable` is here rather than on
 * the vessel.
 */
export class PotionMaterial extends PotableMixin(
  IdentifiableMixin(ArcaneMixin(ConsumableMaterial)),
) {}
