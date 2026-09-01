/**
 * SingletonSphericalLocation — a {@link SphericalLocation} that opts
 * into **one live instance per row.**
 *
 * The spherical half of the restriction; `SingletonCartesianLocation`
 * is the other, and carries the full rationale. In short: the mixin
 * subtracts, so the permissive class keeps the unmarked name and this
 * is what a row opts into when one row IS one place — the guard then
 * catches a second `clone()` that would silently produce two of them.
 */

import SphericalLocation from './SphericalLocation';
import { SingletonMixin } from '../../lib/stuff/Singleton';

export default class SingletonSphericalLocation extends SingletonMixin(
  SphericalLocation,
) {}
