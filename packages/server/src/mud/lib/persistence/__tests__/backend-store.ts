/**
 * backend-store — the backend `PersistenceManager` surfaced for CONTENT
 * pack tests.
 *
 * A pack's integration tests mock the store exactly the way kernel
 * tests do (`vi.spyOn(PersistenceManager, 'get')` over an in-memory
 * store), but `backend/**` is deliberately not on the server's
 * `exports` map — the pack import profile is `mud/lib`, `mud/api`,
 * `mud/platform` and `test-bootstrap` only. This lib-side test helper
 * re-exports the two names those mocks need, so a locality pack's
 * standup test reaches the same seam by the exported path
 * (`@saxonberg/server/mud/lib/persistence/__tests__/backend-store`).
 *
 * Test-only, white-box (the `quantity-marshaller-test-helpers` shape);
 * never imported by production code.
 */
export {
  PersistenceManager,
  Collections,
} from "../../../../backend/PersistenceManager";
