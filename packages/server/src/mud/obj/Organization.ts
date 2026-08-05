/**
 * Organization — the concrete, instanceable organization: an entity with
 * an org chart that **does not trade**.
 *
 * A ministry, a press office, a city registry. Before the Business /
 * organization split, content like this had to stand up a *Business* — a
 * thing that does not trade, pretending to — purely because that is where
 * positions lived. This is the class templates name instead.
 *
 * It composes `PublisherMixin` as well, because the two shipped
 * organizations both publish and the composition is free when unauthored
 * (a publisher with no `feedPath` and nobody in a publishing position
 * publishes nothing, which is the honest empty state rather than an error).
 * A future non-publishing organization can subclass and drop it, or an
 * author can simply leave the publisher fields blank.
 *
 * Deliberately shares its base mixin's concept name (the `obj/NPC` /
 * `obj/Vessel` / `obj/Exit` precedent — the module registry keys on class
 * identity, not name), which is what keeps `lib/employment/Organization`
 * substrate-only: **nothing instances `/lib/`.**
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { OrganizationMixin } from '../lib/employment/Organization';
import { PublisherMixin } from '../lib/press/Publisher';
import type { VetoResult } from '../lib/errors';

/**
 * The concrete seeded entity (e.g. `/compact/press`). A singleton-style
 * `Idea` warmed via the bootstrap manifest; refuses ordinary destruct, so
 * a live organization cannot be dissolved out from under the employment
 * records that name it.
 */
export default class OrganizationEntity extends PublisherMixin(
  OrganizationMixin(PostRegistrationMixin(Idea)),
) {
  /** Singleton refusal (mirrors the Business / catalogue singletons). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'an Organization is a seeded singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
