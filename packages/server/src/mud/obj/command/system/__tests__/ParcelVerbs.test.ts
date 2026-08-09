/**
 * SubdivideController / TransferController — the parcel-title verbs
 * (property 0a). Driven as the dispatcher would (a real controller Stuff
 * whose `execute` runs), with the heavy substrate mocked: `ParcelApi`
 * (title store), `AccessApi.canMutateZone` (the owner gate), `TemplateApi`
 * (zone mint), `StuffApi.singleton` (zone resolve), and `PromptApi.confirm`
 * (the receiver's consent). Proves the gating branches + the consent flow +
 * that the title mutation is (or isn't) reached.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SubdivideController from "../SubdivideController";
import TransferController from "../TransferController";
import Avatar from "../../../Avatar";
import { ParcelApi } from "../../../../api/parcel";
import { AccessApi } from "../../../../api/access";
import { TemplateApi } from "../../../../api/template";
import { PromptApi } from "../../../../api/prompt";
import { StuffApi } from "../../../../api/stuff";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import Location from "../../../../lib/stuff/Location";
import FolderZone from "../../../FolderZone";
import { ParcelRecord, type ParcelOwner } from "../../../../lib/parcel/ParcelRecord";
import { Stuff } from "../../../../lib/stuff/Stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** A fake covering parcel with the reads the controllers use. */
function fakeParcel(extent: string, owner: ParcelOwner): ParcelRecord {
  return {
    getExtent: () => extent,
    getZonePath: () => extent,
    getOwner: () => owner,
  } as unknown as ParcelRecord;
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>",
  );
}

function makeContext(giver: Avatar, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: verb,
    executionId: "test",
    commandId: "test",
    verb,
    command: stubCommand(verb),
  });
}

/** Collect the rejection reason a controller noted (or null when none). */
function rejectionReason(ctx: CommandContext): string | null {
  const rej = ctx
    .getNotes()
    .find((n) => n.kind === "controller-rejected") as
    | { kind: string; reason?: string }
    | undefined;
  return rej?.reason ?? null;
}

async function runController(
  controller: SubdivideController | TransferController,
  giver: Avatar,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, "parcel.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return controller.execute(model as never, ctx);
  });
}

const LOUNGE_OWNER: ParcelOwner = { kind: "group", name: "lounge" };

describe("SubdivideController", () => {
  let getZoneSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    // The giver's location resolves to a zone under the lounge parcel.
    getZoneSpy = vi
      .spyOn(Stuff.prototype, "getZone")
      .mockReturnValue({
        getTemplatePath: () => "/domain/lounge/bar",
      } as never);
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue(
      fakeParcel("/domain/lounge", LOUNGE_OWNER),
    );
    // resolveZone → a real FolderZone (so the `instanceof Zone` check holds).
    vi.spyOn(StuffApi, "singleton").mockResolvedValue(
      makeStuffAtPath(() => new FolderZone(), "/domain/lounge") as never,
    );
    vi.spyOn(TemplateApi, "saveTemplate").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    getZoneSpy.mockRestore();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("an owner subdivides: mints the child zone + writes the parcel row", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(true);
    const subdivide = vi
      .spyOn(ParcelApi, "subdivide")
      .mockResolvedValue(null);

    const giver = makeAvatar("dave");
    const ctx = makeContext(giver, "subdivide");
    await runController(
      makeStuff(() => new SubdivideController()),
      giver,
      { name: "East Wing" } as CommandModel,
      ctx,
    );

    expect(TemplateApi.saveTemplate).toHaveBeenCalledWith(
      "/domain/lounge/east-wing",
      "/obj/FolderZone",
      { name: "East Wing" },
    );
    expect(subdivide).toHaveBeenCalledWith(
      "/domain/lounge/east-wing",
      "/domain/lounge",
      LOUNGE_OWNER,
    );
    expect(rejectionReason(ctx)).toBeNull();
  });

  it("refuses a non-owner of the parent parcel", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(false);
    const subdivide = vi.spyOn(ParcelApi, "subdivide").mockResolvedValue(null);

    const giver = makeAvatar("stranger");
    const ctx = makeContext(giver, "subdivide");
    await runController(
      makeStuff(() => new SubdivideController()),
      giver,
      { name: "East Wing" } as CommandModel,
      ctx,
    );

    expect(subdivide).not.toHaveBeenCalled();
    expect(TemplateApi.saveTemplate).not.toHaveBeenCalled();
    expect(rejectionReason(ctx)).toBe("not-owner");
  });

  it("refuses with no name", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(true);
    const giver = makeAvatar("dave");
    const ctx = makeContext(giver, "subdivide");
    await runController(
      makeStuff(() => new SubdivideController()),
      giver,
      {} as CommandModel,
      ctx,
    );
    expect(rejectionReason(ctx)).toBe("no-name");
  });
});

describe("TransferController", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue(
      fakeParcel("/plot/17", LOUNGE_OWNER),
    );
    vi.spyOn(StuffApi, "singleton").mockResolvedValue(
      makeStuffAtPath(() => new FolderZone(), "/plot/17") as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  /** A receiver Avatar with one live Interactive (so consent can be asked). */
  function onlineReceiver(playerId: string): Avatar {
    const av = makeAvatar(playerId);
    vi.spyOn(av, "getInteractives").mockReturnValue(
      new Set([{} as never]),
    );
    return av;
  }

  function recipientModel(receiver: Avatar): CommandModel {
    const target: MqlOneResult = { stuff: receiver as never, raw: "alice" };
    return { parcel: "/plot/17", recipient: target } as unknown as CommandModel;
  }

  it("owner transfers + receiver accepts → the title moves", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(true);
    vi.spyOn(PromptApi, "confirm").mockResolvedValue(true);
    const transfer = vi.spyOn(ParcelApi, "transfer").mockResolvedValue(null);

    const giver = makeAvatar("dave");
    const receiver = onlineReceiver("alice");
    const ctx = makeContext(giver, "transfer");
    await runController(
      makeStuff(() => new TransferController()),
      giver,
      recipientModel(receiver),
      ctx,
    );

    expect(transfer).toHaveBeenCalledWith("/plot/17", {
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    });
    expect(rejectionReason(ctx)).toBeNull();
  });

  it("refuses a non-owner giver (title never moves)", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(false);
    const confirm = vi.spyOn(PromptApi, "confirm").mockResolvedValue(true);
    const transfer = vi.spyOn(ParcelApi, "transfer").mockResolvedValue(null);

    const giver = makeAvatar("stranger");
    const receiver = onlineReceiver("alice");
    const ctx = makeContext(giver, "transfer");
    await runController(
      makeStuff(() => new TransferController()),
      giver,
      recipientModel(receiver),
      ctx,
    );

    expect(confirm).not.toHaveBeenCalled();
    expect(transfer).not.toHaveBeenCalled();
    expect(rejectionReason(ctx)).toBe("not-owner");
  });

  it("refuses when the receiver declines consent", async () => {
    vi.spyOn(AccessApi, "canMutateZone").mockResolvedValue(true);
    vi.spyOn(PromptApi, "confirm").mockResolvedValue(false);
    const transfer = vi.spyOn(ParcelApi, "transfer").mockResolvedValue(null);

    const giver = makeAvatar("dave");
    const receiver = onlineReceiver("alice");
    const ctx = makeContext(giver, "transfer");
    await runController(
      makeStuff(() => new TransferController()),
      giver,
      recipientModel(receiver),
      ctx,
    );

    expect(transfer).not.toHaveBeenCalled();
    expect(rejectionReason(ctx)).toBe("declined");
  });
});
