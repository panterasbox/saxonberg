/**
 * SubdivideController — the `subdivide <name>` verb (the `system`
 * category). Carves a titled child parcel out of the parcel governing the
 * giver's current location.
 *
 * Flow: resolve the giver's governing parcel (longest-prefix over parcel
 * extents, from the giver's zone path) → gate to the parent-parcel owner
 * via `AccessApi.canMutateZone` (the covering parcel's owner; group →
 * `'owner'` role, player → identity) → mint the child zone via
 * `TemplateApi.saveTemplate(childPath, '/obj/FolderZone', …)` (the
 * `MkdirController` precedent) → write the child parcel row + genesis
 * chain-of-title event via `ParcelApi.subdivide` (owner inherited from the
 * parent). FolderZone-first — spatial (grid sub-region) carve-outs are a
 * deferred 0a non-goal. Both mutations go through `ParcelApi`, the only
 * legitimate caller of `ParcelRegistry`; the acting author for the title
 * event is derived from execution context inside the Api, never here.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { AccessApi } from "../../../api/access";
import { ParcelApi } from "../../../api/parcel";
import { StuffApi } from "../../../api/stuff";
import { TemplateApi } from "../../../api/template";
import { Zone } from "../../../lib/zone/Zone";
import type { Stuff } from "../../../lib/stuff/Stuff";

const TOPIC = "shell.result";

interface SubdivideModel extends CommandModel {
  name?: string;
}

export default class SubdivideController extends CommandController<SubdivideModel> {
  async execute(
    model: SubdivideModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as Stuff;
    const name = (model.name ?? "").trim();
    if (!name) {
      return this.fail(context, "Subdivide what? Name the new area.", "no-name");
    }

    const zonePath = giver.getZone()?.getTemplatePath() ?? "";
    const parent = zonePath
      ? await ParcelApi.coveringParcelOf(zonePath)
      : null;
    if (!parent) {
      return this.fail(
        context,
        "There is no parcel here to subdivide.",
        "no-parcel",
      );
    }

    const parentZone = await this.resolveZone(parent.getZonePath());
    if (!parentZone || !(await AccessApi.canMutateZone(giver, parentZone))) {
      return this.fail(
        context,
        `You don't own ${parent.getExtent()}.`,
        "not-owner",
      );
    }

    const owner = parent.getOwner();
    if (!owner) {
      return this.fail(
        context,
        "This parcel has no owner to inherit.",
        "no-owner",
      );
    }

    const slug = this.slug(name);
    if (!slug) {
      return this.fail(
        context,
        "That name has no usable characters.",
        "bad-name",
      );
    }
    const childPath = `${parent.getExtent()}/${slug}`;

    // Mint the backing zone (FolderZone-first; spatial carve-out deferred).
    try {
      await TemplateApi.saveTemplate(childPath, "/obj/FolderZone", {
        name,
      });
    } catch (err) {
      return this.fail(context, (err as Error).message, "zone-mint-failed");
    }

    await ParcelApi.subdivide(childPath, parent.getExtent(), owner);
    this.send(
      context,
      Mml.compose`\nCarved the parcel ${childPath} out of ${parent.getExtent()}; you hold its title.\n`,
    );
  }

  /** Resolve a zone Stuff from its templatePath, or null. */
  private async resolveZone(path: string): Promise<Zone | null> {
    if (!path) return null;
    try {
      const z = await StuffApi.singleton<Stuff>(path);
      return z instanceof Zone ? z : null;
    } catch {
      return null;
    }
  }

  private slug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
