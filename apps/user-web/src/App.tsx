import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import { Layout } from './Layout';
import { DemoLandingPage } from './pages/DemoLandingPage';
import { NaverOAuthCallbackPage } from './pages/NaverOAuthCallbackPage';
import { AiCoachDemoPage } from './pages/AiCoachDemoPage';
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
            <Route path="/ai/coach" element={<AiCoachDemoPage />} />
            <Route path="/ai/weekly" element={<AiWeeklyDemoPage />} />
            <Route path="/ai/monthly" element={<AiMonthlyDemoPage />} />
            <Route path="/ai" element={<Navigate to="/ai/coach" replace />} />
            <Route path="/ai/report" element={<Navigate to="/ai/weekly" replace />} />
            <Route path="/login" element={<Navigate to="/demo" replace />} />
            <Route path="/stats" element={<Navigate to="/ai/monthly" replace />} />
            <Route path="/" element={<Navigate to="/ai/coach" replace />} />
            <Route path="*" element={<Navigate to="/ai/coach" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
