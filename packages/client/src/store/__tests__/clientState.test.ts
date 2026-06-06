import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";

function resetClientState(): void {
  useStore.setState({ clientState: {} });
}

describe("clientState slice", () => {
  beforeEach(() => {
    resetClientState();
  });

  it("setClientStateSnapshot replaces the bag wholesale", () => {
    useStore.getState().setClientStateSnapshot({
      "console.activeTab": "All",
      "theme.dark": true,
    });
    const state = useStore.getState().clientState;
    expect(state["console.activeTab"]).toBe("All");
    expect(state["theme.dark"]).toBe(true);
  });

  it("setClientStateSnapshot replaces (not merges)", () => {
    useStore.getState().setClientStateSnapshot({ a: 1 });
    useStore.getState().setClientStateSnapshot({ b: 2 });
    expect(useStore.getState().clientState).toEqual({ b: 2 });
  });

  it("setLocalClientState mutates one key", () => {
    useStore.getState().setLocalClientState("foo", "bar");
    expect(useStore.getState().clientState.foo).toBe("bar");
  });

  it("setLocalClientState preserves siblings", () => {
    useStore.getState().setClientStateSnapshot({ a: 1, b: 2 });
    useStore.getState().setLocalClientState("a", 99);
    expect(useStore.getState().clientState).toEqual({ a: 99, b: 2 });
  });
});
