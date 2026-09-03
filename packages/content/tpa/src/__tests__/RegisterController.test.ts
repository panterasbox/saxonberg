/**
 * RegisterController — `register`, and the one thing the requirements ask
 * of it beyond working: **AC14 — it costs nothing, at every node.**
 *
 * ⭐ The reason it is free is that the controller contains no fee code at
 * all — which is exactly why it needs a test. "Free by omission" is the
 * kind of property a later edit takes away without anyone noticing,
 * because nothing breaks: a fare would simply start being charged. So
 * the assertion is made against `BankingApi`, the only door money leaves
 * by, at BOTH node directionalities that can be registered.
 *
 * Registration is what makes the network usable at all, and a toll on it
 * would be a toll on discovering the thing you have not yet paid to use.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import RegisterController from "../idea/cmd/movement/RegisterController";
import { FastTravelMixin } from "../lib/FastTravel";
import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import { Agent } from "@saxonberg/server/mud/lib/stuff/Agent";
import CredentialWalletUpdate from "@saxonberg/server/mud/platform/idea/CredentialWalletUpdate";
import { AetherMixin } from "@saxonberg/server/mud/lib/message/Aether";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainableMixin } from "@saxonberg/server/mud/lib/spatial/Containable";
import { CommandGiverMixin } from "@saxonberg/server/mud/lib/command/CommandGiver";
import { SensorMixin } from "@saxonberg/server/mud/lib/message/Sensor";
import { NamedMixin } from "@saxonberg/server/mud/lib/description/Named";
import Location from "@saxonberg/server/mud/lib/stuff/Location";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { BankingApi } from "@saxonberg/server/mud/api/banking";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { CommandDefinition } from "@saxonberg/server/mud/lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "@saxonberg/server/mud/api/command";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { AetherHosted } from "@saxonberg/server/mud/lib/augmentation/AetherHosted";
import type { CredentialWallet } from "@saxonberg/server/mud/lib/credential/CredentialWallet";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";

const NODE = "/system/tpa/thing/test-gate";

class Node extends FastTravelMixin(NamedMixin(Thing)) {
  static _mixinName = "Node";
}
class Traveller extends AetherMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
  ),
) {
  static _mixinName = "Traveller";
}

function ctx(giver: Stuff, location: Stuff, source: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandSource: source as never,
    commandText: "register",
    executionId: "t",
    commandId: "t",
    verb: "register",
    command: CommandDefinition.fromYaml(
      "verbs: [register]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}

function makeTraveller(): Traveller {
  const t = makeStuff(() => {
    const a = new Traveller();
    a.setName("alice");
    return a;
  });
  const wallet = makeStuff(() => new CredentialWalletUpdate());
  (t as unknown as { hostUpdate(u: Stuff): void }).hostUpdate(wallet);
  return t;
}

function travelCredential(t: Stuff): CredentialWallet {
  const w = MixinApi.isAether(t)
    ? (t
        .getHostedUpdates()
        .find(
          (s): s is Stuff & AetherHosted & CredentialWallet =>
            MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
        ) ?? null)
    : null;
  if (!w) throw new Error("no identity wallet");
  return w;
}

describe("RegisterController — AC14, registering costs nothing", () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it.each(["arrival", "both"] as const)(
    "a %s node registers for FREE — no money leaves by any door",
    async (directionality) => {
      const loc = makeStuff(() => new Location());
      const giver = makeTraveller();
      const node = makeStuff(() => {
        const n = new Node();
        n.setName("the test gate");
        n.setDirectionality(directionality);
        return n;
      });
      stampTemplatePathForTest(node as unknown as Stuff, NODE);
      ContainmentApi.move(giver, loc);

      // Every door money leaves by on the facade. `settle` is the
      // credential/ledger path a fare takes and `transfer` the raw
      // account-to-account move — spying both means a fee cannot be
      // introduced by either route.
      const settle = vi.spyOn(BankingApi, "settle");
      const post = vi.spyOn(BankingApi, "transfer");

      const c = ctx(giver, loc, node as unknown as Stuff);
      await makeStuff(() => new RegisterController()).execute(
        {} as CommandModel,
        c,
      );

      expect(travelCredential(giver).getCredential("travel")!.isRegistered(NODE)).toBe(true);
      expect(settle).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
      expect(c.getNotes().some((n) => n.kind === "controller-rejected")).toBe(
        false,
      );
    },
  );

  it("a departures-only node has nothing to register, and still charges nothing", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeTraveller();
    const node = makeStuff(() => {
      const n = new Node();
      n.setName("the one-way gate");
      n.setDirectionality("departure");
      return n;
    });
    stampTemplatePathForTest(node as unknown as Stuff, NODE);
    ContainmentApi.move(giver, loc);

    const settle = vi.spyOn(BankingApi, "settle");
    const c = ctx(giver, loc, node as unknown as Stuff);
    await makeStuff(() => new RegisterController()).execute(
      {} as CommandModel,
      c,
    );

    expect(
      c.getNotes().some((n) => n.reason === "not-arrival"),
    ).toBe(true);
    expect(travelCredential(giver).getCredential("travel")!.isRegistered(NODE)).toBe(false);
    expect(settle).not.toHaveBeenCalled();
  });
});
