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
import { useStore } from "../../../store/index";
import { PinnedChipRow } from "../MobilePlaySurface";

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ paneCards: {}, promptDrafts: { base: "" } });
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
