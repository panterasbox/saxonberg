/**
 * CarrierBusiness — ⭐⭐ **a business that files paper when its work is
 * done**, and the reason the contract substrate needs to know nothing
 * about freight.
 *
 * A carrier is an ordinary `Business` in every respect but one: when a
 * gig it posted settles, somebody carried something somewhere, and that
 * is a **bill of lading**. A player who claims a haul gig and delivers
 * it must file the same paper `ship` at a counter does — D16 makes the
 * gig the DOMINANT carriage path, so paper filed only by the counter and
 * the NPC brain would leave the whole freight-reporting spine blind to
 * most freight in the realm.
 *
 * ## ⚠⚠ Why this class exists instead of a bus event
 *
 * It was `contract.settled`, a global event with exactly ONE emitter and
 * ONE subscriber, and the kernel paid three times for it: an entry in
 * the `Events` vocabulary, an event interface shaped around this pack's
 * fields, and an `emittableBy()` policy left **open** so anything in the
 * realm could forge "a gig settled".
 *
 * ⭐ The replacement is ordinary inheritance. `BusinessTrade` declares
 * `onContractSettled` as a `@hook` with a no-op terminal — the
 * `Stuff.onDestruct` shape — the substrate calls it on **the issuer and
 * nobody else**, and this class overrides it. Narrower in every
 * direction: only the party that posted the work hears, nothing can
 * announce on its behalf, and the kernel learns no new nouns.
 *
 * ⚠ Not a duck-typed probe either. The hook is on the interface, so a
 * subclass that mistypes the name fails to compile instead of silently
 * never being called — which is the failure mode this build has already
 * paid for twice.
 */

import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { ContractRecord } from '@saxonberg/server/mud/lib/employment/ContractRecord';
import type WaybillRegistry from './WaybillRegistry';
import { WAYBILL_REGISTRY_PATH } from '../lib/haulage/ShipmentDesk';

export default class CarrierBusiness extends BusinessEntity {
  /**
   * @hook A gig this carrier posted has settled — file the bill.
   *
   * ⚠ Fire-and-forget by contract: the money has already moved when this
   * runs, so a failure here must not unwind a completed contract. The
   * substrate swallows and logs; this method must not be the place a
   * settle can fail.
   */
  public override async onContractSettled(
    record: ContractRecord,
  ): Promise<void> {
    await super.onContractSettled(record);
    const registry = await StuffApi.singleton<WaybillRegistry>(
      WAYBILL_REGISTRY_PATH,
    ).catch(() => null);
    if (!registry) return;
    await registry.fileForSettledGig(record);
  }
}
