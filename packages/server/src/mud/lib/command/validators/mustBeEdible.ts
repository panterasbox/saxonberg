/**
 * mustBeEdible — every bound Stuff must be made of an edible Material.
 *
 * The `eat` verb's arg gate: a target is edible when it composes
 * `TangibleMixin` (it is made of materials) and its bulk Material
 * declares `edibility === true`. A rock, a sword, or a Stuff with no
 * material fails — surfacing "you can't eat that" as a friendly
 * validator rejection rather than letting the controller swallow it.
 *
 * Empty MQL results pass through — the controller decides what no-match
 * means ("you don't see any X to eat").
 */

import type { Stuff } from "../../stuff/Stuff";
import type { FieldValidator } from "../../../api/command";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    const s = stuff as Stuff;
    const material = MixinApi.isTangible(s) ? s.getMaterial() : null;
    if (!material || material.getEdibility() !== true) {
      return `you can't eat ${s.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
