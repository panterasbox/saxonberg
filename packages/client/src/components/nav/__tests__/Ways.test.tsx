/**
 * Ways — every state from `NavWay` fixtures (navigation card D6). The
 * state is the server's: the arm reads `state` and `take`, nothing else.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { NavWay } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { Ways, wayLook } from "../Ways";

const way = (direction: string, extra: Partial<NavWay> = {}): NavWay => ({
  direction,
  state: "open",
  crossesZone: false,
  ...extra,
});

describe("wayLook — first match wins", () => {
  it.each([
    [way("west", { state: "window" }), "window"],
    [way("north", { state: "locked" }), "locked"],
    [way("east", { state: "shut" }), "shut"],
    [way("down", { take: { ok: false, gate: "exitMode", reason: "climb", works: { mode: "climb", command: "climb down" } } }), "mode"],
    [way("east", { take: { ok: false, gate: "clearance", reason: "too low" } }), "refuses"],
    [way("south", { take: { ok: true, unseen: true } }), "unseen"],
    [way("south", { take: { ok: true } }), "open"],
  ] as const)("%o → %s", (w, look) => {
    expect(wayLook(w)).toBe(look);
  });
});

describe("Ways", () => {
  beforeEach(() => useStore.setState({ radial: null } as never));

  it("ten arms always; a missing one is dim; a named way is listed by its own word", () => {
    render(
      <Ways
        ways={[way("north"), way("pumphouse", { state: "locked", crossesZone: true })]}
        onSendCommand={() => {}}
      />,
    );
    for (const d of ["northwest", "northeast", "west", "east", "southwest", "south", "southeast", "up", "down"]) {
      expect(screen.getByTestId(`nav-arm-${d}`).getAttribute("data-state")).toBe("none");
    }
    expect(screen.getByTestId("nav-exit-north").getAttribute("data-state")).toBe("open");
    const named = screen.getByTestId("nav-exit-pumphouse");
    expect(named.textContent).toContain("pumphouse");
    expect(named.getAttribute("data-state")).toBe("locked");
    expect(named.getAttribute("data-leaves")).toBe("true");
  });

  it("a click sends `go <direction>` whatever the state; a window is inert", () => {
    const send = vi.fn();
    render(
      <Ways
        ways={[
          way("east", { take: { ok: false, gate: "clearance", reason: "The doorway is too low for you standing." } }),
          way("west", { state: "window" }),
        ]}
        onSendCommand={send}
      />,
    );
    fireEvent.click(screen.getByTestId("nav-exit-east"));
    expect(send).toHaveBeenCalledWith("go east");
    expect((screen.getByTestId("nav-exit-west") as HTMLButtonElement).disabled).toBe(true);
  });

  it("a named way is a row that says where it goes; there is no instruction strip", () => {
    render(
      <Ways
        ways={[way("pumphouse", { boundary: { stuffId: "d1", name: "the pump-house door" }, state: "locked" })]}
        leadsTo={() => "the pump house"}
        onSendCommand={() => {}}
      />,
    );
    expect(screen.getByTestId("nav-exit-pumphouse").textContent).toMatch(/pumphouse.*the pump house/);
    expect(screen.queryByTestId("nav-preview")).toBeNull();
  });

  it("a way with a door opens the door's menu on right-click; one without has none", () => {
    const openRadial = vi.fn();
    useStore.setState({ openRadial } as never);
    render(
      <Ways
        ways={[way("north", { boundary: { stuffId: "d1", name: "the oak door" }, state: "shut" }), way("south")]}
        onSendCommand={() => {}}
      />,
    );
    fireEvent.contextMenu(screen.getByTestId("nav-exit-north"));
    expect(openRadial).toHaveBeenCalledWith({ stuffId: "d1", displayName: "the oak door" });
    openRadial.mockClear();
    fireEvent.contextMenu(screen.getByTestId("nav-exit-south"));
    expect(openRadial).not.toHaveBeenCalled();
  });
});
