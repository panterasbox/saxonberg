/**
 * The `which` card's body (the which build, W4): more as it widens; a verb
 * click TYPES the verb (sends nothing); a source click narrows the card;
 * the usual verbs are one collapsed row.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { WhichAnswer } from "@saxonberg/types";
import { useStore } from "../../../store";
import { WhichBody } from "../WhichBody";

const answer: WhichAnswer = {
  ask: { mode: "all", command: "which" },
  groups: [
    {
      key: "counter|here|buy,sell",
      source: { id: "c1", handle: "counter", name: "the counter", place: "here" },
      count: 1,
      ids: ["c1"],
      verbs: [
        { verb: "buy", description: "Buy something", state: "enabled", reach: "beside", view: "retail/buy", from: "Stock", category: "retail" },
        { verb: "sell", description: "Sell something", state: "disabled", reason: "You have nothing to sell.", reach: "beside", view: "retail/sell" },
      ],
    },
  ],
  usual: { verbs: ["look", "say", "go"] },
};

describe("WhichBody", () => {
  it("one column: verb and the short source; no reason, no help line", () => {
    render(<WhichBody answer={answer} size="unit" onSendCommand={() => undefined} />);
    // One row per SOURCE (owner, review), its verbs as chips.
    expect(screen.getAllByTestId("which-row")).toHaveLength(1);
    expect(screen.getAllByTestId("which-source")[0]!.textContent).toBe("counter");
    expect(screen.queryByText("You have nothing to sell.")).toBeNull();
    // ⭐ Two links per verb at every width: the verb, and `?` for its help.
    expect(screen.getByTestId("which-help-buy")).toBeTruthy();
  });

  it("across the terminal: the place and the greyed reason", () => {
    render(<WhichBody answer={answer} size="medium" onSendCommand={() => undefined} />);
    expect(screen.getAllByTestId("which-source")[0]!.textContent).toBe("the counter here");
    expect(screen.getByText(/You have nothing to sell\./)).toBeTruthy();
    // help's one line is the stage's alone; the `?` link is on every width.
    expect(screen.queryByText(/Buy something/)).toBeNull();
  });

  it("the stage: help's own line and a link to help", () => {
    const send = vi.fn();
    render(<WhichBody answer={answer} size="full" onSendCommand={send} />);
    expect(screen.getByText(/Buy something/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("which-help-buy"));
    expect(send).toHaveBeenCalledWith("help buy");
  });

  it("⭐ a verb click types it and sends nothing; a source click narrows", () => {
    const send = vi.fn();
    render(<WhichBody answer={answer} size="unit" onSendCommand={send} />);
    fireEvent.click(screen.getAllByTestId("which-verb-buy")[0]!);
    expect(useStore.getState().primarySeed?.text).toBe("buy ");
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId("which-source")[0]!);
    // A source click sends a word a player could type, never an id.
    expect(send).toHaveBeenCalledWith("which counter");
  });

  it("a source next door is named, not a link: nothing there is in reach to ask about", () => {
    const send = vi.fn();
    const nearby: WhichAnswer = {
      ...answer,
      groups: [{ ...answer.groups[0]!, key: "cat|nearby|talk", source: { id: "k1", handle: "cat", name: "the cat", place: "nearby" } }],
    };
    render(<WhichBody answer={nearby} size="medium" onSendCommand={send} />);
    expect(screen.queryByTestId("which-source")).toBeNull();
    expect(screen.getByTestId("which-source-nearby").textContent).toBe("the cat nearby");
  });

  it("the usual verbs are one collapsed row; a narrowed card offers everything", () => {
    const send = vi.fn();
    const { rerender } = render(<WhichBody answer={answer} size="unit" onSendCommand={send} />);
    const usual = screen.getByTestId("which-usual") as HTMLDetailsElement;
    expect(usual.open).toBe(false);
    expect(screen.queryByTestId("which-everything")).toBeNull();
    rerender(
      <WhichBody answer={{ ...answer, ask: { mode: "thing", command: "which #c1" } }} size="unit" onSendCommand={send} />,
    );
    fireEvent.click(screen.getByTestId("which-everything"));
    expect(send).toHaveBeenCalledWith("which");
  });

  it("⭐ every link shows its command in the status bar on hover", () => {
    const preview = vi.fn();
    render(<WhichBody answer={answer} size="full" onSendCommand={() => undefined} onCommandPreview={preview} />);
    fireEvent.mouseEnter(screen.getAllByTestId("which-verb-buy")[0]!);
    expect(preview).toHaveBeenLastCalledWith("buy ");
    fireEvent.mouseEnter(screen.getAllByTestId("which-source")[0]!);
    expect(preview).toHaveBeenLastCalledWith("which counter");
    fireEvent.mouseEnter(screen.getByTestId("which-help-buy"));
    expect(preview).toHaveBeenLastCalledWith("help buy");
    fireEvent.mouseLeave(screen.getByTestId("which-help-buy"));
    expect(preview).toHaveBeenLastCalledWith(null);
  });
});
