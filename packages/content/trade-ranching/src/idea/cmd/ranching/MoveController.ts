/**
 * MoveController — `move <herd> to <field>`: **put a herd on a field**
 * (cover build D13).
 *
 * ⭐ The herd is a number in a book, so it is moved by the book's
 * keeper: the act writes the herd's line onto the field it goes to and
 * the field's pointer into the record, and closes the window on the
 * field it leaves. Nothing walks — a herd moved is a herd that is now
 * eating somewhere else. (Driving the animals along the lanes is the
 * ranching slate's.)
 *
 * Afforded at the HERDBOOK and beside a DRAFTED head of the herd (R3): a
 * field is farming's and must not name a ranching view.
 *
 * ## Who may
 *
 * Whoever holds the herd's home ground, or a hand on shift for a
 * business that works the field — the keeper's gate `sow` has (D6). The
 * criterion is title; the appeal is the record.
 *
 * ## Where to
 *
 * A field within the herd's home ground, named by its name or a word of
 * it, or `here`. Candidates are read where the keeper stands — this
 * place, the places its ways lead to, and the field the herd is on —
 * never searched for.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import Field from '@saxonberg/content-trade-farming/src/location/Field';
import HerdRegistry, { type HerdRecord } from '../../HerdRegistry';
import { RANCHING_TOPIC, HERD_REGISTRY_PATH } from './DraftController';

interface MoveModel extends CommandModel {
  herd?: string;
  field?: string;
}

export default class MoveController extends CommandController<MoveModel> {
  async execute(model: MoveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const herd = await this.pickHerd(registry, model.herd);
    if (!herd) {
      this.decline(
        context,
        Mml.compose`Move which herd? Name it — the college herd, the dairy herd.`,
        'no-herd',
      );
      return;
    }
    if (!(await this.mayMove(giver, herd))) {
      this.decline(
        context,
        Mml.compose`${herd.name} is not yours to move.`,
        'not-keeper',
      );
      return;
    }
    const wanted = (model.field ?? '').trim();
    if (!wanted) {
      this.decline(context, Mml.compose`Move ${herd.name} to which field?`, 'no-field');
      return;
    }
    const field = await this.pickField(giver, herd, wanted);
    if (!field) {
      this.decline(
        context,
        Mml.compose`There is no field called '${wanted}' on ${herd.name}'s ground near here.`,
        'no-such-field',
      );
      return;
    }
    const home = herd.homeExtent;
    const path = field.getTemplatePath() ?? '';
    if (home && !(path === home || path.startsWith(`${home}/`))) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(field)} is not ${herd.name}'s ground. They graze where they belong.`,
        'outside-home',
      );
      return;
    }
    if (herd.grazing === path) {
      this.decline(
        context,
        Mml.compose`${herd.name} are already on ${Mml.thing(field)}.`,
        'already-there',
      );
      return;
    }
    await registry.graze(herd.herdId, field);
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`You put ${herd.name} onto ${Mml.thing(field)}. They spread out and put their heads down.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} moves ${herd.name} onto ${Mml.thing(field)}.`)
      .send();
  }

  /**
   * The herd named — its name, a word of it, with or without the article
   * or a trailing "herd" — else the only herd filed. ⚠ Never found by
   * walking the room: resolution is the binder's (lint:instrument-args).
   */
  private async pickHerd(
    registry: HerdRegistry,
    named?: string,
  ): Promise<HerdRecord | null> {
    const words = (named ?? '').trim();
    if (!words) return registry.sole();
    const byName = await registry.named(words);
    if (byName) return byName;
    const bare = words.replace(/^the\s+/i, '');
    if (bare !== words) {
      const again = await registry.named(bare);
      if (again) return again;
    }
    const head = bare.replace(/\s+(herd|flock|book|register|tally)$/i, '');
    return head !== bare ? registry.named(head) : null;
  }

  /**
   * ⭐ The keeper's gate: whoever holds the herd's home ground, or a hand
   * on shift for a business that works it (the operator of the field the
   * herd is on, or of where the keeper stands).
   */
  private async mayMove(giver: Stuff, herd: HerdRecord): Promise<boolean> {
    const home = herd.homeExtent;
    if (home) {
      const held = await AccessApi.heldExtents(giver);
      if (held.some((e) => home === e || home.startsWith(`${e}/`))) return true;
    }
    if (!MixinApi.isEmployed(giver)) return false;
    const places: Stuff[] = [];
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (here) places.push(here);
    if (herd.grazing) {
      const field = StuffApi.findByTemplatePath(herd.grazing);
      if (field) places.push(field);
    }
    for (const place of places) {
      for (const business of EmploymentApi.operatorsAt(place)) {
        if (giver.isOnShiftFor(business.getOrganizationPath())) return true;
      }
    }
    return false;
  }

  /**
   * The field answering to `wanted` among the places the keeper can see
   * from here: this place, where its ways lead, and the field the herd
   * is on now.
   */
  private async pickField(
    giver: Stuff,
    herd: HerdRecord,
    wanted: string,
  ): Promise<Field | null> {
    const want = wanted.toLowerCase().replace(/^the\s+/, '');
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const candidates: Stuff[] = [];
    if (here) candidates.push(here);
    if (here && want === 'here') return here instanceof Field ? here : null;
    if (here && MixinApi.isExitable(here)) {
      for (const [, exit] of here.getExits()) {
        try {
          candidates.push(await exit.resolveDestination());
        } catch {
          /* a way that leads nowhere loaded is not a field */
        }
      }
    }
    if (herd.grazing) {
      const current = StuffApi.findByTemplatePath(herd.grazing);
      if (current) candidates.push(current);
    }
    for (const place of candidates) {
      if (!(place instanceof Field)) continue;
      const name = place.getFieldName().toLowerCase().replace(/^the\s+/, '');
      if (name === want || place.hasKeyword(want)) return place;
    }
    return null;
  }

  /** Decline diegetically, and file the structured reason. */
  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
