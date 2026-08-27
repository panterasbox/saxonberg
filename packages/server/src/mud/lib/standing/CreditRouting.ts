/**
 * CreditRouting — the producer-credit routing seam (Layer 1: authorship →
 * Layer 2: faucet). Given the template path of the location where a player
 * engaged, resolve **who gets producer credit** and in what share.
 *
 * The split is deliberate: this layer answers *whom to credit* (authorship +
 * the released-content gate); the producer faucet answers *how much* (the
 * decayed attributed-bucket count). v1 returns a single owner; the deferred
 * team / co-authorship split returns a weighted vector behind the **same**
 * `CreditShare[]` seam, so Layer 2 (the faucet) is built once and untouched.
 *
 * **Released-content gate.** Only content in the released namespace earns:
 * a player's personal homedir (`/home/…`) earns nothing (an unreleased
 * sandbox). Everything else — `/world/…` content AND `/obj/…` (which is
 * released, core content) — is released. This is the zero-new-infra v1 gate
 * (a path prefix); the richer team-sandbox + explicit `release` action is
 * deferred with the team split.
 *
 * Pure routing — reads the gated `ZoneApi` (covering zone) and
 * `ProvenanceApi` (the authorship ledger), no side effects, no stored state.
 */

import { ZoneApi } from '../../api/zone';
import { ProvenanceApi } from '../../api/provenance';

/** One author's share of producer credit for an engagement. */
export interface CreditShare {
  /** The credited author's durable `templatePath`. */
  author: string;
  /** The fraction of credit (v1 always 1; the team-split seam). */
  weight: number;
}

/** Namespace prefixes that earn no producer credit (unreleased content). */
const UNRELEASED_PREFIXES = ['/home/'] as const;

export class CreditRouting {
  /**
   * Whether a content path is in the released namespace (earns credit). Only
   * a player's personal homedir (`/home/…`) is unreleased; `/world/…` and
   * `/obj/…` (released core content) both earn.
   */
  static isReleased(path: string): boolean {
    return !UNRELEASED_PREFIXES.some((p) => path.startsWith(p));
  }

  /**
   * Resolve the producer-credit shares for an engagement at
   * `locationTemplatePath`: the covering zone's author, gated to released
   * content. Returns `[]` when there is no covering zone, the zone is
   * unreleased, or the zone has no recorded author (engine / unauthored).
   */
  static async resolve(
    locationTemplatePath: string
  ): Promise<CreditShare[]> {
    const zone = await ZoneApi.resolveZoneForPath(locationTemplatePath);
    const zonePath = zone?.getTemplatePath();
    if (!zonePath) return [];
    if (!CreditRouting.isReleased(zonePath)) return [];
    const author = await ProvenanceApi.authorOf(zonePath);
    if (!author) return [];
    return [{ author, weight: 1 }];
  }
}
