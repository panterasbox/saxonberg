/**
 * CastController + CastActivity — the casting front door: dispatch
 * schedules the interruptible activity (hands + voice), the whole cast
 * body (spend + effects) runs at completion, an interrupted cast spends
 * nothing and fires nothing, and refusals ride legible prose. The
 * search-test harness (fake clock + scheduler + silenced messaging).
 */

import "@saxonberg/server/test-bootstrap";
import type { CompetenceBandName } from "@saxonberg/server/mud/lib/advancement/CompetenceBand";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import CastController from "../CastController";
import requiresCastingFaculty from "@saxonberg/server/mud/lib/command/validators/requiresCastingFaculty";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { SchedulerApi } from "@saxonberg/server/mud/api/scheduler";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { EventApi } from "@saxonberg/server/mud/api/event";
import EventRegistry from "@saxonberg/server/mud/platform/idea/EventRegistry";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "@saxonberg/server/mud/api/command";
import { CommandDefinition } from "@saxonberg/server/mud/lib/command/CommandDefinition";
import { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { Character } from "@saxonberg/server/mud/lib/character/Character";
import Species from "@saxonberg/server/mud/platform/idea/species/Species";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainableMixin } from "@saxonberg/server/mud/lib/spatial/Containable";
import SpellCatalogue from "@saxonberg/server/mud/platform/idea/SpellCatalogue";
import Spell from "@saxonberg/server/mud/platform/idea/magic/Spell";
import { LightSourceMixin } from "@saxonberg/server/mud/lib/perception/LightSource";
import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import { Template } from "@saxonberg/server/mud/lib/stuff/Template";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
/** A light source standing in for the arcane library's GlowlightMote — the executor clones whatever the row's `locus` names. */
class GlowlightOrb extends LightSourceMixin(Thing) {}
/** Where the commons' spell rows live, and the class every one names (the catalogue warms BY CLASS). */
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

// The competence read runs ON the caster since the OO sweep; pinned
// per test (credits no-op — PM is disconnected here).
let testBand: CompetenceBandName = "competent";
class TestCaster extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return testBand;
  }
}
class Room extends ContainerMixin(ContainableMixin(Idea)) {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  "../../../../../../../content/arcane-library/content/stuff/idea/magic/Spell",
);

let seq = 0;
let selfLines: string[] = [];

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), "utf-8")) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, "findByClass")
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  const cat = makeStuff(() => new SpellCatalogue());
  await cat.postRegister();
  stampTemplatePathForTest(cat, "/platform/idea/SpellCatalogue");
  spy.mockRestore();
}

function makeCaster(room: Room): TestCaster {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: "mid", serenity: "mid", composure: "mid" });
  species.setInnateMixins(["CasterMixin"]);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/cc-${n}`);
  const actor = makeStuff(() => new TestCaster());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/cc-${n}`);
  actor.installArcaneReserve();
  ContainmentApi.move(actor as never, room as never);
  return actor;
}

function noopCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    "verbs: [cast]\ncontroller: NoopController\ndescription: stub\n",
    "<test>",
  );
}

function ctx(actor: Stuff, room: Room): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: "cast",
    executionId: "test",
    commandId: "test",
    verb: "cast",
    command: noopCommand(),
  });
}

function mana(c: TestCaster): number {
  return c.getMana()!.current.rawValue();
}

describe("CastController + CastActivity", () => {
  let room: Room;

  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    WorldClockApi._setNowProviderForTesting(() => 1000);
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    await installCatalogue();
    testBand = "competent";
    vi.spyOn(StuffApi, "clone").mockImplementation(async () =>
      makeStuff(() => new GlowlightOrb()),
    );
    selfLines = [];
    vi.spyOn(MessageApi, "scene").mockImplementation(
      () =>
        ({
          topic: () => ({
            toSelf: (line: unknown) => {
              selfLines.push(String(line));
              return {
                toPeers: () => ({ send: () => undefined }),
                send: () => undefined,
              };
            },
          }),
        }) as never,
    );
  });

  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it("a completed cast spends and fires at completion, not dispatch", async () => {
    const caster = makeCaster(room ?? (room = makeStuff(() => new Room())));
    const before = mana(caster);
    const controller = makeStuff(() => new CastController());
    await controller.execute(
      { spell: "glowlight" } as unknown as CommandModel,
      ctx(caster, room),
    );
    // Dispatch schedules; nothing has been spent or installed yet.
    expect(mana(caster)).toBe(before);
    expect(caster.hasCondition((c) => c.kind === "sustained")).toBe(false);

    WorldClockApi._advanceForTesting(5000); // past castSeconds (2s)
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0)); // the async resolve body

    expect(mana(caster)).toBe(before - 10);
    expect(caster.hasCondition((c) => c.kind === "sustained")).toBe(true);
  });

  it("an interrupted cast spends nothing and fires nothing", async () => {
    room = makeStuff(() => new Room());
    const caster = makeCaster(room);
    const before = mana(caster);
    const controller = makeStuff(() => new CastController());
    await controller.execute(
      { spell: "glowlight" } as unknown as CommandModel,
      ctx(caster, room),
    );
    SchedulerApi.cancelAll(caster as never); // the barge-in
    WorldClockApi._advanceForTesting(5000);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(mana(caster)).toBe(before);
    expect(caster.hasCondition((c) => c.kind === "sustained")).toBe(false);
    expect(selfLines.join(" ")).toMatch(/collapses, unfinished/);
  });

  it("a band-gated refusal lands at dispatch with legible prose", async () => {
    room = makeStuff(() => new Room());
    const caster = makeCaster(room);
    testBand = "untrained";
    const controller = makeStuff(() => new CastController());
    await controller.execute(
      { spell: "glowlight" } as unknown as CommandModel,
      ctx(caster, room),
    );
    expect(selfLines.join(" ")).toMatch(/beyond your/);
    expect(mana(caster)).toBe(120);
  });

  it("requiresCastingFaculty refuses a non-caster, passes a caster", () => {
    room = makeStuff(() => new Room());
    const caster = makeCaster(room);
    const beastSpecies = makeStuff(() => new Species());
    stampTemplatePathForTest(beastSpecies, `/stuff/idea/species/test/cc-beast`);
    const beast = makeStuff(() => new TestCaster());
    beast.setSpecies(beastSpecies);

    expect(requiresCastingFaculty(ctx(caster, room))).toBeUndefined();
    expect(requiresCastingFaculty(ctx(beast, room))).toMatch(/no gift/);
  });
});
