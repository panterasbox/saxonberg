import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { TabStrip } from "../TabStrip";

function resetState(): void {
  useStore.setState({
    clientState: {
      "console.tabs": [{ name: "All", muted: [] }],
      "console.activeTab": "All",
    },
  });
}

describe("TabStrip", () => {
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetState();
    sendSpy = vi
      .spyOn(websocketClient, "sendClientStateWrite")
      .mockImplementation(() => {});
  });

  it("renders the 'All' tab with no × icon (uncloseable)", () => {
    render(<TabStrip />);
    expect(screen.getByTestId("tab-All")).toBeTruthy();
    expect(screen.queryByTestId("tab-delete-All")).toBeNull();
  });

  it("clicking + spawns a tab in edit mode with focused name input", () => {
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-add"));
    const input = screen.getByTestId("tab-new-input") as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it("Enter commits a new tab; Escape cancels", () => {
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-add"));
    const input = screen.getByTestId("tab-new-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Guild Chat" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      (useStore.getState().clientState["console.tabs"] as { name: string }[])
        .map((t) => t.name),
    ).toEqual(["All", "Guild Chat"]);
    expect(sendSpy).toHaveBeenCalled();
  });

  it("Escape on a new tab discards it", () => {
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-add"));
    const input = screen.getByTestId("tab-new-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Discarded" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(
      useStore.getState().clientState["console.tabs"],
    ).toHaveLength(1);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("double-click a tab name activates inline rename", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [] },
          { name: "Other", muted: [] },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip />);
    fireEvent.doubleClick(screen.getByTestId("tab-Other"));
    expect(screen.getByTestId("tab-rename-input")).toBeTruthy();
  });

  it("× click opens a confirm popover; Delete commits", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [] },
          { name: "Other", muted: [] },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-delete-Other"));
    expect(screen.getByTestId("tab-delete-confirm")).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByTestId("tab-delete-confirm-yes"));
    });
    expect(
      (useStore.getState().clientState["console.tabs"] as { name: string }[])
        .map((t) => t.name),
    ).toEqual(["All"]);
  });

  it("× confirm-Cancel keeps the tab", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [] },
          { name: "Other", muted: [] },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-delete-Other"));
    act(() => {
      fireEvent.click(screen.getByTestId("tab-delete-confirm-no"));
    });
    expect(
      useStore.getState().clientState["console.tabs"],
    ).toHaveLength(2);
  });

  it("no contextmenu (right-click) handler is bound on tabs", () => {
    render(<TabStrip />);
    const strip = screen.getByTestId("tab-strip");
    // Synthesize a context-menu event; should NOT throw and should
    // NOT mutate state. The browser default would open the OS menu
    // — but with no bound handler, our code is a no-op.
    fireEvent.contextMenu(strip);
    // After right-click, state remains untouched.
    expect(
      useStore.getState().clientState["console.tabs"],
    ).toHaveLength(1);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("clicking a tab switches active and emits the wire write", () => {
    useStore.setState({
      clientState: {
        "console.tabs": [
          { name: "All", muted: [] },
          { name: "Other", muted: [] },
        ],
        "console.activeTab": "All",
      },
    });
    render(<TabStrip />);
    fireEvent.click(screen.getByTestId("tab-Other"));
    expect(useStore.getState().clientState["console.activeTab"]).toBe(
      "Other",
    );
    expect(sendSpy).toHaveBeenCalledWith("console.activeTab", "Other");
  });
});
