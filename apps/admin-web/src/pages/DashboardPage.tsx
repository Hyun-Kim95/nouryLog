import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../auth';
import { apiFetch, isAuthDenied } from '../api';
import { ForbiddenState } from '../components/ForbiddenState';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type TimeseriesPoint = {
  date: string;
  newUsers: number;
  mealRecords: number;
  pendingInquiries: number;
};

type Timeseries = {
  period: { from: string; to: string; days: number };
  timezone: string;
  items: TimeseriesPoint[];
};

type ChartTokens = {
  primary: string;
  warn: string;
  info: string;
  success: string;
  border: string;
  fgMuted: string;
};

const FALLBACK_TOKENS: ChartTokens = {
  primary: '#2563eb',
  warn: '#d97706',
  info: '#0891b2',
  success: '#10b981',
  border: '#e5e7eb',
  fgMuted: '#6b7280',
};

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type Dash = {
  period?: {
    from: string;
    to: string;
    days: number;
  };
  timezone?: string;
  newUsers: number;
  activeUsers: number;
  mealRecordCount: number;
  inquiryCount: number;
  isStale?: boolean;
  staleHours?: number | null;
  aggregatedAt?: string | null;
};

const KPI_ITEMS: Array<{ key: keyof Pick<Dash, 'newUsers' | 'activeUsers' | 'mealRecordCount' | 'inquiryCount'>; label: string; suffix?: string }> = [
  { key: 'newUsers', label: '신규 가입', suffix: '명' },
  { key: 'activeUsers', label: '활성 사용자', suffix: '명' },
  { key: 'mealRecordCount', label: '식사 기록', suffix: '건' },
  { key: 'inquiryCount', label: '미처리 문의', suffix: '건' },
];

function formatNumber(v: number | undefined): string {
  if (v === undefined || v === null) return '—';
  return new Intl.NumberFormat('ko-KR').format(v);
}

type PeriodDays = 7 | 30 | 90;

function formatAggregatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function DashboardPage() {
  const { token } = useAuth();
  const toast = useToast();
  const { dark } = useTheme();
  const [data, setData] = useState<Dash | null>(null);
  const [series, setSeries] = useState<Timeseries | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebusy, setRebusy] = useState(false);
  const [reaggregatedAt, setReaggregatedAt] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK_TOKENS);
  useEffect(() => {
    setTokens({
      primary: readVar('--ds-primary', FALLBACK_TOKENS.primary),
      warn: readVar('--ds-warning-fg', FALLBACK_TOKENS.warn),
      info: readVar('--ds-info-fg', FALLBACK_TOKENS.info),
      success: readVar('--ds-success-fg', FALLBACK_TOKENS.success),
      border: readVar('--ds-border', FALLBACK_TOKENS.border),
      fgMuted: readVar('--ds-fg-muted', FALLBACK_TOKENS.fgMuted),
    });
  }, [dark]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    setForbidden(false);
    try {
      const [d, ts] = await Promise.all([
        apiFetch<Dash>(`/admin/dashboard?periodDays=${periodDays}`, { token }),
        apiFetch<Timeseries>(`/admin/dashboard/timeseries?periodDays=${periodDays}`, { token }),
      ]);
      setData(d);
      setSeries(ts);
    } catch (e) {
      if (isAuthDenied(e)) {
        setForbidden(true);
        setData(null);
        setSeries(null);
      } else {
        setErr(e instanceof Error ? e.message : '불러오기 실패');
        setData(null);
        setSeries(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, periodDays]);

  const pieData = useMemo(() => {
    if (!data) return [] as Array<{ name: string; value: number; color: string }>;
    return [
      { name: '신규 가입', value: data.newUsers, color: tokens.primary },
      { name: '활성 사용자', value: data.activeUsers, color: tokens.info },
      { name: '미처리 문의', value: data.inquiryCount, color: tokens.warn },
    ];
  }, [data, tokens]);

  const pieHasData = pieData.some((d) => d.value > 0);
  const seriesHasData = (series?.items ?? []).some(
    (p) => p.newUsers > 0 || p.mealRecords > 0 || p.pendingInquiries > 0,
  );

  const reaggregate = async () => {
    if (!token) return;
    setRebusy(true);
    setErr(null);
    try {
      await apiFetch('/admin/stats/reaggregate', { method: 'POST', token });
      setReaggregatedAt(new Date().toISOString());
      await load();
      toast.show({ kind: 'success', message: '최신 통계로 반영했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '재집계 실패';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setRebusy(false);
    }
  };

  if (forbidden) {
    return (
      <main>
        <div className="page-head">
          <div>
            <h2>대시보드</h2>
            <div className="subtitle">서비스 핵심 지표와 통계 집계 상태</div>
          </div>
          <label className="form-field" style={{ minWidth: 180 }}>
            집계 기간
            <select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodDays)}>
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
          </label>
        </div>
        <ForbiddenState description="대시보드를 조회할 권한이 없습니다. 관리자 계정으로 다시 로그인하거나 권한 담당자에게 문의해 주세요." />
      </main>
    );
  }

  if (loading) {
    return (
      <main>
        <div className="page-head">
          <div>
            <h2>대시보드</h2>
            <div className="subtitle">서비스 핵심 지표와 통계 집계 상태</div>
          </div>
          <label className="form-field" style={{ minWidth: 180 }}>
            집계 기간
            <select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodDays)}>
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
          </label>
        </div>
        <div className="stats-grid">
          {KPI_ITEMS.map((item) => (
            <div key={item.key} className="card stat-card" aria-busy="true">
              <div className="label">{item.label}</div>
              <div className="skeleton" style={{ width: '60%', height: 28, marginTop: 12 }} />
            </div>
          ))}
        </div>
      </main>
    );
  }

  const isStale = data?.isStale === true;

  return (
    <main>
      <div className="page-head">
        <div>
          <h2>대시보드</h2>
          <div className="subtitle">
            서비스 핵심 지표와 통계 집계 상태
            {data?.period ? ` · ${formatDate(data.period.from)} ~ ${formatDate(data.period.to)} 기준` : ''}
          </div>
        </div>
        <label className="form-field" style={{ minWidth: 180 }}>
          집계 기간
          <select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodDays)}>
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
        </label>
      </div>

      {err && <div className="banner banner-danger" role="alert">{err}</div>}

      <div className="stats-grid">
        {KPI_ITEMS.map((item) => (
          <div key={item.key} className="card stat-card">
            <div className="label">{item.label}</div>
            <div className="value">
              {formatNumber(data?.[item.key])}
              {item.suffix && data?.[item.key] !== undefined ? (
                <span style={{ fontSize: 'var(--ds-text-md)', fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-muted)', marginLeft: 4 }}>
                  {item.suffix}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <section
        className="card"
        style={{ marginTop: 'var(--ds-space-4)' }}
        aria-label="기간별 추이 차트"
      >
        <div className="card-title">기간 추이 ({periodDays}일)</div>
        <div style={{ width: '100%', height: 280 }}>
          {seriesHasData ? (
            <ResponsiveContainer>
              <LineChart data={series?.items ?? []} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={tokens.border} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={tokens.fgMuted} fontSize={12} />
                <YAxis stroke={tokens.fgMuted} fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--ds-surface)',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    color: 'var(--ds-fg)',
                  }}
                  labelStyle={{ color: 'var(--ds-fg)' }}
                />
                <Legend wrapperStyle={{ color: tokens.fgMuted, fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="신규 가입"
                  stroke={tokens.primary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="mealRecords"
                  name="식사 기록"
                  stroke={tokens.success}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pendingInquiries"
                  name="미처리 문의"
                  stroke={tokens.warn}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.fgMuted,
                fontSize: 'var(--ds-text-sm)',
              }}
            >
              표시할 추이 데이터가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section
        className="card"
        style={{ marginTop: 'var(--ds-space-4)' }}
        aria-label="KPI 비중 도넛 차트"
      >
        <div className="card-title">KPI 비중</div>
        <div style={{ width: '100%', height: 280 }}>
          {pieHasData ? (
            <ResponsiveContainer>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: 'var(--ds-surface)',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    color: 'var(--ds-fg)',
                  }}
                />
                <Legend wrapperStyle={{ color: tokens.fgMuted, fontSize: 12 }} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke={tokens.border} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.fgMuted,
                fontSize: 'var(--ds-text-sm)',
              }}
            >
              비중을 계산할 데이터가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="card stale-widget" style={{ marginTop: 'var(--ds-space-4)' }}>
        <div className="stale-head">
          <div>
            <div className="card-title">통계 집계 상태</div>
            <div className="cluster" style={{ marginTop: 4 }}>
              <span className={`badge ${isStale ? 'badge-warn' : 'badge-success'}`}>
                {isStale ? '지연' : '정상'}
              </span>
              {isStale && data?.staleHours !== undefined && data?.staleHours !== null ? (
                <span className="stale-meta">{data.staleHours}시간 지연</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void reaggregate()}
            disabled={rebusy}
          >
            {rebusy ? '재집계 중…' : '최신값 반영'}
          </button>
        </div>
        <div className="stale-meta">
          마지막 집계: {formatAggregatedAt(data?.aggregatedAt)}
          {reaggregatedAt ? ` · 마지막 재집계 요청: ${formatAggregatedAt(reaggregatedAt)}` : ''}
        </div>
        <div className="stale-meta" style={{ color: 'var(--ds-fg-subtle)' }}>
          {isStale
            ? '최근 6시간 이상 통계 반영이 지연되어 강제 재집계가 필요합니다.'
            : '정상 주기로 집계 중입니다. 필요한 경우 강제 재집계를 실행할 수 있습니다.'}
        </div>
      </section>
    </main>
  );
}
