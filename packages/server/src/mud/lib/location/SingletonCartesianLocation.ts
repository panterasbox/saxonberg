/**
 * SingletonCartesianLocation — a {@link CartesianLocation} that opts
 * into **one live instance per row.**
 *
 * The mixin SUBTRACTS, which is why this is the marked name and the
 * plain one is the default: a class without `SingletonMixin` backs
 * singleton templates perfectly well (`StuffApi.singleton(path)`
 * get-or-creates, which is how an eager exit resolves its destination),
 * while a class WITH it can back only singleton templates — `clone()`
 * throws after the first.
 *
 * Opt in wherever **one row IS one place**: the Registry office, a
 * street crossing, a flooded cell. The guard then catches a second
 * `clone()` that would otherwise silently produce two Registry offices
 * sharing a template path.
 *
 * Do NOT use it where a row describes a **kind** of place minted many
 * times — nine reaches of one lane, a landing per occupied floor. Those
 * are plain `CartesianLocation`s carrying a per-instance identity
 * (`asIdentityPath`, D17).
 */

import CartesianLocation from './CartesianLocation';
import { SingletonMixin } from '../stuff/Singleton';

export default class SingletonCartesianLocation extends SingletonMixin(
  CartesianLocation,
) {}
