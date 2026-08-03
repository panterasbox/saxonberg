/**
 * ForumsUpdate — the forum capability as a hosted update.
 *
 * The incorporeal (Idea-based) forum implant: composes `ForumsMixin` (the
 * forum capability + verb surface) and `AetherHostedMixin` (the
 * must-be-hosted relation) around a bare `Idea`. Created *into* an aether
 * host by `Avatar.installDefaultLoadout` (born-with, alongside the comms
 * + travel-credential updates), never cloned to a location. Carries no
 * persistent state in v1 — the board/entry data lives in its own
 * collections.
 *
 * Mirrors `CommsUpdate` exactly (no new physical implant).
 */

import { Idea } from '../lib/stuff/Idea';
import { ForumsMixin } from '../lib/forum/Forums';
import { AetherHostedMixin } from '../lib/augmentation/AetherHosted';
import { TemplatePaths } from '../lib/paths';

export default class ForumsUpdate extends ForumsMixin(AetherHostedMixin(Idea)) {
  static readonly TEMPLATE_PATH = TemplatePaths.forumsUpdate;
}
