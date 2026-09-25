/**
 * FireController — `fire <kiln>` / `burn <kiln>`: ⭐⭐ **run whatever is
 * loaded in a chamber, at whatever heat it is holding.**
 *
 * ## Why this is the PLATFORM's, on the appliance
 *
 * The plan had this verb afforded by an open working and living in the
 * quarrying trade, and accepted that *"a potter's shed affording `fire` is
 * the ceramics build's own class"* — which is the named failure mode *a
 * feature whose second instance requires a kernel edit*. And the
 * contradicting doctrine was already written in the kernel, on
 * `FurnaceMixin` itself:
 *
 * > *"The fire-appliance verbs are **afforded by the appliance** … a room
 * > with a furnace affords lighting it, dousing it, working its bellows, and
 * > bringing a workpiece to its fire."*
 *
 * Five platform verbs already hang off that principle. Firing a loaded
 * chamber is the sixth, and it holds from Rome to New York: a limekiln, a
 * bread oven, a bottle kiln and a crucible furnace are one mechanism on
 * different dials.
 *
 * ## ⭐⭐ The recipes do the work, and that is the whole expressiveness claim
 *
 * There is **no list of firings in this file**. The controller reads the
 * charge, asks the catalogue which recipe takes it, and runs that. So a pack
 * that ships a glass batch, a crucible charge or a brick clamp ships **a
 * recipe row** and touches no code — where the plan's version shipped two
 * recipe rows *"for the ladder and `help`"* while a bespoke act did the real
 * work, which is a ladder that lies.
 *
 * ⚠ **And it does the transform itself rather than calling
 * `CraftingApi.craft`, deliberately.** A craft picks its inputs out of the
 * actor's **reach**; a firing consumes what is **in the chamber**. Handing
 * the pick to reach would let a player fire a kiln using the limestone in
 * their own arms while the kiln's charge sat there, which is not what firing
 * is. `SmeltController.runCharge` made the same decision for the same
 * reason and is the shipped precedent; what is new here is that *which*
 * transform runs is a row rather than a branch.
 *
 * ## ⚠ `fire` is not `ignite`, and the synonym is not decoration
 *
 * *"Fire the kiln"* ambiguously means *light it* — which `ignite` owns — so
 * the chamber must already be lit and up to heat, and the refusal says which
 * of the two is missing (the smelt's own hard-won distinction: an unlit
 * furnace is a *cold* one, and telling somebody to work the bellows on a
 * stone-cold shaft sends them in a circle). **And a lime-burner burns lime**,
 * which is why `burn` is on the same view rather than being a second verb.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Furnace } from '../../../../lib/fire/Furnace';
import type { Recipe, RecipeInputSlot } from '../../../../lib/craft/Recipe';
import type RecipeCatalogue from '../../RecipeCatalogue';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { SchedulerApi } from '../../../../api/scheduler';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';

const TOPIC = 'act.deed';

/** Where the recipe roster lives. */
const CATALOGUE_PATH = '/platform/idea/RecipeCatalogue';

/** Game-ms a firing holds the chamber at heat. */
const FIRE_MS = 60_000;

/** Metabolic watts of tending a firing — stoking and watching, not swinging. */
const FIRE_EFFORT_W = 420;

export interface FireModel extends CommandModel {
  kiln?: MqlOneResult;
}

/** One matched slot: the recipe's demand, and the items that answer it. */
interface MatchedSlot {
  slot: RecipeInputSlot;
  items: Stuff[];
}

/** A firing, resolved: which recipe, what it consumes, how many it makes. */
interface Firing {
  recipe: Recipe;
  matched: MatchedSlot[];
  /** How many whole output units the charge supports. */
  batches: number;
}

export default class FireController extends CommandController<FireModel> {
  async execute(model: FireModel, context: CommandContext): Promise<void> {
    const bound = model.kiln?.stuff ?? null;
    if (bound === null || !MixinApi.isFurnace(bound) || !MixinApi.isContainer(bound)) {
      this.decline(
        context,
        model.kiln?.raw
          ? Mml.compose`You don't see any '${model.kiln.raw}' here to fire.`
          : Mml.compose`Fire what? There is nothing here with a chamber in it.`,
        'no-kiln',
      );
      return;
    }
    const kiln = bound as Stuff & Container & Furnace;

    const charge = kiln.getContents().filter((c) => MixinApi.isTangible(c));
    if (charge.length === 0) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(kiln)} is empty. Load it with something before you fire it.`,
        'no-charge',
      );
      return;
    }

    const firings = await this.firingsFor(charge);
    if (firings.length === 0) {
      this.decline(
        context,
        Mml.compose`Nothing in ${Mml.thing(kiln)} matches a firing. Whatever is in there, heat is not what it wants.`,
        'no-firing',
      );
      return;
    }
    // ⚠ One firing at a time. Two charges wanting different heats averaged
    // together would be answering a question nobody asked — the smelt's
    // `mixed-charge` rule, one appliance over.
    if (firings.length > 1) {
      this.decline(
        context,
        Mml.compose`There is more than one thing in ${Mml.thing(kiln)} that wants firing, and they do not want the same heat. Take one or the other out.`,
        'mixed-charge',
      );
      return;
    }
    const firing = firings[0]!;

    // ⚠⚠ **Unlit is COLD, not cool.** `getHeldTemperatureK()` is the
    // temperature this chamber WOULD pin at, computed without reference to
    // whether anything is burning — so a stone-cold kiln reports its full
    // figure, and answering it with *"work the bellows"* sends a player in a
    // circle. The smelt learned this by being driven in a browser.
    if (!kiln.isLit()) {
      this.decline(
        context,
        Mml.compose`The charge is in and ${Mml.thing(kiln)} is stone cold. Light it first — nothing fires until something is burning.`,
        'not-lit',
      );
      return;
    }

    const held = kiln.getHeldTemperatureK();
    const wanted = firing.recipe.getRequiresHeatK();
    if (held < wanted) {
      const bellowsLeft = !kiln.isBellowsActive();
      this.decline(
        context,
        bellowsLeft
          ? Mml.compose`${Mml.thing(kiln)} is holding ${String(Math.round(held))} K and this firing wants ${String(Math.round(wanted))} K. Work the bellows.`
          : Mml.compose`${Mml.thing(kiln)} is holding ${String(Math.round(held))} K with the bellows already going, and this firing wants ${String(Math.round(wanted))} K. The draught is not the problem — this fuel does not burn hot enough.`,
        'insufficient-heat',
      );
      return;
    }

    this.engage(context, () => {
      // ⚠⚠ A module function over captured locals, never `this.<method>`: a
      // controller is one ephemeral clone per execution and is destructed the
      // moment `execute` returns, while a firing holds the chamber at heat
      // for a game minute. A completion calling back into it would run on a
      // destroyed Stuff and the proxy would answer with a silent no-op — the
      // charge would go in and nothing would ever come out.
      void runFiring(context, kiln, firing);
    });
  }

  /**
   * Every firing the charge supports, resolved from the CATALOGUE.
   *
   * ⭐ This is the whole of the expressiveness claim: the set of firings is
   * the set of recipe rows whose input slots the chamber's contents satisfy.
   * Nothing here names limestone, clay or glass.
   *
   * ⚠ A recipe qualifies only if **every** item slot it declares is
   * satisfied, and only item slots are considered — a firing is a dry
   * transform of solids in a chamber, and a bulk slot means the recipe wants
   * a vessel and a measure, which is somebody else's act.
   */
  private async firingsFor(charge: readonly Stuff[]): Promise<Firing[]> {
    const catalogue = StuffApi.findByTemplatePath<RecipeCatalogue>(CATALOGUE_PATH);
    if (catalogue === null || catalogue === undefined) return [];
    const out: Firing[] = [];
    for (const recipe of catalogue.allRecipes()) {
      if (recipe.getRequiresHeatK() <= 0) continue;
      const slots = recipe.getInputSlots();
      if (slots.length === 0) continue;
      if (slots.some((s) => s.kind !== 'item')) continue;

      const matched: MatchedSlot[] = [];
      let batches = Number.POSITIVE_INFINITY;
      let ok = true;
      const claimed = new Set<string>();
      for (const slot of slots) {
        const items = charge.filter(
          (c) =>
            !claimed.has(c.stuffId) &&
            MixinApi.isTangible(c) &&
            c.hasMaterialTag(slot.category),
        );
        const per = Math.max(1, slot.count ?? 1);
        if (items.length < per) {
          ok = false;
          break;
        }
        for (const i of items) claimed.add(i.stuffId);
        matched.push({ slot, items });
        batches = Math.min(batches, Math.floor(items.length / per));
      }
      if (!ok || !(batches >= 1)) continue;
      out.push({ recipe, matched, batches });
    }
    return out;
  }

  /** Hold the chamber at heat over game time — the smelt's engagement. */
  private engage(context: CommandContext, onDone: () => void): void {
    const giver = context.commandGiver;
    if (
      MixinApi.isExerting(giver) &&
      !giver.canExert(FIRE_EFFORT_W, FIRE_MS / 1000)
    ) {
      this.decline(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['attention'],
      durationMs: FIRE_MS,
      effortW: FIRE_EFFORT_W,
      onComplete: onDone,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You seal the chamber down and settle in to hold it at heat.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} sets a firing going.`)
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/**
 * The firing itself: consume what the recipe asked for, mint what it says,
 * leave the rest in the chamber.
 *
 * ⚠⚠ A module function — the controller is long gone. And the actor may be
 * too: a player can log out inside a firing. ⭐ **The chamber still fires**,
 * because a kiln does not stop because somebody left; only the telling of it
 * needs a listener.
 */
async function runFiring(
  context: CommandContext,
  kiln: Stuff & Container & Furnace,
  firing: Firing,
): Promise<void> {
  const giver = context.commandGiver;
  const watching = !giver.isDestroyed();

  // Consume exactly `batches × count` out of each slot, and no more: a
  // charge of seven where the firing takes two yields three and leaves one,
  // which is what a lime-burner's odd stone actually does.
  const consumed: Stuff[] = [];
  for (const m of firing.matched) {
    const per = Math.max(1, m.slot.count ?? 1);
    consumed.push(...m.items.slice(0, per * firing.batches));
  }
  // ⭐ The material the output inherits, taken from the FIRST slot's first
  // item — the recipe's `outputTemplate` carries its own material for a row
  // that means one (a pot is ceramic whatever the clay was), and nothing
  // here overrides it. The read is kept because a later recipe may want it.
  const outputs: Stuff[] = [];
  for (let i = 0; i < firing.batches; i += 1) {
    try {
      const made = await StuffApi.clone<Stuff>(firing.recipe.getOutputTemplate());
      if (MixinApi.isContainable(made)) {
        ContainmentApi.move(made as Stuff & Containable, kiln);
      }
      outputs.push(made);
    } catch {
      // ⚠ A missing output row is a content gap. The charge is NOT consumed
      // in that case — an act that eats the stone and gives nothing back is
      // worse than one that refuses.
      console.error(
        `FireController: output row '${firing.recipe.getOutputTemplate()}' did not resolve`,
      );
      if (watching) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`The firing comes to nothing — and that is a fault in the books, not in your work.`,
          )
          .send();
      }
      return;
    }
  }
  for (const item of consumed) await StuffApi.destruct(item);

  if (MixinApi.isAdvancing(giver) && !giver.isDestroyed()) {
    await giver.creditDeed({
      discipline: firing.recipe.getDiscipline(),
      difficulty: 'standard',
      outcome: 'success',
    });
  }
  if (!watching || giver.isDestroyed()) return;

  const made = outputs[0];
  const count = outputs.length;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      made === undefined
        ? Mml.compose`The chamber cools and there is nothing in it.`
        : count === 1
          ? Mml.compose`The chamber cools. ${Mml.thing(made)} has come out of it.`
          : Mml.compose`The chamber cools. ${String(count)} of them have come out of it, starting with ${Mml.thing(made)}.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} draws a firing.`)
    .send();
}
