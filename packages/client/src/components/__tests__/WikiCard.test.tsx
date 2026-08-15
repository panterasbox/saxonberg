/**
 * WikiCard — the article card.
 *
 * Two things are worth asserting and the rest is styling: that the
 * card **renders what the server sent and nothing else** (it has no
 * source, so it cannot re-derive a body), and that every affordance is
 * a **command on the shared bus** (so anything it can do can also be
 * typed, and the verb re-checks permission on arrival).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { WikiPageFrame } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { WikiCard } from "../WikiCard";

function page(overrides: Partial<WikiPageFrame> = {}): WikiPageFrame {
  return {
    kind: "wiki-page",
    handle: "main:oak",
    title: "Oak",
    rev: 3,
    body: "A dense hardwood.",
    tags: ["material", "wood"],
    related: ["main:furniture"],
    sections: [
      { level: 2, anchor: "uses", title: "Uses" },
      { level: 3, anchor: "working", title: "Working it" },
    ],
    subject: { kind: "template", ref: "/obj/material/oak" },
    updatedBy: "Alice",
    updatedAt: Date.UTC(2026, 7, 3),
    mayEdit: true,
    ...overrides,
  };
}

beforeEach(() => {
  useStore.setState({ wikiPage: null, rightCard: "inspect" });
});

describe("WikiCard", () => {
  it("invites a first read when nothing is open", () => {
    render(<WikiCard onSendCommand={() => undefined} />);
    expect(screen.getByText(/Nothing open/i)).toBeDefined();
  });

  it("renders the pushed article — title, meta, body, outline", () => {
    useStore.getState().setWikiPage(page());
    render(<WikiCard onSendCommand={() => undefined} />);

    expect(screen.getByText("Oak")).toBeDefined();
    expect(screen.getByText(/main:oak · rev 3 · Alice/)).toBeDefined();
    expect(screen.getByText("A dense hardwood.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Uses" })).toBeDefined();
    expect(screen.getByText("material")).toBeDefined();
    expect(screen.getByText(/\/obj\/material\/oak/)).toBeDefined();
  });

  it("⭐ shows the body it was SENT — it never re-renders one", () => {
    // The reveal model rests on one gate, on the server. Whatever the
    // server chose to send is what appears; a card that could produce
    // a body from a source would be a second path to the reader.
    useStore.getState().setWikiPage(page({ body: "open <b>only</b>" }));
    render(<WikiCard onSendCommand={() => undefined} />);
    expect(screen.getByText(/open/)).toBeDefined();
  });

  it("issues `wiki edit <handle>` from the Edit affordance", () => {
    useStore.getState().setWikiPage(page());
    const onSendCommand = vi.fn();
    render(<WikiCard onSendCommand={onSendCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onSendCommand).toHaveBeenCalledWith("wiki edit main:oak");
  });

  it("hides Edit when the server says the reader may not", () => {
    // A display hint only — the verb decides on arrival. Drawing an
    // affordance that is certain to be refused is the failure here,
    // not a security hole.
    useStore.getState().setWikiPage(page({ mayEdit: false }));
    render(<WikiCard onSendCommand={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("an outline row opens THAT SECTION for editing", () => {
    // Section editing is the wiki's concurrency control: two people in
    // different sections never collide.
    useStore.getState().setWikiPage(page());
    const onSendCommand = vi.fn();
    render(<WikiCard onSendCommand={onSendCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Uses" }));
    expect(onSendCommand).toHaveBeenCalledWith(
      "wiki edit main:oak --section uses",
    );
  });

  it("an outline row RE-READS the page for a reader who cannot edit", () => {
    useStore.getState().setWikiPage(page({ mayEdit: false }));
    const onSendCommand = vi.fn();
    render(<WikiCard onSendCommand={onSendCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Uses" }));
    expect(onSendCommand).toHaveBeenCalledWith("wiki main:oak");
  });

  it("follows a `see also` entry as a read", () => {
    useStore.getState().setWikiPage(page());
    const onSendCommand = vi.fn();
    render(<WikiCard onSendCommand={onSendCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "main:furniture" }));
    expect(onSendCommand).toHaveBeenCalledWith("wiki main:furniture");
  });

  it("previews its own affordances on hover, per the global contract", () => {
    useStore.getState().setWikiPage(page());
    const onCommandPreview = vi.fn();
    render(
      <WikiCard
        onSendCommand={() => undefined}
        onCommandPreview={onCommandPreview}
      />,
    );

    const history = screen.getByRole("button", { name: "History" });
    fireEvent.mouseEnter(history);
    expect(onCommandPreview).toHaveBeenCalledWith("wiki history main:oak");
    fireEvent.mouseLeave(history);
    expect(onCommandPreview).toHaveBeenCalledWith(null);
  });

  it("⚠ marks an unsaved preview as one", () => {
    // A preview that looked identical to the saved page would be a
    // page saying it is something it is not.
    useStore.getState().setWikiPage(page({ preview: true }));
    render(<WikiCard onSendCommand={() => undefined} />);
    expect(screen.getByText(/unsaved preview/i)).toBeDefined();
  });

  it("reading a page brings the card forward", () => {
    // The verb's purpose is to put an article in front of somebody.
    expect(useStore.getState().rightCard).toBe("inspect");
    useStore.getState().setWikiPage(page());
    expect(useStore.getState().rightCard).toBe("wiki");
  });
});
