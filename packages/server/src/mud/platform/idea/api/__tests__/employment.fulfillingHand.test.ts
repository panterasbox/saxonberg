/**
 * The paid mend's hand, end to end through the real roster (repair W3):
 * a house whose rostered smith stands in its room, a tariff on its floor —
 * at noon `ensureOperatorAt` puts her on shift and `fulfillingHand` finds
 * her; off shift it does not.
 *
 * (Found by the repair drive: the smith stood in her smithy at noon with
 * no employment record, and the paid mend said "nobody here".)
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from "vitest";
import { EmploymentApi } from "../../../../api/employment";
import { CraftingApi } from "../../../../api/crafting";
import { StuffApi } from "../../../../api/stuff";
import { WorldClockApi } from "../../../../api/worldclock";
import { ContainmentApi } from "../../../../api/containment";
import { AppSettings } from "../../../../lib/config/AppSettings";
import { Quantity } from "../../../../lib/quantity";
import { installStore, type Doc } from "../../../../lib/persistence/__tests__/backend-store";
import TemplateApplier from "../../TemplateApplier";
import Place from "../../../../lib/stuff/Place";
import Tariff from "../../../thing/Tariff";
import { EmployedMixin } from "../../../../lib/employment/Employed";
import { MobileMixin } from "../../../../lib/spatial/Mobile";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { Idea } from "../../../../lib/stuff/Idea";
import { makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";
import { attachGraph } from "../../../../lib/location/__tests__/attachments-fixture";

class Worker extends EmployedMixin(MobileMixin(ContainerMixin(ContainableMixin(Idea)))) {
  static _mixinName = "FulfillingWorker";
}

const PH = TemplateApplier.templatePath;
const BIZ = "/test/fh/business";
const SMITH = "/test/fh/smith";
const ROOM = "/test/fh/smithy";
const TARIFF = "/test/fh/tariff";
const CUSTOMER = "/test/fh/customer";

const COOK = "/test/fh/cook";

function docs(proprietor: boolean, cook = false): Doc[] {
  return [
    { path: PH, class: PH, data: {} },
    {
      path: BIZ,
      class: "/platform/idea/Business",
      data: {
        appointingAuthority: proprietor
          ? { kind: "entity", path: SMITH }
          : { kind: "office", office: "prime-minister" },
        call: "rota",
        positions: [
          { key: "smith", label: "at the forge", wageRate: 5, fulfills: ["smithing"] },
          ...(cook ? [{ key: "cook", label: "at the hearth", wageRate: 4, fulfills: ["cooking"] }] : []),
        ],
        rosterSlots: [
          { positionKey: "smith", assignee: SMITH, schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [6, 19] }] },
          ...(cook
            ? [{ positionKey: "cook", assignee: COOK, schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [6, 19] }] }]
            : []),
        ],
        operatingLocations: [ROOM],
      },
    },
  ];
}

function atHour(hour: number): void {
  vi.spyOn(WorldClockApi, "getNow").mockReturnValue(Quantity.of(2 * 86_400 + hour * 3_600, "s"));
}

describe("the paid mend's hand, through the real roster", () => {
  let room: Place;
  let smith: Worker;
  let customer: Worker;
  let tariff: Tariff;

  async function world(proprietor: boolean, cook = false): Promise<void> {
    StuffApi.clearAll();
    installStore(docs(proprietor, cook));
    await AppSettings.warm();
    attachGraph({ [ROOM]: [[BIZ, "house"]] });
    room = makeStuffAtPath(() => new Place(), ROOM);
    smith = makeStuffAtPath(() => new Worker(), SMITH);
    customer = makeStuffAtPath(() => new Worker(), CUSTOMER);
    tariff = makeStuffAtPath(() => new Tariff(), TARIFF);
    for (const x of [smith, customer, tariff]) ContainmentApi.move(x as never, room as never);
    if (cook) ContainmentApi.move(makeStuffAtPath(() => new Worker(), COOK) as never, room as never);
  }
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("⭐ at noon the arriving order puts her on shift, and she is the hand", async () => {
    await world(true);
    atHour(12);
    await EmploymentApi.ensureOperatorAt(ROOM);
    expect(smith.isOnShift()).toBe(true);
    expect(smith.isFulfilling()).toBe(true);
    const hand = await CraftingApi.fulfillingHand(customer as never, tariff as never);
    expect(hand).toBe(smith);
  });

  it("⭐ at night the smithy SHUTS — a proprietor who holds her own seat is the roster's, never a cover", async () => {
    // The rule storage-and-ice reached independently (its ice-company
    // keeper is also its proprietor), adopted by the owner over repair's
    // narrower one: a rostered proprietor works her shift and goes home.
    // Before it, the smithy whose smith is its owner never shut.
    await world(true);
    atHour(23);
    await EmploymentApi.ensureOperatorAt(ROOM);
    expect(await CraftingApi.fulfillingHand(customer as never, tariff as never)).toBeNull();
  });

  it("off shift, with no proprietor to cover, there is nobody", async () => {
    await world(false);
    atHour(23);
    await EmploymentApi.ensureOperatorAt(ROOM);
    expect(await CraftingApi.fulfillingHand(customer as never, tariff as never)).toBeNull();
  });

  it("⭐⭐ a proprietor who is ALSO rostered keeps her own shift while another hand is on (the drive's finding)", async () => {
    // The Hearthworks: Berta owns the smithy and holds its smith slot; the
    // cook is on too. Cover read her own on-shift record as a cover and
    // ended it (dropping the record) every pass — she stood at her forge
    // with no employment, and the paid mend said "nobody here".
    await world(true, true);
    atHour(12);
    await EmploymentApi.ensureOperatorAt(ROOM);
    await EmploymentApi.ensureOperatorAt(ROOM); // and again — it must hold
    expect(smith.isOnShift()).toBe(true);
    expect(await CraftingApi.fulfillingHand(customer as never, tariff as never)).toBe(smith);
  });
});
