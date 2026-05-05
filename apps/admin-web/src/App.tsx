import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './theme';
import { Layout } from './Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntityListPage } from './pages/EntityListPage';

function Protected({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
                  <EntityListPage kind="foods" />
                </Protected>
              }
            />
            <Route
              path="/inquiries"
              element={
                <Protected>
                  <EntityListPage kind="inquiries" />
                </Protected>
              }
            />
            <Route
              path="/notices"
              element={
                <Protected>
                  <EntityListPage kind="notices" />
                </Protected>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
