/**
 * Editor — the Gazette's editor (economic bootstrap D20). Everything about
 * her is content (the row, the dossier, the `prints` beat); the one thing
 * that cannot be is this class: **a verb affordance is a static on a
 * class**, never a field on a row, and `press` — the publishing verb — is
 * afforded by `Avatar` to players and by nothing to an NPC. An editor who
 * cannot type `press post` prints nothing, silently (found by the drive:
 * every beat declined `unknown-verb(press)`).
 *
 * `self`: the verb is hers, wherever she stands.
 */

import { Cast } from "@saxonberg/server/mud/platform/agent/Cast";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

export default class Editor extends Cast {
  static commandContributions: CommandContributions = {
    self: ["platform/cmd/system/press.yaml"],
    peers: [],
    environment: [],
  };
}
