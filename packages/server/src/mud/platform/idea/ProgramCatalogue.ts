/**
 * ProgramCatalogue — the singleton that serves the `program` documents
 * (`/platform/programs/<short-name>`), reached as `StreamApi.programs()`.
 * What a program IS: `lib/livestream/Program.ts`.
 *
 * ⭐ A program is named by its path and loaded on reach (documents D7): a
 * body running one cites it (`BroadcastMixin.streamProgram`'s setter returns
 * `ensure`), so it is resident whenever the body is and the overlay's
 * synchronous reads (`StreamApi.channelsFor`) stand.
 *
 * ⚠ Unlike most families a program CHANGES at runtime, whenever its owner
 * types. `StreamLogic` — the one writer — `remember`s the record it just
 * saved, so a resident program is never stale and never missing.
 */

import { DocumentCatalogue } from "../../lib/document/DocumentCatalogue";
import type { BoundaryRole } from "../../lib/security/BoundaryRole";
import type { BroadcastService } from "../../lib/livestream/Broadcast";
import {
  Program,
  PROGRAM_NAME_RE,
  PROGRAMS_BRANCH,
  type ProgramFeed,
  type ProgramFeeds,
} from "../../lib/livestream/Program";

export default class ProgramCatalogue extends DocumentCatalogue<Program> {
  /** A register everyone reads (a program's facts are public). */
  static boundaryRole: BoundaryRole = "commons";

  protected readonly kind = "program";

  /** Validate a program document at `path`; throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): Program {
    const prefix = `${PROGRAMS_BRANCH}/`;
    const name = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    if (!PROGRAM_NAME_RE.test(name)) {
      throw new Error(`program '${path}': not a program path`);
    }
    const text = (v: unknown): string => (typeof v === "string" ? v : "");
    const owner = text(data.owner);
    if (owner.length === 0) throw new Error(`program '${path}': no owner`);
    // The feeds as the one writer wrote them (`StreamLogic`, typed by
    // carrier) — read, not re-filtered against a kernel list.
    const feeds: ProgramFeeds = {};
    const raw = (data.feeds ?? {}) as Record<string, unknown>;
    for (const [carrier, value] of Object.entries(raw)) {
      const feed = feedOf(value);
      if (feed) feeds[carrier as BroadcastService] = feed;
    }
    const runner = typeof data.runner === "string" && data.runner.length > 0 ? data.runner : null;
    return new Program(name, {
      title: text(data.title),
      owner,
      ownerName: text(data.ownerName),
      schedule: text(data.schedule),
      feeds,
      runner,
    });
  }
}

/** One stored feed, or null when it is not one. */
function feedOf(v: unknown): ProgramFeed | null {
  if (!v || typeof v !== "object") return null;
  const f = v as Record<string, unknown>;
  if (typeof f.channel !== "string" || f.channel.length === 0) return null;
  return {
    channel: f.channel,
    provenBy: typeof f.provenBy === "string" ? f.provenBy : "",
    provenAt: typeof f.provenAt === "number" ? f.provenAt : 0,
  };
}
