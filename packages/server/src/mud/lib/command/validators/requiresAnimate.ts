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
import { DescribeApi } from '../../../api/describe';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../stuff/Template';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (SpeciesApi.isAnimate(giver)) return undefined;

  // Tailor the error message to what's actually wrong: a dead
  // organism gets a different message from a non-organism caller.
  const name = DescribeApi.getDisplayName(giver);
  if (MixinApi.isOrganism(giver)) {
    const state = giver.getLifecycleState();
    if (state === 'dead' || state === 'destroyed' || state === 'unpowered') {
      return `${name} can't do that — not currently animate (${state}).`;
    }
    return `${name} can't do that — not currently animate.`;
  }
  return `${name} can't do that.`;
};

/**
 * Async preload — ensures the giver's species clade AND every
 * ancestor clade up to the kingdom are live runtime singletons
 * before the sync `isAnimate` body runs. Without this preload, a
 * fresh dispatch into the void would find `getSpecies()` returning
 * `null` (species template never cloned) and `isAnimate` would
 * report false for an otherwise-alive Homo sapiens avatar.
 *
 * No-op for non-Organism givers and for Organisms with no
 * `_speciesPath` — the sync body handles those cases by returning
 * its standard error.
 */
validator.preload = async (context): Promise<void> => {
  const giver = context.commandGiver;
  if (!MixinApi.isOrganism(giver)) return;
  // Read the raw `_speciesPath` field directly — `getSpecies()`
  // uses `findByTemplatePath` which would return null for the very
  // singleton we're about to ensure. The field is the source of
  // truth; the live species ref is the derived view.
  const speciesPath = (giver as unknown as { _speciesPath: string | null })
    ._speciesPath;
  if (!speciesPath) return;
  // Ensure species + every ancestor clade. Some ancestor *path
  // segments* don't correspond to a seeded template (e.g.
  // `/lib/species/animalia/chordata/mammalia` is a folder under
  // which `primates`/`hominidae`/`homo`/`sapiens` live but doesn't
  // itself carry a Clade template). `singleton` throws on missing
  // templates; we tolerate that here because `SpeciesApi.getKingdom`
  // already skips missing ancestors with `continue`. Anything that
  // IS seeded gets cloned and cached.
  const ensure = async (path: string): Promise<void> => {
    try {
      await StuffApi.singleton(path);
    } catch {
      // Template not found at this level — leave the ancestor walk
      // to skip it naturally. Any other error (clone failure on a
      // real template) is genuinely a problem, but bundling them
      // here trades silent-recovery for noisy failure; the kingdom
      // walk's `findByTemplatePath`-null branch surfaces the gap
      // downstream when `isAnimate` returns false.
    }
  };
  await ensure(speciesPath);
  await Promise.all(Template.ancestorPaths(speciesPath).map(ensure));
};

export default validator;
