/**
 * App — a piece of software an aether host runs.
 *
 * The one class every app is (aether-devices D2, D2a): an incorporeal
 * `Idea` bound to its host for life (`AetherHostedMixin`), with a name a
 * player reads. A host installs one by row path (`installApp`) and lists
 * it by name (`apps`, `look`). An app's key — what `apps install <key>`
 * types — is the last segment of its row path.
 *
 * **Messages** is the thinnest app: the row `/platform/idea/app/messages`
 * on this class and nothing else. It does nothing by itself — it is what
 * the person's comms (`CommsMixin`, on the person) looks for on the host
 * that would carry a message. The forums, the wallet and the calendar are
 * apps with a capability mixin of their own (`ForumsApp`, `WalletApp`,
 * `CalendarApp`), installed on the person.
 *
 * Carries no persistent state: an app instance is re-cloned into its host
 * from the host's persisted installed list.
 */

import { Idea } from "../../lib/stuff/Idea";
import { AetherHostedMixin } from "../../lib/augmentation/AetherHosted";
import { TemplatePaths } from "../../lib/paths";
import type { FieldMeta } from "../../lib/mixin";

export default class App extends AetherHostedMixin(Idea) {
  /** The Messages row — the app the person's comms looks for. */
  static readonly MESSAGES_PATH = TemplatePaths.messagesApp;

  /**
   * ⚠ Authored on the row and declared so the template phase applies it.
   * The store itself reads the ROW (`AppStore`), so an app instance never
   * consults this — it is declared so the row field is a known one.
   */
  static fieldMeta: FieldMeta = {
    published: { persistent: true, authorable: true },
  };

  /** Authored: in the app store (stream arrival D21). */
  published = false;
}
