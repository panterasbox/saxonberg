/**
 * CommsUpdate — the comms capability as a hosted update.
 *
 * The incorporeal (Idea-based) twin of the future radio Thing: composes
 * `CommsMixin` (the transmission capability + cohort state) and
 * `AetherHostedMixin` (the must-be-hosted relation) around a bare
 * `Idea`. Created *into* an aether host by `Avatar.installDefaultLoadout`
 * (the default-installed comms you ship with), never cloned to a
 * location. Carries no persistent state in v1 — the cohort is
 * runtime-only.
 */

import { Idea } from "../stuff/Idea";
import { CommsMixin } from "./Comms";
import { AetherHostedMixin } from "../augmentation/AetherHosted";
import { TemplatePaths } from "../paths";

export default class CommsUpdate extends CommsMixin(AetherHostedMixin(Idea)) {
  static readonly TEMPLATE_PATH = TemplatePaths.commsUpdate;
}
