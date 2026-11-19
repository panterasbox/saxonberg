# Inbound message handlers

One file per substrate. Each file exports one (or a few) `InboundHandler`
functions, all registered in `index.ts`'s `inboundHandlers` map.

## Adding a new message type

1. Pick the file that owns the substrate the message belongs to. If
   the message is part of a *new* substrate, create
   `inbound/<substrate>.ts`.
2. Export an `async function handleX(ctx, message)` that does the
   payload validation, then calls into the substrate's Api.
3. Register it in `index.ts`'s `inboundHandlers` map.

That's it. Don't touch `Application.processUserMessage`.

## When to fold ops into a discriminated envelope

Don't, until any one substrate's op count climbs past ~5. Below
that, separate top-level types (`'mql-subscribe'`, `'mql-query'`,
…) are lighter than a single `{ type: 'mql', op: '...' }` envelope:
the dispatch is direct and the per-op validation stays clean. Once
a substrate sprouts a handful of related ops with similar payload
shapes, that's when consolidation starts paying.

When you do consolidate: the `inbound/<substrate>.ts` file is the
natural seam — collapse the per-op handlers into one
`handle<Substrate>` that switches on the envelope discriminator.
Touch one file; don't ripple the change anywhere else.

## ⭐⭐ Every state push is a SUBSCRIPTION — one wire for all of them

*(owner, 2026-11-17, navigation-server D1 — supersedes the rule above
for subscriptions.)* State the client keeps a copy of — a live query,
a forum board, your map, where you are, your settings, the press
ticker — rides ONE pair of messages: `subscribe` (naming a **source**
by its template path, with `params`) and `unsubscribe`, answered by
`subscription-result` (snapshot, `rev` 0), `subscription-delta`
(`rev + 1`) and `subscription-error`. A new kind of state is a new
SOURCE (a class composing `SubscriptionSourceMixin` and a row), never a
new message type and never an edit here. See `subscription.ts` and
`docs/subsystems/subscription.md`.

Events stay events: a dispatch outcome, a prompt, an engagement's
progress or a card being born happen once and have no copy to repair.

## When NOT to add a new message type

- **Don't** add a generic `data-write` / `key-value-set` channel
  (the subscription wire is READ-only; this rule stands)
  that routes by key. Each substrate has its own validation +
  auth shape; a generic channel loses all that. Per the existing
  `client-state-write` decision and the
  `[[feedback-no-premature-registries]]` rule.
- **Don't** mirror the WebSocket-level ping/pong in an app-level
  message *unless* the app actually needs the timing info (we
  keep `ping` because the cockpit could surface RTT; we dropped
  `echo` because nothing reads it).

## Error handling

Every handler returns `void | Promise<void>`. `Application.processUserMessage`
catches promise rejections uniformly and logs. Handlers should:

- **Drop silently** on shape-mismatched payloads. The wire client
  shouldn't be sending malformed payloads; if it is, that's a
  client bug, not a recoverable runtime condition.
- **Send a user-visible error envelope** only when the failure
  needs to land on the player's screen (e.g., "no active character"
  for the `command` handler).
- **Log + return** for non-user-visible failures so the dispatcher
  doesn't have to know the difference.
