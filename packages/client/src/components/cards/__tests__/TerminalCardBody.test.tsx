/**
 * A terminal is a card (client-surface D6, AC 5): it shows its filter's
 * frames, submits with its own bar, and at line width is a ticker.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { TerminalCardBody } from "../TerminalCardBody";
import type { CardState } from "../../../store/cardFeedSlice";

function terminal(extra: Partial<CardState> = {}, filter = { channel: "gossip" }): CardState {
  return {
    instanceId: "card-t1",
    cardId: "terminal",
    key: "cockpit terminal #gossip",
    live: false,
    pinned: true,
    records: [],
    openedAt: 1,
    payload: { kind: "terminal", filter, barId: "bar-7", primary: false },
    ...extra,
  };
}

beforeEach(() => {
  useStore.setState({
    frames: [
      { id: "a", topic: "speech.vocal", body: "Dave says hello", timestamp: 1 },
      { id: "b", topic: "speech.channel", body: "[gossip] Ada: hi", timestamp: 2, tags: ["channel:gossip"] },
      { id: "c", topic: "speech.channel", body: "[gossip] Bo: yo", timestamp: 3, tags: ["channel:gossip"] },
    ],
    clientState: {},
    prompts: [],
    activeSlotByBar: {},
    primaryBarId: null,
    connection: { link: "connected" } as never,
  });
});

const props = {
  onSendCommand: () => {},
  onSendPromptResponse: () => {},
  onCancelPrompt: () => {},
  onCommandClick: () => {},
  onCommandPreview: () => {},
};

describe("TerminalCardBody", () => {
  it("⭐ shows only its filter's frames — a channel by tag", () => {
    render(<TerminalCardBody card={terminal()} {...props} />);
    const text = screen.getByTestId("terminal").textContent ?? "";
    expect(text).toContain("Ada: hi");
    expect(text).not.toContain("Dave says hello");
  });

  it("⭐ submits with its OWN bar id", () => {
    const sent: [string, string | undefined][] = [];
    render(
      <TerminalCardBody
        card={terminal()}
        {...props}
        onSendCommand={(t, b) => sent.push([t, b])}
      />,
    );
    const input = screen.getByPlaceholderText("Enter command...");
    fireEvent.change(input, { target: { value: "chat gossip hi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(sent).toEqual([["chat gossip hi", "bar-7"]]);
  });

  it("at line width it is a ticker: the last line", () => {
    render(<TerminalCardBody card={terminal({ size: "line" })} {...props} />);
    expect(screen.getByTestId("terminal-ticker").textContent).toContain("Bo: yo");
  });
});
