/**
 * The emote picker renders FROM THE SERVER'S CATALOGUE.
 *
 * ⚠ These are rendering tests and prove only rendering. The wiring that
 * puts the picker on a frame at all lives in `Terminal`/`ReactionBar`
 * and is covered by `reactableTopics.test.tsx` plus the layout wiring
 * guard — a component test has passed green over a dead surface in this
 * codebase before.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EmoteCatalogueEntry } from "@saxonberg/types";
import { useStore } from "../../../store";
import { EmotePicker } from "../EmotePicker";

const CATALOGUE: EmoteCatalogueEntry[] = [
  { verb: "nod", emoji: "🙂", aliases: ["agree"], tags: [], slots: [] },
  {
    verb: "wave",
    emoji: "👋",
    aliases: [],
    tags: [],
    slots: [
      { name: "at", kind: "stuff", required: false },
      { name: "manner", kind: "free", required: false },
    ],
  },
  {
    verb: "point",
    emoji: "👉",
    aliases: [],
    tags: [],
    slots: [{ name: "at", kind: "stuff", required: true }],
  },
  // Glyph-less: renders as prose, never a chip, so never a grid cell.
  { verb: "sigh", aliases: [], tags: [], slots: [] },
];

function seed(entries = CATALOGUE) {
  useStore.setState({
    emoteCatalogue: new Map(entries.map((e) => [e.verb, e])),
  });
}

beforeEach(() => {
  seed();
});

describe("the grid", () => {
  it("draws every emoji-bearing catalogue entry and no others", () => {
    render(
      <EmotePicker
        frameId={112}
        mine={[]}
        onCommandClick={vi.fn()}
        onCommandPreview={vi.fn()}
      />,
    );
    const cells = document.querySelectorAll("[data-emote]");
    expect([...cells].map((c) => c.getAttribute("data-emote"))).toEqual([
      "nod",
      "point",
      "wave",
    ]);
  });

  it("prints the canonical verb under every glyph", () => {
    render(
      <EmotePicker
        frameId={112}
        mine={[]}
        onCommandClick={vi.fn()}
        onCommandPreview={vi.fn()}
      />,
    );
    // The verb is what gets sent; the emoji is an alias surface over it.
    expect(screen.getByText("wave")).toBeTruthy();
    expect(screen.getByText("nod")).toBeTruthy();
  });

  it("renders nothing to pick before the server has answered", () => {
    seed([]);
    render(
      <EmotePicker
        frameId={1}
        mine={[]}
        onCommandClick={vi.fn()}
        onCommandPreview={vi.fn()}
      />,
    );
    expect(document.querySelectorAll("[data-emote]").length).toBe(0);
  });
});

describe("slots", () => {
  it("offers one control per declared slot, in declaration order", () => {
    render(
      <EmotePicker
        frameId={113}
        mine={[]}
        onCommandClick={vi.fn()}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="wave"]')!);
    const slots = document.querySelectorAll("[data-slot]");
    expect([...slots].map((s) => s.getAttribute("data-slot"))).toEqual([
      "at",
      "manner",
    ]);
  });

  it("distinguishes a stuff slot from a free one", () => {
    render(
      <EmotePicker
        frameId={113}
        mine={[]}
        onCommandClick={vi.fn()}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="wave"]')!);
    expect(
      document.querySelector('[data-slot="at"]')!.getAttribute("data-slot-kind"),
    ).toBe("stuff");
    expect(
      document
        .querySelector('[data-slot="manner"]')!
        .getAttribute("data-slot-kind"),
    ).toBe("free");
  });

  it("sends a slotless emote straight from the cell", () => {
    // The frictionless everyday path, and the reason the grid exists: a
    // slotless emote has nothing to fill in, so the cell click IS the
    // send rather than a selection.
    const onClick = vi.fn();
    render(
      <EmotePicker
        frameId={1}
        mine={[]}
        onCommandClick={onClick}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="nod"]')!);
    expect(onClick).toHaveBeenCalledWith("react --msg 1 nod");
    // …and it never opens a slot row it has no slots for.
    expect(screen.queryByTestId("emote-slots")).toBeNull();
  });
});

describe("the command line", () => {
  it("shows the verbatim command, and the send emits that same string", () => {
    const onClick = vi.fn();
    render(
      <EmotePicker
        frameId={113}
        mine={[]}
        onCommandClick={onClick}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="wave"]')!);
    fireEvent.change(document.querySelector('[data-slot="at"]')!, {
      target: { value: "bob" },
    });

    const shown = screen.getByTestId("composed-command").textContent;
    fireEvent.click(screen.getByText("send ⏎"));

    // ⭐⭐ Equality of the two renderings — the expected string is never
    // written twice here, because a test that spells it out in both
    // places cannot catch the two surfaces diverging.
    expect(onClick).toHaveBeenCalledWith(shown);
  });

  it("refuses to send while a required slot is empty", () => {
    const onClick = vi.fn();
    render(
      <EmotePicker
        frameId={7}
        mine={[]}
        onCommandClick={onClick}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="point"]')!);
    const send = screen.getByText("send ⏎") as HTMLButtonElement;
    // The control branches on the same fact its title describes.
    expect(send.disabled).toBe(true);
    expect(send.title).toContain("at");

    fireEvent.change(document.querySelector('[data-slot="at"]')!, {
      target: { value: "bob" },
    });
    expect((screen.getByText("send ⏎") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("composes an un-react for an emote the viewer already used", () => {
    const onClick = vi.fn();
    render(
      <EmotePicker
        frameId={4}
        mine={["nod"]}
        onCommandClick={onClick}
        onCommandPreview={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector('[data-emote="nod"]')!);
    expect(onClick).toHaveBeenCalledWith("react --remove --msg 4 nod");
  });
});
