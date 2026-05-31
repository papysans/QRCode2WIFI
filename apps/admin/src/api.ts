import axios from 'axios';
import type {
  AnomalyResponse,
  FunnelResponse,
  OverviewResponse,
  RevenueResponse,
  ShopRankingResponse,
  TrendResponse,
} from '@q2w/shared';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export interface RangeParams {
  from?: string;
  to?: string;
}

export const api = {
  async login(username: string, password: string): Promise<string> {
    const { data } = await http.post<{ token: string }>('/admin/auth/login', {
      username,
      password,
    });
    return data.token;
  },
  overview: (p: RangeParams) =>
    http.get<OverviewResponse>('/admin/overview', { params: p }).then((r) => r.data),
  funnel: (p: RangeParams) =>
    http.get<FunnelResponse>('/admin/funnel', { params: p }).then((r) => r.data),
  revenue: (p: RangeParams) =>
    http.get<RevenueResponse>('/admin/revenue', { params: p }).then((r) => r.data),
  ranking: (p: RangeParams) =>
    http
      .get<ShopRankingResponse>('/admin/shops/ranking', { params: p })
      .then((r) => r.data),
  trends: (p: RangeParams) =>
    http.get<TrendResponse>('/admin/trends', { params: p }).then((r) => r.data),
  anomalies: (p: RangeParams) =>
    http
      .get<AnomalyResponse>('/admin/anomalies', { params: p })
      .then((r) => r.data),
  exportUrl: (type: string, p: RangeParams) => {
    const qs = new URLSearchParams({ type, ...(p as Record<string, string>) });
    return `/api/admin/export?${qs.toString()}`;
  },
};

export function isAuthed(): boolean {
  return !!localStorage.getItem('admin_token');
}
