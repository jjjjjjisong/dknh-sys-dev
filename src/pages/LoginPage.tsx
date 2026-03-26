import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateAccount } from '../api/accounts';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { getStoredUser, saveStoredUser } from '../lib/session';
import { getErrorMessage } from '../utils/formatters';
import logoImage from '../../logo.png';

const SAVED_LOGIN_ID_KEY = 'dkh_saved_login_id';

export default function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (getStoredUser()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const savedId = window.localStorage.getItem(SAVED_LOGIN_ID_KEY);
    if (!savedId) return;

    setId(savedId);
    setRememberId(true);
  }, []);

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

      if (rememberId) {
        window.localStorage.setItem(SAVED_LOGIN_ID_KEY, id.trim());
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_ID_KEY);
      }

      saveStoredUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, '로그인에 실패했습니다.'));
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <img className="login-logo-image" src={logoImage} alt="DKH 시스템" />
        <p className="login-hero-subtitle">(주) 혜인에이치 시스템 업무 관리 시스템</p>
      </div>

      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-card-head">
          <h1 className="login-card-title">로그인</h1>
        </div>

        <FormField label="아이디">
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="아이디 입력"
            autoComplete="username"
          />
        </FormField>

        <FormField label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
          />
        </FormField>

        <label className="login-remember">
          <input
            type="checkbox"
            checked={rememberId}
            onChange={(event) => setRememberId(event.target.checked)}
          />
          <span>ID 저장</span>
        </label>

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" variant="primary" block disabled={loggingIn}>
          {loggingIn ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </div>
  );
}
