/**
 * The phone (client-surface W6, AC 11): chat first; swipe right for the
 * channels, left for who's here; a long press on a line names react ·
 * reply · tell · look; explore's button bar puts the exits first; a card
 * appears inline and opens as a sheet with the terminal kept as a strip.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { PhoneShell } from "../PhoneShell";
import { lineActions } from "../LinePressMenu";
import { websocketClient } from "../../../services/websocket";

const base = {
  frames: [],
  onSendCommand: () => {},
  onSendPromptResponse: () => {},
  onCancelPrompt: () => {},
  onCommandClick: () => {},
  onCommandSend: () => {},
  onCommandPreview: () => {},
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(() => undefined as never);
  useStore.setState({
    cards: {},
    frames: [
      { id: "a", topic: "speech.channel", body: "[gossip] Ada: hi", timestamp: 1, channelName: "gossip", tags: ["channel:gossip"], frameId: 7, speaker: { stuffId: "ada-1", displayName: "Ada Vask" } },
      { id: "b", topic: "speech.vocal", body: "Dave says hello", timestamp: 2 },
    ],
    clientState: {
      "console.tabs": [{ name: "Chat", muted: [], facets: { topics: ["speech.channel"] } }],
    },
    prompts: [],
    activeSlotByBar: {},
    primaryBarId: null,
    affordances: {},
    connection: { link: "connected" } as never,
  });
});

describe("PhoneShell", () => {
  it("⭐ chat is the default when no mode is stored — the terminal shows the chat view", () => {
    render(<PhoneShell {...base} storedMode={null} />);
    expect(screen.getByTestId("phone-shell").getAttribute("data-phone-mode")).toBe("chat");
    const text = screen.getByTestId("terminal").textContent ?? "";
    expect(text).toContain("Ada: hi");
    expect(text).not.toContain("Dave says hello");
    expect(screen.getByTestId("target-chip")).toBeTruthy();
    expect(screen.queryByTestId("button-bar")).toBeNull();
  });

  it("⭐ swipe right opens the channels; swipe left, who's here", () => {
    render(<PhoneShell {...base} storedMode="chat" />);
    const root = screen.getByTestId("phone-shell");
    fireEvent.touchStart(root, { touches: [{ clientX: 10 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 200 }] });
    expect(screen.getByTestId("drawer-left")).toBeTruthy();
    fireEvent.click(screen.getByTestId("drawer-scrim"));
    fireEvent.touchStart(root, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 100 }] });
    expect(screen.getByTestId("drawer-right")).toBeTruthy();
  });

  it("⭐ a line offers react · reply · tell · look, each naming its command", () => {
    const frame = useStore.getState().frames[0]!;
    expect(lineActions(frame).map((a) => [a.label, a.command])).toEqual([
      ["React", "react --msg 7 …"],
      ["Reply", "chat gossip "],
      ["Tell", "tell ada "],
      ["Look", "look #ada-1"],
    ]);
  });

  it("⭐ explore: a button bar with the exits FIRST", () => {
    useStore.setState({
      cards: {
        here: {
          instanceId: "here",
          cardId: "subject",
          key: "look",
          live: true,
          pinned: false,
          role: "here",
          openedAt: 1,
          records: [{ stuffId: "room-1", displayName: "Dave's Bar", exits: [{ direction: "north" }, { direction: "out" }] } as never],
        },
      },
      affordances: {
        "room-1": { composition: [], verbs: [{ verb: "order", source: "subject", state: "enabled" }] } as never,
      },
    });
    const sent: string[] = [];
    render(<PhoneShell {...base} storedMode="explore" onCommandClick={(c) => sent.push(c)} />);
    const buttons = Array.from(screen.getByTestId("button-bar").querySelectorAll("button")).map((b) => b.textContent);
    expect(buttons.slice(0, 3)).toEqual(["north", "out", "order"]);
    fireEvent.click(screen.getAllByTestId("button-exit")[0]!);
    expect(sent).toEqual(["go north"]);
  });

  it("⭐ a card appears inline and opens as a sheet; the terminal keeps a strip", () => {
    useStore.setState({
      cards: {
        c1: { instanceId: "c1", cardId: "who", key: "who", live: false, pinned: false, openedAt: 1, records: [] },
      },
    });
    render(<PhoneShell {...base} storedMode="explore" />);
    const inline = screen.getByTestId("inline-card-c1");
    act(() => {
      fireEvent.click(inline.querySelector("article")!);
    });
    expect(screen.getByTestId("card-sheet")).toBeTruthy();
    expect(screen.getByTestId("terminal-strip")).toBeTruthy();
  });

  it("the mode tabs hide while typing", () => {
    render(<PhoneShell {...base} storedMode="chat" />);
    expect(screen.getByTestId("mode-tabs")).toBeTruthy();
    fireEvent.focus(screen.getByPlaceholderText("Enter command..."));
    expect(screen.queryByTestId("mode-tabs")).toBeNull();
  });
});
