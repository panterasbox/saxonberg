/**
 * requiresAnimate — verb-level precondition. Rejects the command when
 * the giver isn't currently animate.
 *
 * "Animate" means the giver is a living/active organism (or
 * powered-on Constructa) capable of acting in the world. Dead
 * Animalia, unpowered Constructa, plants, and non-Organism givers all
 * fail this check.
 *
 * Tagged on self-action verbs whose semantics genuinely require the
 * actor to be doing something — `say`, `tell`, `go`, `get`, `drop`,
 * `open`, `close`, `inventory`. Untagged on passive/meta verbs:
 * `look`, `help`, `ping`, `alias`, `var`, `settings`, `player`,
 * `focus`. (See the verb tagging audit in the implementation plan.)
 */

import type { CommandValidator } from '../../../api/command';
import { SpeciesApi } from '../../../api/species';
import { MixinApi } from '../../../api/mixin';

// `Object.assign` in the initializer keeps this a pure declaration
// (no free-standing module-scope statement).
const validator: CommandValidator = Object.assign(
  (context: Parameters<CommandValidator>[0]) => {
  const giver = context.commandGiver;
  if (SpeciesApi.isAnimate(giver)) return undefined;

  // Tailor the error message to what's actually wrong: a dead
  // organism gets a different message from a non-organism caller.
  const name = giver.getPresentation();
  if (MixinApi.isOrganism(giver)) {
    const state = giver.getLifecycleState();
    if (state === 'dead' || state === 'destroyed' || state === 'unpowered') {
      return `${name} can't do that — not currently animate (${state}).`;
    }
    return `${name} can't do that — not currently animate.`;
  }
  return `${name} can't do that.`;
  },
  {
    /**
     * Async preload — ensures the giver's species + every clade
     * ancestor + the body plan are live runtime singletons before the
     * sync `isAnimate` body runs. Without this preload, a fresh
     * dispatch into the void would find `getSpecies()` returning
     * `null` (species template never cloned) and `isAnimate` would
     * report false for an otherwise-alive Homo sapiens avatar.
     * Delegates to `SpeciesApi.preloadAnatomy` — the shared substrate
     * helper that the sense / ESP validators and
     * `Avatar.installDefaultLoadout` also use.
     */
    preload: (context: Parameters<CommandValidator>[0]) =>
      SpeciesApi.preloadAnatomy(context.commandGiver),
  }
);

export default validator;
