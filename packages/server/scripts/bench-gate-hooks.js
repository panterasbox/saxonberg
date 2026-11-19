/**
 * Resolve hook for `bench-gate`: `vitest` resolves to a stub.
 *
 * `test-bootstrap` reaches a test fixture (`backend-store.ts`) that
 * imports `{ vi }` from vitest at module scope, and vitest throws when
 * imported outside its own worker. The bench never calls the fixture's
 * functions (only their module scope runs), so a stub that answers the
 * import is enough. Without it the bench dies at import and has been
 * dead since the fixture was added.
 */
export async function resolve(specifier, context, next) {
  if (specifier === 'vitest') {
    return { url: new URL('./bench-vitest-stub.js', import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
