import { createContext, useContext, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Button, DatePicker, Layout, Menu } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { isAuthed } from './api';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Funnel } from './pages/Funnel';
import { Revenue } from './pages/Revenue';
import { Ranking } from './pages/Ranking';
import { Trends } from './pages/Trends';
import { Anomalies } from './pages/Anomalies';

const { Header, Sider, Content } = Layout;

interface RangeCtx {
  from: string;
  to: string;
}
const RangeContext = createContext<RangeCtx>({ from: '', to: '' });
export const useRange = () => useContext(RangeContext);

const MENU = [
  { key: '/', label: '总览' },
  { key: '/funnel', label: '流量漏斗' },
  { key: '/revenue', label: '广告收益' },
  { key: '/ranking', label: '店铺排行' },
  { key: '/trends', label: '趋势' },
  { key: '/anomalies', label: '异常监控' },
];

function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);
  const ctx = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
    }),
    [range],
  );

  return (
    <RangeContext.Provider value={ctx}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="light">
          <div style={{ padding: 16, fontWeight: 800, color: '#158474' }}>
            WiFi 广告 · 运营
          </div>
          <Menu
            mode="inline"
            selectedKeys={[loc.pathname]}
            items={MENU.map((m) => ({
              key: m.key,
              label: <Link to={m.key}>{m.label}</Link>,
            }))}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingInline: 24,
            }}
          >
            <DatePicker.RangePicker
              value={range}
              allowClear={false}
              onChange={(v) => v && setRange(v as [Dayjs, Dayjs])}
            />
            <Button
              onClick={() => {
                localStorage.removeItem('admin_token');
                nav('/login');
              }}
            >
              退出登录
            </Button>
          </Header>
          <Content style={{ margin: 24 }}>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/funnel" element={<Funnel />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/anomalies" element={<Anomalies />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </RangeContext.Provider>
  );
}

function Guard({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Guard>
              <Shell />
            </Guard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
