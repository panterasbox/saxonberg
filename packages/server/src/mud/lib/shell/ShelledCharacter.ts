/**
 * ShelledCharacter — Character + the shell mixin suite.
 *
 * The msh shell isn't one mixin; it's a small composition of
 * substrate mixins that together give a host the surface for
 * interactive command entry: per-instance command aliases
 * (`AliasMixin`), per-instance settings + ad-hoc vars
 * (`EnvironmentMixin`), drilled-scope state and pronoun memory
 * (`FocusedMixin`), filesystem/template navigation
 * (`WorkspaceMixin`), authoring verbs (`AuthorMixin`).
 *
 * Note: `scry` and `locate` (perception verbs at a distance) live
 * on `PerceiverMixin` in `lib/description/`, not here. They're a
 * Character-tier capability, not a shell-tier one — every Character
 * (Avatar and future NPCs) gets them. Shell-tier mixins are the
 * surfaces an interactive avatar specifically needs.
 *
 * Composition order:
 *
 *   `AuthorMixin(WorkspaceMixin(AliasMixin(
 *     EnvironmentMixin(FocusedMixin(Character)))))`
 *
 * `WorkspaceMixin` sits between Alias and Author so its
 * `workspace.*` settings are picked up by EnvironmentMixin's
 * schema-on-mixin walk, and its verb contributions are discovered
 * alongside the other shell verbs.
 *
 * Avatar extends ShelledCharacter rather than Character so the
 * composition lives in one place. NPCs that don't run a shell
 * extend Character directly and stay scriptable without dragging
 * in aliases, environment overrides, drill state, a workspace, or
 * the authoring verb surface.
 */

import { Character } from '../character/Character';
import { AliasMixin } from './Alias';
import { EnvironmentMixin } from './Environment';
import { FocusedMixin } from '../command/Focused';
import { WorkspaceMixin } from './Workspace';
import { AuthorMixin } from './Author';

const ShelledCharacterBase = AuthorMixin(
  WorkspaceMixin(AliasMixin(EnvironmentMixin(FocusedMixin(Character)))),
);

export abstract class ShelledCharacter extends ShelledCharacterBase {}
