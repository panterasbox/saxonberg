/**
 * SampleController — `sample <thing|face> [at <part>]`.
 *
 * ⭐⭐ **A sample is the REAL MATERIAL, stamped with where it was taken.**
 * Not a token, not a record, not a special class: a piece of the actual
 * ore or the actual food, carrying three fields that say where it came
 * from, who took it and when. That is what lets the bench assay the
 * thing itself and the report say honestly what it is a report OF.
 *
 * ⭐ **One act, asked of the thing** (controller-liquidity W7c,
 * `Sampleable.samplePiece`): which piece comes off is the thing's — a
 * stem from a standing crop (`Plant`), a piece split off a stack or the
 * whole lump (`SampledMixin`), a chip off the face in front of you (the
 * ground's `StrataMixin`). The controller binds, asks, STAMPS (the stamp
 * is the verb's alone — `stampSampling` is gated here) and words.
 *
 * ⚠⚠ The refusal carries the build's whole pedagogy about what a sample
 * IS, because the samplable set is narrow and the refusal is the only
 * place a player learns why. A **place or a condition** cannot be
 * carried; a **made thing** would be ruined by cutting a piece off; a
 * **person** is not something you take from. Between them they teach
 * *you can take a piece of matter, and nothing else.*
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Sampled } from '../../../../lib/instrument/Sampled';
import type { Sampleable } from '../../../../lib/instrument/Sampleable';
import { Mixins } from '../../../../lib/mixin';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { WorldClockApi } from '../../../../api/worldclock';
import { Mml } from '../../../../api/mml';
import { PersistableApi } from '../../../../api/persistable';

interface SampleModel extends CommandModel {
  subject?: MqlOneResult;
  /** `at <patch>` — which part of a divided field (field population D5). */
  part?: MqlOneResult;
}

const TOPIC = 'act.deed';

export default class SampleController extends CommandController<SampleModel> {
  async execute(model: SampleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const named = model.subject?.stuff ?? null;
    const raw = (model.subject?.raw ?? '').trim();
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;

    // ⭐⭐ **A name that resolved to the ROOM is the GROUND, not a
    // thing.** `sample the north face` binds the working itself — a mine
    // room is keyworded `face` — and the player meant the rock in front
    // of them, not the room. Found by driving.
    const onGround = !named || named.stuffId === room?.stuffId;
    const subject = onGround ? room : named;
    if (!subject || !MixinApi.isActive(subject, Mixins.Sampleable)) {
      this.refuse(
        context,
        TOPIC,
        onGround
          ? raw === ''
            ? 'Sample what? There is nothing here you could take a piece of.'
            : `You cannot take a piece of ${raw} — this is a place, not a thing you can carry away.`
          : SampleController.cannotSample(subject as Stuff),
        'not-samplable',
        onGround ? raw : (subject as Stuff).getPresentation(),
      );
      return;
    }
    const partRaw = (model.part?.raw ?? '').trim();
    const partBound = model.part?.stuff ?? null;
    if (!partBound && partRaw !== '') {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You don't see any '${partRaw}' here.`).send();
      context.note({ kind: 'empty-result', field: 'patch', query: partRaw });
      return;
    }
    const part = partBound && MixinApi.isSoil(partBound) ? partBound : null;
    const answer = await (subject as Stuff & Sampleable).samplePiece(giver, { part, face: onGround ? raw : '' });

    if (answer.ok === 'choose' || (answer.ok === false && answer.reason === 'not-a-part-here')) {
      const line = this.partLine(answer);
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.fromMarkup(line)).send();
      context.note({ kind: 'controller-rejected', reason: answer.reason, detail: line });
      return;
    }
    if (answer.ok === false) {
      switch (answer.reason) {
        case 'not-samplable':
          this.refuse(context, TOPIC, SampleController.cannotSample(subject), answer.reason, subject.getPresentation());
          return;
        case 'nothing-to-take':
          this.refuse(
            context,
            TOPIC,
            onGround
              ? 'There is nothing here worth taking a piece of.'
              : `There is not enough of ${subject.getPresentation()} to take a piece of.`,
            answer.reason,
            onGround ? raw : '',
          );
          return;
        case 'nothing-sown-there':
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              answer.facts.part
                ? Mml.compose`Nothing of that stands at ${Mml.thing(answer.facts.part)}.`
                : Mml.compose`Nothing of that stands there.`,
            )
            .send();
          context.note({ kind: 'controller-rejected', reason: answer.reason, detail: subject.getPresentation() });
          return;
        default: {
          const never: never = answer;
          return never;
        }
      }
    }

    const { piece, from, at, part: from_part } = answer.facts;
    this.stamp(giver, piece, at);
    if (from === 'stem') {
      try {
        await PersistableApi.captureHostOf(piece);
      } catch (err) {
        console.warn('SampleController: capture after sampling failed:', err);
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          from_part
            ? Mml.compose`You pull ${Mml.thing(piece)} from ${Mml.thing(from_part)} and look at the roots.`
            : Mml.compose`You pull ${Mml.thing(piece)} and look at the roots.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} pulls ${Mml.thing(piece)} and looks at its roots.`)
        .send();
      return;
    }
    // ⭐ A bystander can tell — taking a sample is a visible act.
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You take ${Mml.thing(piece)} as a sample, and note where it came from.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes a sample and writes something down.`)
      .send();
  }

  /**
   * ⭐⭐ *Here, you, now* — and `here` is the place you are STANDING (or
   * the field a stem came from), not the place the thing came from.
   *
   * That is what makes salting work and makes it honest: carry a rich
   * lump to a barren claim, drop it, sample it there, and the stamp says
   * the barren face — truthfully, because that is where the sample was
   * taken. The record never lies; the person handing it over does.
   */
  private stamp(giver: Stuff, piece: Stuff, at: Stuff | null): void {
    if (!MixinApi.isActive(piece, Mixins.Sampled)) return;
    const room = at ?? (MixinApi.isContainable(giver) ? giver.getContainer() : null);
    // ⚠ `getIdentityPath()`, never `getTemplatePath()`: every player
    // Avatar shares one lineage stamp, so keying the taker on lineage
    // would make every sample in the world look like one person's.
    (piece as unknown as Sampled).stampSampling(
      SampleController.identityOf(room),
      SampleController.identityOf(giver),
      Math.round(WorldClockApi.getNow().rawValue() * 1000),
    );
  }

  /** The durable key for a person or a place — never the lineage stamp. */
  protected static identityOf(stuff: Stuff | null): string {
    if (!stuff) return '';
    return stuff.getIdentityPath() ?? '';
  }

  /**
   * ⭐⭐ **Refuse in the thing's own terms, and teach the rule while
   * refusing.** One sentence each, and between them they say: you can take
   * a piece of matter, and nothing else.
   */
  protected static cannotSample(subject: Stuff): string {
    const it = subject.getPresentation();
    if (MixinApi.isVitals(subject)) {
      return `Not something you take from a person. ${it} is somebody.`;
    }
    if (MixinApi.isContainer(subject) && !MixinApi.isContainable(subject)) {
      return `You cannot carry ${it} anywhere; it is a place, not a thing you can take.`;
    }
    if (MixinApi.isConstructed(subject) || MixinApi.isDurable(subject)) {
      return `You would have to cut a piece off ${it}, and that would ruin it.`;
    }
    return `${it} is not a kind of matter you can take a piece of and read.`;
  }
}
