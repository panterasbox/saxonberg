/**
 * ⭐⭐ Tariff — the priced SERVICE, and the gap it closes.
 *
 * Before this, no shipped priced key resolved to anything but a recipe (a
 * `Menu`) or a stock line (a `Stock` counter). Paying for a repair, a
 * treatment or a burial had **no path at all**, and the one paid service
 * in the whole tree — the TPA fare — was pack code rather than content.
 * So the wreckage a fight leaves could not become anybody's work, which
 * is the whole of "the violent players need the non-violent ones".
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Tariff, { SERVICE_KINDS } from "../Tariff";
import { Idea } from "../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { EmploymentApi } from "../../../api/employment";
import { BankingApi } from "../../../api/banking";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class TestRoom extends ContainerMixin(Idea) {}

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function slate(): { tariff: Tariff; room: TestRoom } {
  const room = makeStuff(() => new TestRoom());
  stampTemplatePathForTest(room, "/test/clinic/ward");
  const tariff = makeStuff(() => new Tariff());
  tariff.prices = { treatment: 12, repair: 8, tea: 2 };
  tariff.services = { treatment: "treatment", repair: "repair" };
  ContainmentApi.move(tariff as never, room as never);
  return { tariff, room };
}

describe("Tariff — what a priced key MEANS", () => {
  it("maps a priced key to a service kind", () => {
    const { tariff } = slate();
    expect(tariff.serviceFor("treatment")).toBe("treatment");
    expect(tariff.serviceFor("repair")).toBe("repair");
  });

  it("⚠ a priced key that names no service is NOT a service", () => {
    // The house may sell tea as well; that is a menu line, not a service,
    // and `order tea` must fall through to the menu path rather than
    // being silently swallowed.
    const { tariff } = slate();
    expect(tariff.serviceFor("tea")).toBeNull();
    expect(tariff.serviceKeys().sort()).toEqual(["repair", "treatment"]);
  });

  it("⚠ an unknown service kind is refused, not trusted", () => {
    const { tariff } = slate();
    tariff.services.seance = "seance";
    tariff.setPrice("seance", 40);
    expect(tariff.serviceFor("seance")).toBeNull();
  });

  it("⚠⚠ `revive` is NOT in the vocabulary, and the reason is doctrine", () => {
    // A paid revival was the obvious third service and it is unbuildable
    // as an `order`: `requiresEmbodied` names *buy* among the embodied
    // acts a shade loses. A shade cannot purchase anything, so a paid
    // revival needs either a third-party payer (which `settle` cannot
    // express) or an option on `passage` — both real design, neither
    // this build's.
    expect([...SERVICE_KINDS]).toEqual(["repair", "treatment", "burial"]);
  });
});

describe("Tariff — collecting", () => {
  it("takes nothing for an unpriced or free key", async () => {
    const { tariff } = slate();
    expect(await tariff.collect("nothing-here", "x")).toEqual({
      paid: false,
      note: null,
    });
  });

  it("⚠ no operator at the venue → on the house, never a throw", async () => {
    // Every failure path serves the customer. A service that errored out
    // mid-treatment because the patient was broke would be a worse world
    // than a free clinic.
    const { tariff } = slate();
    vi.spyOn(EmploymentApi, "ensureOperatorAt").mockResolvedValue(null as never);
    const out = await tariff.collect("treatment", "a treatment");
    expect(out.paid).toBe(false);
  });

  it("⚠ no funds → on the house, never a throw", async () => {
    const { tariff } = slate();
    vi.spyOn(EmploymentApi, "ensureOperatorAt").mockResolvedValue(
      {} as never,
    );
    vi.spyOn(EmploymentApi, "operatingAccountOf").mockResolvedValue("acct-1");
    vi.spyOn(EmploymentApi, "flowSplitsFor").mockResolvedValue([]);
    vi.spyOn(BankingApi, "settle").mockRejectedValue(new Error("skint"));
    const out = await tariff.collect("treatment", "a treatment");
    expect(out.paid).toBe(false);
    expect(out.note).toBeNull();
  });

  it("⭐ settles into the operating business's account and reports it", async () => {
    const { tariff } = slate();
    vi.spyOn(EmploymentApi, "ensureOperatorAt").mockResolvedValue(
      {} as never,
    );
    vi.spyOn(EmploymentApi, "operatingAccountOf").mockResolvedValue("acct-1");
    vi.spyOn(EmploymentApi, "flowSplitsFor").mockResolvedValue([]);
    const settle = vi
      .spyOn(BankingApi, "settle")
      .mockResolvedValue({ method: "credential" } as never);
    vi.spyOn(BankingApi, "remitDemoTax").mockResolvedValue(undefined as never);

    const out = await tariff.collect("treatment", "a treatment");
    expect(out.paid).toBe(true);
    expect(out.note).toBeTruthy();
    // Income keys on the BUSINESS account — the same account shift wages
    // come out of, so the P&L reflects both sides.
    const charge = settle.mock.calls[0]![0] as { payeeAccountId: string };
    expect(charge.payeeAccountId).toBe("acct-1");
  });
});
