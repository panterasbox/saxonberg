/**
 * DialogueEffectRegistry — the extension seam the dialogue-tree format promises
 * but the intrinsic vocabulary can't provide: a place for a **domain** to add a
 * dialogue effect verb without reopening the generic format.
 *
 * The intrinsic effects (`set-state` / `regard` / `say` / `emote` / `goto` /
 * `end` / `dispatch`) are conversation primitives — they manipulate the
 * conversation itself and stay hardcoded in {@link DialogueConversation}. A
 * *domain* effect (banking's `bank-circle`, a future quest's `grant-quest`) is
 * a world-action a domain owns; it registers a handler HERE, so the generic
 * substrate never imports the domain. The dependency runs the right way —
 * consumer → substrate — and a content author's dialogue-tree schema stays free
 * of domain vocabulary except what a domain has deliberately registered.
 *
 * A handler validates its own effect shape (for the CMS save-gate + defensive
 * open) and applies it against a lean context (the two actors + the raw effect
 * data). It intentionally does NOT get the conversation's private machinery —
 * a domain effect is a world write, not a conversation-flow manipulation.
 */

import type { Stuff } from "../stuff/Stuff";

/** What a registered domain-effect handler is called with. */
export interface DialogueEffectContext {
  /** The NPC driving the conversation. */
  readonly npc: Stuff;
  /** The interlocutor. */
  readonly player: Stuff;
  /** The raw authored effect object (already `verb`-matched). */
  readonly effect: Readonly<Record<string, unknown>>;
}

/** A domain's handler for one registered effect verb. */
export interface DialogueEffectHandler {
  /** Structural check for the CMS save-gate; return errors, `[]` if valid. */
  validate?(effect: Record<string, unknown>): string[];
  /** Perform the world-action. */
  apply(ctx: DialogueEffectContext): void | Promise<void>;
}

export class DialogueEffectRegistry {
  private static handlers = new Map<string, DialogueEffectHandler>();

  /** Register a domain effect verb (idempotent overwrite — HMR-safe). */
  static register(verb: string, handler: DialogueEffectHandler): void {
    DialogueEffectRegistry.handlers.set(verb, handler);
  }

  /** Whether `verb` is a registered domain effect. */
  static has(verb: string): boolean {
    return DialogueEffectRegistry.handlers.has(verb);
  }

  /** The handler for `verb`, or undefined. */
  static get(verb: string): DialogueEffectHandler | undefined {
    return DialogueEffectRegistry.handlers.get(verb);
  }

  /** Validate a domain effect: unknown verb → one error; else the handler's. */
  static validate(verb: string, effect: Record<string, unknown>): string[] {
    const handler = DialogueEffectRegistry.handlers.get(verb);
    if (!handler) return [`'${verb}' is not a registered effect`];
    return handler.validate?.(effect) ?? [];
  }
}
