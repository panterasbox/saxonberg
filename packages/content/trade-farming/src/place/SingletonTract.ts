/**
 * SingletonTract — ⭐ ONE authored tract, a place rather than a kind
 * (sugar W5; renamed by the tracts build).
 *
 * `Tract` is a KIND: a holding's layout is copied onto every parcel it is
 * sold on, and each copy's tract is a keyed instance, so an exit naming a
 * `Tract` row would mint a stray instance every time it resolved
 * (`lint:location-graph`'s `destination-is-a-kind`). Until every authored
 * farm is a holding (tracts build W5) an estate's cane piece is that
 * tract, with a name, in that place — so it is a singleton.
 */

import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import Tract from './Tract';

export default class SingletonTract extends SingletonMixin(Tract) {}
