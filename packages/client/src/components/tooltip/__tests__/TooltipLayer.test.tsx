/**
 * The tooltip's behavior (tooltips W1, D8): open after a dwell, lock,
 * nest, walk back, close — and never be a card.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { TooltipDoc } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { TooltipLayer } from "../TooltipLayer";
import { Tip } from "../Tip";
import { TIP_LOCK_MS, TIP_OPEN_MS, TIP_GRACE_MS } from "../useTip";
import { controlDoc } from "../../doc/docs";

const sent: string[] = [];

function Harness({
  doc,
  onPreview,
}: {
  doc: TooltipDoc;
  onPreview?: (c: string | null) => void;
}) {
  return (
    <>
      <Tip tip={doc}>
        <button data-testid="anchor" onMouseEnter={() => onPreview?.("look lamp")}>
          lamp
        </button>
      </Tip>
      <button data-testid="elsewhere">elsewhere</button>
      <TooltipLayer onCommandClick={(c) => sent.push(c)} onCommandPreview={() => {}} />
    </>
  );
}

const thing: TooltipDoc = {
  header: { name: "brass lamp", kind: "thing", kindWord: "thing" },
  prose: 'A lamp. See <link href="mudcmd:help light">light</link>.',
  command: "look lamp",
  pin: "look lamp",
};

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  sent.length = 0;
  useStore.setState({ tipStack: [] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("TooltipLayer", () => {
  it("opens after the dwell, not before", () => {
    render(<Harness doc={thing} />);
    fireEvent.mouseEnter(screen.getByTestId("anchor"));
    advance(TIP_OPEN_MS - 10);
    expect(screen.queryByTestId("tooltip")).toBeNull();
    advance(20);
    expect(screen.getByTestId("tooltip").textContent).toContain("brass lamp");
  });

  it("closes on leaving the anchor before it locks", () => {
    render(<Harness doc={thing} />);
    const a = screen.getByTestId("anchor");
    fireEvent.mouseEnter(a);
    advance(TIP_OPEN_MS + 10);
    fireEvent.mouseLeave(a);
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });

  it("locks after the dwell and on Shift; a locked one survives leaving briefly", () => {
    render(<Harness doc={thing} />);
    const a = screen.getByTestId("anchor");
    fireEvent.mouseEnter(a);
    advance(TIP_OPEN_MS + 10);
    expect(screen.getByTestId("tooltip").getAttribute("data-locked")).toBe("false");
    fireEvent.keyDown(window, { key: "Shift" });
    expect(screen.getByTestId("tooltip").getAttribute("data-locked")).toBe("true");
    fireEvent.mouseLeave(a);
    advance(TIP_GRACE_MS - 50);
    expect(screen.queryByTestId("tooltip")).not.toBeNull();
    fireEvent.mouseEnter(screen.getByTestId("tooltip"));
    advance(TIP_GRACE_MS * 2);
    expect(screen.queryByTestId("tooltip")).not.toBeNull();
  });

  it("locks by itself after the lock dwell", () => {
    render(<Harness doc={thing} />);
    fireEvent.mouseEnter(screen.getByTestId("anchor"));
    advance(TIP_OPEN_MS + 10);
    advance(TIP_LOCK_MS + 10);
    expect(screen.getByTestId("tooltip").getAttribute("data-locked")).toBe("true");
  });

  it("a locked stack closes when the pointer stays out", () => {
    render(<Harness doc={thing} />);
    const a = screen.getByTestId("anchor");
    fireEvent.mouseEnter(a);
    advance(TIP_OPEN_MS + 10);
    advance(TIP_LOCK_MS + 10);
    expect(screen.getByTestId("tooltip").getAttribute("data-locked")).toBe("true");
    fireEvent.mouseLeave(a);
    expect(screen.queryByTestId("tooltip")).not.toBeNull();
    advance(TIP_GRACE_MS + 10);
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });

  it("nests: a link inside opens a child, the child shows a breadcrumb, Esc walks back one level", () => {
    render(<Harness doc={thing} />);
    fireEvent.mouseEnter(screen.getByTestId("anchor"));
    advance(TIP_OPEN_MS + 10);
    advance(TIP_LOCK_MS + 10);
    // Open a child by hand at depth 1 — the term source arrives in W5;
    // any anchor inside a tooltip opens at depth n+1.
    const inner = screen.getByTestId("tooltip");
    act(() => {
      useStore.getState().openTip(1, inner, "light", { header: { name: "light", kindWord: "help" } });
      useStore.getState().lockTips();
    });
    const tips = screen.getAllByTestId("tooltip");
    expect(tips).toHaveLength(2);
    expect(screen.getByTestId("tip-crumbs").textContent).toContain("brass lamp");
    expect(screen.getByTestId("tip-crumbs").textContent).toContain("light");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getAllByTestId("tooltip")).toHaveLength(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });

  it("a press outside closes them all", () => {
    render(<Harness doc={thing} />);
    fireEvent.mouseEnter(screen.getByTestId("anchor"));
    advance(TIP_OPEN_MS + 10);
    advance(TIP_LOCK_MS + 10);
    fireEvent.pointerDown(screen.getByTestId("elsewhere"));
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });

  it("keyboard focus opens it at once, locked", () => {
    render(<Harness doc={thing} />);
    fireEvent.focus(screen.getByTestId("anchor"));
    expect(screen.getByTestId("tooltip").getAttribute("data-locked")).toBe("true");
  });

  it("pin runs the card's command and closes; a control's tooltip has no pin", () => {
    const { unmount } = render(<Harness doc={thing} />);
    fireEvent.focus(screen.getByTestId("anchor"));
    fireEvent.click(screen.getByTestId("tip-pin"));
    expect(sent).toEqual(["look lamp"]);
    expect(screen.queryByTestId("tooltip")).toBeNull();
    unmount();
    render(<Harness doc={controlDoc("Close", "client-card close 3")} />);
    fireEvent.focus(screen.getByTestId("anchor"));
    expect(screen.getByTestId("tooltip").textContent).toContain("client-card close 3");
    expect(screen.queryByTestId("tip-pin")).toBeNull();
  });

  it("has no card controls — nothing docks, minimizes or keeps it live", () => {
    render(<Harness doc={thing} />);
    fireEvent.focus(screen.getByTestId("anchor"));
    const tip = screen.getByTestId("tooltip");
    for (const id of ["card-grow", "card-shrink", "card-close", "card-popout", "card-refresh"]) {
      expect(tip.querySelector(`[data-testid="${id}"]`)).toBeNull();
    }
    const buttons = Array.from(tip.querySelectorAll("button")).map((b) => b.getAttribute("data-testid"));
    expect(buttons.every((b) => b === "tip-pin" || b === null)).toBe(true);
  });

  it("an open tooltip is a snapshot: a second resolve does not change it", () => {
    render(<TooltipLayer onCommandClick={() => {}} onCommandPreview={() => {}} />);
    const anchor = document.createElement("span");
    document.body.appendChild(anchor);
    let id = 0;
    act(() => {
      id = useStore.getState().openTip(0, anchor, "k", null);
    });
    expect(screen.getByTestId("tip-loading")).toBeTruthy();
    act(() => useStore.getState().resolveTip(id, { header: { name: "first" } }));
    act(() => useStore.getState().resolveTip(id, { header: { name: "second" } }));
    expect(screen.getByTestId("tooltip").textContent).toContain("first");
    expect(screen.getByTestId("tooltip").textContent).not.toContain("second");
  });

  it("hover still previews the command — the tooltip runs beside it", () => {
    const previews: (string | null)[] = [];
    render(<Harness doc={thing} onPreview={(c) => previews.push(c)} />);
    fireEvent.mouseEnter(screen.getByTestId("anchor"));
    expect(previews).toEqual(["look lamp"]);
  });
});
