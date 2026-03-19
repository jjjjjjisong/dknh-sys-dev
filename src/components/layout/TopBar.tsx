import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser } from '../../lib/session';

const titleMap: Record<string, string> = {
  '/dashboard': '대시보드',
  '/doc-create': '문서 작성',
  '/doc-history': '발행 이력',
  '/order-book': '수주대장',
  '/master-client': '납품처 관리',
  '/master-product': '품목 관리',
  '/account': '계정 관리',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const user = getStoredUser();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const title = useMemo(
    () => titleMap[location.pathname] ?? 'DKH 시스템',
    [location.pathname],
  );

  const handleLogout = () => {
    clearStoredUser();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-dot" />
        <div className="topbar-logo">DKH 시스템</div>
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-actions">
        <div className="topbar-clock">
          {now.toLocaleDateString('ko-KR')} {now.toLocaleTimeString('ko-KR')}
        </div>
        <div className="topbar-user">{user?.name ?? '임시 사용자'}</div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
