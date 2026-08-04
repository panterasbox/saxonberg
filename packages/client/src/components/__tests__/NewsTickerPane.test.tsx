import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReleaseRow } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { NewsTickerPane } from "../NewsTickerPane";

function release(overrides: Partial<ReleaseRow> = {}): ReleaseRow {
  return {
    releaseId: "b1",
    realm: "ooc",
    kind: "notice",
    headline: "Headline",
    body: "Body text",
    publishedAt: 1000,
    pinned: false,
    ...overrides,
  };
}

function seed(rows: ReleaseRow[]): void {
  useStore.getState().applyReleaseSnapshot(rows);
}

beforeEach(() => {
  useStore.setState({ feed: {}, feedOrder: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsTickerPane", () => {
  it("renders an empty state when there are no releases", () => {
    render(<NewsTickerPane onSendCommand={() => undefined} />);
    expect(screen.getByText(/No releases yet/i)).toBeDefined();
  });

  it("renders a card per release with realm/kind chips and headline", () => {
    seed([
      release({
        releaseId: "b1",
        headline: "Server maintenance",
        realm: "ooc",
        kind: "changelog",
      }),
    ]);
    render(<NewsTickerPane onSendCommand={() => undefined} />);

    expect(screen.getByText("Server maintenance")).toBeDefined();
    expect(screen.getByText("ooc")).toBeDefined();
    expect(screen.getByText("changelog")).toBeDefined();
    // Count in the header.
    expect(screen.getByText("1")).toBeDefined();
  });

  it("shows a pin indicator on pinned releases, ordered pins-first", () => {
    seed([
      release({ releaseId: "plain", headline: "Plain", publishedAt: 3000 }),
      release({
        releaseId: "pinned",
        headline: "Pinned item",
        publishedAt: 1000,
        pinned: true,
      }),
    ]);
    render(<NewsTickerPane onSendCommand={() => undefined} />);

    // Pin indicator present.
    expect(screen.getByTitle("Pinned")).toBeDefined();

    // Pinned card renders before the plain one despite being older.
    const headlines = screen.getAllByRole("button", { name: /Pinned item|Plain/ });
    expect(headlines[0]?.textContent).toContain("Pinned item");
  });

  it("expands the body on headline click", () => {
    seed([
      release({
        releaseId: "b1",
        headline: "Tap me",
        body: "Hidden detail",
      }),
    ]);
    render(<NewsTickerPane onSendCommand={() => undefined} />);

    expect(screen.queryByText("Hidden detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tap me" }));
    expect(screen.getByText("Hidden detail")).toBeDefined();
  });

  it("loads older releases from the REST archive and appends them", async () => {
    seed([release({ releaseId: "b2", headline: "Recent", publishedAt: 2000 })]);
    const older: ReleaseRow[] = [
      release({ releaseId: "b1", headline: "Older", publishedAt: 1000 }),
    ];
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(older), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<NewsTickerPane onSendCommand={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Load older/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/press/archive?before=2000&limit=30",
      { credentials: "include" },
    );
    expect(await screen.findByText("Older")).toBeDefined();
  });

  it("routes MML clicks in the headline through onSendCommand", () => {
    seed([
      release({
        releaseId: "b1",
        headline: '<link href="mudcmd:look board">the board</link>',
      }),
    ]);
    const onSendCommand = vi.fn();
    render(<NewsTickerPane onSendCommand={onSendCommand} />);

    const card = screen.getByRole("button", { name: /the board/ });
    fireEvent.click(within(card).getByText("the board"));
    expect(onSendCommand).toHaveBeenCalledWith("look board");
  });
});
