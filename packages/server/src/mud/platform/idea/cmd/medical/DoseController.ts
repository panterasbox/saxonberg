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
import { StuffApi } from '../../../../api/stuff';
import { TemplatePathPrefixes } from '../../../../lib/paths';
import { CompetenceBand } from '../../../../lib/advancement/CompetenceBand';
import type Condition from '../../Condition';
import type { Prescription } from '../../../../lib/vitals/Prescription';

const TOPIC = 'act.deed';
/** Litres of a remedy one dose spends. */
const DOSE_LITRES = 0.05;
const ANTIDOTE_PREFIX = 'antidote:';
const ACTIVE_TAG = 'active';

interface DoseModel extends CommandModel {
  patient?: MqlOneResult;
  with?: MqlManyResult;
  prescription?: MqlManyResult;
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
    // toxin(s) it counters. No antidote to hand → try the ACTIVE branch
    // (a prescribed/folk drug), then give up.
    const found = this.findRemedy(model.with);
    if (found === null) {
      return this.administerActive(model, context, target, self);
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
   * ⭐ The `active` branch (D9/D10) — administer a tagged active (a
   * prescribed anaesthetic/antibiotic, a folk analgesic) as a toxin
   * burden. Controlled actives (the Condition row's `prescriptionOnly`)
   * require the giver be a licensed doctor OR hold a matching
   * `Prescription`. ⚠ A refusal NAMES why — the 5-rights error is legible
   * (D14), never a silent no-op.
   */
  private async administerActive(
    model: DoseModel,
    context: CommandContext,
    target: Stuff,
    self: boolean,
  ): Promise<void> {
    const giver = context.commandGiver;
    const active = this.findActive(model.with);
    if (active === null) {
      return this.fail(
        context,
        'You have no remedy to hand — nothing here that names an antidote or an active.',
        'no-remedy',
      );
    }
    const { vessel, slot, type, amount } = active;
    if (slot.getAmount().rawValue() < DOSE_LITRES) {
      return this.fail(context, 'The vial is empty.', 'empty-vial');
    }

    // The prescription gate — read the active's Condition row.
    const row = StuffApi.findByTemplatePath<Condition>(
      TemplatePathPrefixes.metabolismCondition + type,
    );
    const controlled = row?.isPrescriptionOnly() === true;
    if (controlled) {
      const licensed =
        MixinApi.isAdvancing(giver) &&
        CompetenceBand.atOrAbove(
          await giver.competenceBandFor('medicine'),
          'competent',
        );
      if (!licensed) {
        const patientId =
          (target as Stuff).getIdentityPath?.() ??
          (target as Stuff).getTemplatePath?.() ??
          '';
        const slips = this.matchingPrescriptions(model.prescription, type);
        const mine = slips.find((s) => s.isFor(patientId, type));
        if (mine) {
          mine.spendDose();
        } else if (slips.length > 0) {
          return this.fail(
            context,
            'That prescription is not for them.',
            'wrong-patient',
          );
        } else {
          return this.fail(
            context,
            `No prescription — and you are not licensed to administer ${type}.`,
            'not-licensed',
          );
        }
      }
    }

    // Administer: the toxicity amount IS the per-dose amount for a remedy.
    const body = target as Stuff & Metabolic;
    body.introduceToxin(type, amount);
    slot.setAmount(Quantity.of(slot.getAmount().rawValue() - DOSE_LITRES, 'L'));

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'nursing',
        difficulty: 'easy',
        outcome: 'success',
      });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You take a dose of ${type} from ${Mml.thing(vessel)}.`
          : Mml.compose`You administer a dose of ${type} to ${Mml.thing(target)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} administers a dose from ${Mml.thing(vessel)}.`,
      )
      .send();
  }

  /** The first bound vessel holding a tagged `active` with a toxicity dose. */
  private findActive(
    bound: MqlManyResult | undefined,
  ): {
    vessel: Stuff;
    slot: NonNullable<ReturnType<typeof BulkableApi.slotFor>>;
    type: string;
    amount: number;
  } | null {
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (!m || !m.getTags().includes(ACTIVE_TAG)) continue;
      const dose = m.getToxicity()[0];
      if (!dose) continue;
      return { vessel: c, slot, type: dose.type, amount: dose.amount };
    }
    return null;
  }

  /** The bound prescription slips (resolved by the binder) that name
   * `active` with doses left — the controller only READS the results. */
  private matchingPrescriptions(
    bound: MqlManyResult | undefined,
    active: string,
  ): (Stuff & Prescription)[] {
    const out: (Stuff & Prescription)[] = [];
    for (const item of bound?.stuff ?? []) {
      if (MixinApi.isPrescription(item) && item.getActive() === active) {
        out.push(item);
      }
    }
    return out;
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
