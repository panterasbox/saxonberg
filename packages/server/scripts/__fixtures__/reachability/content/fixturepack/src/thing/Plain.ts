/** A class composing no CirculatingMixin — the inert-key fixture's host. */
type Ctor = new (...args: unknown[]) => object;
const Thing: Ctor = class {};
export default class Plain extends Thing {}
