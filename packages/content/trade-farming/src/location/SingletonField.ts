/**
 * SingletonField — ⭐ ONE authored field, a place rather than a kind
 * (sugar W5).
 *
 * `Field` is a KIND: a plat is cut into lots and each lot is a minted
 * instance of it, so an exit naming a `Field` row would mint a stray
 * instance every time it resolved (`lint:location-graph`'s
 * `destination-is-a-kind`). An estate's cane piece or a smallholder's
 * plot is not one of many lots — it is that field, with a name, in that
 * place — so it is a singleton: the same ground, the same soil ledger,
 * whoever walks in.
 */

import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import Field from './Field';

export default class SingletonField extends SingletonMixin(Field) {}
