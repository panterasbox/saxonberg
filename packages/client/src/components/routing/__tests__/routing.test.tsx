/**
 * The routing surface — the switcher's counts and the table's
 * undeletable last rule.
 *
 * ⚠ The routing DECISION is a server fact, driven server-side
 * (`feed-routing.test.ts`). What only the client can get wrong is
 * shown here: a count that stopped being derived, a delete control on
 * the one rule that must never have one, and a table that hides the
 * rule doing most of the work.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { TopicDescriptor } from "@saxonberg/types";
import { DEFAULT_ROUTING } from "@saxonberg/types";
import { useStore, type Frame } from "../../../store/index";
import { websocketClient } from "../../../services/websocket";
import { FeedSwitcher, countByFeed, framesInFeed } from "../FeedSwitcher";
import { RoutingTable, matchCounts } from "../RoutingTable";
import {
  getEffectiveRoutingRules,
  getRoutingRules,
  removeRoutingRule,
  describePredicate,
} from "../../../store/routingActions";

let seq = 0;
function frame(over: Partial<Frame> = {}): Frame {
  seq += 1;
  return {
    id: `f${seq}`,
    topic: "sense.ambient",
    body: "",
    timestamp: seq,
    ...over,
  };
}

function descriptor(over: Partial<TopicDescriptor>): TopicDescriptor {
  return {
    topic: "sense.ambient",
    family: "",
    label: "",
    description: "",
    address: "ambient",
    actor: "world",
    weight: "activity",
    audience: "all",
    durable: false,
    affordance: "live",
    ...over,
  } as TopicDescriptor;
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({
    clientState: {},
    frames: [],
    activeFeed: "world",
    topicCatalogue: new Map(),
  });
  vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
    () => undefined,
  );
});

describe("the feed switcher", () => {
  it("⚠ counts are DERIVED from the frames they name", () => {
    const frames = [
      frame({ feeds: ["world"] }),
      frame({ feeds: ["world"] }),
      frame({ feeds: ["attention", "world"] }),
      frame({ feeds: ["diagnostics"] }),
    ];
    const counts = countByFeed(frames);
    // A `copy` lands in two feeds, so the totals deliberately sum to
    // more than the frame count. Anything else would mean the copy
    // rule had quietly become a move.
    expect(counts.world).toBe(3);
    expect(counts.attention).toBe(1);
    expect(counts.diagnostics).toBe(1);
    expect(counts.channels).toBe(0);
  });

  it("treats an unstamped frame as World, like the catch-all does", () => {
    // A frame delivered before the player had a table is not a frame
    // with nowhere to go.
    expect(countByFeed([frame({})]).world).toBe(1);
    expect(framesInFeed([frame({})], "world")).toHaveLength(1);
  });

  it("renders every destination, even an empty one", () => {
    render(
      <FeedSwitcher
        frames={[frame({ feeds: ["world"] })]}
        active="world"
        onSelect={() => undefined}
      />,
    );
    // An absent tab is indistinguishable from a feed that does not
    // exist, and a player cannot notice they are missing something
    // they cannot see a name for.
    for (const feed of ["world", "attention", "channels", "diagnostics"]) {
      expect(screen.getByTestId(`feed-count-${feed}`)).toBeTruthy();
    }
    expect(screen.getByTestId("feed-count-channels").textContent).toBe("0");
  });
});

describe("⚠⚠ the routing table", () => {
  it("shows the catch-all even though it is not stored", () => {
    useStore.setState({ clientState: { "console.routing": [] } });
    render(<RoutingTable frames={[]} />);
    // A table showing only the editable rules would leave the player
    // looking at something that does not explain where most of their
    // frames go.
    expect(screen.getByTestId("routing-rule-0")).toBeTruthy();
    expect(screen.getByText("everything else")).toBeTruthy();
  });

  it("offers NO delete on the catch-all", () => {
    useStore.setState({ clientState: { "console.routing": [] } });
    render(<RoutingTable frames={[]} />);
    // Absent rather than disabled: a greyed-out control invites "why
    // not?" at the moment the answer is already printed below.
    expect(screen.queryByLabelText("delete rule 1")).toBeNull();
  });

  it("states WHY it cannot be deleted, where the rule is", () => {
    useStore.setState({ clientState: { "console.routing": [] } });
    render(<RoutingTable frames={[]} />);
    const why = screen.getByTestId("catch-all-reason");
    expect(why.textContent).toMatch(/every frame must land somewhere/i);
    expect(why.textContent).toMatch(/you are on fire/i);
  });

  it("cannot be deleted through the action either", () => {
    useStore.setState({ clientState: { "console.routing": [] } });
    // The catch-all is not in the list this indexes into, so the
    // refusal is structural rather than a check somebody could forget.
    expect(getEffectiveRoutingRules()).toHaveLength(1);
    removeRoutingRule(0);
    expect(getEffectiveRoutingRules()).toHaveLength(1);
  });

  it("ships the copy-to-Attention rule ON", () => {
    // ⚠⚠ A convenience on desktop; the safety net on a phone, where
    // World may not be the feed you are looking at.
    const copy = getRoutingRules().find((r) => r.disposition === "copy");
    expect(copy?.to).toBe("attention");
    expect(describePredicate(copy!)).toBe("address = direct");
  });
});

describe("the per-rule match count", () => {
  it("replays the same first-match-wins walk the server does", () => {
    const rules = [...DEFAULT_ROUTING];
    const frames = [
      frame({ topic: "shell.diagnostic" }),
      frame({ topic: "shell.diagnostic" }),
      frame({ topic: "speech.comms" }),
      frame({ topic: "sense.ambient" }),
    ];
    const facets: Record<string, Partial<TopicDescriptor>> = {
      "shell.diagnostic": { weight: "diagnostic" },
      "speech.comms": { address: "direct" },
      "sense.ambient": {},
    };
    const counts = matchCounts(frames, rules, (t) =>
      descriptor(facets[t] ?? {}),
    );
    expect(counts[0]).toBe(2); // both diagnostics, moved
    expect(counts[1]).toBe(0); // no channel frames
    expect(counts[2]).toBe(1); // the tell, copied
  });

  it("counts a MOVE as stopping the walk", () => {
    const rules = [
      {
        when: { weight: "activity" as const },
        to: "channels" as const,
        disposition: "move" as const,
      },
      {
        when: { actor: "world" as const },
        to: "attention" as const,
        disposition: "move" as const,
      },
    ];
    const counts = matchCounts([frame({})], rules, () => descriptor({}));
    // Both predicates match the frame; only the first can claim it.
    expect(counts[0]).toBe(1);
    expect(counts[1]).toBe(0);
  });
});

describe("reordering", () => {
  it("is an edit, because order IS the semantics", () => {
    useStore.setState({
      clientState: { "console.routing": [...DEFAULT_ROUTING] },
    });
    render(<RoutingTable frames={[]} />);
    fireEvent.click(screen.getByLabelText("move rule 2 up"));
    const rules = getRoutingRules();
    expect(rules[0]!.to).toBe("channels");
    expect(rules[1]!.to).toBe("diagnostics");
    // …and it went over the wire, because first-match-wins means a
    // reorder changes where frames land, not how the table looks.
    expect(websocketClient.sendClientStateWrite).toHaveBeenCalled();
  });
});
