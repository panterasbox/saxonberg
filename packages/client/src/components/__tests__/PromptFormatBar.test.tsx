/**
 * The prompt format bar — and the phone's share of the screen.
 *
 * ⚠ The bar's job is displaying what the SERVER rendered; nothing here
 * evaluates a template, because the client never does. What is worth
 * proving is the chips send real commands, and that on a phone they
 * stop holding a fifth of the screen for a control nobody touches.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../../store/index";
import { PromptFormatBar, commandForToken } from "../PromptFormatBar";

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({
    basePrompt: "here>",
    clientState: { "prompt.format": "here>" },
  });
});

describe("the chips", () => {
  it("send a real settings command, quoted", () => {
    const sent: string[] = [];
    render(<PromptFormatBar onSendCommand={(t) => sent.push(t)} />);
    fireEvent.click(screen.getByLabelText(commandForToken("here>", "{{ focus }}")));
    // ⭐ Not a local edit: `prompt.format` is a persisted setting, so
    // the chip has to be the same act as typing the command — which is
    // also what makes it aliasable and scriptable.
    expect(sent).toEqual(['settings set prompt.format "here>{{ focus }}"']);
  });

  it("shows what the server rendered, never a re-evaluated template", () => {
    render(<PromptFormatBar onSendCommand={() => undefined} />);
    expect(screen.getByTestId("prompt-format-rendered").textContent).toBe(
      "here>",
    );
  });
});

describe("⚠ on a phone", () => {
  it("collapses the tokens behind one control, and still shows the prompt", () => {
    /*
     * Found by driving at 390px: the four chips wrap onto three rows,
     * so this bar plus the routing toggle held ~180px of an 844px
     * screen permanently above the input — over a fifth of the phone,
     * for two controls that edit settings rather than play.
     */
    render(<PromptFormatBar compact onSendCommand={() => undefined} />);

    expect(screen.getByTestId("prompt-format-rendered").textContent).toBe(
      "here>",
    );
    expect(screen.queryByText("{{ focus }}")).toBeNull();
    expect(screen.getByTestId("prompt-format-toggle")).toBeTruthy();
  });

  it("reveals them on demand, and the reveal is not dressed as a command", () => {
    render(<PromptFormatBar compact onSendCommand={() => undefined} />);
    const toggle = screen.getByTestId("prompt-format-toggle");
    // A viewport act, so it carries no `Click to send:` promise — the
    // same line `open <feed>` and the tab strip sit on.
    expect(toggle.getAttribute("title")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByText("{{ focus }}")).toBeTruthy();
    expect(screen.getByText("{{ hp }}")).toBeTruthy();
  });

  it("keeps every token on a desktop, where the row costs nothing", () => {
    render(<PromptFormatBar onSendCommand={() => undefined} />);
    expect(screen.queryByTestId("prompt-format-toggle")).toBeNull();
    expect(screen.getByText("{{ focus }}")).toBeTruthy();
  });
});
