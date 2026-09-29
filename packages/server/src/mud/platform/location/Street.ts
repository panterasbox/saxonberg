/**
 * Street — ⭐⭐ **a public way, which is the only kind of place a town
 * lights.**
 *
 * The one thing this class adds over {@link SingletonCartesianLocation}
 * is {@link PublicLightingMixin}: a row declares that the lighting
 * service runs here (`publicLighting:`), and whether the lamps are
 * actually burning is derived from the hour and from whether the
 * covering extent paid for this street tonight. There is deliberately no
 * lamp OBJECT anywhere in the world — nobody binds a street lamp, and
 * minting one identical fuelled thing per street would be forty-one fuel
 * reserves reconciling to produce the same number.
 *
 * ⚠⚠ **Why this class exists, and it is a correction.** The envelope
 * build composed `PublicLightingMixin` onto `CartesianLocation` — the
 * base under very nearly every room in the game — on the reasoning that
 * *"any cartesian cell may be lit by a funded public service."* That
 * sentence is a rationalization for a catch-all bucket: the cookhouse,
 * the sealed cellar, the smithy, a mine heading and a ploughed field all
 * got a public-lighting field and a `postRegister` hook, and the tell was
 * the guard at the top of that hook — `if (this.publicLighting === null)
 * return;` — which is a mixin re-narrowing its own host set, i.e. the
 * host being wrong. **Five rows in the realm declare the service.** They
 * get a class; nothing else pays.
 *
 * ⭐ The vocabulary follows the design's own words — *street lighting is
 * a property of the street and a bill on the extent* — and covers every
 * shipped case: a residential turning, a market square, a downtown
 * avenue block, a river bank at the confluence, a city crossing. What
 * they have in common is that they are **outdoors and public**, which is
 * exactly who a lamp-post belongs to.
 *
 * Singleton, because one row IS one street. A *kind* of way minted many
 * times (nine reaches of one lane) wants plain `CartesianLocation` and
 * has no lighting service to declare.
 */

import SingletonCartesianLocation from './SingletonCartesianLocation';
import { PublicLightingMixin } from '../../lib/perception/PublicLighting';

export default class Street extends PublicLightingMixin(
  SingletonCartesianLocation,
) {}
