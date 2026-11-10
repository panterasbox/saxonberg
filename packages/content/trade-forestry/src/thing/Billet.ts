/**
 * Billet — a length of green wood split once or twice along its grain:
 * what a froe makes of a bole before it makes anything else.
 *
 * ⭐ **The billet is what makes `rive` sayable on it.** A billet is split
 * again into staves, blanks and laths, and the verb that does it is this
 * trade's — so the class that affords it is this trade's too: a kernel
 * class may never name a pack's view (`Timber` affords only the kernel's
 * `fit`). The bole affords riving the same way it affords felling.
 *
 * ⭐ **And it plans its own riving** (`CuttableMixin`, controllers-are-io
 * D8c): `rive billet [into <what>]` asks the billet, and the billet asks
 * the recipe catalogue for the recipes that take one piece of its wood
 * under `riving`. This file knows none of them; a second trade that rives
 * something out of a billet is a recipe row.
 *
 * A Timber, and only a Timber: riven, seasoning at its species' rate,
 * stackable — eight billets off one length are one stack.
 *
 * ⚠⚠ The statics SHADOW down a base-class chain (mixins union, base
 * classes shadow), so `Timber`'s own `peers` — the kernel `fit` — is
 * spread back in here, or a billet would stop offering `fit` beside it.
 */

import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Recipe } from '@saxonberg/server/mud/lib/craft/Recipe';
import {
  CuttableMixin,
  type CutAnswer,
  type CutAnswerFor,
  type CutRequest,
} from '@saxonberg/server/mud/lib/craft/Cuttable';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { RIVE_FLOOR } from './Bole';

/** The capability a froe offers, and a riving recipe asks for. */
const RIVING = 'riving';
const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';

export default class Billet extends CuttableMixin(Timber) {
  static commandContributions: CommandContributions = {
    // In your hands (`environment` — to the holder; `self` grants nothing
    // to anyone, it is a command giver's own verbs) or at your feet.
    environment: ['trade/forestry/cmd/forestry/rive.yaml'],
    peers: [
      'trade/forestry/cmd/forestry/rive.yaml',
      ...(Timber.commandContributions.peers ?? []),
    ],
  };

  /** ⭐ `rive` — split again, into the recipe the word (or the catalogue) chooses. */
  public override async cutPlan(req: CutRequest): Promise<CutAnswer> {
    if (req.verb === 'rive') return this.rivePlan((req.options.into ?? '').trim().toLowerCase());
    return super.cutPlan(req);
  }

  /**
   * Chosen by the word, or the only one there is; ambiguous or unknown, the
   * refusal names the choices. The craft runs NOW (`durationMs: 0`), inside
   * the command frame — it is a craft resolved from the actor's reach.
   */
  private async rivePlan(word: string): Promise<CutAnswerFor<'rive'>> {
    const material = this.getMaterial();
    // ⭐ Whether the wood will open at all is the WOOD's — its
    // `cleavability`. Elm's interlock, so a froe will not rive it.
    if ((material && MixinApi.hasSolidity(material) ? material.getCleavability() : 0) < RIVE_FLOOR) {
      return {
        ok: false,
        verb: 'rive',
        reason: 'will-not-rive',
        facts: { woodName: material?.getName() ?? 'this wood' },
      };
    }
    const catalogue = await StuffApi.singleton<RecipeCatalogue>(RECIPE_CATALOGUE);
    let recipe: Recipe | null = null;
    if (word) {
      // ⭐ A KEYED read — the player's word through the catalogue's own
      // index — then the one question this cut asks of the row.
      const found = catalogue.getRecipe(word) ?? catalogue.findByKeyword(word);
      recipe = found !== null && Billet.rivesFrom(found, material) ? found : null;
      if (recipe === null) {
        return {
          ok: false,
          verb: 'rive',
          reason: 'not-rivable-into',
          facts: { word, choices: Billet.rivableNames(catalogue, material) },
        };
      }
    } else {
      const choices = Billet.rivableRecipes(catalogue, material);
      if (choices.length === 0) return { ok: false, verb: 'rive', reason: 'nothing-to-rive' };
      if (choices.length > 1) {
        return {
          ok: false,
          verb: 'rive',
          reason: 'which-rive',
          facts: { names: choices.map((r) => r.getName().toLowerCase()).sort() },
        };
      }
      recipe = choices[0]!;
    }
    const recipeRef = recipe.getRecipeId();
    const self = this as unknown as Stuff;
    return {
      ok: true,
      verb: 'rive',
      durationMs: 0,
      effortW: 0,
      facts: { kind: 'billet' },
      onComplete: async () => {
        // ⚠ Named BEFORE the craft: the craft consumes the billet, and a
        // reference to a destroyed thing renders as nothing.
        const riven = this.getPresentation();
        const outcome = await CraftingApi.craft({
          recipeRef,
          makerMode: 'self',
          // To hand — the Api lands, stamps and captures it.
          landing: 'hands',
          target: self,
        });
        if (!outcome.ok) {
          return { ok: false, verb: 'rive', reason: 'craft-refused', facts: { failure: outcome } };
        }
        return { ok: true, facts: { kind: 'piece', riven, output: outcome.output } };
      },
    };
  }

  /**
   * Does this recipe rive something out of one piece of `material`? — it
   * asks for `riving`, takes ONE item, and that item's category is a tag
   * this wood carries. Read off the row, so a pack's own riving recipe
   * qualifies with no edit here.
   */
  private static rivesFrom(recipe: Recipe, material: Material | null): boolean {
    if (!material) return false;
    if (recipe.getOutputApplication() !== 'tangible') return false;
    if (!recipe.getToolCapabilities().includes(RIVING)) return false;
    const slots = recipe.getInputSlots();
    if (slots.length !== 1) return false;
    const slot = slots[0]!;
    return (slot.kind ?? 'bulk') === 'item' && material.hasTag(slot.category);
  }

  /**
   * Every installed recipe that rives out of this wood.
   *
   * ⚠ The whole-catalogue walk the bare `rive billet` makes — it must know
   * whether there is exactly one answer. The honest home is a keyed read on
   * `RecipeCatalogue` (the recipes needing a capability), a kernel addition
   * this pack cannot make; the walk is the `PreserveController.recipeFor`
   * shape until it lands.
   */
  private static rivableRecipes(catalogue: RecipeCatalogue, material: Material | null): Recipe[] {
    const out: Recipe[] = [];
    for (const recipe of catalogue.allRecipes()) {
      if (Billet.rivesFrom(recipe, material)) out.push(recipe);
    }
    return out;
  }

  /** The refusal's list of choices, by name. */
  private static rivableNames(catalogue: RecipeCatalogue, material: Material | null): string[] {
    return Billet.rivableRecipes(catalogue, material)
      .map((r) => r.getName().toLowerCase())
      .sort();
  }
}
