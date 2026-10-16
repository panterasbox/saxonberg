/**
 * Timber — converted wood STOCK: a billet, a board, a stave, a riven length
 * (assembly D12).
 *
 * The rung between the tree and the thing made of it. A row names this
 * class from three packs — forestry's billet, carpentry's board,
 * coopering's stave — which is the kernel test: substrate whose composers
 * have no common pack ancestor goes to the kernel.
 *
 * Stackable, so thirty staves are one object until a cooper raises a cask
 * from them; Seasoning, so it dries at its species' rate where it stands;
 * Constructed, so riven and sawn are a construction form the materials
 * response reads (`riven` whole along the grain, `sawn` fibres cut across);
 * Crafted, so the riving or the sawing stamps it.
 *
 * ⚠ Riven and sawn, quarter-sawn and through-sawn, are stack identity: a
 * riven stave and a sawn one never merge. And a merge takes the greener.
 *
 * ⚠ Not the shipped `/trade/forestry/thing/timber` row — that is a round,
 * mine-grade length of plain `Good` and keeps its class (AC 27); the name
 * collision is recorded.
 */

import Good from './Good';
import { StackableMixin } from '../../lib/stuff/Stackable';
import { SeasoningMixin } from '../../lib/maturation/Seasoning';
import { ConstructedMixin } from '../../lib/material/Constructed';
import { CraftedMixin } from '../../lib/craft/Crafted';
import type { FieldMeta } from '../../lib/mixin';
import type { CommandContributions } from '../../api/command';

// ⚠ Seasoning OUTSIDE Stackable: a merge's `onMerged` witness is
// Stackable's, and the outer class's method is the one that runs — so the
// seasoning (which takes the greener) must be the outer one and call down.
const TimberBase = SeasoningMixin(
  StackableMixin(ConstructedMixin(CraftedMixin(Good))),
);

export default class Timber extends TimberBase {
  static fieldMeta: FieldMeta = {
    // Riven and sawn stock never merge into one stack.
    constructionForm: { persistent: true, authorable: true, stackIdentity: true },
  };

  /**
   * ⭐ A part in reach makes `fit` sayable beside it (the raise arm — `fit
   * cask` with the staves at your feet). Kernel views only: a trade's own
   * verbs (`rive`, `carve`) are afforded by its own pack's classes.
   */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/fit.yaml'],
  };
}
