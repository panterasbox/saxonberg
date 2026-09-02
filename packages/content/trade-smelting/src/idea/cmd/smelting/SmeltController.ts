/**
 * SmeltController — `smelt`, and ⭐⭐ **the yield derives from the charge,
 * never from a recipe constant.**
 *
 *     metal out = Σ (lot mass × lot grade × the mineral's metal fraction)
 *
 * Every term is a fact something else already knows: the mass is the
 * lot's, the grade is what `hew` read off the deposit at the face, and
 * the metal fraction is the mineral's `composition` — which is itself
 * chemistry (two Cu in a 221.114 g/mol formula unit is 0.5748 by mass).
 * **Nobody anywhere authors how much copper comes out of a smelt.**
 *
 * That is what makes grade load-bearing END TO END: a lean lump is worth
 * less at the scale because it makes less metal in the furnace, and the
 * difference is visible through `analyze` on the bar. Every other design
 * — a recipe with a fixed output, a multiplier on quality — would have
 * made grade a number the player is told rather than a number the player
 * can act on.
 *
 * The gangue fluxes off as slag, and there is always more slag than
 * metal, because a lump of ore is mostly not ore.
 *
 * ⚠ **A charge below the furnace's reachable temperature refuses**, and
 * the refusal names what it would take. That is the ladder: charcoal
 * alone reaches copper, and iron wants the bellows and a later stage.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const TOPIC = 'act.deed';
const SMELTING = 'smelting';

/** The metal Stage A reduces, and the row its bar clones from. */
const COPPER = '/stuff/idea/material/element/copper';
const INGOT_ROW = '/trade/smelting/thing/copper-ingot';
const SLAG_ROW = '/trade/smelting/thing/slag';

/** How long a run takes, in game ms. */
const SMELT_MS = 4 * 60 * 60 * 1000;
/** Endurance a run costs, in percentage points. */
const SMELT_COST = 10;
/**
 * Charcoal baskets a run consumes. ⚠ More than the ore by mass, which is
 * why the smelter sits next to the fuel yard rather than next to the mine.
 */
const CHARCOAL_PER_RUN = 2;

export default class SmeltController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const furnace = room && MixinApi.isContainer(room)
      ? room.getContents().find((c) => MixinApi.isFurnace(c) && MixinApi.isContainer(c))
      : undefined;
    if (!furnace || !MixinApi.isFurnace(furnace) || !MixinApi.isContainer(furnace)) {
      this.decline(context, Mml.compose`There is no furnace here to charge.`, 'no-furnace');
      return;
    }

    const contents = furnace.getContents() as Stuff[];
    const ore = contents.filter((c) => isOre(c));
    const fuel = contents.filter((c) => isCharcoal(c));
    if (ore.length === 0) {
      this.decline(context, Mml.compose`The furnace holds no ore.`, 'no-ore');
      return;
    }
    if (fuel.length < CHARCOAL_PER_RUN) {
      this.decline(
        context,
        Mml.compose`Not enough charcoal in the furnace — a run wants ${String(CHARCOAL_PER_RUN)} baskets and there ${fuel.length === 1 ? 'is' : 'are'} ${String(fuel.length)}.`,
        'no-fuel',
      );
      return;
    }

    // ⚠ The heat gate, off the MATERIAL's own melting point. Nothing
    // here knows what copper is; it asks the metal.
    const metal = StuffApi.findByTemplatePath<Material>(COPPER);
    const meltingPoint = metal?.getMeltingPoint?.();
    const wanted =
      typeof meltingPoint === 'number' ? meltingPoint : (meltingPoint?.rawValue() ?? 1358);
    const held = furnace.getHeldTemperatureK();
    if (held < wanted) {
      this.decline(
        context,
        Mml.compose`The furnace is holding ${String(Math.round(held))} K and the run wants ${String(Math.round(wanted))} K. Light it, feed it, and work the bellows.`,
        'too-cold',
      );
      return;
    }

    // ⚠⚠ A free function, never `this.<method>`: a controller is one
    // ephemeral clone per execution, destructed the moment `execute`
    // returns, and a run holds the furnace at heat for hours of game
    // time. A completion calling back into it would run on a destroyed
    // Stuff and the proxy would answer with a silent no-op — the charge
    // would go in and no metal would ever come out. The mining acts
    // shipped that bug and a live drive found it; this never did.
    this.engage(context, () => {
      void runCharge(context, furnace as Stuff & Container, ore, fuel.slice(0, CHARCOAL_PER_RUN));
    });
  }

  private engage(context: CommandContext, onDone: () => void): void {
    const giver = context.commandGiver;
    if (MixinApi.isReserved(giver) && giver.hasReserve('endurance')) {
      giver.adjustReserve('endurance', Quantity.of(-SMELT_COST, '%'));
    }
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['attention'],
      durationMs: SMELT_MS,
      onComplete: onDone,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You charge the furnace and settle in to hold it at heat.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} charges the furnace.`)
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
 * The run. ⭐ Every number below comes from something else's knowledge:
 * nothing here decides how much metal there is.
 *
 * ⚠⚠ A module function: the controller is long gone by the time the
 * furnace is tapped.
 */
async function runCharge(
  context: CommandContext,
  furnace: Stuff & Container,
  ore: Stuff[],
  fuel: Stuff[],
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ The smelterman may be GONE — a run holds the furnace at heat for
  // hours of game time, and a player can log out inside it. Narrating to
  // a departed actor renders `undefined` into the scene composer and
  // throws an unhandled rejection that takes the process down. ⭐ The
  // furnace is still TAPPED, because the charge does not stop reducing
  // because somebody left; only the telling of it needs a listener.
  const watching = !giver.isDestroyed();

  let metalKg = 0;
    let chargeKg = 0;
    for (const lot of ore) {
      const lump = lot as unknown as {
        getQuantity?(): number;
        metalFractionOf(path: string): number;
        getMass?(): Quantity<'kg'>;
      };
      const count = lump.getQuantity?.() ?? 1;
      const each = lump.getMass?.().rawValue() ?? 0;
      chargeKg += each * count;
      metalKg += each * count * lump.metalFractionOf(COPPER);
    }
    for (const lot of [...ore, ...fuel]) StuffApi.destruct(lot);

    if (metalKg <= 0) {
      // ⚠ An honest nothing. A charge of barren rock runs to slag, and
      // saying so is better than inventing a token bar.
    await pour(furnace, SLAG_ROW, Math.max(chargeKg, 1));
    if (!watching) return;
    MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You tap the furnace and get slag — nothing but slag. Whatever was in that rock, it was not copper.`,
        )
        .send();
      await AdvancementApi.recordDeed(giver, {
        discipline: SMELTING, difficulty: 'standard', outcome: 'failure',
      });
      return;
    }

    const bar = await pour(furnace, INGOT_ROW, metalKg);
    await pour(furnace, SLAG_ROW, Math.max(chargeKg - metalKg, 0));

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You tap the furnace. Red metal runs into the sand and stiffens as you watch — ${metalKg.toFixed(2)} kg of copper out of ${chargeKg.toFixed(2)} kg of rock, and a heap of slag for the rest.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} taps the furnace, and metal runs.`)
      .send();

  void bar;
  if (!watching) return;
  await AdvancementApi.recordDeed(giver, {
    discipline: SMELTING, difficulty: 'standard', outcome: 'success',
  });
  }

/** Clone one product into the furnace and stamp its real mass. */
async function pour(furnace: Stuff & Container, row: string, kg: number): Promise<Stuff | null> {
    if (kg <= 0) return null;
    const item = await StuffApi.clone<Stuff>(row);
    const massed = item as unknown as { setMass?(q: Quantity<'kg'>): void };
    massed.setMass?.(Quantity.of(Number(kg.toFixed(3)), 'kg'));
    ContainmentApi.move(item as unknown as Stuff & Containable, furnace as never);
    return item;
  }

/** An ore lot: anything that can say what fraction of it is a given metal. */
function isOre(item: Stuff): boolean {
  return typeof (item as unknown as { metalFractionOf?: unknown }).metalFractionOf === 'function';
}

/** Charcoal: a thing whose material is tagged `fuel` and `carbon`. */
function isCharcoal(item: Stuff): boolean {
  if (!MixinApi.isTangible(item)) return false;
  const material = item.getMaterial() as Material | null;
  const tags = material?.getTags?.() ?? [];
  return tags.includes('fuel') && tags.includes('carbon');
}
