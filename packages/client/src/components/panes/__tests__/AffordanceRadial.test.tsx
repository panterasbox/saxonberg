/**
 * The affordance radial — geometry, honesty, and the digest that was
 * cut.
 *
 * ⚠⚠ **The geometry must not reflow.** Muscle memory across objects is
 * the entire point of a radial: `look` is in the same place on an
 * anvil, a person and a door, and a menu that rearranged itself to fit
 * whatever the object afforded would have none of that value. So the
 * property asserted is not "the verbs are grouped" but *the four slots
 * are always present and always in the same places, whatever the
 * input* — which is the difference between a layout and a habit.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AffordanceEntry } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { websocketClient } from "../../../services/websocket";
import { AffordanceRadial, groupIntoSlots, slotFor } from "../AffordanceRadial";

function entry(over: Partial<AffordanceEntry>): AffordanceEntry {
  return {
    verb: "look",
    description: "look at it",
    state: "enabled",
    category: "perception",
    ...over,
  };
}

function answer(verbs: AffordanceEntry[], composition: string[] = []): void {
  useStore.getState().setAffordances({
    stuffId: "anvil",
    verbs,
    composition,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({
    affordances: {},
    affordancePending: {},
    affordanceUnresolvable: {},
    radialSubject: null,
  });
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(
    () => undefined,
  );
});

describe("⚠⚠ the fixed geometry", () => {
  it("has all four slots even when every verb is in one", () => {
    const slots = groupIntoSlots([
      entry({ verb: "look", category: "perception" }),
      entry({ verb: "search", category: "perception" }),
    ]);
    expect(Object.keys(slots).sort()).toEqual([
      "east",
      "north",
      "south",
      "west",
    ]);
    expect(slots.east).toEqual([]);
    expect(slots.west).toEqual([]);
    expect(slots.south).toEqual([]);
  });

  it("has all four slots when there are no verbs at all", () => {
    const slots = groupIntoSlots([]);
    expect(Object.keys(slots)).toHaveLength(4);
  });

  it("renders an empty quadrant rather than closing the gap", () => {
    answer([entry({ verb: "look", category: "perception" })]);
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="a cast-iron anvil"
        onSendCommand={() => undefined}
      />,
    );
    // All four are in the DOM. A radial that dropped its empty
    // quadrants would put `go` where `talk` used to be the moment an
    // object stopped affording movement.
    for (const slot of ["north", "east", "west", "south"]) {
      expect(screen.getByTestId(`radial-${slot}`)).toBeTruthy();
    }
  });

  it("⚠ an unknown category lands in `east`, never nowhere", () => {
    // Absent from the menu is the one outcome a fixed geometry must
    // never produce: a new server category would silently stop being
    // reachable.
    expect(slotFor(entry({ category: "something-new" }))).toBe("east");
  });

  it("keeps interface verbs off the radial entirely", () => {
    // A radial about an anvil offering `cockpit` or `clone` would be a
    // menu about the client wearing the mask of a menu about the world.
    expect(slotFor(entry({ verb: "cockpit", category: "shell" }))).toBeNull();
    expect(slotFor(entry({ verb: "clone", category: "author" }))).toBeNull();
  });
});

describe("the three states", () => {
  it("dims a disabled verb and prints the validator's OWN words", () => {
    answer([
      entry({
        verb: "get",
        category: "inventory",
        state: "disabled",
        reason: "54.4 kg — too heavy to lift",
      }),
    ]);
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="a cast-iron anvil"
        onSendCommand={() => undefined}
      />,
    );

    // ⭐ Verbatim. A validator's return value is exactly what the player
    // would have been shown had they typed the verb, so re-wording here
    // would be inventing a second, driftable copy of every refusal.
    expect(screen.getByText("54.4 kg — too heavy to lift")).toBeTruthy();
    const button = screen.getByText("get").closest("button")!;
    expect(button.getAttribute("data-state")).toBe("disabled");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("names the field a pending-operand verb still needs", () => {
    answer([
      entry({
        verb: "put",
        category: "inventory",
        state: "pending-operand",
        operand: "target",
      }),
    ]);
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="a cast-iron anvil"
        onSendCommand={() => undefined}
      />,
    );
    // `put` passes every check a menu can evaluate but still needs a
    // container the menu cannot know. Reporting it plainly enabled would
    // promise a click that then stalls on a prompt.
    expect(screen.getByText("needs target")).toBeTruthy();
  });

  it("sends the verb aimed at the subject, and previews it first", () => {
    answer([entry({ verb: "look", category: "perception" })]);
    const sent: string[] = [];
    const previews: (string | null)[] = [];
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="anvil"
        onSendCommand={(t) => sent.push(t)}
        onCommandPreview={(c) => previews.push(c)}
      />,
    );
    const button = screen.getByText("look").closest("button")!;
    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    expect(previews[0]).toBe("look anvil");
    expect(sent).toEqual(["look anvil"]);
  });
});

describe("the composition", () => {
  it("counts what the RESOLVER said, not what a frame carried", () => {
    // ⚠⚠ The art's `<thing mx="Tangible,Thermal,…">` digest was cut:
    // composition unions augments, implants, innates and on-shift
    // conferral, so a digest in scrollback goes stale exactly as a verb
    // list would. This reads the resolver's answer instead.
    answer([entry({})], ["Tangible", "Thermal", "Tool", "Durable"]);
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="anvil"
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.getByTestId("radial-composition-count").textContent).toBe(
      "4 mixins",
    );
  });

  it("says `0 mixins` for an unidentified thing rather than hiding", () => {
    // An unidentified thing tells you nothing about ITSELF, and the
    // resolver returns an empty composition rather than a redacted one.
    // Zero is the honest answer, not a missing element.
    answer([entry({})], []);
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="a heavy shape"
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.getByTestId("radial-composition-count").textContent).toBe(
      "0 mixins",
    );
  });
});

describe("the cold and refused paths", () => {
  it("states the wait rather than painting an empty menu", () => {
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="anvil"
        onSendCommand={() => undefined}
      />,
    );
    // A menu that rendered empty and then filled in would read as
    // "nothing to do here" for one frame — a confident wrong answer.
    expect(screen.getByTestId("radial-waiting")).toBeTruthy();
  });

  it("gives ONE answer for unresolvable, because the server does", () => {
    useStore.getState().setAffordanceUnresolvable("anvil");
    render(
      <AffordanceRadial
        stuffId="anvil"
        displayName="anvil"
        onSendCommand={() => undefined}
      />,
    );
    // "No such object" and "you may not see that object" are the same
    // answer; distinguishing them would map what is hidden nearby.
    expect(screen.getByTestId("radial-unresolvable")).toBeTruthy();
  });
});
