/**
 * ⭐⭐ The inspection card says exactly what `look` said, by source
 * (client-surface D1/D2, AC 6/9/10): every segment once, in order, with a
 * solid stripe for a mixin and a dotted one for a class or a `look`
 * section; identical things grouped and expandable; links by id; the
 * picture in its declared shape, never cropped.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { InspectionBody } from "../InspectionBody";
import { BACKBAR, CORPSE, PINT } from "./fixtures/inspection";

beforeEach(() => {
  useStore.setState({ affordances: {}, affordancePending: {}, affordanceUnresolvable: {} });
});

const noop = (): void => undefined;

describe("InspectionBody", () => {
  it.each([PINT, BACKBAR, CORPSE])("⭐ renders every segment once, in order ($key)", (card) => {
    render(<InspectionBody card={card} onSendCommand={noop} />);
    const rows = screen.getAllByTestId("segment");
    expect(rows).toHaveLength(card.segments!.length);
    card.segments!.forEach((seg, i) => {
      expect(rows[i]!.getAttribute("data-shape")).toBe(seg.shape);
      if (seg.shape !== "list") expect(rows[i]!.textContent).toContain(seg.text);
    });
  });

  it("a state line drops the terminal's `──` divider — the card's row parts it already", () => {
    const tablet = {
      ...PINT,
      segments: [
        { shape: "state" as const, sources: [{ kind: "look" as const, name: "Screen" }], text: "── The screen is dark." },
      ],
    };
    render(<InspectionBody card={tablet} onSendCommand={noop} />);
    const row = screen.getByTestId("segment");
    expect(row.textContent).toContain("The screen is dark.");
    expect(row.textContent).not.toContain("──");
  });

  it("⭐ the gutter says who said it: solid for a mixin, dotted for a class", () => {
    render(<InspectionBody card={PINT} onSendCommand={noop} />);
    const stripes = screen.getAllByTestId("segment-stripe");
    const bySource = Object.fromEntries(
      stripes.map((s) => [s.getAttribute("data-source"), s.getAttribute("data-stripe-kind")]),
    );
    expect(bySource["Bulkable"]).toBe("solid");
    expect(bySource["CraftVessel"]).toBe("dotted");
  });

  it("⭐ a group of identical things expands in place; a chip sends `look #<id>` (AC 9)", () => {
    const sent: string[] = [];
    render(<InspectionBody card={BACKBAR} onSendCommand={(t) => sent.push(t)} />);
    expect(screen.queryAllByTestId("segment-chip").map((c) => c.textContent)).toEqual(["a bar spoon"]);
    fireEvent.click(screen.getByTestId("segment-group"));
    expect(screen.getAllByTestId("segment-chip")).toHaveLength(15);
    fireEvent.click(screen.getAllByTestId("segment-chip")[0]!);
    expect(sent).toEqual(["look #gin-1"]);
  });

  it("⭐ the picture keeps its declared shape and is never cropped (AC 10)", () => {
    const { rerender } = render(<InspectionBody card={BACKBAR} onSendCommand={noop} />);
    expect(screen.getByTestId("illustration-plate").getAttribute("data-shape")).toBe("wide");
    rerender(<InspectionBody card={PINT} onSendCommand={noop} />);
    expect(screen.getByTestId("illustration-plate").getAttribute("data-shape")).toBe("square");
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("");
    expect(css).not.toMatch(/object-fit:\s*cover/);
  });

  it("cut to fit, the picture collapses first", () => {
    render(<InspectionBody card={PINT} cut onSendCommand={noop} />);
    expect(screen.queryByTestId("illustration-plate")).toBeNull();
    fireEvent.click(screen.getByTestId("image-collapsed"));
    expect(screen.getByTestId("illustration-plate")).toBeTruthy();
  });

  it("⭐ the quiet row counts every interface that said nothing — last on the card; actions send the server's command", () => {
    useStore.setState({
      affordances: {
        "pint-1": {
          composition: ["VisibleMixin", "BulkableMixin", "TangibleMixin", "PerceptibleMixin", "ThermalMixin"],
          verbs: [
            { verb: "drink", source: "subject", state: "enabled", command: "drink pint" },
            { verb: "look", source: "actor", state: "enabled", command: "look pint" },
          ],
        } as never,
      },
    });
    const sent: string[] = [];
    render(<InspectionBody card={PINT} onSendCommand={(t) => sent.push(t)} />);
    // Visible and Bulkable spoke; Tangible, Perceptible and Thermal said
    // nothing — Perceptible is no exception any more.
    expect(screen.getByTestId("quiet-toggle").textContent).toMatch(/^3 quiet interfaces/);
    expect(screen.getByText("Actions")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("drink pint"));
    expect(sent).toEqual(["drink pint"]);
    // The quiet row is the last thing on the card.
    const body = screen.getByTestId("inspection-body");
    expect(body.lastElementChild?.getAttribute("data-testid")).toBe("quiet-row");
  });

  it("with `cockpit style links ids`, a click names its target by id", () => {
    useStore.setState({
      clientState: { "style.overlay": { links: "ids" } },
      affordances: {
        "pint-1": {
          composition: [],
          verbs: [{ verb: "drink", source: "subject", state: "enabled", command: "drink pint" }],
        } as never,
      },
    });
    const sent: string[] = [];
    render(<InspectionBody card={PINT} onSendCommand={(t) => sent.push(t)} />);
    fireEvent.click(screen.getByLabelText("drink #pint-1"));
    expect(sent).toEqual(["drink #pint-1"]);
    useStore.setState({ clientState: {} });
  });
});
