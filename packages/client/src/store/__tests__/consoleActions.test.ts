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

  it("⚠⚠ refuses to delete `All` — it is the absence of a filter", () => {
    /*
     * Not a privileged view: `All` is not in this list at all. It is a
     * structural entry in the strip meaning *no predicate*, so there is
     * nothing here to remove — and nothing in it to edit either, which
     * is why it carries no controls. A locked ROW among editable rows
     * would be the special case; a different kind of thing is not.
     */
    addTab("Other");
    deleteTab("All");
    const tabs = useStore.getState().clientState[
      "console.tabs"
    ] as { name: string }[];
    expect(tabs.map((t) => t.name)).toContain("Other");
  });

  it("⭐ deleting your last view is safe — `All` is the floor", () => {
    // No re-seeding needed. Whatever the player removes, the unfiltered
    // view is always in the strip, so they can never end up with
    // nowhere to look.
    addTab("Other");
    setActiveTab("Other");
    deleteTab("Other");
    expect(getActiveTab()).toBe("All");
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
