/**
 * `AccessApi.heldExtents` (content-packs wave 3): every parcel whose
 * holder admits the subject — group membership, organization staff or
 * head (an office holder), a player title — plus the subject's own
 * `/home/<key>`; a subject holding nothing gets only their home; null →
 * nothing.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../idea/AccessRegistry";
import GroupRegistry from "../idea/GroupRegistry";
import Avatar from "../agent/Avatar";
import { Idea } from "../../lib/stuff/Idea";
import { OrganizationMixin } from "../../lib/employment/Organization";
import { AccessApi } from "../../api/access";
import { ParcelApi } from "../../api/parcel";
import { GroupApi } from "../../api/group";
import { EmploymentApi } from "../../api/employment";
import { StuffApi } from "../../api/stuff";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";
import type { ParcelOwner } from "../../lib/parcel/ParcelRecord";
import type { Stuff } from "../../lib/stuff/Stuff";

type Doc = Record<string, unknown> & { _id?: string };
class OrganizationEntity extends OrganizationMixin(Idea) {}

function installInMemoryStore(): void {
  const store: Doc[] = [];
  let seq = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (_c: string, doc: Doc) => {
      const id = doc._id ?? `id-${++seq}`;
      const i = store.findIndex((d) => d._id === id);
      if (i >= 0) store[i] = { ...doc, _id: id };
      else store.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (_c: string, q: Doc) =>
      store.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)),
    ),
    findById: vi.fn(async (_c: string, id: string) => store.find((d) => d._id === id) ?? null),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

async function boot(): Promise<void> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), "/platform/idea/GroupRegistry");
  await groups.postRegister();
  const reg = makeStuffAtPath(() => new AccessRegistry(), "/platform/idea/AccessRegistry");
  await reg.postRegister();
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function record(extent: string, owner: ParcelOwner) {
  return { getExtent: () => extent, getOwner: () => owner };
}

beforeEach(() => {
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
  installInMemoryStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
});

describe("AccessApi.heldExtents", () => {
  it("a group member, an organization staffer, the organization's head, a player title, and everyone's own home", async () => {
    await boot();
    const org = makeStuffAtPath(() => new OrganizationEntity(), "/compact/executive");
    org.appointingAuthority = { kind: "office", office: "prime-minister" };
    vi.spyOn(ParcelApi, "allRecords").mockResolvedValue([
      record("/studio/lounge", { kind: "group", name: "lounge" }),
      record("/studio/terminus", { kind: "group", name: "terminus" }),
      record("/studio", { kind: "organization", templatePath: "/compact/executive" }),
      record("/obj", { kind: "organization", templatePath: "/compact/executive" }),
      record("/plot/17", { kind: "player", templatePath: "/platform/agent/Avatar/alice" }),
    ] as never);
    vi.spyOn(ParcelApi, "resolveOwnerRef").mockImplementation(
      async (o) => (o.kind === "group" ? `managed:${o.name}` : null) as never,
    );
    vi.spyOn(GroupApi, "isMember").mockImplementation(
      async (key: string, ref: string) => ref === "managed:lounge" && key === "/platform/agent/Avatar/alice",
    );
    vi.spyOn(EmploymentApi, "holdsPosition").mockImplementation(
      (s: Stuff | null) => s?.getIdentityPath() === "/platform/agent/Avatar/staffer",
    );
    vi.spyOn(EmploymentApi, "holdsAuthority").mockImplementation(
      async (s: Stuff | null) => s?.getIdentityPath() === "/platform/agent/Avatar/pm",
    );
    const alice = makeAvatar("alice");
    const staffer = makeAvatar("staffer");
    const pm = makeAvatar("pm");
    const nobody = makeAvatar("nobody");
    expect(await AccessApi.heldExtents(alice)).toEqual(["/home/alice", "/plot/17", "/studio/lounge"]);
    expect(await AccessApi.heldExtents(staffer)).toEqual(["/home/staffer", "/obj", "/studio"]);
    expect(await AccessApi.heldExtents(pm)).toEqual(["/home/pm", "/obj", "/studio"]);
    expect(await AccessApi.heldExtents(nobody)).toEqual(["/home/nobody"]);
    expect(await AccessApi.heldExtents(null)).toEqual([]);
  });
});
