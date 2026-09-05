/**
 * GrubController — `grub`, **the heaviest work on the farm**.
 *
 * Grubbing out is the real word and the real job: thorn, bramble, root
 * and stone off ground that has been left to itself. It is step three of
 * D54's lifecycle (*ground → claim → **clear** → treat → establish →
 * maintain → revert*) and it is the gate on planting — you can sow sour,
 * wet ground and get a bad crop, which is a lesson; you cannot sow a
 * thicket.
 *
 * ⭐⭐ **The cleared stone IS the wall** (D56). Stony ground is expensive
 * to clear and **cheap to fence**, which inverts an expectation in a way
 * a player remembers, is historically exact — the stone walls of Ireland
 * and New England are the fields' own stones stacked at the edge — and
 * makes the waste zero. The stone comes up as a real thing you have to
 * carry somewhere.
 *
 * ⭐ **And limy ground gives up marl** (D66). Digging calcareous clay
 * from a pit and spreading it on light land was *the* land improvement of
 * its era, and marl pits are still visible in field corners. It is the
 * pH lever that needs no kiln, no fuel and no other trade — which is why
 * it, and not burnt lime, is the one this build ships a source for. A
 * player who wants to sweeten a sour field digs it out of a sweet one and
 * carries it, which is exactly what marling was.
 *
 * ⚠ Clearing used to SPEND something (D61: rough ground was forageable,
 * and grubbing it out made it pay less to gather from). That half is
 * **cut** — foraging shipped as one verb reachable only on ground you
 * had already plotted, yielding one item nothing consumed, and a system
 * half-built reads as designed. Grubbing is pure cost again until the
 * follow-on builds foraging properly, which is honest: it is what
 * clearing a thicket is.
 */

import { FieldWorkController, FIELD_TOPIC, LABOUR_PER_ACT } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';

/** What a spadeful of a stony headland leaves standing at the edge. */
const STONE_ROW = '/trade/farming/thing/field-stone';
/** Calcareous clay, dug out of the corner of a sweet field. */
const MARL_ROW = '/trade/farming/thing/marl';

/** Above this stoniness, an act of grubbing turns up stone worth stacking. */
const STONE_THRESHOLD = 0.35;
/** At or above this pH the subsoil is calcareous enough to be marl. */
const MARL_PH = 7.2;

export default class GrubController extends FieldWorkController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no field here to grub out.`, 'no-field');
      return;
    }
    const tool = this.toolOf(giver, 'digging');
    if (!tool) {
      this.decline(context, Mml.compose`Not with your bare hands. You want a spade.`, 'no-tool');
      return;
    }
    const { field, sample, bill } = reading;
    if (field.progressOn('clearing', bill) >= 1) {
      this.decline(
        context,
        Mml.compose`There is nothing left on this ground to grub out.`,
        'already-clear',
      );
      return;
    }

    const required = bill.clearing + bill.stonePicking;
    this.engageAct(context, {
      // Steep ground is slower, and stone is slower still. The pace IS
      // the ground, so a player feels D55 before they read it anywhere.
      durationMs: Math.round(4_000 * (1 + sample.slopeDeg / 20 + sample.stoniness)),
      cost: 6,
      beginSelf: Mml.compose`You set to with ${Mml.thing(tool)}, cutting into the thorn and levering out what is under it.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to grubbing out the rough ground.`,
      onComplete: () => {
        void this.finish(context, reading, required);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: Awaited<ReturnType<FieldWorkController['fieldOf']>>,
    required: number,
  ): Promise<void> {
    if (!reading) return;
    const giver = context.commandGiver;
    const { field, sample, bill } = reading;
    const after = field.bankWork('clearing', LABOUR_PER_ACT, bill);

    const spoils: Stuff[] = [];
    if (sample.stoniness >= STONE_THRESHOLD) {
      const stone = await this.mint(STONE_ROW, field);
      if (stone) spoils.push(stone);
    }
    if (sample.nativePh >= MARL_PH) {
      const marl = await this.mint(MARL_ROW, field);
      if (marl) spoils.push(marl);
    }

    const done = after >= 1;
    const spoilLine =
      spoils.length === 0
        ? ''
        : ` You stack ${spoils.map((s) => s.getPresentation()).join(' and ')} at the headland.`;
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        done
          ? Mml.compose`The last of it comes out. ${field.improvementPhrase(bill)}.${spoilLine}`
          : Mml.compose`Another swathe of it comes out; ${field.improvementCause(bill) ?? 'there is more to do'}.${spoilLine}`,
      )
      .send();
    await this.credit(giver, required);
  }

  /** Clone a spoil row into the field it came out of. */
  private async mint(row: string, field: Stuff & Container): Promise<Stuff | null> {
    try {
      const thing = await StuffApi.clone<Stuff>(row);
      ContainmentApi.move(thing as Stuff & Containable, field);
      return thing;
    } catch {
      // ⚠ A missing spoil row is a content gap, not a reason to lose the
      // work: the clearing is banked either way.
      return null;
    }
  }
}
