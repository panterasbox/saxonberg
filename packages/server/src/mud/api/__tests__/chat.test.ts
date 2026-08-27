/**
 * Tests for ChatApi's logic-singleton encapsulation.
 *
 * The chat surface itself is exercised through the chat controllers and
 * ChannelCatalogue suites; this file pins the surface-architecture
 * invariant that the backing ChatLogic singleton denies direct calls
 * from outside the ChatApi facade module.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatApi } from '../chat';
import { ChatLogic } from '../../platform/idea/api/ChatLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';

describe('ChatLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-ChatApi caller', () => {
    // A facade call lazily creates the logic singleton synchronously
    // (the catalogue resolution that follows is async and irrelevant —
    // the singleton is registered before the first await). Swallow the
    // dangling promise; we only need the singleton to exist.
    void ChatApi.getBackingGroupIds().catch(() => undefined);
    const logic = StuffApi.findByTemplatePath<ChatLogic>('/platform/idea/api/chat');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/chat#ChatApi`, so the FromModule
    // gate on the logic's own methods denies the call. The gate fires
    // synchronously even for async methods.
    expect(() => logic!.getBackingGroupIds()).toThrow(SecurityError);
  });
});
