/**
 * Hide — ⭐⭐ **a skin, and what it is on the way to being.**
 *
 * ## What it composes, and the one thing it refuses to
 *
 * `Tanning(Crafted(WaterActivity(Freshness(Thermal(Good)))))`, and every
 * layer is load-bearing:
 *
 *   - **Thermal** beneath, because `FreshnessMixin` reads its host's
 *     temperature — a hide in a cold store keeps, and that is the same
 *     mechanism that keeps meat.
 *   - **Freshness**, because ⚠ **a green hide rots.** This is the whole
 *     clock the trade is played against: *it wants to be in a tanpit
 *     within the week or it is worth nothing*, which the shipped hide row
 *     has said in its own prose since the day it was authored with
 *     nothing in the world able to tan it. `lint:perishable` refuses a
 *     row whose material rots on a class that cannot, so this is not
 *     optional — it is the gate.
 *   - **WaterActivity**, because salting a hide is how a hide travels.
 *     ⭐ *Salted along the edges* — also already in the row's prose.
 *     Curing does not reverse, so a salted skin keeps on the road and a
 *     green one does not: that is the difference between a tannery that
 *     must sit next to the shambles and one that can buy from three
 *     counties, and it is an epoch dial rather than a single right
 *     answer.
 *   - **Crafted**, because the pit writes a GRADE BAND and the tailor
 *     reads it. A hide over-tanned into hard grain makes a worse jerkin,
 *     by the mechanism the whole crafting chain already uses.
 *   - **Tanning**, and nothing else in the game composes it.
 *
 * ## ⚠ NOT a `Provision`, and that is the interesting refusal
 *
 * The shipped row was one, because `Provision` is where `Freshness`
 * lives and a hide needed to rot. But a `Provision` is **food by
 * construction** — its own docstring says so, it composes
 * `ThermalDose` (every food can be cooked), `Composed` (every food can
 * be made of parts), `Contaminable` and `Sampled`. A hide is none of
 * that. Leaving it a `Provision` would mean anything enumerating food
 * found a skin in the pantry, and the day somebody writes *eat* against
 * the larder it would have been a silent, funny, wrong answer.
 *
 * ⚠ So this is a widening of what the WORLD has, not of what food is:
 * a hide is a `Good` that rots. `Provision`'s own comment predicted the
 * split — *"only one of them is true of a hide or a plank … the split is
 * what lets a tannery dry a skin without claiming it ferments."*
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { FreshnessMixin } from '@saxonberg/server/mud/lib/material/Freshness';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { TanningMixin } from '../lib/Tanning';

export default class Hide extends TanningMixin(
  CraftedMixin(WaterActivityMixin(FreshnessMixin(ThermalMixin(Good)))),
) {
  static fieldMeta: FieldMeta = {};
}
