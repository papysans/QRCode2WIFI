import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// mock useRange（来自 ../App 的 context hook），避免渲染整个路由树
vi.mock('../App', () => ({
  useRange: () => ({ from: '2026-05-01', to: '2026-05-07' }),
}));

// 工厂会被提升到文件顶部，故数据需内联在工厂内部
vi.mock('../api', () => ({
  api: {
    overview: vi.fn().mockResolvedValue({
      totalShops: 10,
      newShops: 3,
      totalScans: 200,
      totalConnects: 50,
      conversionRate: 0.25,
      estimatedRevenue: 2.4,
    }),
  },
}));

import { Overview } from './Overview';

describe('<Overview />', () => {
  it('渲染总览关键数字（转化率、预估收益）', async () => {
    const { container } = render(<Overview />);

    // antd Statistic 会把数值拆成整数/小数等多个节点，故按整体文本断言
    await waitFor(() => {
      expect(container.textContent).toContain('店铺总数');
      // 转化率 0.25 → 25.0%
      expect(container.textContent).toContain('25.0');
    });
    // 预估广告收益 2.4 → 2.40
    expect(container.textContent).toContain('2.40');
    // 扫码人次 200
    expect(container.textContent).toContain('200');
  });
});
