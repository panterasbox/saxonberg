/**
 * CompactApi / CompactLogic tests — the committee derivation from parcel
 * title (group-owned, player-held → null, untitled → null),
 * membership (group member / founder pool-of-one backstop / outsider),
 * and the committee channel (resolve, idempotent ensure via the bound-
 * channel seam, actor-from-context on the mint).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CompactApi } from "../../../api/compact";
import { ParcelApi } from "../../../api/parcel";
import { GroupApi } from "../../../api/group";
import { ChatApi } from "../../../api/chat";
import { ExecutionContextApi } from "../../../api/execution-context";
import { TemplatePaths } from "../../../lib/paths";
import { Idea } from "../../../lib/stuff/Idea";
import Avatar from "../../Avatar";
import { EmploymentApi } from "../../../api/employment";
import { OrganizationMixin } from "../../../lib/employment/Organization";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import type { ParcelOwner } from "../../../lib/parcel/ParcelRecord";
import {
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";

const GROUP_REF = "managed:g-terminus";

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** Title fixture: /domain/terminus/** → the `terminus` group;
 *  /home/alice/** → a player; everything else → untitled. */
function stubTitle(): void {
  vi.spyOn(ParcelApi, "ownerOf").mockImplementation(
    async (path: string): Promise<ParcelOwner | null> => {
      if (path.startsWith("/domain/terminus")) {
        return { kind: "group", name: "terminus", ref: GROUP_REF };
      }
      if (path.startsWith("/home/alice")) {
        return { kind: "player", templatePath: "/home/alice" };
      }
      return null;
    }
  );
  vi.spyOn(ParcelApi, "resolveOwnerRef").mockImplementation(
    async (owner: ParcelOwner) => {
      if (owner.kind !== "group") return null;
      return owner.ref ?? `managed:g-${owner.name}`;
    }
  );
  vi.spyOn(ParcelApi, "coveringParcelOf").mockImplementation(
    async (path: string) => {
      if (!path.startsWith("/domain/terminus")) return null;
      return {
        getExtent: () => "/domain/terminus/registry",
      } as unknown as Awaited<ReturnType<typeof ParcelApi.coveringParcelOf>>;
    }
  );
}

/**
 * A duck-typed OfficeRegistry whose `isFounder` always answers true —
 * installed at the registry template path for the founder-backstop test.
 * (With NO registry installed, the founder predicate fails closed — the
 * default the other tests rely on.)
 */
class OrganizationEntity extends OrganizationMixin(Idea) {}

class FakeFounderRegistry extends Idea {
  public async isFounder(_playerId: string): Promise<boolean> {
    return true;
  }
}

describe("CompactApi — the committee reads", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    CompactApi._resetOfficeRegistryRefForReload();
    stubTitle();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives the committee from the title-holding group", async () => {
    const committee = await CompactApi.committeeOf(
      "/domain/terminus/registry/office"
    );
    expect(committee).toEqual({
      kind: "group",
      name: "terminus",
      groupRef: GROUP_REF,
      subdivisionPath: "/domain/terminus/registry",
    });
  });

  it("a player-held subdivision has NO committee (committees are groups)", async () => {
    await expect(
      CompactApi.committeeOf("/home/alice/parlor")
    ).resolves.toBeNull();
    await expect(CompactApi.committeeOf("")).resolves.toBeNull();
  });

  it("an untitled path has NO committee (content-packs wave 3)", async () => {
    await expect(CompactApi.committeeOf("/lib/somewhere/else")).resolves.toBeNull();
  });

  it("isCommitteeMember: group member true, outsider false", async () => {
    vi.spyOn(GroupApi, "isMember").mockImplementation(
      async (playerId: string, ref: string) =>
        ref === GROUP_REF && playerId === "bob"
    );
    const bob = makeAvatar("bob");
    const eve = makeAvatar("eve");
    await expect(
      CompactApi.isCommitteeMember(bob, "/domain/terminus/registry")
    ).resolves.toBe(true);
    await expect(
      CompactApi.isCommitteeMember(eve, "/domain/terminus/registry")
    ).resolves.toBe(false);
    // No committee at all → false regardless.
    await expect(
      CompactApi.isCommitteeMember(bob, "/home/alice/parlor")
    ).resolves.toBe(false);
  });

  it("an organization-held parcel resolves to the organization arm", async () => {
    vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
      kind: "organization",
      templatePath: "/compact/executive",
    });
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue({
      getExtent: () => "/obj",
    } as unknown as Awaited<ReturnType<typeof ParcelApi.coveringParcelOf>>);
    const committee = await CompactApi.committeeOf("/obj/gear/hat");
    expect(committee).toEqual({
      kind: "organization",
      name: "/compact/executive",
      templatePath: "/compact/executive",
      subdivisionPath: "/obj",
    });
    // No channel through this face for an organization.
    await expect(CompactApi.committeeChannelOf("/obj/gear/hat")).resolves.toBeNull();
    await expect(CompactApi.ensureCommitteeChannel("/obj/gear/hat")).resolves.toBeNull();
  });

  it("isCommitteeMember over an organization is staff-or-head, resident only", async () => {
    vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
      kind: "organization",
      templatePath: "/compact/executive",
    });
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue(null);
    const staffer = makeAvatar("staffer");
    const pm = makeAvatar("pm");
    const eve = makeAvatar("eve");
    // Not resident yet → nobody.
    await expect(CompactApi.isCommitteeMember(pm, "/obj/x")).resolves.toBe(false);
    const org = makeStuffAtPath(() => new OrganizationEntity(), "/compact/executive");
    org.appointingAuthority = { kind: "office", office: "prime-minister" };
    vi.spyOn(EmploymentApi, "holdsPosition").mockImplementation(
      (s) => s?.getIdentityPath() === "/obj/Avatar/staffer",
    );
    vi.spyOn(EmploymentApi, "holdsAuthority").mockImplementation(
      async (s) => s?.getIdentityPath() === "/obj/Avatar/pm",
    );
    await expect(CompactApi.isCommitteeMember(staffer, "/obj/x")).resolves.toBe(true);
    await expect(CompactApi.isCommitteeMember(pm, "/obj/x")).resolves.toBe(true);
    await expect(CompactApi.isCommitteeMember(eve, "/obj/x")).resolves.toBe(false);
  });

  it("isCommitteeMember: the founder backstop (Art. XI pool-of-one)", async () => {
    vi.spyOn(GroupApi, "isMember").mockResolvedValue(false);
    makeStuffAtPath(
      () => new FakeFounderRegistry(),
      TemplatePaths.officeRegistry
    );
    CompactApi._resetOfficeRegistryRefForReload();
    const founder = makeAvatar("founder");
    await expect(
      CompactApi.isCommitteeMember(founder, "/domain/terminus/registry")
    ).resolves.toBe(true);
    CompactApi._resetOfficeRegistryRefForReload();
  });

  it("committeeChannelOf resolves an existing channel by well-known name", async () => {
    const resolve = vi
      .spyOn(ChatApi, "resolveByName")
      .mockImplementation(async (name: string) =>
        name === "terminus-committee"
          ? ({ name } as unknown as Awaited<
              ReturnType<typeof ChatApi.resolveByName>
            >)
          : null
      );
    await expect(
      CompactApi.committeeChannelOf("/domain/terminus/registry")
    ).resolves.toEqual({ name: "terminus-committee" });
    expect(resolve).toHaveBeenCalledWith("terminus-committee");
    // No committee → no channel.
    await expect(
      CompactApi.committeeChannelOf("/home/alice/parlor")
    ).resolves.toBeNull();
  });

  it("ensureCommitteeChannel is idempotent and actor-derived", async () => {
    const create = vi
      .spyOn(ChatApi, "createBoundChannel")
      .mockResolvedValue({} as never);
    // Existing channel → no mint, same view.
    vi.spyOn(ChatApi, "resolveByName").mockResolvedValue({} as never);
    await expect(
      CompactApi.ensureCommitteeChannel("/domain/terminus/registry")
    ).resolves.toEqual({ name: "terminus-committee" });
    expect(create).not.toHaveBeenCalled();

    // Absent channel, NO acting command context → no mint (reads pure).
    vi.spyOn(ChatApi, "resolveByName").mockResolvedValue(null);
    vi.spyOn(
      ExecutionContextApi,
      "getCurrentCommandContext"
    ).mockReturnValue(null as never);
    await expect(
      CompactApi.ensureCommitteeChannel("/domain/terminus/registry")
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();

    // Absent channel WITH an acting giver → mint bound to the group.
    const giver = makeAvatar("op");
    vi.spyOn(
      ExecutionContextApi,
      "getCurrentCommandContext"
    ).mockReturnValue({ commandGiver: giver } as never);
    await expect(
      CompactApi.ensureCommitteeChannel("/domain/terminus/registry")
    ).resolves.toEqual({ name: "terminus-committee" });
    expect(create).toHaveBeenCalledWith(
      giver,
      "terminus-committee",
      GROUP_REF
    );
  });
});
