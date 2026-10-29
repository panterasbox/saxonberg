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
import { SeasoningMixin } from '../../lib/material/Seasoning';
import { MoistureMixin } from '../../lib/material/Moisture';
import { ConstructedMixin } from '../../lib/material/Constructed';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { DurableMixin } from '../../lib/material/Durable';
import type { FieldMeta } from '../../lib/mixin';
import type { CommandContributions } from '../../api/command';

// ⚠ Seasoning OUTSIDE Stackable: a merge's `onMerged` witness is
// Stackable's, and the outer class's method is the one that runs — so the
// seasoning (which takes the greener) must be the outer one and call down.
//
// ⭐ Durable INSIDE Stackable (repair D5, AC 11): a haft taken off a pick
// worn is still worn, so a loose haft must carry a condition — and its
// condition is STACK IDENTITY (below), so a worn haft never merges into a
// sound one (the `constructionForm` precedent). Not Assembled: a stack of
// staves is stock, not a whole — it goes INTO a thing of parts.
const TimberBase = SeasoningMixin(
  MoistureMixin(StackableMixin(DurableMixin(ConstructedMixin(CraftedMixin(Good))))),
);

export default class Timber extends TimberBase {
  /**
   * ⭐ Wood says how far it has dried by its weight and its ends — the
   * words the seasoning mixin used to carry for every host, which are
   * wood's (cleanliness D24: the mixin speaks for any solid drying in air).
   */
  public override seasonPhrase(f: number): string {
    return f >= 0.95
      ? 'It is well seasoned — light in the hand and dry at the ends.'
      : this.isSeasoned()
        ? 'It is seasoned enough to work.'
        : f >= 0.4
          ? 'It is still drying; worked now, it would move.'
          : f >= 0.15
            ? 'It has begun to dry — lighter than it was, the end grain paling — but it is still green.'
            : 'It is green — heavy, cool, and wet at the end grain.';
  }

  /**
   * ⭐ How it was opened, read off the end grain — in words, because it is
   * the trade's whole lesson and a player must be able to SEE it: riven
   * stock does not snap across (the fibres were followed), sawn stock has
   * them cut; a through-sawn board cups as it dries, a quartered one stays
   * flat. `''` for a piece with no stock form.
   */
  public override seasonGrainLine(): string {
    switch (this.getConstructionForm()) {
      case 'riven':
        return 'It was split along the grain, and the fibres run unbroken the length of it.';
      case 'hewn':
        return 'It was hewn with an axe — along the grain mostly, torn in places.';
      case 'sawn':
        // A narrow piece has no face to cup across — what the saw did to it
        // is cut its fibres.
        if (!this.isWideFace()) {
          return 'It was sawn: the saw ran across its fibres wherever the grain wandered.';
        }
        if (this.isQuarterSawn()) {
          return 'It was sawn on the quarter: the rings run straight through it, edge to edge, and it has stayed flat.';
        }
        return this.isCupped()
          ? 'It was sawn through: the rings arc across its end, and as it dried its face has cupped hollow.'
          : 'It was sawn through: the rings arc across its end, and it will cup as it dries.';
      default:
        return '';
    }
  }

  static fieldMeta: FieldMeta = {
    // Riven and sawn stock never merge into one stack.
    constructionForm: { persistent: true, authorable: true, stackIdentity: true },
    // A worn haft and a sound one are not the same stock.
    condition: { persistent: true, runtimeState: true, stackIdentity: true },
    // A quarter-sawn board and a through-sawn one do not merge. ⭐ How wood
    // was CUT is wood's, not seasoning's (B98: a bar of soap seasons too).
    quarterSawn: { persistent: true, runtimeState: true, authorable: true, stackIdentity: true },
    // ⭐ A face wide enough to cup across — a board. Authored on the row; a
    // part carved FROM a board does not carry it (a dowel cannot cup),
    // which is why it is a field and not derived from the form.
    wideFace: { persistent: true, authorable: true },
  };

  public quarterSawn = false;
  public wideFace = false;

  /** Was it quarter-sawn (cut radially — stabler, fewer boards)? */
  public isQuarterSawn(): boolean {
    return this.quarterSawn;
  }

  /** Is its face wide enough to cup across — a board? Authored. */
  public isWideFace(): boolean {
    return this.wideFace === true;
  }

  /**
   * Has it CUPPED — a flat-sawn (through-sawn) piece that has dried, its
   * face gone hollow across the width because the rings run across it and
   * wood shrinks more along a ring than through one. Derived, never
   * stored: a WIDE face (a board; a dowel or a haft has no width to cup
   * across), sawn, not quarter-sawn, and seasoned.
   */
  public override isCupped(): boolean {
    if (!this.wideFace || this.quarterSawn || !this.isSeasoned()) return false;
    return this.getConstructionForm() === 'sawn';
  }

  /**
   * ⭐ A part in reach makes `fit` sayable beside it (the raise arm — `fit
   * cask` with the staves at your feet). Kernel views only: a trade's own
   * verbs (`rive`, `carve`) are afforded by its own pack's classes.
   */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/fit.yaml'],
  };
}
