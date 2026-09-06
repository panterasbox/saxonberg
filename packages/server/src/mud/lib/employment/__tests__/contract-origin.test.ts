/**
 * ⭐ **The backhaul** (logistics D17): a gig carries where the work
 * STARTS, so a hauler at the far end of a corridor can ask what wants
 * moving back.
 *
 * A gig already carried a destination and nothing said where it began,
 * which made the empty return invisible — and *you cannot solve your own
 * backhaul*: you need somebody else's cargo going the other way. That is
 * a coordination problem with visible waste, and it costs one field plus
 * one finder.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Currency, BankingApi, Money } from '../../../api/banking';
import { ContractApi } from '../../../api/contract';
import type { GigSpec } from '../../../api/contract';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { Idea } from '../../stuff/Idea';
import { Creature } from '../../creature/Creature';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  installBankingHarness,
  teardownBankingHarness,
} from '../../banking/__tests__/banking-test-harness';

class TestIssuer extends BeliefStoreMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestOriginIssuer';
}
class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestOriginRoom';
}
class TestCrate extends ContainableMixin(Idea) {
  static _mixinName = 'TestOriginCrate';
}

const BOARD = '/test/board';
const UPTOWN = '/test/uptown';
const FARSIDE = '/test/farside';
const CRATE = '/obj/test/origin-crate';
const ISSUER = '/platform/agent/Avatar/origin-issuer';

let issuer: TestIssuer;
let uptown: TestRoom;
let farside: TestRoom;
let issuerAcct: string;

function spec(overrides: Partial<GigSpec> = {}): GigSpec {
  return {
    boardPath: BOARD,
    condition: {
      template: 'delivery',
      item: { kind: 'template', path: CRATE },
      destinationPath: UPTOWN,
    },
    rewardMinor: 10,
    claimMode: 'exclusive',
    ...overrides,
  };
}

async function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'contract.origin.test', () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

describe('a gig carries its origin', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installBankingHarness();
    vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() =>
      Quantity.of(10_000, 's'),
    );
    issuer = makeStuffAtPath(() => new TestIssuer(), ISSUER);
    uptown = makeStuffAtPath(() => new TestRoom(), UPTOWN);
    farside = makeStuffAtPath(() => new TestRoom(), FARSIDE);
    makeStuffAtPath(() => new TestCrate(), CRATE);
    // The poster stands at the far end of the corridor.
    ContainmentApi.move(issuer, farside);
    issuerAcct = await as(issuer, () =>
      BankingApi.ensureVenueAccount(
        ISSUER,
        BankingApi.defaultCustodianBank(),
        '',
        Currency.compact(),
      ),
    );
    await BankingApi.mint(issuerAcct, Money.of(100, Currency.compact()));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("defaults the origin to the poster's own environment", async () => {
    const posted = await as(issuer, () => ContractApi.post(spec()));
    expect(posted.ok).toBe(true);
    const id = posted.ok ? posted.contractId : '';
    // An NPC posting from its floor gets this right for free — which is
    // the whole reason it is derived rather than required.
    expect((await ContractApi.contractById(id))?.origin).toBe(FARSIDE);
  });

  it('an explicit origin wins over the poster environment', async () => {
    const posted = await as(issuer, () =>
      ContractApi.post(spec({ originPath: '/test/pithead' })),
    );
    const id = posted.ok ? posted.contractId : '';
    expect((await ContractApi.contractById(id))?.origin).toBe(
      '/test/pithead',
    );
  });

  it('⭐ the board is askable BY ORIGIN — the backhaul is findable', async () => {
    await as(issuer, () => ContractApi.post(spec()));
    await as(issuer, () =>
      ContractApi.post(spec({ originPath: UPTOWN })),
    );

    // Standing at the far end: what wants moving out of HERE?
    const back = await ContractApi.openGigsFrom(FARSIDE);
    expect(back).toHaveLength(1);
    expect(back[0]!.origin).toBe(FARSIDE);

    // …and the other direction is a different answer, which is the point:
    // one hauler's deadhead is another shipper's load.
    expect(await ContractApi.openGigsFrom(UPTOWN)).toHaveLength(1);
    expect(await ContractApi.openGigsFrom('/test/nowhere')).toHaveLength(0);
  });

  it('an empty origin asks nothing rather than matching everything', async () => {
    await as(issuer, () => ContractApi.post(spec({ originPath: '' })));
    // `originPath: ''` is "this gig names no origin" — a legitimate
    // posting (fetch it from wherever), and it must not make the
    // backhaul read return the whole board.
    expect(await ContractApi.openGigsFrom('')).toHaveLength(0);
  });

  it('the board browse is unchanged — origin is a second question, not a filter', async () => {
    await as(issuer, () => ContractApi.post(spec()));
    await as(issuer, () => ContractApi.post(spec({ originPath: UPTOWN })));
    expect(await ContractApi.openGigsOn(BOARD)).toHaveLength(2);
  });
});
