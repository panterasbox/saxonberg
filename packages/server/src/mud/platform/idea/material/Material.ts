/**
 * Material — the generic concrete material.
 *
 * `lib/material/Material` is substrate: the property vocabulary every
 * material answers with, plus `ConsumableMaterial` and
 * `RadioactiveMaterial` specializing it. The base-library content pack
 * clones it directly for the 24 materials that need no special
 * behavior — irons, oaks, waters, brines.
 *
 * Those pack entries name this class. Composition (including the
 * `SingletonMixin` that makes one instance per material path) is
 * inherited unchanged.
 *
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import MaterialBase from '../../../lib/material/Material';

export default class Material extends MaterialBase {}
