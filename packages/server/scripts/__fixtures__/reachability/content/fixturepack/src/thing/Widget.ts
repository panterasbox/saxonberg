/**
 * The census row's class. `composesMixin` reads the `extends` TEXT, so
 * the mixin only has to be NAMED here — but the file still has to lint
 * and typecheck like any other, so the two symbols are declared locally.
 */
type Ctor = new (...args: unknown[]) => object;
const Thing: Ctor = class {};
const CirculatingMixin = (base: Ctor): Ctor => base;
export default class Widget extends CirculatingMixin(Thing) {}
