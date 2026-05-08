/**
 * ShelledCharacter — Character + the shell mixin suite.
 *
 * The msh shell isn't one mixin; it's a small composition of
 * substrate mixins that together give a host the surface for
 * interactive command entry: per-instance settings + ad-hoc vars
 * (`EnvironmentMixin`), drilled-scope state and pronoun memory
 * (`FocusedMixin`). Future shell mixins (`AliasMixin`,
 * `HistoryMixin`, `PromptMixin`) compose here, not on Avatar.
 *
 * Avatar extends ShelledCharacter rather than Character so the
 * composition lives in one place. NPCs that don't run a shell
 * extend Character directly and stay scriptable without dragging
 * in environment overrides or drill state.
 */

import { Character } from '../character/Character';
import { EnvironmentMixin } from './Environment';
import { FocusedMixin } from '../command/Focused';

const ShelledCharacterBase = EnvironmentMixin(FocusedMixin(Character));

export abstract class ShelledCharacter extends ShelledCharacterBase {}
