/**
 * ⭐ The shared blocks (tooltips D2, D6): what a thing's tooltip and its
 * card SAY is one builder and one set of blocks, and the path is one
 * spoiler block that opens by appetite.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { DocView, FactRows, SpoilerBlock } from "../blocks";
import { CANT_SEE, PATH_LABEL, termOf, thingDoc } from "../docs";

const lamp = {
  displayName: "a brass lamp",
  kind: "thing" as const,
  quantity: 3,
  shortDescription: "A battered brass lamp.",
  illustration: "lamp.png",
  path: { path: "/stuff/thing/lamp", spoiler: 2 as const },
};

function setAppetite(n: number | undefined): void {
  useStore.setState({ clientState: n === undefined ? {} : { "spoiler.appetite": n } });
}

beforeEach(() => setAppetite(undefined));

describe("thingDoc", () => {
  it("lit: header, prose, image, the count as a seen fact, the path as a level-2 spoiler, the look as command and pin", () => {
    const doc = thingDoc(lamp, { command: "look lamp", at: 1000 });
    expect(doc.header).toEqual({ name: "a brass lamp", kind: "thing", kindWord: "thing" });
    expect(doc.prose).toBe("A battered brass lamp.");
    expect(doc.image?.key).toBe("lamp.png");
    expect(doc.facts).toEqual([{ label: "how many", value: "3", source: "seen", at: 1000 }]);
    expect(doc.spoilers).toEqual([{ level: 2, label: PATH_LABEL, text: "/stuff/thing/lamp" }]);
    expect(doc.command).toBe("look lamp");
    expect(doc.pin).toBe("look lamp");
  });

  it("dark: what the server sent and the dark line — nothing sight would tell", () => {
    const doc = thingDoc({ displayName: "something", kind: "thing" }, { dark: true });
    expect(doc.miss).toBe("Too dark to make out.");
    expect(doc.prose).toBeUndefined();
    expect(doc.image).toBeUndefined();
    expect(doc.spoilers).toBeUndefined();
  });

  it("says no fact the record lacks", () => {
    const doc = thingDoc({ displayName: "a pebble" });
    expect(doc.facts).toBeUndefined();
    expect(doc.spoilers).toBeUndefined();
    expect(doc.pin).toBeUndefined();
  });

  it("the miss line is a document too", () => {
    render(<DocView doc={{ miss: CANT_SEE }} onCommandClick={() => {}} onCommandPreview={() => {}} />);
    expect(screen.getByTestId("doc-miss").textContent).toBe(CANT_SEE);
  });
});

describe("the path spoiler", () => {
  const sp = { level: 2 as const, label: PATH_LABEL, text: "/stuff/thing/lamp" };

  it.each([
    [undefined, false],
    [0, false],
    [1, false],
    [2, true],
    [3, true],
  ])("appetite %s → open %s", (appetite, open) => {
    setAppetite(appetite);
    render(<SpoilerBlock spoiler={sp} />);
    expect(screen.getByTestId("doc-spoiler").getAttribute("data-open")).toBe(String(open));
  });

  it("one click opens it", () => {
    render(<SpoilerBlock spoiler={sp} />);
    fireEvent.click(screen.getByTestId("doc-spoiler"));
    expect(screen.getByTestId("doc-spoiler").textContent).toContain("/stuff/thing/lamp");
  });
});

describe("two containers, one content", () => {
  it("the card's facts and spoiler are the tooltip's, markup for markup", () => {
    const doc = thingDoc(lamp, { command: "look lamp", at: 1000 });
    const inTooltip = render(<DocView doc={doc} onCommandClick={() => {}} onCommandPreview={() => {}} />);
    const tipFacts = inTooltip.getByTestId("doc-facts").outerHTML;
    const tipSpoiler = inTooltip.getByTestId("doc-spoiler").outerHTML;
    inTooltip.unmount();
    const onCard = render(
      <>
        <FactRows facts={doc.facts!} />
        <SpoilerBlock spoiler={doc.spoilers![0]!} />
      </>,
    );
    expect(onCard.getByTestId("doc-facts").outerHTML).toBe(tipFacts);
    expect(onCard.getByTestId("doc-spoiler").outerHTML).toBe(tipSpoiler);
  });
});

describe("termOf — what a term is", () => {
  it("a link that opens a help or wiki card is a term; nothing else is", () => {
    expect(termOf("help light")).toEqual({ kind: "help", word: "light" });
    expect(termOf("wiki main:oak")).toEqual({ kind: "wiki", ref: "main:oak" });
    expect(termOf("look lamp")).toBeNull();
    expect(termOf("helper")).toBeNull();
    // ⭐ A red link (a page not written yet) runs `wiki create` — a command,
    // not a term (found by the walk).
    expect(termOf("wiki create Mineral")).toBeNull();
    expect(termOf("wiki read main:oak")).toEqual({ kind: "wiki", ref: "main:oak" });
    expect(termOf("help verb look")).toEqual({ kind: "help", word: "look" });
    expect(termOf("help search oak")).toBeNull();
  });
});
