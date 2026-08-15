/**
 * The wiki's search field is honestly missing.
 *
 * ⚠ Track C's audit records wiki search as **not wired** — there is no
 * port behind it. The design handoff draws the field anyway, and the
 * convention says what to do about that: ship the surface, hatch the
 * value, never hardcode.
 *
 * The failure mode this guards is subtle: a *disabled input* satisfies
 * "you cannot search" while still reading as a search box that is
 * temporarily off. It is the shape the field would quietly drift back
 * into, and it would be wrong in a way nobody notices — so the assertion
 * is that no input element exists at all.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { WikiPane } from "../WikiPane";

const PAGE = {
  kind: "wiki-page" as const,
  handle: "palette:switchable",
  title: "Switchable",
  rev: 4,
  body: "<p>A mixin for anything with two stable states.</p>",
  tags: [],
  related: [],
  sections: [],
  subject: { kind: "mixin", ref: "SwitchableMixin" },
  updatedBy: "Aldric",
  updatedAt: Date.now(),
  mayEdit: false,
};

beforeEach(() => {
  useStore.setState({ wikiPage: PAGE });
});

describe("wiki search", () => {
  it("renders in the not-wired treatment", () => {
    render(<WikiPane onSendCommand={() => undefined} />);
    const field = screen.getByTestId("wiki-search-unwired");
    // `╌╌` where the value would be — the convention's own glyph.
    expect(field.textContent).toContain("╌╌");
    expect(field.textContent).toMatch(/no search port yet/i);
  });

  it("⚠ is not an input, disabled or otherwise", () => {
    const { container } = render(<WikiPane onSendCommand={() => undefined} />);
    const field = screen.getByTestId("wiki-search-unwired");
    expect(field.querySelector("input")).toBeNull();
    expect(field.tagName.toLowerCase()).not.toBe("input");
    // Nor anywhere else in the pane — a search box parked elsewhere would
    // be the same lie in a different place.
    expect(
      container.querySelector('input[type="search"], input[placeholder*="earch"]'),
    ).toBeNull();
  });

  it("names the way in that DOES exist", () => {
    // "Cut the widget if it says nothing without data" is the second
    // preference; this one says something — it tells the reader the tree
    // is the way in, which is true and actionable.
    render(<WikiPane onSendCommand={() => undefined} />);
    expect(
      screen.getByTestId("wiki-search-unwired").textContent,
    ).toMatch(/tree is the way in/i);
  });
});

describe("what the wiki does NOT claim", () => {
  it("shows no page-standing badge", () => {
    // The mock badges pages `OFFICIAL` — "adopted by the Make chamber".
    // No such concept exists anywhere in the wiki subsystem: not in
    // `WikiPageFrame`, not in `wiki.md`. It is an unbuilt GOVERNANCE
    // feature, not an unwired read, so the widget is cut rather than
    // hatched — three hatches on one page would read as a broken page.
    const { container } = render(<WikiPane onSendCommand={() => undefined} />);
    expect(container.textContent).not.toMatch(/official/i);
    expect(container.textContent).not.toMatch(/canon/i);
  });
});
