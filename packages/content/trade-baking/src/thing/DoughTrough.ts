/**
 * DoughTrough — where dough is made, and where it proofs.
 *
 * `ManualBuildMixin(Vat)`. Two jobs in one object, and they are the same
 * object for a reason a kitchen would recognise: you mix the dough in
 * the trough and then you leave it in the trough, because moving a wet
 * dough is a nuisance and nobody does it.
 *
 * Mechanically the two jobs are quite different substrates:
 *
 *  - **`ManualBuildMixin`** — `pour` banks contributions into a build
 *    buffer and `knead` mints them into matter;
 *  - **`Vat`** — `MaturingMixin` over `BulkableMixin` + `SealableMixin`,
 *    which is the shipped ferment substrate the cellars already use.
 *
 * ⭐ And the seal is the design, not plumbing. `Vat` brings `Sealable`,
 * and a cloth over the trough IS the seal: leave it OFF and wild flora
 * settle out of the air (`spontaneousLagDays`), put it ON and nothing
 * gets in and you must pitch a culture from the crock. The choice
 * between a sourdough that takes a day to catch and a barm you pitched
 * this morning is a real one, made by whether you covered the bowl.
 *
 * ⚠ `Bulkable` is MANDATORY beneath `Maturing`
 * (`MaturingMixin.__validateComposition__` throws without it) — the
 * ferment rides the VESSEL, never the matter, which is the shipped
 * decision (D2 of the fermentation build) and the reason a trough can
 * be a ferment at all.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type {
  KneadPlan,
  KneadPlanner,
  KneadRefusal,
  KneadRequest,
} from '@saxonberg/server/mud/lib/craft/Kneadable';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';

const TOPIC = 'act.deed';
/** Kneading is work. Ten game-minutes of it, and your hands are in it. */
const KNEAD_MS = 10 * 60 * 1000;

/**
 * ⚠ A STATIC ON THE CLASS. A row's `commandContributions:` is dead
 * silently — a mistake this codebase has already paid for once.
 */
const BAKING = [
  'platform/cmd/crafting/pour.yaml',
  // ⭐ The platform's `knead` (ceramics D14): the trough plans it.
  'platform/cmd/crafting/knead.yaml',
  'trade/baking/cmd/baking/bake.yaml',
];

export default class DoughTrough extends ManualBuildMixin(Vat) implements KneadPlanner {
  static commandContributions: CommandContributions = {
    self: [],
    environment: BAKING,
    peers: BAKING,
  };

  constructor() {
    super();
    this.category = 'trough';
    this.setInteriorCapacity(Quantity.of(20, 'L'));
  }

  /**
   * ⭐⭐ **A knead in a trough is a mix method AND the build's terminal.**
   *
   * A build buffer holds no bulk — it holds a SNAPSHOT of contributions;
   * the matter was debited at the pour. So kneading is where the dough
   * becomes matter: `CraftingApi.mintFromBuild` reverse-matches the buffer
   * with exact cover, fills this trough's own bulk slot, derives the grade
   * weakest-link, and carries the flour's parts into the dough's payload.
   * What happens next (the proof) is the cloth's business, not the verb's.
   */
  public async kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal> {
    if (this.isBuildEmpty()) {
      return {
        ok: false,
        reason: 'empty-build',
        line: Mml.compose`${Mml.thing(this as unknown as Stuff)} is empty. Put flour and water in it first.`,
      };
    }
    const giver = req.actor;
    // Captured now — the mint runs later, at engaged-completion, where no
    // command frame exists.
    const makerPath = giver.getIdentityPath() ?? '';
    const commandText = req.commandText;
    return {
      ok: true,
      durationMs: KNEAD_MS,
      effortW: 400,
      beginSelf: Mml.compose`You turn ${Mml.thing(this as unknown as Stuff)} out and set to, pushing the heel of your hand through it and folding it back.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          // ⭐ The method word. An OPEN string on the build — nothing
          // switches on it, and that is what keeps `knead` a method.
          this.setBuildMethod('kneaded');
          this.recordCommand(commandText);
          const outcome = await CraftingApi.mintFromBuild({
            vessel: this as unknown as Stuff,
            contributions: [...this.getContributions()],
            method: this.getBuildMethod(),
            makerPath,
          });
          if (!outcome.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`It will not come together. Whatever is in there is not a dough.`)
              .send();
            return;
          }
          this.clearBuild();
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`It comes together and turns silky under your hands. You round it up and leave it in the trough.`,
            )
            .toPeers(Mml.compose`${Mml.actor(giver)} works a dough in ${Mml.thing(this as unknown as Stuff)}.`)
            .send();
        })().catch((err: unknown) => {
          console.error('DoughTrough: mint failed', err);
        });
      },
    };
  }
}
