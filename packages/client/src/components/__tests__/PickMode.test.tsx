/**
 * PickMode: while a "Ring what?" prompt is open, any noun on screen (any
 * element with `data-stuff-id`) answers it with that thing's id — so the
 * card that asked can be answered from inside the card.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { PickMode } from "../PickMode";

const PROMPT = {
  kind: "mql-object" as const,
  promptId: "p1",
  label: "Ring what?",
  matches: [{ stuffId: "bell-1", displayName: "a brass bell" }],
  foreground: true,
};

beforeEach(() => {
  vi.spyOn(websocketClient, "isConnected").mockReturnValue(true);
  vi.spyOn(websocketClient, "sendPromptResponse").mockImplementation(() => undefined);
  useStore.setState({ prompts: [] });
});
afterEach(() => vi.restoreAllMocks());

function Screen(): React.ReactElement {
  return (
    <div>
      <PickMode />
      <button type="button" data-stuff-id="jar-9" onClick={() => sentNormally.push("look tip-jar")}>
        a tip jar
      </button>
    </div>
  );
}
const sentNormally: string[] = [];

describe("PickMode", () => {
  it("⭐ with a pick prompt open, a noun answers it with its id — and its own command does not run", () => {
    sentNormally.length = 0;
    render(<Screen />);
    act(() => useStore.setState({ prompts: [PROMPT as never] }));
    expect(document.body.dataset.picking).toBe("Ring what?");
    fireEvent.click(screen.getByText("a tip jar"));
    expect(websocketClient.sendPromptResponse).toHaveBeenCalledWith("p1", "jar-9");
    expect(sentNormally).toEqual([]);
    // The echo names what was picked, not its id.
    expect(useStore.getState().frames.at(-1)?.body).toBe("Ring what? → a tip jar");
  });

  it("with no prompt open, a noun does what it always does", () => {
    sentNormally.length = 0;
    render(<Screen />);
    expect(document.body.dataset.picking).toBeUndefined();
    fireEvent.click(screen.getByText("a tip jar"));
    expect(websocketClient.sendPromptResponse).not.toHaveBeenCalled();
    expect(sentNormally).toEqual(["look tip-jar"]);
  });
});
