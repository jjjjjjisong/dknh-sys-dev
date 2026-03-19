import { Navigate, Outlet, createHashRouter, useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import DashboardPage from '../pages/DashboardPage';
import DocCreatePage from '../pages/DocCreatePage';
import DocHistoryPage from '../pages/DocHistoryPage';
import OrderBookPage from '../pages/OrderBookPage';
import MasterClientPage from '../pages/MasterClientPage';
import MasterProductPage from '../pages/MasterProductPage';
import AccountPage from '../pages/AccountPage';
import LoginPage from '../pages/LoginPage';
import { getStoredUser } from '../lib/session';

function ProtectedLayout() {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
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
      { path: 'master-product', element: <MasterProductPage /> },
      { path: 'account', element: <AccountPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
