import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { RevenueResponse } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';
import { ExportButton } from '../components/ExportButton';

export function Revenue() {
  const range = useRange();
  const [data, setData] = useState<RevenueResponse>();
  useEffect(() => {
    api.revenue(range).then(setData);
  }, [range.from, range.to]);

  const daily = data?.daily ?? [];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['广告完成', '预估收益(¥)'] },
    xAxis: { type: 'category', data: daily.map((d) => d.date) },
    yAxis: [{ type: 'value', name: '次数' }, { type: 'value', name: '¥' }],
    series: [
      {
        name: '广告完成',
        type: 'bar',
        data: daily.map((d) => d.adCompletes),
      },
      {
        name: '预估收益(¥)',
        type: 'line',
        yAxisIndex: 1,
        data: daily.map((d) => Number(d.revenue.toFixed(2))),
      },
    ],
  };

  return (
    <Card
      title={`广告收益（预估，eCPM ¥${data?.ecpm ?? '-'} / 千次完成）`}
      extra={<ExportButton type="revenue" range={range} />}
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Statistic title="广告完成总数" value={data?.adCompletes ?? 0} />
        </Col>
        <Col span={12}>
          <Statistic
            title="预估总收益"
            prefix="¥"
            value={(data?.estimatedRevenue ?? 0).toFixed(2)}
          />
        </Col>
      </Row>
      <ReactECharts option={option} style={{ height: 360 }} />
      <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
        注：为预估值（完成数 × eCPM），真实收益以微信流量主后台结算为准。
      </p>
    </Card>
  );
}
