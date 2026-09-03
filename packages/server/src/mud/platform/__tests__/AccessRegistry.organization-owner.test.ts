/**
 * The `organization`-kind title holder (content-packs wave 3, D2): a
 * parcel held by an OrganizationMixin host admits everyone holding a
 * non-exited position there AND its appointing authority (the head —
 * an office, founder default included). A non-member, an exited position,
 * an empty seat and a non-resident organization all fail CLOSED.
 * `canMutateZone` treats staff-or-head as the `'owner'` role.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../idea/AccessRegistry";
import GroupRegistry from "../idea/GroupRegistry";
import FolderZone from "../idea/FolderZone";
import Avatar from "../agent/Avatar";
import { Idea } from "../../lib/stuff/Idea";
import { OrganizationMixin } from "../../lib/employment/Organization";
import { AccessApi } from "../../api/access";
import { ParcelApi } from "../../api/parcel";
import { EmploymentApi } from "../../api/employment";
import { DiagnosticApi } from "../../api/diagnostics";
import { StuffApi } from "../../api/stuff";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";
import type { Stuff } from "../../lib/stuff/Stuff";
import { EmploymentLogic } from '../idea/api/EmploymentLogic';

type Doc = Record<string, unknown> & { _id?: string };

class OrganizationEntity extends OrganizationMixin(Idea) {}

const ORG = "/compact/executive";

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

async function bootRegistry(): Promise<AccessRegistry> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), "/platform/idea/GroupRegistry");
  await groups.postRegister();
  const reg = makeStuffAtPath(() => new AccessRegistry(), "/platform/idea/AccessRegistry");
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function mountOrganization(): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
  org.appointingAuthority = { kind: "office", office: "prime-minister" };
  return org;
}

/** Title fixture: everything under /obj is held by the executive. */
function stubOrganizationTitle(): void {
  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "organization",
    templatePath: ORG,
  } as never);
}

/** Staff = the listed identity paths; head = the listed identity paths. */
function stubChart(staff: string[], heads: string[]): void {
  vi.spyOn(EmploymentLogic.prototype, "holdsPosition").mockImplementation(
    (subject: Stuff | null) =>
      subject !== null && staff.includes(subject.getIdentityPath() ?? ""),
  );
  vi.spyOn(EmploymentApi, "holdsAuthority").mockImplementation(
    async (subject: Stuff | null, ref) =>
      subject !== null &&
      ref?.kind === "office" &&
      heads.includes(subject.getIdentityPath() ?? ""),
  );
}

beforeEach(() => {
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
  installInMemoryStore();
  vi.spyOn(DiagnosticApi, "record").mockResolvedValue(undefined as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
});

describe("an organization-held title", () => {
  it("admits a position holder and the head; refuses a non-member", async () => {
    await bootRegistry();
    mountOrganization();
    stubOrganizationTitle();
    const staffer = makeAvatar("staffer");
    const pm = makeAvatar("pm");
    const nobody = makeAvatar("nobody");
    stubChart(["/platform/agent/Avatar/staffer"], ["/platform/agent/Avatar/pm"]);
    expect(await AccessApi.canAtPath(staffer, "write-template", "/obj/x")).toBe(true);
    expect(await AccessApi.canAtPath(pm, "write-template", "/obj/x")).toBe(true);
    expect(await AccessApi.canAtPath(nobody, "write-template", "/obj/x")).toBe(false);
  });

  it("an exited position no longer holds (the chart decides, not history)", async () => {
    await bootRegistry();
    mountOrganization();
    stubOrganizationTitle();
    const fired = makeAvatar("fired");
    // holdsPosition already excludes exited holders; a stub that says "no"
    // is exactly what the one holder-resolution path answers after a fire.
    stubChart([], []);
    expect(await AccessApi.canAtPath(fired, "write-template", "/obj/x")).toBe(false);
  });

  it("an empty seat fails closed — no head, no staff, nobody", async () => {
    await bootRegistry();
    mountOrganization();
    stubOrganizationTitle();
    const founder = makeAvatar("founder");
    stubChart([], []);
    expect(await AccessApi.canAtPath(founder, "write-template", "/obj/x")).toBe(false);
  });

  it("a non-resident organization fails closed, with one diagnostic per path", async () => {
    await bootRegistry();
    // No organization mounted at ORG.
    stubOrganizationTitle();
    const pm = makeAvatar("pm");
    stubChart(["/platform/agent/Avatar/pm"], ["/platform/agent/Avatar/pm"]);
    expect(await AccessApi.canAtPath(pm, "write-template", "/obj/x")).toBe(false);
    expect(await AccessApi.canAtPath(pm, "write-template", "/obj/y")).toBe(false);
    expect(DiagnosticApi.record).toHaveBeenCalledTimes(1);
    expect(vi.mocked(DiagnosticApi.record).mock.calls[0]?.[0]).toMatchObject({
      channel: "access.organization-owner",
      path: ORG,
    });
  });

  it("a resident non-organization at the path fails closed too", async () => {
    await bootRegistry();
    makeStuffAtPath(() => new Idea(), ORG);
    stubOrganizationTitle();
    const pm = makeAvatar("pm");
    stubChart(["/platform/agent/Avatar/pm"], ["/platform/agent/Avatar/pm"]);
    expect(await AccessApi.canAtPath(pm, "write-template", "/obj/x")).toBe(false);
  });

  it("canMutateZone on an organization-held zone admits staff and head", async () => {
    await bootRegistry();
    mountOrganization();
    stubOrganizationTitle();
    const zone = makeStuffAtPath(() => new FolderZone(), "/obj/gear");
    const staffer = makeAvatar("staffer");
    const pm = makeAvatar("pm");
    const nobody = makeAvatar("nobody");
    stubChart(["/platform/agent/Avatar/staffer"], ["/platform/agent/Avatar/pm"]);
    expect(await AccessApi.canMutateZone(staffer, zone)).toBe(true);
    expect(await AccessApi.canMutateZone(pm, zone)).toBe(true);
    expect(await AccessApi.canMutateZone(nobody, zone)).toBe(false);
  });

  it("`can` over a resource in an organization-held zone dispatches the same way", async () => {
    await bootRegistry();
    mountOrganization();
    stubOrganizationTitle();
    const zone = makeStuffAtPath(() => new FolderZone(), "/obj/gear");
    const staffer = makeAvatar("staffer");
    stubChart(["/platform/agent/Avatar/staffer"], []);
    expect(await AccessApi.can(staffer, "write", zone)).toBe(true);
  });
});
