import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser, subscribeSessionChange } from '../../lib/session';
import logoImage from '../../../logo.png';

export default function TopBar() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => subscribeSessionChange(() => setUser(getStoredUser())), []);

  const handleLogout = () => {
    clearStoredUser();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img className="topbar-logo-image" src={logoImage} alt="DKH 시스템" />
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
