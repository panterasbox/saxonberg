/**
 * ⚠⚠ The strip shows the player's OWN views, not just the shipped ones.
 *
 * This file exists because a pass that was meant to shorten the shipped
 * preset list rendered `DEFAULT_VIEWS` alone — which silently deleted
 * the feature. A saved view could still be created, and would then
 * never appear anywhere. Nothing caught it: every test asserted on
 * presets, which kept working perfectly.
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DEFAULT_VIEWS } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { TabStrip } from "../TabStrip";
import { ensureSeededViews } from "../../store/consoleActions";
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
        ...DEFAULT_VIEWS.map((p) => ({
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
        "console.tabs": DEFAULT_VIEWS.map((p) => ({
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

/**
 * ⚠⚠ *"'forge watch' I can edit but aether and diag I can't? I thought
 * a filter was a filter."*
 *
 * The shipped views were a second mechanism: immutable, and selecting
 * one re-applied its filter from code so any edit vanished on the next
 * click. These pin the fix — a view that arrived pre-made is
 * indistinguishable, in behaviour, from one you composed.
 */
describe("⚠⚠ a shipped view is just a view", () => {
  function withViews(active: string) {
    useStore.setState({
      clientState: {
        "console.tabs": [
          ...DEFAULT_VIEWS.map((v) => ({
            name: v.name,
            muted: [],
            facets: v.filter,
          })),
          { name: "Forge watch", muted: [], facets: {} },
        ],
        "console.seededViews": DEFAULT_VIEWS.map((v) => v.name),
        "console.activeTab": active,
      },
    });
  }

  it("offers edit and delete on `Aether` exactly as on your own view", () => {
    withViews("Aether");
    render(<TabStrip presetsOnly onToggleDrawer={() => undefined} />);
    expect(screen.getByTestId("tab-edit-Aether")).toBeTruthy();
    expect(screen.getByTestId("tab-delete-Aether")).toBeTruthy();
  });

  it("⭐ selecting one does NOT overwrite an edit you made to it", () => {
    /*
     * The behaviour that made them feel un-editable: `applyPreset` wrote
     * the shipped filter back on every select, so tuning `Aether` and
     * clicking away lost the change silently.
     */
    withViews("All");
    useStore.setState({
      clientState: {
        ...useStore.getState().clientState,
        "console.tabs": [
          { name: "All", muted: [], facets: {} },
          { name: "Aether", muted: [], facets: { weight: ["consequence"] } },
        ],
      },
    });
    render(<TabStrip presetsOnly />);

    fireEvent.click(screen.getByTestId("tab-Aether"));

    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
      facets?: Record<string, unknown>;
    }>;
    const aether = tabs.find((t) => t.name === "Aether")!;
    expect(aether.facets).toEqual({ weight: ["consequence"] });
  });

  it("⚠ seeding is additive and never re-adds a view you deleted", () => {
    // `console.seededViews` records what has been OFFERED, not what
    // exists — otherwise "delete" would mean "hide until you reconnect".
    useStore.setState({
      clientState: {
        "console.tabs": [{ name: "All", muted: [], facets: {} }],
        "console.seededViews": DEFAULT_VIEWS.map((v) => v.name),
        "console.activeTab": "All",
      },
    });
    ensureSeededViews();
    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
    }>;
    expect(tabs.map((t) => t.name)).toEqual(["All"]);
  });

  it("seeds a view the player has never been offered", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [{ name: "All", muted: [], facets: {} }],
        "console.seededViews": ["All"],
        "console.activeTab": "All",
      },
    });
    ensureSeededViews();
    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
    }>;
    expect(tabs.map((t) => t.name)).toContain("Aether");
  });
});

/**
 * ⚠⚠ `All` is locked — and it is locked because of WHAT IT IS, not
 * because it is on a privilege list.
 */
describe("⚠⚠ the unfiltered view", () => {
  it("renders even though it is not in `console.tabs`", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [{ name: "Aether", muted: [], facets: {} }],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip presetsOnly onToggleDrawer={() => undefined} />);
    expect(screen.getByTestId("tab-All")).toBeTruthy();
  });

  it("carries NO edit and NO delete", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [{ name: "Aether", muted: [], facets: {} }],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip presetsOnly onToggleDrawer={() => undefined} />);
    // Active, and still no controls — there is nothing in an empty
    // predicate to edit, and nothing to delete.
    expect(screen.queryByTestId("tab-edit-All")).toBeNull();
    expect(screen.queryByTestId("tab-delete-All")).toBeNull();
  });

  it("⚠ is never rendered twice, even with a stale stored `All` row", () => {
    // Players seeded before the lock carry an `All` entry in their
    // stored tabs. It must not produce a second, editable copy.
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [], facets: { weight: ["chatter"] } },
          { name: "Aether", muted: [], facets: {} },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip presetsOnly onToggleDrawer={() => undefined} />);
    expect(screen.getAllByTestId("tab-All")).toHaveLength(1);
    expect(screen.queryByTestId("tab-delete-All")).toBeNull();
  });

  it("counts the WHOLE buffer, never a stored filter", () => {
    useStore.setState({
      frames: [
        { id: "a", topic: "speech.vocal", body: "" },
        { id: "b", topic: "shell.diagnostic", body: "" },
      ] as never,
      clientState: {
        // A stale, edited `All` row — honouring it would make the
        // locked view quietly filter.
        "console.tabs": [
          { name: "All", muted: [], facets: { weight: ["chatter"] } },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip presetsOnly />);
    expect(screen.getByTestId("tab-count-All").textContent).toBe("2");
  });
});

/**
 * ⚠⚠ **Never write defaults over state you have not read.**
 *
 * `ensureSeededViews` treated an absent `console.tabs` as "first run"
 * and wrote the ship defaults wholesale. `App` renders the layout on
 * its `default:` branch, so it can mount before the connection payload
 * lands — and the seeder then clobbered the player's saved views.
 * Found by driving: two views composed on a desktop were simply gone on
 * the next connection, and the persisted document confirmed they had
 * never been written.
 */
describe("⚠⚠ seeding never clobbers", () => {
  it("writes NOTHING when client state has not arrived", () => {
    const write = vi
      .spyOn(websocketClient, "sendClientStateWrite")
      .mockImplementation(() => undefined);
    useStore.setState({ clientState: {} });

    ensureSeededViews();

    // Absence means NOT LOADED YET. Writing here is how the player's
    // views were lost.
    expect(write).not.toHaveBeenCalled();
    expect(useStore.getState().clientState["console.tabs"]).toBeUndefined();
  });

  it("⭐ seeds additively once it HAS arrived", () => {
    // The server declares a default for the key, so a real connection
    // always yields an array — and a brand-new player gets every
    // shipped view from the branch that only ever ADDS.
    vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
      () => undefined,
    );
    useStore.setState({
      clientState: {
        "console.tabs": [{ name: "All", muted: [] }],
        "console.activeTab": "All",
      },
    });

    ensureSeededViews();

    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
    }>;
    expect(tabs.map((t) => t.name)).toContain("Aether");
    expect(tabs.map((t) => t.name)).toContain("All");
  });

  it("⚠ leaves a player's own views alone", () => {
    vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
      () => undefined,
    );
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [] },
          { name: "Forge watch", muted: [], facets: {} },
        ],
        "console.seededViews": ["Aether"],
        "console.activeTab": "All",
      },
    });

    ensureSeededViews();

    const tabs = useStore.getState().clientState["console.tabs"] as Array<{
      name: string;
    }>;
    expect(tabs.map((t) => t.name)).toContain("Forge watch");
  });
});
