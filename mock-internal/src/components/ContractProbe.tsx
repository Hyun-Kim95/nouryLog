import { useCallback, useState } from 'react';

type ProbeResult = { ok: true; label: string; status: number; body: string } | { ok: false; label: string; error: string };

const USER_AUTH = { Authorization: 'Bearer stub.user.token' };
const ADMIN_AUTH = { Authorization: 'Bearer admin.stub' };

export function ContractProbe() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const out: ProbeResult[] = [];
    const push = async (label: string, req: Promise<Response>) => {
      try {
        const res = await req;
        const text = await res.text();
        out.push({ ok: true, label, status: res.status, body: text.slice(0, 2000) });
      } catch (e) {
        out.push({ ok: false, label, error: e instanceof Error ? e.message : String(e) });
      }
    };

    await push(
      'GET /stats?range=day',
      fetch('/stats?range=day', { headers: USER_AUTH }),
    );
    await push(
      'GET /me/billing/entitlements',
      fetch('/me/billing/entitlements', { headers: USER_AUTH }),
    );
    await push(
      'POST /nutrition/ocr',
      fetch('/nutrition/ocr', { method: 'POST', headers: { ...USER_AUTH, 'Content-Type': 'application/json' }, body: '{}' }),
    );
    await push(
      'GET /admin/dashboard',
      fetch('/admin/dashboard', { headers: ADMIN_AUTH }),
    );
    await push(
      'POST /admin/stats/reaggregate',
      fetch('/admin/stats/reaggregate', { method: 'POST', headers: ADMIN_AUTH }),
    );
    await push(
      'GET /admin/users?page=1&size=15',
      fetch('/admin/users?page=1&size=15', { headers: ADMIN_AUTH }),
    );

    setResults(out);
    setBusy(false);
  }, []);

  const mswOn = import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true';

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>계약 스텁 프로브 (Common-C2 / 병렬 F1·F2)</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        개발 모드에서 <code>VITE_USE_MSW=true</code>이면 MSW가 <code>apps/server</code> 스텁과 동일한 경로·필드 형태로 응답합니다. 실서버는{' '}
        <code>http://localhost:3000</code> 스텁 또는 배포 URL로 교체합니다 (C3).
      </p>
      <p style={{ fontSize: '0.85rem' }}>
        MSW 상태:{' '}
        <strong>{mswOn ? '켜짐 (프로브는 동일 오리진으로 호출)' : '꺼짐'}</strong>
      </p>
      <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={busy}>
        {busy ? '요청 중…' : '샘플 엔드포인트 호출'}
      </button>
      {results.length > 0 && (
        <ul style={{ marginTop: 12, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
          {results.map((r, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <div>
                <strong>{r.label}</strong>
              </div>
              {r.ok ? (
                <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>
                  HTTP {r.status}
                  {'\n'}
                  {r.body}
                </pre>
              ) : (
                <div className="banner banner-danger" style={{ marginTop: 4 }}>
                  {r.error}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
