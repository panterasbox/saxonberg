/**
 * ⚠⚠ The strip shows the player's OWN views, not just the shipped ones.
 *
 * This file exists because a pass that was meant to shorten the shipped
 * preset list rendered `FILTER_PRESETS` alone — which silently deleted
 * the feature. A saved view could still be created, and would then
 * never appear anywhere. Nothing caught it: every test asserted on
 * presets, which kept working perfectly.
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FILTER_PRESETS } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { TabStrip } from "../TabStrip";
import { websocketClient } from "../../services/websocket";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
    () => undefined,
  );
  useStore.setState({ frames: [], clientState: {} });
});

/** Put a player-made view in state, the way saving one does. */
function withMyView(name: string, facets = {}) {
  useStore.setState({
    clientState: {
      "console.tabs": [
        ...FILTER_PRESETS.map((p) => ({
          name: p.name,
          muted: [],
          facets: p.filter,
        })),
        { name, muted: [], facets },
      ],
      "console.activeTab": name,
    },
  });
}

describe("a view you made yourself", () => {
  it("appears in the strip beside the shipped ones", () => {
    withMyView("Forge watch");
    render(<TabStrip presetsOnly />);

    expect(screen.getByTestId("tab-Forge watch")).toBeTruthy();
    // Beside, not in a separate group — they are the same kind of
    // thing, and which ones ship with the client is not a distinction
    // the reader has to care about.
    expect(screen.getByTestId("tab-All")).toBeTruthy();
    expect(screen.getByTestId("tab-Aether")).toBeTruthy();
  });

  it("carries its own derived count", () => {
    withMyView("Forge watch", { weight: ["diagnostic"] });
    useStore.setState({
      frames: [
        { id: "a", topic: "shell.diagnostic", body: "" },
        { id: "b", topic: "speech.vocal", body: "" },
      ] as never,
      getTopicDescriptor: ((t: string) =>
        t === "shell.diagnostic"
          ? { address: "direct", actor: "system", weight: "diagnostic" }
          : { address: "broadcast", actor: "person", weight: "activity" }) as never,
    });
    render(<TabStrip presetsOnly />);

    expect(screen.getByTestId("tab-count-Forge watch").textContent).toBe("1");
  });

  it("offers edit and delete on the ACTIVE view only", () => {
    withMyView("Forge watch");
    render(<TabStrip presetsOnly onToggleDrawer={() => undefined} />);
    expect(screen.getByTestId("tab-edit-Forge watch")).toBeTruthy();
    expect(screen.getByTestId("tab-delete-Forge watch")).toBeTruthy();

    // A shipped preset has neither — you cannot delete `All`.
    expect(screen.queryByTestId("tab-delete-All")).toBeNull();
  });
});

describe("⚠ creating one", () => {
  it("names it, activates it, and opens the editor in one gesture", () => {
    /*
     * The old `+` made an empty tab and stopped, leaving the player to
     * discover that they had to select it and then find a separate gear
     * before it meant anything: *"it's not obvious that I have to go
     * back after hitting + to set my filters."*
     */
    let editorOpened = false;
    useStore.setState({
      clientState: {
        "console.tabs": FILTER_PRESETS.map((p) => ({
          name: p.name,
          muted: [],
          facets: p.filter,
        })),
        "console.activeTab": "All",
      },
    });
    render(
      <TabStrip presetsOnly onToggleDrawer={() => (editorOpened = true)} />,
    );

    fireEvent.click(screen.getByTestId("tab-add"));
    fireEvent.change(screen.getByTestId("tab-new-input"), {
      target: { value: "Forge watch" },
    });
    fireEvent.keyDown(screen.getByTestId("tab-new-input"), { key: "Enter" });

    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
    }>;
    expect(tabs.some((t) => t.name === "Forge watch")).toBe(true);
    expect(useStore.getState().clientState["console.activeTab"]).toBe(
      "Forge watch",
    );
    expect(editorOpened).toBe(true);
  });
});
