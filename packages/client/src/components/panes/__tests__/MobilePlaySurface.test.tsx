/**
 * The play surface on a phone.
 *
 * ⚠⚠ **jsdom performs no layout**, so the ICB trap — a fixed-width pane
 * inside an overflowing document widening the initial containing block
 * and pushing every `position: fixed` surface off-screen — is
 * structurally invisible here and is checked by DRIVING at 390px.
 * What this suite can prove is the half a browser cannot show at a
 * glance: which surfaces exist at all, what the left-behind stub is FOR,
 * and that nothing on it claims to be a command it is not.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore, type Frame } from "../../../store/index";
import {
  LeftBehindCard,
  PinnedChipRow,
  leftBehind,
} from "../MobilePlaySurface";

let seq = 0;
function frame(over: Partial<Frame> = {}): Frame {
  seq += 1;
  return {
    id: `f${seq}`,
    topic: "speech.comms",
    body: "",
    timestamp: seq,
    ...over,
  };
}

const weightOf = (topic: string) =>
  topic === "shell.diagnostic" ? "diagnostic" : "activity";

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ paneCards: {}, promptDrafts: { base: "" } });
});

describe("⭐ a frame routed out of view leaves something behind", () => {
  it("stubs a frame that went somewhere else", () => {
    const stubs = leftBehind(
      [frame({ feeds: ["channels"] })],
      "world",
      weightOf,
    );
    expect(stubs).toHaveLength(1);
    expect(stubs[0]!.feed).toBe("channels");
  });

  it("⚠ leaves NOTHING behind for a frame copied to the feed you watch", () => {
    // This is what makes copy-to-Attention the safety net rather than a
    // source of doubles: the frame is already in front of you.
    const stubs = leftBehind(
      [frame({ feeds: ["attention", "world"] })],
      "world",
      weightOf,
    );
    expect(stubs).toEqual([]);
  });

  it("⚠ never stubs a diagnostic", () => {
    // A card per log line would recreate exactly the noise the routing
    // rule was written to remove — the stub would be worse than the
    // thing it stands for.
    const stubs = leftBehind(
      [frame({ topic: "shell.diagnostic", feeds: ["diagnostics"] })],
      "world",
      weightOf,
    );
    expect(stubs).toEqual([]);
  });

  it("names the destination and offers to open it", () => {
    const opened: string[] = [];
    render(
      <LeftBehindCard
        frame={frame({ feeds: ["attention"] })}
        feed="attention"
        onOpenFeed={(f) => opened.push(f)}
      />,
    );
    fireEvent.click(screen.getByLabelText("open attention"));
    expect(opened).toEqual(["attention"]);
  });

  it("⚠ `reply here` PREFILLS rather than sending a bare verb", () => {
    render(
      <LeftBehindCard
        frame={frame({ feeds: ["attention"] })}
        feed="attention"
        onOpenFeed={() => undefined}
      />,
    );
    fireEvent.click(screen.getByLabelText("reply here"));
    // `reply` takes a message. A button that dispatched the bare verb
    // would promise a reply it has no words for.
    expect(useStore.getState().promptDrafts.base).toBe("reply ");
  });
});

describe("the pinned chip row", () => {
  it("shows only pinned panes, and hands the decision back on tap", () => {
    useStore.setState({
      paneCards: {
        a: {
          subscriptionId: "a",
          paneId: "place",
          kind: "place",
          pinned: true,
          records: [{ stuffId: "s", displayName: "The Yard" } as never],
          openedAt: 1,
        },
        b: {
          subscriptionId: "b",
          paneId: "agent",
          kind: "agent",
          pinned: null,
          records: [],
          openedAt: 2,
        },
      },
    });
    const sent: string[] = [];
    render(<PinnedChipRow onSendCommand={(t) => sent.push(t)} />);

    expect(screen.getByText(/The Yard/)).toBeTruthy();
    expect(screen.queryByText(/agent/)).toBeNull();

    fireEvent.click(screen.getByLabelText("cockpit pane auto place"));
    // ⭐ A real command, like every other pin control. The chip is a
    // handle on a server-side decision, not a local toggle.
    expect(sent).toEqual(["cockpit pane auto place"]);
  });

  it("renders nothing when nothing is pinned", () => {
    const { container } = render(
      <PinnedChipRow onSendCommand={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
