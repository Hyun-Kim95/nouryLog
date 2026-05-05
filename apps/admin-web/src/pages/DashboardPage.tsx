import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { apiFetch } from '../api';

type Dash = { newUsers: number; activeUsers: number; mealRecordCount: number; inquiryCount: number };

export function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebusy, setRebusy] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await apiFetch<Dash>('/admin/dashboard', { token });
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '불러오기 실패');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const reaggregate = async () => {
    if (!token) return;
    setRebusy(true);
    try {
      await apiFetch('/admin/stats/reaggregate', { method: 'POST', token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '재집계 실패');
    } finally {
      setRebusy(false);
    }
  };

  if (loading) return <main><p>로딩…</p></main>;
  if (err && !data) return <main><div className="banner banner-danger">{err}</div></main>;

  return (
    <main>
      <h2 style={{ marginTop: 0 }}>대시보드</h2>
      {err && <div className="banner banner-danger">{err}</div>}
      <div className="stats-grid">
        {[
          ['신규 가입(7일)', data?.newUsers],
          ['활성 사용자', data?.activeUsers],
          ['기록 건수', data?.mealRecordCount],
          ['미처리 문의', data?.inquiryCount],
        ].map(([label, v]) => (
          <div key={String(label)} className="card stat-card">
            <div className="label">{label}</div>
            <div className="value">{v ?? '—'}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => void reaggregate()} disabled={rebusy}>
          {rebusy ? '처리 중…' : '최신값 반영 (POST /admin/stats/reaggregate)'}
        </button>
      </div>
    </main>
  );
}
