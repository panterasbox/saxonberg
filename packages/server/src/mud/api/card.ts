/**
 * CardApi — the card surface's one gated face.
 *
 * ⭐⭐ **One birth path.** A card exists because a **command** caused the
 * server to push it. The client no longer infers a card from a changed
 * query result, and it cannot open one at the wire level either —
 * `MqlSubscribeMessage` has no field that would name a card, only the
 * one `chrome: 'self'` shelf subscription.
 *
 * ⭐ **Two independent axes.** *Pinned* is the whole lifetime rule
 * (unpinned cards age out of a relevance window; pinned cards stay until
 * dismissed). *Live* is orthogonal and opt-in — a card is static by
 * default, resolved once and stamped with when. All four combinations
 * are meaningful, and neither implies the other.
 *
 * The state lives on the `CardRegistry` singleton at `/obj/CardRegistry`;
 * the orchestration lives in the hot-reloadable {@link CardLogic}
 * singleton at `/obj/api/card`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/card` reloads the logic
 * without closing anybody's cards.
 *
 * See [card-surface.md](../../../../docs/subsystems/card-surface.md).
 */

import type { CardCloseReason, CardId } from '@saxonberg/types';
import type Interactive from '../obj/Interactive';
import type { CardOpenOptions } from '../obj/CardRegistry';
import type { CommandContext } from './command';
import { SecurityApi } from './security';
import { MixinApi } from './mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import { ScheduleApi, type ScheduleHandle } from './schedule';
import { ExecutionContextApi } from './execution-context';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CardLogic } from '../obj/api/CardLogic';
import { CARDS, CARDS_BY_NAME } from '../lib/connection/Cards';
import type { CardDefinition, CardSource } from '../lib/connection/Cards';
import { fileURLToPath } from 'url';

export type { CardOpenOptions };
export type { CardDefinition, CardSource };
export { CARDS, CARDS_BY_NAME };

// DI seam: re-exported so `CardRegistry` registers its class through this
// facade rather than importing the logic singleton directly (the
// no-import-from-*Logic rule). Pure pass-through re-export.
export { registerCardRegistryClass } from '../obj/api/CardLogic';

const LOGIC_PATH = '/obj/api/card';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/CardLogic', import.meta.url),
);

/**
 * The sweep's FALLBACK window, in ms — reached only for a holder that
 * carries no settings schema at all.
 *
 * ⭐ The window itself is the **`cards.window` setting** (600 s), read
 * per player inside the sweep. One number, one home: a constant that
 * could disagree with the setting would be the one the player cannot
 * see, quietly in force.
 *
 * ⚠ **The cadence is not the window.** A coarse sweep with a fine window
 * is the residency shape: the sweep is how often we look, the window is
 * how long a card stays relevant, and conflating them means changing one
 * silently changes the other.
 */
const DEFAULT_WINDOW_MS = 10 * 60_000;

/** How often the sweep looks. See the note on {@link DEFAULT_WINDOW_MS}. */
const SWEEP_INTERVAL_MS = 30_000;

/**
 * The one recurring sweep handle. Module-level rather than on the logic
 * singleton so it survives an HMR reload of the logic — reinstalling on
 * every `dest` would be a second clock, which is the exact failure this
 * sweep exists to avoid.
 */
let sweepHandle: ScheduleHandle | null = null;

/** Resolve the HMR-able CardLogic singleton (sync). */
function logic(): CardLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CardLogic',
      ) as typeof CardLogic | null) ?? CardLogic)(),
  );
}

export class CardApi {
  private constructor() {}

  /**
   * Boot seam (idempotent): install the relevance-window sweep. One
   * recurring callback for the whole card set — never a timer per card.
   */
  public static boot(): void {
    if (sweepHandle) return;
    /*
     * ⚠ **The sweep runs as the logic singleton, explicitly re-planted.**
     * A scheduled callback fires long after the frame that installed it,
     * so the execution context has no target and the registry's own gate
     * would deny every tick — silently, because a scheduled callback has
     * nobody to report to. `runRoot` puts the principal back, which is
     * the same thing the MQL drain does for circle scope.
     */
    const principal = logic();
    sweepHandle = ScheduleApi.recurring(SWEEP_INTERVAL_MS, () => {
      ExecutionContextApi.runRoot(principal, 'card.sweep', () => {
        principal.sweepNow(DEFAULT_WINDOW_MS);
      });
    });
  }

  /**
   * ⭐⭐ **Open a card from a running command, or touch the one that
   * already carries its key.**
   *
   * Called **from the controller**, because only the controller knows
   * the resolved operand (`look`'s target, `wiki`'s slug, `help`'s
   * topic) and the prose it just emitted. The YAML `opens_card:`
   * declaration is the **gate**, not decoration: this throws when the
   * running command's view did not declare the card — so the vocabulary
   * stays declarative and greppable while the call site stays where the
   * subject is known.
   *
   * Returns the card's instance id, or `null` when there is no viewer.
   */
  public static open(
    context: CommandContext,
    cardId: CardId,
    opts: Omit<CardOpenOptions, 'key'> & { key?: string } = {},
  ): string | null {
    /*
     * ⚠⚠ **A forced command carries no `interactive`, and arrival is a
     * forced command.**
     *
     * `context.interactive` is *the connection that originated the
     * command*, and it is genuinely optional: `Mobile.autoSenseOnArrival`
     * forces a `sense` from inside the traverse, so nothing originated it
     * from a socket. Read literally, that made every room card born of
     * WALKING return `null` — silently, because a null open is how a
     * card politely declines. Every room card came from the arrangement
     * or a typed `look`, and walking around simply mutated the one.
     *
     * A card belongs to the PLAYER, not to the keystroke, so fall back
     * to the giver's own connections. A giver with several (multiplexed
     * sessions) gets the card on each, which is the same thing every
     * other push does.
     */
    const interactive =
      context.interactive ?? CardApi.#interactiveFor(context.commandGiver);
    if (!interactive) return null;
    const declared = context.command?.opensCards ?? [];
    if (!declared.includes(cardId)) {
      throw new Error(
        `CardApi.open: '${context.verb}' did not declare opens_card: ` +
          `${cardId}` +
          (declared.length
            ? ` (it declares ${declared.join(', ')})`
            : ' (it declares none)'),
      );
    }
    const key = opts.key ?? CardApi.keyFor(context, cardId);
    return logic().open(interactive, cardId, { ...opts, key });
  }

  /**
   * The giver's own connection, for a command nobody typed.
   *
   * ⚠ First of the set: a multiplexed player has several, and the card
   * substrate is per-Interactive. Pushing to one is the shape every
   * other single-connection surface already has; fanning out is a
   * separate decision from making arrival work at all.
   */
  static #interactiveFor(giver: Stuff | null): Interactive | null {
    if (!giver || !MixinApi.isHasInteractive(giver)) return null;
    for (const i of giver.getInteractives()) return i;
    return null;
  }

  /**
   * Push a card with no running command — the arrangement resolver at a
   * mode switch or at login, and the prompt substrate.
   *
   * ⚠ No `opens_card` gate here, because there is no command view to
   * carry one. The caller is server code by construction: `push` is
   * unreachable from a controller's own dispatch, which is where a
   * client-influenced call could come from.
   */
  public static push(
    interactive: Interactive,
    cardId: CardId,
    opts: CardOpenOptions = {},
  ): string | null {
    return logic().open(interactive, cardId, opts);
  }

  /**
   * The normalized command this context would key a card on — the dedup
   * identity. Exposed so a controller can compute the key once and reuse
   * it (`touch` takes a key, not a context).
   */
  public static keyFor(context: CommandContext, cardId: CardId): string {
    const normalized = logic().normalizeKey(context);
    return normalized || CARDS[cardId].command;
  }

  /** Bring a card forward and reset its window; re-resolve if static. */
  public static touch(
    interactive: Interactive,
    key: string,
    opts: CardOpenOptions = {},
  ): boolean {
    return logic().touchCard(interactive, key, opts);
  }

  /**
   * Pin / unpin, resolving `cardRef` by catalogue name first and
   * instance id second. `null` hands the decision back to the
   * catalogue's own default.
   */
  public static setPinned(
    interactive: Interactive,
    cardRef: string,
    pinned: boolean | null,
  ): boolean {
    return logic().setPinned(interactive, cardRef, pinned);
  }

  /** Close one card, stating the reason. */
  public static close(
    interactive: Interactive,
    instanceId: string,
    reason: CardCloseReason,
  ): boolean {
    return logic().close(interactive, instanceId, reason);
  }

  /** The open cards for one interactive — `cockpit card list`'s report. */
  public static list(interactive: Interactive): {
    instanceId: string;
    cardId: CardId;
    key: string;
    pinned: boolean;
    live: boolean;
  }[] {
    return logic().list(interactive);
  }

  /**
   * ⭐⭐ Open exactly the cards an arrangement names — the SERVER
   * resolving a workspace, not the client replaying it. Returns the
   * (opened, closed) counts for the verb's report.
   */
  public static applyArrangement(
    interactive: Interactive,
    cards: readonly CardId[],
  ): { opened: number; closed: number } {
    return logic().applyArrangement(interactive, cards);
  }

  /**
   * ⭐ A prompt settled — close the card waiting on it, with reason
   * `answered`. This is where the retired `unanswered` hold's guarantee
   * lives: a prompt card opens pinned, so nothing else can end it.
   */
  public static notifyPromptSettled(
    interactive: Interactive,
    promptId: string,
  ): void {
    logic().notifyPromptSettled(interactive, promptId);
  }

  /** Drop every card for an interactive (disconnect). No envelopes. */
  public static cancelAllForInteractive(interactive: Interactive): void {
    logic().cancelAllForInteractive(interactive);
  }

  /** Whether the catalogue declares this card live. */
  public static isLive(cardId: CardId): boolean {
    return logic().isLive(cardId);
  }

  /* ─── test seams ─── */

  public static _sweepNowForTesting(windowMs: number, now?: number): number {
    SecurityApi.assertTestOnly('_sweepNowForTesting');
    return logic().sweepNow(windowMs, now);
  }

  public static _getSizeForTesting(): number {
    SecurityApi.assertTestOnly('_getSizeForTesting');
    return logic()._getSize();
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAll();
  }

  /**
   * The AC-8 seam: how many recurring handles the sweep owns. One for
   * the whole set, or none — never one per card.
   */
  public static _sweepHandleCountForTesting(): number {
    SecurityApi.assertTestOnly('_sweepHandleCountForTesting');
    return sweepHandle ? 1 : 0;
  }

  /** Drop the sweep handle so a test can assert the install path again. */
  public static _resetSweepForTesting(): void {
    SecurityApi.assertTestOnly('_resetSweepForTesting');
    if (sweepHandle) ScheduleApi.cancel(sweepHandle);
    sweepHandle = null;
  }
}

SecurityApi.decorateApiClass(CardApi);
