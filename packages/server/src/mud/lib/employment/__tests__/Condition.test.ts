/**
 * Condition — the engine-verifiable delivery predicate: template-vocabulary
 * validation (the "engine-verifiable or rejected" boundary), item matching
 * (chattel / template, stack refusal), and the authoritative `holdsFor`
 * walk (ancestor chain, the restingOn surface leg, and the
 * creature-ancestor strict-possession refusal).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Condition } from "../Condition";
import type { ConditionData } from "../Condition";
import { Idea } from "../../stuff/Idea";
import { Creature } from "../../creature/Creature";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { SurfacedMixin } from "../../spatial/Surfaced";
import { StackableMixin } from "../../stuff/Stackable";
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
class TestStack extends StackableMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestStack";
}
class TestParcel extends ChattelMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestParcel";
}

const ROOM = "/world/test/bar";
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
    expect(new Condition(delivery()).matchesItem(crate)).toBe(true);
    expect(new Condition(delivery()).matchesItem(stack)).toBe(false);
  });

  it("matches a chattel-bound item by its durable id", () => {
    const parcel = makeStuffAtPath(() => new TestParcel(), "/obj/test/parcel");
    (parcel as unknown as { _chattelId: string })._chattelId = "ch-1";
    const bound = delivery({ item: { kind: "chattel", chattelId: "ch-1" } });
    expect(new Condition(bound).matchesItem(parcel)).toBe(true);
    const other = delivery({ item: { kind: "chattel", chattelId: "ch-2" } });
    expect(new Condition(other).matchesItem(parcel)).toBe(false);
  });

  it("holds when the item rests in the destination (and nested in a chest there)", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    expect(new Condition(delivery()).holdsFor(crate)).toBe(false); // nowhere yet
    ContainmentApi.move(crate, room);
    expect(new Condition(delivery()).holdsFor(crate)).toBe(true);

    const chest = makeStuffAtPath(() => new TestChest(), "/obj/test/chest");
    ContainmentApi.move(chest, room);
    ContainmentApi.move(crate, chest);
    expect(new Condition(delivery()).holdsFor(crate)).toBe(true); // chest-in-bar
  });

  it("refuses a creature ancestor — still carried is not delivered", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const courier = makeStuffAtPath(
      () => new Creature(),
      "/platform/agent/Avatar/courier",
    );
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.move(courier, room);
    ContainmentApi.move(crate, courier as never);
    // The courier stands IN the bar, crate in hand — not delivered.
    expect(new Condition(delivery()).holdsFor(crate)).toBe(false);
  });

  it("accepts the restingOn surface leg — deliver to the counter", () => {
    const room = makeStuffAtPath(() => new TestRoom(), ROOM);
    const counter = makeStuffAtPath(
      () => new TestCounter(),
      "/world/test/counter",
    );
    ContainmentApi.move(counter, room);
    const crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.placeOn(crate, counter);
    const toCounter = delivery({ destinationPath: "/world/test/counter" });
    expect(new Condition(toCounter).holdsFor(crate)).toBe(true);
    // …and to the room: the crate is in the room's contents via placeOn.
    expect(new Condition(delivery()).holdsFor(crate)).toBe(true);
  });
});

/* ────────── W17: `watch` — the guard contract, and the finding ────────── */

describe('the watch clause', () => {
  const watch = (gameHours: number): ConditionData => ({
    template: 'watch',
    item: { kind: 'template', path: '/world/rejection/location/fuel-yard' },
    destinationPath: '/world/rejection/location/fuel-yard',
    gameHours,
  });

  it('⭐ validates with an hour term', () => {
    expect(Condition.validate(watch(4))).toBeNull();
  });

  it('⚠ refuses a term of zero or nonsense — escrow holds real money', () => {
    expect(Condition.validate(watch(0))).toContain('hour count');
    expect(
      Condition.validate({ ...watch(4), gameHours: undefined }),
    ).toContain('hour count');
  });

  it('⭐⭐ holds on ACCRUED PRESENCE, not on anything being at a place', () => {
    // The asymmetry IS the finding. Every shipped clause is "a thing is
    // at a place"; a guard contract is "a person was at a place, for a
    // while", which `holdsFor(data, item)` cannot express however it is
    // squeezed — so the predicate is a different one.
    const c = watch(4);
    expect(new Condition(c).watchHolds(3 * 3600)).toBe(false);
    expect(new Condition(c).watchHolds(4 * 3600)).toBe(true);
    expect(new Condition(c).watchHolds(9 * 3600)).toBe(true);
  });

  it('⚠ a delivery clause never satisfies a watch predicate', () => {
    const delivery: ConditionData = {
      template: 'delivery',
      item: { kind: 'template', path: '/stuff/thing/crate' },
      destinationPath: '/somewhere',
    };
    expect(new Condition(delivery).watchHolds(999 * 3600)).toBe(false);
  });
});
