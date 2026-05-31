import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, isAuthed } from './api';

describe('api.exportUrl', () => {
  it('生成带 type 与日期范围的 query string', () => {
    const url = api.exportUrl('funnel', { from: '2026-05-01', to: '2026-05-07' });
    expect(url.startsWith('/api/admin/export?')).toBe(true);
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('type')).toBe('funnel');
    expect(qs.get('from')).toBe('2026-05-01');
    expect(qs.get('to')).toBe('2026-05-07');
  });

  it('无日期范围时只含 type', () => {
    const url = api.exportUrl('overview', {});
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('type')).toBe('overview');
    expect(qs.get('from')).toBeNull();
    expect(qs.get('to')).toBeNull();
  });
});

describe('isAuthed', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('localStorage 有 admin_token 时为 true', () => {
    localStorage.setItem('admin_token', 'tok');
    expect(isAuthed()).toBe(true);
  });

  it('无 token 时为 false', () => {
    localStorage.removeItem('admin_token');
    expect(isAuthed()).toBe(false);
  });
});
