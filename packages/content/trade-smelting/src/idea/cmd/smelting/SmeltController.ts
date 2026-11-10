/**
 * SmeltController — `smelt [at <furnace>]`, and ⭐⭐ **the charge decides
 * what you made.**
 *
 * The verb selects nothing. You put ore and fuel into a furnace, you light
 * it, you work the bellows or you do not, and what comes out is whatever
 * those choices actually make. There is no menu, no recipe argument, and no
 * place for a player to declare an intention the world then honors.
 *
 * ⭐ I/O over {@link SmeltingFurnace.smeltPlan} (controller-liquidity W9,
 * D16): the yield chemistry, the Fe–C ladder, the crucible run, the lining's
 * wear and the deed are the furnace's. This file words what the furnace
 * says — every refusal and every tap — and nothing else. The view's
 * `affords` term keeps a charcoal clamp (a furnace and a container one exit
 * away) from ever binding here.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import IronCarbon from '@saxonberg/content-trade-smithing/src/lib/IronCarbon';
import SmeltingFurnace, { type SmeltDone, type SmeltRefusal } from '../../../thing/SmeltingFurnace';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

/** The fire, bound by the view. */
interface SmeltModel extends CommandModel {
  furnace?: MqlOneResult;
}

export default class SmeltController extends CommandController<SmeltModel> {
  async execute(model: SmeltModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const furnace = model.furnace?.stuff ?? null;
    if (!(furnace instanceof SmeltingFurnace)) {
      SmeltController.decline(context, Mml.compose`There is no furnace here to charge.`, 'no-furnace');
      return;
    }
    const plan = furnace.smeltPlan(giver);
    if (!plan.ok) {
      SmeltController.decline(context, SmeltController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You charge the furnace and settle in to hold it at heat.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} charges the furnace.`,
      onRefused: (r) => SmeltController.refusalWords(r),
      onDone: (d) => SmeltController.tapWords(d, giver),
    });
  }

  protected static decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** ⭐ Every reason the furnace refuses a run (D4). */
  protected static refusalWords(r: SmeltRefusal): Composed {
    switch (r.reason) {
      case 'no-ore':
        return Mml.compose`The furnace holds nothing to work on.`;
      case 'mixed-charge':
        return Mml.compose`Ore and metal together — take one or the other out. You are either reducing rock or you are working a bar, and the furnace cannot do both at once.`;
      case 'no-fuel':
        return Mml.compose`Not enough charcoal in the furnace — a run wants at least ${String(r.facts.wantKg)} kg of it and there is ${r.facts.haveKg.toFixed(1)} kg.`;
      case 'not-lit':
        return Mml.compose`The charge is in and the shaft is stone cold. Nothing reduces until something is burning — light it, and then work the bellows.`;
      case 'too-cold': {
        const held = String(Math.round(r.facts.heldK));
        const wanted = String(Math.round(r.facts.wantedK));
        // ⭐ Iron does not want to be melted; it wants to be reduced, and the
        // heat that reduces it is the fuel-technology rung. Once the bellows
        // is going, the shortfall is the fuel's, not the draught's.
        if (r.facts.ferrous) {
          return r.facts.bellowsGoing
            ? Mml.compose`The furnace is holding ${held} K with the bellows already going, and the ore will not give up its oxygen below about ${wanted} K. The draught is not the problem — this fuel does not burn hot enough.`
            : Mml.compose`The furnace is holding ${held} K and the ore will not give up its oxygen below about ${wanted} K. It is not a question of melting the rock — work the bellows.`;
        }
        return r.facts.bellowsGoing
          ? Mml.compose`The furnace is holding ${held} K with the bellows already going, and the run wants ${wanted} K. This fuel does not burn hot enough.`
          : Mml.compose`The furnace is holding ${held} K and the run wants ${wanted} K. Work the bellows.`;
      }
      case 'no-product-row':
        return Mml.compose`The furnace runs, and what it makes has no name anybody here knows. (No product row is named by ${r.facts.material} — this is an authoring fault, not your smelt.)`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** What the tap looks like, and it says WHY. */
  protected static tapWords(d: SmeltDone, giver: Stuff): { self: Composed; peers?: Composed } {
    const peers = Mml.compose`${Mml.actor(giver)} taps the furnace.`;
    if (d.kind === 'slag') {
      return { self: Mml.compose`You tap the furnace and get slag — nothing but slag. Whatever was in that rock, it was not metal.` };
    }
    const pct = (d.carbon * 100).toFixed(2);
    const kg = d.metalKg.toFixed(2);
    const of = d.chargeKg.toFixed(2);
    // ⭐ Where the melt went — said, because what you do next depends on
    // it: a crucible is poured, a lump is remelted.
    const where =
      d.run === 'crucible'
        ? 'into the crucible, bright as a coal'
        : d.run === 'spilled'
          ? 'into the crucible until it brims, and the rest over onto the hearth'
          : 'onto the hearth, where it pools and starts to stiffen — there was no crucible in the fire to catch it';
    if (!d.ferrous) {
      return { self: Mml.compose`You tap the furnace. Red metal runs ${where} — ${kg} kg of ${d.metalName} out of ${of} kg of rock, and a heap of slag for the rest.`, peers };
    }
    if (d.liquid) {
      // ⭐ It ran EASIER, and the prose says so — the failure looks like the success.
      return {
        self: Mml.compose`It runs. You were expecting to rake a mass out of the bottom and instead the furnace pours, easily, a grey stream ${where} — ${kg} kg of it. Too much charcoal: at ${pct}% carbon this melted at ${String(Math.round(d.meltK))} K instead of ${String(IronCarbon.T_FE)}, and what it will set into is hard, grey and good for nothing you can hammer.`,
        peers,
      };
    }
    // ⭐ The tap names what the flux and the fuel did: a player who is not
    // told cannot learn it.
    const fluxLine = d.fluxed
      ? ' The limestone took the gangue off as a running slag — there is far less rubbish in this bloom than the rock had in it.'
      : '';
    const sourLine = d.soured
      ? " And the coal's sulfur is in the iron — hot-short; it will crack under the hammer rather than draw."
      : '';
    const body = d.bloom
      ? `Nothing pours. You rake the bottom of the shaft and drag out a mass the size of a loaf, glowing dull and shot through with glass — ${kg} kg of iron out of ${of} kg of rock, at ${pct}% carbon, and it never melted at all. It will not be a bar until it has been beaten into one.`
      : `You draw the bar out and let it cool. It went in soft and it is coming out hard: the charcoal has worked ${pct}% carbon into it at ${String(Math.round(d.heldK))} K, which is the band — you have made steel, and you could just as easily have overshot it.`;
    return { self: Mml.compose`${body}${fluxLine}${sourLine}`, peers };
  }
}
