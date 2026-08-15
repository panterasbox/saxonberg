import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../index";
import { websocketClient } from "../../services/websocket";
import {
  addTab,
  renameTab,
  deleteTab,
  setActiveTab,
  addMuteForActiveTab,
  removeMuteForActiveTab,
  getActiveTab,
  getTabs,
} from "../consoleActions";

function resetClientState(): void {
  useStore.setState({
    clientState: {
      "console.tabs": [{ name: "All", muted: [] }],
      "console.activeTab": "All",
    },
  });
}

describe("consoleActions", () => {
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetClientState();
    sendSpy = vi
      .spyOn(websocketClient, "sendClientStateWrite")
      .mockImplementation(() => {});
  });

  it("addTab creates a new tab and emits the wire write", () => {
    addTab("Guild Chat");
    const tabs = useStore.getState().clientState["console.tabs"];
    expect(tabs).toEqual([
      { name: "All", muted: [] },
      { name: "Guild Chat", muted: [] },
    ]);
    expect(sendSpy).toHaveBeenCalledWith("console.tabs", tabs);
  });

  it("addTab rejects empty / whitespace-only names", () => {
    addTab("   ");
    expect(useStore.getState().clientState["console.tabs"]).toHaveLength(1);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("addTab rejects duplicate names (no wire write)", () => {
    addTab("All");
    expect(useStore.getState().clientState["console.tabs"]).toHaveLength(1);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("⚠ deletes `All` like any other view — the special case is gone", () => {
    /*
     * This used to assert `All` was uncloseable. That invariant was
     * deliberately dropped: a shipped view the player cannot remove is
     * the un-editable special case coming back in another form, and it
     * was reported as exactly that — *"'forge watch' I can edit but
     * aether and diag I can't? I thought a filter was a filter."*
     */
    addTab("Other");
    deleteTab("All");
    const tabs = useStore.getState().clientState[
      "console.tabs"
    ] as { name: string }[];
    expect(tabs.map((t) => t.name)).not.toContain("All");
    expect(tabs.map((t) => t.name)).toContain("Other");
  });

  it("⭐ but never leaves the player with NO view", () => {
    // The floor. Every view is deletable; the LIST is what is
    // guaranteed, because a strip with nothing in it and no way to make
    // one is not a state the player can get out of.
    const tabs = useStore.getState().clientState[
      "console.tabs"
    ] as { name: string }[];
    for (const t of [...tabs]) deleteTab(t.name);
    const after = useStore.getState().clientState[
      "console.tabs"
    ] as { name: string }[];
    expect(after.length).toBeGreaterThan(0);
    expect(useStore.getState().clientState["console.activeTab"]).toBe(
      after[0]!.name,
    );
  });

  it("deleteTab removes a non-All tab and emits the wire write", () => {
    addTab("Other");
    sendSpy.mockClear();
    deleteTab("Other");
    const tabs = useStore.getState().clientState[
      "console.tabs"
    ] as { name: string }[];
    expect(tabs.map((t) => t.name)).toEqual(["All"]);
    expect(sendSpy).toHaveBeenCalledWith("console.tabs", tabs);
  });

  it("deleting the active tab falls back to 'All'", () => {
    addTab("Other");
    setActiveTab("Other");
    sendSpy.mockClear();
    deleteTab("Other");
    expect(getActiveTab()).toBe("All");
    expect(sendSpy).toHaveBeenCalledWith("console.activeTab", "All");
  });

  it("renameTab updates the name and emits the write", () => {
    addTab("Other");
    sendSpy.mockClear();
    renameTab("Other", "Renamed");
    const tabs = getTabs();
    expect(tabs.map((t) => t.name)).toEqual(["All", "Renamed"]);
    expect(sendSpy).toHaveBeenCalled();
  });

  it("renameTab rejects collisions silently (no wire write)", () => {
    addTab("Other");
    sendSpy.mockClear();
    renameTab("Other", "All");
    const tabs = getTabs();
    expect(tabs.map((t) => t.name)).toEqual(["All", "Other"]);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("setActiveTab switches and emits the wire write", () => {
    addTab("Other");
    sendSpy.mockClear();
    setActiveTab("Other");
    expect(getActiveTab()).toBe("Other");
    expect(sendSpy).toHaveBeenCalledWith("console.activeTab", "Other");
  });

  it("setActiveTab is a no-op for unknown tab names", () => {
    setActiveTab("Nope");
    expect(getActiveTab()).toBe("All");
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("addMuteForActiveTab pushes onto the active tab's muted list", () => {
    addMuteForActiveTab("speech.vocal");
    const tabs = getTabs();
    expect(tabs[0]?.muted).toEqual(["speech.vocal"]);
    expect(sendSpy).toHaveBeenCalled();
  });

  it("addMuteForActiveTab is idempotent on duplicate adds", () => {
    addMuteForActiveTab("speech.vocal");
    sendSpy.mockClear();
    addMuteForActiveTab("speech.vocal");
    expect(getTabs()[0]?.muted).toEqual(["speech.vocal"]);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("removeMuteForActiveTab removes one and is idempotent on misses", () => {
    addMuteForActiveTab("speech.vocal");
    sendSpy.mockClear();
    removeMuteForActiveTab("speech.vocal");
    expect(getTabs()[0]?.muted).toEqual([]);
    sendSpy.mockClear();
    removeMuteForActiveTab("speech.vocal");
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
