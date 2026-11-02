/**
 * ⭐ `buy` speaks ONE protocol (harbors review 1): the thing bound is
 * anything composing `ForSaleMixin`, the seller here that offers the word
 * gets the whole sale, and the controller says what it returns. No
 * `instanceof Stock` — a new way of selling is a new implementer.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BuyController from '../BuyController';
import { ForSaleMixin, type SaleOutcome, type SaleRequest } from '../../../../../lib/retail/ForSale';
import Good from '../../../../thing/Good';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { Mml } from '../../../../../api/mml';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

/** A seller of one word — the protocol, and nothing else. */
class Stall extends ForSaleMixin(Good) {
  public word = '';
  public sales: SaleRequest[] = [];
  public override offers(word: string): boolean {
    return word === this.word;
  }
  public override async sell(sale: SaleRequest): Promise<SaleOutcome> {
    this.sales.push(sale);
    return { ok: true, self: Mml.compose`You buy it.`, peers: Mml.compose`Somebody buys it.` };
  }
}

function stall(word: string, where: Place): Stall {
  const s = makeStuff(() => new Stall());
  s.word = word;
  ContainmentApi.move(s as never, where as never);
  return s;
}

async function buy(bound: Stuff | null, thing: string, raw = ''): Promise<CommandContext> {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  const ctx = CommandApi.createCommandContext({
    commandGiver: av as never,
    location: makeStuff(() => new Place()) as never,
    commandSource: (bound ?? av) as never,
    commandText: `buy ${thing}`,
    executionId: 't',
    commandId: 't',
    verb: 'buy',
    command: CommandDefinition.fromYaml('verbs: [buy]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
  await withRootContext(null, 'buy-protocol.test', () => {
    ExecutionContextApi.tagActingAuthor(av);
    return makeStuff(() => new BuyController()).execute(
      { counter: bound ? { stuff: bound as never, raw } : undefined, thing } as never,
      ctx,
    );
  });
  return ctx;
}

describe('buy — one offer protocol', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ any ForSale implementer is sold from — the sale is handed to it whole', async () => {
    const here = makeStuff(() => new Place());
    const s = stall('kite', here);
    const ctx = await buy(s, 'kite');
    expect(s.sales).toHaveLength(1);
    expect(s.sales[0]!.word).toBe('kite');
    expect(ctx.getNotes().find((n) => n.kind === 'controller-rejected')).toBeUndefined();
  });

  it('⭐ unnamed, the seller beside it that offers the word is asked', async () => {
    const here = makeStuff(() => new Place());
    const kites = stall('kite', here);
    const tops = stall('top', here);
    await buy(kites, 'top');
    expect(tops.sales).toHaveLength(1);
    expect(kites.sales).toHaveLength(0);
  });

  it('a seller the player NAMED is held to, whatever it offers', async () => {
    const here = makeStuff(() => new Place());
    const kites = stall('kite', here);
    const tops = stall('top', here);
    await buy(kites, 'top', 'the kite stall');
    expect(kites.sales).toHaveLength(1);
    expect(tops.sales).toHaveLength(0);
  });

  it('⚠ nothing for sale bound: nothing to buy here', async () => {
    const ctx = await buy(null, 'kite');
    expect(ctx.getNotes().find((n) => n.kind === 'empty-result')).toBeDefined();
  });
});
