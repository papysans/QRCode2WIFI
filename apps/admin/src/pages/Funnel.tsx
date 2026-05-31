import { useEffect, useState } from 'react';
import { Card, Space } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { FunnelResponse } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';
import { ExportButton } from '../components/ExportButton';

const LABELS: Record<string, string> = {
  scan: '扫码',
  ad_complete: '广告完成',
  connect_click: '连接点击',
  connect_success: '连接成功',
};

export function Funnel() {
  const range = useRange();
  const [data, setData] = useState<FunnelResponse>();
  useEffect(() => {
    api.funnel(range).then(setData);
  }, [range.from, range.to]);

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [
      {
        type: 'funnel',
        sort: 'none',
        gap: 2,
        label: { formatter: (p: any) => `${p.name}\n${p.value}` },
        data: (data?.steps ?? []).map((s) => ({
          name: `${LABELS[s.step] ?? s.step}（留存 ${(s.rate * 100).toFixed(0)}%）`,
          value: s.count,
        })),
      },
    ],
  };

  return (
    <Card
      title="流量漏斗：扫码 → 广告完成 → 连接点击 → 连接成功"
      extra={<ExportButton type="funnel" range={range} />}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <ReactECharts option={option} style={{ height: 420 }} />
      </Space>
    </Card>
  );
}
