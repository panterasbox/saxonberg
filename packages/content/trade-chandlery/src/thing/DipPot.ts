/**
 * DipPot — ⭐⭐⭐ **the chandler's bath, and it plans its own dip.**
 *
 * The chandlery's row once pointed at the kernel's `CraftVessel`, and a
 * kernel class cannot know a pack's view exists, so nothing conferred
 * `dip` and the trade was unreachable — the affordance link, which fails
 * closed and silent. Since the ceramics build (D14) `dip` is the
 * PLATFORM's (one act: a thing into a bath and out with the bath on it),
 * and this pot is a `DipPlanner`: asked by the platform controller, it
 * plans a CANDLE.
 *
 * ## ⭐⭐⭐ ONE act over two fats, and the melt is the first half of it
 *
 * The plan resolves one recipe, `candle`, which authors **no**
 * `outputMaterial` — so a pot of beeswax dips a pale taper smelling of
 * honey and a pot of tallow a greasy one smelling of mutton, and nothing
 * branches on which. If the pot has nothing to give (`insufficient-input`,
 * which is what a cold cake of wax on the bench looks like to the candle
 * recipe), it melts something down (`melt-wax`) and tries again — and says
 * so, so the `melt` alias never silently overshoots the word typed.
 * ⚠ The decline tells the truth about which leg failed: if the player
 * NAMED a solid, a failed melt declines as the melt.
 *
 * ## ⚠ It runs NOW
 *
 * The candle is a catalogue craft resolved from the actor's reach and
 * stamped with the acting author, so the plan is zero-length: the platform
 * controller runs it inside the command frame, as the chandlery's own
 * controller always did.
 *
 * ⭐ No deed gate: dipping a wick in fat is not a skill, and a gate whose
 * key does not exist is a lock. What is hard is buying the right fat.
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type {
  DipPlan,
  DipPlanner,
  DipRefusal,
  DipRequest,
} from '@saxonberg/server/mud/lib/craft/DipPlanner';
import { DipBathMixin } from '@saxonberg/server/mud/lib/craft/DipBath';
import type { CraftOutcome } from '@saxonberg/server/mud/api/crafting';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { CraftingDecline } from '@saxonberg/server/mud/lib/craft/CraftingDecline';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Candle from './Candle';

/** The platform's one view — `dip` (and its alias `melt`). */
const DIP_VIEW = 'platform/cmd/crafting/dip.yaml';
const TOPIC = 'act.deed';
const RECIPE = 'candle';
/** The step that fills the pot when what you have is a cake. */
const MELT_RECIPE = 'melt-wax';

export default class DipPot extends DipBathMixin(CraftVessel) implements DipPlanner {
  /**
   * ⭐ The instrument affords the verb — a static on the class, never a
   * row key: a row's `commandContributions:` is dead silently. One entry
   * covers `dip` AND `melt`, because `melt` is an alias on that view.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [DIP_VIEW],
    environment: [DIP_VIEW],
  };

  public override async dipPlanFor(target: Stuff | null, req: DipRequest): Promise<DipPlan | DipRefusal | null> {
    const giver = req.actor;
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      beginSelf: Mml.compose`You run a wick down into the pot.`,
      onComplete: async (): Promise<DipRefusal | void> => {
        let outcome: CraftOutcome = await dipOnce();
        // ⭐⭐ THE SEAM: a cold cake on the bench — melt it and try again.
        if (!outcome.ok && outcome.reason === 'insufficient-input') {
          const melted = await CraftingApi.craft({
            recipeRef: MELT_RECIPE,
            makerMode: 'self',
            // ⭐ The named cake is PREFERRED for the slot it satisfies.
            ...(target ? { target } : {}),
          });
          if (melted.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`It softens, slumps and goes clear, and you have a pot of it.`)
              .toPeers(Mml.compose`${Mml.actor(giver)} melts something down in a pot.`)
              .send();
            outcome = await dipOnce();
          } else if (target) {
            // They said `melt <this>`; the melt is the leg that failed.
            outcome = melted;
          }
        }
        if (!outcome.ok) {
          return {
            ok: false,
            reason: outcome.reason,
            line: Mml.compose`${CraftingDecline.messageFor(outcome)}`,
          };
        }
        const candle = outcome.output;
        // ⭐ The smell and the fuel are the fat's, stamped here.
        if (candle instanceof Candle) {
          candle.adoptMaterialSmell();
          candle.adoptMaterialFuel();
        }
        if (MixinApi.isContainable(candle) && MixinApi.isContainer(giver)) {
          ContainmentApi.move(candle, giver);
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`You run a wick down into the pot and up again, and again, until ${Mml.thing(candle)} has built up on it.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} dips a candle.`)
          .send();
      },
    };
  }
}

/** One attempt at the candle — the resolve reads the world fresh each time. */
function dipOnce(): Promise<CraftOutcome> {
  return CraftingApi.craft({ recipeRef: RECIPE, makerMode: 'self' });
}
