import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateAccount } from '../api/accounts';
import { getStoredUser, saveStoredUser } from '../lib/session';
import logoImage from '../../logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (getStoredUser()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    if (!id.trim() || !password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoggingIn(true);
    setError(null);

    try {
      const user = await authenticateAccount(id, password);
      if (!user) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setPassword('');
        setLoggingIn(false);
        return;
      }

      saveStoredUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <img className="login-logo-image" src={logoImage} alt="DKH 시스템" />

        <label className="field">
          <span>아이디</span>
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="아이디 입력"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
          />
        </label>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={loggingIn}>
          {loggingIn ? '로그인 중..' : '로그인'}
        </button>
      </form>
    </div>
  );
}
