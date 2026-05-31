import { toCsv } from './csv.util';

describe('csv.util', () => {
  it('空数组返回空串', () => {
    expect(toCsv([])).toBe('');
  });

  it('生成表头与行，转义逗号和引号', () => {
    const csv = toCsv([
      { name: 'XX咖啡', scans: 128 },
      { name: 'a,b', scans: 1 },
    ]);
    expect(csv).toContain('name,scans');
    expect(csv).toContain('XX咖啡,128');
    expect(csv).toContain('"a,b",1');
  });
});
