/**
 * MQL handlers — live query substrate inbound surface.
 *
 * Three top-level message types share this file because they all
 * route into `MqlSubscriptionApi`. Substrate-level validation
 * (duplicate ids, parse, focus + cardinality cross-checks) runs
 * inside the Api; these handlers do only structural payload
 * shape-checks and bail silently on mismatch.
 *
 * If ops climb past ~5 (pause / resume / history-replay / …),
 * fold into a discriminated `{ type: 'mql', op: '...' }` envelope
 * — see `README.md`.
 */

import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';
import { PANE_HOLDS, PANE_IDS } from '@saxonberg/types';
import type {
  MqlSubscribeMessage,
  MqlUnsubscribeMessage,
  MqlQueryMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleMqlSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlSubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  // ⚠ A NAMED pane needs neither: the server supplies both from its
  // catalogue. Requiring them here would make the whole point of naming
  // a pane — that the client stops describing one — impossible to use.
  const named =
    typeof payload.pane === 'string' &&
    (PANE_IDS as readonly string[]).includes(payload.pane);
  if (
    !named &&
    (typeof payload.query !== 'string' ||
      (payload.cardinality !== 'one' && payload.cardinality !== 'many'))
  ) {
    return;
  }
  MqlSubscriptionApi.handleSubscribe({
    interactive: ctx.interactive,
    subscriptionId: payload.subscriptionId,
    pane: named ? payload.pane : undefined,
    query: payload.query,
    cardinality: payload.cardinality,
    fields: payload.fields,
    detailKey: payload.detailKey,
    focusDependent: payload.focusDependent,
    locationDependent: payload.locationDependent,
    // A hold makes this subscription a pane. Validated here rather than
    // trusted: `hold` drives a server-side lifetime decision, and an
    // unrecognized value would otherwise fall through the evaluator's
    // default and silently produce an immortal pane.
    hold:
      payload.hold !== undefined &&
      (PANE_HOLDS as readonly string[]).includes(payload.hold)
        ? payload.hold
        : undefined,
    holdSubject:
      typeof payload.holdSubject === 'string'
        ? payload.holdSubject
        : undefined,
  });
};

export const handleMqlUnsubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlUnsubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  MqlSubscriptionApi.handleUnsubscribe(
    ctx.interactive,
    payload.subscriptionId,
  );
};

export const handleMqlQuery: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlQueryMessage | undefined;
  if (!payload || typeof payload.queryId !== 'string') return;
  // ⚠ NOT pane-aware, deliberately. A one-shot query is not a pane: it
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
