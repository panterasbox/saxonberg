/**
 * StallGiveUpController — `stall give-up` — hands the renter what is on
 * the counter, **deletes the pitch's record** and takes it down; the
 * house stays (its account is theirs) with nothing to operate (over
 * {@link StallControllerBase}).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Business } from '@saxonberg/server/mud/api/employment';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import MarketStalls from '../../thing/MarketStalls';
import { StallControllerBase, TOPIC } from './StallControllerBase';

export default class StallGiveUpController extends StallControllerBase {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const renterKey = giver.getIdentityPath() ?? '';
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const square = here && MixinApi.isContainer(here) ? (here as Stuff & Container) : null;
    const fixture =
      square?.getContents().find((c): c is MarketStalls => c instanceof MarketStalls) ?? null;
    if (!fixture) return this.fail(context, 'There is no market here.', 'no-market');
    // ⭐ The BOOK says which pitch is theirs. Before this the counter's
    // identity was derived from the renter, so giving up needed only
    // their key; now the square is what knows, which is the point.
    const pitch = fixture.pitchOf(renterKey);
    if (!pitch) return this.fail(context, "You hold no stall here.", 'no-stall');
    const ids = StallGiveUpController.idsFor(fixture, pitch);
    const counter = StuffApi.findByTemplatePath<Stock>(ids.counter) ?? null;
    if (!counter) return this.fail(context, "You hold no stall here.", 'no-stall');
    // Everything on the counter comes back to the keeper's hands — custody
    // only; a supplier's crate is still the supplier's (`reclaim` finds
    // it wherever it is).
    if (MixinApi.isContainer(giver)) {
      for (const good of [...counter.getContents()]) {
        counter.removeListing?.(MixinApi.isChattel(good) ? good.getChattelId() : '');
        ContainmentApi.move(good as unknown as Stuff & Containable, giver as Stuff & Container);
      }
    }
    // ⚠ DELETE the pitch's record, do not capture it empty. See the
    // header: a pitch that remembers the last keeper's counter hands it
    // to the next renter. The owner IS the pitch key, so this is one
    // record.
    await PersistableApi.deleteAllFor(ids.key);
    const house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (house) house.setOperatingLocations([]);
    await StuffApi.destruct(counter as unknown as Stuff);
    // The pitch is free for the next keeper. Last, so a throw above
    // leaves the let intact rather than orphaning a standing counter.
    await fixture.releasePitch(renterKey);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pack the stall away; what was on it is in your hands.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} packs a stall away.`)
      .send();
  }
}
