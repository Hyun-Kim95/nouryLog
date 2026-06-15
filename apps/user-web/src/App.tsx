import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import { Layout } from './Layout';
import { DemoLandingPage } from './pages/DemoLandingPage';
import { NaverOAuthCallbackPage } from './pages/NaverOAuthCallbackPage';
import { InsightDemoPage } from './pages/InsightDemoPage';
import { AiWeeklyDemoPage } from './pages/AiWeeklyDemoPage';
import { AiMonthlyDemoPage } from './pages/AiMonthlyDemoPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/demo" element={<DemoLandingPage />} />
          <Route path="/demo/oauth/naver" element={<NaverOAuthCallbackPage />} />
          <Route element={<Layout />}>
            <Route path="/insights" element={<InsightDemoPage />} />
            <Route path="/insights/weekly" element={<AiWeeklyDemoPage />} />
            <Route path="/insights/monthly" element={<AiMonthlyDemoPage />} />
            <Route path="/ai/coach" element={<Navigate to="/insights" replace />} />
            <Route path="/ai/weekly" element={<Navigate to="/insights/weekly" replace />} />
            <Route path="/ai/monthly" element={<Navigate to="/insights/monthly" replace />} />
            <Route path="/ai" element={<Navigate to="/insights" replace />} />
            <Route path="/ai/report" element={<Navigate to="/insights/weekly" replace />} />
            <Route path="/login" element={<Navigate to="/demo" replace />} />
            <Route path="/stats" element={<Navigate to="/insights/monthly" replace />} />
            <Route path="/" element={<Navigate to="/insights" replace />} />
            <Route path="*" element={<Navigate to="/insights" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
