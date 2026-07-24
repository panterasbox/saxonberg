/**
 * Condition — the engine-verifiable delivery predicate: template-vocabulary
 * validation (the "engine-verifiable or rejected" boundary), item matching
 * (chattel / template, glob refusal), and the authoritative `holdsFor`
 * walk (ancestor chain, the restingOn surface leg, and the
 * creature-ancestor strict-possession refusal).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Condition } from "../Condition";
import type { ConditionData } from "../Condition";
import { Idea } from "../../stuff/Idea";
import { Creature } from "../../creature/Creature";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { SurfacedMixin } from "../../spatial/Surfaced";
import { GlobbableMixin } from "../../stuff/Globbable";
import { ChattelMixin } from "../../chattel/Chattel";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = "TestRoom";
}
class TestChest extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestChest";
}
class TestCrate extends ContainableMixin(Idea) {
  static _mixinName = "TestCrate";
}
class TestCounter extends SurfacedMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestCounter";
}
class TestStack extends GlobbableMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestStack";
}
class TestParcel extends ChattelMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestParcel";
}

const ROOM = "/domain/test/bar";
const CRATE = "/obj/test/crate";

function delivery(overrides: Partial<ConditionData> = {}): ConditionData {
  return {
    template: "delivery",
    item: { kind: "template", path: CRATE },
    destinationPath: ROOM,
    ...overrides,
  };
}

describe("Condition.validate — the verification boundary", () => {
  it("accepts a well-formed delivery", () => {
    expect(Condition.validate(delivery())).toBeNull();
  });

  it("refuses an unknown template (free-form intents rejected)", () => {
    expect(
      Condition.validate({ ...delivery(), template: "make-dave-happy" }),
    ).toMatch(/unknown condition template/);
  });

  it("refuses malformed shapes", () => {
    expect(Condition.validate(null)).toBeTruthy();
    expect(Condition.validate({ template: "delivery" })).toBeTruthy();
    expect(
      Condition.validate(delivery({ item: { kind: "template", path: "" } })),
    ).toBeTruthy();
    expect(Condition.validate(delivery({ destinationPath: "" }))).toBeTruthy();
  });
});

describe("Condition.matchesItem / holdsFor", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });
  afterEach(() => StuffApi.clearAll());

  it("matches by template path and refuses a fungible stack", () => {
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    const stack = makeStuffAtPath(() => new TestStack(), CRATE);
    expect(Condition.matchesItem(delivery(), crate)).toBe(true);
    expect(Condition.matchesItem(delivery(), stack)).toBe(false);
  });

  it("matches a chattel-bound item by its durable id", () => {
    const parcel = makeStuffAtPath(() => new TestParcel(), "/obj/test/parcel");
    (parcel as unknown as { _chattelId: string })._chattelId = "ch-1";
    const bound = delivery({ item: { kind: "chattel", chattelId: "ch-1" } });
    expect(Condition.matchesItem(bound, parcel)).toBe(true);
    expect(
      Condition.matchesItem(
        delivery({ item: { kind: "chattel", chattelId: "ch-2" } }),
        parcel,
      ),
    ).toBe(false);
  });

  it("holds when the item rests in the destination (and nested in a chest there)", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    expect(Condition.holdsFor(delivery(), crate)).toBe(false); // nowhere yet
    ContainmentApi.move(crate, room);
    expect(Condition.holdsFor(delivery(), crate)).toBe(true);

    const chest = makeStuffAtPath(() => new TestChest(), "/obj/test/chest");
    ContainmentApi.move(chest, room);
    ContainmentApi.move(crate, chest);
    expect(Condition.holdsFor(delivery(), crate)).toBe(true); // chest-in-bar
  });

  it("refuses a creature ancestor — still carried is not delivered", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const courier = makeStuffAtPath(
      () => new Creature(),
      "/obj/Avatar/courier",
    );
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.move(courier, room);
    ContainmentApi.move(crate, courier as never);
    // The courier stands IN the bar, crate in hand — not delivered.
    expect(Condition.holdsFor(delivery(), crate)).toBe(false);
  });

  it("accepts the restingOn surface leg — deliver to the counter", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const counter = makeStuffAtPath(
      () => new TestCounter(),
      "/domain/test/counter",
    );
    ContainmentApi.move(counter, room);
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.placeOn(crate, counter);
    const toCounter = delivery({ destinationPath: "/domain/test/counter" });
    expect(Condition.holdsFor(toCounter, crate)).toBe(true);
    // …and to the room: the crate is in the room's contents via placeOn.
    expect(Condition.holdsFor(delivery(), crate)).toBe(true);
  });
});
