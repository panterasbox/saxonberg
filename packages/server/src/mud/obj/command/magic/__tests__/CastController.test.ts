/**
 * CastController + CastActivity — the casting front door: dispatch
 * schedules the interruptible activity (hands + voice), the whole cast
 * body (spend + effects) runs at completion, an interrupted cast spends
 * nothing and fires nothing, and refusals ride legible prose. The
 * search-test harness (fake clock + scheduler + silenced messaging).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import CastController from "../CastController";
import requiresCastingFaculty from "../../../../lib/command/validators/requiresCastingFaculty";
import { MagicApi } from "../../../../api/magic";
import { AdvancementApi } from "../../../../api/advancement";
import { MessageApi } from "../../../../api/message";
import { SchedulerApi } from "../../../../api/scheduler";
import { WorldClockApi } from "../../../../api/worldclock";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { EventApi } from "../../../../api/event";
import EventRegistry from "../../../../obj/EventRegistry";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../api/command";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { Stuff } from "../../../../lib/stuff/Stuff";
import { Character } from "../../../../lib/character/Character";
import Species from "../../../../lib/species/Species";
import { Idea } from "../../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import SpellCatalogue from "../../../SpellCatalogue";
import Spell from "../../../../lib/magic/Spell";
import GlowlightOrb from "../../../../lib/magic/GlowlightOrb";
import { Template } from "../../../../lib/stuff/Template";
import { MANA_RESERVE_KEY } from "../../../../lib/magic/Caster";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class TestCaster extends Character {}
class Room extends ContainerMixin(ContainableMixin(Idea)) {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  "../../../../seeds/lib/magic/Spell",
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
    .spyOn(Template, "findDescendants")
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (!prefix.startsWith(Spell.TEMPLATE_PATH_PREFIX)) return [];
      return seeds.map((seed) => ({
        path: `${Spell.TEMPLATE_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  const cat = makeStuff(() => new SpellCatalogue());
  await cat.postRegister();
  stampTemplatePathForTest(cat, "/obj/SpellCatalogue");
  spy.mockRestore();
}

function makeCaster(room: Room): TestCaster {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: "mid", serenity: "mid", composure: "mid" });
  species.setInnateMixins(["CasterMixin"]);
  stampTemplatePathForTest(species, `/lib/species/test/cc-${n}`);
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
  return c.getReserve(MANA_RESERVE_KEY)!.current.rawValue();
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
      Stuff._stampTemplatePath(r, "/obj/EventRegistry");
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    await installCatalogue();
    vi.spyOn(AdvancementApi, "bandFor").mockResolvedValue("competent");
    vi.spyOn(AdvancementApi, "recordSignature").mockResolvedValue(undefined);
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
      { spell: { raw: "glowlight" } } as unknown as CommandModel,
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
      { spell: { raw: "glowlight" } } as unknown as CommandModel,
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
    vi.spyOn(AdvancementApi, "bandFor").mockResolvedValue("untrained");
    const controller = makeStuff(() => new CastController());
    await controller.execute(
      { spell: { raw: "glowlight" } } as unknown as CommandModel,
      ctx(caster, room),
    );
    expect(selfLines.join(" ")).toMatch(/beyond your/);
    expect(mana(caster)).toBe(120);
  });

  it("requiresCastingFaculty refuses a non-caster, passes a caster", () => {
    room = makeStuff(() => new Room());
    const caster = makeCaster(room);
    const beastSpecies = makeStuff(() => new Species());
    stampTemplatePathForTest(beastSpecies, `/lib/species/test/cc-beast`);
    const beast = makeStuff(() => new TestCaster());
    beast.setSpecies(beastSpecies);

    expect(requiresCastingFaculty(ctx(caster, room))).toBeUndefined();
    expect(requiresCastingFaculty(ctx(beast, room))).toMatch(/no gift/);
  });
});
