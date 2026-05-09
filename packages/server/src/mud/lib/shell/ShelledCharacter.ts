/**
 * ShelledCharacter — Character + the shell mixin suite.
 *
 * The msh shell isn't one mixin; it's a small composition of
 * substrate mixins that together give a host the surface for
 * interactive command entry: per-instance command aliases
 * (`AliasMixin`), per-instance settings + ad-hoc vars
 * (`EnvironmentMixin`), drilled-scope state and pronoun memory
 * (`FocusedMixin`), filesystem/template navigation
 * (`WorkspaceMixin`).
 *
 * Composition order:
 *
 *   `WorkspaceMixin(AliasMixin(EnvironmentMixin(FocusedMixin(Character))))`
 *
 * `WorkspaceMixin` sits outermost so its `workspace.*` settings are
 * picked up by EnvironmentMixin's schema-on-mixin walk, and its verb
 * contributions are discovered alongside the other shell verbs.
 *
 * Avatar extends ShelledCharacter rather than Character so the
 * composition lives in one place. NPCs that don't run a shell
 * extend Character directly and stay scriptable without dragging
 * in aliases, environment overrides, drill state, or a workspace.
 */

import { Character } from '../character/Character';
import { AliasMixin } from './Alias';
import { EnvironmentMixin } from './Environment';
import { FocusedMixin } from '../command/Focused';
import { WorkspaceMixin } from './Workspace';
import { AuthorMixin } from './Author';
import { ScryMixin } from './Scry';

const ShelledCharacterBase = ScryMixin(
  AuthorMixin(
    WorkspaceMixin(AliasMixin(EnvironmentMixin(FocusedMixin(Character)))),
  ),
);

export abstract class ShelledCharacter extends ShelledCharacterBase {}
