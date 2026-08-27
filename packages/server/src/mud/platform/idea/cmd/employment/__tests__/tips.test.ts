/**
 * Tips — the tip jar end to end (the shared banking harness). Cash tips move
 * physical coin patron→jar with no account touched; the on-shift bartender
 * `collect`s the lot; an off-shift actor can't; the EFT route transfers to
 * the on-shift server's account. Drives the controllers as the dispatcher
 * would (actor derived from context, never the wire).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TipController from '../TipController';
import CollectController from '../CollectController';
import TipJar from '../../../../thing/TipJar';
import Coin from '../../../../thing/Coin';
import { EmploymentApi } from '../../../../../api/employment';
import { BankingApi, Money } from '../../../../../api/banking';
import { MakerMixin } from '../../../../../lib/craft/Maker';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import type { Container } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { Quantity } from '../../../../../lib/quantity';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  installBankingHarness,
  teardownBankingHarness,
} from '../../../../../lib/banking/__tests__/banking-test-harness';
import { Currency } from "../../../../../lib/banking/Currency";

const PATRON = '/platform/agent/Avatar/patron';
const MARA = '/world/lounge/agent/mara';

// A patron: a command giver that holds coin.
class Patron extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'Patron';
}
// The on-shift bartender: an active maker (confers MakerMixin directly,
// standing in for on-shift) + a command giver that can hold the collected
// coin.
class Bartender extends MakerMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'Bartender';
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}

function makeContext(giver: Stuff, location: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

async function asGiver<T>(giver: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'tips.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return fn();
  });
}

/** Total coin quantity held directly by `holder`. */
function coinIn(holder: Stuff): number {
  let n = 0;
  for (const c of (holder as Stuff & Container).getContents()) {
    if (c instanceof Coin) n += c.getQuantity();
  }
  return n;
}

/** Stub clone so partial coin-stack splits work without a domain collection. */
function stubCoinClone(): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
    c.setMass(Quantity.of(0.01, 'kg'));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

describe('tips — the tip jar', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
    stubCoinClone();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  function scene(): {
    loc: Location;
    patron: Patron;
    bartender: Bartender;
    jar: TipJar;
  } {
    const loc = makeStuff(() => new Location());
    const patron = makeStuffAtPath(() => new Patron(), PATRON);
    const bartender = makeStuffAtPath(() => new Bartender(), MARA);
    const jar = makeStuff(() => new TipJar());
    ContainmentApi.move(patron, loc);
    ContainmentApi.move(bartender, loc);
    ContainmentApi.move(jar, loc);
    return { loc, patron, bartender, jar };
  }

  function giveCoin(holder: Stuff, qty: number): void {
    // At `/stuff/thing/Coin` so GlobbableApi.split can clone a sibling stack.
    const coins = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, '/stuff/thing/Coin');
    coins.setMass(Quantity.of(0.01, 'kg'));
    // Raw fixture state: `setQuantity` on a Coin is gated (only the glob
    // mechanics and the cash faucet may resize a money stack), so a test
    // building a starting stack writes the field, it does not mint.
    coins.quantity = qty;
    ContainmentApi.move(coins, holder as never);
  }

  it('resolves the on-shift server as the tip recipient', () => {
    const { patron, bartender } = scene();
    expect(EmploymentApi.tipRecipientFor(patron)?.stuffId).toBe(
      bartender.stuffId,
    );
  });

  it('cash tip moves coin patron→jar, touching no account', async () => {
    const { loc, patron, jar } = scene();
    giveCoin(patron, 100);
    const supplyBefore = BankingApi.moneySupply(Currency.compact()).minor;

    await asGiver(patron, () =>
      makeStuff(() => new TipController()).execute(
        { amount: '5' } as never,
        makeContext(patron, loc, 'tip'),
      ),
    );

    expect(coinIn(jar)).toBe(5);
    expect(coinIn(patron)).toBe(95);
    // Off every ledger — no account created for the server, no ledger
    // movement (cash is off the governed supply).
    expect(await BankingApi.primaryAccountIdOf(MARA)).toBeNull();
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(supplyBefore);
  });

  it('the on-shift bartender collects the whole jar', async () => {
    const { loc, patron, bartender, jar } = scene();
    giveCoin(patron, 100);
    // A tip lands in the jar first.
    await asGiver(patron, () =>
      makeStuff(() => new TipController()).execute(
        { amount: '7' } as never,
        makeContext(patron, loc, 'tip'),
      ),
    );
    expect(coinIn(jar)).toBe(7);

    await asGiver(bartender, () =>
      makeStuff(() => new CollectController()).execute(
        {} as never,
        makeContext(bartender, loc, 'collect'),
      ),
    );

    expect(coinIn(jar)).toBe(0);
    expect(coinIn(bartender)).toBe(7);
  });

  it('an off-shift actor cannot collect', async () => {
    const { loc, patron, jar } = scene();
    giveCoin(patron, 20);
    await asGiver(patron, () =>
      makeStuff(() => new TipController()).execute(
        { amount: '4' } as never,
        makeContext(patron, loc, 'tip'),
      ),
    );

    // The patron is not an active maker → collect is refused, jar untouched.
    const ctx = makeContext(patron, loc, 'collect');
    await asGiver(patron, () =>
      makeStuff(() => new CollectController()).execute({} as never, ctx),
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'not-on-shift',
      }),
    );
    expect(coinIn(jar)).toBe(4);
  });

  it('the jar is a container that shows what it holds', async () => {
    const { loc, patron, jar } = scene();
    giveCoin(patron, 10);
    await asGiver(patron, () =>
      makeStuff(() => new TipController()).execute(
        { amount: '3' } as never,
        makeContext(patron, loc, 'tip'),
      ),
    );
    const contents = [...(jar as Stuff & Container).getContents()];
    expect(contents.some((c) => c instanceof Coin)).toBe(true);
  });

  it('the EFT route tips the on-shift server’s account (recorded)', async () => {
    const { loc, patron, bartender } = scene();
    // Both hold accounts; the patron funds theirs with cash.
    const patronAcct = await asGiver(patron, () =>
      BankingApi.openAccount('goodkin', '', Currency.compact()),
    );
    await asGiver(bartender, () => BankingApi.openAccount('goodkin', '', Currency.compact()));
    giveCoin(patron, 50);
    // Deposit isn't wired here; float the patron's account directly.
    await BankingApi.float(patronAcct, Money.of(50, Currency.compact()));

    await asGiver(patron, () =>
      makeStuff(() => new TipController()).execute(
        { amount: '9', eft: true } as never,
        makeContext(patron, loc, 'tip'),
      ),
    );

    const maraAcct = await BankingApi.primaryAccountIdOf(MARA);
    expect(maraAcct).not.toBeNull();
    expect(BankingApi.balanceOf(maraAcct!).minor).toBe(9);
  });
});
