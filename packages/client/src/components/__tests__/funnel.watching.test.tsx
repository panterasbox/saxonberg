/**
 * The funnel arrives watching (stream arrival W6, D4): while the arrival
 * video plays, creation's confirm SHOWS and SENDS `embody confirm --watch
 * <program> --<carrier>` — the same string — and plainly otherwise; the
 * guest's socket carries the two words; the builder never names a channel.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import type { CharGenStatePayload, ProgramListing } from "@saxonberg/types";
import { CharGenStage } from "../CharGenStage";
import { useStore } from "../../store/index";
import { arrivalWatching, watchSuffix, withGuestWatch } from "../../services/arrival";

const LIVE: ProgramListing = { name: "cafe-hour", title: "The Cafe Hour", live: true, feeds: { twitch: "adaplays" } };

function stage(send: (t: string) => void) {
  return render(
    <CharGenStage
      onSendCommand={send}
      frames={[]}
      onSendPromptResponse={vi.fn()}
      onCancelPrompt={vi.fn()}
      onCommandClick={vi.fn()}
      onCommandPreview={vi.fn()}
    />,
  );
}

function arrive(search: string, show: ProgramListing | null, closed = false): void {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", `/${search}`);
  act(() => {
    useStore.setState({
      charGenState: { fields: [], missing: [] } as unknown as CharGenStatePayload,
      front: show ? { show } : {},
      playerClosed: closed,
    });
  });
}

beforeEach(() => cleanup());

describe("creation's confirm", () => {
  it("while the arrival video plays: shows and sends --watch <program> --<carrier>", () => {
    arrive("?from=twitch", LIVE);
    const send = vi.fn();
    stage(send);
    const confirm = screen.getByTestId("chargen-confirm");
    expect(confirm.textContent).toContain("embody confirm --watch cafe-hour --twitch");
    fireEvent.click(confirm);
    expect(send).toHaveBeenCalledWith("embody confirm --watch cafe-hour --twitch");
  });

  it("not playing (off air, closed, untagged, no feed there): plain", () => {
    for (const [search, show, closed] of [
      ["?from=twitch", { ...LIVE, live: false }, false],
      ["?from=twitch", LIVE, true],
      ["", LIVE, false],
      ["?from=kick", LIVE, false],
    ] as const) {
      cleanup();
      arrive(search, show, closed);
      const send = vi.fn();
      stage(send);
      fireEvent.click(screen.getByTestId("chargen-confirm"));
      expect(send).toHaveBeenCalledWith("embody confirm");
    }
  });
});

describe("the builder", () => {
  it("names the program and the carrier — never the channel", () => {
    const w = arrivalWatching(LIVE, false, { door: "twitch", carrier: "twitch", watch: null });
    expect(w).toEqual({ program: "cafe-hour", carrier: "twitch" });
    expect(watchSuffix(w)).toBe(" --watch cafe-hour --twitch");
    expect(watchSuffix(w)).not.toContain("adaplays");
    expect(withGuestWatch("ws://h?from=twitch", w)).toBe("ws://h?from=twitch&watch=cafe-hour&carrier=twitch");
    expect(withGuestWatch("ws://h", null)).toBe("ws://h");
  });
});
