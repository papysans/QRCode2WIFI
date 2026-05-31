import { useEffect, useState } from 'react';
import { Card, Table } from 'antd';
import type { ShopRankingItem } from '@q2w/shared';
import { api } from '../api';
import { useRange } from '../App';
import { ExportButton } from '../components/ExportButton';

export function Ranking() {
  const range = useRange();
  const [items, setItems] = useState<ShopRankingItem[]>([]);
  useEffect(() => {
    api.ranking(range).then((r) => setItems(r.items));
  }, [range.from, range.to]);

  return (
    <Card
      title="店铺活跃排行（按扫码量）"
      extra={<ExportButton type="ranking" range={range} />}
    >
      <Table
        rowKey="shopId"
        dataSource={items}
        pagination={false}
        columns={[
          {
            title: '排名',
            render: (_t, _r, i) => i + 1,
            width: 80,
          },
          { title: '店铺', dataIndex: 'name' },
          { title: '扫码量', dataIndex: 'scans', sorter: (a, b) => a.scans - b.scans },
          { title: '连接成功', dataIndex: 'connectSuccess' },
        ]}
      />
    </Card>
  );
}
