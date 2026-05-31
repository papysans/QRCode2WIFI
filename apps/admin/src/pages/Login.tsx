import { Button, Card, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export function Login() {
  const nav = useNavigate();
  const onFinish = async (v: { username: string; password: string }) => {
    try {
      const token = await api.login(v.username, v.password);
      localStorage.setItem('admin_token', token);
      nav('/');
    } catch {
      message.error('账号或密码错误');
    }
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f4f0e7',
      }}
    >
      <Card title="运营监控后台登录" style={{ width: 360 }}>
        <Form onFinish={onFinish} initialValues={{ username: 'admin' }}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
          <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
            默认：admin / admin123
          </div>
        </Form>
      </Card>
    </div>
  );
}
