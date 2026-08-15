/**
 * The play surface on a phone.
 *
 * ⚠⚠ **jsdom performs no layout**, so the ICB trap — a fixed-width card
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
  useStore.setState({ cards: {}, promptDrafts: { base: "" } });
});

describe("the pinned chip row", () => {
  it("shows only pinned cards, and hands the decision back on tap", () => {
    useStore.setState({
      cards: {
        a: {
          instanceId: "a",
          cardId: "place",
          key: "look",
          live: true,
          pinned: true,
          title: "The Yard",
          records: [{ stuffId: "s", displayName: "The Yard" } as never],
          openedAt: 1,
        },
        b: {
          instanceId: "b",
          cardId: "who",
          key: "who",
          live: false,
          pinned: false,
          records: [],
          openedAt: 2,
        },
      },
    });
    const sent: string[] = [];
    render(<PinnedChipRow onSendCommand={(t) => sent.push(t)} />);

    expect(screen.getByText(/The Yard/)).toBeTruthy();
    expect(screen.queryByText(/who/)).toBeNull();

    /*
     * ⚠ The chip names the card by its KEY (`look`), not by its
     * catalogue id — two cards of one kind can be open at once, and a
     * chip that acted on whichever the server found first would be a
     * control that does not act on the card it is on. See `Card.tsx`'s
     * `cardRef`.
     */
    fireEvent.click(screen.getByLabelText("cockpit card auto look"));
    // ⭐ A real command, like every other pin control. The chip is a
    // handle on a server-side decision, not a local toggle.
    expect(sent).toEqual(["cockpit card auto look"]);
  });

  it("renders nothing when nothing is pinned", () => {
    const { container } = render(
      <PinnedChipRow onSendCommand={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
