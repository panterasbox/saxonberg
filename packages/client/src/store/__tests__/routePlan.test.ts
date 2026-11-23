import { describe, it, expect, beforeEach } from "vitest";
import type { RoutePlanNote } from "@saxonberg/types";
import { useStore } from "../index";

const note: RoutePlanNote = {
  kind: "route-plan",
  to: "the vault",
  plans: [
    {
      nodes: [],
      legs: [],
      cost: { minutes: 0, legs: 2, conditional: 0, unmeasured: 2 },
      assumptions: [],
      leastCertain: -1,
    },
  ],
};

describe("navSlice.routePlan — the session's latest plan (D5)", () => {
  beforeEach(() => useStore.getState().setRoutePlan(null));

  it("holds the note a route answered with, and a new one replaces it", () => {
    useStore.getState().setRoutePlan(note);
    expect(useStore.getState().routePlan?.to).toBe("the vault");
    useStore.getState().setRoutePlan({ ...note, to: "the pit" });
    expect(useStore.getState().routePlan?.to).toBe("the pit");
  });

  it("a fresh copy of your map drops it — it was a hypothesis about a moment that passed", () => {
    useStore.getState().setRoutePlan(note);
    useStore.getState().applyMapSnapshot({ documents: [] });
    expect(useStore.getState().routePlan).toBeNull();
  });
});
