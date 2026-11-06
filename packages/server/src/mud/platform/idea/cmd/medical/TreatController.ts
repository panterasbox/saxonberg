/**
 * TreatController — `treat [target] [--with <thing>] [--for <condition>]`.
 *
 * ⭐⭐ **Input and output** (controllers-are-io D11): the PATIENT decides
 * (`VitalsMixin.treatmentPlanFor`) — what is wrong, what the remedy can relieve,
 * how hard that is, what comes of it — and the remedy answers through what it
 * is. This file words what comes back.
 *
 * The medic vertical: dress a bleeding wound on a body (self or another),
 * consuming a reachable **dressing** item. Treatment is **skill-gated** — harm
 * is the first non-combat advancement consumer.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TreatmentDone, TreatmentRefusal } from '../../../../lib/vitals/Vitals';
import type { Trauma } from '../../Condition';

type Composed = ReturnType<typeof Mml.compose>;

interface TreatModel extends CommandModel {
  target?: MqlOneResult;
  /** `--with <item>` — the treatment being offered. */
  with?: MqlOneResult;
  /**
   * ⭐⭐ `--for <condition>` — **what the medic thinks it is.** The judgment
   * loop: `analyze patient` hands back candidates plural and unranked, and
   * this is where the medic commits.
   */
  for?: string;
}

const REMEDY_WORDS: Record<string, string> = {
  dressing: 'a bandage',
  fluid: 'water',
  medicine: 'sitting with them',
  rest: 'rest',
  warmth: 'warmth',
  cooling: 'cooling',
  air: 'air',
  // ⭐ The mechanical wounds' treatments (D4). A broken bone wants SETTING (a
  // splint); a torn organ wants SURGERY — tokens the trade's instruments
  // answer, and until one is to hand `treat` says so.
  setting: 'setting, with a splint',
  surgery: 'surgery',
  // ⭐ A foreign body has to come OUT before anything can close (D6) — the
  // extraction the `operate` catalogue offers. Dressing over it does nothing
  // but seal the thing in.
  extraction: 'the thing taken out — an extraction',
  // ⭐ A caustic is still eating. What it wants is not a treatment you apply
  // but the REMOVAL of the cause — which is why `rinse` is a verb of its own
  // rather than another thing to carry.
  rinsing: 'rinsing off, with water',
};

export default class TreatController extends EngagedActController<TreatModel> {
  async execute(model: TreatModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Default to self when no target was named; reject a named-but-unresolved
    // query.
    let target: Stuff | null;
    if (model.target?.stuff) {
      target = model.target.stuff;
    } else if (model.target?.raw) {
      this.say(context, `You don't see any '${model.target.raw}' to treat.`, 'empty-result');
      return;
    } else {
      target = giver;
    }
    if (!MixinApi.isVitals(target)) {
      this.say(context, `You can't treat ${Mml.thing(target).toString()}.`, 'not-a-body');
      return;
    }
    const patient: Stuff = target;
    const isSelf = patient === giver;

    const plan = target.treatmentPlanFor({
      by: giver,
      offered: model.with?.stuff ?? null,
      ...(model.for ? { named: model.for } : {}),
    });
    if (!plan.ok) {
      this.say(context, TreatController.refusalLine(plan, patient, isSelf), plan.reason);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => Mml.fromMarkup(Mml.escape(TreatController.refusalLine(r, patient, isSelf))),
      onDone: (f) => TreatController.doneWords(f, giver, patient, isSelf),
    });
  }

  private say(context: CommandContext, detail: string, reason: string): void {
    this.decline(context, Mml.fromMarkup(Mml.escape(detail)), reason, detail);
  }

  private static refusalLine(r: TreatmentRefusal, patient: Stuff, isSelf: boolean): string {
    switch (r.reason) {
      case 'no-wound':
        return `${isSelf ? 'You have' : `${patient.getPresentation()} has`} nothing to treat.`;
      case 'wound-interior':
        return 'There is nothing to dress — the wound is inside.';
      case 'wrong-treatment':
        return TreatController.mismatchLine(r.facts.by ?? '', r.facts.wanted ?? null);
      default: {
        const unworded: never = r.reason;
        throw new Error(`TreatController: no words for '${String(unworded)}'`);
      }
    }
  }

  /** Prose for a treatment that does nothing for what is wrong. */
  private static mismatchLine(offered: string, wanted: string | null): string {
    if (wanted === null) return 'Nothing you have will touch that.';
    const o = REMEDY_WORDS[offered] ?? offered;
    const w = REMEDY_WORDS[wanted] ?? wanted;
    return `${o[0]!.toUpperCase()}${o.slice(1)} does nothing for that. It wants ${w}.`;
  }

  /** A short human word for the wound's site (`body.leg.left.foot` → `foot`). */
  private static siteWord(w: Trauma): string {
    const parts = w.site.split('.');
    return parts[parts.length - 1] ?? w.site;
  }

  private static doneWords(
    f: TreatmentDone,
    giver: Stuff,
    patient: Stuff,
    isSelf: boolean,
  ): { self: Composed; peers?: Composed | null } {
    const who = isSelf ? 'yourself' : patient.getPresentation();
    const escaped = (line: string): Composed => Mml.fromMarkup(Mml.escape(line));
    switch (f.kind) {
      case 'stabilized':
        return {
          self: isSelf
            ? Mml.compose`You drag yourself back from the edge.`
            : Mml.compose`You drag ${Mml.actor(patient)} back from the edge.`,
          peers: isSelf
            ? Mml.compose`${Mml.actor(giver)} drags themselves back from the edge.`
            : Mml.compose`${Mml.actor(giver)} drags ${Mml.actor(patient)} back from the edge.`,
        };
      case 'lost':
        return {
          self: isSelf ? Mml.compose`You can't stop it.` : Mml.compose`You can't hold ${Mml.actor(patient)}.`,
        };
      case 'wound': {
        const verb = f.fluid ? 'get water onto' : 'dress';
        return {
          self: isSelf
            ? Mml.compose`You ${verb} the ${f.wound.type} on your ${TreatController.siteWord(f.wound)}.`
            : Mml.compose`You ${verb} the ${f.wound.type} on ${Mml.actor(patient)}.`,
          peers: isSelf
            ? Mml.compose`${Mml.actor(giver)} tends a wound.`
            : Mml.compose`${Mml.actor(giver)} tends a wound on ${Mml.actor(patient)}.`,
        };
      }
      case 'infection':
        return {
          self: f.cleared
            ? Mml.compose`You get water and rest into ${who}, and the worst of it passes.`
            : f.knocked
              ? Mml.compose`You do what can be done for ${who}. It is not nothing.`
              : Mml.compose`You sit with ${who} for a while. You are not sure it helped.`,
          peers: isSelf
            ? Mml.compose`${Mml.actor(giver)} tends themselves.`
            : Mml.compose`${Mml.actor(giver)} tends ${Mml.actor(patient)}.`,
        };
      case 'named-miss':
        // ⚠ It does NOT say "wrong". The body says it, by not improving.
        return {
          self: escaped(`You treat ${who} for ${f.named}, and do it properly. Nothing about them changes.`),
        };
      case 'named-remedy-wrong':
        return {
          self: escaped(`You have it right — but ${TreatController.mismatchLine(f.offered, f.wanted)}`),
        };
      case 'named-hit':
        return {
          self: escaped(`You treat ${who} for ${f.named}, and it answers.`),
          peers: Mml.compose`${Mml.actor(giver)} tends ${Mml.actor(patient)}.`,
        };
      default: {
        const unworded: never = f;
        throw new Error(`TreatController: no words for ${String(unworded)}`);
      }
    }
  }
}
