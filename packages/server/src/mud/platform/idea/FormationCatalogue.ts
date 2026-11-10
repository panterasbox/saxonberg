/**
 * FormationCatalogue — the singleton that serves the `formation` documents
 * (how a party fights: `vanguard`, `focus-fire`, `master-apprentice`, any
 * pack's `content/formations/`), reached as `PartyApi.formations()`. What
 * a formation IS: `lib/combat/Formation.ts`.
 *
 * ⭐ A party names its formation by path and holds it resident (its
 * setter asserts it); a captain's `party adopt <word>` resolves the word
 * with {@link FormationCatalogue.pathOfWord}.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import {
  type AllocationKind,
  type CoupCall,
  type FormationPolicy,
  type InterceptTrigger,
} from '../../lib/combat/Formation';

const ALLOCATION_KINDS: readonly AllocationKind[] = [
  'sustain',
  'called',
  'primary',
];
const INTERCEPT_TRIGGERS: readonly InterceptTrigger[] = [
  'none',
  'any',
  'high-threat',
];
const COUP_CALLS: readonly CoupCall[] = ['engaged', 'captain'];

export default class FormationCatalogue extends DocumentCatalogue<FormationPolicy> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'formation';

  /** Validate a formation document at `path` into its frozen policy (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): FormationPolicy {
    const fail = (why: string): never => {
      throw new TypeError(`formation '${path}': ${why}`);
    };
    const list = (v: unknown, field: string): readonly string[] => {
      const arr = Array.isArray(v) ? v : [];
      const seen = new Set<string>();
      for (const x of arr) {
        if (typeof x !== 'string' || x.length === 0) fail(`${field} entries must be non-empty strings`);
        if (seen.has(x as string)) fail(`${field} has a duplicate entry '${String(x)}'`);
        seen.add(x as string);
      }
      return Object.freeze([...(arr as string[])]);
    };
    const allocation = (data.allocation ?? 'sustain') as AllocationKind;
    if (!ALLOCATION_KINDS.includes(allocation)) fail(`allocation '${String(allocation)}' is not one of ${ALLOCATION_KINDS.join(', ')}`);
    const interceptTrigger = (data.interceptTrigger ?? 'none') as InterceptTrigger;
    if (!INTERCEPT_TRIGGERS.includes(interceptTrigger)) fail(`interceptTrigger '${String(interceptTrigger)}' is not one of ${INTERCEPT_TRIGGERS.join(', ')}`);
    const coupCall = (data.coupCall ?? 'engaged') as CoupCall;
    if (!COUP_CALLS.includes(coupCall)) fail(`coupCall '${String(coupCall)}' is not one of ${COUP_CALLS.join(', ')}`);
    const coupRight = typeof data.coupRight === 'string' && data.coupRight ? data.coupRight : 'engaged';
    return Object.freeze({
      name: path.slice(path.lastIndexOf('/') + 1),
      roles: list(data.roles, 'roles'),
      allocation,
      primaryRole: typeof data.primaryRole === 'string' ? data.primaryRole : '',
      protectsRoles: list(data.protectsRoles, 'protectsRoles'),
      interceptorRoles: list(data.interceptorRoles, 'interceptorRoles'),
      interceptTrigger,
      coupRight,
      coupCall,
    });
  }

  /** The PATH of the formation a captain's typed word names, or `null` (and it is then resident). */
  public async pathOfWord(word: string): Promise<string | null> {
    const hits = await this.byWord(word);
    return hits[0]?.path ?? null;
  }
}
