/**
 * Filters as a standing predicate over topic FACETS.
 *
 * ⭐⭐ The property worth pinning is the one the whole S2 facet taxonomy
 * was built for: **selecting `Quiet` is ONE rule, not a topic-string
 * list.** A filter that happened to hide the same frames by naming
 * sixty paths would look identical on screen and would drift the first
 * time a topic was added — silently.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { FacetFilter, TopicDescriptor } from "@saxonberg/types";
import { FILTER_PRESETS } from "@saxonberg/types";
import { useStore, type Frame } from "../../store/index";
import {
  FacetFilterPanel,
  facetFilterPasses,
  toggleFacet,
} from "../FacetFilterPanel";

let seq = 0;
function frame(topic: string): Frame {
  seq += 1;
  return { id: `f${seq}`, topic, body: "", timestamp: seq };
}

function descriptor(
  topic: string,
  over: Partial<TopicDescriptor> = {},
): TopicDescriptor {
  return {
    topic,
    family: "",
    label: topic,
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

/** A catalogue that answers per topic. */
function installFacets(map: Record<string, Partial<TopicDescriptor>>): void {
  useStore.setState({
    getTopicDescriptor: (topic: string) =>
      descriptor(topic, map[topic] ?? {}),
  } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ frames: [], clientState: {} });
});

describe("⭐⭐ `Quiet` is one rule", () => {
  it("is a single predicate over `weight`, not a list of topics", () => {
    const quiet = FILTER_PRESETS.find((p) => p.name === "Quiet")!;
    // The whole claim, as data: ONE axis, and no topic strings at all.
    expect(Object.keys(quiet.filter)).toEqual(["weight"]);
    expect(quiet.filter.weight).toEqual(["consequence", "activity"]);
    expect(quiet.filter).not.toHaveProperty("topic");
  });

  it("catches a topic nobody enumerated", () => {
    // ⭐ The payoff. A brand-new topic with a `chatter` weight is
    // filtered by a rule written before it existed — which is exactly
    // what a topic-string list cannot do.
    const passes = facetFilterPasses(
      { weight: ["consequence", "activity"] },
      { address: "ambient", actor: "world", weight: "chatter" },
    );
    expect(passes).toBe(false);
  });
});

describe("the grammar", () => {
  it("ORs within an axis", () => {
    const f: FacetFilter = { weight: ["consequence", "activity"] };
    expect(
      facetFilterPasses(f, {
        address: "ambient",
        actor: "world",
        weight: "activity",
      }),
    ).toBe(true);
    expect(
      facetFilterPasses(f, {
        address: "ambient",
        actor: "world",
        weight: "chatter",
      }),
    ).toBe(false);
  });

  it("ANDs across axes", () => {
    const f: FacetFilter = { weight: ["activity"], actor: ["person"] };
    expect(
      facetFilterPasses(f, {
        address: "ambient",
        actor: "world",
        weight: "activity",
      }),
    ).toBe(false);
  });

  it("treats an absent axis as `any`, and an empty filter as everything", () => {
    expect(
      facetFilterPasses(
        {},
        { address: "direct", actor: "self", weight: "diagnostic" },
      ),
    ).toBe(true);
    expect(
      facetFilterPasses(undefined, {
        address: "direct",
        actor: "self",
        weight: "diagnostic",
      }),
    ).toBe(true);
  });

  it("drops an axis entirely when its last value is toggled off", () => {
    const one = toggleFacet({}, "weight", "chatter");
    expect(one.weight).toEqual(["chatter"]);
    const none = toggleFacet(one, "weight", "chatter");
    // ⚠ Deleted, not left as `[]`. An empty array would mean "match
    // nothing on this axis", which is the opposite of what un-picking
    // the last chip means.
    expect(none).not.toHaveProperty("weight");
  });
});

describe("⚠ the counts", () => {
  it("are derived from the frames in view", () => {
    installFacets({
      a: { weight: "diagnostic" },
      b: { weight: "diagnostic" },
      c: { weight: "activity" },
    });
    render(
      <FacetFilterPanel
        frames={[frame("a"), frame("b"), frame("c")]}
        filter={{}}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId("facet-count-diagnostic").textContent).toBe("2");
    expect(screen.getByTestId("facet-count-activity").textContent).toBe("1");
  });

  it("`SHOWING n of n` is both halves, derived", () => {
    installFacets({ a: { weight: "diagnostic" }, b: { weight: "activity" } });
    render(
      <FacetFilterPanel
        frames={[frame("a"), frame("b")]}
        filter={{ weight: ["activity"] }}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId("filter-showing").textContent).toContain(
      "SHOWING 1 of 2",
    );
  });
});

describe("the panel", () => {
  it("applies a preset wholesale", () => {
    installFacets({});
    let applied: FacetFilter | null = null;
    render(
      <FacetFilterPanel
        frames={[]}
        filter={{}}
        onChange={(f) => (applied = f)}
      />,
    );
    fireEvent.click(screen.getByTestId("preset-Quiet"));
    expect(applied).toEqual({ weight: ["consequence", "activity"] });
  });

  it("toggles one chip without disturbing another axis", () => {
    installFacets({});
    let applied: FacetFilter | null = null;
    render(
      <FacetFilterPanel
        frames={[]}
        filter={{ actor: ["self"] }}
        onChange={(f) => (applied = f)}
      />,
    );
    fireEvent.click(screen.getByTestId("facet-address-direct"));
    expect(applied).toEqual({ actor: ["self"], address: ["direct"] });
  });
});
