import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { api, RangeParams } from '../api';

/** CSV 导出：带 token 拉取后触发浏览器下载 */
export function ExportButton({
  type,
  range,
}: {
  type: string;
  range: RangeParams;
}) {
  const onClick = async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(api.exportUrl(type, range), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button icon={<DownloadOutlined />} onClick={onClick}>
      导出 CSV
    </Button>
  );
}
