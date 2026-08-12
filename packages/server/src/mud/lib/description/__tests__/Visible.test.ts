/**
 * VisibleMixin tests
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { VisibleMixin } from '../Visible';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";
import { MixinApi } from '../../../api/mixin';

// Test class that uses VisibleMixin
class TestVisible extends VisibleMixin(Idea) {
  constructor() {
    super();
  }
}

describe('VisibleMixin', () => {
  let visible: TestVisible;

  beforeEach(() => {
    visible = makeStuff(() => new TestVisible());
  });

  describe('initialization', () => {
    it('should initialize with empty descriptions', () => {
      expect(visible.getShortDescription()).toBe('');
      expect(visible.getLongDescription()).toBe('');
    });
  });

  describe('getShort', () => {
    it('should return default message when no description', () => {
      expect(visible.getShort()).toBe('You see nothing special.');
    });

    it('should return shortDescription when set', () => {
      visible.setShortDescription('A rusty sword');
      expect(visible.getShort()).toBe('A rusty sword');
    });
  });

  describe('getLong', () => {
    it('should return default message when no descriptions', () => {
      expect(visible.getLong()).toBe('You see nothing special.');
    });

    it('should return longDescription when set', () => {
      visible.setLongDescription('A long, detailed description of a rusty sword.');
      expect(visible.getLong()).toBe('A long, detailed description of a rusty sword.');
    });

    it('should fall back to shortDescription when longDescription is empty', () => {
      visible.setShortDescription('A rusty sword');
      expect(visible.getLong()).toBe('A rusty sword');
    });

    it('should prefer longDescription over shortDescription', () => {
      visible.setShortDescription('Short');
      visible.setLongDescription('Long');
      expect(visible.getLong()).toBe('Long');
    });
  });

  describe('persistent fields', () => {
    it('should declare shortDescription and longDescription as persistent fields', () => {
      const fields = MixinApi.getAllPersistentFields(TestVisible);
      expect(fields).toContain('shortDescription');
      expect(fields).toContain('longDescription');
    });
  });
});
