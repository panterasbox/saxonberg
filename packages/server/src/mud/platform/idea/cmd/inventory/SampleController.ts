/**
 * SampleController — `sample <thing|face>`.
 *
 * ⭐⭐ **A sample is the REAL MATERIAL, stamped with where it was taken.**
 * Not a token, not a record, not a special class: a piece of the actual
 * ore or the actual food, carrying three fields that say where it came
 * from, who took it and when. That is what lets the bench assay the
 * thing itself and the report say honestly what it is a report OF.
 *
 * Five cases, in order:
 *
 *   0. ⭐ **a crop standing in a field** (field population D7) — pull ONE
 *      stem from the stand at the part named (`sample wheat at the top
 *      end`): a real plant of the crop's own kind, carrying the growth it
 *      had there and the read it had — its cause, and what its roots
 *      showed — stamped at the pull. The stand keeps its area. Checked
 *      BEFORE the sample-bearing cases, because a plant is `Sampled` too
 *      and would otherwise be stamped in place where it stands.
 *   1. **a stackable sample-bearing thing** — `split(1)` and stamp the
 *      piece with *here / you / now*. ⭐ The reading-relevant half was
 *      already shipped (`Ore.onSplit` carries the grade across), so this
 *      case is split plus a stamp, not a new mechanism.
 *   2. **an unstackable sample-bearing thing** — stamp it in place. A
 *      loaf is one loaf; you do not cut a crumb off it to read it.
 *   3. **unresolved text, and ground that can yield** — the room's
 *      `sampleFace(actor, raw)` mints a piece (the `analyze power`
 *      duck-typed precedent), and the piece is stamped.
 *   4. **anything else** — refuse IN THE THING'S OWN TERMS, and teach
 *      the rule while refusing.
 *
 * ⚠⚠ Case 4 carries the build's whole pedagogy about what a sample IS,
 * because the samplable set is narrow on day one and the refusal is the
 * only place a player learns why. A **place or a condition** cannot be
 * carried; a **made thing** would be ruined by cutting a piece off; a
 * **person** is not something you take from. Between them they teach
 * *you can take a piece of matter, and nothing else.*
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Container } from '../../../../lib/spatial/Container';
import type { Sampled } from '../../../../lib/instrument/Sampled';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Soil } from '../../../../lib/husbandry/Soil';
import { Mixins } from '../../../../lib/mixin';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { ContainmentApi } from '../../../../api/containment';
import { WorldClockApi } from '../../../../api/worldclock';
import { Mml } from '../../../../api/mml';
import { PersistableApi } from '../../../../api/persistable';

interface SampleModel extends CommandModel {
  subject?: MqlOneResult;
  /** `at <patch>` — which part of a divided field (field population D5). */
  patch?: MqlOneResult;
}

const TOPIC = 'act.deed';

export default class SampleController extends CommandController<SampleModel> {
  async execute(model: SampleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const named = model.subject?.stuff ?? null;
    const raw = (model.subject?.raw ?? '').trim();

    // ⭐⭐ **A name that resolved to the ROOM is the GROUND, not a
    // thing.** `sample the north face` binds the working itself — a
    // mine room is keyworded `face` — and routing that to the
    // named-thing path answered *"you cannot carry a working face
    // anywhere"*, which is true of the room and not what anybody asked.
    // Found by driving; the player meant the rock in front of them.
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (named && named.stuffId !== room?.stuffId) {
      // ⭐ A crop standing in a field FIRST — see case 0. When a part was
      // NAMED, the stand of that kind rooted there wins over a plant the
      // binder found first (a stem already in your hand — carried things
      // bind first): the player named the ground. Found staging W4 live.
      const crop = standingAt(named, model.patch?.stuff ?? null, room);
      if (crop) {
        await this.fromCrop(context, giver, crop, model.patch);
        return;
      }
      await this.fromThing(context, giver, named);
      return;
    }
    await this.fromGround(context, giver, raw);
  }

  /**
   * Case 0 — a stem out of a standing crop. The GROUND says which part
   * (or refuses in its own words, listing them); the variation is the
   * stand's seeded one, so the same spot in the same season gives the
   * same stem.
   */
  private async fromCrop(
    context: CommandContext,
    giver: Stuff,
    named: Stuff & Growing,
    patchArg: MqlOneResult | undefined,
  ): Promise<void> {
    const patchRaw = (patchArg?.raw ?? '').trim();
    const patchBound = patchArg?.stuff ?? null;
    if (!patchBound && patchRaw !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }
    const patch: (Stuff & Soil) | null =
      patchBound && MixinApi.isSoil(patchBound) ? patchBound : null;
    const ground = MixinApi.isContainable(named) ? named.getContainer() : null;
    let stand: (Stuff & Growing) | null = named;
    let part: (Stuff & Soil) | null = null;
    if (ground && MixinApi.isSoil(ground)) {
      const r = ground.resolvePartFor(patch);
      if (!r.ok) {
        MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.fromMarkup(r.line)).send();
        context.note({ kind: 'controller-rejected', reason: r.reason, detail: r.line });
        return;
      }
      part = r.part;
      if (part) stand = named.standIn(part);
    }
    if (!stand) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Nothing of that stands at ${Mml.thing(part as Stuff)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-sown-there',
        detail: `no ${named.getPresentation()} rooted in ${part?.getPresentation() ?? 'that part'}`,
      });
      return;
    }
    const piece = await stand.takeSpecimen(stand.specimenVariation());
    if (MixinApi.isContainable(piece) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(piece, giver);
    }
    // ⭐ Stamped with the GROUND it came from — the field, as every sample
    // is stamped with where its taker stood.
    this.stamp(giver, piece, ground);
    try {
      await PersistableApi.captureHostOf(piece);
    } catch (err) {
      console.warn('SampleController: capture after sampling failed:', err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        part
          ? Mml.compose`You pull ${Mml.thing(piece)} from ${Mml.thing(part)} and look at the roots.`
          : Mml.compose`You pull ${Mml.thing(piece)} and look at the roots.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} pulls ${Mml.thing(piece)} and looks at its roots.`,
      )
      .send();
  }

  /** Cases 1, 2 and 4 — something the player named. */
  private async fromThing(
    context: CommandContext,
    giver: Stuff,
    subject: Stuff,
  ): Promise<void> {
    if (!MixinApi.isActive(subject, Mixins.Sampled)) {
      this.refuse(
        context,
        TOPIC,
        cannotSample(subject),
        'not-samplable',
        subject.getPresentation(),
      );
      return;
    }
    // ⭐ `split(1)` on the stack itself — the method is the contract,
    // and `placeDirect`ing the splitoff is the stack substrate's own
    // job. A whole-stack split short-circuits and returns the stack,
    // which is the right answer for a single lump.
    const piece = MixinApi.isStackable(subject)
      ? await subject.split(1)
      : subject;
    if (!piece) {
      this.refuse(
        context,
        TOPIC,
        `There is not enough of ${subject.getPresentation()} to take a piece of.`,
        'nothing-to-take',
      );
      return;
    }
    if (piece !== subject) {
      const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
      if (room && MixinApi.isContainer(room)) {
        ContainmentApi.move(
          piece as unknown as Stuff & Containable,
          room as Stuff & Container,
        );
      }
    }
    this.stamp(giver, piece);
    this.narrate(context, giver, piece);
  }

  /** Case 3 — the ground in front of you, and case 4's ground arm. */
  private async fromGround(
    context: CommandContext,
    giver: Stuff,
    raw: string,
  ): Promise<void> {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    // ⭐ Duck-typed, the `analyze power` precedent: the kernel asks the
    // room a question and a room that can answer it does. Ground's
    // `StrataMixin` implements it; a drawing-room does not, and neither
    // knows about the other.
    const yielder = room as unknown as {
      sampleFace?(actor: Stuff, direction: string): Promise<Stuff | null>;
    } | null;
    if (!yielder || typeof yielder.sampleFace !== 'function') {
      this.refuse(
        context,
        TOPIC,
        raw === ''
          ? 'Sample what? There is nothing here you could take a piece of.'
          : `You cannot take a piece of ${raw} — this is a place, not a thing you can carry away.`,
        'not-samplable',
        raw,
      );
      return;
    }
    const piece = await yielder.sampleFace(giver, raw);
    if (!piece) {
      this.refuse(
        context,
        TOPIC,
        'There is nothing here worth taking a piece of.',
        'nothing-to-take',
        raw,
      );
      return;
    }
    if (MixinApi.isContainer(room as Stuff)) {
      ContainmentApi.move(
        piece as unknown as Stuff & Containable,
        room as Stuff & Container,
      );
    }
    this.stamp(giver, piece);
    this.narrate(context, giver, piece);
  }

  /**
   * ⭐⭐ *Here, you, now* — and `here` is the place you are STANDING,
   * not the place the thing came from.
   *
   * That is what makes salting work and makes it honest: carry a rich
   * lump to a barren claim, drop it, sample it there, and the stamp says
   * the barren face — truthfully, because that is where the sample was
   * taken. The record never lies; the person handing it over does.
   */
  private stamp(giver: Stuff, piece: Stuff, at?: Stuff | null): void {
    if (!MixinApi.isActive(piece, Mixins.Sampled)) return;
    const room =
      at ?? (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const where = identityOf(room);
    // ⚠ `getIdentityPath()`, never `getTemplatePath()`: every player
    // Avatar shares one lineage stamp, so keying the taker on lineage
    // would make every sample in the world look like one person's.
    (piece as unknown as Sampled).stampSampling(
      where,
      identityOf(giver),
      Math.round(WorldClockApi.getNow().rawValue() * 1000),
    );
  }

  /** ⭐ A bystander can tell — taking a sample is a visible act. */
  private narrate(context: CommandContext, giver: Stuff, piece: Stuff): void {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You take ${Mml.thing(piece)} as a sample, and note where it came from.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} takes a sample and writes something down.`,
      )
      .send();
  }
}

/**
 * The area crop `named` stands for: itself when it is one; else, when a
 * part was named, the crop of its kind rooted in that part of the ground
 * `here`; else `null`.
 */
function standingAt(
  named: Stuff,
  patch: Stuff | null,
  here: Stuff | null,
): (Stuff & Growing) | null {
  if (!MixinApi.isGrowing(named)) return null;
  if (named.isAreaCrop()) return named;
  if (!patch || !MixinApi.isSoil(patch)) return null;
  // Ask the ground you stand on; a part asks the ground it is fixed to.
  const ground = here && MixinApi.isSoil(here) ? here : patch;
  const crop = ground.rootedAreaCrop(patch);
  return crop && crop.isSameKindAs(named) ? crop : null;
}

/** The durable key for a person or a place — never the lineage stamp. */
function identityOf(stuff: Stuff | null): string {
  if (!stuff) return '';
  const s = stuff as unknown as {
    getIdentityPath?(): string | null;
    getTemplatePath?(): string | null;
  };
  return s.getIdentityPath?.() ?? s.getTemplatePath?.() ?? '';
}

/**
 * ⭐⭐ **Refuse in the thing's own terms, and teach the rule while
 * refusing.** One sentence each, and between them they say: you can take
 * a piece of matter, and nothing else.
 */
function cannotSample(subject: Stuff): string {
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
