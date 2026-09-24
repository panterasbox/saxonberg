/**
 * DoseController — ⭐ **give a body an antidote.**
 *
 * `dose <patient> with <vial>`: the vial's matter carries an
 * `antidote:<toxin>` tag (a free-form `Material` tag — D7), and dosing
 * reads those tags against the patient's live toxin burdens, crashing each
 * matching burden (`Metabolic.applyAntidote`). A dose is spent from the
 * vial. What an antidote counters is a fact about the SUBSTANCE, not this
 * verb — a `Material` tag, exactly as a caustic's cure is a fact about the
 * agent — so no new mixin: an author writes a vial of antivenin and it
 * works.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult, MqlManyResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Metabolic } from '../../../../lib/metabolism/Metabolic';
import { BulkableApi } from '../../../../api/bulk';

const TOPIC = 'act.deed';
/** Litres of a remedy one dose spends. */
const DOSE_LITRES = 0.05;
const ANTIDOTE_PREFIX = 'antidote:';

interface DoseModel extends CommandModel {
  patient?: MqlOneResult;
  with?: MqlManyResult;
}

export default class DoseController extends CommandController<DoseModel> {
  async execute(model: DoseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;
    if (!MixinApi.isMetabolic(target)) {
      return this.fail(context, 'There is nothing there to dose.', 'no-body');
    }

    // Find a reachable vessel whose matter names an antidote, and which
    // toxin(s) it counters.
    const found = this.findRemedy(model.with);
    if (found === null) {
      return this.fail(
        context,
        'You have no remedy to hand — nothing here that names an antidote.',
        'no-remedy',
      );
    }
    const { vessel, slot, counters } = found;
    if (slot.getAmount().rawValue() < DOSE_LITRES) {
      return this.fail(context, 'The vial is empty.', 'empty-vial');
    }

    // Crash each burden the remedy counters and the patient actually has.
    const body = target as Stuff & Metabolic;
    const cured: string[] = [];
    for (const type of counters) {
      if ((body.toxinBurdens[type] ?? 0) > 0) {
        body.applyAntidote(type);
        cured.push(type);
      }
    }

    if (cured.length === 0) {
      const who = self ? 'you have' : 'they have';
      return this.fail(
        context,
        `The remedy would counter ${counters.join(', ')}, but ${who} none of it.`,
        'nothing-to-counter',
      );
    }

    // Spend the dose.
    slot.setAmount(
      Quantity.of(slot.getAmount().rawValue() - DOSE_LITRES, 'L'),
    );

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You take a dose from ${Mml.thing(vessel)}. It bites going down, and the poison starts to let go.`
          : Mml.compose`You give ${Mml.thing(target)} a dose from ${Mml.thing(vessel)}.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} takes a dose from ${Mml.thing(vessel)}.`
          : Mml.compose`${Mml.actor(giver)} doses ${Mml.thing(target)} from ${Mml.thing(vessel)}.`,
      )
      .send();
  }

  /**
   * The first reachable vessel whose matter carries an `antidote:<toxin>`
   * tag, with the toxin types it counters — a NARROWING over the bound
   * `[mixin.BulkableMixin]` default (state, not identity: no predicate can
   * ask what a vessel holds — `lint:instrument-args`).
   */
  private findRemedy(
    bound: MqlManyResult | undefined,
  ): {
    vessel: Stuff;
    slot: NonNullable<ReturnType<typeof BulkableApi.slotFor>>;
    counters: string[];
  } | null {
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (!m) continue;
      const counters = m
        .getTags()
        .filter((t) => t.startsWith(ANTIDOTE_PREFIX))
        .map((t) => t.slice(ANTIDOTE_PREFIX.length));
      if (counters.length > 0) return { vessel: c, slot, counters };
    }
    return null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
