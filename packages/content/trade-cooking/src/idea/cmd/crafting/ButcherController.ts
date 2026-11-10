/**
 * ButcherController — `butcher <body>`: **take a dead animal apart.**
 *
 * The act the whole build turns on, because it is the one that creates
 * both halves of the pressure at once: it hands you far more meat than you
 * can eat before it turns (so preservation becomes a decision rather than
 * a curiosity), and it is where contamination *comes from* (so the
 * invisible hazard has a source you can point at).
 *
 * ⭐⭐⭐ **Every rule below is the carcass's** (controller-liquidity W10,
 * D16): `Butcherable.butcherPlan` runs the ladder, dresses the yield and
 * lays the cuts down. This file binds the kit and writes the words; the
 * sections are the design the carcass carries.
 *
 * ## ⚠⚠ D14 — you cannot butcher a person
 *
 * The gate is `SpeciesApi.isSentient`, which already ships and is already
 * the line combat draws between a cull and a coup. **Not a clade walk:**
 * `species/constructa/metallica/tutor-bot` is sentient and sits nowhere
 * near `hominidae`, so a walk up the tree would cheerfully let a player
 * butcher the tutor-bot. `sentient` is the line this game already draws
 * for lawful killing, which is exactly the consistency the requirement
 * claims for itself. The refusal reads as the world having a view, never
 * as a validator saying no.
 *
 * ## ⭐⭐ The carcass chain — ONE butcher, and it reads the animal
 *
 * This used to be one of **two** `butcher` verbs. The stockyard had its
 * own: it killed the animal and took it apart in one act, out of a module
 * table of five hardcoded fractions that was the same for a hen and a
 * bullock, crediting `stockmanship`, with no contamination anywhere. So
 * an animal gave different things depending on which word you typed at
 * it, and neither answer was the animal's own.
 *
 * Killing and dressing are two acts. `slaughter` kills — and so does a
 * fight, a fox, a fall and old age — and every one of them leaves the
 * same `Corpse`. This act takes that body apart, wherever and however it
 * died, which is what makes the hedgerow and the stockyard the same job.
 *
 * ⭐ And the yield is **dressed off the body**: `Species.dressOut` turns
 * the species' declared shares into kilograms using the mass the animal
 * actually had and the condition it died in (`Corpse.conditionAtDeath`,
 * stamped at the kill and frozen — a dead animal's condition cannot
 * change). A bullock therefore gives eight times a ewe for one reason:
 * it is eight times the animal. Nothing here knows a species' name.
 *
 * ⚠ **A live animal is refused, and it is told which act it wants.**
 * The order matters: a live target used to be refused *"is not a
 * carcass"* before anything about it was read, so the person who typed
 * `butcher ewe` at a live ewe learned nothing. Sentient → named →
 * no-yield → alive, so each no is the most specific true one.
 *
 * ## ⭐⭐ D15 — the clock started at the KILL, not at the knife
 *
 * A corpse already runs a decay clock, and it is a *forensic* one on its
 * own cadence. If the cuts' spoilage clock started when you cut them, a
 * player could kill a boar, leave it three days, come back, and get
 * **fresh meat** — a free lunch of exactly the shape the cooking build
 * closed when it made a kill step deposit the dose the population had
 * already earned.
 *
 * So the cuts derive their state from `sinceDeath()`: a microbial load
 * advanced over that elapsed time at the carcass's own temperature. Field
 * dressing is time-critical, and the cellar earns its keep from the first
 * kill.
 *
 * ## The skill, and where it actually bites
 *
 * `butchery` answers two questions and neither is a damage number:
 * **how much** you get, and **how much gut** ends up on the meat. Gut
 * spillage is the dominant real contamination route and it is precisely
 * what an unskilled hand does — so an unskilled butcher yields less AND
 * contaminates more, from one band read.
 *
 * ## What confers it
 *
 * The **edge**, not the class: a `bladed` construction. That keeps the two
 * facts apart — *carrying* contamination is a property of any surface that
 * touches food (`ContaminableMixin`, composed broadly), while *butchering*
 * is an affordance of an edge. Collapse them and you get either a sieve
 * that can butcher or a knife that cannot chop.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import type {
  ButcherDressed,
  ButcherRefusal,
  ButcherRefusalReason,
} from '@saxonberg/server/mud/lib/craft/Butcherable';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

export interface ButcherModel extends CommandModel {
  body: MqlOneResult;
  blade?: MqlManyResult;
  block?: MqlManyResult;
  /** A WORD — which cut to take (`butcher ewe for loin`). */
  cut?: string;
  /** The saw / cleaver that decide how deep the breakdown can go. */
  tools?: MqlManyResult;
}

export default class ButcherController extends CraftController<ButcherModel> {
  async execute(model: ButcherModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const body = model.body?.stuff ?? null;

    if (!body) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.body?.raw ?? ''}' to butcher.`)
        .send();
      context.note({ kind: 'empty-result', field: 'body', query: model.body?.raw ?? '' });
      return;
    }
    // ⚠ Not an organism at all — a chair, a sack. Nothing further to say.
    if (!MixinApi.isOrganism(body)) {
      return this.decline(context, Mml.compose`${Mml.thing(body)} is not a carcass.`, 'not-a-carcass');
    }
    // ⭐ A live beast is not a carcass — it composes no ledger — so nothing
    // here can take it apart; the controller only says WHY, most specific
    // first (`liveReason`), and a rewrite that skips this changes no world.
    if (!MixinApi.isButcherable(body)) {
      const reason = await ButcherController.liveReason(body);
      return this.decline(context, ButcherController.refusalWords(reason, body), reason);
    }

    // ⭐⭐ The carcass decides everything (`Butcherable.butcherPlan`,
    // controller-liquidity W10): the ladder, the yield, the depth the tools
    // reach, joint or trim, the clock from the kill, the gut on the meat.
    const plan = await body.butcherPlan(giver, {
      blade: ButcherController.bladeOf(model.blade),
      tools: model.tools?.stuff ?? [],
      block: ButcherController.blockOf(model.block),
      cut: model.cut ?? '',
    });
    if (plan === null) return;
    if (!plan.ok) {
      return this.decline(context, ButcherController.refusalWords(plan.reason, body), plan.reason);
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r: ButcherRefusal) => ButcherController.refusalWords(r.reason, body),
      onDone: (f) => ButcherController.doneWords(f, giver),
    });
  }

  /**
   * Why a body that is not a carcass cannot be butchered — the words'
   * choice, read off the animal (the sentient line first: D14).
   */
  protected static async liveReason(body: Stuff): Promise<ButcherRefusalReason> {
    if (!MixinApi.isOrganism(body)) return 'still-alive';
    await SpeciesApi.preloadAnatomy(body);
    const species = body.getSpecies();
    if (!species) return 'unidentified-species';
    if (SpeciesApi.isSentient(body)) return 'sentient-corpse';
    if (MixinApi.isNamed(body) && (body.getName() ?? '') !== '') return 'named-animal';
    if (species.getButcheryYield().length === 0) return 'no-yield';
    return 'still-alive';
  }

  protected static refusalWords(reason: ButcherRefusalReason, body: Stuff): Composed {
    switch (reason) {
      case 'unidentified-species':
        return Mml.compose`You look at ${Mml.thing(body)} and cannot make out what it was. You are not putting a knife into that.`;
      case 'sentient-corpse':
        return Mml.compose`You put the knife away. Whatever else ${Mml.thing(body)} is now, it was somebody — and there is no cut of meat on this earth worth the road that starts here.`;
      case 'named-animal':
        return Mml.compose`That is ${Mml.thing(body)}. You named it, and it is not meat.`;
      case 'no-blade':
        return Mml.compose`You would need an edge for that — a knife, something bladed.`;
      case 'no-yield':
        return Mml.compose`There is nothing on ${Mml.thing(body)} worth the cutting.`;
      case 'still-alive':
        return Mml.compose`${Mml.thing(body)} is alive. If you mean to kill it, say so — a beast is slaughtered, and then it is butchered.`;
      case 'no-such-cut':
        return Mml.compose`There is no such cut on ${Mml.thing(body)}.`;
      default: {
        const never: never = reason;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  /** ⭐⭐ What is left, in words — the refusal doing the teaching. */
  protected static doneWords(
    f: ButcherDressed,
    giver: Stuff,
  ): { self: Composed; peers: Composed } {
    const notes: string[] = [];
    if (f.wanting.length) {
      const wants = f.wanting.map((w) => `${w.stem} (${w.needs === 'saw' ? 'a saw' : 'a cleaver and a block'})`);
      notes.push(`Still on it, for want of a tool: ${wants.join(', ')}.`);
    }
    if (f.alreadyGone.length) notes.push(`Already off it: ${f.alreadyGone.join(', ')}.`);
    return {
      self: Mml.compose`You open ${Mml.thing(f.body)} with ${Mml.thing(f.blade)} and work it down to ${String(f.cuts.length)} piece(s). ${notes.join(' ')}`,
      peers: Mml.compose`${Mml.actor(giver)} butchers ${Mml.thing(f.body)}.`,
    };
  }

  /**
   * The blade — a NARROWING over what the binder bound (`butcher.yaml`'s
   * `[mixin.ConstructedMixin]` default): the gate is the construction, so a
   * clasp knife opens a carcass as the boning knife does.
   */
  protected static bladeOf(bound: MqlManyResult | undefined): Stuff | null {
    for (const candidate of bound?.stuff ?? []) {
      if (MixinApi.isConstructed(candidate) && candidate.getConstructionForm() === 'bladed') return candidate;
    }
    return null;
  }

  /** The block — bound by what it CAN DO (surfaced AND contaminable), never by class. */
  protected static blockOf(bound: MqlManyResult | undefined): Stuff | null {
    for (const candidate of bound?.stuff ?? []) {
      if (MixinApi.isContaminable(candidate) && MixinApi.isPlacing(candidate)) return candidate;
    }
    return null;
  }

  private decline(context: CommandContext, line: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
