import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser, subscribeSessionChange } from '../../lib/session';
import logoImage from '../../../logo.png';

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
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => subscribeSessionChange(() => setUser(getStoredUser())), []);

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
        <img className="topbar-logo-image" src={logoImage} alt="DKH 시스템" />
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-actions">
        <div className="topbar-clock">
          {now.toLocaleDateString('ko-KR')} {now.toLocaleTimeString('ko-KR')}
        </div>
        <div className="topbar-user">
          {user?.name ?? '임시 사용자'}
          {user?.rank ? ` · ${user.rank}` : ''}
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
