/**
 * `hang` / taking it down again — the wall half of owning a room
 * (residences D11).
 *
 * Two verbs, one loop: `hang` moves a carried `Adornment` out of custody
 * and onto the room's fixture map; `get` is how it comes back down, and
 * is the guarded direction — your own lamp comes off freely, the bar's
 * neon does not.
 *
 * Controller-level, so the binder is stood in for (the shipped pattern):
 * what is proved here is the state change and the gate, not the parse.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HangController from "../HangController";
import GetController from "../GetController";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { NamedMixin } from "../../../../../lib/description/Named";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { AdornmentMixin } from "../../../../../lib/boundary/Adornment";
import { Idea } from "../../../../../lib/stuff/Idea";
import Location from "../../../../../lib/stuff/Location";
import { Stuff } from "../../../../../lib/stuff/Stuff";
import { StuffApi } from "../../../../../api/stuff";
import { ShadowApi } from "../../../../../api/shadow";
import { AccessApi } from "../../../../../api/access";
import { ChattelApi } from "../../../../../api/chattel";
import { ContainmentApi } from "../../../../../api/containment";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from "../../../../../api/command";
import type { MqlManyResult, MqlOneResult } from "../../../../../api/mql";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import type { Adornable } from "../../../../../lib/boundary/Adornable";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "TestGiver";
}

/** A wall sconce reduced to its two load-bearing mixins. */
class Sconce extends AdornmentMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = "Sconce";
}

/** An ordinary loose thing, for the `get all` sweep. */
class Sword extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = "Sword";
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>",
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: verb,
    executionId: "test",
    commandId: "test",
    verb,
    command: stubCommand(verb),
  });
}

function hangModel(item: Stuff, raw: string) {
  const one: MqlOneResult = { stuff: item, raw };
  return { item: one } as ModelData as unknown as Parameters<
    HangController["execute"]
  >[0];
}

function getModel(stuff: Stuff[], raw: string) {
  const many: MqlManyResult = { stuff, raw };
  return { targets: many } as ModelData as unknown as Parameters<
    GetController["execute"]
  >[0];
}

function scene(): { loc: Location; giver: TestGiver; sconce: Sconce } {
  const loc = makeStuff(() => new Location());
  const giver = makeStuff(() => new TestGiver());
  ContainmentApi.move(giver, loc);
  const sconce = makeStuff(() => {
    const s = new Sconce();
    s.setName("sconce");
    return s;
  });
  ContainmentApi.move(sconce, giver);
  return { loc, giver, sconce };
}

describe("hang", () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves a carried fixture out of custody and onto the room", async () => {
    const { loc, giver, sconce } = scene();
    const controller = makeStuff(() => new HangController());
    await controller.execute(
      hangModel(sconce, "sconce"),
      makeContext(giver, loc, "hang"),
    );

    // Out of the hands…
    expect(sconce.getContainer()).toBeNull();
    expect(giver.getContents()).toHaveLength(0);
    // …and onto the wall.
    const room = loc as unknown as Stuff & Adornable;
    expect(room.getFixtures()).toContain(sconce as unknown as never);
    expect(sconce.getAdornedTo()).toBe(room);
    // The good knows where it hangs — the marker the estate entry rides.
    expect(sconce.getMountSlot()).not.toBeNull();
  });

  it("refuses to hang the same fixture twice", async () => {
    const { loc, giver, sconce } = scene();
    const controller = makeStuff(() => new HangController());
    await controller.execute(
      hangModel(sconce, "sconce"),
      makeContext(giver, loc, "hang"),
    );
    const ctx = makeContext(giver, loc, "hang");
    await controller.execute(hangModel(sconce, "sconce"), ctx);
    expect(
      ctx
        .getNotes()
        .some((n) => n.kind === "controller-rejected" && n.reason === "already-hung"),
    ).toBe(true);
  });
});

describe("taking it down", () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Hang the sconce and hand back the pieces. */
  async function hung(): Promise<{
    loc: Location;
    giver: TestGiver;
    sconce: Sconce;
  }> {
    const s = scene();
    const controller = makeStuff(() => new HangController());
    await controller.execute(
      hangModel(s.sconce, "sconce"),
      makeContext(s.giver, s.loc, "hang"),
    );
    return s;
  }

  it("your own fixture comes off the wall and back into your hands", async () => {
    const { loc, giver, sconce } = await hung();
    vi.spyOn(ChattelApi, "ownerOf").mockResolvedValue({
      kind: "player",
      templatePath: giver.getIdentityPath()!,
    });

    const controller = makeStuff(() => new GetController());
    await controller.execute(
      getModel([sconce as unknown as Stuff], "sconce"),
      makeContext(giver, loc, "get"),
    );

    expect(sconce.getAdornedTo()).toBeNull();
    expect((loc as unknown as Stuff & Adornable).getFixtures()).toHaveLength(0);
    expect(sconce.getContainer()).toBe(giver);
  });

  it("somebody else's fixture stays on the wall when you hold no authority", async () => {
    const { loc, giver, sconce } = await hung();
    vi.spyOn(ChattelApi, "ownerOf").mockResolvedValue({
      kind: "player",
      templatePath: "/platform/agent/Avatar/somebody-else",
    });
    vi.spyOn(AccessApi, "can").mockResolvedValue(false);

    const controller = makeStuff(() => new GetController());
    const ctx = makeContext(giver, loc, "get");
    await controller.execute(
      getModel([sconce as unknown as Stuff], "sconce"),
      ctx,
    );

    expect(sconce.getAdornedTo()).not.toBeNull();
    expect(sconce.getContainer()).toBeNull();
    expect(
      ctx
        .getNotes()
        .some(
          (n) =>
            n.kind === "controller-rejected" &&
            n.reason === "not-yours-to-take-down",
        ),
    ).toBe(true);
  });

  it("write authority over the room takes it down even without title", async () => {
    const { loc, giver, sconce } = await hung();
    vi.spyOn(ChattelApi, "ownerOf").mockResolvedValue({
      kind: "group",
      templatePath: "the-bar",
    } as never);
    vi.spyOn(AccessApi, "can").mockResolvedValue(true);

    const controller = makeStuff(() => new GetController());
    await controller.execute(
      getModel([sconce as unknown as Stuff], "sconce"),
      makeContext(giver, loc, "get"),
    );
    expect(sconce.getContainer()).toBe(giver);
  });

  it("`get all` does not shout at the wall — a blocked fixture is skipped silently", async () => {
    const { loc, giver, sconce } = await hung();
    const sword = makeStuff(() => {
      const s = new Sword();
      s.setName("sword");
      return s;
    });
    ContainmentApi.move(sword, loc);
    vi.spyOn(ChattelApi, "ownerOf").mockResolvedValue({
      kind: "player",
      templatePath: "/platform/agent/Avatar/somebody-else",
    });
    vi.spyOn(AccessApi, "can").mockResolvedValue(false);

    const controller = makeStuff(() => new GetController());
    const ctx = makeContext(giver, loc, "get");
    await controller.execute(
      getModel([sconce as unknown as Stuff, sword], "all"),
      ctx,
    );

    // The sword is taken, the sconce stays up, and nobody is lectured.
    expect(sword.getContainer()).toBe(giver);
    expect(sconce.getAdornedTo()).not.toBeNull();
    expect(
      ctx
        .getNotes()
        .some(
          (n) =>
            n.kind === "controller-rejected" &&
            n.reason === "not-yours-to-take-down",
        ),
    ).toBe(false);
  });
});

describe("the affordance", () => {
  it("a fixture confers `hang` outward, to whoever is holding it", () => {
    // The unioned read, not the raw static — an outer mixin's own
    // declaration shadows the inner ones on the class object.
    const verbs = CommandApi.collectContributions(Sconce, "environment")
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain("hang");
    expect(verbs).toContain("mount");
  });
});
