/**
 * Avatar.installDefaultLoadout — attune-by-any-source + inject the
 * default apps (comms + travel credential).
 *
 * Covers: an ordinary-species avatar attunes via the cranial implant
 * then hosts both updates; a born-attuned-species avatar skips the
 * implant but still hosts both updates and is attuned; idempotency on
 * re-entry; the implant no longer composes TravelCredentialMixin.
 */

import "../../../test-bootstrap";
import { setFlatSenses } from '../../lib/species/__tests__/flat-body';
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Avatar from "../agent/PrimaryAvatar";
import Species from "../idea/species/Species";
import BodyPlan from "../idea/species/BodyPlan";
import AetherImplant from "../thing/AetherImplant";
import App from "../idea/App";
import WalletApp from "../idea/WalletApp";
import ForumsApp from "../idea/ForumsApp";
import { StuffApi } from "../../api/stuff";
import { SpeciesApi } from "../../api/species";
import { MixinApi } from "../../api/mixin";
import { MqlApi } from "../../api/mql";
import { BankingApi } from "../../api/banking";
import type { CommandGiver } from "../../lib/command/CommandGiver";
import type { AetherHost } from "../../lib/augmentation/AetherHost";
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
function makeAvatarOfSpecies(innate: string[], opts: { guest?: boolean } = {}): Avatar {
  const biped = withPath(
    makeStuff(() => new BodyPlan()),
    `/stuff/idea/species/BodyPlan/biped-loadout-${seq}`,
  );
  setFlatSenses(biped, [
    { modality: "vision", count: 2, position: "frontal" },
    { modality: "hearing", count: 2, position: "lateral" },
  ]);
  biped.setSlots([{ name: "cranial", accepts: "SlottableMixin" }]);
  const species = withPath(
    makeStuff(() => new Species()),
    `/stuff/idea/species/animalia/loadout-test-${seq}`,
  );
  seq += 1;
  species.setBodyPlan(biped);
  species.setInnateMixins(innate);
  const avatar = makeStuff(() => new Avatar());
  avatar.setPlayerId(`loadout-${seq}`);
  if (opts.guest) (avatar as unknown as { isGuest: boolean }).isGuest = true;
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

function hostedApps(avatar: Avatar): Stuff[] {
  return (avatar as unknown as AetherHost).getHostedApps() as unknown as Stuff[];
}

/** Messages instances running on the PERSON's own host. */
function hostedMessages(avatar: Avatar): Stuff[] {
  return hostedApps(avatar).filter(
    (u) => u.getTemplatePath() === App.MESSAGES_PATH,
  );
}

function implantOf(avatar: Avatar): AetherImplant | null {
  return ([...avatar.getOccupants("cranial")][0] ?? null) as AetherImplant | null;
}

function hostedCredentials(avatar: Avatar): (Stuff & CredentialWallet)[] {
  return hostedApps(avatar).filter((u): u is Stuff & CredentialWallet =>
    MixinApi.isCredentialWallet(u),
  );
}

function hostedForums(avatar: Avatar): (Stuff & Forums)[] {
  return hostedApps(avatar).filter((u): u is Stuff & Forums =>
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
          // The implant row installs Messages (its `installedApps`).
          const implant = makeStuff(() => new AetherImplant());
          await implant.installApp(App.MESSAGES_PATH);
          return implant;
        }
        if (path === App.MESSAGES_PATH) {
          return withPath(makeStuff(() => new App()), path);
        }
        if (path === WalletApp.TEMPLATE_PATH) {
          return withPath(makeStuff(() => new WalletApp()), path);
        }
        if (path === ForumsApp.TEMPLATE_PATH) {
          return withPath(makeStuff(() => new ForumsApp()), path);
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

  it("a GUEST: attuned by the implant, which runs Messages; the person runs the rest", async () => {
    const avatar = makeAvatarOfSpecies([], { guest: true });
    await runLoadout(avatar);

    expect(avatar.getOccupants("cranial").size).toBe(1); // implant installed
    expect(MixinApi.isActive(avatar as unknown as Stuff, "AetherMixin")).toBe(
      true,
    );
    // ⭐ Messages is on the device that tunes, not on the person (D2).
    expect(hostedMessages(avatar)).toHaveLength(0);
    expect(implantOf(avatar)!.hasApp("messages")).toBe(true);
    expect(MixinApi.isComms(avatar as unknown as Stuff)).toBe(true);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  it("⭐ a player is seated NO implant — the phone in their pocket tunes them (D11)", async () => {
    const avatar = makeAvatarOfSpecies([]);
    await runLoadout(avatar);
    expect(avatar.getOccupants("cranial").size).toBe(0);
    expect(MixinApi.isActive(avatar as unknown as Stuff, "AetherMixin")).toBe(false);
    expect(hostedMessages(avatar)).toHaveLength(0);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  it("⭐ the wallet app links again every account its person holds — primary active (harbors B6: after a restart it held none)", async () => {
    const avatar = makeAvatarOfSpecies([]);
    const ids = vi.spyOn(BankingApi, "accountIdsOf").mockResolvedValue(["acct-primary", "acct-other"]);
    await runLoadout(avatar);
    expect(ids).toHaveBeenCalledWith(avatar.getIdentityPath());
    const pay = hostedCredentials(avatar)[0]!.getCredential("payment")!;
    expect([...pay.getLinkedAccounts()]).toEqual(["acct-primary", "acct-other"]);
    expect(pay.getActiveAccount()).toBe("acct-primary");
  });

  it("born-attuned species: skips the implant; Messages runs on the person", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    expect(MixinApi.isActive(avatar as unknown as Stuff, "AetherMixin")).toBe(
      true,
    );
    await runLoadout(avatar);

    expect(avatar.getOccupants("cranial").size).toBe(0); // no implant
    expect(hostedMessages(avatar)).toHaveLength(1);
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

  it("comms is the person's — a born-tuned person can send at once", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    await runLoadout(avatar);
    const comms = avatar as unknown as Stuff & Comms;
    expect(MixinApi.isComms(comms)).toBe(true);
    expect(comms.sendOrHold("dm bob hi")).toBeNull();
  });

  it("the forums app is reachable for forum dispatch; absent when never loaded", async () => {
    const avatar = makeAvatarOfSpecies(["AetherMixin"]);
    // Before the loadout runs, no forums app is reachable.
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

  it("is idempotent on re-entry (installApp is idempotent by path)", async () => {
    const avatar = makeAvatarOfSpecies([], { guest: true });
    await runLoadout(avatar);
    await runLoadout(avatar);
    expect(avatar.getOccupants("cranial").size).toBe(1);
    expect(implantOf(avatar)!.getHostedApps()).toHaveLength(1);
    expect(hostedCredentials(avatar)).toHaveLength(1);
    expect(hostedForums(avatar)).toHaveLength(1);
  });

  it("the implant no longer composes any credential mixin", () => {
    const implant = makeStuff(() => new AetherImplant());
    expect(MixinApi.isCredentialWallet(implant)).toBe(false);
  });
});
