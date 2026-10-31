/**
 * ⭐ What a terminal shows (client-surface D6): one filter over the one
 * frame store. A terminal card is a VIEW — two terminals are two views of
 * one log, and `recall` still finds everything.
 *
 * The filter's parts, in the order they answer different questions: a
 * named VIEW (a saved facet predicate + mutes from `console.tabs`; `All`
 * is no filter), a CHANNEL (the `channel:<name>` tag, so backfilled lines
 * count, else the live payload's name), extra MUTES and FACETS, then the
 * two display rules every view shares — a frame whose card is on screen
 * is not printed twice, and reaction lines can fold into their chips.
 */

import type { ConsoleTab, FacetFilter, TerminalFilter } from "@saxonberg/types";
import { ALL_VIEW } from "@saxonberg/types";
import type { Frame } from "./index";
import type { CardState } from "./cardFeedSlice";
import { cardedFrameIsCovered } from "./cardFeedSlice";
import { facetFilterPasses } from "../components/FacetFilterPanel";
import type { CardId, TopicActor, TopicAddress, TopicWeight } from "@saxonberg/types";

export interface FrameFilterContext {
  tabs: readonly ConsoleTab[];
  describe: (topic: string) => {
    address: TopicAddress;
    actor: TopicActor;
    weight: TopicWeight;
  };
  resultDisplay: "card" | "terminal" | "both";
  cards: Record<string, CardState>;
  kinds: ReadonlySet<CardId> | null;
  alwaysAggregate: boolean;
}

/** The facets and mutes a filter names, a view's merged with its own. */
export function resolveFilter(
  filter: TerminalFilter,
  tabs: readonly ConsoleTab[],
): { facets: FacetFilter | undefined; muted: Set<string>; channel?: string } {
  const view =
    filter.view && filter.view !== ALL_VIEW
      ? tabs.find((t) => t.name === filter.view)
      : undefined;
  return {
    facets: filter.facets ?? view?.facets,
    muted: new Set([...(view?.muted ?? []), ...(filter.muted ?? [])]),
    ...(filter.channel ? { channel: filter.channel } : {}),
  };
}

export function framesFor(
  frames: readonly Frame[],
  filter: TerminalFilter,
  ctx: FrameFilterContext,
): Frame[] {
  const { facets, muted, channel } = resolveFilter(filter, ctx.tabs);
  const tag = channel ? `channel:${channel}` : null;
  return frames.filter((f) => {
    if (tag && !(f.tags?.includes(tag) || f.channelName === channel)) return false;
    const d = ctx.describe(f.topic);
    if (
      !facetFilterPasses(facets, {
        address: d.address,
        actor: d.actor,
        weight: d.weight,
        topic: f.topic,
      })
    ) {
      return false;
    }
    if (muted.has(f.topic)) return false;
    if (ctx.resultDisplay === "card" && cardedFrameIsCovered(f.carded, ctx.cards, ctx.kinds)) {
      return false;
    }
    if (ctx.alwaysAggregate && f.inReactionTo !== undefined) return false;
    return true;
  });
}
