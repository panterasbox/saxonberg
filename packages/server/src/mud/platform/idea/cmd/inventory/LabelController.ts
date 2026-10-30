/**
 * LabelController — `label <thing> [text]`.
 *
 * Writes a player's own name onto a thing; with no text, clears it.
 *
 * The mechanic it exists for is narrow and the verb deliberately is not
 * (magic-items D28): derived appearance means descriptors rotate, so a
 * flask you know is healing eventually comes back looking like something
 * else. A label does not rotate. Built as **general annotation** rather
 * than a potions feature, because it serves storage, shops and gifts
 * just as well — and a potions-only version would have been the same
 * code with a smaller reach.
 *
 * ⭐ **On a crop standing in a field it marks ONE plant** (field
 * population D6): `label wheat trial at the gate end` mints an individual
 * of the stand's own kind out of the part named, leaves it standing where
 * it was (`takeSpecimen(0, { cut: false })` — it goes on growing), names
 * it with the label (else the labeller's own name), and gives it a root
 * zone of its own, so water and feed aimed at it reach it alone. It is
 * not an area crop, so `look` lists it and `water trial` binds it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import Plant from '../../../thing/Plant';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Soil } from '../../../../lib/husbandry/Soil';

const TOPIC = 'sense.survey';

interface LabelModel extends CommandModel {
  target: MqlOneResult;
  text?: string;
  /** `at <patch>` — which part of a divided field (field population D6). */
  patch?: MqlOneResult;
}

export default class LabelController extends CommandController<LabelModel> {
  async execute(model: LabelModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    if (!MixinApi.isLabelled(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There is nowhere on ${Mml.thing(target)} to write anything.`,
        )
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'LabelledMixin' });
      return;
    }

    // ⭐ A crop standing in a field: mark one plant of it (D6). When a
    // part was NAMED, the stand of that kind rooted there wins over a
    // plant the binder found first (a stem in your hand — carried things
    // bind first): the player named the ground.
    if (MixinApi.isGrowing(target)) {
      const patch = model.patch?.stuff ?? null;
      let crop: (Stuff & Growing) | null = target.isAreaCrop() ? target : null;
      if (!crop && patch && MixinApi.isSoil(patch)) {
        // Ask the ground you stand on; a part asks the ground it is fixed to.
        const here = MixinApi.isContainable(giver as unknown as Stuff)
          ? (giver as unknown as Stuff & { getContainer(): Stuff | null }).getContainer()
          : null;
        const ground = here && MixinApi.isSoil(here) ? here : patch;
        const there = ground.rootedAreaCrop(patch);
        if (there && there.isSameKindAs(target)) crop = there;
      }
      if (crop) {
        await this.labelOneOf(model, context, crop);
        return;
      }
    }

    // Anywhere else `at …` is part of what you wrote — the view bounds
    // the greedy text at `at`, so it is put back (`label vial meet at
    // noon` labels the vial *meet at noon*, as it always did).
    const tail = (model.patch?.raw ?? '').trim();
    const text = [(model.text ?? '').trim(), tail ? `at ${tail}` : '']
      .filter((t) => t.length > 0)
      .join(' ');
    if (text.length === 0) {
      const had = target.isLabelled();
      target.setLabel('');
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          had
            ? Mml.compose`You rub the label off ${Mml.thing(target)}.`
            : Mml.compose`${Mml.thing(target)} carries no label to remove.`,
        )
        .send();
      return;
    }

    target.setLabel(text);
    MessageApi.scene(giver)
      .topic(TOPIC)
      // Read back what was STORED, not what was typed: the setter trims
      // and caps, and showing the player something other than what the
      // world now holds would be a small lie.
      .toSelf(Mml.compose`You label it: ${target.getLabel()}.`)
      .send();
  }

  /**
   * The crop branch (D6): the GROUND says which part (or refuses in its
   * own words), the stand there yields one living individual, and the
   * label goes on that.
   */
  private async labelOneOf(
    model: LabelModel,
    context: CommandContext,
    named: Stuff & Growing,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const patchRaw = (model.patch?.raw ?? '').trim();
    const patchBound = model.patch?.stuff ?? null;
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
    if (!ground || !MixinApi.isContainer(ground)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(named)} is not standing in anything.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-rooted' });
      return;
    }
    let stand: (Stuff & Growing) | null = named;
    let part: (Stuff & Soil) | null = null;
    if (MixinApi.isSoil(ground)) {
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

    // ⚠ The noun is read off the STAND before the mint: the individual is
    // the stand's kind, and its words are the stand's.
    const noun = stand.getSpecimenNoun();
    const individual = await stand.takeSpecimen(0, { cut: false });
    individual.setGroundPart(part ? part.soilPartKey() : stand.getGroundPart());
    if (MixinApi.isContainable(individual)) {
      ContainmentApi.move(individual, ground);
    }
    if (!MixinApi.isLabelled(individual)) return;
    // What it is called before the label goes on — the reply's noun.
    const called = individual.getPresentation();
    const text = (model.text ?? '').trim();
    // ⭐ With no text, YOUR name goes on it — the verb's own meaning.
    individual.setLabel(text.length > 0 ? text : giver.getPresentation());
    const label = individual.getLabel();
    if (MixinApi.isVisible(individual)) {
      const base = noun || individual.getShortDescription();
      individual.setShortDescription(`${base} labeled "${label}"`);
    }
    if (MixinApi.isPerceptible(individual)) {
      for (const word of label.toLowerCase().split(/[^\p{L}\p{N}'-]+/u)) {
        if (word) individual.addKeyword(word);
      }
      individual.addKeyword(label);
      individual.addKeyword('labeled');
    }
    if (individual instanceof Plant) individual.installRootZone();
    try {
      await PersistableApi.captureHostOf(individual);
      await PersistableApi.captureHostOf(ground);
    } catch (err) {
      console.warn('LabelController: capture after labeling failed:', err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        part
          ? Mml.compose`You tie your label to ${called} at ${Mml.thing(part)}: ${label}.`
          : Mml.compose`You tie your label to ${called}: ${label}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} ties a label to one plant in ${Mml.thing(ground)}.`,
      )
      .send();
  }
}
