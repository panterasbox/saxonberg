/**
 * ShelledCharacter — Character + the shell mixin suite.
 *
 * The msh shell isn't one mixin; it's a small composition of
 * substrate mixins that together give a host the surface for
 * interactive command entry: per-instance command aliases
 * (`AliasMixin`), per-instance settings + ad-hoc vars
 * (`EnvironmentMixin`), drilled-scope state and pronoun memory
 * (`FocusedMixin`). Future shell mixins (`HistoryMixin`,
 * `PromptMixin`) compose here, not on Avatar.
 *
 * Composition order: `AliasMixin(EnvironmentMixin(FocusedMixin(Character)))`.
 * AliasMixin sits outermost — it has no method dependency on
 * Environment or Focused state, but composing it last places it
 * adjacent to the other shell-tier mixins in the prototype chain so
 * `MixinApi.queryMixins` returns the suite together.
 *
 * Avatar extends ShelledCharacter rather than Character so the
 * composition lives in one place. NPCs that don't run a shell
 * extend Character directly and stay scriptable without dragging
 * in aliases, environment overrides, or drill state.
 */

import { Character } from '../character/Character';
import { AliasMixin } from './Alias';
import { EnvironmentMixin } from './Environment';
import { FocusedMixin } from '../command/Focused';

const ShelledCharacterBase = AliasMixin(
  EnvironmentMixin(FocusedMixin(Character)),
);

export abstract class ShelledCharacter extends ShelledCharacterBase {}
