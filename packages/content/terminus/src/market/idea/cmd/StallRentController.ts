/**
 * StallRentController — `stall rent` and bare `stall` — stands up, for
 * the giver, a counter of their own on the square and a house that
 * trades as them; a second rent opens the stall they already hold (over
 * {@link StallControllerBase}).
 */

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
import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import MarketStalls from '../../thing/MarketStalls';
import {
  StallControllerBase,
  TOPIC,
  STALL_SEED,
  STALL_BUSINESS_SEED,
} from './StallControllerBase';

export default class StallRentController extends StallControllerBase {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
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

    // Their pitch: the one they already hold, else the lowest free one.
    // A full square refuses here, before any money moves — the first
    // thing a square with a fixed number of spots has to be able to say.
    const pitch = await fixture.allocatePitch(renterKey);
    if (!pitch) {
      return this.fail(
        context,
        'The square has no free pitch — every stall is let.',
        'square-full',
      );
    }

    const ids = StallRentController.idsFor(fixture, pitch);
    let counter = StuffApi.findByTemplatePath<Stock>(ids.counter) ?? null;
    let fresh = false;
    if (!counter) {
      // The rent, before anything is minted — unless this pitch already
      // holds a record for them (a stall packed away by a restart is
      // theirs, not a new let).
      const held = await PersistableApi.hasRecord(ids.counter, ids.key);
      const rent = held ? 0 : fixture.getRentMinor();
      if (rent > 0) {
        // ⚠ Every refusal from here on gives the pitch back. The
        // allocation happens before the money so a full square can
        // refuse without charging, which means a later refusal would
        // otherwise leave a pitch let to somebody who holds no stall.
        if (BankingApi.balanceOf(primary).minor < rent) {
          await fixture.releasePitch(renterKey);
          return this.fail(
            context,
            `A stall on the square is ${Money.of(rent, BankingApi.compactCurrency()).render()} — you haven't that.`,
            'cant-afford',
          );
        }
        const market = await EmploymentApi.ensureOperatorAt(fixture.getTemplatePath() ?? '');
        const marketAccount = market ? await EmploymentApi.operatingAccountOf(market) : null;
        if (!marketAccount) {
          await fixture.releasePitch(renterKey);
          return this.fail(context, "The market keeps no account to pay rent into.", 'no-market-account');
        }
        await BankingApi.transfer(primary, marketAccount, Money.of(rent, BankingApi.compactCurrency()), 'stall rent');
      }
      // identity-keyed-by: own-record — the counter's own
      // `holder_snapshots` record (`restoreOrSeed` just below), plus the
      // house's `operatingLocations` and `counterPath` round-trips,
      // which resolve this exact string.
      counter = await StuffApi.clone<Stock>(STALL_SEED, undefined, { asIdentityPath: ids.counter });
      const restored = await PersistableApi.restoreOrSeed(counter, ids.key);
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
        await PersistableApi.capture(counter, ids.key);
      } else if (!MixinApi.isContainable(counter) || counter.getContainer() !== square) {
        ContainmentApi.move(counter as unknown as Stuff & Containable, square);
      }
    }

    // The house — derived from the renter, re-minted rather than restored.
    let house = StuffApi.findByTemplatePath<Stuff & Business>(ids.house) ?? null;
    if (!house) {
      house = await StuffApi.clone<Stuff & Business>(STALL_BUSINESS_SEED, undefined, {
        // identity-keyed-by: referenced — the house's operating account
        // keys on this identity (`Business.getAccountPath()`), and
        // employment records reference it as `organizationPath`.
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
}
