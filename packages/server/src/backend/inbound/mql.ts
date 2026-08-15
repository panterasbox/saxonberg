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
import { CARD_HOLDS, CARD_IDS } from '@saxonberg/types';
import type {
  MqlSubscribeMessage,
  MqlUnsubscribeMessage,
  MqlQueryMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleMqlSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlSubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  // ⚠ A NAMED card needs neither: the server supplies both from its
  // catalogue. Requiring them here would make the whole point of naming
  // a card — that the client stops describing one — impossible to use.
  const named =
    typeof payload.card === 'string' &&
    (CARD_IDS as readonly string[]).includes(payload.card);
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
    card: named ? payload.card : undefined,
    // ⚠ A subject is only meaningful on a NAMED card — the catalogue's
    // query is the only string with a `$subject` slot in it. Threaded
    // as a raw string; the registry validates its shape, because that
    // is where the substitution happens and a check far from the
    // substitution is a check that drifts from it.
    subject: named && typeof payload.subject === 'string'
      ? payload.subject
      : undefined,
    query: payload.query,
    cardinality: payload.cardinality,
    fields: payload.fields,
    detailKey: payload.detailKey,
    focusDependent: payload.focusDependent,
    locationDependent: payload.locationDependent,
    // A hold makes this subscription a card. Validated here rather than
    // trusted: `hold` drives a server-side lifetime decision, and an
    // unrecognized value would otherwise fall through the evaluator's
    // default and silently produce an immortal card.
    hold:
      payload.hold !== undefined &&
      (CARD_HOLDS as readonly string[]).includes(payload.hold)
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
