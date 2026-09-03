/**
 * WearController — claim a Wearable's body-plan slots on the actor.
 *
 * Multi-slot claims are atomic via the giver's `occupyAll`.
 *
 * Validation surface (from `cmd/wear.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory (target-level) + `requires: WearableMixin`
 *
 * The TypeScript narrows below throw if reached — meaning a validator
 * failed to do its job. They're not user-facing failure paths.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SpeciesApi } from '../../../../api/species';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Wearable } from '../../../../lib/slot/Wearable';
import type { Container } from '../../../../lib/spatial/Container';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';

interface WearModel extends CommandModel {
  target: MqlOneResult;
  /** `wear set <name>` / `wear sets` — the wardrobe stanza. */
  name?: string;
  /** `--save`: capture what is on right now under `<name>`. */
  save?: boolean;
}

/**
 * The presentation of the outermost thing already occupying one of
 * `slots` — what the refusal names, so the line says what is in the
 * way rather than *"no"*. Falls back to a bare phrase if the stack has
 * gone empty between the check and the read.
 */
function outermostClaimedBy(
  giver: Stuff & Slotted,
  candidate: Stuff,
  slots: readonly string[],
): string {
  for (const slot of slots) {
    for (const occ of giver.getOccupants(slot)) {
      if ((occ as unknown as Stuff) === candidate) continue;
      return (occ as unknown as Stuff).getPresentation();
    }
  }
  return 'what you already have on';
}

/** Numeric AppSetting read with a seeded-literal fallback. */
function fitDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default class WearController extends CommandController<WearModel> {
  execute(model: WearModel, context: CommandContext): void {
    // ⭐ `wear set <name>` and `wear sets` are STANZAS on the shipped
    // `wear` view, not verbs. Zero new verbs ship, and in particular
    // `dress` stays unclaimed — settled with build-3 and reserved for
    // the butchery pack. A source-shape test asserts both halves.
    if (model.subcommand === 'sets') return this.listSets(context);
    if (model.subcommand === 'set') return this.wearSet(model, context);
    return this.wearOne(model, context);
  }

  /** `wear sets` — what is saved, and what is in each. */
  private listSets(context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isWardrobe(giver)) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You keep no wardrobe.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'WardrobeMixin' });
      return;
    }
    const names = giver.getWardrobeNames();
    if (names.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`You have no saved outfits. Put something on and use \`wear set <name> --save\`.`,
        )
        .send();
      return;
    }
    const lines = names
      .map((n) => `  ${n} — ${giver.getWardrobe(n).join(', ')}`)
      .join('\n');
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`Your outfits:\n${lines}`)
      .send();
  }

  /**
   * `wear set <name>` — put a saved outfit on in one command; with
   * `--save`, capture what is on right now under that name.
   *
   * ⚠ **Failures are per-item and non-fatal.** A keyword that resolves
   * to nothing is skipped with a readable line and the rest still land.
   * A dressing mistake has to be survivable and readable, and that
   * starts here.
   */
  private wearSet(model: WearModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const name = (model.name ?? '').trim();
    if (!MixinApi.isWardrobe(giver) || !MixinApi.isSlotted(giver)) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You keep no wardrobe.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'WardrobeMixin' });
      return;
    }
    if (name.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Which outfit?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-name',
        detail: 'wear set <name>',
      });
      return;
    }

    if (model.save) {
      // ⭐ Captured in WEAR ORDER — `wornStack()` is outermost-first, so
      // reversing it gives innermost-first, which is exactly the order a
      // replay must dress in for the covering ladder never to refuse.
      const keywords = [...giver.wornStack()]
        .reverse()
        .map((g) => {
          const asStuff = g as unknown as Stuff;
          return MixinApi.isPerceptible(asStuff)
            ? asStuff.getPrimaryKeyword()
            : undefined;
        })
        .filter((k): k is string => !!k);
      if (keywords.length === 0) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`You aren't wearing anything to save.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'nothing-worn',
          detail: name,
        });
        return;
      }
      giver.setWardrobe(name, keywords);
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`Saved '${name}': ${keywords.join(', ')}.`,
        )
        .send();
      return;
    }

    const keywords = giver.getWardrobe(name);
    if (keywords.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You have no outfit called '${name}'.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-set',
        detail: name,
      });
      return;
    }

    const worn: string[] = [];
    const missed: string[] = [];
    for (const keyword of keywords) {
      const item = this.findCarried(giver, keyword);
      if (!item) {
        missed.push(keyword);
        continue;
      }
      const sub: WearModel = {
        ...model,
        subcommand: undefined,
        target: { stuff: item as never, raw: keyword },
      } as WearModel;
      const before = context.getNotes().length;
      this.wearOne(sub, context, { quiet: true });
      if (context.getNotes().length === before) worn.push(keyword);
      else missed.push(keyword);
    }

    const put = worn.length > 0 ? `You put on ${worn.join(', ')}.` : '';
    const skipped =
      missed.length > 0 ? `Skipped: ${missed.join(', ')}.` : '';
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`${[put, skipped].filter(Boolean).join(' ')}`)
      .toPeers(
        worn.length > 0
          ? Mml.compose`${Mml.actor(giver)} dresses.`
          : Mml.compose``,
      )
      .send();
  }

  /** The first thing in the giver's contents answering to `keyword`. */
  private findCarried(
    giver: Stuff & Slotted,
    keyword: string,
  ): (Stuff & Wearable) | null {
    if (!MixinApi.isContainer(giver as unknown as Stuff)) return null;
    const held = (giver as unknown as Stuff & Container).getContents();
    for (const child of held) {
      const asStuff = child as unknown as Stuff;
      if (!MixinApi.isWearable(asStuff)) continue;
      // Already on — nothing to do, and not a miss either.
      if (giver.wornStack().includes(asStuff as never)) continue;
      if (
        MixinApi.isPerceptible(asStuff) &&
        asStuff.getPrimaryKeyword() === keyword
      ) {
        return asStuff as Stuff & Wearable;
      }
    }
    return null;
  }

  private wearOne(
    model: WearModel,
    context: CommandContext,
    opts: { quiet?: boolean } = {},
  ): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't have any '${model.target.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `WearController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `WearController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You have no body plan.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'BodyPlanMixin' });
      return;
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} doesn't fit your body.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-fit',
        detail: `${target.getPresentation()} doesn't fit your body`,
      });
      return;
    }
    // ⚠ The impossible fit — a HARD refusal, independent of the ladder.
    //
    // ⭐ A halfling's coat on a dragonborn fails on a NUMBER, not on a
    // species check, so a heavy human and a light dragonborn shade into
    // each other correctly. And a `cutTo` naming a DIFFERENT body plan
    // is refused whatever the distance: both are `biped`, so slot
    // matching alone would let the coat straight on.
    const fit = target.fitOn(giver);
    const refuseAbove = fitDial(AppSettingKeys.textilesFitRefuseAbove, 0.35);
    if (fit.measurable && (fit.wrongBody || fit.distance > refuseAbove)) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} was not cut for a body like yours — it will not go on.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'fit-impossible',
        detail: `${target.getPresentation()} was cut for a different body`,
      });
      return;
    }
    // ⚠ The ladder refusal, and it is narrow on purpose: a low band may
    // not go OUTSIDE a high one — you cannot put a shirt over plate.
    // Shirt-vs-coat is NOT refused: both are band 0, which of them goes
    // on first is the player's call, and getting it wrong should make
    // you cold rather than be prevented.
    if (giver.wouldLayerViolate(target)) {
      const outer = outermostClaimedBy(giver, target, slots);
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} won't go on over ${outer}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'layer-order',
        detail:
          `${target.getPresentation()} would sit outside something heavier`,
      });
      return;
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`Your ${slot} is occupied.`)
          .send();
        context.note({
          kind: 'slot-occupied',
          host: MessageApi.refOf(giver),
          slot,
        });
        return;
      }
    }
    // occupyAll may throw on race conditions or shape
    // violations; the dispatcher's outer catch emits
    // controller-error uniformly — no try/catch here per plan.
    giver.occupyAll(target, [...slots]);
    if (!opts.quiet) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You put on ${Mml.thing(target)}.`)
        .toPeers(
          Mml.compose`${Mml.actor(giver)} puts on ${Mml.thing(target)}.`
        )
        .send();
    }
    return;
  }
}
