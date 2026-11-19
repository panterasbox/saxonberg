/**
 * ⭐⭐ A live surface says WHAT CHANGED IT (navigation-server review): the
 * delta's `causes` are the command ids the transcript's lines carry, so the
 * change is tied to a line the player already has — or, honestly, to none.
 */

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeMark, describeCause } from "../ChangeMark";
import { useStore, type Frame } from "../../../store/index";

const line = (over: Partial<Frame>): Frame =>
  ({ id: `f-${Math.random()}`, topic: "act.say", body: "", timestamp: 0, ...over }) as Frame;

describe("describeCause", () => {
  it("names the act's own line first", () => {
    const frames = [
      line({ body: "<b>Bob</b> pushes the door.", causingCommandId: "c1" }),
      line({ body: "Bob opens the oak door.", commandId: "c1" }),
    ];
    const said = describeCause(frames, ["c1"]);
    expect(said.text).toBe("Changed by: Bob opens the oak door.");
    expect(said.line?.commandId).toBe("c1");
  });

  it("falls back to a line the command's later work made", () => {
    const said = describeCause([line({ body: "The door swings shut.", causingCommandId: "c2" })], ["c2"]);
    expect(said.text).toBe("Changed by: The door swings shut.");
  });

  it("a command that sent you no line: you didn't see what changed it", () => {
    expect(describeCause([line({ body: "unrelated", commandId: "zz" })], ["c3"]).text).toBe(
      "You didn't see what changed this.",
    );
  });

  it("no command at all: time passed", () => {
    expect(describeCause([], []).text).toBe("Time passed.");
  });
});

describe("ChangeMark", () => {
  beforeEach(() => {
    useStore.setState({ surfaceChanges: {}, frames: [] } as never);
  });

  it("shows nothing until the surface changes; then a mark that says why", () => {
    render(
      <ChangeMark surface="nav:ways">
        <span>ways</span>
      </ChangeMark>,
    );
    expect(screen.queryByTestId("change-mark-nav:ways")).toBeNull();

    React.act(() => {
      useStore.setState({ frames: [line({ body: "You open the oak door.", commandId: "c9" })] } as never);
      useStore.getState().noteSurfaceChange("nav:ways", ["c9"]);
    });
    const mark = screen.getByTestId("change-mark-nav:ways");
    expect(mark.getAttribute("title")).toBe("Changed by: You open the oak door.");
    fireEvent.click(mark);
    expect(screen.getByTestId("change-why-nav:ways").textContent).toContain("show in scrollback");
  });
});
