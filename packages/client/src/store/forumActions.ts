/**
 * forumActions — the IO boundary for the forum slice, peer to
 * `reactionActions` / `consoleActions`. The store stays pure state; this
 * file wires the `forum-subscription-result` / `-delta` / `-error`
 * envelopes into store actions and offers the outbound ops.
 *
 * Writes ride the command bus as REAL command strings (the GUI builds the
 * same strings the CLI types — scriptable / aliasable / replayable). Votes
 * + navigation are plain strings; post/reply carry the multi-line body on
 * the `fields` side-channel.
 */

import type {
  ForumSubscriptionResultEnvelope,
  ForumSubscriptionDeltaEnvelope,
  ForumSubscriptionErrorEnvelope,
  ForumSubscriptionScope,
} from "@saxonberg/types";
import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

let installed = false;

/** Register the forum envelope handlers exactly once (app bootstrap). */
export function registerForumHandlers(): void {
  if (installed) return;
  installed = true;
  websocketClient.onEnvelope("forum-subscription-result", (env) => {
    const e = env as ForumSubscriptionResultEnvelope;
    useStore.getState().applyForumResult(e.subscriptionId, e.scope, e.records);
  });
  websocketClient.onEnvelope("forum-subscription-delta", (env) => {
    const e = env as ForumSubscriptionDeltaEnvelope;
    useStore.getState().applyForumDelta(e.subscriptionId, e.changes);
  });
  // Errors are non-fatal for v1 — log + drop the dead subscription's cache.
  websocketClient.onEnvelope("forum-subscription-error", (env) => {
    const e = env as ForumSubscriptionErrorEnvelope;
    console.warn(
      `forum subscription ${e.subscriptionId} error: ${e.reason}`,
      e.detail,
    );
    useStore.getState().clearForumSubscription(e.subscriptionId);
  });
}

/** Open a forum subscription for the given scope; returns the subscriptionId. */
export function subscribeForumScope(scope: ForumSubscriptionScope): string {
  return websocketClient.subscribeForum(scope);
}

export function unsubscribeForumScope(subscriptionId: string): void {
  websocketClient.unsubscribeForum(subscriptionId);
  useStore.getState().clearForumSubscription(subscriptionId);
}

// ── Outbound forum COMMANDS (real command strings) ───────────────────

/** Cast a vote — a plain command string; the score updates via a delta. */
export function castForumVote(entryId: string, direction: "up" | "down"): void {
  websocketClient.sendCommand(`forum vote ${entryId} ${direction}`);
}

/** Post a thread; the multi-line body rides the `fields` side-channel. */
export function postForumThread(
  boardHandle: string,
  body: string,
  title?: string,
): void {
  const verb = title
    ? `forum post ${boardHandle} --title ${quote(title)}`
    : `forum post ${boardHandle}`;
  // The body field is dual-source; the GUI supplies it via `fields` (the
  // command string still carries a real verb + selectors).
  websocketClient.sendCommand(verb, { body });
}

/** Reply to an entry; the body rides the `fields` side-channel. */
export function replyForumEntry(entryId: string, body: string): void {
  websocketClient.sendCommand(`forum reply ${entryId}`, { body });
}

/** Navigate to a board's thread-list (also flips mainView via App's recognizer). */
export function openForumBoard(boardHandle: string): void {
  useStore.getState().setMainView("forum");
  useStore.getState().setForumNav({ boardHandle, threadId: null });
}

export function openForumThread(threadId: string): void {
  useStore.getState().setForumNav({ threadId });
}

function quote(s: string): string {
  // Minimal shell-style quoting for a title that may contain spaces.
  return `"${s.replace(/"/g, '\\"')}"`;
}
