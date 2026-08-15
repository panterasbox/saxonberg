/**
 * The phone's emote sheet sends DIRECTLY.
 *
 * ⭐⭐ The command sheet exists to insert a naming moment a phone
 * otherwise lacks: desktop hover asks *what would this send?*, a tap has
 * no such moment, so every affordance gets a sheet naming its command —
 * deliberately, with no obvious-case exception.
 *
 * **The emote sheet is already that moment.** It prints the verbatim
 * command above its own send control. Routing it through the command
 * sheet adds no pedagogical dividend and asks the same question twice —
 * found by driving, where reacting on a phone cost a hold plus three
 * taps and showed `react --msg 22 agree` on two consecutive sheets.
 *
 * So this is the one exception, and this test is what keeps it narrow:
 * a surface that has ALREADY named its command skips the surface whose
 * only job is naming it.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EmoteCatalogueEntry } from "@saxonberg/types";
import { useStore } from "../../../store";
import { EmoteSheet } from "../EmoteSheet";

const NOD: EmoteCatalogueEntry = {
  verb: "nod",
  emoji: "\u{1F642}",
  aliases: [],
  tags: [],
  slots: [],
};

function mount(onSend: (c: string) => void, onClose = vi.fn()) {
  useStore.setState({ emoteCatalogue: new Map([["nod", NOD]]) });
  return render(
    <EmoteSheet frameId={22} mine={[]} onSend={onSend} onClose={onClose} />,
  );
}

describe("the emote sheet's send", () => {
  it("names the command before committing it", () => {
    mount(vi.fn());
    // The naming moment lives HERE — which is the whole reason the
    // second one is redundant.
    expect(screen.getByTestId("emote-picker")).toBeTruthy();
  });

  it("⭐ hands the command to its `onSend`, which is the DIRECT path", () => {
    const onSend = vi.fn();
    mount(onSend);
    fireEvent.click(document.querySelector('[data-emote="nod"]')!);
    expect(onSend).toHaveBeenCalledWith("react --msg 22 nod");
  });

  it("closes itself on send — it does not hand off to another sheet", () => {
    const onClose = vi.fn();
    mount(vi.fn(), onClose);
    fireEvent.click(document.querySelector('[data-emote="nod"]')!);
    expect(onClose).toHaveBeenCalled();
  });

  it("⚠ never opens the command sheet", () => {
    // The store slice the command sheet reads. If the emote sheet ever
    // routes through `handleCommandClick` again, this fills.
    useStore.setState({ commandSheet: null });
    mount(vi.fn());
    fireEvent.click(document.querySelector('[data-emote="nod"]')!);
    expect(useStore.getState().commandSheet).toBeNull();
  });

  it("dismisses on the scrim, not only on its close control", () => {
    // A sheet you can only escape by finding its ✕ is the one that gets
    // used by accident.
    const onClose = vi.fn();
    mount(vi.fn(), onClose);
    fireEvent.click(screen.getByTestId("emote-sheet-scrim"));
    expect(onClose).toHaveBeenCalled();
  });
});
