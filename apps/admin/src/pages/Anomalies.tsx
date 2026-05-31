import { useEffect, useState } from 'react';
import { Card, Col, Progress, Row, Statistic, Table, Tag } from 'antd';
import type { AnomalyResponse } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';
import { ExportButton } from '../components/ExportButton';

export function Anomalies() {
  const range = useRange();
  const [data, setData] = useState<AnomalyResponse>();

  useEffect(() => {
    const load = () => api.anomalies(range).then(setData);
    load();
    // 分钟级轮询，刷新实时扫码与异常
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [range.from, range.to]);

  return (
    <Row gutter={[16, 16]}>
      <Col span={8}>
        <Card>
          <Statistic
            title="近 5 分钟实时扫码"
            value={data?.realtimeScans ?? 0}
            valueStyle={{ color: '#158474' }}
          />
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
            每 60 秒自动刷新
          </div>
        </Card>
      </Col>
      <Col span={24}>
        <Card
          title="连接失败率告警（按店铺）"
          extra={<ExportButton type="anomalies" range={range} />}
        >
          <Table
            rowKey="shopId"
            dataSource={data?.items ?? []}
            pagination={false}
            columns={[
              { title: '店铺', dataIndex: 'name' },
              {
                title: '失败率',
                dataIndex: 'connectFailRate',
                render: (v: number) => (
                  <Progress
                    percent={Math.round(v * 100)}
                    size="small"
                    status={v > 0.3 ? 'exception' : 'normal'}
                    style={{ width: 160 }}
                  />
                ),
                sorter: (a, b) => a.connectFailRate - b.connectFailRate,
              },
              { title: '失败次数', dataIndex: 'connectFail' },
              { title: '点击次数', dataIndex: 'connectClicks' },
              {
                title: '状态',
                render: (_t, r) =>
                  r.connectFailRate > 0.3 ? (
                    <Tag color="red">需关注</Tag>
                  ) : (
                    <Tag color="green">正常</Tag>
                  ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
