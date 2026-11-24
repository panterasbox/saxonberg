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
        { verb: "buy", description: "Buy something", state: "enabled" },
        { verb: "sell", description: "Sell something", state: "disabled", reason: "You have nothing to sell." },
      ],
    },
  ],
  usual: { verbs: ["look", "say", "go"] },
};

describe("WhichBody", () => {
  it("one column: verb and the short source; no reason, no help line", () => {
    render(<WhichBody answer={answer} size="unit" onSendCommand={() => undefined} />);
    expect(screen.getAllByTestId("which-row")).toHaveLength(2);
    expect(screen.getAllByTestId("which-source")[0]!.textContent).toBe("counter");
    expect(screen.queryByText("You have nothing to sell.")).toBeNull();
    expect(screen.queryByTestId("which-help-buy")).toBeNull();
  });

  it("across the terminal: the place and the greyed reason", () => {
    render(<WhichBody answer={answer} size="medium" onSendCommand={() => undefined} />);
    expect(screen.getAllByTestId("which-source")[0]!.textContent).toBe("the counter here");
    expect(screen.getByText("You have nothing to sell.")).toBeTruthy();
    expect(screen.queryByTestId("which-help-buy")).toBeNull();
  });

  it("the stage: help's own line and a link to help", () => {
    const send = vi.fn();
    render(<WhichBody answer={answer} size="full" onSendCommand={send} />);
    expect(screen.getByText("Buy something")).toBeTruthy();
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
    expect(send).toHaveBeenCalledWith("which #c1");
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
});
