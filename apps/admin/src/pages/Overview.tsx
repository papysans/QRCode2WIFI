import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import type { OverviewResponse } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';

export function Overview() {
  const range = useRange();
  const [data, setData] = useState<OverviewResponse>();
  useEffect(() => {
    api.overview(range).then(setData);
  }, [range.from, range.to]);

  const cards = [
    { title: '店铺总数', value: data?.totalShops ?? 0 },
    { title: '新增店铺', value: data?.newShops ?? 0 },
    { title: '扫码人次', value: data?.totalScans ?? 0 },
    { title: '连接成功', value: data?.totalConnects ?? 0 },
    {
      title: '整体转化率',
      value: ((data?.conversionRate ?? 0) * 100).toFixed(1),
      suffix: '%',
    },
    {
      title: '预估广告收益',
      value: (data?.estimatedRevenue ?? 0).toFixed(2),
      prefix: '¥',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col span={8} key={c.title}>
          <Card>
            <Statistic
              title={c.title}
              value={c.value}
              prefix={c.prefix}
              suffix={c.suffix}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
