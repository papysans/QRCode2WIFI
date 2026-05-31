import { useEffect, useState } from 'react';
import { Card } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { TrendResponse } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';
import { ExportButton } from '../components/ExportButton';

export function Trends() {
  const range = useRange();
  const [data, setData] = useState<TrendResponse>();
  useEffect(() => {
    api.trends(range).then(setData);
  }, [range.from, range.to]);

  const pts = data?.points ?? [];
  const series = [
    { key: 'scans', name: '扫码' },
    { key: 'adCompletes', name: '广告完成' },
    { key: 'connectSuccess', name: '连接成功' },
    { key: 'newShops', name: '新增店铺' },
  ];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: series.map((s) => s.name) },
    xAxis: { type: 'category', data: pts.map((p) => p.date) },
    yAxis: { type: 'value' },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: pts.map((p) => (p as any)[s.key]),
    })),
  };

  return (
    <Card title="日活趋势" extra={<ExportButton type="trends" range={range} />}>
      <ReactECharts option={option} style={{ height: 420 }} />
    </Card>
  );
}
