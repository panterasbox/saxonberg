/**
 * Avatar.installDefaultLoadout — attune-by-any-source + inject the
 * default hosted updates (comms + travel credential).
 *
 * Covers: an ordinary-species avatar attunes via the cranial implant
 * then hosts both updates; a born-attuned-species avatar skips the
 * implant but still hosts both updates and is attuned; idempotency on
 * re-entry; the implant no longer composes TravelCredentialMixin.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Avatar from "../Avatar";
import Species from "../species/Species";
import BodyPlan from "../species/BodyPlan";
import AetherImplant from "../AetherImplant";
import CommsUpdate from "../CommsUpdate";
import CredentialWalletUpdate from "../CredentialWalletUpdate";
import ForumsUpdate from "../ForumsUpdate";
import { StuffApi } from "../../api/stuff";
import { SpeciesApi } from "../../api/species";
import { MixinApi } from "../../api/mixin";
import { MqlApi } from "../../api/mql";
import type { CommandGiver } from "../../lib/command/CommandGiver";
import type { AetherHost } from "../../lib/message/Aether";
import type { Comms } from "../../lib/comms/Comms";
import type { CredentialWallet } from "../../lib/credential/CredentialWallet";
import type { Forums } from "../../lib/forum/Forums";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../lib/security/__tests__/test-setup";
import type { Stuff } from "../../lib/stuff/Stuff";

function withPath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

let seq = 0;
function makeAvatarOfSpecies(innate: string[]): Avatar {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/obj/species/BodyPlan/biped-loadout-${seq}`,
  );
  biped.setSensoryPorts([
    { modality: "vision", count: 2, position: "frontal" },
    { modality: "hearing", count: 2, position: "lateral" },
  ]);
  biped.setSlots([{ name: "cranial", accepts: "SlottableMixin" }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/obj/species/animalia/loadout-test-${seq}`,
  );
  seq += 1;
  species.setBodyPlan(biped);
  species.setInnateMixins(innate);
  const avatar = makeStuff(() => new Avatar());
  avatar.setPlayerId(`loadout-${seq}`);
  (avatar as unknown as { setSpecies: (s: Species) => void }).setSpecies(
    species,
  );
  return avatar;
}

function runLoadout(avatar: Avatar): Promise<void> {
  return (
    avatar as unknown as { installDefaultLoadout(): Promise<void> }
  ).installDefaultLoadout();
}

function hostedUpdates(avatar: Avatar): Stuff[] {
  return (avatar as unknown as AetherHost).getHostedUpdates() as unknown as Stuff[];
}

function hostedComms(avatar: Avatar): (Stuff & Comms)[] {
  return hostedUpdates(avatar).filter((u): u is Stuff & Comms =>
    MixinApi.isComms(u),
  );
}

function hostedCredentials(avatar: Avatar): (Stuff & CredentialWallet)[] {
  return hostedUpdates(avatar).filter((u): u is Stuff & CredentialWallet =>
    MixinApi.isCredentialWallet(u),
  );
}

function hostedForums(avatar: Avatar): (Stuff & Forums)[] {
  return hostedUpdates(avatar).filter((u): u is Stuff & Forums =>
    MixinApi.isForums(u),
  );
}

describe("Avatar.installDefaultLoadout", () => {
  beforeEach(() => {
    vi.spyOn(SpeciesApi, "preloadAnatomy").mockResolvedValue(undefined);
    vi.spyOn(StuffApi, "clone").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (path: string): Promise<any> => {
        if (path === AetherImplant.TEMPLATE_PATH) {
          return makeStuff(() => new AetherImplant());
        }
        if (path === CommsUpdate.TEMPLATE_PATH) {
          return makeStuff(() => new CommsUpdate());
        }
        if (path === CredentialWalletUpdate.TEMPLATE_PATH) {
          return makeStuff(() => new CredentialWalletUpdate());
        }
        if (path === ForumsUpdate.TEMPLATE_PATH) {
          return makeStuff(() => new ForumsUpdate());
        }
        throw new Error(`unexpected clone: ${path}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("ordinary species: attunes via the implant, hosts both updates", async () => {
    const avatar = makeAvatarOfSpecies([]);
    await runLoadout(avatar);

    expect(avatar.getOccupants("cranial").size).toBe(1); // implant installed
    expect(MixinApi.isActive(avatar as unknown as Stuff, "AetherMixin")).toBe(
      true,
    );
    expect(hostedComms(avatar)).toHaveLength(1);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  it("born-attuned species: skips the implant but still hosts both updates", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    expect(MixinApi.isActive(avatar as unknown as Stuff, "AetherMixin")).toBe(
      true,
    );
    await runLoadout(avatar);

    expect(avatar.getOccupants("cranial").size).toBe(0); // no implant
    expect(hostedComms(avatar)).toHaveLength(1);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  // The reachable pool anchored on the avatar (the MQL `reachable` seed —
  // Avatar IS a CommandGiver; the cast just recovers that from the
  // fixture's erased type).
  function reachableFrom(avatar: Avatar): Stuff[] {
    return MqlApi.resolveMany("reachable", {
      commandGiver: avatar as unknown as Stuff & CommandGiver,
      scope: "reachable",
    }).stuff;
  }

  it("the hosted comms update is reachable for dm dispatch", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    await runLoadout(avatar);
    const comms =
      reachableFrom(avatar).find(
        (s): s is Stuff & Comms => MixinApi.isComms(s),
      ) ?? null;
    expect(comms).not.toBeNull();
  });

  it("the hosted forum update is reachable for forum dispatch; absent when never loaded", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    // Before the loadout runs, no forum update is reachable.
    const before =
      reachableFrom(avatar).find(
        (s): s is Stuff & Forums => MixinApi.isForums(s),
      ) ?? null;
    expect(before).toBeNull();

    await runLoadout(avatar);
    const after =
      reachableFrom(avatar).find(
        (s): s is Stuff & Forums => MixinApi.isForums(s),
      ) ?? null;
    expect(after).not.toBeNull();
  });

  it("is idempotent on re-entry (keyed on already-hosts-comms)", async () => {
    const avatar = makeAvatarOfSpecies([]);
    await runLoadout(avatar);
    await runLoadout(avatar);
    expect(hostedComms(avatar)).toHaveLength(1);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  it("the implant no longer composes any credential mixin", () => {
    const implant = makeStuff(() => new AetherImplant());
    expect(MixinApi.isCredentialWallet(implant)).toBe(false);
  });
});
