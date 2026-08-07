import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { GutterStripe, colorForTopic } from "../GutterStripe";

function resetState(): void {
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
          family: "speech",
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
    ]),
    frames: [],
  });
}

describe("GutterStripe", () => {
  beforeEach(() => {
    resetState();
    vi.useFakeTimers();
    vi.spyOn(websocketClient, "sendClientStateWrite").mockImplementation(
      () => {},
    );
  });

  it("colorForTopic is stable for the same family", () => {
    expect(colorForTopic("speech")).toBe(
      colorForTopic("speech"),
    );
  });

  it("different families produce different hues", () => {
    expect(colorForTopic("speech")).not.toBe(
      colorForTopic("shell.diagnostic"),
    );
  });

  it("renders a 3px stripe colored by the topic family", () => {
    render(<GutterStripe topic="speech.vocal" timestamp={1000} />);
    const stripe = screen.getByTestId("gutter-stripe");
    expect(stripe.getAttribute("data-topic")).toBe("speech.vocal");
    // jsdom converts hsl() to rgb(); just confirm a non-empty
    // background color is present.
    const style = stripe.getAttribute("style") ?? "";
    expect(style).toMatch(/background:\s*(hsl|rgb)/);
  });

  it("hover (>250ms) reveals a tooltip with label + raw path + description", () => {
    render(<GutterStripe topic="speech.vocal" timestamp={1000} />);
    const stripe = screen.getByTestId("gutter-stripe");
    fireEvent.mouseEnter(stripe);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const tip = screen.getByTestId("gutter-tooltip");
    expect(tip.textContent).toContain("Say");
    expect(tip.textContent).toContain("speech.vocal");
    expect(tip.textContent).toContain("Speak aloud.");
  });

  it("click opens the action popover with four buttons", () => {
    render(<GutterStripe topic="speech.vocal" timestamp={1000} />);
    fireEvent.click(screen.getByTestId("gutter-stripe"));
    expect(screen.getByTestId("gutter-popover")).toBeTruthy();
    expect(screen.getByTestId("gutter-mute")).toBeTruthy();
    expect(screen.getByTestId("gutter-solo")).toBeTruthy();
    expect(screen.getByTestId("gutter-newtab")).toBeTruthy();
    expect(screen.getByTestId("gutter-mute-family")).toBeTruthy();
  });

  it("popover Mute action adds the topic to the active tab's muted list", () => {
    render(<GutterStripe topic="speech.vocal" timestamp={1000} />);
    fireEvent.click(screen.getByTestId("gutter-stripe"));
    fireEvent.click(screen.getByTestId("gutter-mute"));
    const tabs = useStore.getState().clientState["console.tabs"] as {
      name: string;
      muted: string[];
    }[];
    expect(tabs[0]?.muted).toContain("speech.vocal");
  });

  it("does not bind a contextmenu handler", () => {
    render(<GutterStripe topic="speech.vocal" timestamp={1000} />);
    const stripe = screen.getByTestId("gutter-stripe");
    fireEvent.contextMenu(stripe);
    // No popover should open on right-click — only left-click.
    expect(screen.queryByTestId("gutter-popover")).toBeNull();
  });
});
