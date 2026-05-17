import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast/ToastProvider';
import { Layout } from './Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FoodsPage } from './pages/FoodsPage';
import { InquiriesPage } from './pages/InquiriesPage';
import { MembersPage } from './pages/MembersPage';
import { NoticesPage } from './pages/NoticesPage';
import { PoliciesPage } from './pages/PoliciesPage';

function Protected({ children }: { children: React.ReactElement }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ reason: 'auth_required' as const }} />;
  }
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
                  <MembersPage />
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
            <Route
              path="/policies"
              element={
                <Protected>
                  <PoliciesPage />
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
