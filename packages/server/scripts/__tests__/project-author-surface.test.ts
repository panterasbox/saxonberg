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
  projectAuthorableFields,
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
            // Canonical hook: @hook + a known hook name.
            method("onDestruct", { isStatic: false }, {
              hook: "Invoked by StuffApi.destruct. Call super.onDestruct(). Witness.",
            }),
            // Known hook name, NO @hook tag → extension by name.
            method("postRegister", { isStatic: false }),
          ],
        },
        {
          name: "SubWidget",
          kind: Kind.Class,
          children: [
            // Inherited copy (not new surface) → skipped entirely.
            { ...method("poke", { isStatic: false }), inheritedFrom: { name: "Widget.poke" } },
            // Untagged onDestruct override → extension by name, not consumer.
            method("onDestruct", { isStatic: false }),
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
  const hookNames = surface.extension.map((e) => e.name);
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

  it("routes @hook members to extension (not consumer), grouped by hook with contract text", () => {
    expect(hookNames).toContain("onDestruct");
    expect(consumerNames.some((n) => n.endsWith(".onDestruct"))).toBe(false);
    const hook = surface.extension.find((e) => e.name === "onDestruct");
    expect(hook?.contract).toMatch(/super\.onDestruct\(\)/);
    // Both the canonical and the untagged override land under the hook.
    expect(hook?.faces).toContain("mud/lib/widget#Widget.onDestruct");
    expect(hook?.faces).toContain("mud/lib/widget#SubWidget.onDestruct");
  });

  it("routes a known hook-name method with no @hook tag into extension", () => {
    expect(hookNames).toContain("postRegister");
    expect(consumerNames.some((n) => n.endsWith(".postRegister"))).toBe(false);
  });

  it("skips inheritedFrom members (no duplicate surface)", () => {
    // SubWidget.poke is an inherited copy of Widget.poke → only the
    // declaring Widget.poke appears.
    const pokes = consumerNames.filter((n) => n.endsWith(".poke"));
    expect(pokes).toEqual(["mud/lib/widget#Widget.poke"]);
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

// ── Signature renderer + TSDoc enrichment (Step 1) ──────────────────
//
// A second fixture exercising the readable-signature renderer across the
// shapes the surface speaks (generic, union, optional, rest, intersection)
// plus the TSDoc summary/param/returns/example extraction and the
// degrade-to-signature-only rule for a member with no TSDoc.

const intrinsic = (name: string): TdType => ({ type: "intrinsic", name });
const ref = (name: string, target?: number, typeArguments?: TdType[]): TdType => {
  const t: TdType = { type: "reference", name };
  if (target !== undefined) t.target = target;
  if (typeArguments) t.typeArguments = typeArguments;
  return t;
};

type TdType = {
  type?: string;
  name?: string;
  target?: number | unknown;
  elementType?: TdType;
  types?: TdType[];
  elements?: TdType[];
  typeArguments?: TdType[];
  value?: unknown;
};

/** Build a static Api method with explicit signature parts. */
function sigMethod(
  name: string,
  parameters: Refl[],
  returnType: TdType | undefined,
  comment?: Refl["comment"]
): Refl {
  const sig: Refl = { name, kind: 4096 };
  if (parameters.length > 0) sig.parameters = parameters;
  if (returnType) sig.type = returnType;
  if (comment) sig.comment = comment;
  return { name, kind: Kind.Method, flags: { isStatic: true }, signatures: [sig] };
}

const SIG_FIXTURE: Refl = {
  name: "PROJECT",
  kind: 1,
  children: [
    {
      name: "mud/api/sig",
      kind: Kind.Module,
      children: [
        {
          name: "SigApi",
          kind: Kind.Class,
          children: [
            // generic return: gen(): Property<T>
            sigMethod("gen", [], ref("Property", 300, [ref("T")])),
            // union param: uni(arg: A | B): void
            sigMethod(
              "uni",
              [
                {
                  name: "arg",
                  kind: 32768,
                  type: { type: "union", types: [ref("A"), ref("B")] },
                },
              ],
              undefined
            ),
            // optional param: opt(name?: string): void
            sigMethod(
              "opt",
              [{ name: "name", kind: 32768, flags: { isOptional: true }, type: intrinsic("string") }],
              undefined
            ),
            // rest param: restm(...args: number[]): void
            sigMethod(
              "restm",
              [
                {
                  name: "args",
                  kind: 32768,
                  flags: { isRest: true },
                  type: { type: "array", elementType: intrinsic("number") },
                },
              ],
              undefined
            ),
            // intersection param: mix(host: Stuff & Container): void
            sigMethod(
              "mix",
              [
                {
                  name: "host",
                  kind: 32768,
                  type: { type: "intersection", types: [ref("Stuff", 301), ref("Container", 302)] },
                },
              ],
              undefined
            ),
            // fully documented member.
            sigMethod(
              "documented",
              [{ name: "x", kind: 32768, type: intrinsic("number") }],
              intrinsic("boolean"),
              {
                summary: [{ kind: "text", text: "Does a documented thing." }],
                blockTags: [
                  { tag: "@param", name: "x", content: [{ kind: "text", text: "the input" }] },
                  { tag: "@returns", content: [{ kind: "text", text: "whether it worked" }] },
                  { tag: "@example", content: [{ kind: "text", text: "SigApi.documented(1)" }] },
                ],
              }
            ),
            // no TSDoc → summary '' but signature still present.
            sigMethod("bare", [], intrinsic("void")),
          ],
        },
        // Named project-types so signatureTypes resolves them.
        { id: 300, name: "Property", kind: Kind.TypeAlias, variant: "declaration" },
        { id: 301, name: "Stuff", kind: Kind.Class, variant: "declaration" },
        { id: 302, name: "Container", kind: Kind.Interface, variant: "declaration" },
      ],
    },
  ],
};

describe("projectAuthorSurface — signature renderer + TSDoc", () => {
  const { surface } = projectAuthorSurface(SIG_FIXTURE);
  const by = (name: string) => surface.consumer.find((c) => c.name === name)!;

  it("renders a generic return type", () => {
    expect(by("gen").signature).toBe("gen(): Property<T>");
  });

  it("renders a union param", () => {
    expect(by("uni").signature).toBe("uni(arg: A | B): void");
  });

  it("renders an optional param", () => {
    expect(by("opt").signature).toBe("opt(name?: string): void");
  });

  it("renders a rest param", () => {
    expect(by("restm").signature).toBe("restm(...args: number[]): void");
  });

  it("renders an intersection param (mixin-composition join)", () => {
    expect(by("mix").signature).toBe("mix(host: Stuff & Container): void");
    // signatureTypes carries the named project-types in the signature.
    expect(by("mix").signatureTypes).toEqual(["Container", "Stuff"]);
  });

  it("extracts summary, @param, @returns, @example", () => {
    const m = by("documented");
    expect(m.summary).toBe("Does a documented thing.");
    expect(m.params).toEqual([{ name: "x", text: "the input" }]);
    expect(m.returns).toBe("whether it worked");
    expect(m.examples).toEqual(["SigApi.documented(1)"]);
    expect(m.signature).toBe("documented(x: number): boolean");
  });

  it("degrades to signature-only when a member has no TSDoc", () => {
    const m = by("bare");
    expect(m.summary).toBe("");
    expect(m.signature).toBe("bare(): void");
    expect(m.params).toBeUndefined();
    expect(m.returns).toBeUndefined();
    expect(m.examples).toBeUndefined();
  });
});

// ── @authorable projector (Studio composition surface, P0) ──────────
//
// A fixture mixin with one field of each shape the composer cares
// about: a plain property, an instruction field (typeShape = the
// applier's payload, not the runtime field type), a union-of-literals
// (enumValues), a Pattern-A ref (refShape/refType), an unannotated
// field (→ coverage.unclassified), and a @runtimeState field (excluded
// AND not unclassified).

const authTag = (content = ""): Refl["comment"] => ({
  blockTags: [
    { tag: "@authorable", content: content ? [{ kind: "text", text: content }] : [] },
  ],
});
const runtimeTag = (): Refl["comment"] => ({
  blockTags: [{ tag: "@runtimeState", content: [] }],
});

/** A static string-array member serialized as a defaultValue literal. */
function staticArray(name: string, values: string[]): Refl {
  return {
    name,
    kind: Kind.Property,
    flags: { isStatic: true },
    type: { type: "array", elementType: { type: "intrinsic", name: "string" } },
    defaultValue: `[${values.map((v) => `'${v}'`).join(", ")}]`,
  };
}

function prop(
  name: string,
  type: TdType,
  comment?: Refl["comment"],
  summary?: string
): Refl {
  const c: Refl["comment"] = comment ?? {};
  if (summary) c!.summary = [{ kind: "text", text: summary }];
  return { name, kind: Kind.Property, flags: {}, type: type as Refl["type"], comment: c };
}

const AUTHORABLE_FIXTURE: Refl = {
  name: "PROJECT",
  kind: 1,
  children: [
    {
      name: "mud/lib/demo/Demo",
      kind: Kind.Module,
      children: [
        {
          name: "DemoMixin",
          kind: Kind.Class,
          children: [
            {
              name: "_mixinName",
              kind: Kind.Property,
              flags: { isStatic: true },
              type: { type: "intrinsic", name: "string" } as Refl["type"],
              defaultValue: "'DemoMixin'",
            },
            staticArray("persistentFields", [
              "color",
              "intensity",
              "material",
              "ratio",
              "leftover",
            ]),
            staticArray("instructionFields", ["exits"]),
            // property field
            prop("intensity", { type: "intrinsic", name: "number" }, authTag(), "How bright."),
            // union-of-literals property
            prop(
              "color",
              { type: "union", types: [{ type: "literal", value: "red" }, { type: "literal", value: "blue" }] },
              authTag()
            ),
            // Pattern-A ref property
            prop("material", { type: "intrinsic", name: "string" }, authTag("ref:Material")),
            // instruction field + its applier
            prop("exits", { type: "reference", name: "ExitMap" }, authTag()),
            {
              name: "applyExits",
              kind: Kind.Method,
              flags: {},
              signatures: [
                {
                  name: "applyExits",
                  kind: 4096,
                  parameters: [
                    { name: "data", kind: 32768, type: { type: "reference", name: "ExitSpec" } as Refl["type"] },
                  ],
                },
              ],
            },
            // runtime-state field (excluded, not unclassified)
            prop("ratio", { type: "intrinsic", name: "number" }, runtimeTag()),
            // unannotated field → coverage.unclassified
            prop("leftover", { type: "intrinsic", name: "number" }),
          ],
        },
      ],
    },
  ],
};

describe("projectAuthorableFields", () => {
  const artifact = projectAuthorableFields(AUTHORABLE_FIXTURE);
  const demo = artifact.fields["DemoMixin"] ?? [];
  const byField = (f: string) => demo.find((d) => d.field === f);

  it("keys fields by the mixin's _mixinName", () => {
    expect(Object.keys(artifact.fields)).toContain("DemoMixin");
  });

  it("projects a plain property with its rendered typeShape", () => {
    const d = byField("intensity");
    expect(d?.kind).toBe("property");
    expect(d?.typeShape).toBe("number");
    expect(d?.description).toBe("How bright.");
  });

  it("projects an instruction field with the applier's payload type, not the field type", () => {
    const d = byField("exits");
    expect(d?.kind).toBe("instruction");
    // ExitSpec is applyExits' param — NOT the runtime ExitMap field type.
    expect(d?.typeShape).toBe("ExitSpec");
  });

  it("emits enumValues for a union of string literals", () => {
    const d = byField("color");
    expect(d?.enumValues).toEqual(["red", "blue"]);
  });

  it("emits refShape/refType for an @authorable ref field", () => {
    const d = byField("material");
    expect(d?.refShape).toBe("path");
    expect(d?.refType).toBe("Material");
  });

  it("puts an unannotated field into coverage.unclassified", () => {
    expect(artifact.coverage.unclassified).toContain("DemoMixin.leftover");
  });

  it("excludes a @runtimeState field from descriptors and from unclassified", () => {
    expect(byField("ratio")).toBeUndefined();
    expect(artifact.coverage.unclassified).not.toContain("DemoMixin.ratio");
  });

  it("reports no double-classified fields for a clean fixture", () => {
    expect(artifact.coverage.doubleClassified).toEqual([]);
    // The only unclassified field is the deliberately-unmarked one.
    expect(artifact.coverage.unclassified).toEqual(["DemoMixin.leftover"]);
  });
});
