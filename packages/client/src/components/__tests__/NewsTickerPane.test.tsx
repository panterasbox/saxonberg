import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { BulletinRow } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { NewsTickerPane } from "../NewsTickerPane";

function bulletin(overrides: Partial<BulletinRow> = {}): BulletinRow {
  return {
    bulletinId: "b1",
    realm: "ooc",
    kind: "notice",
    headline: "Headline",
    body: "Body text",
    publishedAt: 1000,
    pinned: false,
    ...overrides,
  };
}

function seed(rows: BulletinRow[]): void {
  useStore.getState().applyBulletinSnapshot(rows);
}

beforeEach(() => {
  useStore.setState({ feed: {}, feedOrder: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsTickerPane", () => {
  it("renders an empty state when there are no bulletins", () => {
    render(<NewsTickerPane onSendCommand={() => undefined} />);
    expect(screen.getByText(/No bulletins yet/i)).toBeDefined();
  });

  it("renders a card per bulletin with realm/kind chips and headline", () => {
    seed([
      bulletin({
        bulletinId: "b1",
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

  it("shows a pin indicator on pinned bulletins, ordered pins-first", () => {
    seed([
      bulletin({ bulletinId: "plain", headline: "Plain", publishedAt: 3000 }),
      bulletin({
        bulletinId: "pinned",
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
      bulletin({
        bulletinId: "b1",
        headline: "Tap me",
        body: "Hidden detail",
      }),
    ]);
    render(<NewsTickerPane onSendCommand={() => undefined} />);

    expect(screen.queryByText("Hidden detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tap me" }));
    expect(screen.getByText("Hidden detail")).toBeDefined();
  });

  it("loads older bulletins from the REST archive and appends them", async () => {
    seed([bulletin({ bulletinId: "b2", headline: "Recent", publishedAt: 2000 })]);
    const older: BulletinRow[] = [
      bulletin({ bulletinId: "b1", headline: "Older", publishedAt: 1000 }),
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
      "/api/bulletins/archive?before=2000&limit=30",
      { credentials: "include" },
    );
    expect(await screen.findByText("Older")).toBeDefined();
  });

  it("routes MML clicks in the headline through onSendCommand", () => {
    seed([
      bulletin({
        bulletinId: "b1",
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
