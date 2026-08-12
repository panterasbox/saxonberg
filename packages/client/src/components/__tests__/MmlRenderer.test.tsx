import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MmlRenderer } from "../MmlRenderer";
import { useStore } from "../../store";

function renderRenderer(text: string) {
  const onCommandClick = vi.fn();
  const onCommandPreview = vi.fn();
  const result = render(
    <MmlRenderer
      text={text}
      onCommandClick={onCommandClick}
      onCommandPreview={onCommandPreview}
    />
  );
  return { ...result, onCommandClick, onCommandPreview };
}

describe("MmlRenderer", () => {
  it("renders plain text without modification", () => {
    renderRenderer("hello world");
    expect(screen.getByText("hello world")).toBeDefined();
  });

  it("renders an <exit> tag as a clickable span with the label as text", () => {
    renderRenderer(
      'Exits: <exit dir="north">north</exit>, <exit dir="south">south</exit>.'
    );
    expect(screen.getByText("north")).toBeDefined();
    expect(screen.getByText("south")).toBeDefined();
  });

  it("fires onCommandClick with 'go <dir>' when clicked", () => {
    const { onCommandClick } = renderRenderer(
      'Exits: <exit dir="north">north</exit>.'
    );
    fireEvent.click(screen.getByText("north"));
    expect(onCommandClick).toHaveBeenCalledWith("go north");
  });

  it("falls back to label text inside 'go <label>' when <exit> has no dir attribute", () => {
    const { onCommandClick } = renderRenderer("<exit>up</exit>");
    fireEvent.click(screen.getByText("up"));
    expect(onCommandClick).toHaveBeenCalledWith("go up");
  });

  it("renders truly unknown tags as their label text without a clickable affordance (forward-compat)", () => {
    // `<quantity>` is a tag the renderer doesn't recognise (not an
    // exit, not an identity tag, not a non-actionable narrative tag).
    // Forward-compatibility: it renders as plain label text, no span.
    const { container } = renderRenderer(
      'You see <quantity n="3">three apples</quantity> here.'
    );
    expect(container.textContent).toBe("You see three apples here.");
    expect(container.querySelector("span")).toBeNull();
  });

  it("handles multiple tags interleaved with text", () => {
    const { onCommandClick } = renderRenderer(
      'Go <exit dir="north">north</exit> or <exit dir="east">east</exit>.'
    );
    fireEvent.click(screen.getByText("east"));
    expect(onCommandClick).toHaveBeenCalledWith("go east");
    expect(onCommandClick).toHaveBeenCalledTimes(1);
  });

  it("renders text containing only a tag", () => {
    const { onCommandClick } = renderRenderer('<exit dir="north">north</exit>');
    fireEvent.click(screen.getByText("north"));
    expect(onCommandClick).toHaveBeenCalledWith("go north");
  });

  it("renders text containing no tags", () => {
    const { container } = renderRenderer("Your surroundings are indistinct.");
    expect(container.textContent).toBe("Your surroundings are indistinct.");
  });

  it("fires onCommandPreview with the command on mouseenter", () => {
    const { onCommandPreview } = renderRenderer(
      '<exit dir="north">north</exit>'
    );
    fireEvent.mouseEnter(screen.getByText("north"));
    expect(onCommandPreview).toHaveBeenCalledWith("go north");
  });

  it("fires onCommandPreview with null on mouseleave", () => {
    const { onCommandPreview } = renderRenderer(
      '<exit dir="north">north</exit>'
    );
    fireEvent.mouseEnter(screen.getByText("north"));
    fireEvent.mouseLeave(screen.getByText("north"));
    expect(onCommandPreview).toHaveBeenNthCalledWith(1, "go north");
    expect(onCommandPreview).toHaveBeenNthCalledWith(2, null);
  });

  it("does not fire onCommandPreview for tags that are truly unknown", () => {
    const { onCommandPreview, container } = renderRenderer(
      'You hold <quantity n="3">three apples</quantity>.'
    );
    // No span rendered for unrecognised tag — nothing to hover.
    expect(container.querySelector("span")).toBeNull();
    expect(onCommandPreview).not.toHaveBeenCalled();
  });

  describe("entity decoding", () => {
    it("decodes &amp; in plain text", () => {
      const { container } = renderRenderer("hello &amp; welcome");
      expect(container.textContent).toBe("hello & welcome");
    });

    it("decodes &lt; &gt; &quot; &apos; in plain text", () => {
      const { container } = renderRenderer(
        "5 &lt; 7 &gt; 3, said &quot;Bob&apos;s neighbour&quot;"
      );
      expect(container.textContent).toBe(
        "5 < 7 > 3, said \"Bob's neighbour\""
      );
    });

    it("decodes entities inside tag labels", () => {
      const { container } = renderRenderer(
        '<exit dir="north">north &amp; up</exit>'
      );
      expect(container.textContent).toBe("north & up");
    });

    it("decodes entities inside attribute values", () => {
      const { onCommandClick, container } = renderRenderer(
        '<exit dir="north &amp; up">label</exit>'
      );
      fireEvent.click(container.querySelector("span")!);
      expect(onCommandClick).toHaveBeenCalledWith("go north & up");
    });

    it("preserves escaped entity-like sequences (&amp; replaced last)", () => {
      // Server wants to render the literal text `&lt;` to the user.
      // It escapes the `&` so we don't re-decode the inner entity.
      // After our pass the user should see `&lt;`, not `<`.
      const { container } = renderRenderer("see &amp;lt; for less-than");
      expect(container.textContent).toBe("see &lt; for less-than");
    });
  });

  describe("identity tags (Wave 9 — registry-backed look targets)", () => {
    beforeEach(() => {
      // Clear the registry between tests so seeded state doesn't leak.
      useStore.setState({ stuffRegistry: new Map() });
    });

    it("renders an <thing> with a stuff-id resolving to a registry hit as a clickable span; click sends look <primaryKeyword>", () => {
      useStore.getState().upsertStuffMetadata([
        { stuffId: "X", displayName: "a brass thermometer", primaryKeyword: "thermometer" },
      ]);
      const { onCommandClick } = renderRenderer(
        '<thing stuff-id="X">a brass thermometer</thing>'
      );
      fireEvent.click(screen.getByText("a brass thermometer"));
      expect(onCommandClick).toHaveBeenCalledWith("look thermometer");
    });

    it("renders an <thing> with a stuff-id but no registry hit as a clickable span; click sends look <label>", () => {
      const { onCommandClick } = renderRenderer(
        '<thing stuff-id="Y">an orphan</thing>'
      );
      fireEvent.click(screen.getByText("an orphan"));
      expect(onCommandClick).toHaveBeenCalledWith("look an orphan");
    });

    it("falls back to label when the registry hit is present but carries no primaryKeyword", () => {
      useStore.getState().upsertStuffMetadata([
        { stuffId: "Z", displayName: "something nameless" },
      ]);
      const { onCommandClick } = renderRenderer(
        '<thing stuff-id="Z">something nameless</thing>'
      );
      fireEvent.click(screen.getByText("something nameless"));
      expect(onCommandClick).toHaveBeenCalledWith("look something nameless");
    });

    it("falls back to label when the identity tag carries no stuff-id at all", () => {
      const { onCommandClick } = renderRenderer(
        "<thing>a plain apple</thing>"
      );
      fireEvent.click(screen.getByText("a plain apple"));
      expect(onCommandClick).toHaveBeenCalledWith("look a plain apple");
    });

    it("renders <player> tags the same way (registry hit → primaryKeyword)", () => {
      useStore.getState().upsertStuffMetadata([
        { stuffId: "A", displayName: "Alice", primaryKeyword: "alice" },
      ]);
      const { onCommandClick } = renderRenderer(
        '<player stuff-id="A">Alice</player>'
      );
      fireEvent.click(screen.getByText("Alice"));
      expect(onCommandClick).toHaveBeenCalledWith("look alice");
    });

    it("renders <location> tags the same way (registry hit → primaryKeyword)", () => {
      useStore.getState().upsertStuffMetadata([
        { stuffId: "L", displayName: "the great hall", primaryKeyword: "hall" },
      ]);
      const { onCommandClick } = renderRenderer(
        '<location stuff-id="L">the great hall</location>'
      );
      fireEvent.click(screen.getByText("the great hall"));
      expect(onCommandClick).toHaveBeenCalledWith("look hall");
    });

    it("renders <npc> tags the same way (registry miss → label fallback)", () => {
      const { onCommandClick } = renderRenderer(
        '<npc stuff-id="missing">a stray rock</npc>'
      );
      fireEvent.click(screen.getByText("a stray rock"));
      expect(onCommandClick).toHaveBeenCalledWith("look a stray rock");
    });

    it("<direction> renders as plain text (non-actionable)", () => {
      const { container, onCommandPreview } = renderRenderer(
        "<direction>up</direction>"
      );
      expect(container.textContent).toBe("up");
      expect(container.querySelector("span")).toBeNull();
      expect(onCommandPreview).not.toHaveBeenCalled();
    });

    it("<speech> renders as plain text in its quotes, non-actionable", () => {
      // Frame-level italic was making per-word `*italic*` invisible
      // inside speech (italic-inflation, same anti-pattern as
      // bold-inflation). Speech now renders with no frame-level
      // styling; the body's quote characters + "X says," framing
      // already mark it as speech, leaving `*italic*` free to
      // emphasize per-word.
      const { container, onCommandPreview } = renderRenderer(
        "<speech>hello there</speech>"
      );
      expect(container.textContent).toBe("hello there");
      const span = container.querySelector("span");
      expect(span).not.toBeNull();
      expect(window.getComputedStyle(span!).fontStyle).not.toBe("italic");
      expect(onCommandPreview).not.toHaveBeenCalled();
    });

    it("fires onCommandPreview with the resolved command on mouseenter for an identity tag", () => {
      useStore.getState().upsertStuffMetadata([
        { stuffId: "X", displayName: "a brass thermometer", primaryKeyword: "thermometer" },
      ]);
      const { onCommandPreview } = renderRenderer(
        '<thing stuff-id="X">a brass thermometer</thing>'
      );
      fireEvent.mouseEnter(screen.getByText("a brass thermometer"));
      expect(onCommandPreview).toHaveBeenCalledWith("look thermometer");
    });

    it("fires onCommandPreview with null on mouseleave for an identity tag", () => {
      const { onCommandPreview } = renderRenderer(
        '<thing stuff-id="Y">orphan</thing>'
      );
      const span = screen.getByText("orphan");
      fireEvent.mouseEnter(span);
      fireEvent.mouseLeave(span);
      expect(onCommandPreview).toHaveBeenNthCalledWith(1, "look orphan");
      expect(onCommandPreview).toHaveBeenNthCalledWith(2, null);
    });

    it("tints a <player color='amber'> span with the palette color (boosted occupant) while keeping it clickable", () => {
      const { container, onCommandClick } = renderRenderer(
        '<player color="amber">Alice</player>'
      );
      const span = screen.getByText("Alice");
      // amber → tokens.palette.amber → var(--sx-tint-amber).
      // ⚠ jsdom does NOT substitute var(): getComputedStyle returns the
      // unresolved reference string, not a resolved rgb() triple. That
      // is a jsdom limitation, not a bug here — a real browser resolves
      // it, and e2e/tests/theme.spec.ts asserts the resolved value.
      expect(window.getComputedStyle(span).color).toBe(
        "var(--sx-tint-amber)",
      );
      // Click behavior preserved — falls back to `look <label>` with no
      // registry hit.
      fireEvent.click(span);
      expect(onCommandClick).toHaveBeenCalledWith("look Alice");
      expect(container.querySelector("span")).not.toBeNull();
    });

    it("renders a <highlight color='rose'> span tinted by the palette (forward-compat)", () => {
      const { onCommandPreview } = renderRenderer(
        '<highlight color="rose">danger</highlight>'
      );
      const span = screen.getByText("danger");
      // rose → tokens.palette.rose → var(--sx-tint-rose). See the
      // jsdom note on the amber case above.
      expect(window.getComputedStyle(span).color).toBe(
        "var(--sx-tint-rose)",
      );
      // Not clickable — a styling wrapper only.
      expect(onCommandPreview).not.toHaveBeenCalled();
    });

    it("reads the registry as a snapshot — upserts after render do not auto-rerender, but reads at click time use the latest snapshot when the parent re-renders", () => {
      // First render: no registry hit, label fallback.
      const { onCommandClick, rerender } = renderRenderer(
        '<thing stuff-id="X">a brass thermometer</thing>'
      );
      fireEvent.click(screen.getByText("a brass thermometer"));
      expect(onCommandClick).toHaveBeenLastCalledWith(
        "look a brass thermometer"
      );

      // Registry upsert happens externally — renderer doesn't auto-update.
      useStore.getState().upsertStuffMetadata([
        { stuffId: "X", displayName: "a brass thermometer", primaryKeyword: "thermometer" },
      ]);

      // Parent re-renders (passes same text) → renderer re-reads snapshot.
      rerender(
        <MmlRenderer
          text={'<thing stuff-id="X">a brass thermometer</thing>'}
          onCommandClick={onCommandClick}
          onCommandPreview={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText("a brass thermometer"));
      expect(onCommandClick).toHaveBeenLastCalledWith("look thermometer");
    });
  });
});
