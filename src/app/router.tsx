import { Navigate, Outlet, createHashRouter, useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import DashboardPage from '../pages/DashboardPage';
import DocCreatePage from '../pages/DocCreatePage';
import DocHistoryPage from '../pages/DocHistoryPage';
import OrderBookPage from '../pages/OrderBookPage';
import MasterClientPage from '../pages/MasterClientPage';
import MasterProductPage from '../pages/MasterProductPage';
import MasterSupplierPage from '../pages/MasterSupplierPage';
import AccountPage from '../pages/AccountPage';
import LoginPage from '../pages/LoginPage';
import { getStoredUser, isAdminUser } from '../lib/session';

function ProtectedLayout() {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell>
      <div className="page-transition" key={location.pathname}>
        <Outlet />
      </div>
    </AppShell>
  );
}

function AdminOnlyRoute() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    window.alert('권한이 없습니다.');
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'doc-create', element: <DocCreatePage /> },
      { path: 'doc-history', element: <DocHistoryPage /> },
      { path: 'doc-history/:documentId', element: <DocHistoryPage /> },
      { path: 'order-book', element: <OrderBookPage /> },
      { path: 'master-client', element: <MasterClientPage /> },
      { path: 'master-supplier', element: <MasterSupplierPage /> },
      { path: 'master-product', element: <MasterProductPage /> },
      {
        element: <AdminOnlyRoute />,
        children: [{ path: 'account', element: <AccountPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
