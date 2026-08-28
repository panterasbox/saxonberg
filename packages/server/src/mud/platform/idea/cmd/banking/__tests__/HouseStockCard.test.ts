/**
 * `house stock` opens a LIVE `stock` card whose rows change when a
 * bottle drains — the perception-scoped sheet as a card (D7).
 *
 * Driven end to end: a real Avatar behind an Interactive holding the
 * house tablet (the app runs on a screen; the card is projected through
 * it), a real `CommandContext`, and the world change (a debit off the
 * bottle) performed rather than the card refreshed.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../../../../../api/card';
import { StuffApi } from '../../../../../api/stuff';
import { EventApi } from '../../../../../api/event';
import { ShadowApi } from '../../../../../api/shadow';
import { BankingApi } from '../../../../../api/banking';
import { MqlSubscriptionApi } from '../../../../../api/mql-subscription';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CARDS } from '../../../../../lib/connection/Cards';
import { CARD_IDS } from '@saxonberg/types';
import HouseController from '../HouseController';
import BusinessEntity from '../../../Business';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import Tablet from '../../../../thing/Tablet';
import { Quantity } from '../../../../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import { makeHarness, makeContext } from '../../../../../api/__tests__/card-harness';

const DAVE = '/platform/agent/Avatar/dave';

describe('the stock card', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('is in the catalogue: live, unpinned, an MQL card over reachable bulk', () => {
    expect(CARD_IDS).toContain('stock');
    expect(CARDS.stock.live).toBe(true);
    expect(CARDS.stock.pinnedByDefault).toBe(false);
    expect(CARDS.stock.source.kind).toBe('mql');
  });

  it('house stock opens a live card whose rows update when a bottle drains', async () => {
    const h = await makeHarness('Dave');
    stampTemplatePathForTest(h.avatar, DAVE);
    const biz = makeStuffAtPath(() => new BusinessEntity(), '/stuff/test/bar/business');
    biz.proprietorPath = DAVE;
    biz.banksAt = BankingApi.defaultCustodianBank();
    biz.setParLine({ category: 'gin', level: 3, unit: 'L' });

    const gin = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('gin');
      m.setKeywords(['gin']);
      m.setTags(['spirit', 'gin']);
      return m;
    }, '/stuff/test/material/gin') as unknown as Material;
    const bottle = await StuffApi.create(() => new Receptacle());
    bottle.setShortDescription('a bottle of gin');
    bottle.interiorBulk = true;
    bottle.setInteriorCapacity(Quantity.of(1, 'L'));
    bottle.setBulkMaterial('interior', gin);
    bottle.setBulkAmount('interior', Quantity.of(0.75, 'L'));
    ContainmentApi.move(bottle, h.room);
    // The house app runs on a screen: the house tablet in hand (display.md).
    const tablet = await StuffApi.create(() => new Tablet());
    tablet.setPairing('staff');
    tablet.setSourcePolicy('cards');
    tablet.setPrincipal('/stuff/test/bar/business');
    ContainmentApi.move(tablet, h.avatar);

    const ctx = makeContext(h, {
      commandText: 'house stock',
      verbs: ['house'],
      opensCard: 'stock',
    });
    await withRootContext(null, 'stock-card.test', () => {
      ExecutionContextApi.tagActingAuthor(h.avatar);
      return makeStuff(() => new HouseController()).execute({ subcommand: 'stock' } as never, ctx);
    });

    const opened = h.ofType('card-opened');
    expect(opened.length).toBe(1);
    const card = opened[0]!;
    expect(card.cardId).toBe('stock');
    expect(card.live).toBe(true);
    const rows = (card.result ?? []) as { stuffId: string; bulkAmount?: { value: number } }[];
    const row = rows.find((r) => r.stuffId === bottle.stuffId);
    expect(row?.bulkAmount?.value).toBe(0.75);
    // The par sheet rides the prose the controller printed.
    expect(String(card.prose ?? '')).toContain('gin');

    // A pour: the bottle drains, nothing refreshes anything.
    bottle.debitBulk('interior', 0.25);
    await MqlSubscriptionApi._drainScheduledForTesting();
    const delta = h
      .ofType('mql-subscription-delta')
      .find((d) => d.subscriptionId === card.instanceId);
    expect(delta).toBeDefined();
    const changes = delta!.changes as { op: string; key: string; fields?: Record<string, unknown> }[];
    const change = changes.find((c) => c.key === bottle.stuffId);
    expect(change?.op).toBe('update');
    expect((change?.fields?.bulkAmount as { value: number }).value).toBe(0.5);
  });
});
