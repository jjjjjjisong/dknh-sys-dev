import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, saveStoredUser } from '../lib/session';

export default function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('로컬 사용자');

  useEffect(() => {
    if (getStoredUser()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();

    saveStoredUser({
      id: 'local-dev-user',
      name: name.trim() || '로컬 사용자',
      role: 'admin',
    });

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-eyebrow">React + TypeScript + Vite 전환 1차</div>
        <h1>DKH 시스템</h1>
        <p className="login-description">
          이번 단계에서는 인증 구조를 바꾸지 않고 로컬 테스트용 임시 로그인만
          제공합니다.
        </p>

        <label className="field">
          <span>표시 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="로컬 사용자"
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block">
          임시 로그인 후 시작
        </button>
      </form>
    </div>
  );
}
