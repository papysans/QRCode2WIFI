/** 将对象数组转为 CSV 文本（带表头，自动转义） */
export function toCsv(input: readonly object[]): string {
  const rows = input as Record<string, unknown>[];
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  // BOM 让 Excel 正确识别 UTF-8
  return '﻿' + lines.join('\n');
}
