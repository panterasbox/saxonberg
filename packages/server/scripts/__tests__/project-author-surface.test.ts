/**
 * Unit tests for the three-tier author-surface projection, driven by a
 * small hand-authored TypeDoc-shaped fixture model (no full doc build).
 *
 * Covers the classification rules:
 *   - Api static methods + author-facing Stuff instance methods land in
 *     consumer; fields, accessor pairs, protected methods, and
 *     constructors do not.
 *   - @hook members land in extension (with their contract text), not
 *     consumer.
 *   - signature I/O types form the type closure.
 *   - the re-export report flags a face that speaks a foreign type it
 *     doesn't re-export, and stays silent when the type is local or
 *     re-exported.
 */

import { describe, it, expect } from "vitest";
import {
  projectAuthorSurface,
  type Refl,
} from "../project-author-surface";

const Kind = {
  Module: 2,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  Accessor: 262144,
  TypeAlias: 2097152,
  Reference: 4194304,
};

function method(
  name: string,
  flags: Refl["flags"],
  opts: {
    returnTypeId?: number;
    returnTypeName?: string;
    paramTypeId?: number;
    paramTypeName?: string;
    hook?: string;
  } = {}
): Refl {
  const sig: Refl = { name, kind: 4096 };
  if (opts.returnTypeId) {
    sig.type = { type: "reference", target: opts.returnTypeId, name: opts.returnTypeName };
  }
  if (opts.paramTypeId) {
    sig.parameters = [
      {
        name: "arg",
        kind: 32768,
        type: { type: "reference", target: opts.paramTypeId, name: opts.paramTypeName },
      },
    ];
  }
  const m: Refl = { name, kind: Kind.Method, flags, signatures: [sig] };
  if (opts.hook) {
    m.comment = { blockTags: [{ tag: "@hook", content: [{ kind: "text", text: opts.hook }] }] };
  }
  return m;
}

// id 100 FooResult (interface, defined in mud/api/foo — local to the face)
// id 200 BarSpec   (type alias, defined in mud/lib/bar — foreign to faces)
const FIXTURE: Refl = {
  name: "PROJECT",
  kind: 1,
  children: [
    {
      name: "mud/api/foo",
      kind: Kind.Module,
      children: [
        {
          name: "FooApi",
          kind: Kind.Class,
          children: [
            { name: "constructor", kind: Kind.Constructor },
            method("doThing", { isStatic: true }, {
              returnTypeId: 100,
              returnTypeName: "FooResult",
              paramTypeId: 200,
              paramTypeName: "BarSpec",
            }),
          ],
        },
        { id: 100, name: "FooResult", kind: Kind.Interface, variant: "declaration" },
      ],
    },
    {
      name: "mud/lib/bar",
      kind: Kind.Module,
      children: [
        { id: 200, name: "BarSpec", kind: Kind.TypeAlias, variant: "declaration" },
      ],
    },
    {
      name: "mud/lib/widget",
      kind: Kind.Module,
      children: [
        {
          name: "Widget",
          kind: Kind.Class,
          children: [
            method("poke", { isStatic: false }),
            { name: "size", kind: Kind.Property, flags: {} },
            { name: "label", kind: Kind.Accessor, flags: {} },
            method("helper", { isProtected: true }),
            method("onDestruct", { isStatic: false }, {
              hook: "Invoked by StuffApi.destruct. Call super.onDestruct(). Witness.",
            }),
          ],
        },
      ],
    },
    {
      // A face that DOES re-export the foreign type it speaks.
      name: "mud/api/baz",
      kind: Kind.Module,
      children: [
        {
          name: "BazApi",
          kind: Kind.Class,
          children: [
            method("fetch", { isStatic: true }, { paramTypeId: 200, paramTypeName: "BarSpec" }),
          ],
        },
        { name: "BarSpec", kind: Kind.TypeAlias, variant: "reference" },
      ],
    },
  ],
};

describe("projectAuthorSurface", () => {
  const { surface, reexportReport } = projectAuthorSurface(FIXTURE);
  const consumerNames = surface.consumer.map((c) => c.qualified);
  const extensionNames = surface.extension.map((e) => e.qualified);
  const typeNames = surface.types.map((t) => t.name);

  it("puts Api static methods in consumer", () => {
    expect(consumerNames).toContain("mud/api/foo#FooApi.doThing");
    const m = surface.consumer.find((c) => c.name === "doThing");
    expect(m?.kind).toBe("api-static");
  });

  it("puts author-facing Stuff instance methods in consumer", () => {
    expect(consumerNames).toContain("mud/lib/widget#Widget.poke");
    const m = surface.consumer.find((c) => c.name === "poke");
    expect(m?.kind).toBe("stuff-method");
  });

  it("excludes constructors, fields, accessors, and protected methods from consumer", () => {
    expect(consumerNames).not.toContain("mud/api/foo#FooApi.constructor");
    expect(consumerNames.some((n) => n.endsWith(".size"))).toBe(false);
    expect(consumerNames.some((n) => n.endsWith(".label"))).toBe(false);
    expect(consumerNames.some((n) => n.endsWith(".helper"))).toBe(false);
  });

  it("routes @hook members to extension (not consumer), with contract text", () => {
    expect(extensionNames).toContain("mud/lib/widget#Widget.onDestruct");
    expect(consumerNames).not.toContain("mud/lib/widget#Widget.onDestruct");
    const hook = surface.extension.find((e) => e.name === "onDestruct");
    expect(hook?.contract).toMatch(/super\.onDestruct\(\)/);
  });

  it("forms the type closure from signature I/O types", () => {
    expect(typeNames).toContain("FooResult"); // return type
    expect(typeNames).toContain("BarSpec"); // param type
  });

  it("flags a face that speaks a foreign type it doesn't re-export", () => {
    const fooIssue = reexportReport.find(
      (r) => r.face === "mud/api/foo" && r.type === "BarSpec"
    );
    expect(fooIssue).toBeDefined();
    expect(fooIssue?.definedIn).toBe("mud/lib/bar");
  });

  it("does not flag a locally-defined type", () => {
    // FooResult is defined in mud/api/foo, the same face that speaks it.
    expect(
      reexportReport.some((r) => r.face === "mud/api/foo" && r.type === "FooResult")
    ).toBe(false);
  });

  it("does not flag a face that re-exports the foreign type", () => {
    // mud/api/baz speaks BarSpec but has a re-export child for it.
    expect(
      reexportReport.some((r) => r.face === "mud/api/baz" && r.type === "BarSpec")
    ).toBe(false);
  });
});
