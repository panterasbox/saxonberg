/**
 * The tuned rail, and the capability it renders.
 *
 * ⭐⭐ The load-bearing case is `Convention 3`: **controls must branch on
 * the state their copy describes.** A read-only channel must not get a
 * live composer — a player who types into one and is refused on send has
 * been told the wrong thing by the interface, and the interface knew.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { TunedTarget } from "@saxonberg/types";
import { useStore } from "../../../store";
import { TunedRail, postCommand } from "../TunedRail";

const TWITCH: TunedTarget = {
  platform: "twitch",
  handle: "aldric",
  canPost: true,
};
const KICK: TunedTarget = { platform: "kick", handle: "bobalu", canPost: false };
const YOUTUBE: TunedTarget = {
  platform: "youtube",
  handle: "@wrightworks",
  canPost: false,
};

function seed(tuned: TunedTarget[]) {
  useStore.setState({ clientState: { "cockpit.tuned": tuned } });
}

beforeEach(() => {
  useStore.setState({ clientState: {} });
});

describe("the rail", () => {
  it("renders a row per tuned target, from state", () => {
    seed([TWITCH, KICK, YOUTUBE]);
    render(<TunedRail onSendCommand={vi.fn()} onCommandPreview={vi.fn()} />);
    expect(document.querySelector('[data-tuned="aldric"]')).not.toBeNull();
    expect(document.querySelector('[data-tuned="bobalu"]')).not.toBeNull();
    expect(document.querySelector('[data-tuned="@wrightworks"]')).not.toBeNull();
  });

  it("appears without a reconnect when a target is added", () => {
    seed([TWITCH]);
    render(<TunedRail onSendCommand={vi.fn()} onCommandPreview={vi.fn()} />);
    expect(document.querySelector('[data-tuned="bobalu"]')).toBeNull();
    // `tune` writes `cockpit.tuned`, which pushes; the rail is reactive.
    act(() => seed([TWITCH, KICK]));
    expect(document.querySelector('[data-tuned="bobalu"]')).not.toBeNull();
  });

  it("states each target's capability rather than implying it", () => {
    seed([TWITCH, KICK]);
    render(<TunedRail onSendCommand={vi.fn()} onCommandPreview={vi.fn()} />);
    expect(
      document.querySelector('[data-tuned="aldric"] [data-cap]')!.textContent,
    ).toContain("post");
    expect(
      document.querySelector('[data-tuned="bobalu"] [data-cap]')!.textContent,
    ).toContain("read only");
  });

  it("says so, with the way in, when nothing is tuned", () => {
    seed([]);
    render(<TunedRail onSendCommand={vi.fn()} onCommandPreview={vi.fn()} />);
    expect(screen.getByText(/tune twitch\.tv/)).toBeTruthy();
  });
});

describe("⭐⭐ the composer branches on canPost", () => {
  it("is live for a channel you can post to", () => {
    seed([TWITCH]);
    const send = vi.fn();
    render(<TunedRail onSendCommand={send} onCommandPreview={vi.fn()} />);
    const input = screen.getByTestId("tuned-composer") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: "that weld" } });
    fireEvent.submit(input.closest("form")!);
    expect(send).toHaveBeenCalledWith("tune aldric --twitch that weld");
  });

  it("is DEAD for a read-only channel, and the copy says why", () => {
    seed([KICK]);
    const send = vi.fn();
    render(<TunedRail onSendCommand={send} onCommandPreview={vi.fn()} />);
    const input = screen.getByTestId("tuned-composer") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    // The same fact drives the control and the sentence.
    expect(input.placeholder).toMatch(/read-only/i);
    expect(screen.getByText(/read-only this cycle/)).toBeTruthy();
    fireEvent.submit(input.closest("form")!);
    expect(send).not.toHaveBeenCalled();
  });

  it("keys off the server's flag, not the platform name", () => {
    // If Twitch ever loses the linked-identity authorization, `canPost`
    // goes false and the composer dies with it — no client edit.
    seed([{ ...TWITCH, canPost: false }]);
    render(<TunedRail onSendCommand={vi.fn()} onCommandPreview={vi.fn()} />);
    expect(
      (screen.getByTestId("tuned-composer") as HTMLInputElement).disabled,
    ).toBe(true);
  });
});

describe("postCommand", () => {
  it("is a real verb a player could type", () => {
    expect(postCommand(TWITCH, "hello")).toBe("tune aldric --twitch hello");
  });
});
