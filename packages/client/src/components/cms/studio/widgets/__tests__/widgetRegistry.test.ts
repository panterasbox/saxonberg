/**
 * Widget-registry selection tests — each descriptor shape routes to the
 * expected widget kind, following the fixed lookup order
 * (`refShape` → `enumValues` → `typeShape` prefix/exact → raw fallback);
 * an unknown shape falls back to the raw-JSON widget. Maps req
 * Acceptance #3 (widget selection).
 */

import { describe, expect, it } from "vitest";
import type { StudioFieldDescriptor } from "@saxonberg/types";
import {
  RawJsonWidget,
  resolveWidgetKind,
  widgetFor,
  widgetRegistry,
} from "../index";

function descriptor(
  over: Partial<StudioFieldDescriptor>,
): StudioFieldDescriptor {
  return {
    name: "f",
    mixin: "SomeMixin",
    kind: "property",
    typeShape: "string",
    valueSource: "class-default",
    ...over,
  };
}

describe("resolveWidgetKind", () => {
  it("string → text", () => {
    expect(resolveWidgetKind(descriptor({ typeShape: "string" }))).toBe(
      "text",
    );
  });

  it("number → number", () => {
    expect(resolveWidgetKind(descriptor({ typeShape: "number" }))).toBe(
      "number",
    );
  });

  it("boolean → boolean", () => {
    expect(resolveWidgetKind(descriptor({ typeShape: "boolean" }))).toBe(
      "boolean",
    );
  });

  it("Quantity<Mass> → quantity (prefix match)", () => {
    expect(
      resolveWidgetKind(descriptor({ typeShape: "Quantity<Mass>" })),
    ).toBe("quantity");
  });

  it("enumValues → enum", () => {
    expect(
      resolveWidgetKind(
        descriptor({ typeShape: "string", enumValues: ["a", "b"] }),
      ),
    ).toBe("enum");
  });

  it("refShape → reference (highest priority)", () => {
    expect(
      resolveWidgetKind(
        descriptor({
          typeShape: "string",
          refShape: "path",
          refType: "Material",
          // enumValues present too — refShape still wins the order.
          enumValues: ["x"],
        }),
      ),
    ).toBe("reference");
  });

  it("unknown typeShape → raw fallback", () => {
    expect(
      resolveWidgetKind(descriptor({ typeShape: "Map<string, Detail>" })),
    ).toBe("raw");
  });

  it("json typeShape → raw fallback", () => {
    expect(resolveWidgetKind(descriptor({ typeShape: "json" }))).toBe("raw");
  });
});

describe("widgetFor / registry", () => {
  it("maps an unknown shape to the RawJsonWidget component", () => {
    expect(widgetFor(descriptor({ typeShape: "weird" }))).toBe(RawJsonWidget);
  });

  it("registry has a component for every kind", () => {
    for (const kind of [
      "reference",
      "enum",
      "quantity",
      "text",
      "number",
      "boolean",
      "raw",
    ] as const) {
      expect(typeof widgetRegistry[kind]).toBe("function");
    }
  });
});
