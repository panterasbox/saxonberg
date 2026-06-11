/**
 * Offline illustration-harness entry. Mirrors `src/preload.js`: register
 * the call-security loader hook BEFORE any engine module is imported, then
 * dynamically import the real harness so the loader can stamp the whole
 * import graph. Without this the Proxy/call-security framework can't
 * decorate engine classes and method dispatch throws.
 *
 * Run from `packages/server/`:
 *   tsx src/tools/illustrate-preload.js <command>
 */
import { register } from "node:module";
register("../services/loader/loader-hook.js", import.meta.url);

const { main } = await import("./illustrate.js");
await main();
