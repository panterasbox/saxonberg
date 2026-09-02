// ConnectionLogic — the hot-reloadable logic singleton behind
// ConnectionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import { Application } from '../../../../backend/Application';
import type { EnvelopeTemplate, MessageFrame } from '@saxonberg/types';
import type Interactive from '../Interactive';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import { EventApi } from '../../../api/event';
import { Events } from '../../../lib/events';
import type { ConnectionOrigin } from '../../../api/connection';

const ConnectionApiCallers = SecurityPolicies.FromModule('/api/connection#ConnectionApi'
);
/**
 * The Interactive method surface (Phase E) forwards here as the
 * proxied `Interactive` instance, so the four methods it owns admit
 * that class alongside the Api face.
 */
const ConnectionCallers = SecurityPolicies.AnyOf(
  ConnectionApiCallers,
  SecurityPolicies.FromModule('/platform/idea/Interactive'),
);

/** ISO-3166 alpha-2 → English region display name (e.g. `DE` → `Germany`). */


/**
 * ⭐ **Per-socket inbound sequencing** — two lanes, and the reason
 * there are two.
 *
 * Messages from one socket process in **arrival order**, so a player's
 * commands cannot overtake each other. That is the `ordered` lane, and
 * it serializes by awaiting the previous handler in full.
 *
 * ⚠ A command that raises a prompt does not settle until the prompt is
 * answered — so putting the ANSWER in that lane is a deadlock:
 * `prompt-response` waits for the command, which waits for
 * `prompt-response`. Every interactive prompt raised from inside a
 * command dispatch was unanswerable (`forum post`, `wiki create`, any
 * mid-command disambiguation): a well-formed frame, no error, and a
 * prompt that hung forever.
 *
 * A prompt reply is **addressed by `promptId`, not by position** — an
 * interrupt, which is what a prompt is — so it belongs in a lane of
 * its own. It keeps order against OTHER replies (two answers to two
 * prompts still land in the order they were sent) while never waiting
 * on a command. Bypassing sequencing altogether would have fixed the
 * deadlock too, and would have let a reply interleave with an
 * unrelated queued command on the same socket; a second lane costs one
 * Map and gives that up for nothing.
 *
 * Module-scope so it survives the logic singleton's dest/recreate —
 * the `PromptLogic` registry precedent. An in-flight ordering
 * guarantee that evaporated on hot reload would be a hard bug to see.
 *
 * ⚠ This owns **which lane**, and nothing else. Planting the root
 * frame and the socket's circle scope stays with the caller, because
 * `ExecutionContextApi`'s frame mutators are gated to boundary files
 * (`backend/**`, `mud/api/**`, security, `CommandGiver`) and a logic
 * singleton is not a boundary. That refusal is correct and was worth
 * obeying rather than widening: the transport is where an inbound turn
 * genuinely begins, so that is where its root frame belongs.
 */
const orderedChains = new Map<string, Promise<void>>();
const outOfBandChains = new Map<string, Promise<void>>();

/**
 * Message types that ride the out-of-band lane.
 *
 * The membership test is "is this a reply to work already in flight?"
 * Both answer a specific `promptId`.
 *
 * ⚠ Keep this SMALL. Anything here gives up arrival order against
 * every command on the socket, which is the right trade only for a
 * message that names its own target.
 */
const OUT_OF_BAND_INBOUND: ReadonlySet<string> = new Set([
  'prompt-response',
  'prompt-cancel',
]);

/**
 * ConnectionLogic — the hot-reloadable logic singleton behind
 * {@link ConnectionApi}.
 *
 * Lives at `/platform/idea/api/connection` (a stateless `Stuff` singleton, no
 * backing `Template`); `ConnectionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`) — the inbound
 * lanes above are MODULE state, not instance state, precisely so the
 * singleton can be dest/recreated without losing an in-flight ordering
 * guarantee (the `PromptLogic` registry precedent). Otherwise 0-guts:
 * every method forwards to the privileged `ConnectionManager` and makes
 * no intra-singleton self-calls, so the plain `FromModule` gate
 * suffices.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class ConnectionLogic extends ApiLogic {
  /** See {@link ConnectionApi.getInteractive}. */
  @CallSecurity(ConnectionApiCallers)
  public getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }

  /** See {@link ConnectionApi.sequenceInbound}. */
  @CallSecurity(ConnectionApiCallers)
  public sequenceInbound(
    socketId: string,
    messageType: string,
    run: () => Promise<void>,
  ): void {
    const outOfBand = OUT_OF_BAND_INBOUND.has(messageType);
    const chains = outOfBand ? outOfBandChains : orderedChains;
    const prior = chains.get(socketId) ?? Promise.resolve();
    const next = prior
      .then(() => run())
      .catch((error: unknown) => {
        console.error(
          `ConnectionLogic: inbound '${messageType}' error for socket ` +
            `${socketId}:`,
          error,
        );
      });
    chains.set(socketId, next);
  }

  /** See {@link ConnectionApi.clearInboundSequencing}. */
  @CallSecurity(ConnectionApiCallers)
  public clearInboundSequencing(socketId: string): void {
    orderedChains.delete(socketId);
    outOfBandChains.delete(socketId);
  }

  /** See {@link ConnectionApi.originOf}. */
  @CallSecurity(ConnectionApiCallers)
  public originOf(playerId: string): ConnectionOrigin {
    // Resolve the player's live connection by scanning Interactives for
    // the one whose holder carries this playerId, then read its transient
    // origin. Returns COUNTRY ONLY — the raw IP never leaves the
    // connection layer (the developer-gated IP read is deferred).
    for (const interactive of ConnectionManager.get().getAllInteractives()) {
      const holder = interactive.getHolder();
      if (holder?.getPlayerId() === playerId) {
        const origin = interactive.getOrigin();
        return origin?.country ? { country: origin.country } : {};
      }
    }
    return {};
  }

  /** See {@link ConnectionApi.getAllInteractives}. */
  @CallSecurity(ConnectionApiCallers)
  public getAllInteractives(): Interactive[] {
    return ConnectionManager.get().getAllInteractives();
  }

  /** See {@link ConnectionApi.getConnectionCount}. */
  @CallSecurity(ConnectionApiCallers)
  public getConnectionCount(): number {
    return ConnectionManager.get().getConnectionCount();
  }

  /** See {@link ConnectionApi.hasConnection}. */
  @CallSecurity(ConnectionApiCallers)
  public hasConnection(socketId: string): boolean {
    return ConnectionManager.get().hasConnection(socketId);
  }

  /** See {@link ConnectionApi.getSocketIds}. */
  @CallSecurity(ConnectionApiCallers)
  public getSocketIds(): string[] {
    return ConnectionManager.get().getSocketIds();
  }

  /** See {@link Interactive.transferTo}. */
  @CallSecurity(ConnectionCallers)
  public transfer(
    interactive: Interactive,
    target: HasInteractive & Stuff
  ): void {
    const previous = interactive.getHolder();
    if (previous === target) return;
    const previousLinkdead = previous?.isLinkdead() ?? true;
    const targetLinkdead = target.isLinkdead();

    if (previous) {
      previous.removeInteractive(interactive);
    }
    target.addInteractive(interactive);
    interactive.setHolder(target);

    // Fire Witness hooks AFTER state mutation. Per-connection
    // notifications fire for both endpoints; presence transitions
    // fire only when the count crosses 0.
    if (previous) {
      previous.onConnectionDetached?.();
      if (!previousLinkdead && previous.isLinkdead()) {
        previous.onLinkdead?.();
      }
    }
    target.onConnectionAttached?.(interactive);
    if (targetLinkdead && !target.isLinkdead()) {
      target.onLinkRestored?.();
    }

    // Cross-cutting global event for any observer that doesn't care
    // about a specific holder. Fires once per attach regardless of
    // whether the per-holder Witness hook is implemented.
    EventApi.emit(Events.ConnectionAttached, {
      interactiveId: interactive.stuffId,
      holderId: target.stuffId,
    });
  }

  /** See {@link Interactive.detach}. */
  @CallSecurity(ConnectionCallers)
  public detach(interactive: Interactive): void {
    const previous = interactive.getHolder();
    if (!previous) return;
    const wasConnected = !previous.isLinkdead();
    previous.removeInteractive(interactive);
    interactive.setHolder(null);

    previous.onConnectionDetached?.();
    if (wasConnected && previous.isLinkdead()) {
      previous.onLinkdead?.();
    }
  }

  /** See {@link Interactive.sendMessage}. */
  @CallSecurity(ConnectionCallers)
  public sendMessage(interactive: Interactive, frame: MessageFrame): void {
    Application.get().sendMessageToInteractive(interactive, frame);
  }

  /** See {@link Interactive.sendEnvelope}. */
  @CallSecurity(ConnectionCallers)
  public sendEnvelope(
    interactive: Interactive,
    template: EnvelopeTemplate
  ): void {
    Application.get().sendEnvelopeToInteractive(interactive, template);
  }
}
