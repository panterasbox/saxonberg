/**
 * Vitest setup file — run the framework-wiring pass before every
 * suite, exactly as `BootstrapManager.run()` does at server start.
 *
 * This replaces the old side-effect imports of the four singleton-Stuff
 * registry modules (whose module-load statements registered their
 * classes): under the no-module-scope-statements rule those modules
 * declare only, and ALL cross-module wiring — registry-class handoffs,
 * the security↔shadow slot, the shadow↔command recency bridge, the
 * glob merge-on-arrival ripple — happens through the one explicit
 * boot-lifecycle call below. A setup file is an entry-point script
 * (like `main()`), so the call is at home here.
 */

import { BootstrapManager } from './backend/BootstrapManager';

BootstrapManager.installFrameworkWiring();
