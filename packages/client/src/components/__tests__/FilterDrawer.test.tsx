import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { FilterDrawer } from "../FilterDrawer";

function seedCatalogue(): void {
  useStore.setState({
    clientState: {
      "console.tabs": [{ name: "All", muted: [] }],
      "console.activeTab": "All",
    },
    topicCatalogue: new Map([
      [
        "speech.vocal",
        {
          topic: "speech.vocal",
          family: "world.speech",
          label: "Say",
          description: "Speak aloud.",
          address: "ambient" as const,
          actor: "system" as const,
          weight: "diagnostic" as const,
          audience: "all" as const,
          durable: false,
          affordance: "decays" as const,
        },
      ],
      [
        "speech.comms",
        {
          topic: "speech.comms",
          family: "world.speech",
          label: "Tell",
          description: "Direct message.",
          address: "ambient" as const,
          actor: "system" as const,
          weight: "diagnostic" as const,
          audience: "all" as const,
          durable: false,
          affordance: "decays" as const,
        },
      ],
    ]),
    frames: [],
    mutedSinceSessionStart: {},
  });
}

describe("FilterDrawer", () => {
  beforeEach(() => {
    seedCatalogue();
    vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
      () => {},
    );
  });

  it("renders a tree from the catalogue snapshot grouped by family", () => {
    render(<FilterDrawer onClose={() => {}} />);
    expect(screen.getByTestId("leaf-speech.vocal")).toBeTruthy();
    expect(screen.getByTestId("leaf-speech.comms")).toBeTruthy();
  });

  it("a leaf checkbox toggles muting on the active tab", () => {
    render(<FilterDrawer onClose={() => {}} />);
    const cb = screen.getByTestId(
      "leaf-checkbox-speech.vocal",
    ) as HTMLInputElement;
    fireEvent.click(cb);
    const tabs = useStore.getState().clientState["console.tabs"] as {
      name: string;
      muted: string[];
    }[];
    expect(tabs[0]?.muted).toEqual(["speech.vocal"]);
  });

  it("family checkbox toggles every leaf under that family", () => {
    render(<FilterDrawer onClose={() => {}} />);
    fireEvent.click(
      screen.getByTestId("family-checkbox-world.speech"),
    );
    const tabs = useStore.getState().clientState["console.tabs"] as {
      name: string;
      muted: string[];
    }[];
    expect(new Set(tabs[0]?.muted)).toEqual(
      new Set(["speech.vocal", "speech.comms"]),
    );
  });

  it("auto-extends with topics seen in the frame buffer but not in the catalogue", () => {
    useStore.setState({
      frames: [
        {
          id: "f1",
          topic: "unknown.fresh.topic",
          body: "hi",
          timestamp: 1,
        },
      ],
    });
    render(<FilterDrawer onClose={() => {}} />);
    expect(screen.getByTestId("leaf-unknown.fresh.topic")).toBeTruthy();
  });

  it("per-leaf badge reflects mutedSinceSessionStart", () => {
    useStore.setState({
      mutedSinceSessionStart: { "speech.vocal": 3 },
    });
    render(<FilterDrawer onClose={() => {}} />);
    const badge = screen.getByTestId("leaf-badge-speech.vocal");
    expect(badge.textContent).toBe("3");
  });

  it("family badge sums leaf badges under that family", () => {
    useStore.setState({
      mutedSinceSessionStart: {
        "speech.vocal": 3,
        "speech.comms": 2,
      },
    });
    render(<FilterDrawer onClose={() => {}} />);
    const badge = screen.getByTestId("family-badge-world.speech");
    expect(badge.textContent).toBe("5");
  });

  it("clicking the close button fires onClose", () => {
    const onClose = vi.fn();
    render(<FilterDrawer onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close drawer"));
    expect(onClose).toHaveBeenCalled();
  });
});
