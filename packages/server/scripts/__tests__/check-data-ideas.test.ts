/**
 * `lint:data-ideas` seen to FAIL on the shape size and carrying shipped and
 * retired (W10j: the `Form` singleton Idea — fields, getters, setters and a
 * pure computation over them, five rows) and to pass an Idea that acts.
 * review-questions.md P10.
 */

import "../../src/test-bootstrap";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  DATA_IDEAS_CEILING,
  IdeaCensus,
  collectLiveFindings,
  excluded,
} from "../check-data-ideas";
import { MUD, packSources } from "../pack-roots";

const PLANTED = join(MUD, "platform", "idea", "__Planted.ts");

/** The data-only classes a planted module declares. */
const plant = (src: string): string[] =>
  new IdeaCensus(packSources(), MUD, new Map([[PLANTED, src]]))
    .scanFile(PLANTED, "Planted.ts")
    .map((f) => f.cls);

const HEAD = [
  "import { Idea } from '../../lib/stuff/Idea';",
  "import { SingletonMixin } from '../../lib/stuff/Singleton';",
  "import { Dimensions } from '../../lib/spatial/Dimensions';",
].join("\n");

describe("the classifier", () => {
  it("⭐ FINDS the retired Form: a singleton Idea of fields, accessors and pure computation", () => {
    const src = `${HEAD}
export default class Form extends SingletonMixin(Idea) {
  static fieldMeta = { name: { persistent: true } };
  protected name = '';
  protected aspect = { width: 1, depth: 1, height: 1 };
  getName(): string { return this.name; }
  setName(v: string): void { this.name = v; }
  isRigid(): boolean { return true; }
  dimensionsFor(v: number): Dimensions {
    const s = Math.cbrt(v);
    return new Dimensions(this.aspect.width * s, this.aspect.depth * s, this.aspect.height * s);
  }
}`;
    expect(plant(src)).toEqual(["Form"]);
  });

  it("FINDS one through a same-file const base and a plain `extends Idea`", () => {
    expect(plant(`${HEAD}\nconst B = SingletonMixin(Idea);\nexport class T extends B { protected k = 1; }`)).toEqual(["T"]);
    expect(plant(`${HEAD}\nexport class U extends Idea {}`)).toEqual(["U"]);
  });

  it("an Idea that acts is not counted: a hook, an await, an Api call, a timer", () => {
    expect(plant(`${HEAD}\nexport class A extends Idea { onCreate(): void {} }`)).toEqual([]);
    expect(plant(`${HEAD}\nexport class B extends Idea { canEvict(): boolean { return false; } }`)).toEqual([]);
    expect(plant(`${HEAD}\nexport class C extends Idea { async load(): Promise<void> {} }`)).toEqual([]);
    expect(plant(`${HEAD}\nexport class D extends Idea { owner() { return StuffApi.findByTemplatePath('/x'); } }`)).toEqual([]);
    expect(plant(`${HEAD}\nexport class E extends Idea { tick() { setTimeout(() => 0, 1); } }`)).toEqual([]);
  });

  it("a type that NAMES an Api is not a call", () => {
    expect(plant(`${HEAD}\nexport class F extends Idea { k(): ReturnType<typeof FooApi.x> | null { return null; } }`)).toEqual(["F"]);
  });

  it("behavior inherited through a composed mixin counts (Persistable's hooks)", () => {
    const src = `${HEAD}\nimport { PersistableMixin } from '../../lib/persistence/Persistable';\nexport class P extends PersistableMixin(Idea) { protected k = 1; }`;
    expect(plant(src)).toEqual([]);
  });

  it("a non-Idea class is not counted", () => {
    expect(plant(`export class V extends Error {}`)).toEqual([]);
  });
});

describe("the census's homes", () => {
  it("leaves out controllers, logic singletons, catalogues and registries", () => {
    expect(excluded("cmd/movement/GoController.ts")).toBe(true);
    expect(excluded("api/PartyLogic.ts")).toBe(true);
    expect(excluded("SoulCatalogue.ts")).toBe(true);
    expect(excluded("AccessRegistry.ts")).toBe(true);
    expect(excluded("LocomotionMode.ts")).toBe(false);
  });
});

describe("⭐ the live tree", () => {
  it("holds at the ceiling", () => {
    expect(collectLiveFindings()).toHaveLength(DATA_IDEAS_CEILING);
  });
});
