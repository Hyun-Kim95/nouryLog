import { Navigate, Route, Routes } from 'react-router-dom';
import { MockHub } from './pages/MockHub';
import { AppLayout } from './pages/app/AppLayout';
import { AppOnboard } from './pages/app/AppOnboard';
import { AppHome } from './pages/app/AppHome';
import { AppLog } from './pages/app/AppLog';
import { AppStats } from './pages/app/AppStats';
import { AppFoodSearch } from './pages/app/AppFoodSearch';
import { AppMealSetList } from './pages/app/AppMealSetList';
import { AppMealSetEditor } from './pages/app/AppMealSetEditor';
import { AppMealSetApply } from './pages/app/AppMealSetApply';
import { AppSubscription } from './pages/app/AppSubscription';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminTablePage } from './pages/admin/AdminTablePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MockHub />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="onboard" element={<AppOnboard />} />
        <Route path="home" element={<AppHome />} />
        <Route path="log" element={<AppLog />} />
        <Route path="stats" element={<AppStats />} />
        <Route path="food-search" element={<AppFoodSearch />} />
        <Route path="meal-set" element={<AppMealSetList />} />
        <Route path="meal-set/edit" element={<AppMealSetEditor />} />
        <Route path="meal-set/apply" element={<AppMealSetApply />} />
        <Route path="subscription" element={<AppSubscription />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="members" element={<AdminTablePage kind="members" />} />
        <Route path="foods" element={<AdminTablePage kind="foods" />} />
        <Route path="inquiries" element={<AdminTablePage kind="inquiries" />} />
        <Route path="notices" element={<AdminTablePage kind="notices" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
