import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast/ToastProvider';
import { Layout } from './Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntityListPage } from './pages/EntityListPage';
import { FoodsPage } from './pages/FoodsPage';
import { InquiriesPage } from './pages/InquiriesPage';
import { NoticesPage } from './pages/NoticesPage';

function Protected({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <Protected>
                  <DashboardPage />
                </Protected>
              }
            />
            <Route
              path="/members"
              element={
                <Protected>
                  <EntityListPage kind="members" />
                </Protected>
              }
            />
            <Route
              path="/foods"
              element={
                <Protected>
                  <FoodsPage />
                </Protected>
              }
            />
            <Route
              path="/inquiries"
              element={
                <Protected>
                  <InquiriesPage />
                </Protected>
              }
            />
            <Route
              path="/notices"
              element={
                <Protected>
                  <NoticesPage />
                </Protected>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
