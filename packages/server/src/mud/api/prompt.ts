/**
 * PromptApi — server-side prompt substrate.
 *
 * Wave 1 ships the public typed surface — the error class and the
 * `PromptValidator<T>` shape — that later waves compile against.
 * Wave 2 grows this file into the full substrate (resolver map,
 * push lifecycle, validate + retry, cancellation).
 *
 * Pattern reference: `MqlSubscriptionApi` in `api/mql-subscription.ts`.
 * The substrate mirrors the per-Interactive registry + outbound-
 * envelope-via-`MessageApi.sendEnvelope` shape that landed there.
 *
 * See:
 *   - `docs/requirements/prompt-substrate-requirements.md`
 *   - `docs/plans/prompt-substrate-plan.md`
 *   - `docs/slates/prompt-stack-slate.md`
 */

/**
 * Awaiting prompt promises reject with this when the prompt is
 * cancelled — by the player (`prompt-cancel` wire message or the
 * `prompt cancel` verb), by server-side `PromptApi.cancel` /
 * `cancelAll`, or by disconnect cleanup.
 *
 * Codebase precedent: `MqlPermissionError`, `SecurityError`,
 * `ContainmentError`. Typed `Error` subclasses give clean
 * `instanceof` branching at controller catch sites.
 *
 *   try {
 *     const sword = await PromptApi.mqlObject(iact, label, matches);
 *   } catch (err) {
 *     if (err instanceof PromptCancelledError) {
 *       // err.reason discriminates 'cancelled' vs 'host-disconnected'
 *       return abortCommand();
 *     }
 *     throw err;
 *   }
 */
export class PromptCancelledError extends Error {
  constructor(
    public readonly reason: 'cancelled' | 'host-disconnected',
  ) {
    super(`Prompt cancelled: ${reason}`);
    this.name = 'PromptCancelledError';
  }
}

/**
 * Validator predicate for `PromptApi` push opts. Returning `true`
 * resolves the await; returning a string (or a Promise that
 * resolves to one) keeps the prompt alive and emits a
 * `prompt-validation-failed` envelope carrying the message — the
 * client renders the error inline and awaits a fresh response.
 *
 * **Async-permitted** — unlike command validators (which are
 * sync-by-design because the dispatcher's validator pass is sync),
 * prompt validators run inside the prompt's already-async
 * lifecycle. Returning `Promise<true | string>` works naturally;
 * DB-uniqueness checks and external-service look-ups have a home
 * here without a sync + preload pattern.
 *
 * Substrate cancellation safety: if a prompt is cancelled while a
 * validate is in flight, the substrate discards the validator's
 * eventual result (a `cancelled` flag on the resolver record
 * prevents the late `resolve` call).
 *
 * The validator sees the **typed result T**, not the raw wire
 * string. For `confirm`, that's `boolean`; for `mqlObject`,
 * `Stuff | null`; for `mqlMany`, `Stuff[]`. The substrate handles
 * the wire-string-to-T decoding (including `mqlMany` bounds
 * enforcement and `mqlObject` stuffId lookup) BEFORE running the
 * validator.
 */
export type PromptValidator<T> = (
  response: T,
) => true | string | Promise<true | string>;
