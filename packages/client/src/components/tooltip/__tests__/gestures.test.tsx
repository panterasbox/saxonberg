/**
 * ⭐ Touch and keyboard (tooltips D8, W6): a long press on a link opens its
 * tooltip as a bottom sheet and NOT the row's line menu; a long press on
 * the row elsewhere still opens the menu; a term in the sheet pushes; a
 * link is reachable by keyboard and Enter runs it.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { useLongPress } from "../../social/useLongPress";
import { MmlRenderer } from "../../MmlRenderer";
import { TooltipLayer } from "../TooltipLayer";
import * as source from "../../../services/tooltipSource";

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

function Row({ onMenu, onClick }: { onMenu: () => void; onClick: (c: string) => void }) {
  const press = useLongPress(onMenu);
  return (
    <div data-testid="row" {...press}>
      before{" "}
      <MmlRenderer
        text={'<link href="mudcmd:look lamp">the lamp</link> and <link href="mudcmd:help light">light</link>'}
        onCommandClick={onClick}
        onCommandPreview={() => {}}
      />
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ tipStack: [] });
  vi.spyOn(source, "termTip").mockImplementation((cmd: string) =>
    cmd.startsWith("help ")
      ? { key: `help:${cmd}`, doc: { header: { name: "light", kindWord: "help" }, prose: 'Light. See <link href="mudcmd:help lamp">lamps</link>.' } }
      : null,
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("touch", () => {
  it("a long press on a link opens its tooltip sheet, not the row's menu; the release does not also click", () => {
    const onMenu = vi.fn();
    const onClick = vi.fn();
    render(
      <>
        <Row onMenu={onMenu} onClick={onClick} />
        <TooltipLayer onCommandClick={onClick} onCommandPreview={() => {}} />
      </>,
    );
    const link = screen.getByText("light");
    fireEvent.pointerDown(link, { pointerType: "touch", clientX: 1, clientY: 1 });
    advance(500);
    expect(onMenu).not.toHaveBeenCalled();
    expect(screen.getByTestId("tip-sheet").textContent).toContain("light");
    fireEvent.pointerUp(link, { pointerType: "touch" });
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("a long press on the row elsewhere still opens the line menu", () => {
    const onMenu = vi.fn();
    render(<Row onMenu={onMenu} onClick={() => {}} />);
    fireEvent.pointerDown(screen.getByTestId("row"), { pointerType: "touch", clientX: 1, clientY: 1 });
    advance(500);
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it("a tap is untouched — it clicks", () => {
    const onClick = vi.fn();
    render(<Row onMenu={() => {}} onClick={onClick} />);
    const link = screen.getByText("the lamp");
    fireEvent.pointerDown(link, { pointerType: "touch", clientX: 1, clientY: 1 });
    advance(100);
    fireEvent.pointerUp(link, { pointerType: "touch" });
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledWith("look lamp");
    expect(screen.queryByTestId("tip-sheet")).toBeNull();
  });

  it("in the sheet a term pushes, and back walks down", () => {
    render(
      <>
        <Row onMenu={() => {}} onClick={() => {}} />
        <TooltipLayer onCommandClick={() => {}} onCommandPreview={() => {}} />
      </>,
    );
    fireEvent.pointerDown(screen.getByText("light"), { pointerType: "touch", clientX: 1, clientY: 1 });
    advance(500);
    fireEvent.click(screen.getByText("lamps"));
    expect(useStore.getState().tipStack).toHaveLength(2);
    fireEvent.click(screen.getByTestId("tip-back"));
    expect(useStore.getState().tipStack).toHaveLength(1);
  });
});

describe("keyboard", () => {
  it("a link is a focusable link: focus opens its tooltip, Enter runs it, Esc closes", () => {
    const onClick = vi.fn();
    render(
      <>
        <Row onMenu={() => {}} onClick={onClick} />
        <TooltipLayer onCommandClick={() => {}} onCommandPreview={() => {}} />
      </>,
    );
    const link = screen.getByText("light");
    expect(link.getAttribute("role")).toBe("link");
    expect(link.getAttribute("tabindex")).toBe("-1");
    act(() => link.focus());
    expect(screen.getByTestId("tooltip")).toBeTruthy();
    fireEvent.keyDown(link, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("help light");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });
});

describe("a stale grace never closes a fresh tooltip", () => {
  it("pointer off a locked tooltip, Escape, then focus another control: its tooltip stays open", async () => {
    const { Tip } = await import("../Tip");
    const { scheduleTipGrace } = await import("../useTip");
    render(
      <>
        <Tip tip={{ header: { name: "grid" } }}><button type="button">grid</button></Tip>
        <Tip tip={{ header: { name: "down" } }}><button type="button">down</button></Tip>
        <TooltipLayer onCommandClick={() => {}} onCommandPreview={() => {}} />
      </>,
    );
    act(() => void fireEvent.focus(screen.getByText("grid")));
    expect(useStore.getState().tipStack).toHaveLength(1);
    // The pointer leaves a locked stack: the grace starts.
    act(() => scheduleTipGrace());
    act(() => void fireEvent.keyDown(window, { key: "Escape" }));
    expect(useStore.getState().tipStack).toHaveLength(0);
    act(() => void fireEvent.focus(screen.getByText("down")));
    advance(1_000);
    expect(useStore.getState().tipStack).toHaveLength(1);
  });
});
