/**
 * ⭐ `container:` is runtime-only (the scan sweep's review, 2026-10-15):
 * where a thing is is set by whoever places it, so a row that authors it
 * is refused at save — never silently ignored.
 */
import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { TemplateApi, TemplateError } from '../template';

describe('TemplateApi.validateNoAuthoredContainer', () => {
  it('passes a row that says nothing about where it is', async () => {
    await expect(
      TemplateApi.validateNoAuthoredContainer({ path: '/x', class: '/c', data: { name: 'x' } }),
    ).resolves.toBeUndefined();
  });

  it('passes a row with no data at all', async () => {
    await expect(
      TemplateApi.validateNoAuthoredContainer({ path: '/x', class: '/c' }),
    ).resolves.toBeUndefined();
  });

  it('⭐ refuses a row that authors data.container, naming what to do instead', async () => {
    const attempt = TemplateApi.validateNoAuthoredContainer({
      path: '/test/x/thing/gin',
      class: '/c',
      data: { container: '/test/yard/thing/stock' },
    });
    await expect(attempt).rejects.toBeInstanceOf(TemplateError);
    await expect(attempt).rejects.toThrow(/runtime state.*stock lines/s);
  });
});
