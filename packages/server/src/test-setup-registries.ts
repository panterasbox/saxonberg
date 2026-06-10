/**
 * Vitest setup file — eagerly import the four singleton-Stuff
 * registries so their module-load side effects register their classes
 * with the corresponding Api facade.
 *
 * Production gets these via the bootstrap manifest (which clones each
 * Registry at server start). Test harnesses don't run the manifest;
 * without this import nudge, an Api method that lazy-creates a
 * Registry would throw "class not registered" because no other module
 * triggers the registration chain.
 *
 * Imports are side-effect only; the modules carry an
 * `<X>Api._registerRegistryClass(<X>Registry)` call at the bottom of
 * each file.
 */

import './mud/obj/EventSubscriptions';
import './mud/obj/WorldClockRegistry';
import './mud/obj/SchedulerRegistry';
import './mud/obj/MqlSubscriptionRegistry';
