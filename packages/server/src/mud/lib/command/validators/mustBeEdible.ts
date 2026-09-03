/**
 * mustBeEdible — every bound Stuff must be edible: either MADE of edible
 * matter, or HOLDING some.
 *
 * The `eat` verb's arg gate. A rock, a sword, or a Stuff with no material
 * fails — surfacing "you can't eat that" as a friendly validator
 * rejection rather than letting the controller swallow it.
 *
 * ⭐ **The holder arm is not a convenience.** A cooked meal is a bulk
 * blend inside a claimed dish, so `eat stew` targets a BOWL, whose own
 * material is ceramic. The gate answered *"you can't eat a bowl"* at a
 * bowl of stew somebody had just been served, and the only verb that
 * worked was `drink`. Found by driving the shipped cookhouse. What makes
 * a thing eatable is the matter in reach of your mouth, and a vessel is
 * one of the two ways matter gets there.
 *
 * Empty MQL results pass through — the controller decides what no-match
 * means ("you don't see any X to eat").
 */

import type { Stuff } from "../../stuff/Stuff";
import type { FieldValidator } from "../../../api/command";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";
import { BlendLabel } from "../../metabolism/BlendLabel";

/** Made of edible matter — a ration, an apple, a cut of meat. */
function isEdibleMatter(s: Stuff): boolean {
  const material = MixinApi.isTangible(s) ? s.getMaterial() : null;
  return material?.getEdibility() === true;
}

/** Holding edible matter — a bowl of stew, a plate of roast. */
function holdsEdibleMatter(s: Stuff): boolean {
  if (!MixinApi.isBulkable(s) || !s.hasInteriorBulk()) return false;
  if (s.isBulkEmpty('interior')) return false;
  // ⭐ One call, both cases: `BlendLabel` falls back to the blend
  // Material for a payload with no composition, which is what the two
  // arms here used to spell out separately.
  return BlendLabel.isEdible(
    s.getBulkPayload('interior'),
    s.getBulkMaterial('interior'),
  );
}

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    const s = stuff as Stuff;
    if (isEdibleMatter(s) || holdsEdibleMatter(s)) continue;
    return `you can't eat ${s.getPresentation()}`;
  }
  return undefined;
};

export default validator;
