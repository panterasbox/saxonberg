/**
 * StallController — the `stall` verb (economic bootstrap D15): a player
 * shop is a rented market stall.
 *
 * `stall rent` (or a bare `stall`) stands up, for the giver, a counter of
 * their own on the square and a house that trades as them:
 *
 * - the COUNTER, a `Stock` minted from `/world/terminus/market/thing/stall`
 *   with the renter's identity (`…/stall/<their key>`), persisted keyed to
 *   them so what is on it survives a restart and comes back where it stood
 *   (`PersistableApi.restoreOrSeed`); `purchasing: terms` from the seed —
 *   rung 0 for a player, day one;
 * - the HOUSE, a `Business` minted from `/platform/idea/Business/stall`
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
 * `stall give-up` hands the renter what is on the counter, captures it
 * empty and takes it down; the house stays (its account is theirs) with
 * nothing to operate.
 *
 * ⚠ The stall stands only while its keeper has opened it since the last
 * boot: nothing pins a rented counter at boot (W9's vacancy states are
 * where an absent keeper's stall gets its closed sign).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Business } from '@saxonberg/server/mud/api/employment';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import Stock from '@saxonberg/server/mud/platform/thing/Stock';
import MarketStalls from '../../thing/MarketStalls';

const TOPIC = 'act.deed';

/** The seed a renter's counter is minted from, and the scope its record is filed under. */
export const STALL_SEED = '/world/terminus/market/thing/stall';
/** The seed a renter's house is minted from. */
export const STALL_BUSINESS_SEED = '/platform/idea/Business/stall';
/** The square's business — the rent's payee. */
export const MARKET_BUSINESS = '/world/terminus/market/business';

export default class StallController extends CommandController<CommandModel> {
  async execute(model: CommandModel, context: CommandContext): Promise<void> {
    switch (model.subcommand ?? 'rent') {
      case 'rent':
        return this.rent(context);
      case 'give-up':
        return this.giveUp(context);
      default:
        return this.fail(context, 'Usage: `stall rent` or `stall give-up`.', 'unknown-subcommand');
    }
  }

  /** The two identities a renter's stall carries: their counter's and their house's. */
  protected static identitiesOf(renterKey: string): { counter: string; house: string } {
    const leaf = renterKey.split('/').filter(Boolean).pop() ?? renterKey;
    return { counter: `${STALL_SEED}/${leaf}`, house: `${STALL_BUSINESS_SEED}/${leaf}` };
  }

  private async rent(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const renterKey = giver.getIdentityPath() ?? '';
    if (!renterKey) return this.fail(context, 'A stall needs a keeper of record.', 'no-identity');
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!here || !MixinApi.isContainer(here)) return this.fail(context, "You're nowhere a stall can stand.", 'no-square');
    const square = here as Stuff & Container;
    const fixture = square.getContents().find((c): c is MarketStalls => c instanceof MarketStalls) ?? null;
    if (!fixture) return this.fail(context, 'There is no market here to rent a stall in.', 'no-market');

    // Their bank: the stall banks where they do.
    const primary = await BankingApi.primaryAccountIdOf(renterKey);
    const bank = primary ? await BankingApi.custodianOf(primary) : null;
    if (!primary || !bank) {
      return this.fail(context, 'Open an account first — a stall banks where its keeper does.', 'no-bank');
    }

    const ids = StallController.identitiesOf(renterKey);
    let counter = StuffApi.findByTemplatePath<Stock>(ids.counter) ?? null;
    let fresh = false;
    if (!counter) {
      // The rent, before anything is minted — unless they already hold a
      // record (a stall packed away by a restart is theirs, not a new let).
      const held = await PersistableApi.hasRecord(ids.counter, renterKey);
      const rent = held ? 0 : fixture.getRentMinor();
      if (rent > 0) {
        if (BankingApi.balanceOf(primary).minor < rent) {
          return this.fail(
            context,
            `A stall on the square is ${Money.of(rent, BankingApi.compactCurrency()).render()} — you haven't that.`,
            'cant-afford',
          );
        }
        const market = await EmploymentApi.ensureOperatorAt(fixture.getTemplatePath() ?? '');
        const marketAccount = market ? await EmploymentApi.operatingAccountOf(market) : null;
        if (!marketAccount) return this.fail(context, "The market keeps no account to pay rent into.", 'no-market-account');
        await BankingApi.transfer(primary, marketAccount, Money.of(rent, BankingApi.compactCurrency()), 'stall rent');
      }
      counter = await StuffApi.clone<Stock>(STALL_SEED, undefined, { asIdentityPath: ids.counter });
      const restored = await PersistableApi.restoreOrSeed(counter, renterKey);
      // The counter answers to the renter's house — the closed sign, the
      // attendance point, the operator a customer meets.
      counter.setBusinessPath(ids.house);
      if (!restored) {
        fresh = true;
        const who = giver.getPresentation() ?? 'someone';
        const stem = who.replace(/[^A-Za-z]+/g, ' ').trim().split(' ')[0]?.toLowerCase() ?? '';
        counter.setShortDescription(`${who}'s stall`);
        counter.setKeywords(['stall', 'counter', 'trestle', ...(stem ? [stem] : [])]);
        ContainmentApi.move(counter as unknown as Stuff & Containable, square);
        await PersistableApi.capture(counter, renterKey);
      } else if (!MixinApi.isContainable(counter) || counter.getContainer() !== square) {
        ContainmentApi.move(counter as unknown as Stuff & Containable, square);
      }
    }

    // The house — derived from the renter, re-minted rather than restored.
    let house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (!house) {
      house = await StuffApi.clone<Stuff & Business>(STALL_BUSINESS_SEED, undefined, {
        asIdentityPath: ids.house,
        dataOverlay: {
          name: `${giver.getPresentation() ?? 'a keeper'}'s stall`,
          appointingAuthority: { kind: 'entity', path: renterKey },
          banksAt: bank,
          operatingLocations: [ids.counter],
        },
      });
    }
    if (!house.employs(giver)) await house.appoint(giver, 'keeper');
    // The operator at her counter is her house: the employment memo has
    // to re-see a business minted outside its own standup path.
    await EmploymentApi.ensureOperatorAt(ids.counter);
    const account = await EmploymentApi.operatingAccountOf(house);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        fresh
          ? Mml.compose`You rent a stall on the square: ${Mml.thing(counter as unknown as Stuff)} is yours to keep. Growers may leave goods on your terms; \`house price\` sets your ask, \`wallet use house\` buys for the stall, and your house banks with ${bank}.`
          : Mml.compose`You open ${Mml.thing(counter as unknown as Stuff)} — yours already.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets up a stall.`)
      .send();
    context.note({ kind: 'info', detail: `stall:${ids.counter}:${account}` } as never);
  }

  private async giveUp(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const renterKey = giver.getIdentityPath() ?? '';
    const ids = StallController.identitiesOf(renterKey);
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
    await PersistableApi.capture(counter, renterKey);
    const house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (house) house.setOperatingLocations([]);
    await StuffApi.destruct(counter as unknown as Stuff);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pack the stall away; what was on it is in your hands.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} packs a stall away.`)
      .send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
