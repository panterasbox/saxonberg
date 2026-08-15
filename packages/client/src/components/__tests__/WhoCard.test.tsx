import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RosterRow } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { WhoCard } from "../WhoCard";

function row(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    handle: "/obj/Avatar/p1",
    header: "Alice",
    recognized: true,
    ...overrides,
  };
}

function seed(rows: RosterRow[]): void {
  useStore.getState().applyRosterSnapshot(rows);
}

beforeEach(() => {
  useStore.setState({ roster: {}, rosterOrder: [] });
});

describe("WhoCard", () => {
  it("renders an empty state when no one is online", () => {
    render(<WhoCard onSendCommand={() => undefined} />);
    expect(screen.getByText(/No one else is around/i)).toBeDefined();
  });

  it("renders a row per roster entry with header, country, status", () => {
    seed([
      row({ handle: "h1", header: "Alice", country: "Brazil" }),
      row({
        handle: "h2",
        header: "a tall stranger",
        recognized: false,
        status: "engaged",
      }),
    ]);
    render(<WhoCard onSendCommand={() => undefined} />);

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText(/Brazil/)).toBeDefined();
    expect(screen.getByText("a tall stranger")).toBeDefined();
    expect(screen.getByText("engaged")).toBeDefined();
    // Count badge in the header.
    expect(screen.getByText("2")).toBeDefined();
  });

  it("issues `profile <header>` on row click", () => {
    seed([row({ handle: "h1", header: "Alice" })]);
    const onSendCommand = vi.fn();
    render(<WhoCard onSendCommand={onSendCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(onSendCommand).toHaveBeenCalledWith("profile Alice");
  });

  it("previews `profile <header>` on hover and clears on leave", () => {
    seed([row({ handle: "h1", header: "Alice" })]);
    const onCommandPreview = vi.fn();
    render(
      <WhoCard
        onSendCommand={() => undefined}
        onCommandPreview={onCommandPreview}
      />,
    );

    const target = screen.getByRole("button", { name: "Alice" });
    fireEvent.mouseEnter(target);
    expect(onCommandPreview).toHaveBeenCalledWith("profile Alice");

    fireEvent.mouseLeave(target);
    expect(onCommandPreview).toHaveBeenCalledWith(null);
  });
});
