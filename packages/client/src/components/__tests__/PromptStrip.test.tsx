/**
 * The prompt system's queue — one slot, three occupants, **two cancels**.
 *
 * ⚠⚠ The two cancels are the load-bearing assertion in this file. The
 * `×` on a card is `prompt-cancel` — *this one*, over the prompt
 * channel. `prompt cancel` on the strip is the VERB — *all of them*,
 * over the command bus. A build that wired both to the same handler
 * would look identical on screen and would destroy five answers when
 * the player meant one.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore, type PromptEntry } from "../../store/index";
import { PromptStrip, cancelSentence, elapsedLabel } from "../PromptStrip";

function entry(over: Partial<PromptEntry> = {}): PromptEntry {
  return {
    kind: "text",
    promptId: "p1",
    label: "Which do you want trued first?",
    foreground: false,
    ...over,
  } as PromptEntry;
}

function setPrompts(prompts: PromptEntry[], activeSlot = "base"): void {
  useStore.setState({ prompts, activeSlot });
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ prompts: [], activeSlot: "base" });
});

describe("⚠⚠ two cancels, and they are different verbs", () => {
  it("the card's × cancels THIS one, over the prompt channel", () => {
    setPrompts([entry({ askedBy: "true rim" })]);
    const cancelled: string[] = [];
    const sent: string[] = [];
    render(
      <PromptStrip
        onCancelPrompt={(id) => cancelled.push(id)}
        onSendCommand={(t) => sent.push(t)}
      />,
    );

    fireEvent.click(screen.getByLabelText(cancelSentence(entry({ askedBy: "true rim" }))));
    expect(cancelled).toEqual(["p1"]);
    // ⚠ And it did NOT go over the command bus. `prompt cancel` is a
    // different act with a different blast radius.
    expect(sent).toEqual([]);
  });

  it("`prompt cancel` on the strip is the VERB — all of them", () => {
    setPrompts([entry(), entry({ promptId: "p2" })]);
    const cancelled: string[] = [];
    const sent: string[] = [];
    render(
      <PromptStrip
        onCancelPrompt={(id) => cancelled.push(id)}
        onSendCommand={(t) => sent.push(t)}
      />,
    );

    fireEvent.click(screen.getByLabelText("prompt cancel"));
    expect(sent).toEqual(["prompt cancel"]);
    // ⚠ …and it did not reach the per-prompt channel. The verb's whole
    // point is that the SERVER decides what "all of them" means.
    expect(cancelled).toEqual([]);
  });
});

describe("⚠⚠ the button names the command that dies", () => {
  it("says what a cancel abandons when the server said who asked", () => {
    setPrompts([entry({ askedBy: "true rim" })]);
    render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    // Cancelling rejects the awaiting command with
    // `PromptCancelledError` — "cancel" alone is a lie about that.
    expect(screen.getByTestId("prompt-asked-by").textContent).toContain(
      "true rim",
    );
    expect(cancelSentence(entry({ askedBy: "true rim" }))).toContain(
      "abandons `true rim`",
    );
  });

  it("⚠ hatches rather than inventing an asker", () => {
    setPrompts([entry({})]);
    render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    // A prompt pushed outside a command frame genuinely has no answer
    // here. Naming something the server never claimed would be worse
    // than the absence.
    expect(screen.getByTestId("prompt-asked-by-unknown")).toBeTruthy();
    expect(screen.queryByTestId("prompt-asked-by")).toBeNull();
    expect(cancelSentence(entry({}))).toContain("the command that asked");
  });
});

describe("the queue", () => {
  it("holds everything EXCEPT whatever has the input slot", () => {
    setPrompts([entry(), entry({ promptId: "p2" })], "p1");
    render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    // Showing the occupant twice would make the depth badge lie about
    // how many are waiting.
    expect(screen.getByTestId("prompt-waiting-count").textContent).toBe("1");
    expect(screen.queryByTestId("prompt-card-p1")).toBeNull();
    expect(screen.getByTestId("prompt-card-p2")).toBeTruthy();
  });

  it("⭐ a background prompt joins without seizing the slot", () => {
    setPrompts([entry({ promptId: "vote", foreground: false })], "base");
    render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    // A guild vote arriving mid-forge waits its turn.
    expect(screen.getByTestId("prompt-card-vote")).toBeTruthy();
    expect(useStore.getState().activeSlot).toBe("base");
    expect(screen.getByText(/background · waiting/)).toBeTruthy();
  });

  it("renders nothing at all when nothing is waiting", () => {
    setPrompts([]);
    const { container } = render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("⚠ failure is not dismissal", () => {
  it("renders a validation error on a card that is still alive", () => {
    setPrompts([entry({ validationError: "not one of the options" })]);
    render(
      <PromptStrip onCancelPrompt={() => undefined} onSendCommand={() => undefined} />,
    );
    // The prompt stays; the substrate emitted `prompt-validation-failed`
    // and kept it. The card is still here and the answer is untouched.
    expect(screen.getByTestId("prompt-card-p1")).toBeTruthy();
    expect(screen.getByTestId("prompt-validation-error").textContent).toBe(
      "not one of the options",
    );
  });
});

describe("elapsed", () => {
  it("uses the coarsest true unit and nothing when unknown", () => {
    const now = 10_000_000;
    expect(elapsedLabel(now - 5_000, now)).toBe("5s");
    expect(elapsedLabel(now - 22 * 60_000, now)).toBe("22m");
    expect(elapsedLabel(now - 3 * 3_600_000, now)).toBe("3h");
    // ⚠ No origin, no claim. An invented "0s" would say the prompt just
    // arrived, which is the one thing it is least likely to mean.
    expect(elapsedLabel(undefined, now)).toBe("");
  });
});
