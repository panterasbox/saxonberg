/**
 * requiresTravelCredential — verb-level precondition for TPA-only verbs
 * (`register`). Rejects when the actor controls no travel credential (no
 * carried card, no installed implant). NOT used on `teleport` — that verb
 * forks on privilege and gates the TPA path inside the controller, so a
 * verb-level credential gate would wrongly block self-powered teleportation.
 */

import type { CommandValidator } from "../../../api/command";
import { SpeciesApi } from "../../../api/species";
import { findActiveCredential } from "../../fasttravel/TravelCredential";
import type { Stuff } from "../../stuff/Stuff";

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver as unknown as Stuff;
  if (findActiveCredential(giver)) return undefined;
  return "you have no Teleport Authority credential";
};

// Preload the giver's anatomy so the cranial slot is live before the
// implant-first credential scan runs (mirrors requiresAnimate).
validator.preload = (context) =>
  SpeciesApi.preloadAnatomy(context.commandGiver);

export default validator;
