/**
 * Audit log shim — structured `console.warn` until MudlogApi exists.
 *
 * Every security denial, shadow install/detach, and destroyed-object
 * access funnels through `audit.emit(record)` so call sites are
 * already in the structured form when MudlogApi lands. At that point
 * the body of `emit` swaps from `console.warn(JSON.stringify(...))`
 * to `MudlogApi.write(record)` and nothing else changes.
 *
 * Decoupled from `ExecutionContext` on purpose: errors during the
 * loader hook (e.g. `validateNoFinalOverrides` throwing) need to log
 * before any frame stack exists. `audit.emit` must work without a
 * call-stack context.
 */

export type AuditKind =
  | 'security_deny'
  | 'shadow_attached'
  | 'shadow_detached'
  | 'shadow_cleared'
  | 'destroyed_access'
  | 'final_violation';

export interface AuditRecord {
  kind: AuditKind;
  /** Message-like summary for human readers; the structured fields below carry the data. */
  message: string;
  /** Free-form structured payload — whatever the call site wants to capture. */
  details?: Record<string, unknown>;
}

export const audit = {
  emit(record: AuditRecord): void {
    // eslint-disable-next-line no-console
    console.warn('[callsec]', JSON.stringify(record));
  },
};
