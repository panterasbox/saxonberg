/**
 * The one-shot MQL read (`mql-query`). A live query is a subscription
 * to the MQL source on the one subscription wire (`subscription.ts`);
 * this handler does only structural payload shape-checks and bails
 * silently on mismatch.
 */

import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';
import type { MqlQueryMessage } from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleMqlQuery: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlQueryMessage | undefined;
  if (!payload || typeof payload.queryId !== 'string') return;
  // ⚠ NOT card-aware, deliberately. A one-shot query is not a card: it
  // has no lifetime, nothing durable refers to it, and giving it a
  // catalogue name would imply a persistence it does not have.
  if (
    typeof payload.query !== 'string' ||
    (payload.cardinality !== 'one' && payload.cardinality !== 'many')
  ) {
    return;
  }
  MqlSubscriptionApi.handleQuery({
    interactive: ctx.interactive,
    queryId: payload.queryId,
    query: payload.query,
    cardinality: payload.cardinality,
    fields: payload.fields,
    detailKey: payload.detailKey,
  });
};
