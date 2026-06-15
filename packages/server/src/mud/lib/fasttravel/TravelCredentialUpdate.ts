/**
 * TravelCredentialUpdate — the fast-travel credential as a hosted
 * update.
 *
 * The incorporeal (Idea-based) twin of the `TravelCard` Thing: composes
 * `TravelCredentialMixin` (the registered-node set + register/authorize
 * surface — base-agnostic, no corporeal assumption) and
 * `AetherHostedMixin` (the must-be-hosted relation) around a bare
 * `Idea`. Replaces the implant's directly-carried credential — the
 * implant now confers attunement only, and `Avatar.installDefaultLoadout`
 * injects this update into the host.
 *
 * The born-with University Avenue floor (in `TravelCredentialMixin`) and
 * the session-durable persistence ride along unchanged: the update is
 * re-cloned each session, so `registered` resets to the floor each
 * login — exactly the v1 session-durable behavior.
 */

import { Idea } from "../stuff/Idea";
import { TravelCredentialMixin } from "./TravelCredential";
import { AetherHostedMixin } from "../augmentation/AetherHosted";
import { TemplatePaths } from "../paths";

export default class TravelCredentialUpdate extends TravelCredentialMixin(
  AetherHostedMixin(Idea),
) {
  static readonly TEMPLATE_PATH = TemplatePaths.travelCredentialUpdate;
}
