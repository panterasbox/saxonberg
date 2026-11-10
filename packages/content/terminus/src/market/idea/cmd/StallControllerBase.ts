/**
 * StallControllerBase — what the `stall` subcommands share (economic
 * bootstrap D15: a player shop is a rented market stall): the seeds, the
 * pitch's key and identities, and the refusal words. `stall rent` (and
 * bare `stall`) is `StallRentController`; `stall give-up` is
 * `StallGiveUpController`.
 *
 * `stall rent` (or a bare `stall`) stands up, for the giver, a counter of
 * their own on the square and a house that trades as them:
 *
 * - the COUNTER, a `Stock` minted from `/world/terminus/market/thing/stall`
 *   and keyed to the **pitch** it stands on, so what is on it survives a
 *   restart and comes back where it stood
 *   (`PersistableApi.restoreOrSeed`); `purchasing: terms` from the seed —
 *   rung 0 for a player, day one;
 *
 *   ⭐⭐ **The key is the pitch, not the renter.** A key is relative to
 *   the thing that manages it, and the square's fixture is what manages
 *   pitches — so a counter is `(scope = the stall seed row, key = <the
 *   fixture's row>/<pitch>)`, the `HoldingWarren` shape one level down.
 *   Keying on the renter made their identity the counter's substance,
 *   let a square hand out unbounded stalls because nothing counted
 *   pitches, and put the counter in a population the uniqueness
 *   invariant could not scan. **Who rents it** lives on the house's
 *   `appointingAuthority`, which is where it belongs.
 * - the HOUSE, a `Business` minted from `/trade/shopkeeping/idea/business/stall`
 *   with the renter's identity and an overlay of what is theirs: the
 *   appointing authority (the renter, as an entity), the bank (wherever
 *   their primary account is custodied — refused `no-bank` without one),
 *   the operating location (the counter). ⭐ Not persisted: every field
 *   derives from the renter, so the house is RE-MINTED on the next `stall`
 *   rather than restored — one record fewer to drift.
 *
 * The first rent is a `payment` from the renter's account to the market's
 * (the square's `rentMinor`); opening the stall again costs nothing. A
 * second `rent` is idempotent. `Business.getAccountPath()` reads the
 * identity path, so two renters are two accounts — the shared-account
 * regression, prevented the other way round.
 *
 * `stall give-up` hands the renter what is on the counter, **deletes the
 * pitch's record** and takes it down; the house stays (its account is
 * theirs) with nothing to operate.
 *
 * ⚠⚠ Deleting, not capturing-empty, and the reason is the re-keying:
 * the record is now the PITCH's. Capturing the emptied counter and
 * leaving the record behind meant the next renter of that pitch was
 * handed the previous keeper's counter — their short description, their
 * keywords, their shelf — and `hasRecord` told them the rent was
 * already paid. That is the same clobber the `(scope, key)` invariant
 * exists to stop, arriving from the other side. A given-up pitch
 * remembers nothing; what the keeper had is in their hands.
 *
 * ⚠ The stall stands only while its keeper has opened it since the last
 * boot: nothing pins a rented counter at boot (W9's vacancy states are
 * where an absent keeper's stall gets its closed sign).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type MarketStalls from '../../thing/MarketStalls';

export const TOPIC = 'act.deed';

/** The seed a renter's counter is minted from, and the scope its record is filed under. */
export const STALL_SEED = '/world/terminus/market/thing/stall';
/** The seed a renter's house is minted from. */
export const STALL_BUSINESS_SEED =
  '/trade/shopkeeping/idea/business/stall';
/** The square's business — the rent's payee. */
export const MARKET_BUSINESS = '/world/terminus/market/business';

export abstract class StallControllerBase extends CommandController<CommandModel> {
  /**
   * The key and the two identities of the stall on `pitch` of `fixture`.
   *
   * The **key** is `<the fixture's row>/<pitch>` — the manager's own
   * durable address as the prefix, exactly as a holding warren keys its
   * rooms `<extent>/<leaf>`. The two **identities** derive from that
   * key with its leading slash stripped, so each nests under its own
   * seed row and a row read finds them all (the corpse's shape).
   */
  protected static idsFor(
    fixture: MarketStalls,
    pitch: string,
  ): { key: string; counter: string; house: string } {
    const row = fixture.getTemplatePath() ?? '';
    const key = `${row}/${pitch}`;
    const leaf = key.replace(/^\/+/, '');
    return {
      key,
      counter: `${STALL_SEED}/${leaf}`,
      house: `${STALL_BUSINESS_SEED}/${leaf}`,
    };
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
