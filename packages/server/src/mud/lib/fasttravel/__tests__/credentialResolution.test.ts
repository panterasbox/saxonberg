/**
 * The terminal credential check (RegisterController / the teleport TPA
 * fork) resolves a credential via `ContainmentApi.findReachable(...,
 * isTravelCredential)`. With the Step 3.1 host-descent leg this returns
 * either a hosted `TravelCredentialUpdate` (no card) or a carried
 * `TravelCard` (no update), with no controller change — proving the
 * Thing/Idea symmetry at the resolution layer the controllers share.
 */

import { describe, it, expect } from "vitest";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { AetherMixin } from "../../message/Aether";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { Idea } from "../../stuff/Idea";
import TravelCredentialUpdate from "../TravelCredentialUpdate";
import TravelCard from "../../../domain/common/tpa/TravelCard";
import { UNIVERSITY_AVENUE_NODE, type TravelCredential } from "../TravelCredential";
import { makeStuff } from "../../security/__tests__/test-setup";
import type { Stuff } from "../../stuff/Stuff";

// An attuned actor that can both carry (Container) and host (Aether).
class Traveller extends AetherMixin(ContainerMixin(ContainableMixin(Idea))) {}

const isCred = (s: Stuff): s is Stuff & TravelCredential =>
  MixinApi.isTravelCredential(s);

describe("terminal credential resolution", () => {
  it("authorizes via a hosted travel credential update (no card)", () => {
    const actor = makeStuff(() => new Traveller());
    const cred = makeStuff(() => new TravelCredentialUpdate());
    (actor as unknown as {
      hostUpdate: (u: unknown) => void;
    }).hostUpdate(cred);

    const resolved = ContainmentApi.findReachable(
      actor as unknown as Stuff,
      null,
      isCred,
    );
    expect(resolved).toBe(cred);
    // Born-with University Avenue floor authorizes lounge → campus.
    expect(resolved?.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
    // `register` writes to the hosted update.
    resolved?.register("/domain/x/node");
    expect(cred.isRegistered("/domain/x/node")).toBe(true);
  });

  it("authorizes via a carried travel card (no update)", () => {
    const actor = makeStuff(() => new Traveller());
    const card = makeStuff(() => new TravelCard());
    ContainmentApi.move(card, actor as never);

    const resolved = ContainmentApi.findReachable(
      actor as unknown as Stuff,
      null,
      isCred,
    );
    expect(resolved).toBe(card);
    expect(resolved?.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
  });
});
