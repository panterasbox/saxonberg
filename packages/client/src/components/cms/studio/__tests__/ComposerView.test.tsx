/**
 * ComposerView tests.
 *
 *   1. Fix 2 — the inline mixin-help surface. A dense mixin palette is unusable
 *      without one-line descriptions, so every chip/row carries its
 *      `MixinPaletteEntry.summary` as a `title` tooltip AND an always-visible,
 *      sticky help strip shows the hovered/focused mixin's summary. The strip +
 *      tooltips de-duplicate a summary that already opens with its own name.
 *   2. Fix 1 — the live source. The center panel auto-scaffolds (debounced) as
 *      the composition changes; the Monaco editor shows the generated source
 *      without a gated click.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { MixinDetail, MixinPalette } from "@saxonberg/types";
import { useStore } from "../../../../store/index";
import { ComposerView } from "../ComposerView";

// Stub the lazy Monaco editor so mounting the source pane in jsdom doesn't pull
// in the real `monaco-editor` bundle + its web workers. The stub just surfaces
// the source text it is handed, which is all these tests observe.
vi.mock("../../MonacoLazy", () => ({
  MonacoLazy: (props: { value: string }) => (
    <div data-testid="monaco-stub">{props.value}</div>
  ),
}));

// Mock the REST client so the auto-scaffold + inspector paths resolve without
// a server.
const scaffoldMock = vi.fn();
const describeMixinMock = vi.fn();
vi.mock("../../studioClient", async (orig) => {
  const actual = await orig<typeof import("../../studioClient")>();
  return {
    ...actual,
    studioClient: {
      ...actual.studioClient,
      scaffold: (...a: unknown[]) => scaffoldMock(...a),
      describeMixin: (...a: unknown[]) => describeMixinMock(...a),
    },
  };
});

const GLOBBABLE_DETAIL: MixinDetail = {
  name: "GlobbableMixin",
  description:
    "GlobbableMixin — fungible-stack substrate.\n\n" +
    "Three guarantees:\n  1. One Stuff, N units.",
  authorableFields: [
    { name: "quantity", typeShape: "number", kind: "property" },
  ],
  runtimeState: [],
  relations: [],
  methods: [],
};

const SUMMARY = "fungible-stack substrate.";

const PALETTE: MixinPalette = {
  mixins: [
    { name: "Idea", kind: "base" },
    { name: "GlobbableMixin", kind: "mixin", summary: SUMMARY },
    { name: "UndocMixin", kind: "mixin" },
    // A summary that redundantly opens with the mixin's own name (the doubling
    // the strip + tooltip must collapse to a single occurrence).
    {
      name: "NamedMixin",
      kind: "mixin",
      summary: "NamedMixin — proper-name identity",
    },
  ],
  bases: [{ name: "Idea", classPath: "", impliedMixins: [] }],
};

function seedComposer(): void {
  useStore.setState({
    studio: {
      ...useStore.getState().studio,
      view: "composer",
      palette: PALETTE,
      blueprints: [],
      inspectedMixin: null,
      mixinDetails: {},
      inspectError: null,
      composer: {
        name: "",
        base: {
          name: "Idea",
          classPath: "",
          impliedMixins: [],
          rootBaseClass: "Idea",
        },
        orderedMixins: [],
      },
      scaffoldSource: null,
      scaffoldTarget: null,
    },
  });
}

// ---------------------------------------------------------------------------
describe("ComposerView mixin inspector pane", () => {
  beforeEach(() => {
    describeMixinMock.mockReset();
    seedComposer();
  });

  it("keeps the de-duplicated summary tooltip on the chips (secondary affordance)", () => {
    render(<ComposerView />);
    // The quick summary tooltip still rides each chip.
    expect(
      screen.getByText("GlobbableMixin").getAttribute("title"),
    ).toContain(SUMMARY);
    // A summary that opens with the mixin's own name reads once, not doubled.
    const named = screen.getByRole("button", { name: "NamedMixin" });
    expect(named.getAttribute("title")).toBe(
      "NamedMixin — proper-name identity",
    );
    // A summary-less chip's title is just the affordance text.
    expect(screen.getByText("UndocMixin").getAttribute("title")).toBe(
      "Add UndocMixin",
    );
  });

  it("shows the empty state before any hover", () => {
    render(<ComposerView />);
    const pane = screen.getByTestId("mixin-inspector");
    expect(pane.textContent).toMatch(/Hover or focus a mixin to inspect it/);
    expect(describeMixinMock).not.toHaveBeenCalled();
  });

  it("loads a mixin's description + fields into the pane on hover", async () => {
    describeMixinMock.mockResolvedValue(GLOBBABLE_DETAIL);
    render(<ComposerView />);

    fireEvent.mouseEnter(screen.getByText("GlobbableMixin"));

    // The full multi-paragraph description renders (not just a one-liner).
    expect(
      await screen.findByText(/Three guarantees/),
    ).toBeTruthy();
    const pane = screen.getByTestId("mixin-inspector");
    expect(pane.textContent).toContain("fungible-stack substrate");
    expect(pane.textContent).toContain("One Stuff, N units");
    // The contributed field surfaces with its type shape.
    expect(pane.textContent).toContain("quantity");
    expect(pane.textContent).toContain("(number)");
    expect(describeMixinMock).toHaveBeenCalledWith("GlobbableMixin");
  });

  it("is sticky — it keeps the last inspected mixin after mouse-out", async () => {
    describeMixinMock.mockResolvedValue(GLOBBABLE_DETAIL);
    render(<ComposerView />);

    const chip = screen.getByText("GlobbableMixin");
    fireEvent.mouseEnter(chip);
    await screen.findByText(/Three guarantees/);

    // Mouse leaves the chip — the pane must NOT clear.
    fireEvent.mouseLeave(chip);
    const pane = screen.getByTestId("mixin-inspector");
    expect(pane.textContent).toContain("fungible-stack substrate");
    expect(pane.textContent).not.toMatch(/Hover or focus a mixin/);
  });

  it("caches per mixin — re-hovering never refetches", async () => {
    describeMixinMock.mockResolvedValue(GLOBBABLE_DETAIL);
    render(<ComposerView />);

    const glob = screen.getByText("GlobbableMixin");
    const undoc = screen.getByText("UndocMixin");

    fireEvent.mouseEnter(glob);
    await screen.findByText(/Three guarantees/);
    expect(describeMixinMock).toHaveBeenCalledTimes(1);

    // Hover away, then back to Globbable — still ONE fetch for it.
    fireEvent.mouseEnter(undoc);
    await act(async () => {});
    fireEvent.mouseEnter(glob);
    await act(async () => {});

    const globCalls = describeMixinMock.mock.calls.filter(
      (c) => c[0] === "GlobbableMixin",
    );
    expect(globCalls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
describe("ComposerView live source (Fix 1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scaffoldMock.mockReset();
    seedComposer();
    useStore.setState({
      cms: { ...useStore.getState().cms, csrf: "csrf" },
    });
  });

  afterEach(async () => {
    // Flush any pending debounce timer + its async scaffold so the resolving
    // state update lands inside act() (no "update not wrapped in act" warning).
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    vi.useRealTimers();
  });

  it("auto-scaffolds after the debounce and the editor shows the source", async () => {
    scaffoldMock.mockResolvedValue({
      source: "export class MyKind extends Idea {}\n",
      targetPath: "/obj/MyKind.ts",
    });
    render(<ComposerView />);

    // Nothing fires until the debounce elapses.
    expect(scaffoldMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    // Fired once, with the placeholder name (the name field is empty).
    expect(scaffoldMock).toHaveBeenCalledTimes(1);
    expect(scaffoldMock).toHaveBeenCalledWith(
      { name: "MyKind", baseClass: "Idea", mixinNames: [] },
      "csrf",
    );
    // The editor (stubbed) surfaces the returned source — no gated click.
    expect(screen.getByTestId("monaco-stub").textContent).toContain("MyKind");
  });

  it("does not fire the scaffold call before the debounce window", async () => {
    scaffoldMock.mockResolvedValue({
      source: "x",
      targetPath: "/obj/MyKind.ts",
    });
    render(<ComposerView />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(scaffoldMock).not.toHaveBeenCalled();
  });
});
