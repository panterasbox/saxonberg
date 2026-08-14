/**
 * routingActions — the feed routing table, as the client edits it.
 *
 * ⭐⭐ **The client edits the table; it never evaluates it.** Routing is
 * a predicate over the frame's topic FACETS, which live on the server's
 * catalogue, so the server stamps `meta.feeds` on every delivery and
 * this file's job stops at *writing the rules down*. Two evaluators
 * disagree the first time one of them changes, and the disagreement is
 * invisible until somebody's message is in the wrong tab.
 *
 * The rules ride `console.routing` in clientState — the same
 * server-persisted keyspace `console.tabs` uses, and for the same
 * reason: a routing table is UI state the SERVER has to be able to read.
 *
 * ⚠⚠ **The catch-all is not in this list.** The server appends it at
 * evaluation time, so nothing here can delete it — not the UI, not a
 * direct write of the key. *Every frame must land somewhere* is an
 * invariant, not a default.
 */

import type { FeedDestination, RoutingRule } from "@saxonberg/types";
import { CATCH_ALL_RULE, DEFAULT_ROUTING } from "@saxonberg/types";
import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

const KEY_ROUTING = "console.routing";

/** The player's editable rules — without the appended catch-all. */
export function getRoutingRules(): RoutingRule[] {
  const raw = useStore.getState().clientState[KEY_ROUTING];
  return Array.isArray(raw) ? (raw as RoutingRule[]) : [...DEFAULT_ROUTING];
}

/**
 * The rules **as the server will evaluate them** — the player's, then
 * the catch-all.
 *
 * ⭐ The table is rendered from THIS, not from the editable list, so the
 * catch-all is visible in the place it actually acts. A UI that showed
 * only the editable rules would leave the player looking at a table
 * that does not explain where most of their frames go.
 */
export function getEffectiveRoutingRules(): RoutingRule[] {
  return [...getRoutingRules(), CATCH_ALL_RULE];
}

/** True iff `index` addresses the appended, undeletable catch-all. */
export function isCatchAll(index: number): boolean {
  return index === getRoutingRules().length;
}

function write(rules: RoutingRule[]): RoutingRule[] {
  useStore.getState().setLocalClientState(KEY_ROUTING, rules);
  websocketClient.sendClientStateWrite(KEY_ROUTING, rules);
  return rules;
}

/** Append a rule above the catch-all. */
export function addRoutingRule(rule: RoutingRule): RoutingRule[] {
  return write([...getRoutingRules(), rule]);
}

/**
 * Drop the rule at `index`.
 *
 * ⚠ Refuses the catch-all — and the refusal is structural rather than
 * a check, because the catch-all is not in the list this indexes into.
 * An out-of-range index is a no-op.
 */
export function removeRoutingRule(index: number): RoutingRule[] {
  const rules = getRoutingRules();
  if (index < 0 || index >= rules.length) return rules;
  return write(rules.filter((_, i) => i !== index));
}

/**
 * Move a rule up or down.
 *
 * ⚠ Order IS the semantics — first match wins — so reordering is an
 * edit, not a display preference, and it goes over the wire like any
 * other.
 */
export function moveRoutingRule(index: number, delta: -1 | 1): RoutingRule[] {
  const rules = getRoutingRules();
  const target = index + delta;
  if (index < 0 || index >= rules.length) return rules;
  if (target < 0 || target >= rules.length) return rules;
  const next = [...rules];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return write(next);
}

/** Flip one rule between MOVE and COPY. */
export function toggleRoutingDisposition(index: number): RoutingRule[] {
  const rules = getRoutingRules();
  const rule = rules[index];
  if (!rule) return rules;
  const next = [...rules];
  next[index] = {
    ...rule,
    disposition: rule.disposition === "move" ? "copy" : "move",
  };
  return write(next);
}

/**
 * How a rule's predicate reads.
 *
 * ⭐ The empty predicate is *"everything else"*, not *"(no conditions)"*.
 * That phrasing is the catch-all's whole explanation of itself, and a
 * literal rendering of an empty object would make the most important
 * row in the table the least legible one.
 */
export function describePredicate(rule: RoutingRule): string {
  const parts: string[] = [];
  if (rule.when.weight) parts.push(`weight = ${rule.when.weight}`);
  if (rule.when.address) parts.push(`address = ${rule.when.address}`);
  if (rule.when.actor) parts.push(`actor = ${rule.when.actor}`);
  if (rule.when.topic) parts.push(`topic = ${rule.when.topic}`);
  return parts.length === 0 ? "everything else" : parts.join(" · ");
}

/** Which destination a frame's stamped feeds put it in, for counting. */
export function frameFeeds(
  feeds: FeedDestination[] | undefined,
): FeedDestination[] {
  // ⚠ Absence means `world`, which is the same answer the catch-all
  // gives — a frame delivered before the player had a table, or by a
  // path that predates routing, is not a frame with nowhere to go.
  return feeds && feeds.length > 0 ? feeds : ["world"];
}
